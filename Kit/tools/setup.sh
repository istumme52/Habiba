#!/bin/bash
# setup.sh <project dir>: copies the engine into a new short's folder, installs three.js r160, builds toon.js, links Playwright.
set -e
KIT="$(cd "$(dirname "$0")/.." && pwd)"; DST="${1:?usage: setup.sh ~/shorts/<slug>}"
mkdir -p "$DST"/{web,work,stills,frames,out,audio,ai}
# Source directory in this repository is Web (capital W); output folder remains web (lowercase).
cp -n "$KIT"/engine/Web/* "$DST/web/"
cp -n "$KIT"/engine/{render.mjs,timing.py,sheet.py,finish.sh,build_video.sh,build_storyboard_video.sh,requirements.txt} "$DST/"
cp -n "$KIT"/engine/audio/* "$DST/audio/"
cp -n "$KIT"/engine/ai/* "$DST/ai/"
chmod +x "$DST/finish.sh" "$DST/build_video.sh" "$DST/build_storyboard_video.sh"
cd "$DST/web"
[ -f package.json ] || printf '{ "name": "short", "private": true, "type": "module" }\n' > package.json
[ -d node_modules/three ] || npm i three@0.160.0 --no-audit --no-fund >/dev/null
cat toonbase.js cast.js > toon.js
cd "$DST"
if [ ! -e node_modules ]; then G=$(npm root -g); [ -d "$G/playwright" ] && ln -s "$G" node_modules || echo "install playwright: npm i playwright && npx playwright install chromium"; fi
echo "ready: $DST"
echo "Python audio dependencies: python3 -m pip install -r requirements.txt"
echo "Playwright if needed: npm install --no-audit --no-fund playwright && npx playwright install chromium"
echo "AI storyboard: set AI_API_KEY and AI_MODEL, then run node ai/plan_story.mjs --prompt 'Your story' --duration 60 --language English"
echo "Storyboard timing manifest: node ai/storyboard_to_manifest.mjs --input out/storyboard.json --output out/render-manifest.json"
echo "Prepare render: node ai/prepare_storyboard.mjs out/render-manifest.json web/storyboard-data.js"
echo "Build storyboard MP4: ./build_storyboard_video.sh out/render-manifest.json out/narration.mp3 episode"
echo "AI voiceover: set TTS_API_KEY, TTS_MODEL and TTS_VOICE, then run node ai/generate_voice.mjs"
echo "Build included sample: ./build_video.sh voice.mp3 script.txt episode"
echo "NOTE: the included story.js is a fixed 41.8-second example; the voice must match that duration."
