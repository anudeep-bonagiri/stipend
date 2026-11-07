import { connection } from "next/server";
import { asks, tasks } from "@/lib/db";

export async function GET(req: Request) {
  await connection(); // always live, never prerendered
  const owner = new URL(req.url).searchParams.get("owner");
  const pending = asks.pending()
    .map((a) => ({ ask: a, task: tasks.get(a.task_id)! }))
    .filter((x) => !owner || x.task.owner_pubkey === owner)
    .map(({ ask, task }) => ({ ...ask, risk: JSON.parse(ask.risk) as string[], goal: task.goal, wallet_pubkey: task.wallet_pubkey, task_status: task.status, budget_micro: task.budget_micro }));
  return Response.json({ asks: pending });
}
