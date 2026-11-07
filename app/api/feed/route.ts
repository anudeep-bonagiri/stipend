import { connection } from "next/server";
import { asks, payments, tasks } from "@/lib/db";

/** What the home page needs: who needs you, what is running, what was spent today, the latest payments. */
export async function GET() {
  await connection();
  const all = tasks.list();
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const pending = asks.pending().map((a) => ({ ...a, risk: JSON.parse(a.risk) as string[], goal: tasks.get(a.task_id)?.goal ?? "" }));
  const running = all.filter((t) => ["funded", "running"].includes(t.status)).map(({ id, goal, status, created_at }) => ({ id, goal, status, created_at }));
  const todays = payments.all().filter((p) => p.status === "confirmed" && p.created_at >= dayStart.getTime());
  const blockedToday = all.filter((t) => t.created_at >= dayStart.getTime() && t.injection).length;
  return Response.json({
    needs_you: pending.map(({ id, task_id, micro, reason, risk, goal }) => ({ id, task_id, micro, reason, risk, goal })),
    running,
    spent_today_micro: todays.reduce((s, p) => s + p.micro, 0),
    payments_today: todays.length,
    drills_today: blockedToday,
    recent: payments.recent(8).map(({ id, task_id, service, micro, sig, status, ms, created_at, goal }) => ({ id, task_id, service, micro, sig, status, ms, created_at, goal })),
  });
}
