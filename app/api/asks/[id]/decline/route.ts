import { declineAsk } from "@/lib/broker";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { signature } = await req.json().catch(() => ({}));
  if (typeof signature !== "string") return Response.json({ error: "owner signature required" }, { status: 400 });
  try {
    await declineAsk(id, signature);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
