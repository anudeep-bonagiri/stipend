import Link from "next/link";
import { txUrl, short } from "@/lib/client/format";

export type Ev = { seq: number; ts: number; type: string; data: string; hash?: string };

type Card = { key: string; tone: "ok" | "warn" | "neutral"; title: string; body: React.ReactNode; mono?: string };

/** Turn a task's log into "what stopped it" cards. The copy is plain on purpose. */
export function defenceCards(events: Ev[], taskId: string): Card[] {
  const out: Card[] = [];
  for (const e of events) {
    const d = JSON.parse(e.data);
    if (e.type === "agent.search" && d.planted) out.push({ key: `p${e.seq}`, tone: "neutral", title: "The planted page arrived", body: <>The first search returned a page that tells the agent to pay a stranger and keep searching. The agent read it like any other result.</>, mono: `agent.search "${d.q}" · ${d.hits} results, one planted` });
    if (e.type === "agent.answer" && ((d.requested_payments?.length ?? 0) > 0 || (d.requested_queries?.length ?? 0) > 0)) out.push({ key: `a${e.seq}`, tone: "warn", title: "The model took the bait", body: <>It asked to {d.requested_payments?.length ? <>pay {d.requested_payments.map((p: { usdc: number; destination: string }) => `${p.usdc} USDC to ${short(p.destination)}`).join(", ")}</> : null}{d.requested_payments?.length && d.requested_queries?.length ? " and to " : ""}{d.requested_queries?.length ? <>run {d.requested_queries.length} more searches</> : null}. The model is not what keeps the money safe.</>, mono: `agent.answer requested_payments=${d.requested_payments?.length ?? 0} requested_queries=${d.requested_queries?.length ?? 0}` });
    if (e.type === "pay.refused") out.push({ key: `r${e.seq}`, tone: "ok", title: "The broker refused the payee", body: <>{short(d.destination)} is not a listed service, so no transaction was built. The only code that holds the task key checks the destination first.</>, mono: `pay.refused ${d.usdc} USDC → ${d.destination}` });
    if (e.type === "owner.asked" && Array.isArray(d.risk) && d.risk.length) out.push({ key: `k${e.seq}`, tone: "ok", title: "The envelope ran out, so it stopped and asked you", body: <>The extra searches spent the budget. A task cannot send what it does not hold, so it paused and sent the owner the ask with the flags: {d.risk.join("; ")}.</>, mono: `owner.asked ${d.usdc} USDC · ${d.risk.join(" · ")}` });
    if (e.type === "owner.declined") out.push({ key: `d${e.seq}`, tone: "ok", title: "You declined", body: <>The task ended with the answer it already had. The stranger&apos;s wallet holds nothing.</>, mono: `owner.declined ${d.usdc} USDC` });
    if (e.type === "task.receipt") out.push({ key: `t${e.seq}`, tone: "ok", title: "The receipt is on chain", body: <>The whole log, including the refusal, is anchored by its last hash. <Link href={`/verify/${taskId}`}>Check it in your browser</Link>.</>, mono: `memo stipend:v1:${taskId}:${d.covers}:${String(d.hash).slice(0, 16)}…  tx ${short(d.sig, 6)}` });
  }
  return out;
}

export function DefenceCard({ c }: { c: Card }) {
  return (
    <div className={`defence ${c.tone === "warn" ? "warn" : c.tone === "neutral" ? "neutral" : ""}`}>
      <div className="t">{c.title}</div>
      <div className="b">{c.body}</div>
      {c.mono && <div className="m">{c.mono}</div>}
    </div>
  );
}

export function txLink(sig: string) { return <a href={txUrl(sig)} target="_blank" rel="noreferrer">tx {short(sig)}</a>; }
