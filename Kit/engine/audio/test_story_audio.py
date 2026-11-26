import json, os, subprocess, sys, tempfile, wave
import numpy as np
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
    # Exercise voice/music/SFX mixing and final loudness processing too.
    voice=Path(d)/"voice.wav"; sr=48000
    t=np.arange(sr*2)/sr; mono=(0.16*np.sin(2*np.pi*220*t)).astype("<i2")
    stereo=np.column_stack([mono,mono])
    with wave.open(str(voice),"wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(stereo.tobytes())
    audio_dir=Path(__file__).parent
    mixed=Path(d)/"mixed.wav"; final=Path(d)/"final.wav"
    subprocess.run([sys.executable,str(audio_dir/"mix.py"),str(voice),str(Path(d)/"music.wav"),str(Path(d)/"sfx.wav"),str(mixed)],check=True)
    subprocess.run([sys.executable,str(audio_dir/"finish_audio.py"),str(mixed),str(final)],check=True)
    with wave.open(str(final),"rb") as f:
        assert f.getnchannels()==2 and f.getframerate()==48000 and f.getnframes() > 0
print("Storyboard audio generation/mix self-test passed.")
