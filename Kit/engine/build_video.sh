#!/usr/bin/env bash
# build_video.sh <voice.wav|voice.mp3> <script.txt> [output-title]
# Reproducible end-to-end render for the included 41.8 s Mountain Man example.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
VOICE="${1:?Usage: ./build_video.sh voice.mp3 script.txt [output-title]}"
SCRIPT="${2:?Usage: ./build_video.sh voice.mp3 script.txt [output-title]}"
TITLE="${3:-episode}"
[[ -f "$VOICE" ]] || { echo "ERROR: voice file not found: $VOICE" >&2; exit 2; }
[[ -f "$SCRIPT" ]] || { echo "ERROR: script file not found: $SCRIPT" >&2; exit 2; }
[[ "$TITLE" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "ERROR: output title may contain only letters, numbers, dot, underscore and hyphen." >&2; exit 2; }

for cmd in node npm python3 ffmpeg ffprobe; do
  command -v "$cmd" >/dev/null || { echo "ERROR: missing dependency: $cmd" >&2; exit 3; }
done
python3 - <<'PY'
import numpy, scipy
print("Python dependencies: numpy", numpy.__version__, "| scipy", scipy.__version__)
PY
[[ -f web/toon.js ]] || { echo "ERROR: web/toon.js is missing. Run Kit/tools/setup.sh for this project first." >&2; exit 3; }
node -e "require.resolve('playwright')" >/dev/null 2>&1 || { echo "ERROR: Playwright is not installed in this project. Run: npm install --no-audit --no-fund playwright && npx playwright install chromium" >&2; exit 3; }
node -e "require.resolve('./web/node_modules/three')" >/dev/null 2>&1 || { echo "ERROR: Three.js is missing. Run setup.sh again." >&2; exit 3; }

VOICE_SECONDS="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE")"
python3 - "$VOICE_SECONDS" <<'PY'
import sys
actual = float(sys.argv[1])
expected = 1254 / 30
if abs(actual - expected) > 0.30:
    raise SystemExit(f"ERROR: this included story is fixed at {expected:.2f}s (1254 frames @ 30fps), but the voice is {actual:.2f}s. Use a 41.8s voice track or author a matching story timeline first.")
print(f"Voice duration OK: {actual:.2f}s (story: {expected:.2f}s)")
PY

mkdir -p frames audio out work
echo "[1/5] Aligning script words to narration"
python3 timing.py "$VOICE" "$SCRIPT" --out work
echo "[2/5] Generating original music and sound-effect stems"
python3 audio/audio.py "$VOICE" audio
echo "[3/5] Mixing narration, music and SFX"
python3 audio/mix.py "$VOICE" audio/music.wav audio/sfx.wav audio/mix.wav
echo "[4/5] Rendering 1254 vertical frames (RESUME=1 skips completed frames)"
node render.mjs frames "0-1253"
echo "[5/5] Encoding MP4 and running audio/video QA"
bash finish.sh "$TITLE"
echo "SUCCESS: out/$TITLE.mp4"
