"use client";
import { useEffect, useState } from "react";

/** A phone frame. The owner's approvals live here because that is where approvals should happen. */
export function Phone({ children, tab = "Needs you" }: { children: React.ReactNode; tab?: string }) {
  const [time, setTime] = useState("");
  useEffect(() => { const f = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })); const t = setTimeout(f, 0); const i = setInterval(f, 15000); return () => { clearTimeout(t); clearInterval(i); }; }, []);
  return (
    <div className="phone">
      <div className="screen">
        <div className="notch" />
        <div className="status"><span>{time}</span><span className="muted">devnet</span></div>
        <div className="app">{children}</div>
        <div className="tab"><span className="on">{tab}</span></div>
      </div>
    </div>
  );
}
