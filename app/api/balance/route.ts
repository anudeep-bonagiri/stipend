export const dynamic = "force-dynamic";
import { PublicKey } from "@solana/web3.js";
import { fromMicro, usdcBalance } from "@/lib/chain";

export async function GET(req: Request) {
  const pubkey = new URL(req.url).searchParams.get("pubkey") ?? "";
  try {
    return Response.json({ usdc: fromMicro(await usdcBalance(new PublicKey(pubkey))) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
