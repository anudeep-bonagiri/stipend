import Link from "next/link";

export default function About() {
  const rows: [string, string, string][] = [
    ["Who holds the owner's key", "The box, in a root-only file", "Nobody but the owner. It is generated in the owner's browser and never sent"],
    ["Budget", "Enforced by the operating system", "Enforced by the chain: the task wallet holds exactly the budget, so overspending is impossible"],
    ["Approval", "A tap the box relays", "A signature. The owner signs the transfer; the box can only add the fee"],
    ["Fees", "Paid by Coinbase's facilitator", "Paid by our own sponsor key. Task wallets never hold SOL. No third party"],
    ["Audit anchor", "A daily fingerprint; recent tasks read not anchored yet", "A receipt the moment each task ends"],
    ["Paid services", "x402 through a hosted facilitator", "x402-shaped: 402, pay, retry with the signature, the service reads the transfer from the chain itself"],
    ["Unknown payees", "Asked about", "Refused outright. The only doors are the listed services"],
  ];
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">How it works</h1>
        <p className="muted mt-2 max-w-3xl">Think of petty cash. A task gets an envelope with exactly its budget, spends from it in public, and hands back what is left with a receipt. The owner keeps the safe key.</p>
      </section>
      <section className="card space-y-2 text-sm">
        <p><strong>Its own envelope.</strong> Each task gets a fresh wallet funded with exactly its budget. It cannot spend what is not there.</p>
        <p><strong>Never the safe key.</strong> The owner&apos;s key lives in the owner&apos;s browser. Funding a task is the owner signing one transfer; the box adds the fee and cannot change what was signed.</p>
        <p><strong>Only certain doors.</strong> The task can pay the listed services and nobody else. A payment to a stranger is refused and logged, not asked about.</p>
        <p><strong>The front desk calls you.</strong> Anything beyond the budget pauses and asks the owner, with the agent&apos;s own reason and the risk flags the broker saw.</p>
        <p><strong>Cameras in the hallway.</strong> Every payment carries a memo naming its task. The action log is hash-chained, and the last hash is written to Solana when the task ends. <Link href="/">Any task page</Link> links to a check you can run in your own browser.</p>
      </section>
      <section className="card">
        <h2 className="mb-2 font-semibold">Compared with GurtOS, the Cal Hacks 13.0 Best Use of Solana winner</h2>
        <table>
          <thead><tr><th></th><th>GurtOS</th><th>Stipend</th></tr></thead>
          <tbody>{rows.map(([k, a, b]) => <tr key={k}><td className="font-medium">{k}</td><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
        <p className="muted mt-2 text-xs">GurtOS is an operating system and does far more than money. Stipend is only the money layer, built in one weekend, and the comparison is about that layer.</p>
      </section>
      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Questions judges ask</h2>
        <p><strong>Why Solana?</strong> A task makes five to twenty payments of half a cent each, and each must be confirmed before the service answers. Sub-second confirmation at a fraction of a cent is the only reason per-call payment works at all. Separate fee payers let task wallets hold only USDC, and the memo program lets each payment name its task in public.</p>
        <p><strong>Can&apos;t the model just refuse the injected instruction?</strong> Sometimes. Stipend assumes it will not, and makes sure a fooled agent has nothing to steal and nowhere to send it.</p>
        <p><strong>What if the box is fully compromised?</strong> It can spend the budgets already in task wallets, and nothing more. It cannot reach the owner&apos;s funds and cannot fund a task without the owner&apos;s signature.</p>
        <p><strong>What is not built?</strong> Real devnet USDC (we run our own test mint; the code is mint-agnostic), metered payment channels, a hardware wallet for the owner, and a sandbox for the agent&apos;s own code. Devnet only, test money, not a legal record.</p>
      </section>
    </div>
  );
}
