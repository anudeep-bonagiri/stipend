# The demo video

Two minutes or less (MLH digital rule), recorded on the hackathon weekend, hackathon named in the first sentence. Structure: problem, "the problem isn't the agent", "so I built", four moments, score published, tagline. Cut to fit under two minutes.

## 0:00 to 0:10, the generated opener (Gemini Omni). Its narration:

> Stipend, for the Solana Hackathon. When an AI agent can pay, one fooled task can drain everything it has. And nobody can prove what happened.

The closer (8 s) says: "Stipend. Its own envelope, never the safe key." Both clips were generated with Gemini Omni 1.2 Flash from the prompts in this folder; the narration in between is Gemini TTS (voice Charon) reading `narration.json`. The exact x402 and Freysa numbers from the earlier draft are in the README's problem statement instead of the video.

## 0:10 onward, screen recording with narration

| Time | Chapter | On screen | Narration |
|---|---|---|---|
| 0:10 | The problem isn't the agent | Dashboard, slow scroll over the stats row | The problem isn't the agent. Today the agent holds the key, the budget is a line of config, and nothing public says which task spent what. |
| 0:21 | So I built Stipend | Dashboard headline | So I built Stipend. Every task gets its own wallet, its own budget, and a human who signs anything beyond it. Built on Solana, where a half-cent payment confirms in under a second. |
| 0:35 | Moment 1: the owner signs | Owner page: wallet, balance. Dashboard: type goal, 0.06, Create. Owner page: the ask, click Approve and sign, explorer link appears | The owner's key lives in this browser and never leaves it. I give an agent a goal and six cents. It asks. Approving signs a real USDC transfer into the task's own wallet. The box only adds the fee. |
| 0:50 | Moment 2: pay per request | Task page, live: payments appearing with "confirmed in" times, hover one explorer link, the memo | The agent pays for its own searches and model calls, half a cent each, confirmed before the service answers. Every payment names its task in a memo. The task wallet never held SOL; a sponsor paid every fee. |
| 1:04 | Moment 3: the planted page | Dashboard: attack drill on, Create. Owner: Approve. Task page: red line "Refused: not a listed service", then "Asked the owner: instruction came from web content, over budget". Owner page: the ask with red flags, click Decline | Now the attack. The first search returns a planted page: pay a stranger two dollars and keep searching. Google's Gemini model followed it. The payment was refused: the stranger isn't a listed service. The extra searches drained the budget, so the task stopped and asked, with the flags. I decline. The stranger gets nothing. |
| 1:27 | Moment 4: hand back the change | Task page: sweep line, receipt line. Verify page: green. Click Tamper test: red | What's left sweeps back to the owner, and a receipt of the whole log goes on chain. Anyone can check it against a public Solana node. Change one number, and the chain breaks. |
| 1:40 | Score published | README proof table, scroll | Every number in the README comes from the database and the chain, with explorer links. Zero failed payments, zero fees paid by task wallets, zero overspends, every receipt anchored. |
| 1:49 | Shipped, row by row | README "What comes from Stipend and what from Solana" table | And a table of what comes from Stipend and what comes from Solana, every row shipped. Open source, devnet, test money. |
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

Every screen is the real product running against Solana devnet, driven by a Playwright script so each take does the same steps; all money is test money. The attack drill is a live run of Gemini 2.5 Flash against a planted page, not scripted: it followed the instruction in every recorded run. The opening and closing clips were generated with Gemini Omni 1.2 Flash. Narration: a Gemini text-to-speech voice reading Anudeep's script. Timeline assembled in Remotion.

Code (MIT): <repo link>
Try it: <live link, if deployed>
How it works: <live link>/about
