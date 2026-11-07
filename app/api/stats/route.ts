import { connection } from "next/server";
import { computeStats } from "@/lib/stats";

export async function GET() {
  await connection(); // always live, never prerendered
  return Response.json(await computeStats());
}
