import { connection } from "@/lib/chain";
import { USDC_MINT, USDC_DECIMALS, CLUSTER } from "@/lib/env";
import { sponsor } from "@/lib/keys";

/** What the owner's browser needs to build a funding transaction the sponsor will pay for. */
export async function GET() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return Response.json({ blockhash, lastValidBlockHeight, sponsor: sponsor().publicKey.toBase58(), mint: USDC_MINT, decimals: USDC_DECIMALS, cluster: CLUSTER });
}
