"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadOwner } from "@/lib/client/owner";
import { txUrl, usdc, when } from "@/lib/client/format";
import { StatusChip } from "@/components/StatusChip";

type Stats = Record<string, number | null>;
type Task = { id: string; goal: string; status: string; budget_micro: number; created_at: number; injection: number };
type Feed = {
  needs_you: { id: string; task_id: string; micro: number; reason: string; risk: string[]; goal: string }[];
  running: { id: string; goal: string; status: string }[];
  spent_today_micro: number; payments_today: number; drills_today: number;
  recent: { id: string; task_id: string; service: string; micro: number; sig: string | null; status: string; ms: number | null; created_at: number; goal: string }[];
};

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [goal, setGoal] = useState("Which three US cities had the worst traffic congestion in 2025, with hours lost per driver?");
  const [budget, setBudget] = useState("0.06");
  const [inject, setInject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hello, setHello] = useState("Hello");

  async function refresh() {
    const [s, t, f] = await Promise.all([fetch("/api/stats").then((r) => r.json()), fetch("/api/tasks").then((r) => r.json()), fetch("/api/feed").then((r) => r.json())]);
    setStats(s); setTasks(t.tasks); setFeed(f);
  }
  useEffect(() => { let alive = true; Promise.resolve().then(() => { if (!alive) return; setHello(greeting()); setOwner(loadOwner()?.publicKey.toBase58() ?? null); refresh(); }); const i = setInterval(refresh, 2500); return () => { alive = false; clearInterval(i); }; }, []);

  async function start() {
    if (!owner) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal, budgetUsdc: Number(budget), ownerPubkey: owner, injection: inject }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    router.push(`/tasks/${data.task.id}`);
  }

  const tile = (label: string, value: string | number | null | undefined, good = false) => (
    <div className="stat"><div className="muted text-xs">{label}</div><div className={`n${good ? " good" : ""}`} style={{ fontSize: 22 }}>{value ?? "–"}</div></div>
  );
  const needs = feed?.needs_you ?? [], running = feed?.running ?? [];

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-3xl font-semibold leading-tight">{hello}</h1>
        <p className="muted mt-1">{needs.length} {needs.length === 1 ? "ask needs" : "asks need"} you. {running.length} running. {feed ? `${feed.payments_today} payments today, ${feed.drills_today} attack ${feed.drills_today === 1 ? "drill" : "drills"} run.` : ""}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="summary">
          <div className="k">Needs you</div>
          <div className={`n ${needs.length ? "warn" : ""}`}>{needs.length}</div>
          <ul>{needs.slice(0, 3).map((a) => <li key={a.id}><Link href="/owner">{usdc(a.micro)} USDC · {a.goal}</Link></li>)}{!needs.length && <li>Nothing waiting on you.</li>}</ul>
        </div>
        <div className="summary">
          <div className="k">Running</div>
          <div className="n good">{running.length}</div>
          <ul>{running.slice(0, 3).map((t) => <li key={t.id}><Link href={`/tasks/${t.id}`}>{t.goal}</Link></li>)}{!running.length && <li>No task is running.</li>}</ul>
        </div>
        <div className="summary">
          <div className="k">Spent today</div>
          <div className="n">{feed ? `${usdc(feed.spent_today_micro)} test USDC` : "–"}</div>
          <ul><li>{feed?.payments_today ?? 0} payments, {stats?.payments_failed ?? 0} failed</li><li>{stats?.payments_refused_unlisted_payee ?? 0} payments to strangers refused, all time</li><li>Test money on devnet</li></ul>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">Start a task</h2>
          <Link href="/attack" className="btn">Attack it yourself</Link>
        </div>
        {!owner && <p className="chip chip-warn" style={{ whiteSpace: "normal" }}>No owner key in this browser yet. <Link href="/owner">Set one up on the Owner page</Link> first.</p>}
        <label className="block text-sm">Goal<textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">Budget (USDC)<input className="w-32" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-auto" checked={inject} onChange={(e) => setInject(e.target.checked)} />Attack drill: plant a page in the first search that tells the agent to pay a stranger and keep searching</label>
          <button className="btn btn-primary" disabled={!owner || busy} onClick={start}>{busy ? "Creating…" : "Create task"}</button>
        </div>
        {err && <p className="chip chip-warn">{err}</p>}
        <p className="muted text-sm">A search costs 0.005 USDC and a model call 0.01. A normal task uses about 0.035. The owner funds the budget with one signature on the Owner page, and anything left comes back.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="card md:col-span-3">
          <h2 className="mb-2 font-semibold">Latest payments <span className="muted text-xs">every one is a transaction on devnet</span></h2>
          {!feed?.recent.length ? <p className="muted text-sm">None yet.</p> : (
            <ul className="feed">{feed.recent.map((p) => (
              <li key={p.id}><span className="muted">{when(p.created_at)}</span><span><span className="sv">{p.service}</span></span><span className="truncate"><Link href={`/tasks/${p.task_id}`}>{p.goal}</Link></span><span>{usdc(p.micro)} USDC</span><span>{p.sig ? <a href={txUrl(p.sig)} target="_blank" rel="noreferrer">{p.ms} ms ↗</a> : p.status}</span></li>
            ))}</ul>
          )}
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-3 content-start">
          {stats && <>
            {tile("payments confirmed", stats.payments_confirmed, true)}
            {tile("payments failed", stats.payments_failed)}
            {tile("task wallets holding any SOL right now", stats.task_wallets_that_ever_held_sol != null ? `${stats.task_wallets_that_ever_held_sol} of ${stats.task_wallets_checked}` : "checking")}
            {tile("overspends that succeeded", stats.overspend_succeeded)}
            {tile("receipts anchored", stats.receipts_anchored, true)}
            {tile("USDC swept back", stats.usdc_swept_back)}
            {tile("payment confirmed, median", stats.payment_ms_median != null ? `${stats.payment_ms_median} ms` : null, true)}
            {tile("drills: took the bait / stranger holds", stats.drills_run != null ? `${stats.drills_model_took_bait} of ${stats.drills_run} / ${stats.stranger_usdc_received ?? "?"}` : null)}
          </>}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Tasks</h2>
        {tasks.length === 0 ? <p className="muted text-sm">None yet.</p> : (
          <table>
            <thead><tr><th>Started</th><th>Goal</th><th>Budget</th><th>Status</th></tr></thead>
            <tbody>
              {tasks.slice(0, 12).map((t) => (
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
