/**
 * One-time devnet setup for the box: fund the fee sponsor, create the demo USDC
 * mint (unless STIPEND_USDC_MINT already points at a real one), and write .env.local.
 */
import fs from "node:fs";
import { createMint } from "@solana/spl-token";
import { connection, airdropIfLow, solBalance } from "../lib/chain";
import { sponsor, mintAuthority } from "../lib/keys";
import { USDC_MINT, USDC_DECIMALS, RPC_URL } from "../lib/env";

async function main() {
  const payer = sponsor();
  console.log("rpc", RPC_URL);
  console.log("sponsor", payer.publicKey.toBase58());
  for (let i = 0; i < 3; i++) {
    try {
      const bal = await airdropIfLow(payer.publicKey, 1, 2);
      console.log("sponsor SOL", bal);
      break;
    } catch (e) {
      console.log("airdrop attempt", i + 1, "failed:", (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  if ((await solBalance(payer.publicKey)) < 0.1) {
    console.log("Sponsor has no SOL. Fund it at https://faucet.solana.com with the address above, then rerun.");
    process.exit(1);
  }
  let mint = USDC_MINT;
  if (!mint) {
    const auth = mintAuthority();
    const m = await createMint(connection, payer, auth.publicKey, null, USDC_DECIMALS);
    mint = m.toBase58();
    console.log("created demo USDC mint", mint);
    const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
    fs.writeFileSync(".env.local", env + `STIPEND_USDC_MINT=${mint}\nSTIPEND_USDC_LABEL=demo USDC (6 decimals, our own devnet mint)\n`);
  } else {
    console.log("using existing mint", mint);
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
