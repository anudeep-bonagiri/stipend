// Screenshots of every page, same zoom as the recordings. Output: docs/video/frames/ui-*.png
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = "http://localhost:3000";
const owner = fs.existsSync("docs/video/rec/owner.json") ? fs.readFileSync("docs/video/rec/owner.json", "utf8") : null;
const tasks = (await (await fetch(`${BASE}/api/tasks`)).json()).tasks;
const finished = tasks.find((t) => t.status === "finished" && !t.injection);
const drill = tasks.find((t) => t.injection && t.status === "declined") ?? tasks.find((t) => t.injection);
const pages = { home: "/", owner: "/owner", attack: "/attack", task: `/tasks/${finished.id}`, drill: `/tasks/${drill.id}`, verify: `/verify/${finished.id}`, about: "/about" };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "dark" });
if (owner) await ctx.addInitScript((s) => { try { localStorage.setItem("stipend.owner.secret", s); } catch {} }, owner);
await ctx.addInitScript(() => { const z = () => { document.documentElement.style.zoom = "1.35"; }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", z); else z(); });
const page = await ctx.newPage();
for (const [name, path] of Object.entries(pages)) {
  await page.goto(`${BASE}${path}`); await page.waitForTimeout(2500);
  await page.screenshot({ path: `docs/video/frames/ui-${name}.png` });
  console.log("shot", name);
}
await browser.close();
