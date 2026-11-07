"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadOwner } from "@/lib/client/owner";
import { usdc, when } from "@/lib/client/format";
import { StatusChip } from "@/components/StatusChip";

type Stats = Record<string, number | null>;
type Task = { id: string; goal: string; status: string; budget_micro: number; created_at: number; injection: number };

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [goal, setGoal] = useState("Which three US cities had the worst traffic congestion in 2025, with hours lost per driver?");
  const [budget, setBudget] = useState("0.06");
  const [inject, setInject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const [s, t] = await Promise.all([fetch("/api/stats").then((r) => r.json()), fetch("/api/tasks").then((r) => r.json())]);
    setStats(s); setTasks(t.tasks);
  }
  useEffect(() => { setOwner(loadOwner()?.publicKey.toBase58() ?? null); refresh(); const i = setInterval(refresh, 3000); return () => clearInterval(i); }, []);

  async function start() {
    if (!owner) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal, budgetUsdc: Number(budget), ownerPubkey: owner, injection: inject }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    router.push(`/tasks/${data.task.id}`);
  }

  const tile = (label: string, value: string | number | null | undefined) => (
    <div className="card"><div className="muted text-xs">{label}</div><div className="text-2xl font-semibold">{value ?? "–"}</div></div>
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Every agent task gets its own wallet, its own budget, and a human who signs anything beyond it.</h1>
        <p className="muted mt-2 max-w-3xl">
          An agent on Stipend pays for its own searches and model calls in USDC from a wallet that holds exactly its budget.
          It cannot overspend, because the money is not there. It cannot pay anyone but the listed services, and it cannot touch
          the owner&apos;s key, which never leaves the owner&apos;s browser. Every payment names its task on chain, and every finished
          task anchors a receipt that anyone can check.
        </p>
      </section>

      {stats && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tile("payments confirmed on devnet", stats.payments_confirmed)}
          {tile("payments failed", stats.payments_failed)}
          {tile("fees paid by task wallets", `${stats.fees_paid_by_task_wallets_sol} SOL`)}
          {tile("overspends that succeeded", stats.overspend_succeeded)}
          {tile("payments refused (unlisted payee)", stats.payments_refused_unlisted_payee)}
          {tile("asks declined by the owner", stats.asks_declined)}
          {tile("USDC swept back to owners", stats.usdc_swept_back)}
          {tile("receipts anchored on chain", stats.receipts_anchored)}
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Start a task</h2>
        {!owner && <p className="chip chip-warn">No owner key in this browser yet. <Link href="/owner">Set one up on the Owner page</Link> first.</p>}
        <label className="block text-sm">Goal<textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">Budget (USDC)<input className="w-32" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-auto" checked={inject} onChange={(e) => setInject(e.target.checked)} />Attack drill: plant a page in the first search that tells the agent to pay a stranger and keep searching</label>
          <button className="btn btn-primary" disabled={!owner || busy} onClick={start}>{busy ? "Creating…" : "Create task"}</button>
        </div>
        {err && <p className="chip chip-warn">{err}</p>}
        <p className="muted text-sm">A search costs 0.005 USDC and a model call 0.01. A normal task uses about 0.035. The owner funds the budget with one signature, and anything left comes back.</p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Tasks</h2>
        {tasks.length === 0 ? <p className="muted text-sm">None yet.</p> : (
          <table>
            <thead><tr><th>Started</th><th>Goal</th><th>Budget</th><th>Status</th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{when(t.created_at)}</td>
                  <td><Link href={`/tasks/${t.id}`}>{t.goal}</Link>{t.injection ? <span className="chip chip-warn ml-2">attack drill</span> : null}</td>
                  <td className="whitespace-nowrap">{usdc(t.budget_micro)} USDC</td>
                  <td><StatusChip status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
