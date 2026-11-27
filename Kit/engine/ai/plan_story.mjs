#!/usr/bin/env node
// AI storyboard planner using an OpenAI-compatible Chat Completions endpoint.
// This creates storyboard JSON for the end-to-end MP4 pipeline.
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--self-test") { out.selfTest = true; continue; }
    if (!token.startsWith("--")) throw new Error("Unexpected argument: " + token);
    const key = token.slice(2);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error("Missing value for --" + key);
    out[key] = value;
  }
  return out;
}

function validateStoryboard(data, expectedDuration, expectedLanguage) {
  const errors = [];
  const isText = (v) => typeof v === "string" && v.trim().length > 0;
  if (!data || typeof data !== "object" || Array.isArray(data)) return ["root must be a JSON object"];
  if (!isText(data.title)) errors.push("title must be a non-empty string");
  if (!isText(data.logline)) errors.push("logline must be a non-empty string");
  if (data.aspect_ratio !== "9:16") errors.push('aspect_ratio must be "9:16"');
  if (data.fps !== 30) errors.push("fps must be 30");
  if (data.duration_seconds !== expectedDuration) errors.push("duration_seconds must match requested duration");
  if (data.language !== expectedLanguage) errors.push("language must match requested language");

  const characters = Array.isArray(data.characters) ? data.characters : [];
  if (characters.length < 1 || characters.length > 12) errors.push("characters must contain 1–12 objects");
  const characterIds = new Set();
  characters.forEach((c, i) => {
    if (!c || !isText(c.id) || !isText(c.name) || !isText(c.description) || !isText(c.outfit) || !isText(c.voice_style)) {
      errors.push("characters[" + i + "] needs id, name, description, outfit and voice_style");
    } else if (characterIds.has(c.id)) errors.push("duplicate character id: " + c.id);
    else characterIds.add(c.id);
  });

  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  if (scenes.length < 3 || scenes.length > 80) errors.push("scenes must contain 3–80 objects");
  let total = 0;
  scenes.forEach((s, i) => {
    if (!s || typeof s !== "object") { errors.push("scenes[" + i + "] must be an object"); return; }
    if (s.scene_number !== i + 1) errors.push("scenes[" + i + "].scene_number must be " + (i + 1));
    if (!Number.isInteger(s.duration_seconds) || s.duration_seconds < 1) errors.push("scenes[" + i + "].duration_seconds must be a positive integer");
    else total += s.duration_seconds;
    ["location", "time_of_day", "background", "action", "camera_shot", "camera_movement", "narration", "music_mood", "transition"].forEach((key) => {
      if (!isText(s[key])) errors.push("scenes[" + i + "]." + key + " must be non-empty");
    });
    if (!Array.isArray(s.character_ids) || s.character_ids.some((id) => !characterIds.has(id))) errors.push("scenes[" + i + "].character_ids must reference declared characters");
    if (!Array.isArray(s.dialogue) || s.dialogue.some((d) => !d || !characterIds.has(d.character_id) || !isText(d.line))) errors.push("scenes[" + i + "].dialogue must contain valid character_id/line objects");
    if (!Array.isArray(s.sound_effects) || s.sound_effects.some((v) => !isText(v))) errors.push("scenes[" + i + "].sound_effects must be an array of strings");
  });
  if (total !== expectedDuration) errors.push("scene durations add up to " + total + "s, expected exactly " + expectedDuration + "s");
  return errors;
}

function selfTest() {
  const sample = {
    title: "Test", logline: "A test story", language: "English", aspect_ratio: "9:16",
    fps: 30, duration_seconds: 30,
    characters: [{ id: "hero", name: "Hero", description: "Curious traveler", outfit: "Blue jacket", voice_style: "Warm" }],
    scenes: [1, 2, 3].map((n) => ({
      scene_number: n, duration_seconds: 10, location: "Forest", time_of_day: "Morning",
      background: "Tall trees and a winding path", character_ids: ["hero"], action: "Looks around",
      camera_shot: "Medium shot", camera_movement: "Slow push-in", narration: "Something strange happened.",
      dialogue: [], sound_effects: ["birds"], music_mood: "Curious", transition: "Cut"
    }))
  };
  if (validateStoryboard(sample, 30, "English").length) throw new Error("Valid storyboard rejected");
  sample.scenes[2].duration_seconds = 9;
  if (!validateStoryboard(sample, 30, "English").some((e) => e.includes("add up"))) throw new Error("Duration mismatch was not detected");
  console.log("Story planner validation self-test passed.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();
  const prompt = (args.prompt || "").trim();
  const duration = Number(args.duration || 60);
  const language = (args.language || "English").trim();
  const output = args.output || "out/storyboard.json";
  if (!prompt) throw new Error('Provide a story idea with --prompt "..."');
  if (!Number.isInteger(duration) || duration < 15 || duration > 600) throw new Error("--duration must be an integer from 15 to 600 seconds");
  if (!language) throw new Error("--language cannot be empty");

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey) throw new Error("AI_API_KEY is not set. Use an environment variable or GitHub Secret; never commit it.");
  if (!model) throw new Error("AI_MODEL is not set. Choose a model supported by your endpoint.");
  const endpoint = process.env.AI_API_URL || DEFAULT_URL;

  const system = [
    "You are a professional vertical short-film story planner.",
    "Return exactly one valid JSON object, without Markdown or commentary.",
    "Create a filmable 9:16 storyboard for a stylized 3D/cartoon educational story.",
    "Keep character identity, face, proportions and outfit consistent in every scene.",
    "Describe foreground, midground, background, lighting, weather, props and environmental depth.",
    "Vary camera_shot (wide, establishing, medium, close-up, extreme close-up, over-the-shoulder) and camera_movement (static, pan, tilt, dolly, tracking, orbit, crane).",
    "Narration must be natural spoken prose in the requested language. Dialogue items have character_id and line.",
    "Scene durations are positive integers and add up exactly to the requested duration.",
    "Include a hook, progression, reveal/payoff and satisfying ending. Avoid unsafe instructions and fabricated factual claims."
  ].join(" ");

  const example = {
    title: "string", logline: "string", language: language, aspect_ratio: "9:16", fps: 30,
    duration_seconds: duration,
    characters: [{ id: "stable_id", name: "string", description: "visual identity", outfit: "specific clothing", voice_style: "voice description" }],
    scenes: [{
      scene_number: 1, duration_seconds: 8, location: "string", time_of_day: "string",
      background: "specific 3D environment", character_ids: ["stable_id"], action: "visible action",
      camera_shot: "string", camera_movement: "string", narration: "spoken narration",
      dialogue: [{ character_id: "stable_id", line: "spoken line" }],
      sound_effects: ["sound cue"], music_mood: "string", transition: "string"
    }]
  };
  const user = "Story idea: " + prompt + "\nLanguage: " + language + "\nExact duration: " + duration +
    " seconds\nReturn JSON matching this structure (values are illustrative):\n" + JSON.stringify(example);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: model, temperature: 0.7, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("AI endpoint returned HTTP " + response.status + ": " + raw.slice(0, 1200));
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error("AI endpoint response was not valid JSON"); }
  const generated = envelope.choices && envelope.choices[0] && envelope.choices[0].message && envelope.choices[0].message.content;
  if (typeof generated !== "string") throw new Error("Response missing choices[0].message.content");
  let storyboard;
  try { storyboard = JSON.parse(generated); } catch { throw new Error("Model output was not valid storyboard JSON"); }
  const errors = validateStoryboard(storyboard, duration, language);
  if (errors.length) throw new Error("Storyboard validation failed:\n- " + errors.join("\n- "));

  const destination = path.resolve(output);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, JSON.stringify(storyboard, null, 2) + "\n", "utf8");
  console.log("Storyboard saved: " + destination);
  console.log("Scenes: " + storyboard.scenes.length + " | Characters: " + storyboard.characters.length + " | Duration: " + duration + "s");
}

main().catch((error) => {
  console.error("ERROR: " + error.message);
  process.exitCode = 1;
});
