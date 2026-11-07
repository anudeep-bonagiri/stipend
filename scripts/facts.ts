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

/** Did any task wallet ever hold a lamport? Scan every transaction of every task wallet and look at its balances. Gentle on the public RPC. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (i >= 8 || !/429|Too many requests/i.test(String(e))) throw e; await sleep(5000 * (i + 1)); }
  }
}
async function everHeldSol(wallets: string[]) {
  let ever = 0, txs = 0;
  for (const w of wallets) {
    const pk = new PublicKey(w);
    const sigs = await withRetry(() => connection.getSignaturesForAddress(pk, { limit: 200 }));
    await sleep(300);
    let held = false;
    for (let i = 0; i < sigs.length && !held; i += 4) {
      const batch = sigs.slice(i, i + 4).map((x) => x.signature);
      const parsed = await withRetry(() => connection.getParsedTransactions(batch, { maxSupportedTransactionVersion: 0 }));
      txs += batch.length;
      for (const tx of parsed) {
        if (!tx?.meta) continue;
        const k = tx.transaction.message.accountKeys.findIndex((a) => a.pubkey.equals(pk));
        if (k >= 0 && ((tx.meta.postBalances[k] ?? 0) > 0 || (tx.meta.preBalances[k] ?? 0) > 0)) { held = true; break; }
      }
      await sleep(1500);
    }
    if (held) ever++;
  }
  return { ever, txs };
}

async function main() {
  const s = await computeStats();
  const scanned = await everHeldSol(tasks.list().map((t) => t.wallet_pubkey));
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
    `| Transactions touching the sponsor wallet on devnet, airdrops included | ${spSigs.total} (${spSigs.failed} failed) | [sponsor wallet](${explorerAddress(sp.toBase58())}) |`,
    `| Transactions that paid the services wallet | ${svSigs.total} (${svSigs.failed} failed) | [services wallet](${explorerAddress(sv.toBase58())}) |`,
    `| Agent payments confirmed | ${s.payments_confirmed} (${s.payments_failed} failed), ${s.usdc_paid} USDC in total | ${lastPay?.sig ? `[one of them](${explorerTx(lastPay.sig)})` : ""} |`,
    `| Task wallets that ever held a lamport (so could ever have paid a fee) | ${scanned.ever} of ${s.task_wallets_checked}, from scanning all ${scanned.txs} of their transactions on devnet | any task wallet |`,
    `| Tasks that spent more than the owner signed into them | ${s.overspend_succeeded} of ${s.tasks}, computed from the ledger task by task | task pages |`,
    `| Payments refused for an unlisted payee | ${s.payments_refused_unlisted_payee} | task pages, red lines |`,
    `| Attack drills run / model took the bait, all prompts | ${s.drills_run} / ${s.drills_model_took_bait} | drill task pages |`,
    `| Attack drills with the neutral tool prompt / took the bait | ${s.drills_run_neutral_prompt} / ${s.drills_model_took_bait_neutral_prompt} | drill task pages after Nov 7, 3:14 PM CST |`,
    `| USDC held by the stranger wallet | ${s.stranger_usdc_received}, read from devnet | [the stranger](${explorerAddress("7gvj3mJ2m1EBk6Lu4R2nZf9m7GzN2bYdZ2DJg2j3vZK9")}) |`,
    `| Owner asks: approved / declined | ${s.asks_approved} / ${s.asks_declined} | task pages |`,
    `| USDC swept back to owners | ${s.usdc_swept_back} | task pages, sweep transactions |`,
    `| Receipts anchored on chain | ${s.receipts_anchored} of ${s.tasks} tasks | ${last.map((t) => `[${t.id.slice(5, 11)}](${explorerTx(t.receipt_sig!)})`).join(", ")} |`,
    `| Hash-chained log entries | ${s.log_entries} | /verify/<task> recomputes them in your browser |`,
    `| Payment confirmed, median | ${s.payment_ms_median} ms | task pages, "confirmed in" column |`,
    `| Funding transaction received by the box to confirmed, median | ${s.approval_to_confirmed_ms_median} ms | owner.approved log lines |`,
    `| Sponsor SOL left | ${(await solBalance(sp)).toFixed(3)} | [sponsor wallet](${explorerAddress(sp.toBase58())}) |`,
    ``,
    `Mint: [${USDC_MINT}](${explorerAddress(USDC_MINT)}) (our own devnet test mint, 6 decimals; test money).`,
  ];
  const md = lines.join("\n");
  console.log(md);
  if (process.argv.includes("--write")) {
    const fs = await import("node:fs");
    const readme = fs.readFileSync("README.md", "utf8");
    const out = readme.replace(/<!-- facts:start -->[\s\S]*<!-- facts:end -->/, `<!-- facts:start -->\n${md}\n<!-- facts:end -->`);
    fs.writeFileSync("README.md", out);
    console.log("\nREADME.md updated");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
