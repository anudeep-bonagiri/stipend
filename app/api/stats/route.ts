export const dynamic = "force-dynamic";
import { computeStats } from "@/lib/stats";

export async function GET() {
  return Response.json(await computeStats());
}
