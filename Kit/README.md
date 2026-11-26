# cartoon-audio-short kit

A 9:16 cartoon/3D story-video rendering kit with a worked 41.8-second example and an initial AI storyboard-planning stage.

## What is included
- `tools/setup.sh ~/shorts/<slug>`: copies the engine, AI planner and dependencies into a project, installs Three.js r160 and builds `web/toon.js`.
- `engine/ai/plan_story.mjs`: creates a structured storyboard JSON file from a story idea using an OpenAI-compatible Chat Completions endpoint. It validates character references, scene fields and exact duration.
- `engine/ai/generate_voice.mjs`: converts the storyboard narration/dialogue into an MP3 using an OpenAI-compatible speech endpoint; saves a transcript too.
- `engine/Web/` (source folder; capital W): Three.js toon world, fixed example timeline, terrain, motion, character presets (35 story outfits plus a reserved channel mascot), and visual review sheets.
- `engine/render.mjs`: Playwright frame/still/test-page renderer.
- `engine/timing.py` and `engine/audio/`: narration timing, original procedural music/SFX, mixing and final loudness processing.
- `engine/build_video.sh`: orchestrates the fixed example's timing, music/SFX, frame rendering, MP4 encoding and QA.

## Generate an AI storyboard
Set `AI_API_KEY` and `AI_MODEL` as environment variables. Optionally set `AI_API_URL` for another compatible provider. Never commit API keys.

```bash
node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json
```

Bangla story prompts are supported by setting `--language Bangla`. Run `node ai/plan_story.mjs --self-test` for the offline validator test. More details are in `engine/ai/README.md`.

## Build the included example
From the project folder created by setup:

```bash
python3 -m pip install -r requirements.txt
npm install --no-audit --no-fund playwright
npx playwright install chromium
./build_video.sh voice.mp3 script.txt episode
```

The supplied `story.js` is a single fixed example with 1,254 frames at 30 fps (41.8 seconds). The narration must be approximately 41.8 seconds. The final file is written to `out/episode.mp4`.

## Important scope
The AI stage currently generates storyboard JSON only. It does **not** yet convert arbitrary storyboards into executable `Web/story.js` timelines, generate character/environment assets, synthesize narration, or export a new MP4 from a new story. The included renderer remains a fixed example pipeline. The channel mascot is currently a corner mark, not a full 3D actor.
