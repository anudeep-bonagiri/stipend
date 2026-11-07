import Link from "next/link";

export default function About() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold leading-tight">How it works</h1>
        <p className="muted mt-2 max-w-3xl">Think of petty cash. A task gets an envelope with exactly its budget, spends from it in public, and hands back what is left with a receipt. The owner keeps the safe key.</p>
      </section>
      <section className="card space-y-2 text-sm">
        <p><strong>Its own envelope.</strong> Each task gets a fresh wallet funded with exactly its budget. It cannot spend what is not there.</p>
        <p><strong>Never the safe key.</strong> The owner&apos;s key lives in the owner&apos;s browser. Funding a task is the owner signing one transfer; the box adds the fee and cannot change what was signed.</p>
        <p><strong>Only certain doors.</strong> The task can pay the listed services and nobody else. A payment to a stranger is refused and logged, not asked about.</p>
        <p><strong>The front desk calls you.</strong> Anything beyond the budget pauses and asks the owner, with the agent&apos;s own reason and the risk flags the broker saw.</p>
        <p><strong>Cameras in the hallway.</strong> Every payment carries a memo naming its task. The action log is hash-chained, and the last hash is written to Solana when the task ends. <Link href="/">Any task page</Link> links to a check you can run in your own browser.</p>
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
