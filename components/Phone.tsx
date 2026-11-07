"use client";
import { useEffect, useState } from "react";

/** A phone frame. The owner's approvals live here because that is where approvals should happen. */
export function Phone({ children, tab = "Needs you" }: { children: React.ReactNode; tab?: string }) {
  const [time, setTime] = useState("");
  useEffect(() => { const f = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })); f(); const i = setInterval(f, 15000); return () => clearInterval(i); }, []);
  return (
    <div className="phone">
      <div className="screen">
        <div className="notch" />
        <div className="status"><span>{time}</span><span className="muted">devnet</span></div>
        <div className="app">{children}</div>
        <div className="tab">{["Needs you", "Wallet", "Activity"].map((t) => <span key={t} className={t === tab ? "on" : ""}>{t}</span>)}</div>
      </div>
    </div>
  );
}
