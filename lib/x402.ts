import crypto from "node:crypto";
import { ata, readPayment, fromMicro } from "./chain";
import { USDC_MINT, CLUSTER } from "./env";
import { usedSigs } from "./db";
import { SERVICES, ServiceName, servicesWallet } from "./services";

/**
 * An x402-shaped gate for a paid HTTP service. Without a payment the response is
 * 402 with what to pay. With an `X-Payment: <signature>` header the service reads
 * the transaction from the chain and checks the destination, the amount, the memo
 * and that the signature has not been used before. No facilitator in the middle.
 */
export const bodyHash = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

export async function requirePayment(req: Request, service: ServiceName): Promise<{ response: Response } | { payment: Awaited<ReturnType<typeof readPayment>>; body: string }> {
  const { priceMicro } = SERVICES[service];
  const payTo = servicesWallet().publicKey;
  const payToAta = ata(payTo).toBase58();
  const sig = req.headers.get("x-payment");
  const deny = (error: string, status = 402) =>
    Response.json(
      {
        x402Version: 1,
        error,
        accepts: [
          {
            scheme: "exact",
            network: `solana-${CLUSTER}`,
            asset: USDC_MINT,
            payTo: payTo.toBase58(),
            maxAmountRequired: priceMicro.toString(),
            priceUsdc: fromMicro(priceMicro),
            resource: service,
            memoPrefix: "stipend:",
            description: `Pay ${fromMicro(priceMicro)} USDC per call, then retry with X-Payment: <signature>.`,
          },
        ],
      },
      { status },
    );
  if (!sig) return { response: deny("payment required") };
  const p = await readPayment(sig);
  if (!p.ok) return { response: deny(p.reason ?? "payment not readable") };
  if (p.destination !== payToAta) return { response: deny("payment went to a different wallet") };
  if ((p.micro ?? 0n) < priceMicro) return { response: deny(`underpaid: ${fromMicro(p.micro ?? 0n)} < ${fromMicro(priceMicro)} USDC`) };
  if (!p.memo?.startsWith("stipend:")) return { response: deny("payment memo does not name a task") };
  // The memo must carry the hash of this exact request, so a payment seen on chain cannot be presented by someone else for a different request.
  const body = await req.text();
  const want = /:h=([0-9a-f]{16})/.exec(p.memo)?.[1];
  if (!want || want !== bodyHash(body)) return { response: deny("payment is not bound to this request") };
  if (!usedSigs.tryUse(sig, service)) return { response: deny("this payment was already used") };
  return { payment: p, body };
}
