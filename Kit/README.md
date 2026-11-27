# cartoon-audio-short kit

A vertical 9:16 cartoon-video toolkit with a fixed example and an AI-assisted storyboard-to-MP4 workflow. Requires Node.js 20+, Playwright/Chromium, Python 3 with NumPy/SciPy, and FFmpeg/ffprobe.

## Included

- `tools/setup.sh ~/shorts/<slug>`: creates a project with the renderer, AI tools, audio tools and Three.js.
- `engine/ai/plan_story.mjs`: creates structured storyboards using an OpenAI-compatible Chat Completions API.
- `engine/ai/storyboard_to_manifest.mjs`: assigns exact 30-fps frame ranges to scenes.
- `engine/ai/generate_voice.mjs`: generates narration/dialogue WAV audio through the Gemini TTS Interactions API.
- `engine/Web/manifest_runtime.js`: maps scene timing, camera, lighting, character actions and scene-description keywords to the bundled renderer.
- `engine/Web/scene_props.js`: provides reusable low-poly 3D trees, houses, road markings, street lamps, cars, bicycles, motorcycles, birds, tents, bridges, fences, benches, signs and water; the runtime selects relevant props from each storyboard scene.
- `engine/build_storyboard_video.sh`: renders the storyboard, creates scene-based procedural music/SFX, mixes narration and exports MP4.
- `engine/audio/`: procedural sound generation, mixing and loudness processing.
- `engine/render.mjs`: Playwright frame/still/test-page renderer.
- `engine/build_video.sh`: builds the original fixed example.

## Build a new story

For the full automatic workflow, set only `AI_API_KEY` (your Google AI Studio key). Gemini model, TTS model and voice have working defaults; optional overrides are `AI_MODEL`, `TTS_MODEL`, and `TTS_VOICE`. The same key is used for story planning and Gemini TTS.

```bash
./create_story_video.sh "A mysterious lighthouse story" 60 English lighthouse_episode
```

For Bangla, replace `English` with `Bangla`. This command creates the storyboard, timing manifest and voiceover, then renders and mixes the MP4. You can also run the individual stages below when you want to review or edit the storyboard first.

For Bangla stories use `--language Bangla`. The planner validates the vertical format, 30 fps, character references and exact duration.

The narration stage uses the same `AI_API_KEY` with Gemini TTS by default. To create narration:

```bash
node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.wav --transcript out/narration.txt
```

Install Python audio dependencies and export:

```bash
python3 -m pip install -r requirements.txt
./build_storyboard_video.sh out/render-manifest.json out/narration.wav episode
```

The output is `out/episode.mp4` (1080×1920, 30 fps). Scene mood and sound-effect cues generate simple original procedural music/SFX; the script mixes these with narration and applies final loudness processing. Voice duration is automatically pitch-preserved to fit within 0.80×–1.25×; larger mismatches need a re-record or edit.

## Run a story from GitHub Actions (phone-friendly)

You can start a cloud render from the GitHub website without running Node.js or FFmpeg on your Android phone.

1. In the repository, open **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `AI_API_KEY`: key for the storyboard Chat Completions provider.
   - `AI_MODEL`: a model supported by that provider.
   - `TTS_MODEL`: a speech model supported by your TTS endpoint.
   - `TTS_VOICE`: a voice supported by that endpoint.
   - Optional: `TTS_API_KEY`, `AI_API_URL`, `TTS_API_URL`.
2. Open the repository's **Actions** tab.
3. Select **Generate story video**, then choose **Run workflow**.
4. Enter the story idea, duration (15–600 seconds), language and output title.
5. Wait for the workflow to finish successfully. Open its run, scroll to **Artifacts**, and download the generated MP4 and storyboard files. Artifacts are retained for 7 days.

The workflow runs on a GitHub-hosted Ubuntu machine. Gemini API free-tier availability, quotas and pricing depend on your Google AI Studio project and can change; check the current AI Studio usage page before generating. API usage may incur charges. Never put API keys in the story prompt, source files or chat messages. A failed run will show its error in the workflow log; a completed CI smoke test does not mean a real episode has been generated.

## Existing example

```bash
./build_video.sh voice.mp3 script.txt episode
```

The included `story.js` example is a fixed 1,254-frame timeline (41.8 seconds); narration must match it.

## Honest scope

New storyboards can drive scene timing, camera framing/movement, lighting presets and consistent stylized 2D character cards with everyday clothing, walk/run action states, and simple dialogue mouth-flaps. A reusable low-poly 3D prop library (trees, houses, roads, lamps, cars, bicycles, motorcycles, birds, tents, fences, benches, signs and water) is selected from scene descriptions and placed around the bundled world; these are still stylized set pieces, not fully generated location geometry. This is not yet a full scene generator: custom AI-generated locations, detailed interiors, context-specific architectural sets, full 3D character rigs and phoneme-level/audio-synchronized lip-sync are not implemented; dialogue uses a basic timed mouth-flap animation. Props are stylized placeholders and may need manual art direction for production-quality shots. Procedural audio is a synthesized approximation, not licensed music or recorded sound effects. AI API credentials are read from environment variables; never commit them.
