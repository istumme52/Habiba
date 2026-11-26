#!/usr/bin/env bash
# Build a storyboard-driven MP4 using the bundled 3D village/mountain set and generated narration.
# Usage: ./build_storyboard_video.sh render-manifest.json narration.mp3 [output-title]
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
MANIFEST="${1:?Usage: ./build_storyboard_video.sh render-manifest.json narration.mp3 [output-title]}"
VOICE="${2:?Usage: ./build_storyboard_video.sh render-manifest.json narration.mp3 [output-title]}"
TITLE="${3:-storyboard}"
[[ -f "$MANIFEST" ]] || { echo "ERROR: manifest not found: $MANIFEST" >&2; exit 2; }
[[ -f "$VOICE" ]] || { echo "ERROR: narration not found: $VOICE" >&2; exit 2; }
[[ "$TITLE" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "ERROR: output title may contain only letters, numbers, dot, underscore and hyphen." >&2; exit 2; }
for cmd in node ffmpeg ffprobe python3; do command -v "$cmd" >/dev/null || { echo "ERROR: missing dependency: $cmd" >&2; exit 3; }; done
node -e "require.resolve('playwright')" >/dev/null 2>&1 || { echo "ERROR: install Playwright in this project first." >&2; exit 3; }
node -e "require.resolve('./web/node_modules/three')" >/dev/null 2>&1 || { echo "ERROR: Three.js is missing; run setup.sh first." >&2; exit 3; }
mkdir -p frames out
node ai/prepare_storyboard.mjs "$MANIFEST" web/storyboard-data.js
read -r TOTAL FPS DURATION < <(node - "$MANIFEST" <<'NODE'
const fs = require('fs');
const m = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(m.total_frames, m.fps, m.duration_seconds);
NODE
)
VOICE_SECONDS="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOICE")"
python3 - "$VOICE_SECONDS" "$DURATION" <<'PY'
import sys
actual, expected = map(float, sys.argv[1:])
if abs(actual - expected) > 0.35:
    raise SystemExit(f"ERROR: narration is {actual:.2f}s but storyboard is {expected:.2f}s; adjust narration before rendering.")
print(f"Narration duration OK: {actual:.2f}s")
PY
echo "[1/2] Rendering $TOTAL frames at $FPS fps"
node render.mjs frames "0-$((TOTAL - 1))"
echo "[2/2] Encoding MP4 with narration"
ffmpeg -y -v warning -framerate "$FPS" -i "frames/f%04d.jpg" -i "$VOICE" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -t "$DURATION" -movflags +faststart "out/$TITLE.mp4"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json "out/$TITLE.mp4"
echo "SUCCESS: out/$TITLE.mp4"
