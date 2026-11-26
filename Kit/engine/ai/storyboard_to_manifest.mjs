#!/usr/bin/env node
// Convert validated storyboard JSON into a deterministic frame/timing manifest.
// This is a hand-off contract for future scene rendering, not a 3D asset generator.
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

export function createManifest(storyboard) {
  if (!storyboard || typeof storyboard !== "object" || Array.isArray(storyboard)) {
    throw new Error("Storyboard root must be an object");
  }
  if (storyboard.aspect_ratio !== "9:16") throw new Error('Storyboard aspect_ratio must be "9:16"');
  if (storyboard.fps !== 30) throw new Error("Storyboard fps must be 30");
  if (!Array.isArray(storyboard.characters) || !Array.isArray(storyboard.scenes) || !storyboard.scenes.length) {
    throw new Error("Storyboard must include characters and at least one scene");
  }
  const characterIds = new Set(storyboard.characters.map((c) => c?.id).filter(Boolean));
  let cursor = 0;
  const scenes = storyboard.scenes.map((scene, index) => {
    if (!scene || !Number.isInteger(scene.duration_seconds) || scene.duration_seconds < 1) {
      throw new Error("Scene " + (index + 1) + " has an invalid duration_seconds");
    }
    if (!Array.isArray(scene.character_ids) || scene.character_ids.some((id) => !characterIds.has(id))) {
      throw new Error("Scene " + (index + 1) + " references an unknown character");
    }
    const start_frame = cursor;
    const frame_count = scene.duration_seconds * storyboard.fps;
    cursor += frame_count;
    return {
      scene_number: index + 1,
      title: scene.title || "Scene " + (index + 1),
      start_frame,
      end_frame_exclusive: cursor,
      frame_count,
      duration_seconds: scene.duration_seconds,
      location: scene.location || "",
      time_of_day: scene.time_of_day || "",
      background: scene.background || "",
      character_ids: [...scene.character_ids],
      action: scene.action || "",
      camera: { shot: scene.camera_shot || "", movement: scene.camera_movement || "" },
      narration: scene.narration || "",
      dialogue: Array.isArray(scene.dialogue) ? scene.dialogue : [],
      sound_effects: Array.isArray(scene.sound_effects) ? scene.sound_effects : [],
      music_mood: scene.music_mood || "",
      transition: scene.transition || ""
    };
  });
  const duration_seconds = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
  if (Number.isFinite(storyboard.duration_seconds) && duration_seconds !== storyboard.duration_seconds) {
    throw new Error("Scene durations total " + duration_seconds + "s, expected " + storyboard.duration_seconds + "s");
  }
  return {
    manifest_version: 1,
    status: "ready_for_bundled_renderer",
    title: storyboard.title || "Untitled story",
    logline: storyboard.logline || "",
    language: storyboard.language || "",
    aspect_ratio: "9:16",
    fps: 30,
    duration_seconds,
    total_frames: cursor,
    characters: storyboard.characters,
    scenes,
    renderer_notes: [
      "This manifest is executable by the bundled storyboard renderer.",
      "The current renderer uses the bundled village/mountain world and stylized character cards.",
      "Custom AI-generated locations, detailed props, full 3D character rigs and lip-sync are not included."
    ]
  };
}

function selfTest() {
  const sample = {
    title: "Sample", aspect_ratio: "9:16", fps: 30, duration_seconds: 5,
    characters: [{ id: "hero", name: "Hero" }],
    scenes: [
      { duration_seconds: 2, character_ids: ["hero"], camera_shot: "wide" },
      { duration_seconds: 3, character_ids: [], camera_shot: "close-up" }
    ]
  };
  const result = createManifest(sample);
  if (result.total_frames !== 150 || result.scenes[1].start_frame !== 60 ||
      result.scenes[1].end_frame_exclusive !== 150) throw new Error("Frame mapping test failed");
  let rejected = false;
  try { createManifest({ ...sample, fps: 24 }); } catch { rejected = true; }
  if (!rejected) throw new Error("Unsupported FPS was not rejected");
  console.log("Storyboard manifest self-test passed.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();
  const input = path.resolve(args.input || "out/storyboard.json");
  const output = path.resolve(args.output || "out/render-manifest.json");
  const storyboard = JSON.parse(await fs.readFile(input, "utf8"));
  const manifest = createManifest(storyboard);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Render manifest saved: " + output);
  console.log("Scenes: " + manifest.scenes.length + " | Frames: " + manifest.total_frames + " | Duration: " + manifest.duration_seconds + "s");
  console.log("Status: ready for the bundled renderer; custom 3D asset generation is not included.");
}

main().catch((error) => {
  console.error("ERROR: " + error.message);
  process.exitCode = 1;
});
