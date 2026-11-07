/**
 * End-to-end on devnet, no UI: a test owner funds a task, the agent runs and pays
 * for its searches and model calls, the leftover sweeps back, the receipt anchors.
 * Needs the dev server running (the agent pays the box's own HTTP services).
 */
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } from "@solana/spl-token";
import { createMemoInstruction } from "@solana/spl-memo";
import { ata, connection, fromMicro, mintDemoUsdc, toMicro, usdcBalance } from "../lib/chain";
import { approveAsk, createTask } from "../lib/broker";
import { runTask } from "../lib/agent";
import { loadOrCreateKeypair, sponsor } from "../lib/keys";
import { USDC_DECIMALS, explorerTx, explorerAddress } from "../lib/env";
import { asks, events, payments, tasks } from "../lib/db";
import { usdcMint } from "../lib/chain";

/** What the owner's browser will do: build and partially sign the funding transfer. */
async function ownerSignsFunding(owner: Keypair, taskWallet: PublicKey, micro: bigint, askId: string) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const payer = sponsor().publicKey;
  const mint = usdcMint();
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(
    createAssociatedTokenAccountIdempotentInstruction(payer, ata(taskWallet), taskWallet, mint),
    createTransferCheckedInstruction(ata(owner.publicKey), mint, ata(taskWallet), owner.publicKey, micro, USDC_DECIMALS),
    createMemoInstruction(`stipend:fund:${askId}`, [owner.publicKey]),
  );
  tx.partialSign(owner);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

async function main() {
  const injection = process.argv.includes("--inject");
  const goal = process.argv.find((a) => a.startsWith("--goal="))?.slice(7) ?? "What did Solana's durable nonce accounts change for offline signing, in two sentences?";
  const owner = loadOrCreateKeypair("test-owner");
  console.log("owner", owner.publicKey.toBase58(), explorerAddress(owner.publicKey.toBase58()));
  let bal = await usdcBalance(owner.publicKey);
  if (bal < toMicro(1)) {
    const sig = await mintDemoUsdc(owner.publicKey, toMicro(5));
    console.log("minted 5 demo USDC to owner", explorerTx(sig));
    bal = await usdcBalance(owner.publicKey);
  }
  console.log("owner USDC", fromMicro(bal));

  const { task, ask } = createTask(goal, toMicro(0.06), owner.publicKey.toBase58(), injection);
  console.log("task", task.id, "wallet", task.wallet_pubkey, "budget 0.06 USDC, injection", injection);

  const b64 = await ownerSignsFunding(owner, new PublicKey(task.wallet_pubkey), BigInt(ask.micro), ask.id);
  const t0 = Date.now();
  const fundSig = await approveAsk(ask.id, b64);
  console.log(`funded in ${Date.now() - t0} ms`, explorerTx(fundSig));

  await runTask(task.id);
  let t = tasks.get(task.id)!;
  // If the agent asked for more money, the owner decides here: approve once, then decline.
  let decisions = 0;
  while (t.status === "waiting_owner") {
    const pending = asks.forTask(task.id).find((a) => a.status === "pending")!;
    console.log("OWNER ASKED:", fromMicro(BigInt(pending.micro)), "USDC;", pending.reason, "; risk:", pending.risk);
    if (decisions === 0 && !injection) {
      const b = await ownerSignsFunding(owner, new PublicKey(task.wallet_pubkey), BigInt(pending.micro), pending.id);
      console.log("owner approves", explorerTx(await approveAsk(pending.id, b)));
      await runTask(task.id);
    } else {
      const { declineAsk } = await import("../lib/broker");
      await declineAsk(pending.id);
      console.log("owner declines");
    }
    decisions++;
    t = tasks.get(task.id)!;
  }
  console.log("\nSTATUS", t.status);
  console.log("ANSWER", t.answer?.slice(0, 600));
  console.log("\nPAYMENTS");
  for (const p of payments.forTask(task.id)) console.log(" ", p.service, fromMicro(BigInt(p.micro)), p.status, p.ms, "ms", p.sig ? explorerTx(p.sig) : "");
  console.log("\nEVENTS");
  for (const e of events.forTask(task.id)) console.log(" ", e.seq, e.type, e.data.slice(0, 140));
  console.log("\nswept", t.swept_micro != null ? fromMicro(BigInt(t.swept_micro)) : null, t.sweep_sig ? explorerTx(t.sweep_sig) : "");
  console.log("receipt", t.receipt_sig ? explorerTx(t.receipt_sig) : "none", t.receipt_hash);
  console.log("owner USDC now", fromMicro(await usdcBalance(owner.publicKey)));
}
main().catch((e) => { console.error(e); process.exit(1); });
