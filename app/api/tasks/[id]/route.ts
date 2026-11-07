import { connection } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { fromMicro, usdcBalance } from "@/lib/chain";
import { asks, events, payments, tasks } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection(); // always live, never prerendered
  const { id } = await ctx.params;
  const task = tasks.get(id);
  if (!task) return Response.json({ error: "not found" }, { status: 404 });
  const safe = Object.fromEntries(Object.entries(task).filter(([k]) => k !== "wallet_secret"));
  let balance_usdc: number | null = null;
  try { balance_usdc = fromMicro(await usdcBalance(new PublicKey(task.wallet_pubkey))); } catch { /* chain unreachable */ }
  return Response.json({
    task: safe, balance_usdc,
    payments: payments.forTask(id), events: events.forTask(id), asks: asks.forTask(id),
  });
}
