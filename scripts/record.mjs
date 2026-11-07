// Scripted screen recordings of the real app for the demo video.
// Usage: node scripts/record.mjs [segment ...]   (default: all)
// Output: docs/video/rec/<segment>.webm + <segment>.marks.json (seconds from clip start)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = "docs/video/rec";
const W = 1920, H = 1080;
const ZOOM = 1.35; // CSS zoom so the app fills a 1920x1080 frame

const CURSOR = `
(() => {
  const Z = 1.35;
  const add = () => {
    document.documentElement.style.zoom = String(Z);
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:16px;height:16px;border-radius:50%;background:rgba(52,211,153,.95);box-shadow:0 0 0 4px rgba(52,211,153,.22),0 2px 10px rgba(0,0,0,.6);pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:transform .08s ease';
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', e => { c.style.left = (e.clientX / Z) + 'px'; c.style.top = (e.clientY / Z) + 'px'; }, true);
    document.addEventListener('mousedown', () => { c.style.transform = 'translate(-50%,-50%) scale(.6)'; }, true);
    document.addEventListener('mouseup', () => { c.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function segment(name, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", recordVideo: { dir: OUT, size: { width: W, height: H } } });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = [];
  const mark = (label) => { marks.push({ label, t: +((Date.now() - t0) / 1000).toFixed(2) }); console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s ${label}`); };
  // smooth mouse helpers
  const glide = async (x, y, steps = 25) => { await page.mouse.move(x, y, { steps }); };
  const clickEl = async (sel, label) => {
    const el = page.locator(sel).first();
    await el.waitFor({ state: "visible", timeout: 60000 });
    const b = await el.boundingBox();
    await glide(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(350);
    await page.mouse.down(); await sleep(90); await page.mouse.up();
    if (label) mark(label);
  };
  const typeInto = async (sel, text) => { await clickEl(sel); await page.fill(sel, ""); await page.keyboard.type(text, { delay: 28 }); };
  const scrollTo = async (y, ms = 900) => { await page.evaluate(([y, ms]) => new Promise((res) => { window.scrollTo({ top: y, behavior: "smooth" }); setTimeout(res, ms); }), [y, ms]); };
  console.log(`== ${name}`);
  let video;
  try {
    await fn({ page, ctx, mark, glide, clickEl, typeInto, scrollTo, sleep });
  } finally {
    video = page.video();
    await ctx.close();
    await browser.close();
    const p = await video.path();
    const dst = path.join(OUT, `${name}.webm`);
    fs.renameSync(p, dst);
    fs.writeFileSync(path.join(OUT, `${name}.marks.json`), JSON.stringify(marks, null, 1));
    console.log(`  saved ${dst} (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB)`);
  }
}

// A persistent owner key across segments: we seed localStorage from a file so every clip shows the same wallet.
const OWNER_FILE = path.join(OUT, "owner.json");
async function seedOwner(ctx) {
  if (!fs.existsSync(OWNER_FILE)) return false;
  const secret = fs.readFileSync(OWNER_FILE, "utf8");
  await ctx.addInitScript((s) => { try { localStorage.setItem("stipend.owner.secret", s); } catch {} }, secret);
  return true;
}
async function saveOwner(page) {
  const s = await page.evaluate(() => localStorage.getItem("stipend.owner.secret"));
  if (s) fs.writeFileSync(OWNER_FILE, s);
}

const GOAL = "Which three US cities had the worst traffic congestion in 2025, with hours lost per driver?";

const segments = {
  // Dashboard: the problem and the thesis. Slow look at the stats.
  async dashboard({ page, ctx, mark, glide, scrollTo, sleep }) {
    await seedOwner(ctx);
    await page.goto(`${BASE}/`); await page.waitForSelector(".stat"); mark("loaded");
    await glide(700, 300); await sleep(2500);
    await glide(420, 520, 40); await sleep(1800);
    await glide(1180, 520, 60); mark("stats"); await sleep(2200);
    await glide(1500, 620, 40); await sleep(1800);
    await scrollTo(260, 1200); mark("scrolled"); await sleep(2500);
    await glide(900, 400, 30); await sleep(2000);
    await scrollTo(0, 1200); await sleep(3000);
  },

  // Owner page: create the key (if needed), get demo USDC. Then start a task and approve it.
  async owner_signs({ page, ctx, mark, glide, clickEl, typeInto, scrollTo, sleep }) {
    const had = await seedOwner(ctx);
    await page.goto(`${BASE}/owner`); await page.waitForSelector("text=Owner"); mark("owner page");
    if (!had) { await sleep(800); await clickEl("button:has-text('Create an owner key')", "created key"); await sleep(1200); await saveOwner(page); }
    await page.waitForSelector("text=USDC balance");
    const bal = await page.locator(".text-xl.font-semibold").first().innerText().catch(() => "0");
    if (parseFloat(bal) < 1) { await clickEl("button:has-text('Get 5 demo USDC')", "faucet"); await page.waitForSelector("text=Minted 5 demo USDC", { timeout: 60000 }); await sleep(1500); }
    await glide(600, 290, 30); await sleep(1800); mark("wallet shown");
    await page.goto(`${BASE}/`); await page.waitForSelector("textarea"); mark("dashboard");
    await typeInto("textarea", GOAL); mark("typed goal"); await sleep(400);
    await clickEl("button:has-text('Create task')", "create"); await page.waitForURL(/\/tasks\//, { timeout: 30000 }); await page.waitForSelector("text=Waiting for the owner"); mark("task page waiting"); await sleep(2200);
    await page.goto(`${BASE}/owner`); await page.waitForSelector("button:has-text('Approve and sign')"); mark("owner ask shown"); await sleep(1200);
    await clickEl("button:has-text('Approve and sign')", "approve clicked");
    await page.waitForSelector("text=Approved 0.06 USDC", { timeout: 60000 }); mark("approved"); await sleep(2500);
    const href = await page.locator("a:has-text('explorer')").first().getAttribute("href");
    fs.writeFileSync(path.join(OUT, "last-task.json"), JSON.stringify({ explorer: href }));
    const taskLink = await page.locator("section:has-text('What you did') a").first();
    await sleep(500);
  },

  // Task page live: payments appearing. Needs the task from owner_signs to be running; we find the newest task.
  async pay_per_request({ page, ctx, mark, glide, scrollTo, sleep }) {
    await seedOwner(ctx);
    const tasks = await (await fetch(`${BASE}/api/tasks`)).json();
    const t = tasks.tasks[0];
    await page.goto(`${BASE}/tasks/${t.id}`); await page.waitForSelector("text=Payments from the task wallet"); mark("task page");
    for (let i = 0; i < 28; i++) { // ~28 s of live polling
      await sleep(1000);
      if (i === 6) { await glide(700, 560, 40); mark("hover payments"); }
      if (i === 14) { await scrollTo(420, 1000); mark("scroll log"); }
      if (i === 20) { await glide(600, 700, 30); }
    }
    mark("end");
  },

  // Attack drill, end to end: create with the drill on, approve, watch the red lines, decline.
  async attack_drill({ page, ctx, mark, glide, clickEl, typeInto, scrollTo, sleep }) {
    await seedOwner(ctx);
    await page.goto(`${BASE}/`); await page.waitForSelector("textarea"); mark("dashboard");
    await typeInto("textarea", GOAL); await sleep(300);
    await clickEl("input[type=checkbox]", "drill on"); await sleep(900);
    await clickEl("button:has-text('Create task')", "create"); await page.waitForURL(/\/tasks\//); await sleep(1500);
    const url = page.url();
    await page.goto(`${BASE}/owner`); await page.waitForSelector("button:has-text('Approve and sign')"); await sleep(900);
    await clickEl("button:has-text('Approve and sign')", "approve"); await page.waitForSelector("text=Approved 0.06 USDC", { timeout: 60000 }); mark("approved"); await sleep(1200);
    await page.goto(url); await page.waitForSelector("text=Action log"); mark("task page");
    await page.waitForSelector("text=planted page", { timeout: 120000 }); mark("planted line");
    await scrollTo(380, 1000);
    await page.waitForSelector("text=Refused", { timeout: 180000 }); mark("refused line");
    await page.evaluate(() => document.querySelector(".log li.warn")?.scrollIntoView({ behavior: "smooth", block: "center" })); await sleep(2500);
    await page.waitForSelector("text=Asked the owner for", { timeout: 240000 }); 
    await page.waitForSelector("text=instruction came from web content", { timeout: 240000 }); mark("asked line");
    await page.evaluate(() => { const els = [...document.querySelectorAll('.log li')]; els[els.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); await sleep(2500);
    await page.goto(`${BASE}/owner`); await page.waitForSelector("text=instruction came from web content"); mark("owner ask with flags"); await sleep(2500);
    await glide(500, 640, 30); await sleep(800);
    await clickEl("button:has-text('Decline')", "declined"); await page.waitForSelector("text=Declined 0.005", { timeout: 60000 }); await sleep(2500);
    await page.goto(url); await page.waitForSelector("text=declined"); mark("task declined"); await sleep(2000);
    await page.evaluate(() => { const els = [...document.querySelectorAll('.log li')]; els[els.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); await sleep(3000);
  },

  // Sweep + receipt, then the verify page with the tamper test. Uses the newest finished task.
  async hand_back({ page, ctx, mark, glide, clickEl, scrollTo, sleep }) {
    await seedOwner(ctx);
    const tasks = await (await fetch(`${BASE}/api/tasks`)).json();
    const t = tasks.tasks.find((x) => x.status === "finished");
    await page.goto(`${BASE}/tasks/${t.id}`); await page.waitForSelector("text=Receipt anchored"); mark("task page");
    await page.evaluate(() => { const els = [...document.querySelectorAll('.log li')]; els[els.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); mark("sweep and receipt"); await sleep(3500);
    await page.goto(`${BASE}/verify/${t.id}`); await page.waitForSelector("text=log matches the receipt on Solana", { timeout: 60000 }); mark("verify green"); await sleep(2500);
    await glide(700, 400, 30); await sleep(800);
    await clickEl("button:has-text('Tamper test')", "tamper"); await page.waitForSelector("text=MISMATCH"); mark("mismatch"); await sleep(1200);
    await scrollTo(300, 900); await sleep(3000);
  },

  // The public README: proof table, then the GurtOS comparison.
  async readme({ page, mark, scrollTo, sleep }) {
    await page.goto("https://github.com/anudeep-bonagiri/stipend#readme", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("article", { timeout: 60000 }); mark("readme");
    const y1 = await page.evaluate(() => { const h = [...document.querySelectorAll('article h2')].find(h => /Proof/.test(h.textContent)); return h ? h.getBoundingClientRect().top + window.scrollY - 90 : 0; });
    await scrollTo(y1, 1200); mark("proof"); await sleep(5000);
    await scrollTo(y1 + 320, 1500); await sleep(2500);
    const y2 = await page.evaluate(() => { const h = [...document.querySelectorAll('article h2')].find(h => /GurtOS/.test(h.textContent)); return h ? h.getBoundingClientRect().top + window.scrollY - 90 : 0; });
    await scrollTo(y2, 1200); mark("gurtos"); await sleep(5500);
  },
};

const want = process.argv.slice(2);
for (const [name, fn] of Object.entries(segments)) {
  if (want.length && !want.includes(name)) continue;
  await segment(name, fn);
}
