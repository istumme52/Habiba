#!/usr/bin/env node
// Convert validated storyboard JSON into a deterministic frame/timing manifest.
// This is a hand-off contract for the bundled renderer, not a 3D asset generator.
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
  if (!Array.isArray(storyboard.characters) || !storyboard.characters.length ||
      !Array.isArray(storyboard.scenes) || !storyboard.scenes.length) {
    throw new Error("Storyboard must include at least one character and one scene");
  }

  const characterIds = new Set();
  for (const [index, character] of storyboard.characters.entries()) {
    if (!character || typeof character.id !== "string" || !character.id.trim()) {
      throw new Error("Character " + (index + 1) + " needs a non-empty id");
    }
    if (characterIds.has(character.id)) throw new Error("Duplicate character id: " + character.id);
    characterIds.add(character.id);
  }

  let cursor = 0;
  const scenes = storyboard.scenes.map((scene, index) => {
    const number = index + 1;
    if (!scene || !Number.isInteger(scene.duration_seconds) || scene.duration_seconds < 1) {
      throw new Error("Scene " + number + " has an invalid duration_seconds");
    }
    if (!Array.isArray(scene.character_ids) || scene.character_ids.some((id) => !characterIds.has(id))) {
      throw new Error("Scene " + number + " references an unknown character");
    }
    const dialogue = scene.dialogue === undefined ? [] : scene.dialogue;
    if (!Array.isArray(dialogue) || dialogue.some((line) =>
      !line || !characterIds.has(line.character_id) ||
      typeof line.line !== "string" || !line.line.trim())) {
      throw new Error("Scene " + number + " has invalid dialogue; each line needs a known character_id and non-empty line");
    }
    const soundEffects = scene.sound_effects === undefined ? [] : scene.sound_effects;
    if (!Array.isArray(soundEffects) || soundEffects.some((cue) => typeof cue !== "string" || !cue.trim())) {
      throw new Error("Scene " + number + " has invalid sound_effects; expected an array of non-empty strings");
    }

    const start_frame = cursor;
    const frame_count = scene.duration_seconds * storyboard.fps;
    cursor += frame_count;
    return {
      scene_number: number,
      title: scene.title || "Scene " + number,
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
      dialogue: dialogue.map((line) => ({ character_id: line.character_id, line: line.line.trim() })),
      sound_effects: [...soundEffects],
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
      { duration_seconds: 2, character_ids: ["hero"], camera_shot: "wide", dialogue: [{ character_id: "hero", line: "Hello." }] },
      { duration_seconds: 3, character_ids: [], camera_shot: "close-up" }
    ]
  };
  const result = createManifest(sample);
  if (result.total_frames !== 150 || result.scenes[1].start_frame !== 60 ||
      result.scenes[1].end_frame_exclusive !== 150 || result.scenes[0].dialogue[0].line !== "Hello.") {
    throw new Error("Frame mapping or dialogue preservation test failed");
  }
  const rejects = (candidate) => { try { createManifest(candidate); return false; } catch { return true; } };
  if (!rejects({ ...sample, fps: 24 })) throw new Error("Unsupported FPS was not rejected");
  if (!rejects({ ...sample, characters: [{ id: "hero" }, { id: "hero" }] })) throw new Error("Duplicate character ids were not rejected");
  const badDialogue = structuredClone(sample);
  badDialogue.scenes[0].dialogue = [{ character_id: "missing", line: "Hello." }];
  if (!rejects(badDialogue)) throw new Error("Unknown dialogue speaker was not rejected");
  const badCue = structuredClone(sample);
  badCue.scenes[0].sound_effects = [""];
  if (!rejects(badCue)) throw new Error("Empty sound cue was not rejected");
  console.log("Storyboard manifest validation self-test passed.");
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
