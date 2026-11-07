import { connection } from "next/server";
import { events, tasks } from "@/lib/db";

/** Everything a browser needs to re-check a task's receipt on its own. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection(); // always live, never prerendered
  const { id } = await ctx.params;
  const task = tasks.get(id);
  if (!task) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ task_id: id, receipt_sig: task.receipt_sig, receipt_hash: task.receipt_hash, events: events.forTask(id) });
}
