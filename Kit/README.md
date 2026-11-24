# cartoon-audio-short kit

A 9:16 cartoon/3D story-video rendering kit with a worked 41.8-second example.

## What is included
- `tools/setup.sh ~/shorts/<slug>`: copies the engine into a project, installs Three.js r160, builds `web/toon.js`, and prepares the folder.
- `engine/Web/` (source folder; capital W): `main.js` (Three.js toon world, materials, depth, lighting, environment and character compositing), `story.js` (the fixed worked example: shots, cameras, lights, actors and effects), `terrain.js`, `motion.js`, `paint.js`, `toonbase.js`, `cast.js`, `castdefs.js` (35 story-character presets plus a reserved channel mascot), `charsheet.html`, and `worldsheet.html`.
- `engine/render.mjs`: Playwright frame/still/test-page renderer.
- `engine/timing.py`: aligns a supplied narration track to script words and phrases.
- `engine/audio/`: original procedural music and SFX synthesis, stem mixing and final loudness processing.
- `engine/build_video.sh`: orchestrates word timing, music/SFX generation, frame rendering, MP4 encoding and QA for the included example.
- `engine/requirements.txt`: Python dependencies.

## Build the included example
From the project folder created by setup:

```bash
python3 -m pip install -r requirements.txt
npm install --no-audit --no-fund playwright
npx playwright install chromium
./build_video.sh voice.mp3 script.txt episode
```

The supplied `story.js` is a single fixed example with 1,254 frames at 30 fps (41.8 seconds). The narration must be approximately 41.8 seconds; the build script checks this before rendering. The final file is written to `out/episode.mp4`. Set `RESUME=1` to skip frames already rendered.

## Important scope
This kit is a working rendering/audio foundation and a completed example episode pipeline, not yet a fully autonomous text-to-video service. It does not currently call an LLM to invent a new storyboard, generate arbitrary character/environment assets, or synthesize narration from text. New stories still require authoring a matching `story.js` timeline and supplying a voice track. The channel mascot is composited as a small consistent corner mark in exported frames; it is not yet a full 3D character that participates in every story scene.
