import { requirePayment } from "@/lib/x402";
import { tavily } from "@/lib/llm";

export async function POST(req: Request) {
  const gate = await requirePayment(req, "search");
  if ("response" in gate) return gate.response;
  const { query } = await req.json();
  if (typeof query !== "string" || !query.trim()) return Response.json({ error: "query required" }, { status: 400 });
  const hits = await tavily(query.slice(0, 300), 3);
  return Response.json({ hits, paid_by: gate.payment.authority, memo: gate.payment.memo });
}
