#!/usr/bin/env node
// Writes a validated render manifest into the browser runtime bootstrap file.
import fs from "node:fs/promises";
import path from "node:path";
const [input, output = "web/storyboard-data.js"] = process.argv.slice(2);
if (!input) throw new Error("Usage: node ai/prepare_storyboard.mjs <render-manifest.json> [web/storyboard-data.js]");
const manifest = JSON.parse(await fs.readFile(path.resolve(input), "utf8"));
if (manifest.manifest_version !== 1 || manifest.status !== "ready_for_bundled_renderer" ||
    manifest.fps !== 30 || manifest.aspect_ratio !== "9:16" ||
    !Number.isInteger(manifest.total_frames) || manifest.total_frames < 1 ||
    !Array.isArray(manifest.scenes) || !manifest.scenes.length) {
  throw new Error("Invalid or unsupported render manifest");
}
let cursor = 0;
for (const [i, scene] of manifest.scenes.entries()) {
  if (scene.start_frame !== cursor || scene.frame_count !== scene.duration_seconds * 30 ||
      scene.end_frame_exclusive !== cursor + scene.frame_count) {
    throw new Error("Invalid frame range in scene " + (i + 1));
  }
  cursor = scene.end_frame_exclusive;
}
if (cursor !== manifest.total_frames) throw new Error("Manifest total_frames does not match scene ranges");
const destination = path.resolve(output);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, "window.STORYBOARD_MANIFEST = " + JSON.stringify(manifest) + ";\n", "utf8");
console.log("Browser storyboard loaded: " + destination);
console.log("Scenes: " + manifest.scenes.length + " | Frames: " + manifest.total_frames + " | Duration: " + manifest.duration_seconds + "s");
