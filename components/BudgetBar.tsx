import { usdc, UNIT } from "@/lib/client/format";

export function BudgetBar({ budget, spent, swept, holding }: { budget: number; spent: number; swept: number | null; holding: number | null }) {
  const total = Math.max(budget, spent + (swept ?? 0) + (holding ?? 0), 1);
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / total) * 100))}%`;
  const left = swept == null ? Math.max(0, (holding ?? 0)) : 0;
  return (
    <div>
      <div className="budget">
        <div className="spent" style={{ width: pct(spent) }} />
        {swept != null && swept > 0 && <div className="swept" style={{ width: pct(swept) }} />}
        {left > 0 && <div className="left" style={{ width: pct(left) }} />}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--accent)" }} />spent {usdc(spent)} {UNIT}</span>
        {swept != null ? <span><i style={{ background: "rgba(52,211,153,0.35)" }} />swept back {usdc(swept)} {UNIT}</span> : <span><i style={{ background: "rgba(52,211,153,0.18)" }} />left in the envelope {usdc(left)} {UNIT}</span>}
        <span className="ml-auto">budget {usdc(budget)} {UNIT}</span>
      </div>
    </div>
  );
}
