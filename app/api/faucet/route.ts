import { PublicKey } from "@solana/web3.js";
import { mintDemoUsdc, toMicro } from "@/lib/chain";

/** Demo money. Only works while the mint is our own devnet test mint. */
export async function POST(req: Request) {
  const { pubkey } = await req.json();
  if (!process.env.STIPEND_USDC_LABEL?.includes("demo")) return Response.json({ error: "faucet is off for a real mint" }, { status: 400 });
  try {
    const sig = await mintDemoUsdc(new PublicKey(pubkey), toMicro(5));
    return Response.json({ sig, usdc: 5 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
