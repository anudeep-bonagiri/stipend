// Narration with Gemini TTS. Usage: node scripts/narrate.mjs [voice] [model]
import fs from "node:fs";
import { execSync } from "node:child_process";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const KEY = env.VERTEX_API_KEY;
const voice = process.argv[2] ?? "Charon";
const model = process.argv[3] ?? "gemini-2.5-flash-preview-tts";
const { style, lines } = JSON.parse(fs.readFileSync("docs/video/narration.json", "utf8"));
for (const [id, text] of Object.entries(lines)) {
  const body = {
    contents: [{ role: "user", parts: [{ text: `${style}\n\n${text}` }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.error(id, "no audio:", JSON.stringify(data).slice(0, 300)); continue; }
  const mime = part.inlineData.mimeType; // audio/L16;codec=pcm;rate=24000
  const rate = /rate=(\d+)/.exec(mime)?.[1] ?? "24000";
  const raw = `docs/video/vo/${id}.pcm`;
  fs.writeFileSync(raw, Buffer.from(part.inlineData.data, "base64"));
  execSync(`ffmpeg -v error -y -f s16le -ar ${rate} -ac 1 -i ${raw} -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" docs/video/vo/${id}.wav`);
  fs.unlinkSync(raw);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 docs/video/vo/${id}.wav`).toString().trim();
  console.log(id, `${Number(dur).toFixed(1)} s`, mime);
}
