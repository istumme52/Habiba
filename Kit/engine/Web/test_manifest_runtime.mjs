import assert from "node:assert/strict";
import fs from "node:fs/promises";
const runtimeSource = await fs.readFile(new URL("./manifest_runtime.js", import.meta.url), "utf8");
const runtimeUrl = "data:text/javascript;base64," + Buffer.from(runtimeSource).toString("base64");
const { manifestFrameState } = await import(runtimeUrl);

const manifest = {
  manifest_version: 1,
  total_frames: 30,
  characters: [{ id: "hero", name: "Hero" }],
  scenes: [{
    scene_number: 1, start_frame: 0, end_frame_exclusive: 30, frame_count: 30,
    location: "Village street beside a river",
    background: "A quiet village road with trees, houses and a motorcycle",
    time_of_day: "Morning",
    character_ids: ["hero"],
    action: "The hero stands and speaks",
    camera: { shot: "medium", movement: "static" },
    dialogue: [{ character_id: "hero", line: "Hello there." }]
  }]
};

const open = manifestFrameState(0, manifest);
const closed = manifestFrameState(3, manifest);
const openAgain = manifestFrameState(6, manifest);
assert.equal(open.actors[0].opts.expr, "talkOpen");
assert.equal(closed.actors[0].opts.expr, "talkClosed");
assert.equal(openAgain.actors[0].opts.expr, "talkOpen");
assert.ok(open.props.includes("tree"));
assert.ok(open.props.includes("house"));
assert.ok(open.props.includes("road"));\nassert.ok(open.props.includes("motorcycle"));
assert.ok(open.props.includes("water"));
assert.ok(open.props.includes("bridge"));

const silent = structuredClone(manifest);
silent.scenes[0].dialogue = [];
assert.notEqual(manifestFrameState(0, silent).actors[0].opts.expr, "talkOpen");
console.log("Manifest runtime dialogue-mouth and scene-prop tests passed.");
