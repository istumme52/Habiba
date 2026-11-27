// Runtime adapter: maps a validated storyboard manifest onto the toon renderer and its reusable low-poly scene props.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const palette = (seed) => {
  const h = hash(seed);
  const tops = ["#3f6fb5","#4f8b78","#a64f58","#b5653f","#76569a","#63824b","#3e7770","#b27b3f"];
    const skins = ["#b97d52","#c58c5e","#a86d44","#d09a70","#936044"];
  return { top: tops[h % tops.length], pants: ["#29384d","#46515d","#343b48","#6a6258"][(h >>> 5) % 4], skin: skins[(h >>> 9) % skins.length], hair: "#241a18", boots: "#34343a", sleeve: true };
};
const lightFor = (time) => {
  const t = String(time || "").toLowerCase();
  if (/night|midnight|dark/.test(t)) return { az:135,el:42,sun:[0.34,0.44,0.72],amb:[0.15,0.19,0.34],gnd:[0.08,0.09,0.15],top:"#0d1838",mid:"#1f3058",hor:"#34496f",fog:[80,900],sat:0.82,lift:[0.01,0.02,0.05],gain:[0.95,1,1.08],card:[0.56,0.63,0.88],cloud:[0.32,0.4,0.58],disc:0,expo:1 };
  if (/sunset|evening|golden|dusk/.test(t)) return { az:168,el:10,sun:[1.62,0.98,0.52],amb:[0.31,0.28,0.48],gnd:[0.27,0.21,0.19],top:"#6d7cc4",mid:"#e6a98e",hor:"#ffcf8e",fog:[90,1100],sat:1.14,lift:[0.03,0.02,0.06],gain:[1.04,0.99,0.94],card:[1.06,0.94,0.82],cloud:[1,0.84,0.72],disc:0.004,expo:1 };
  if (/morning|dawn|sunrise/.test(t)) return { az:28,el:20,sun:[1.38,1.04,0.74],amb:[0.34,0.34,0.47],gnd:[0.3,0.24,0.19],top:"#4f8ad8",mid:"#a6c3e4",hor:"#f0dcbc",fog:[110,1200],sat:1.12,lift:[0.025,0.02,0.05],gain:[1.02,1,0.97],card:[1.03,0.98,0.93],cloud:[1,0.93,0.86],disc:0.003,expo:1 };
  return { az:112,el:50,sun:[1.2,1.12,0.97],amb:[0.36,0.37,0.46],gnd:[0.32,0.27,0.2],top:"#3f80d4",mid:"#8fb7e6",hor:"#c4d8ee",fog:[120,1300],sat:1.1,lift:[0.02,0.025,0.05],gain:[1,1,1],card:[1,1,1],cloud:[1,1,1],disc:0,expo:1 };
};
const cameraFor = (shot, movement, t) => {
  const s = String(shot || "").toLowerCase();
  const wide = /wide|establish|long/.test(s), close = /close|detail|extreme/.test(s);
  const dist = wide ? 43 : close ? 17 : 27;
  const height = wide ? 15 : close ? 4.1 : 6.5;
  const push = /dolly|push|zoom/.test(String(movement).toLowerCase()) ? -3.5 * t : 0;
  const pan = /pan|tracking|track|orbit/.test(String(movement).toLowerCase()) ? 4 * (t - 0.5) : 0;
  const tilt = /tilt|crane/.test(String(movement).toLowerCase()) ? 1.8 * (t - 0.5) : 0;
  return { pos:[pan, height + tilt, 15 + dist + push], look:[pan * 0.35, 2.2 + tilt * 0.25, 14], fov: wide ? 48 : close ? 34 : 40 };
};

export function manifestFrameState(frame, manifest) {
  if (!manifest || manifest.manifest_version !== 1 || !Array.isArray(manifest.scenes) || !manifest.scenes.length) {
    throw new Error("Missing or unsupported storyboard manifest");
  }
  const f = clamp(Math.floor(frame), 0, Math.max(0, manifest.total_frames - 1));
  const scene = manifest.scenes.find((s) => f >= s.start_frame && f < s.end_frame_exclusive) || manifest.scenes[manifest.scenes.length - 1];
  const local = clamp((f - scene.start_frame) / Math.max(1, scene.frame_count - 1));
  const ids = Array.isArray(scene.character_ids) ? scene.character_ids.slice(0, 4) : [];
  const chars = new Map((manifest.characters || []).map((c) => [c.id, c]));
  const moving = /walk|run|climb|travel|move|approach|leave|chase/i.test(scene.action || "");
  const actors = ids.map((id, i) => {
    const character = chars.get(id) || { id, name: id };
    const x = (i - (ids.length - 1) / 2) * 2.8;
    const kind = moving ? "side" : "front";
    const outfit = palette(character.id + "|" + (character.outfit || character.description || ""));
    const dialogueForActor = (scene.dialogue || []).some((line) => line.character_id === id && String(line.line || "").trim());
    const mouthOpen = dialogueForActor && (Math.floor((f - scene.start_frame + (hash(id) % 5)) / 3) % 2 === 0);
    const expression = dialogueForActor ? (mouthOpen ? "talkOpen" : "talkClosed")
      : /fear|scared|afraid/i.test(scene.action || "") ? "strain"
      : /happy|laugh|smile|joy/i.test(scene.action || "") ? "smile" : "neutral";
    const opts = { expr: expression, seed: hash(id) % 997, blink: Math.floor((f + i * 17) % 97) === 0, light: -2.2, tilt: Math.sin(f * 0.035 + i) * 1.2 };
    if (moving) { opts.mode = "walk"; opts.phase = (f - scene.start_frame) / 12 + i * 0.4; }
    if (/point|show|indicate/i.test(scene.action || "")) opts.armR = "point";
    if (/wave|greet/i.test(scene.action || "")) opts.armR = "up";
    return { id: "manifest-" + id, kind, outfit, outfitKey: character.id, pos:[x + Math.sin(local * Math.PI) * (moving ? 1.1 : 0), 14 + (i % 2) * 0.8], dir:[0, moving ? -1 : 1], opts, scale: ids.length > 2 ? 0.82 : 1, pull:0.45 };
  });
  const cam = cameraFor(scene.camera?.shot || scene.camera_shot, scene.camera?.movement || scene.camera_movement, local);
  const description = [scene.location, scene.background, scene.action, scene.title].filter(Boolean).join(" ").toLowerCase();
  const props = new Set();
  const has = (re) => re.test(description);
  if (has(/forest|jungle|park|mountain|hill|nature|village|outdoor|field|garden|tree/)) { props.add("tree"); props.add("bird"); }
  if (has(/village|town|house|home|neighbourhood|school|hospital|clinic|station|building/)) { props.add("house"); props.add("fence"); }
  if (has(/city|urban|street|road|traffic|car|vehicle|market/)) { props.add("road"); props.add("car"); props.add("lamp"); props.add("sign"); }
  if (has(/bicycle|cycle|cycling/)) props.add("bicycle");\n  if (has(/motorcycle|motorbike|motor cycle|scooter|\\bbike\\b/)) props.add("motorcycle");
  if (has(/river|lake|sea|ocean|waterfall|water bank|shore/)) { props.add("water"); props.add("bridge"); }
  if (has(/camp|camping|tent|wilderness/)) { props.add("tent"); props.add("tree"); props.add("bird"); }
  if (has(/park|garden|bus stop|waiting/)) props.add("bench");
  if (has(/road|street|walkway|sidewalk/)) { props.add("road"); props.add("lamp"); }
  if (!props.size) { props.add("tree"); props.add("bird"); }
  return {
    shot: "manifest-scene-" + scene.scene_number,
    cam, light: lightFor(scene.time_of_day), actors, fx: [],
    world: { progress: 0.28, slab:null, plug:null, short:false },
    props: [...props],
    flash: /flash|white/.test(String(scene.transition || "").toLowerCase()) && local < 0.06 ? 0.25 : 0,
    vign: 0.18,
    dof: { focus: 24, cInf: /close|detail/i.test(scene.camera?.shot || scene.camera_shot || "") ? 5 : 10 },
    shadow: { c:[0,0,14], r:30 }
  };
}
