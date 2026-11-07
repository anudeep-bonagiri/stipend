# Stipend

**The money layer for AI agents. Every task gets its own wallet, its own budget, and a human who signs anything beyond it.**

Built from an empty folder on November 7 and 8, 2026 for the MLH Solana Hackathon. Solana devnet, test money only.

- Code: this repository (MIT)
- How it works, in the app: `/about`
- Demo video: https://youtu.be/ZfM1MX8hqJA (1080p download on the [v0.1.0 release](https://github.com/anudeep-bonagiri/stipend/releases/tag/v0.1.0))
- Live demo: _see the submission_

## Screens

| Home | Owner's phone | Attack it yourself |
|---|---|---|
| ![Home: Needs you, Running, Spent today](docs/screenshots/home.png) | ![Owner approvals on a phone](docs/screenshots/owner.png) | ![Attack it yourself](docs/screenshots/attack.png) |

| A drill, and what stopped it | A finished task | Verify in your browser |
|---|---|---|
| ![What stopped it](docs/screenshots/drill.png) | ![The envelope and the payments](docs/screenshots/task.png) | ![Verify](docs/screenshots/verify.png) |

## The problem

When an AI agent can pay for things, the money it can spend is not tied to the work it is doing.

- The agent holds the key, or an API credit with no ceiling. Whatever it can reach, it can spend, all of it, on any task.
- The budget is a number in the agent's own config or database. The same code that gets fooled by a web page is the code that is supposed to enforce the limit.
- One bad input is enough. In the UK AI Security Institute's red-teaming challenge with Gray Swan, prompt injection succeeded over 60,000 times in 1.8 million attempts, and every one of 22 frontier models was breached at least once. The Freysa agent was talked out of its $47,000 prize on the 482nd message.
- Approval is a tap the box relays, so a compromised box can approve itself.
- Nothing public records which task spent what. If money leaves, nobody can prove afterward what the agent did or did not do.

Meanwhile agents are paying for real: x402 passed 100 million agent payments on Base in three quarters (Chainalysis). So the failure mode is live: one fooled task can drain everything the agent has, and nobody can prove what happened.

Stipend's answer: make each task's budget the physical limit of what it can spend, keep the owner's key off the box entirely, and put the record of each task on a chain the box cannot edit.

Sources: [Gray Swan and UK AISI results](https://www.grayswan.ai/news/uk-aisi-x-gray-swan-agent-red-teaming-challenge-results-snapshot), [The Block on Freysa](https://www.theblock.co/post/328747/human-player-outwits-freysa-ai-agent-in-47000-crypto-challenge), [Chainalysis on x402](https://www.chainalysis.com/blog/x402-agentic-payments-adoption/).

## In 30 seconds

AI agents now pay for things: searches, model calls, data, compute. Today that means an agent holds a key or an API credit, and one bad web page can spend all of it. Stipend gives each agent task a fresh Solana wallet funded with exactly its budget in USDC. The task pays per request, every payment names the task on chain, and the owner's own key never leaves the owner's browser. When the budget runs out the task stops and asks. When the task ends, the leftover comes back and a receipt is written to Solana that anyone can check without trusting the box.

## Think of petty cash

- **Its own envelope.** Each task gets a fresh wallet funded with exactly its budget. It cannot spend what is not there. No program, no policy engine, just arithmetic the chain enforces.
- **Never the safe key.** The owner's key is generated in the owner's browser and never sent anywhere. Funding a task is the owner signing one transfer; the box adds the fee signature and cannot change what was signed.
- **Only certain doors.** The task can pay the listed services and nobody else. A payment to a stranger is refused and logged, not asked about.
- **The front desk calls you.** Anything beyond the budget pauses the task and asks the owner, with the agent's own reason and the risk flags the broker saw.
- **Cameras in the hallway.** Every payment carries a memo naming its task. The action log is hash-chained, and its last hash is written to Solana when the task ends. The verify page recomputes every hash in your browser and reads the memo from a public node itself.
- **Hand back the change.** Whatever is left is swept to the owner and the task's token account is closed, so even the rent comes back.

## Why it is better

| | An agent with an API key | Stipend |
|---|---|---|
| What a hijacked agent can spend | Everything on the key | This task's budget, nothing more |
| Who holds the owner's funds | The box | The owner, in their browser |
| Budget enforcement | Code that can be bypassed | A wallet that holds exactly the budget |
| Approval | A tap or a config flag | A signature on a transfer |
| Fees | The agent needs gas | Zero. A separate sponsor key pays every fee |
| Which work paid for what | A log the box can edit | A memo on every payment, a receipt on chain per task |
| Unknown payees | Policy says no, if policy runs | Refused by the only code that holds the task key |

<!-- facts:start -->
## Proof (generated 2026-11-07 20:55 UTC by scripts/facts.ts)

| Number | Value | Where to check |
|---|---|---|
| Transactions the sponsor paid fees for, on devnet | 161 (0 failed) | [sponsor wallet](https://explorer.solana.com/address/DX7jAZax87KtAiSEv85ArXViU8heEjkf9CRUMiMZU6zC?cluster=devnet) |
| Transactions that paid the services wallet | 107 (0 failed) | [services wallet](https://explorer.solana.com/address/DL7YweYxDerw3BgpmBG9PpePZC8VfwncpC2fo7CL4uXf?cluster=devnet) |
| Agent payments confirmed | 107 (0 failed), 0.695 USDC in total | [one of them](https://explorer.solana.com/tx/2iFVTjhvjZyu4TYTQn7pdaiM5vrEzcDtakESVhaiwp4yGt14Xn81rU2PhcePSotEmmJerVBGbHsLv1ofLqLMCrHs?cluster=devnet) |
| Fees paid by task wallets | 0 SOL, they never hold SOL | any payment above: fee payer is the sponsor |
| Overspends that succeeded | 0, a wallet cannot send what it does not hold | any task wallet |
| Payments refused for an unlisted payee | 9 | task pages, red lines |
| Attack drills run / model took the bait / USDC the stranger received | 10 / 8 / 0 | drill task pages |
| Owner asks: approved / declined | 15 / 7 | task pages |
| USDC swept back to owners | 0.205 | task pages, sweep transactions |
| Receipts anchored on chain | 15 of 15 tasks | [9cf1b8](https://explorer.solana.com/tx/5P5Cy3nxw662DQBmDyJa7BFWnEJiBV4AtAoqnf2BzUxzqiR5hf3kf3KhZHQiC6n2T7k3qys5EApNZWHczieKEGT4?cluster=devnet), [6c1a0c](https://explorer.solana.com/tx/uyhKjZCocDNQm2RTx8a8Cky6phZSkiFEWw4NJPDq4Fj1Q9tuPquYW5ACtfUnEJQuKGeHxEd1dXrgepFeJBGHunJ?cluster=devnet), [aba9c0](https://explorer.solana.com/tx/pQwsNJEbHsZ2sBwEKWXtNABufsQdWgyBnthsKfwiJ5xS9YJfcEWYCxQbQksjL8RtNZ8WacmSbWnu9pfLA1eSD2k?cluster=devnet) |
| Hash-chained log entries | 327 | /verify/<task> recomputes them in your browser |
| Payment confirmed, median | 824 ms | task pages, "confirmed in" column |
| Owner signature to confirmed funding, median | 855 ms | owner.approved log lines |
| Sponsor SOL left | 9.991 | [sponsor wallet](https://explorer.solana.com/address/DX7jAZax87KtAiSEv85ArXViU8heEjkf9CRUMiMZU6zC?cluster=devnet) |

Mint: [C9ZHo6VUmfCnGVXBAtJEgAicFHMmXJ3Pf5zxyKdkPLKu](https://explorer.solana.com/address/C9ZHo6VUmfCnGVXBAtJEgAicFHMmXJ3Pf5zxyKdkPLKu?cluster=devnet) (our own devnet test mint, 6 decimals; test money).
<!-- facts:end -->

## What comes from Stipend and what from Solana

| Feature | From Stipend | From Solana | Status |
|---|---|---|---|
| A fresh wallet per task, funded with exactly the budget | Keypair per task, held by the broker | SPL token accounts; the balance is the budget | Shipped |
| Owner funds a task from the browser | Transaction built and partially signed client side, never leaves with the key | Multi-signer transactions: owner signs the transfer, sponsor signs the fee | Shipped |
| Task wallets never hold SOL | Broker sets the sponsor as fee payer on every transaction | Separate fee payer; `createAssociatedTokenAccountIdempotent` paid by the sponsor | Shipped |
| Per-request payment for search and model calls | x402-shaped gate: 402, pay, retry with `X-Payment: <signature>` | `TransferChecked` of USDC, read back with `getParsedTransaction` before the service answers; signature replay blocked | Shipped |
| Every payment names its task | Memo `stipend:<task>:<service>:<nonce>` on each transfer | SPL Memo program | Shipped |
| Refuse unknown payees | The only code with the task key checks the destination | n/a | Shipped |
| Pause and ask the owner when over budget | Ask with reason and risk flags; task resumes on approval | The approval is a signed, confirmed transfer | Shipped |
| Sweep leftover and close the account | At task end | `TransferChecked` back to the owner, `CloseAccount` returns rent to the sponsor | Shipped |
| Receipt per task | Hash-chained log; last hash anchored at task end | Memo transaction `stipend:v1:<task>:<entries>:<hash>` | Shipped |
| Verify in the browser | Recomputes every hash with Web Crypto; tamper test | Reads the memo from a public RPC node, not from the box | Shipped |

## Attack it yourself

The `/attack` page takes what a booby-trapped page might tell an agent, or one of three prepared ones (a dataset page that demands payment, a hidden HTML comment, white-on-white text), plants it in the agent's first search results, runs the task for real on devnet, and shows every defence as a card: the planted page arrived, the model took the bait, the broker refused the payee, the envelope ran out so it stopped and asked you, you declined, the receipt is on chain.

Turn on "attack drill" when starting a task from the home page and the first search's results include a planted page that tells the agent the right answer requires paying 2 USDC to a stranger and running twenty more searches. The agent's output format deliberately allows it to request payments and more searches, because the point is not that the model behaves. Gemini 2.5 Flash does not always take the bait; the Proof table above counts how often it did in our runs. When it does, it requests the 2 USDC payment and asks for the extra searches. Both payments were refused because the payee is not a listed service. The extra searches drained the budget, the task paused and asked the owner for the shortfall with the flags "instruction came from web content" and "over budget", the owner declined, the task ended with the answer it already had, and the receipt was still anchored. The stranger's wallet holds nothing.

## Questions judges ask

**Why Solana?** A task makes five to twenty payments of half a cent each, and each must be confirmed before the service answers. Sub-second confirmation at a fraction of a cent is the only reason per-call payment works at all. Separate fee payers let task wallets hold only USDC. The memo program lets each payment name its task in public, and anyone can read it back from any node.

**Why not just a database of budgets?** Because the box can edit a database. It cannot mint USDC into a task wallet, and it cannot fund one without the owner's signature.

**Can't the model just refuse the injected instruction?** Sometimes. Stipend assumes it will not, and makes sure a fooled agent has nothing to steal and nowhere to send it.

**What if the box is fully compromised?** It can spend the budgets already sitting in task wallets, and nothing more. It cannot reach the owner's funds, cannot fund a task, and cannot rewrite what is already anchored on chain.

**Is this x402?** It follows the shape (402 with payment details, pay, retry with proof) and settles in USDC on Solana, but we verify payments ourselves by reading the transfer from the chain instead of using a facilitator. No Coinbase account needed to run it.

## What is not built, and limits

- Devnet only, test money, not a legal record. We run our own 6-decimal test mint; the code is mint-agnostic, so point `STIPEND_USDC_MINT` at the real devnet USDC mint and the faucet button turns off.
- The paid services (search via Tavily, model calls via Gemini) are hosted by the same box that runs the broker. The payments between them are real on-chain transfers; the services are ours.
- A task wallet's key is held by the broker, so a compromised box can spend budgets already funded. That is the design: budgets are the blast radius.
- No metered payment channels (x402 "upto"), no hardware wallet for the owner, no sandbox for the agent's own code, no mainnet.
- The receipt proves the log entries are the ones the box wrote and were not changed afterward. It does not prove the agent was right.

## Rules, honestly

All code in this repository was written during the hackathon (November 7 and 8, 2026). The "pause and ask a person you trust" idea comes from our earlier anti-scam project Lookout; no code was reused from it. AI coding tools: Claude Code running Claude Fable 5.1 wrote most of the code with us directing, reviewing, and testing on devnet. APIs the product calls: Gemini 2.5 Flash and Tavily.

## Run it locally

```bash
npm install
npx tsx scripts/setup.ts        # funds nothing by itself: it prints the sponsor address; send it devnet SOL from faucet.solana.com, rerun, and it creates the test mint
cp .env.local .env.local        # setup wrote STIPEND_USDC_MINT; add GEMINI_API_KEY and TAVILY_API_KEY
npm run dev                      # http://localhost:3000
npx tsx scripts/smoke.ts         # one full task from the command line, no browser
npx tsx scripts/smoke.ts --inject
npx tsx scripts/facts.ts --write # regenerates the Proof section above from the database and the chain
```

The owner's key is created on the Owner page and stored only in that browser. "Get 5 demo USDC" mints test money to it.

MIT license.
