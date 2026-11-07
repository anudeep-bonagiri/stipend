import { loadOrCreateKeypair } from "./keys";

/** The paid services a task may pay. Anything else is refused, not asked about. */
export const SERVICES = {
  search: { priceMicro: 5_000n, label: "web search (Tavily)", path: "/api/pay/search" },
  llm: { priceMicro: 10_000n, label: "model call (Gemini 2.5 Flash)", path: "/api/pay/llm" },
} as const;
export type ServiceName = keyof typeof SERVICES;

/** The wallet the paid services are paid into. Box-owned, separate from the sponsor. */
export const servicesWallet = () => loadOrCreateKeypair("services");

export const BASE_URL = process.env.STIPEND_BASE_URL ?? "http://localhost:3000";
