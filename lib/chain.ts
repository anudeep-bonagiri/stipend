import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { createMemoInstruction } from "@solana/spl-memo";
import { RPC_URL, USDC_DECIMALS, USDC_MINT } from "./env";
import { mintAuthority, sponsor } from "./keys";

export const connection = new Connection(RPC_URL, "confirmed");
export const usdcMint = () => new PublicKey(USDC_MINT);

export const toMicro = (usdc: number) => BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
export const fromMicro = (micro: bigint | number) => Number(micro) / 10 ** USDC_DECIMALS;

export function ata(owner: PublicKey) {
  return getAssociatedTokenAddressSync(usdcMint(), owner);
}

/** USDC balance in micro units. A missing token account counts as 0. */
export async function usdcBalance(owner: PublicKey): Promise<bigint> {
  try {
    const acct = await getAccount(connection, ata(owner));
    return acct.amount;
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) return 0n;
    throw e;
  }
}

export async function solBalance(pubkey: PublicKey) {
  return (await connection.getBalance(pubkey)) / LAMPORTS_PER_SOL;
}

export async function airdropIfLow(pubkey: PublicKey, minSol = 0.5, amountSol = 1) {
  const have = await solBalance(pubkey);
  if (have >= minSol) return have;
  const sig = await connection.requestAirdrop(pubkey, amountSol * LAMPORTS_PER_SOL);
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  return solBalance(pubkey);
}

/**
 * Move USDC from one wallet to another. The sponsor pays the fee and the rent
 * for the destination's token account, so the paying wallet spends only USDC.
 * The memo names the task, which is how the public can tie a payment to work.
 */
export async function transferUsdc(opts: {
  from: Keypair;
  to: PublicKey;
  micro: bigint;
  memo: string;
}): Promise<string> {
  const payer = sponsor();
  const mint = usdcMint();
  const src = ata(opts.from.publicKey);
  const dst = ata(opts.to);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, dst, opts.to, mint),
    createTransferCheckedInstruction(src, mint, dst, opts.from.publicKey, opts.micro, USDC_DECIMALS),
    createMemoInstruction(opts.memo, [opts.from.publicKey]),
  );
  tx.feePayer = payer.publicKey;
  return sendAndConfirmTransaction(connection, tx, [payer, opts.from], { commitment: "confirmed" });
}

/**
 * Send everything left in a task wallet back to the owner and close the token
 * account so its rent returns to the sponsor. Returns null if there was nothing.
 */
export async function sweepUsdc(opts: { from: Keypair; to: PublicKey; memo: string }) {
  const payer = sponsor();
  const mint = usdcMint();
  const src = ata(opts.from.publicKey);
  let amount: bigint;
  try {
    amount = (await getAccount(connection, src)).amount;
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) return null;
    throw e;
  }
  const dst = ata(opts.to);
  const tx = new Transaction();
  if (amount > 0n) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, dst, opts.to, mint),
      createTransferCheckedInstruction(src, mint, dst, opts.from.publicKey, amount, USDC_DECIMALS),
    );
  }
  tx.add(
    createCloseAccountInstruction(src, payer.publicKey, opts.from.publicKey),
    createMemoInstruction(opts.memo, [opts.from.publicKey]),
  );
  tx.feePayer = payer.publicKey;
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, opts.from], { commitment: "confirmed" });
  return { sig, micro: amount };
}

/** Demo money only: mint test USDC to any wallet. Not used with the real devnet USDC mint. */
export async function mintDemoUsdc(to: PublicKey, micro: bigint) {
  const payer = sponsor();
  const auth = mintAuthority();
  const mint = usdcMint();
  const dst = ata(to);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, dst, to, mint),
  );
  tx.feePayer = payer.publicKey;
  await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
  return mintTo(connection, payer, mint, dst, auth, micro);
}

/**
 * Write a short text to the chain. The sponsor pays the fee; extra signers (the
 * task wallet, for receipts) co-sign so the memo shows up under their address and
 * anyone can find it by scanning that address, without asking the box.
 */
export async function anchorMemo(text: string, extraSigners: Keypair[] = []): Promise<string> {
  const payer = sponsor();
  const tx = new Transaction().add(createMemoInstruction(text, [payer.publicKey, ...extraSigners.map((k) => k.publicKey)]));
  tx.feePayer = payer.publicKey;
  return sendAndConfirmTransaction(connection, tx, [payer, ...extraSigners], { commitment: "confirmed" });
}

export type ParsedPayment = {
  ok: boolean;
  reason?: string;
  destination?: string;
  authority?: string;
  micro?: bigint;
  memo?: string;
  slot?: number;
  blockTime?: number | null;
};

/**
 * Read a finalized-or-confirmed transaction back from the chain and pull out the
 * USDC transfer and memo. This is what a paid service calls before it serves.
 */
export async function readPayment(sig: string): Promise<ParsedPayment> {
  const tx = await connection.getParsedTransaction(sig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "transaction not found" };
  if (tx.meta?.err) return { ok: false, reason: "transaction failed on chain" };
  let destination: string | undefined;
  let authority: string | undefined;
  let micro: bigint | undefined;
  let memo: string | undefined;
  const mint = USDC_MINT;
  for (const ix of tx.transaction.message.instructions as (ParsedInstruction | PartiallyDecodedInstruction)[]) {
    if (!("parsed" in ix)) continue;
    if (ix.program === "spl-token" && ix.parsed?.type === "transferChecked" && ix.parsed.info?.mint === mint) {
      destination = ix.parsed.info.destination;
      authority = ix.parsed.info.authority;
      micro = BigInt(ix.parsed.info.tokenAmount.amount);
    }
    if (ix.program === "spl-memo") memo = typeof ix.parsed === "string" ? ix.parsed : String(ix.parsed);
  }
  if (micro === undefined) return { ok: false, reason: "no USDC transfer in this transaction" };
  return { ok: true, destination, authority, micro, memo, slot: tx.slot, blockTime: tx.blockTime };
}

/** Read the memo text of any transaction (for receipt verification). */
export async function readMemo(sig: string): Promise<string | null> {
  const p = await readPaymentOrMemo(sig);
  return p;
}

async function readPaymentOrMemo(sig: string) {
  const tx = await connection.getParsedTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx || tx.meta?.err) return null;
  for (const ix of tx.transaction.message.instructions as (ParsedInstruction | PartiallyDecodedInstruction)[]) {
    if ("parsed" in ix && ix.program === "spl-memo") return typeof ix.parsed === "string" ? ix.parsed : String(ix.parsed);
  }
  return null;
}
