"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Connection } from "@solana/web3.js";
import { txUrl, short, when } from "@/lib/client/format";

type Ev = { seq: number; task_id: string; ts: number; type: string; data: string; prev_hash: string; hash: string };
type V = { task_id: string; receipt_sig: string | null; receipt_hash: string | null; events: Ev[] };

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Recompute the chain exactly as the box does: each hash covers the previous one. */
async function recompute(events: Ev[]) {
  let prev = "0".repeat(64);
  const out: { seq: number; ok: boolean; computed: string }[] = [];
  for (const e of events) {
    const computed = await sha256(`${prev}\n${e.task_id}\n${e.ts}\n${e.type}\n${e.data}`);
    out.push({ seq: e.seq, ok: computed === e.hash, computed });
    prev = computed;
  }
  return out;
}

function VerifyPageInner() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<V | null>(null);
  const [rows, setRows] = useState<{ seq: number; ok: boolean }[]>([]);
  const [memo, setMemo] = useState<string | null | undefined>(undefined);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [tampered, setTampered] = useState(false);

  useEffect(() => { fetch(`/api/verify/${id}`).then((r) => r.json()).then(setV); }, [id]);

  useEffect(() => {
    if (!v) return;
    (async () => {
      const evs = tampered ? v.events.map((e, i) => (i === 3 ? { ...e, data: e.data.replace(/0\.0/, "0.9") } : e)) : v.events;
      const r = await recompute(evs);
      setRows(r);
      if (v.receipt_sig) {
        try {
          const conn = new Connection("https://api.devnet.solana.com", "confirmed");
          const tx = await conn.getParsedTransaction(v.receipt_sig, { maxSupportedTransactionVersion: 0 });
          const ix = tx?.transaction.message.instructions.find((i) => "program" in i && i.program === "spl-memo");
          const m = ix && "parsed" in ix ? String(ix.parsed) : null;
          setMemo(m);
          const parts = m?.split(":") ?? [];
          const covers = Number(parts[3]);
          const onChainHash = parts[4];
          const local = r[covers - 1];
          setChainOk(!!local && local.ok && local.computed === onChainHash && r.slice(0, covers).every((x) => x.ok));
        } catch { setMemo(null); setChainOk(null); }
      }
    })();
  }, [v, tampered]);

  if (!v) return <p className="muted">Loading…</p>;
  const firstBad = rows.find((r) => !r.ok);
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold">Check this task&apos;s receipt yourself</h1>
        <p className="muted mt-1 max-w-3xl text-sm">Your browser recomputes every hash in the log, reads the receipt memo straight from a public Solana node, and compares. The box is not asked whether the log is honest. One changed byte in any entry turns everything after it red.</p>
      </section>
      <section className="card space-y-2 text-sm">
        <div>Receipt on chain: {v.receipt_sig ? <a href={txUrl(v.receipt_sig)} target="_blank" rel="noreferrer">{short(v.receipt_sig, 8)}</a> : <span className="chip chip-warn">not anchored yet</span>}</div>
        <div>Memo read from devnet: {memo === undefined ? <span className="muted">reading…</span> : memo === null ? <span className="chip chip-warn">could not read (node unreachable or no memo)</span> : <span className="mono">{memo}</span>}</div>
        <div>Result: {chainOk === null ? <span className="muted">–</span> : chainOk ? <span className="chip chip-ok">log matches the receipt on Solana</span> : <span className="chip chip-warn">MISMATCH{firstBad ? `: entry ${firstBad.seq} was changed` : ""}</span>}</div>
        <div className="pt-2"><button className="btn" onClick={() => setTampered((t) => !t)}>{tampered ? "Undo the tamper test" : "Tamper test: change one number in entry 4"}</button></div>
      </section>
      <section className="card">
        <table>
          <thead><tr><th>#</th><th>Time</th><th>Entry</th><th>Hash</th><th>Check</th></tr></thead>
          <tbody>{v.events.map((e, i) => (
            <tr key={e.seq} style={{ color: rows[i] && !rows[i].ok ? "var(--warn)" : undefined }}>
              <td>{e.seq}</td><td className="whitespace-nowrap">{when(e.ts)}</td><td>{e.type} <span className="muted">{e.data.slice(0, 80)}</span></td><td className="mono">{short(e.hash, 6)}</td><td>{rows[i] ? (rows[i].ok ? "✓" : "✗") : "…"}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><VerifyPageInner /></Suspense>;
}
