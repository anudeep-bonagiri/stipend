"use client";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createMemoInstruction } from "@solana/spl-memo";

/**
 * Build the funding transfer in the owner's browser and sign it with the owner's
 * key. The sponsor (fee payer) signs on the box afterwards; it cannot change
 * what the owner signed.
 */
export async function signFunding(owner: Keypair, taskWallet: string, micro: bigint, askId: string): Promise<string> {
  const prep = await (await fetch("/api/tx/prepare")).json();
  const payer = new PublicKey(prep.sponsor);
  const mint = new PublicKey(prep.mint);
  const task = new PublicKey(taskWallet);
  const src = getAssociatedTokenAddressSync(mint, owner.publicKey);
  const dst = getAssociatedTokenAddressSync(mint, task);
  const tx = new Transaction({ feePayer: payer, blockhash: prep.blockhash, lastValidBlockHeight: prep.lastValidBlockHeight }).add(
    createAssociatedTokenAccountIdempotentInstruction(payer, dst, task, mint),
    createTransferCheckedInstruction(src, mint, dst, owner.publicKey, micro, prep.decimals),
    createMemoInstruction(`stipend:fund:${askId}`, [owner.publicKey]),
  );
  tx.partialSign(owner);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

import nacl from "tweetnacl";
/** Declining is also a signature only the owner can make: an ed25519 signature over "stipend:decline:<askId>". */
export function signDecline(owner: Keypair, askId: string): string {
  const msg = new TextEncoder().encode(`stipend:decline:${askId}`);
  return Buffer.from(nacl.sign.detached(msg, owner.secretKey)).toString("base64");
}
