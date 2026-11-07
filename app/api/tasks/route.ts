import { connection } from "next/server";
import { createTask } from "@/lib/broker";
import { toMicro } from "@/lib/chain";
import { tasks } from "@/lib/db";

export async function GET() {
  await connection(); // always live, never prerendered
  return Response.json({ tasks: tasks.list().map((t) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== "wallet_secret"))) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const goal = String(body.goal ?? "").trim().slice(0, 500);
  const budget = Number(body.budgetUsdc);
  const owner = String(body.ownerPubkey ?? "");
  if (!goal) return Response.json({ error: "goal required" }, { status: 400 });
  if (!(budget > 0 && budget <= 5)) return Response.json({ error: "budget must be between 0 and 5 USDC" }, { status: 400 });
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(owner)) return Response.json({ error: "ownerPubkey required" }, { status: 400 });
  const planted = typeof body.planted === "string" && body.planted.trim() ? body.planted.trim().slice(0, 1500) : null;
  const { task, ask } = createTask(goal, toMicro(budget), owner, !!body.injection || !!planted, planted);
  const safe = Object.fromEntries(Object.entries(task).filter(([k]) => k !== "wallet_secret"));
  return Response.json({ task: safe, ask });
}
