"use client";
import { Keypair } from "@solana/web3.js";

const KEY = "stipend.owner.secret";

/** The owner's key lives only in this browser. The box never sees it. */
export function loadOwner(): Keypair | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export function createOwner(): Keypair {
  const kp = Keypair.generate();
  try { localStorage.setItem(KEY, JSON.stringify(Array.from(kp.secretKey))); } catch { /* private mode */ }
  return kp;
}

export function forgetOwner() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
