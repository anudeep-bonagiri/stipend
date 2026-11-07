"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Keypair } from "@solana/web3.js";
import { createOwner, forgetOwner, loadOwner } from "@/lib/client/owner";
import { signDecline, signFunding } from "@/lib/client/fund";
import { addrUrl, txUrl, short, usdc } from "@/lib/client/format";
import { Phone } from "@/components/Phone";

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
    const [b, a] = await Promise.all([fetch(`/api/balance?pubkey=${pub}`).then((r) => r.json()), fetch(`/api/asks?owner=${pub}`).then((r) => r.json())]);
    if (typeof b.usdc === "number") setBalance(b.usdc);
    setAsks(a.asks ?? []);
  }, [pub]);
  useEffect(() => { setOwner(loadOwner()); }, []);
  useEffect(() => { refresh(); const i = setInterval(refresh, 2500); return () => clearInterval(i); }, [refresh]);

  async function faucet() {
    if (!pub) return; setBusy("faucet");
    const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pubkey: pub }) });
    const d = await r.json();
    setLog((l) => [{ text: r.ok ? "Minted 5 demo USDC" : `Faucet failed: ${d.error}`, sig: d.sig }, ...l]); setBusy(null); refresh();
  }
  async function approve(a: Ask) {
    if (!owner) return; setBusy(a.id);
    try {
      const t0 = performance.now();
      const tx = await signFunding(owner, a.wallet_pubkey, BigInt(a.micro), a.id);
      const r = await fetch(`/api/asks/${a.id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx }) });
      const d = await r.json(); const ms = Math.round(performance.now() - t0);
      setLog((l) => [{ text: r.ok ? `Approved ${usdc(a.micro)} USDC for "${a.goal}" in ${ms} ms` : `Approve failed: ${d.error}`, sig: d.sig }, ...l]);
    } catch (e) { setLog((l) => [{ text: `Approve failed: ${(e as Error).message}` }, ...l]); }
    setBusy(null); refresh();
  }
  async function decline(a: Ask) {
    if (!owner) return; setBusy(a.id);
    const r = await fetch(`/api/asks/${a.id}/decline`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature: signDecline(owner, a.id) }) }); const d = await r.json();
    setLog((l) => [{ text: r.ok ? `Declined ${usdc(a.micro)} USDC for "${a.goal}". The task ends and its leftover sweeps back.` : `Decline failed: ${d.error}` }, ...l]);
    setBusy(null); refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="max-w-md space-y-5">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Owner</h1>
          <p className="muted mt-2">Approvals happen here, and each one is a signature. Your key is generated in this browser and never sent anywhere. Approving an ask signs a USDC transfer from your wallet into the task&apos;s own wallet; the box can only add the fee.</p>
        </div>
        <div className="card space-y-3 text-sm">
          {!owner ? (
            <button className="btn btn-primary" onClick={() => setOwner(createOwner())}>Create an owner key in this browser</button>
          ) : (
            <>
              <div><div className="muted text-xs">Owner wallet</div><a className="mono" href={addrUrl(pub!)} target="_blank" rel="noreferrer">{pub}</a></div>
              <div className="flex flex-wrap gap-2">
                <button className="btn" disabled={busy === "faucet"} onClick={faucet}>Get 5 demo USDC</button>
                <button className="btn" onClick={() => { forgetOwner(); setOwner(null); setBalance(null); }}>Forget this key</button>
              </div>
              <p className="muted text-xs">Demo USDC is our own devnet mint. Point STIPEND_USDC_MINT at the real devnet USDC mint and the faucet turns off.</p>
            </>
          )}
        </div>
        {log.length > 0 && (
          <div className="card text-sm"><div className="muted text-xs mb-1">What you did</div><ul className="space-y-1">{log.map((l, i) => <li key={i}>{l.text}{l.sig ? <> · <a href={txUrl(l.sig)} target="_blank" rel="noreferrer">explorer</a></> : null}</li>)}</ul></div>
        )}
        <p className="muted text-sm">Nothing waiting? Start a task on the <Link href="/">home page</Link> and it will ask for its budget here.</p>
      </div>

      <Phone>
        <div className="flex items-baseline justify-between">
          <div><div className="font-semibold text-lg">Stipend</div><div className="muted text-xs">Owner · {owner ? short(pub!) : "no key yet"}</div></div>
          <div className="text-right"><div className="muted text-xs">test USDC</div><div className="font-semibold text-xl">{balance ?? "–"}</div></div>
        </div>
        <div className="mt-5 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider muted">Needs you {asks.length ? <span className="pill">{asks.length}</span> : null}</div>
        <div className="space-y-3">
          {asks.length === 0 && <div className="ask muted text-sm">Nothing waiting on you.</div>}
          {asks.map((a) => (
            <div key={a.id} className={`ask ${a.risk.length ? "warn" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium leading-snug text-sm">{a.goal}</div>
                <span className="pill">{usdc(a.micro)} USDC</span>
              </div>
              <div className="muted mt-1 text-xs">Agent&apos;s reason: {a.reason}</div>
              <div className="muted mt-1 text-xs">into task wallet <a className="mono" href={addrUrl(a.wallet_pubkey)} target="_blank" rel="noreferrer">{short(a.wallet_pubkey)}</a></div>
              {a.risk.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{a.risk.map((r) => <span key={r} className="chip chip-warn">{r}</span>)}</div>}
              <div className="mt-3 flex gap-2">
                <button className="btn-phone" disabled={!owner || !!busy} onClick={() => decline(a)}>Decline</button>
                <button className="btn-phone go" disabled={!owner || !!busy || (balance ?? 0) < a.micro / 1e6} onClick={() => approve(a)}>{busy === a.id ? "Signing…" : "Approve and sign"}</button>
              </div>
            </div>
          ))}
        </div>
        {log[0] && <div className="mt-4 text-xs muted">Last: {log[0].text}{log[0].sig ? <> · <a href={txUrl(log[0].sig)} target="_blank" rel="noreferrer">explorer</a></> : null}</div>}
      </Phone>
    </div>
  );
}
