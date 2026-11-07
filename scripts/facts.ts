/**
 * Prints the proof section for the README from the database and the chain.
 * Nothing in it is typed by hand. Run: npx tsx scripts/facts.ts
 */
import { PublicKey } from "@solana/web3.js";
import { computeStats } from "../lib/stats";
import { connection, solBalance } from "../lib/chain";
import { sponsor } from "../lib/keys";
import { servicesWallet } from "../lib/services";
import { explorerAddress, explorerTx, USDC_MINT } from "../lib/env";
import { tasks, payments } from "../lib/db";

async function countSigs(pk: PublicKey) {
  let before: string | undefined;
  let total = 0, failed = 0;
  for (let page = 0; page < 20; page++) {
    const sigs = await connection.getSignaturesForAddress(pk, { limit: 1000, before });
    total += sigs.length; failed += sigs.filter((s) => s.err).length;
    if (sigs.length < 1000) break;
    before = sigs[sigs.length - 1].signature;
  }
  return { total, failed };
}

async function main() {
  const s = await computeStats();
  const sp = sponsor().publicKey, sv = servicesWallet().publicKey;
  const [spSigs, svSigs] = await Promise.all([countSigs(sp), countSigs(sv)]);
  const all = tasks.list();
  const last = all.filter((t) => t.receipt_sig).slice(0, 3);
  const lastPay = payments.all().filter((p) => p.sig).slice(-1)[0];
  const lines = [
    `## Proof (generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by scripts/facts.ts)`,
    ``,
    `| Number | Value | Where to check |`,
    `|---|---|---|`,
    `| Transactions the sponsor paid fees for, on devnet | ${spSigs.total} (${spSigs.failed} failed) | [sponsor wallet](${explorerAddress(sp.toBase58())}) |`,
    `| Transactions that paid the services wallet | ${svSigs.total} (${svSigs.failed} failed) | [services wallet](${explorerAddress(sv.toBase58())}) |`,
    `| Agent payments confirmed | ${s.payments_confirmed} (${s.payments_failed} failed), ${s.usdc_paid} USDC in total | ${lastPay?.sig ? `[one of them](${explorerTx(lastPay.sig)})` : ""} |`,
    `| Fees paid by task wallets | ${s.fees_paid_by_task_wallets_sol} SOL, they never hold SOL | any payment above: fee payer is the sponsor |`,
    `| Overspends that succeeded | ${s.overspend_succeeded}, a wallet cannot send what it does not hold | any task wallet |`,
    `| Payments refused for an unlisted payee | ${s.payments_refused_unlisted_payee} | task pages, red lines |`,
    `| Owner asks: approved / declined | ${s.asks_approved} / ${s.asks_declined} | task pages |`,
    `| USDC swept back to owners | ${s.usdc_swept_back} | task pages, sweep transactions |`,
    `| Receipts anchored on chain | ${s.receipts_anchored} of ${s.tasks} tasks | ${last.map((t) => `[${t.id.slice(5, 11)}](${explorerTx(t.receipt_sig!)})`).join(", ")} |`,
    `| Hash-chained log entries | ${s.log_entries} | /verify/<task> recomputes them in your browser |`,
    `| Payment confirmed, median | ${s.payment_ms_median} ms | task pages, "confirmed in" column |`,
    `| Owner signature to confirmed funding, median | ${s.approval_to_confirmed_ms_median} ms | owner.approved log lines |`,
    `| Sponsor SOL left | ${(await solBalance(sp)).toFixed(3)} | [sponsor wallet](${explorerAddress(sp.toBase58())}) |`,
    ``,
    `Mint: [${USDC_MINT}](${explorerAddress(USDC_MINT)}) (our own devnet test mint, 6 decimals; test money).`,
  ];
  console.log(lines.join("\n"));
}
main().catch((e) => { console.error(e); process.exit(1); });
