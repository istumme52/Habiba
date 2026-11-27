#!/usr/bin/env node
// Convert a validated storyboard's narration/dialogue into one MP3 via an OpenAI-compatible TTS endpoint.
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
    for (const line of scene.dialogue || []) {
      if (line.line && line.line.trim()) lines.push(line.line.trim());
    }
  }
  return lines.join("\n\n").trim();
}

function selfTest() {
  const sample = { scenes: [
    { narration: "First scene.", dialogue: [{ line: "Hello." }] },
    { narration: "Second scene.", dialogue: [] }
  ] };
  const text = makeNarration(sample);
  if (text !== "First scene.\n\nHello.\n\nSecond scene.") throw new Error("Narration extraction test failed");
  console.log("TTS narration extraction self-test passed.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();
  const input = args.input || "out/storyboard.json";
  const output = args.output || "out/narration.mp3";
  const transcript = args.transcript || "out/narration.txt";
  const key = process.env.TTS_API_KEY || process.env.AI_API_KEY;
  const model = process.env.TTS_MODEL;
  const voice = process.env.TTS_VOICE;
  if (!key) throw new Error("Set TTS_API_KEY (or AI_API_KEY) as an environment variable/GitHub Secret. Never commit it.");
  if (!model) throw new Error("Set TTS_MODEL to a model supported by your speech endpoint.");
  if (!voice) throw new Error("Set TTS_VOICE to a voice supported by your speech endpoint.");
  const endpoint = process.env.TTS_API_URL || "https://api.openai.com/v1/audio/speech";
  const raw = await fs.readFile(input, "utf8");
  let storyboard;
  try { storyboard = JSON.parse(raw); } catch { throw new Error("Input storyboard is not valid JSON: " + input); }
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) throw new Error("Storyboard has no scenes");
  const narration = makeNarration(storyboard);
  if (!narration) throw new Error("Storyboard contains no narration or dialogue");
  if (narration.length > 4000) throw new Error("Narration is " + narration.length + " characters; this single-request TTS tool currently supports at most 4000. Split the story into shorter sections.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({ model, voice, input: narration, response_format: "mp3" })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error("TTS endpoint returned HTTP " + response.status + ": " + message.slice(0, 1000));
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 100) throw new Error("TTS endpoint returned an unexpectedly small audio file");
  const audioPath = path.resolve(output), transcriptPath = path.resolve(transcript);
  await fs.mkdir(path.dirname(audioPath), { recursive: true });
  await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
  await fs.writeFile(audioPath, audio);
  await fs.writeFile(transcriptPath, narration + "\n", "utf8");
  console.log("Voiceover saved: " + audioPath + " (" + audio.length + " bytes)");
  console.log("Transcript saved: " + transcriptPath);
  console.log("Note: check the generated audio duration against the storyboard before rendering.");
}

main().catch((error) => {
  console.error("ERROR: " + error.message);
  process.exitCode = 1;
});
