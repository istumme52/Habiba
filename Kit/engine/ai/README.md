# AI storyboard planner, renderer and voiceover

The workflow turns a story idea into a vertical short video:
1. `plan_story.mjs` creates validated 9:16 / 30-fps storyboard JSON.
2. `storyboard_to_manifest.mjs` creates deterministic scene frame ranges.
3. `generate_voice.mjs` requests narration/dialogue audio from an OpenAI-compatible TTS endpoint.
4. `build_storyboard_video.sh` renders scene frames, creates original procedural music/SFX from each scene's cues, mixes the audio, and exports an MP4.

## Requirements

- Node.js 20+, Playwright and Chromium.
- Python 3 with dependencies from `requirements.txt` (NumPy and SciPy).
- An AI Chat Completions API key/model for planning and a compatible speech API key/model/voice for TTS.
- Store credentials only in environment variables or GitHub Secrets. Never commit keys or paste them into chat.

## One-command workflow

After setting `AI_API_KEY`, `AI_MODEL`, `TTS_MODEL`, and `TTS_VOICE` (and optionally a separate `TTS_API_KEY`), you can run the complete pipeline from the generated project folder:

```bash
./create_story_video.sh "একটি রহস্যময় নদীর গল্প" 60 Bangla river_mystery
```

The script plans the story, creates the frame manifest, generates narration, renders scene frames, creates procedural music/SFX, mixes the audio and exports the MP4. For manual review, use the individual stages below.

## Generate a storyboard

Set `AI_API_KEY` and `AI_MODEL`. Optionally set `AI_API_URL` for another compatible Chat Completions endpoint.

```bash
node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json
# Bangla:
node ai/plan_story.mjs --prompt "একটি রহস্যময় নদীর গল্প" --duration 60 --language Bangla --output out/storyboard.json
```

The planner validates 9:16, 30 fps, scene structure, character references and exact total duration (15–600 seconds).

## Create the render manifest

```bash
node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json
```

Each scene receives a start frame, exclusive end frame and frame count. The manifest preserves character IDs, location/background descriptions, actions, camera direction, narration, dialogue, music mood and sound-effect cues.

## Generate narration

Set `TTS_API_KEY` (or `AI_API_KEY`), `TTS_MODEL`, and `TTS_VOICE`. Optionally set `TTS_API_URL` (defaults to OpenAI's speech endpoint).

```bash
node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.mp3 --transcript out/narration.txt
```

The tool joins narration and dialogue in scene order and supports up to 4,000 characters per request. Check the actual audio duration and pronunciation before rendering.

## Export the MP4

From the generated project directory:

```bash
python3 -m pip install -r requirements.txt
./build_storyboard_video.sh out/render-manifest.json out/narration.mp3 episode
```

The script renders all frames at 1080×1920 / 30 fps, generates procedural music and cue-based sound effects, mixes them with the voiceover, applies final loudness processing, and writes `out/episode.mp4`. Narration is automatically time-stretched with pitch preservation when the difference is small (0.80×–1.25×); larger mismatches require regenerating or editing the voiceover.

## Offline tests

```bash
node ai/plan_story.mjs --self-test
node ai/storyboard_to_manifest.mjs --self-test
node ai/generate_voice.mjs --self-test
python3 audio/test_story_audio.py
```

## Current boundaries

The dynamic renderer uses the bundled 3D world plus scene-selected low-poly props (trees, houses, roads, street lamps, cars, bicycles, birds, tents, bridges, fences, benches, signs and water) and stylized 2D character cards with everyday clothing, basic walk/gesture poses, scene lighting and camera changes. It does not yet generate arbitrary custom AI backgrounds, detailed location geometry or fully rigged 3D characters. Dialogue includes a simple deterministic mouth-flap animation on the speaking character; it is not phoneme-level or audio-waveform-synchronized lip-sync. Procedural music and SFX are original lightweight synthesized approximations, not cinematic recordings. The original fixed sample episode remains available. Check provider pricing, supported models/voices and data-handling terms before sending content.
