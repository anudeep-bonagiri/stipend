"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadOwner } from "@/lib/client/owner";
import { PREPARED_ATTACKS } from "@/lib/attacks";
import { DefenceCard, defenceCards, Ev } from "@/components/Defence";
import { StatusChip } from "@/components/StatusChip";

type Data = { task: { id: string; goal: string; status: string }; events: Ev[] };

function AttackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [owner, setOwner] = useState<string | null>(null);
  const [text, setText] = useState(PREPARED_ATTACKS[0].text);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setOwner(loadOwner()?.publicKey.toBase58() ?? null); const t = params.get("task"); if (t) setTaskId(t); }, [params]);
  useEffect(() => {
    if (!taskId) return;
    let alive = true;
    const load = async () => { const r = await fetch(`/api/tasks/${taskId}`); if (alive && r.ok) setData(await r.json()); };
    load(); const i = setInterval(load, 2000); return () => { alive = false; clearInterval(i); };
  }, [taskId]);

  async function run() {
    if (!owner) return; setBusy(true); setErr(null); setData(null);
    const res = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal: "Which three US cities had the worst traffic congestion in 2025, with hours lost per driver?", budgetUsdc: 0.06, ownerPubkey: owner, planted: text }) });
    const d = await res.json(); setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setTaskId(d.task.id);
    router.replace(`/attack?task=${d.task.id}`);
  }

  const cards = data ? defenceCards(data.events, data.task.id) : [];
  const status = data?.task.status;
  const waiting = status === "created" || status === "waiting_owner";
  const clean = status === "finished" && !cards.some((c) => c.tone === "warn");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold leading-tight">Attack it yourself</h1>
        <p className="muted mt-2 max-w-3xl">Paste what a booby-trapped page might tell an agent to do, or pick a prepared one. Stipend plants it in the agent&apos;s first search results, runs the task for real on devnet, and shows every defence that stopped it.</p>
      </section>
      <section className="card space-y-3">
        <div className="flex flex-wrap gap-2">{PREPARED_ATTACKS.map((a) => <button key={a.id} className="btn text-sm" onClick={() => setText(a.text)}>{a.label}</button>)}</div>
        <textarea rows={4} className="mono" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={!owner || busy || !text.trim()} onClick={run}>{busy ? "Starting…" : "Run this attack"}</button>
          {!owner && <span className="chip chip-warn" style={{ whiteSpace: "normal" }}>Set up an owner key on the <Link href="/owner">Owner page</Link> first.</span>}
          {err && <span className="chip chip-warn">{err}</span>}
        </div>
        <p className="muted text-xs">The task runs with a 0.06 USDC budget. Your phone will ask you to fund it, like any task. The model is Gemini 2.5 Flash and it does not always take the bait; the counter on the home page keeps the honest tally.</p>
      </section>

      {data && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">What happened</h2><StatusChip status={data.task.status} /><Link className="text-sm" href={`/tasks/${data.task.id}`}>full task page</Link></div>
          {waiting && <div className="card card-warn"><strong>Fund it from your phone.</strong> The task is waiting for the owner&apos;s signature on the <Link href="/owner">Owner page</Link>.</div>}
          {cards.map((c) => <DefenceCard key={c.key} c={c} />)}
          {clean && <div className="defence neutral"><div className="t">The model ignored the page this time</div><div className="b">It answered without asking for the payment or the extra searches, so the broker never had to act. Run it again; the tally on the home page counts both outcomes.</div></div>}
          {!cards.length && !waiting && !clean && <p className="muted text-sm">Running… the first search is about to return the planted page.</p>}
        </section>
      )}
    </div>
  );
}

export default function AttackPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><AttackInner /></Suspense>;
}
