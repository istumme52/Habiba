# AI storyboard planner, timing manifest and voiceover

This folder contains three AI-assisted preparation stages:
1. `plan_story.mjs` turns a written idea into structured, validated storyboard JSON.
2. `storyboard_to_manifest.mjs` converts that storyboard into a deterministic 30-fps frame/timing manifest with scene metadata.
3. `generate_voice.mjs` extracts narration/dialogue from the storyboard and requests one MP3 from an OpenAI-compatible speech endpoint.

## Requirements

- Node.js 20 or newer; no extra npm packages.
- A Chat Completions API key/model for storyboard planning.
- A speech API key/model/voice for voiceover.
- Store credentials only in environment variables or GitHub Actions Secrets. Never commit keys or paste them into chat.

## Generate a storyboard

Set `AI_API_KEY` and `AI_MODEL`. Optionally set `AI_API_URL` for another compatible Chat Completions endpoint.

    node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json

Bangla example:

    node ai/plan_story.mjs --prompt "একটি রহস্যময় নদীর গল্প" --duration 60 --language Bangla --output out/storyboard.json

The planner validates 9:16, 30 fps, scene structure, character references and exact total duration (15–600 seconds).

## Create the frame/timing manifest

    node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json

The manifest assigns every scene a start frame, exclusive end frame and frame count. It preserves character IDs, backgrounds, actions, camera direction, narration and sound cues. Run `node ai/storyboard_to_manifest.mjs --self-test` for the offline timing test.

**Important:** this manifest is an intermediate planning contract. It is not an executable Three.js scene timeline. Character/environment asset generation and arbitrary-story 3D rendering are not implemented.

## Render the storyboard as an MP4\n\nAfter creating the manifest and narration, run from the generated project directory:\n\n    ./build_storyboard_video.sh out/render-manifest.json out/narration.mp3 episode\n\nThis renders every frame from the storyboard at 1080×1920 / 30 fps and muxes the narration into `out/episode.mp4`. The narration duration must match the storyboard duration within 0.35 seconds. This first dynamic export uses narration only; sound-effect and music cues remain planning metadata and are not yet synthesized or mixed.\n\n## Generate narration audio

Set:
- `TTS_API_KEY` (or reuse `AI_API_KEY` if the same provider key supports speech)
- `TTS_MODEL`
- `TTS_VOICE`
- Optional `TTS_API_URL` (defaults to `https://api.openai.com/v1/audio/speech`)

Then run:

    node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.mp3 --transcript out/narration.txt

The tool joins scene narration and dialogue in scene order, saves a transcript and writes the returned MP3. It currently supports up to 4,000 characters in one request. Verify the actual audio duration and pronunciation before using it in an edit.

## Offline tests

    node ai/plan_story.mjs --self-test
    node ai/storyboard_to_manifest.mjs --self-test
    node ai/generate_voice.mjs --self-test

## Current boundary

The AI tools create storyboard JSON, a frame/timing manifest and narration audio. The manifest can drive scene timing, camera framing/movement, lighting presets and consistent simple 2D character cards inside the bundled 3D village/mountain set, then export a narrated MP4. Custom AI-generated environment assets, detailed props, fully rigged 3D characters, lip-sync, and automated music/SFX mixing are not yet implemented. The original fixed sample episode remains available too. Check provider pricing, supported models/voices and data-handling terms before sending content.
