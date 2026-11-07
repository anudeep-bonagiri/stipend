"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addrUrl, txUrl, short, usdc, when } from "@/lib/client/format";
import { StatusChip } from "@/components/StatusChip";

type Payment = { id: string; service: string; destination: string; micro: number; sig: string | null; status: string; ms: number | null; created_at: number };
type Ev = { seq: number; ts: number; type: string; data: string; hash: string };
type Task = { id: string; goal: string; status: string; budget_micro: number; owner_pubkey: string; wallet_pubkey: string; injection: number; answer: string | null; funded_sig: string | null; sweep_sig: string | null; swept_micro: number | null; receipt_sig: string | null; receipt_hash: string | null };
type Data = { task: Task; balance_usdc: number | null; payments: Payment[]; events: Ev[] };

function describe(e: Ev, taskId: string): { text: React.ReactNode; tone?: "warn" | "ok" } {
  const d = JSON.parse(e.data);
  const link = (sig: string) => <a href={txUrl(sig)} target="_blank" rel="noreferrer">tx {short(sig)}</a>;
  switch (e.type) {
    case "task.created": return { text: <>Task created with a fresh wallet <a className="mono" href={addrUrl(d.wallet)} target="_blank" rel="noreferrer">{short(d.wallet)}</a>, budget {d.budget_usdc} USDC{d.injection ? ", attack drill on" : ""}.</> };
    case "owner.asked": return { text: <>Asked the owner for {d.usdc} USDC: {d.reason}{d.risk?.length ? <> · flags: {d.risk.join("; ")}</> : null}</>, tone: d.risk?.length ? "warn" : undefined };
    case "owner.approved": return { text: <>Owner signed {d.usdc} USDC into the task wallet, confirmed in {d.ms} ms · {link(d.sig)}</>, tone: "ok" };
    case "owner.declined": return { text: <>Owner declined {d.usdc} USDC. The task ends here.</>, tone: "warn" };
    case "pay.sent": return { text: <>Paid {d.usdc} USDC for {d.service} in {d.ms} ms · {link(d.sig)}</> };
    case "pay.refused": return { text: <>Refused: the agent tried to pay {d.usdc} USDC to <span className="mono">{short(d.to ?? d.destination)}</span>, which is not a listed service. Reason it gave: &ldquo;{d.reason}&rdquo;</>, tone: "warn" };
    case "pay.failed": return { text: <>Payment for {d.service} failed: {d.error}</>, tone: "warn" };
    case "agent.plan": return { text: <>Agent planned searches: {d.queries.join(" · ")}</> };
    case "agent.search": return { text: <>Searched &ldquo;{d.q}&rdquo;: {d.hits} results{d.planted ? ", one of them a planted page telling the agent to pay a stranger and keep searching" : ""}</>, tone: d.planted ? "warn" : undefined };
    case "agent.answer": return { text: <>Agent wrote an answer{d.requested_payments?.length ? <>, and asked to pay {d.requested_payments.map((p: { usdc: number; destination: string }) => `${p.usdc} USDC to ${short(p.destination)}`).join(", ")}</> : null}{d.requested_queries?.length ? <>, and asked for {d.requested_queries.length} more searches</> : null}.</>, tone: d.requested_payments?.length || d.requested_queries?.length ? "warn" : undefined };
    case "agent.error": return { text: <>Agent error: {d.error}</>, tone: "warn" };
    case "task.ended": return { text: <>Task ended: {d.status}.</> };
    case "task.swept": return { text: <>Swept {d.usdc} USDC back to the owner and closed the task&apos;s token account · {link(d.sig)}</>, tone: "ok" };
    case "task.receipt": return { text: <>Receipt anchored on chain: hash of log entries 1 to {d.covers} · {link(d.sig)} · <Link href={`/verify/${taskId}`}>verify</Link></>, tone: "ok" };
    default: return { text: <>{e.type} {e.data.slice(0, 120)}</> };
  }
}

function TaskPageInner() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => { const r = await fetch(`/api/tasks/${id}`); if (alive && r.ok) setData(await r.json()); };
    load(); const i = setInterval(load, 2000); return () => { alive = false; clearInterval(i); };
  }, [id]);
  if (!data) return <p className="muted">Loading…</p>;
  const { task, payments, events, balance_usdc } = data;
  const spent = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.micro, 0);
  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold leading-tight">{task.goal}</h1><StatusChip status={task.status} />{task.injection ? <span className="chip chip-warn">attack drill</span> : null}</div>
        <div className="muted mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>budget {usdc(task.budget_micro)} USDC</span>
          <span>spent {usdc(spent)} USDC</span>
          <span>wallet holds {balance_usdc ?? "–"} USDC</span>
          <span>task wallet <a className="mono" href={addrUrl(task.wallet_pubkey)} target="_blank" rel="noreferrer">{short(task.wallet_pubkey)}</a></span>
          <span>owner <a className="mono" href={addrUrl(task.owner_pubkey)} target="_blank" rel="noreferrer">{short(task.owner_pubkey)}</a></span>
        </div>
      </section>

      {(task.status === "created" || task.status === "waiting_owner") && (
        <section className="card card-warn">
          <strong>Waiting for the owner.</strong> The task cannot spend what it does not hold. <Link href="/owner">Decide on the Owner page</Link>.
        </section>
      )}

      {task.answer && (
        <section className="card"><h2 className="mb-1 font-semibold">{task.status === "declined" ? "What the agent had written when the owner declined" : "Answer"}</h2><p className="whitespace-pre-wrap text-sm">{task.answer}</p></section>
      )}

      <section className="card">
        <h2 className="mb-2 font-semibold">Payments from the task wallet</h2>
        {payments.length === 0 ? <p className="muted text-sm">None yet.</p> : (
          <table>
            <thead><tr><th>Time</th><th>Service</th><th>USDC</th><th>Confirmed in</th><th>On chain</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.id}><td>{when(p.created_at)}</td><td>{p.service}</td><td>{usdc(p.micro)}</td><td>{p.ms != null ? `${p.ms} ms` : "–"}</td><td>{p.sig ? <a href={txUrl(p.sig)} target="_blank" rel="noreferrer">{short(p.sig, 6)}</a> : p.status}</td></tr>
            ))}</tbody>
          </table>
        )}
        <p className="muted mt-2 text-xs">Fees for every one of these were paid by the sponsor. The task wallet never held SOL.</p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Action log <span className="muted text-xs">hash-chained; the receipt at the end is written to Solana</span></h2>
        <ol className="log space-y-1.5 text-sm">
          {events.map((e) => { const d = describe(e, task.id); return (
            <li key={e.seq} className={`flex gap-3 ${d.tone ?? ""}`}>
              <span className="muted w-20 shrink-0">{when(e.ts)}</span><span>{d.text}</span>
            </li>
          ); })}
        </ol>
        {task.receipt_sig && (
          <p className="mt-3 text-sm">Receipt: <a href={txUrl(task.receipt_sig)} target="_blank" rel="noreferrer">memo on devnet</a> · <Link href={`/verify/${task.id}`}>check it in your browser</Link></p>
        )}
      </section>
    </div>
  );
}

export default function TaskPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><TaskPageInner /></Suspense>;
}
