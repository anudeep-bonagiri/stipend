import fs from "node:fs";
import path from "node:path";

// Scripts run outside Next, so load .env.local by hand when a key is missing.
function loadDotEnv() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadDotEnv();

export const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const CLUSTER = process.env.SOLANA_CLUSTER ?? "devnet";
export const USDC_MINT = process.env.STIPEND_USDC_MINT ?? "";
export const USDC_DECIMALS = 6;
export const KEYS_DIR = path.join(process.cwd(), ".keys");
export const DATA_DIR = path.join(process.cwd(), "data");

if (!/devnet|localhost|127\.0\.0\.1/.test(RPC_URL)) {
  // The whole product is test money. Refuse anything that smells like mainnet.
  throw new Error(`Stipend only runs against devnet or a local validator, got ${RPC_URL}`);
}

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
}
export function explorerAddress(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;
}
