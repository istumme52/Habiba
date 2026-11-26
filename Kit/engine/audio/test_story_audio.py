import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
manifest = {
  "manifest_version": 1, "duration_seconds": 2, "scenes": [
    {"start_frame": 0, "end_frame_exclusive": 30, "music_mood": "mysterious", "sound_effects": ["footsteps", "wind"]},
    {"start_frame": 30, "end_frame_exclusive": 60, "music_mood": "happy", "sound_effects": ["birds", "soft impact"]}
  ]
}
with tempfile.TemporaryDirectory() as d:
    m=Path(d)/"manifest.json"; m.write_text(json.dumps(manifest),encoding="utf-8")
    subprocess.run([sys.executable, str(Path(__file__).with_name("story_audio.py")), str(m), d],check=True)
    for name in ("music.wav","sfx.wav"):
        with wave.open(str(Path(d)/name),"rb") as f:
            assert f.getnchannels()==2 and f.getframerate()==48000 and f.getnframes()==96000
print("Storyboard audio self-test passed.")
