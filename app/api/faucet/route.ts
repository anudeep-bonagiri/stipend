import { PublicKey } from "@solana/web3.js";
import { mintDemoUsdc, toMicro } from "@/lib/chain";
import { faucet } from "@/lib/db";

/** Demo money. Only works while the mint is our own devnet test mint. */
export async function POST(req: Request) {
  const { pubkey } = await req.json();
  if (!process.env.STIPEND_USDC_LABEL?.includes("demo")) return Response.json({ error: "faucet is off for a real mint" }, { status: 400 });
  const why = faucet.allow(String(pubkey));
  if (why) return Response.json({ error: why }, { status: 429 });
  try {
    const sig = await mintDemoUsdc(new PublicKey(pubkey), toMicro(5));
    return Response.json({ sig, usdc: 5 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
