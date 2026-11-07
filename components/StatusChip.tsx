export function StatusChip({ status }: { status: string }) {
  const cls = status === "finished" ? "chip chip-ok" : ["declined", "failed", "waiting_owner"].includes(status) ? "chip chip-warn" : "chip";
  const label: Record<string, string> = {
    created: "waiting for funding", funded: "funded", running: "running", waiting_owner: "waiting for owner",
    finished: "finished", declined: "declined", failed: "failed",
  };
  return <span className={cls}>{label[status] ?? status}</span>;
}
