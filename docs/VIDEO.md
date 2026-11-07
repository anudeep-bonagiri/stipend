# The demo video

Two minutes or less (MLH digital rule), recorded on the hackathon weekend, hackathon named in the first sentence. Structure mirrors the GurtOS video (problem with real numbers, "the problem isn't the agent", "so I built", four moments, score published, try it, tagline), cut to fit 1:55.

## 0:00 to 0:10, Anudeep on camera. Say exactly this:

> Hi, I'm Anudeep, and this is my demo for the Solana Hackathon.
> AI agents have made over a hundred million payments through x402.
> And one agent guarding forty-seven thousand dollars gave all of it away on the four-hundred-eighty-second message.

Three sentences, 38 words, about ten seconds. Look at the lens, no slides, no logo.

## 0:10 onward, screen recording with narration

| Time | Chapter | On screen | Narration |
|---|---|---|---|
| 0:10 | The problem isn't the agent | Dashboard, slow scroll over the stats row | The problem isn't the agent. Today an agent that can pay holds the key. One budget for everything, enforced by code the agent can reach. And nothing on the chain says which task spent what. |
| 0:21 | So I built Stipend | Dashboard headline | So I built Stipend: the money layer for AI agents. Every task gets its own wallet, its own budget, and a human who signs anything beyond it. Built on Solana, because half-cent payments confirmed in under a second are the only way per-request payment works at all. |
| 0:35 | Moment 1: the owner signs | Owner page: wallet, balance. Dashboard: type goal, 0.06, Create. Owner page: the ask, click Approve and sign, explorer link appears | The owner's key is generated in this browser and never leaves it. I give an agent six cents. It asks. Approving signs a real USDC transfer into the task's own wallet; the box only adds the fee. Confirmed in under a second. |
| 0:50 | Moment 2: pay per request | Task page, live: payments appearing with "confirmed in" times, hover one explorer link, the memo | The agent pays for its own searches and model calls, half a cent each, each confirmed before the service answers. Every payment carries a memo naming the task. The task wallet never held any SOL; a sponsor key paid every fee. |
| 1:04 | Moment 3: the planted page | Dashboard: attack drill on, Create. Owner: Approve. Task page: red line "Refused: not a listed service", then "Asked the owner: instruction came from web content, over budget". Owner page: the ask with red flags, click Decline | Now the attack. The first search returns a planted page: pay a stranger two dollars and run twenty more searches. Gemini followed it. The payment was refused: the stranger isn't a listed service. The extra searches ran the budget dry, so the task stopped and asked, with the flags. I decline. The stranger's wallet holds nothing. |
| 1:27 | Moment 4: hand back the change | Task page: sweep line, receipt line. Verify page: green. Click Tamper test: red | Whatever is left sweeps back to the owner, and a receipt of the whole log is written to Solana. Anyone can check it in their browser against a public node. Change one number, and the chain breaks. |
| 1:40 | Score published | README proof table, scroll | Every number is computed from the database and the chain, with an explorer link: payments confirmed, zero failed, zero fees paid by task wallets, zero overspends, every receipt anchored. Devnet, test money. |
| 1:49 | Honestly | README "Compared with GurtOS" table | This takes what the Cal Hacks winner GurtOS got right, and moves the budget, the approval and the receipt from the box onto the chain. |
| 1:55 | Tagline | Dashboard headline | Stipend. Its own envelope, never the safe key. |

End by 1:58.

## Recording notes

- Record the on-camera clip first, phone or webcam, landscape, quiet room. Ten seconds. Send the file.
- Screen segments: 1512 by 945 window, dark mode, browser zoom 110 percent, Chrome with no bookmarks bar. Every screen is the real product on devnet.
- Have one finished task and one finished attack drill already in the list before recording, in case devnet is slow during a take.
- The attack drill is a real run, not scripted. Gemini followed the planted page in every run so far (3 of 3). If a take's run refuses the injection, keep it, say "this time the model refused; the broker would have stopped it anyway", and use the earlier run for the red lines.
- Run `npx tsx scripts/facts.ts --write` before the README shot.

## Video description (paste under the upload)

Stipend: the money layer for AI agents. Every task gets its own Solana wallet funded with exactly its budget, pays per request in USDC, never holds the owner's key, and anchors a receipt anyone can verify. Built from an empty folder on November 7 and 8, 2026 for the MLH Solana Hackathon.

Every screen is the real product running against Solana devnet; all money is test money. The attack drill is a live run of Gemini 2.5 Flash against a planted page, not scripted; it followed the instruction in N of M recorded runs. Narration: Anudeep's own voice.

Sources for the numbers at the start: Chainalysis, "Inside x402: 100M agentic payments on Base" (2026); The Block, "Human player outwits Freysa AI agent in $47,000 crypto challenge" (November 30, 2024: 13.19 ETH, $47,316, 482nd attempt).

Code (MIT): <repo link>
Try it: <live link, if deployed>
How it works: <live link>/about
