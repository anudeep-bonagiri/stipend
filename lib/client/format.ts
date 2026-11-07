export const CLUSTER = "devnet";
export const txUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
export const addrUrl = (a: string) => `https://explorer.solana.com/address/${a}?cluster=${CLUSTER}`;
export const short = (s: string, n = 4) => (s.length > 2 * n + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);
export const usdc = (micro: number | bigint) => (Number(micro) / 1e6).toFixed(Number(micro) % 1000 === 0 ? 3 : 6).replace(/0+$/, "").replace(/\.$/, "");
export const when = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
