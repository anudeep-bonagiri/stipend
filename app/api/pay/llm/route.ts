export const dynamic = "force-dynamic";
import { requirePayment } from "@/lib/x402";
import { gemini } from "@/lib/llm";

export async function POST(req: Request) {
  const gate = await requirePayment(req, "llm");
  if ("response" in gate) return gate.response;
  const { prompt } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "prompt required" }, { status: 400 });
  const text = await gemini(prompt.slice(0, 20_000), true);
  return Response.json({ text, paid_by: gate.payment.authority, memo: gate.payment.memo });
}
