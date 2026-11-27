#!/usr/bin/env node
// Generate narration audio with Google's Gemini TTS Interactions API.
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--self-test") { out.selfTest = true; continue; }
    if (!token.startsWith("--")) throw new Error("Unexpected argument: " + token);
    const key = token.slice(2), value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error("Missing value for --" + key);
    out[key] = value;
  }
  return out;
}
function makeNarration(storyboard) {
  const lines = [];
  for (const scene of storyboard.scenes) {
    if (scene.narration && scene.narration.trim()) lines.push(scene.narration.trim());
    for (const line of scene.dialogue || []) if (line.line && line.line.trim()) lines.push(line.line.trim());
  }
  return lines.join("\n\n").trim();
}
function extractAudioData(payload) {
  if (typeof payload?.output_audio?.data === "string") return payload.output_audio.data;
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const part of step.content) if (part?.type === "audio" && typeof part.data === "string") return part.data;
  }
  return null;
}
function selfTest() {
  const sample = { scenes: [{ narration: "First scene.", dialogue: [{ line: "Hello." }] }, { narration: "Second scene.", dialogue: [] }] };
  if (makeNarration(sample) !== "First scene.\n\nHello.\n\nSecond scene.") throw new Error("Narration extraction test failed");
  if (extractAudioData({ output_audio: { data: "YQ==" } }) !== "YQ==") throw new Error("Convenience response extraction failed");
  if (extractAudioData({ steps: [{ type: "model_output", content: [{ type: "audio", data: "Yg==" }] }] }) !== "Yg==") throw new Error("REST response extraction failed");
  console.log("Gemini TTS self-test passed.");
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();
  const input = args.input || "out/storyboard.json";
  const output = args.output || "out/narration.wav";
  const transcript = args.transcript || "out/narration.txt";
  const key = process.env.TTS_API_KEY || process.env.AI_API_KEY;
  const model = process.env.TTS_MODEL || "gemini-3.8-flash-tts";
  const voice = process.env.TTS_VOICE || "Kore";
  const endpoint = process.env.TTS_API_URL || "https://generativelanguage.googleapis.com/v1beta/interactions";
  if (!key) throw new Error("Set AI_API_KEY (or TTS_API_KEY) as a GitHub Secret. Never commit or share it.");
  if (!endpoint.startsWith("https://generativelanguage.googleapis.com/")) throw new Error("Gemini TTS expects the Google Gemini Interactions API endpoint.");
  const raw = await fs.readFile(input, "utf8");
  let storyboard;
  try { storyboard = JSON.parse(raw); } catch { throw new Error("Input storyboard is not valid JSON: " + input); }
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) throw new Error("Storyboard has no scenes");
  const narration = makeNarration(storyboard);
  if (!narration) throw new Error("Storyboard contains no narration or dialogue");
  if (narration.length > 4000) throw new Error("Narration is " + narration.length + " characters; split it into shorter sections (current limit: 4000).");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model,
      input: [{ type: "user_input", content: [{
        type: "text", text: narration,
        annotations: [{ type: "speech_metadata", style: "Natural, clear Bangla documentary narration; expressive, warm, and easy to understand." }]
      }] }],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] }
    })
  });
  const rawResponse = await response.text();
  let payload;
  try { payload = JSON.parse(rawResponse); } catch { throw new Error("Gemini TTS returned non-JSON (HTTP " + response.status + ")."); }
  if (!response.ok) throw new Error("Gemini TTS returned HTTP " + response.status + ": " + String(payload?.error?.message || rawResponse).slice(0, 1200));
  const audioBase64 = extractAudioData(payload);
  if (!audioBase64) throw new Error("Gemini TTS response did not contain audio data.");
  const audio = Buffer.from(audioBase64, "base64");
  if (audio.length < 100 || audio.toString("ascii", 0, 4) !== "RIFF") throw new Error("Gemini TTS did not return a valid WAV audio file.");
  const audioPath = path.resolve(output), transcriptPath = path.resolve(transcript);
  await fs.mkdir(path.dirname(audioPath), { recursive: true });
  await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
  await fs.writeFile(audioPath, audio);
  await fs.writeFile(transcriptPath, narration + "\n", "utf8");
  console.log("Gemini voiceover saved: " + audioPath + " (" + audio.length + " bytes)");
  console.log("Transcript saved: " + transcriptPath);
}
main().catch((error) => { console.error("ERROR: " + error.message); process.exitCode = 1; });
