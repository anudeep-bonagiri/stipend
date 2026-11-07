import { runTask } from "@/lib/agent";
import { approveAsk } from "@/lib/broker";
import { asks } from "@/lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { tx } = await req.json();
  if (typeof tx !== "string") return Response.json({ error: "signed tx required" }, { status: 400 });
  try {
    const sig = await approveAsk(id, tx);
    const ask = asks.get(id)!;
    // Fire and forget: the task runs in the background and the pages poll for it.
    void runTask(ask.task_id);
    return Response.json({ sig });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
