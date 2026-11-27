#!/usr/bin/env bash
# End-to-end AI story -> storyboard -> narration -> rendered vertical MP4.
# Usage: ./create_story_video.sh "Story idea" 60 Bangla episode_title
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PROMPT="${1:?Usage: ./create_story_video.sh \"Story idea\" duration_seconds language title}"
DURATION="${2:?Missing duration_seconds (15-600)}"
LANGUAGE="${3:?Missing language, e.g. Bangla or English}"
TITLE="${4:-episode}"
[[ "$DURATION" =~ ^[0-9]+$ ]] && (( DURATION >= 15 && DURATION <= 600 )) || { echo "ERROR: duration must be 15-600 whole seconds." >&2; exit 2; }
[[ "$TITLE" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "ERROR: title may contain only letters, numbers, dot, underscore and hyphen." >&2; exit 2; }
: "${AI_API_KEY:?Set AI_API_KEY in the environment}"
export AI_MODEL="${AI_MODEL:-gemini-3.8-flash}"
export TTS_MODEL="${TTS_MODEL:-gemini-3.8-flash-tts}"
export TTS_VOICE="${TTS_VOICE:-Kore}"
if [[ -z "${TTS_API_KEY:-}" && -z "${AI_API_KEY:-}" ]]; then
  echo "ERROR: set TTS_API_KEY or AI_API_KEY." >&2; exit 2
fi

# Preflight every local dependency before making paid AI/TTS requests.
for cmd in node python3 ffmpeg ffprobe; do
  command -v "$cmd" >/dev/null || { echo "ERROR: missing dependency: $cmd" >&2; exit 3; }
done
python3 -c "import numpy, scipy" >/dev/null 2>&1 || {
  echo "ERROR: Python audio packages are missing. Run: python3 -m pip install -r requirements.txt" >&2; exit 3;
}
node -e "require.resolve('playwright')" >/dev/null 2>&1 || {
  echo "ERROR: Playwright is missing. Install it with: npm install playwright && npx playwright install chromium" >&2; exit 3;
}
node -e "require.resolve('./web/node_modules/three')" >/dev/null 2>&1 || {
  echo "ERROR: Three.js is missing. Run the project setup script again." >&2; exit 3;
}
mkdir -p out
echo "[1/4] Planning story"
node ai/plan_story.mjs --prompt "$PROMPT" --duration "$DURATION" --language "$LANGUAGE" --output out/storyboard.json
echo "[2/4] Creating scene frame manifest"
node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json
echo "[3/4] Generating narration"
node ai/generate_voice.mjs --input out/storyboard.json --output out/narration.wav --transcript out/narration.txt
echo "[4/4] Rendering and mixing MP4"
./build_storyboard_video.sh out/render-manifest.json out/narration.wav "$TITLE"
echo "ALL DONE: out/$TITLE.mp4"
