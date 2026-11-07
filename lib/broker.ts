import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, decodeTransferCheckedInstruction } from "@solana/spl-token";
import { MEMO_PROGRAM_ID } from "@solana/spl-memo";
import nacl from "tweetnacl";
import { ata, anchorMemo, connection, fromMicro, readPayment, sweepUsdc, transferUsdc, usdcBalance, usdcMint } from "./chain";
import { USDC_DECIMALS } from "./env";
import { asks, events, newId, now, payments, tasks, Task, Ask } from "./db";
import { sponsor } from "./keys";
import { SERVICES, ServiceName, servicesWallet } from "./services";

/** Thrown when a payment needs the owner. The task pauses until they decide. */
export class NeedsOwner extends Error {
  constructor(public ask: Ask) { super("needs owner"); }
}

export function walletOf(task: Task) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(task.wallet_secret)));
}

/** A task gets its own fresh wallet. Funding it is the owner's first signature. */
export function createTask(goal: string, budgetMicro: bigint, ownerPubkey: string, injection = false, planted: string | null = null): { task: Task; ask: Ask } {
  const wallet = Keypair.generate();
  const id = newId("task");
  tasks.insert({
    id, goal, budget_micro: Number(budgetMicro), owner_pubkey: ownerPubkey,
    wallet_pubkey: wallet.publicKey.toBase58(), wallet_secret: JSON.stringify(Array.from(wallet.secretKey)),
    status: "created", injection: injection ? 1 : 0, planted, created_at: now(),
  });
  events.append(id, "task.created", { goal, budget_usdc: fromMicro(budgetMicro), wallet: wallet.publicKey.toBase58(), owner: ownerPubkey, injection });
  const ask: Ask = {
    id: newId("ask"), task_id: id, micro: Number(budgetMicro), reason: "Initial budget for this task",
    risk: JSON.stringify([]), status: "pending", sig: null, created_at: now(), decided_at: null,
  };
  asks.insert(ask);
  events.append(id, "owner.asked", { ask: ask.id, usdc: fromMicro(budgetMicro), reason: ask.reason, risk: [] });
  return { task: tasks.get(id)!, ask };
}

/**
 * What the sponsor will sign, and nothing else: exactly three instructions.
 *   1. create the task's token account (idempotent), paid by the sponsor
 *   2. transferChecked of exactly the ask's amount, from the owner's token account
 *      to the task's, signed by the owner
 *   3. one memo, signed by the owner
 * The sponsor must appear only as fee payer and as the rent payer in step 1.
 */
export function assertFundingShape(tx: Transaction, task: Task, ask: Ask) {
  const payer = sponsor().publicKey;
  const mint = usdcMint();
  const owner = new PublicKey(task.owner_pubkey);
  const taskPk = new PublicKey(task.wallet_pubkey);
  const src = ata(owner), dst = ata(taskPk);
  if (!tx.feePayer?.equals(payer)) throw new Error("fee payer must be the sponsor");
  const ixs = tx.instructions;
  if (ixs.length !== 3) throw new Error(`expected 3 instructions, got ${ixs.length}`);
  const [a, t, m] = ixs;
  // 1. associated token account, idempotent
  if (!a.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) throw new Error("instruction 1 is not the associated token program");
  if (!(a.data.length === 1 && a.data[0] === 1)) throw new Error("instruction 1 is not the idempotent create");
  if (!(a.keys[0]?.pubkey.equals(payer) && a.keys[1]?.pubkey.equals(dst) && a.keys[2]?.pubkey.equals(taskPk) && a.keys[3]?.pubkey.equals(mint))) throw new Error("instruction 1 does not create the task's token account");
  // 2. the transfer
  if (!t.programId.equals(TOKEN_PROGRAM_ID)) throw new Error("instruction 2 is not the token program");
  const d = decodeTransferCheckedInstruction(t);
  if (!d.keys.source.pubkey.equals(src)) throw new Error("transfer source is not the owner's token account");
  if (!d.keys.destination.pubkey.equals(dst)) throw new Error("transfer destination is not the task's token account");
  if (!d.keys.mint.pubkey.equals(mint)) throw new Error("transfer is not the configured mint");
  if (!d.keys.owner.pubkey.equals(owner)) throw new Error("transfer is not signed by the task's owner");
  if (d.keys.multiSigners.length) throw new Error("unexpected multisig signers");
  if (d.data.amount !== BigInt(ask.micro)) throw new Error(`transfer amount ${d.data.amount} does not equal the ask ${ask.micro}`);
  if (d.data.decimals !== USDC_DECIMALS) throw new Error("wrong decimals");
  // 3. the memo
  if (!m.programId.equals(MEMO_PROGRAM_ID)) throw new Error("instruction 3 is not the memo program");
  // the sponsor is never a signer or writable account anywhere but the ATA rent in step 1
  for (const ix of [t, m]) for (const k of ix.keys) if (k.pubkey.equals(payer)) throw new Error("the sponsor may not appear in the transfer or memo");
}

/**
 * The owner approved: they signed a USDC transfer into the task wallet in their
 * browser. The box checks the transaction is exactly the shape it will pay for,
 * adds the sponsor's fee signature, sends it, and reads it back from the chain.
 */
export async function approveAsk(askId: string, signedTxBase64: string): Promise<string> {
  const ask = asks.get(askId);
  if (!ask) throw new Error("ask not found");
  if (ask.status !== "pending") throw new Error(`ask is ${ask.status}`);
  const task = tasks.get(ask.task_id)!;
  const payer = sponsor();
  const tx = Transaction.from(Buffer.from(signedTxBase64, "base64"));
  assertFundingShape(tx, task, ask);
  tx.partialSign(payer);
  const t0 = now();
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  const p = await readPayment(sig);
  const expectDst = ata(new PublicKey(task.wallet_pubkey)).toBase58();
  if (!p.ok || p.destination !== expectDst || (p.micro ?? 0n) < BigInt(ask.micro) || p.authority !== task.owner_pubkey) {
    throw new Error(`funding transaction did not match the ask: ${p.reason ?? "wrong destination, amount or signer"}`);
  }
  asks.update(askId, { status: "approved", sig, decided_at: now() });
  events.append(task.id, "owner.approved", { ask: askId, usdc: fromMicro(BigInt(ask.micro)), sig, ms: now() - t0 });
  if (task.status === "created") tasks.update(task.id, { status: "funded", funded_sig: sig });
  else tasks.update(task.id, { status: "funded" });
  return sig;
}

/** The message an owner signs to decline. No transaction, but still a signature only the owner can make. */
export const declineMessage = (askId: string) => new TextEncoder().encode(`stipend:decline:${askId}`);

export async function declineAsk(askId: string, signatureBase64: string) {
  const ask = asks.get(askId);
  if (!ask) throw new Error("ask not found");
  if (ask.status !== "pending") throw new Error(`ask is ${ask.status}`);
  const task = tasks.get(ask.task_id)!;
  const ok = nacl.sign.detached.verify(declineMessage(askId), Buffer.from(signatureBase64, "base64"), new PublicKey(task.owner_pubkey).toBytes());
  if (!ok) throw new Error("decline must be signed by the task's owner");
  asks.update(askId, { status: "declined", decided_at: now() });
  events.append(ask.task_id, "owner.declined", { ask: askId, usdc: fromMicro(BigInt(ask.micro)), signed: true });
  const draft = task.state ? (JSON.parse(task.state).draft as string | undefined) : undefined;
  await finishTask(ask.task_id, { status: "declined", answer: draft ?? null });
}

function servicesDestination() {
  return servicesWallet().publicKey.toBase58();
}

/**
 * Pay a service from the task wallet. Three outcomes: it pays and returns the
 * signature; the payee is not a listed service and it is refused outright; or
 * the wallet cannot cover it and the owner is asked for the shortfall.
 */
export async function pay(taskId: string, opts: {
  service: ServiceName | "external"; destination?: string; micro?: bigint; reason: string; risk?: string[]; bodyHash?: string;
}): Promise<string> {
  const task = tasks.get(taskId)!;
  const wallet = walletOf(task);
  const svc = opts.service === "external" ? null : SERVICES[opts.service];
  const destination = opts.destination ?? servicesDestination();
  const micro = opts.micro ?? svc?.priceMicro ?? 0n;
  // The memo names the task and, for a service call, the hash of the exact request it pays for.
  const memo = `stipend:${taskId}:${opts.service}:${newId("p").slice(2)}${opts.bodyHash ? `:h=${opts.bodyHash}` : ""}`;
  if (destination !== servicesDestination()) {
    events.append(taskId, "pay.refused", { destination, usdc: fromMicro(micro), reason: opts.reason, why: "payee is not a listed service", risk: opts.risk ?? [] });
    throw new Error("refused: payee is not a listed service");
  }
  const balance = await usdcBalance(wallet.publicKey);
  if (balance < micro) {
    const shortfall = micro - balance;
    const risk = [...(opts.risk ?? []), `over budget: needs ${fromMicro(shortfall)} more USDC`];
    const ask: Ask = {
      id: newId("ask"), task_id: taskId, micro: Number(shortfall), reason: opts.reason,
      risk: JSON.stringify(risk), status: "pending", sig: null, created_at: now(), decided_at: null,
    };
    asks.insert(ask);
    tasks.update(taskId, { status: "waiting_owner" });
    events.append(taskId, "owner.asked", { ask: ask.id, usdc: fromMicro(shortfall), reason: opts.reason, risk });
    throw new NeedsOwner(ask);
  }
  const id = newId("pay");
  const t0 = now();
  payments.insert({ id, task_id: taskId, service: opts.service, destination, micro: Number(micro), memo, sig: null, status: "sent", ms: null, created_at: t0 });
  try {
    const sig = await transferUsdc({ from: wallet, to: new PublicKey(destination), micro, memo });
    const ms = now() - t0;
    payments.update(id, { sig, status: "confirmed", ms });
    events.append(taskId, "pay.sent", { service: opts.service, usdc: fromMicro(micro), to: destination, sig, memo, ms });
    return sig;
  } catch (e) {
    payments.update(id, { status: "failed", ms: now() - t0 });
    events.append(taskId, "pay.failed", { service: opts.service, usdc: fromMicro(micro), error: (e as Error).message });
    throw e;
  }
}

/** End a task: sweep what is left back to the owner, then anchor the log's last hash on chain. */
export async function finishTask(taskId: string, opts: { status: "finished" | "declined" | "failed"; answer: string | null }) {
  const task = tasks.get(taskId)!;
  if (["finished", "declined", "failed"].includes(task.status)) return;
  const wallet = walletOf(task);
  tasks.update(taskId, { status: opts.status, answer: opts.answer, finished_at: now() });
  events.append(taskId, "task.ended", { status: opts.status, answer: opts.answer });
  try {
    const swept = await sweepUsdc({ from: wallet, to: new PublicKey(task.owner_pubkey), memo: `stipend:${taskId}:sweep` });
    if (swept) {
      tasks.update(taskId, { sweep_sig: swept.sig, swept_micro: Number(swept.micro) });
      events.append(taskId, "task.swept", { usdc: fromMicro(swept.micro), sig: swept.sig });
    }
  } catch (e) {
    events.append(taskId, "task.sweep_failed", { error: (e as Error).message });
  }
  const log = events.forTask(taskId);
  const last = log[log.length - 1];
  const memo = `stipend:v1:${taskId}:${log.length}:${last.hash}`;
  try {
    const sig = await anchorMemo(memo, [wallet]); // the task wallet co-signs, so the receipt is findable under its address
    tasks.update(taskId, { receipt_sig: sig, receipt_hash: last.hash });
    events.append(taskId, "task.receipt", { sig, covers: log.length, hash: last.hash });
  } catch (e) {
    events.append(taskId, "task.receipt_failed", { error: (e as Error).message });
  }
}
