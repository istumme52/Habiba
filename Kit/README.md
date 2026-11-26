# cartoon-audio-short kit

A 9:16 cartoon/3D story-video rendering kit with a worked 41.8-second example and AI-assisted story preparation tools.

## What is included
- `tools/setup.sh ~/shorts/<slug>`: copies the engine, AI tools and dependencies into a project, installs Three.js r160 and builds `web/toon.js`.
- `engine/ai/plan_story.mjs`: creates structured storyboard JSON from a story idea using an OpenAI-compatible Chat Completions endpoint.
- `engine/ai/storyboard_to_manifest.mjs`: converts storyboard scenes into deterministic 30-fps frame ranges and a render manifest.\n- `engine/ai/prepare_storyboard.mjs` and `engine/Web/manifest_runtime.js`: load a manifest into the renderer and map scenes to camera, lighting and consistent character-card changes.\n- `engine/build_storyboard_video.sh`: renders the manifest scenes and exports a narrated MP4 using the bundled village/mountain world.
- `engine/ai/generate_voice.mjs`: converts storyboard narration/dialogue into an MP3 using an OpenAI-compatible speech endpoint; saves a transcript too.
- `engine/Web/` (source folder; capital W): Three.js toon world, fixed example timeline, terrain, motion, character presets (35 story outfits plus a reserved channel mascot), and visual review sheets.
- `engine/render.mjs`: Playwright frame/still/test-page renderer.
- `engine/timing.py` and `engine/audio/`: narration timing, original procedural music/SFX, mixing and final loudness processing.
- `engine/build_video.sh`: orchestrates the fixed example's timing, music/SFX, frame rendering, MP4 encoding and QA.

## AI-assisted story preparation

Set `AI_API_KEY` and `AI_MODEL` as environment variables, then:

```bash
node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json
node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json
```

For Bangla stories, use `--language Bangla`. The storyboard planner validates 9:16, 30 fps, character references, scene fields and exact duration. The manifest assigns scene frame ranges and drives the renderer. The current runtime supports simple character cards, basic movement/gestures, camera framing/movement and time-of-day lighting in the bundled village/mountain set; it does not generate new 3D locations, detailed props or rigged characters.

For voiceover, set `TTS_API_KEY`, `TTS_MODEL`, and `TTS_VOICE`, then run:

```bash
node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.mp3 --transcript out/narration.txt
```

Never commit API credentials. Use environment variables or GitHub Secrets.\n\nAfter generating the voiceover, export the storyboard-driven video:\n\n```bash\n./build_storyboard_video.sh out/render-manifest.json out/narration.mp3 episode\n```\n\nThis renders all scene frames at 1080×1920 / 30 fps and muxes narration into `out/episode.mp4`. Narration duration must match the storyboard within 0.35 seconds. Music/SFX cue synthesis and lip-sync are not included in this dynamic path yet.

## Build the included example

From the project folder created by setup:

```bash
python3 -m pip install -r requirements.txt
npm install --no-audit --no-fund playwright
npx playwright install chromium
./build_video.sh voice.mp3 script.txt episode
```

The supplied `story.js` is a single fixed example with 1,254 frames at 30 fps (41.8 seconds). The narration must be approximately 41.8 seconds. The final file is written to `out/episode.mp4`.

## Honest scope

The included renderer can produce the supplied fixed sample episode. The AI preparation tools can create storyboards, scene timing manifests and voiceover audio. The dynamic path renders new storyboard timelines with camera and lighting changes plus consistent simple character cards against the bundled village/mountain environment, and exports a narrated MP4. AI-generated custom backgrounds/props, full 3D character rigs, lip-sync, and dynamic music/SFX mixing remain future work. The channel mascot is currently a corner mark, not a full 3D actor.
