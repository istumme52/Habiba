# cartoon-audio-short kit

A vertical 9:16 cartoon-video toolkit with a fixed example and an AI-assisted storyboard-to-MP4 workflow.

## Included

- `tools/setup.sh ~/shorts/<slug>`: creates a project with the renderer, AI tools, audio tools and Three.js.
- `engine/ai/plan_story.mjs`: creates structured storyboards using an OpenAI-compatible Chat Completions API.
- `engine/ai/storyboard_to_manifest.mjs`: assigns exact 30-fps frame ranges to scenes.
- `engine/ai/generate_voice.mjs`: generates narration/dialogue audio through a compatible TTS endpoint.
- `engine/Web/manifest_runtime.js`: maps scene timing, camera, lighting and character actions to the bundled renderer.
- `engine/build_storyboard_video.sh`: renders the storyboard, creates scene-based procedural music/SFX, mixes narration and exports MP4.
- `engine/audio/`: procedural sound generation, mixing and loudness processing.
- `engine/render.mjs`: Playwright frame/still/test-page renderer.
- `engine/build_video.sh`: builds the original fixed example.

## Build a new story

Set `AI_API_KEY` and `AI_MODEL`:

```bash
node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json
node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json
```

For Bangla stories use `--language Bangla`. The planner validates the vertical format, 30 fps, character references and exact duration.

Set `TTS_API_KEY`, `TTS_MODEL` and `TTS_VOICE`, then create narration:

```bash
node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.mp3 --transcript out/narration.txt
```

Install Python audio dependencies and export:

```bash
python3 -m pip install -r requirements.txt
./build_storyboard_video.sh out/render-manifest.json out/narration.mp3 episode
```

The output is `out/episode.mp4` (1080×1920, 30 fps). Scene mood and sound-effect cues generate simple original procedural music/SFX; the script mixes these with narration and applies final loudness processing. Voice duration must match the storyboard within 0.35 seconds.

## Existing example

```bash
./build_video.sh voice.mp3 script.txt episode
```

The included `story.js` example is a fixed 1,254-frame timeline (41.8 seconds); narration must match it.

## Honest scope

New storyboards can drive scene timing, camera framing/movement, lighting presets and consistent stylized 2D character cards with everyday clothing against the bundled village/mountain 3D environment. Custom AI-generated locations, detailed props, full 3D character rigs and lip-sync are not implemented yet. Procedural audio is a synthesized approximation, not licensed music or recorded sound effects. AI API credentials are read from environment variables; never commit them.
