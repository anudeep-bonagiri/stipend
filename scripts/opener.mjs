// Generate the video opener with Gemini Omni 1.2 Flash (Interactions API).
// Usage: node scripts/opener.mjs <name> <duration e.g. 10s> <prompt-file>
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const KEY = env.VERTEX_API_KEY;
const [name, duration, promptFile] = process.argv.slice(2);
const prompt = fs.readFileSync(promptFile, "utf8").trim();
const body = { model: "gemini-omni-1.2-flash", input: prompt, response_format: { type: "video", aspect_ratio: "16:9", resolution: "1080p", duration, delivery: "uri" } };
const t0 = Date.now();
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const text = await res.text();
fs.writeFileSync(`docs/video/${name}.json`, text);
if (!res.ok) { console.error(name, "HTTP", res.status, text.slice(0, 600)); process.exit(1); }
const data = JSON.parse(text);
const out = (data.steps ?? []).find((s) => s.type === "model_output");
const vid = out?.content?.find((c) => c.type === "video");
if (!vid) { console.error(name, "no video in response", text.slice(0, 600)); process.exit(1); }
if (vid.data) {
  fs.writeFileSync(`docs/video/${name}.mp4`, Buffer.from(vid.data, "base64"));
} else if (vid.uri) {
  const fileId = vid.uri.split("/files/")[1].split(":")[0];
  for (let i = 0; i < 60; i++) {
    const f = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${KEY}`)).json();
    if (f.state === "ACTIVE") break;
    if (f.state === "FAILED") { console.error(name, "file failed", JSON.stringify(f).slice(0, 300)); process.exit(1); }
    await new Promise((r) => setTimeout(r, 3000));
  }
  const dl = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${KEY}`);
  fs.writeFileSync(`docs/video/${name}.mp4`, Buffer.from(await dl.arrayBuffer()));
}
const bytes = fs.statSync(`docs/video/${name}.mp4`).size;
console.log(name, "done in", Math.round((Date.now() - t0) / 1000), "s,", (bytes / 1e6).toFixed(1), "MB, status", data.status, "usage", JSON.stringify(data.usage ?? {}));
