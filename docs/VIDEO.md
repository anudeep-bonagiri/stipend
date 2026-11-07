# Demo video, 2 minutes, recorded on the hackathon weekend

MLH digital rule: say the hackathon name in the first sentence. Keep the recording under 2:00. Screen only, one voice, no slides.

## Shot list

| Time | On screen | Say |
|---|---|---|
| 0:00 | Dashboard, stats row | "Hi, I'm Anudeep and this is my demo for the Solana Hackathon. This is Stipend: every AI agent task gets its own wallet, its own budget, and a human who signs anything beyond it." |
| 0:10 | Owner page: wallet, balance, "key never leaves this browser" | "The owner's key lives only in this browser. The box never sees it." |
| 0:18 | Dashboard: type a goal, budget 0.06, Create | "I give an agent a research goal and six cents." |
| 0:25 | Owner page: the ask, click Approve and sign | "The task asks for its budget. Approving signs a real USDC transfer into the task's own wallet. The box only adds the fee." |
| 0:35 | Task page, live: payments appearing, "confirmed in" column, explorer link on one | "The agent pays for its own searches and model calls, half a cent each, confirmed in under a second. Every payment names the task in a memo on chain. The task wallet never held any SOL; a sponsor key paid every fee." |
| 0:55 | Task page: answer, sweep line, receipt line | "It answers, the leftover sweeps back to the owner, and a receipt of the whole log is written to Solana." |
| 1:03 | Verify page: green, then Tamper test, red | "Anyone can check that receipt in their browser against a public node. Change one number and the chain breaks." |
| 1:15 | Dashboard: attack drill on, Create; Owner: Approve | "Now the attack drill. The first search returns a planted page telling the agent to pay a stranger two dollars and keep searching." |
| 1:30 | Task page: red lines "Refused: not a listed service", then "Asked the owner ... instruction came from web content, over budget" | "Gemini followed it. Both payments were refused: the stranger isn't a listed service. The extra searches ran the budget dry, so the task stopped and asked, with the flags." |
| 1:45 | Owner page: Decline | "I decline. The task ends with the answer it already had. The stranger's wallet holds nothing, and the receipt is still on chain." |
| 1:52 | README proof table | "Every number in the README is computed from the database and the chain, with explorer links. Devnet, test money. Thanks." |

## Before recording

- Run `npx tsx scripts/facts.ts --write` so the README numbers are current.
- Have a finished task and a finished attack drill already in the list, in case devnet is slow during the take.
- Quit other apps; the task page polls every two seconds and looks best full width.
