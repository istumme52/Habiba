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
python3 -c "import numpy, scipy" >/dev/null 2>&1 || { echo "ERROR: install audio dependencies with: python3 -m pip install -r requirements.txt" >&2; exit 3; }
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
VOICE_FOR_MIX="$VOICE"
TEMPO="$(python3 - "$VOICE_SECONDS" "$DURATION" <<'PY'
import sys
actual, expected = map(float, sys.argv[1:])
delta = abs(actual - expected)
if delta <= 0.35:
    print("1.0")
else:
    tempo = actual / expected
    if not 0.80 <= tempo <= 1.25:
        raise SystemExit(f"ERROR: narration is {actual:.2f}s vs storyboard {expected:.2f}s. Auto timing supports only 0.80x–1.25x; regenerate or edit the voiceover.")
    print(f"{tempo:.6f}")
PY
)"
if [[ "$TEMPO" != "1.0" ]]; then
  echo "Adjusting voiceover speed to fit storyboard (${TEMPO}x; pitch-preserving)"
  ffmpeg -y -v error -i "$VOICE" -filter:a "atempo=$TEMPO" -ar 48000 -ac 2 out/voice-aligned.wav
  VOICE_FOR_MIX="out/voice-aligned.wav"
else
  echo "Narration duration OK: ${VOICE_SECONDS}s"
fi
echo "[1/3] Rendering $TOTAL frames at $FPS fps"
node render.mjs manifest "$MANIFEST" frames "0-$((TOTAL - 1))"
echo "[2/3] Generating scene-based original music and sound effects"
python3 audio/story_audio.py "$MANIFEST" out
python3 audio/mix.py "$VOICE_FOR_MIX" out/music.wav out/sfx.wav out/voice-music-sfx.wav
python3 audio/finish_audio.py out/voice-music-sfx.wav out/final-audio.wav
echo "[3/3] Encoding MP4 with narration, music and sound effects"
ffmpeg -y -v warning -framerate "$FPS" -i "frames/f%04d.jpg" -i out/final-audio.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -t "$DURATION" -movflags +faststart "out/$TITLE.mp4"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json "out/$TITLE.mp4"
echo "SUCCESS: out/$TITLE.mp4"
