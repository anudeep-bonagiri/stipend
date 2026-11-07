import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { KEYS_DIR } from "./env";

// Keys the box owns: the fee sponsor and (demo only) the mint authority.
// The owner's key is never here. It lives in the owner's browser.
export function loadOrCreateKeypair(name: string): Keypair {
  fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  const file = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    const secret = Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")));
    return Keypair.fromSecretKey(secret);
  }
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  return kp;
}

export const sponsor = () => loadOrCreateKeypair("sponsor");
export const mintAuthority = () => loadOrCreateKeypair("mint-authority");
