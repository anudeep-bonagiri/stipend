"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Keypair } from "@solana/web3.js";
import { createOwner, forgetOwner, loadOwner } from "@/lib/client/owner";
import { signFunding } from "@/lib/client/fund";
import { addrUrl, txUrl, short, usdc } from "@/lib/client/format";

type Ask = { id: string; task_id: string; micro: number; reason: string; risk: string[]; goal: string; wallet_pubkey: string; task_status: string; budget_micro: number; created_at: number };

export default function OwnerPage() {
  const [owner, setOwner] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; sig?: string }[]>([]);
  const pub = owner?.publicKey.toBase58() ?? null;

  const refresh = useCallback(async () => {
    if (!pub) return;
    const [b, a] = await Promise.all([
      fetch(`/api/balance?pubkey=${pub}`).then((r) => r.json()),
      fetch(`/api/asks?owner=${pub}`).then((r) => r.json()),
    ]);
    if (typeof b.usdc === "number") setBalance(b.usdc);
    setAsks(a.asks ?? []);
  }, [pub]);

  useEffect(() => { setOwner(loadOwner()); }, []);
  useEffect(() => { refresh(); const i = setInterval(refresh, 2500); return () => clearInterval(i); }, [refresh]);

  async function faucet() {
    if (!pub) return;
    setBusy("faucet");
    const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey: pub }) });
    const d = await r.json();
    setLog((l) => [{ text: r.ok ? "Minted 5 demo USDC" : `Faucet failed: ${d.error}`, sig: d.sig }, ...l]);
    setBusy(null); refresh();
  }

  async function approve(a: Ask) {
    if (!owner) return;
    setBusy(a.id);
    try {
      const t0 = performance.now();
      const tx = await signFunding(owner, a.wallet_pubkey, BigInt(a.micro), a.id);
      const r = await fetch(`/api/asks/${a.id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx }) });
      const d = await r.json();
      const ms = Math.round(performance.now() - t0);
      setLog((l) => [{ text: r.ok ? `Approved ${usdc(a.micro)} USDC for "${a.goal}" in ${ms} ms` : `Approve failed: ${d.error}`, sig: d.sig }, ...l]);
    } catch (e) {
      setLog((l) => [{ text: `Approve failed: ${(e as Error).message}` }, ...l]);
    }
    setBusy(null); refresh();
  }

  async function decline(a: Ask) {
    setBusy(a.id);
    const r = await fetch(`/api/asks/${a.id}/decline`, { method: "POST" });
    const d = await r.json();
    setLog((l) => [{ text: r.ok ? `Declined ${usdc(a.micro)} USDC for "${a.goal}". The task ends and its leftover sweeps back.` : `Decline failed: ${d.error}` }, ...l]);
    setBusy(null); refresh();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold leading-tight">Owner</h1>
        <p className="muted mt-1 max-w-3xl">This is the phone in GurtOS&apos;s story, except the approval is a signature. Your key is generated here and never sent anywhere. Approving an ask signs a USDC transfer from this wallet into the task&apos;s wallet. The box only adds the fee.</p>
      </section>

      <section className="card space-y-3">
        {!owner ? (
          <button className="btn btn-primary" onClick={() => setOwner(createOwner())}>Create an owner key in this browser</button>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div><div className="muted text-xs">Owner wallet</div><a className="mono" href={addrUrl(pub!)} target="_blank" rel="noreferrer">{pub}</a></div>
              <div><div className="muted text-xs">USDC balance</div><div className="text-xl font-semibold">{balance ?? "–"}</div></div>
              <button className="btn" disabled={busy === "faucet"} onClick={faucet}>Get 5 demo USDC</button>
              <button className="btn" onClick={() => { forgetOwner(); setOwner(null); setBalance(null); }}>Forget this key</button>
            </div>
            <p className="muted text-sm">Demo USDC is our own devnet mint. The code is mint-agnostic: point STIPEND_USDC_MINT at the real devnet USDC mint and the faucet button turns off.</p>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Asks waiting for you {asks.length ? <span className="chip chip-warn ml-2">{asks.length}</span> : null}</h2>
        {asks.length === 0 ? <p className="muted text-sm">Nothing waiting. Start a task on the <Link href="/">Tasks page</Link> and it will ask for its budget here.</p> : asks.map((a) => (
          <div key={a.id} className={`rounded-xl border p-4 ${a.risk.length ? "card-warn" : ""}`} style={{ borderColor: a.risk.length ? undefined : "var(--line)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium">{usdc(a.micro)} USDC · <Link href={`/tasks/${a.task_id}`}>{a.goal}</Link></div>
              <div className="muted text-xs">task wallet <a className="mono" href={addrUrl(a.wallet_pubkey)} target="_blank" rel="noreferrer">{short(a.wallet_pubkey)}</a> · budget so far {usdc(a.budget_micro)}</div>
            </div>
            <div className="mt-1 text-sm">Agent&apos;s reason: {a.reason}</div>
            {a.risk.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{a.risk.map((r) => <span key={r} className="chip chip-warn">{r}</span>)}</div>}
            <div className="mt-3 flex gap-2">
              <button className="btn btn-primary" disabled={!!busy || (balance ?? 0) < a.micro / 1e6} onClick={() => approve(a)}>{busy === a.id ? "Signing…" : "Approve and sign"}</button>
              <button className="btn btn-danger" disabled={!!busy} onClick={() => decline(a)}>Decline</button>
            </div>
          </div>
        ))}
      </section>

      {log.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">What you did</h2>
          <ul className="space-y-1 text-sm">{log.map((l, i) => <li key={i}>{l.text}{l.sig ? <> · <a href={txUrl(l.sig)} target="_blank" rel="noreferrer">explorer</a></> : null}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
