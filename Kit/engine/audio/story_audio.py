#!/usr/bin/env python3
"""Generate original procedural ambience/music and cue-based SFX from a storyboard manifest.
Usage: python3 audio/story_audio.py render-manifest.json outdir
No external samples or paid services are used.
"""
import json, math, os, sys, wave
import numpy as np

SR = 48000
TAU = 2 * np.pi
MOODS = {
    "curious": [220.00, 261.63, 329.63], "mysterious": [146.83, 174.61, 220.00],
    "suspense": [110.00, 130.81, 155.56], "happy": [261.63, 329.63, 392.00],
    "joy": [261.63, 329.63, 392.00], "sad": [174.61, 207.65, 261.63],
    "calm": [196.00, 246.94, 293.66], "adventure": [196.00, 246.94, 293.66],
    "epic": [130.81, 164.81, 196.00], "wonder": [220.00, 277.18, 329.63]
}

def write_wav(path, data):
    data = np.asarray(data, dtype=np.float64)
    peak = max(1e-9, float(np.max(np.abs(data))))
    data = np.clip(data / max(1.0, peak / 0.92), -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())

def pan_mono(x, pan):
    p = float(np.clip(pan, -1, 1))
    return np.vstack([x * math.sqrt((1-p)*0.5), x * math.sqrt((1+p)*0.5)])

def add(buf, clip, start):
    i = max(0, int(start * SR)); offset = max(0, -int(start * SR))
    n = min(buf.shape[1] - i, clip.shape[1] - offset)
    if n > 0: buf[:, i:i+n] += clip[:, offset:offset+n]

def tone(freq, dur, amp=0.1, decay=1.0):
    n = max(1, int(dur * SR)); t = np.arange(n) / SR
    env = np.exp(-t / max(0.01, decay))
    return amp * (np.sin(TAU*freq*t) + 0.22*np.sin(TAU*freq*2.01*t)) * env

def noise_burst(dur, amp=0.1, low=500, high=5000, seed=1):
    n = max(1, int(dur * SR)); t = np.arange(n) / SR
    rng = np.random.default_rng(seed); x = rng.standard_normal(n)
    # lightweight one-pole high-pass/low-pass shaping, stable on all supported numpy versions
    a = math.exp(-TAU * min(high, SR*0.45) / SR)
    y = np.empty(n); prev = 0.0
    for i, v in enumerate(x):
        prev = (1-a)*v + a*prev; y[i] = prev
    env = np.sin(np.pi*np.clip(t/dur, 0, 1))**1.4
    return amp * y * env

def cue_sound(label, seed):
    name = str(label).lower()
    if any(k in name for k in ("foot","step","walk","run")):
        x = tone(82, 0.22, 0.28, 0.055) + noise_burst(0.22, 0.12, seed=seed)
        return pan_mono(x, -0.12 if seed % 2 else 0.12)
    if any(k in name for k in ("wind","breeze","whoosh","swoosh")):
        x = noise_burst(1.1, 0.22, seed=seed)
        return pan_mono(x, 0)
    if any(k in name for k in ("bird","chirp")):
        t = np.arange(int(0.7*SR))/SR
        x = np.zeros_like(t)
        for k in range(3):
            start = 0.06 + k*0.19; q = t-start; mask = q >= 0
            x[mask] += 0.12*np.sin(TAU*(1800+500*k)*q[mask])*np.exp(-q[mask]/0.07)*(q[mask]<0.12)
        return pan_mono(x, 0.25)
    if any(k in name for k in ("water","splash","river","rain")):
        return pan_mono(noise_burst(0.9, 0.16, seed=seed), -0.1)
    if any(k in name for k in ("impact","hit","crash","bang","thunder","explosion")):
        x = tone(58, 0.8, 0.55, 0.19) + noise_burst(0.8, 0.3, seed=seed)
        return pan_mono(x, 0)
    if any(k in name for k in ("insect","cricket","night")):
        t = np.arange(int(1.1*SR))/SR
        gate = (np.sin(TAU*5*t)>0.65).astype(float)
        return pan_mono(0.045*np.sin(TAU*4300*t)*gate, 0.15)
    # Unknown cue: subtle short soft tick, rather than silently dropping every user cue.
    return pan_mono(tone(880, 0.12, 0.055, 0.035), 0)

def main():
    if len(sys.argv) != 3: raise SystemExit("Usage: story_audio.py render-manifest.json outdir")
    manifest = json.load(open(sys.argv[1], encoding="utf-8"))
    if manifest.get("manifest_version") != 1 or not manifest.get("scenes"):
        raise SystemExit("Invalid storyboard manifest")
    duration = float(manifest["duration_seconds"]); n = int(round(duration*SR))
    if duration <= 0 or n > SR*1800: raise SystemExit("Duration must be between 0 and 1800 seconds")
    music = np.zeros((2,n)); sfx = np.zeros((2,n))
    rng = np.random.default_rng(613)
    for si, scene in enumerate(manifest["scenes"]):
        start = float(scene["start_frame"])/30; end = float(scene["end_frame_exclusive"])/30
        a, b = max(0,int(start*SR)), min(n,int(end*SR))
        if b <= a: continue
        length=b-a; t=np.arange(length)/SR
        mood=str(scene.get("music_mood","calm")).lower()
        key=next((v for k,v in MOODS.items() if k in mood), MOODS["calm"])
        swell=0.58+0.12*np.sin(TAU*0.07*t + si*0.7)
        pad=np.zeros(length)
        for j,f in enumerate(key):
            pad += (0.045/(j+1))*np.sin(TAU*f*t + si*0.3 + 0.18*np.sin(TAU*0.04*t))
            pad += (0.012/(j+1))*np.sin(TAU*f*2.002*t + j)
        edge=np.minimum(1, np.minimum((t+0.02)/0.8, (end-start-t+0.02)/0.8)).clip(0,1)
        music[:,a:b] += pan_mono(pad*swell*edge, 0.08*((si%3)-1))
        cues=scene.get("sound_effects") or []
        if isinstance(cues, list):
            for ci, cue in enumerate(cues[:12]):
                # Spread cues through the scene, never inventing a timestamp.
                at=start + (ci+1)*(end-start)/(len(cues)+1)
                add(sfx, cue_sound(cue, si*97+ci+1), at)
    fade=min(int(0.35*SR), n//2)
    if fade:
        ramp=np.linspace(0,1,fade); music[:,:fade]*=ramp; sfx[:,:fade]*=ramp
        music[:,-fade:]*=ramp[::-1]; sfx[:,-fade:]*=ramp[::-1]
    os.makedirs(sys.argv[2],exist_ok=True)
    write_wav(os.path.join(sys.argv[2],"music.wav"),music)
    write_wav(os.path.join(sys.argv[2],"sfx.wav"),sfx)
    print(f"Generated procedural audio stems: {duration:.2f}s, {len(manifest['scenes'])} scenes")

if __name__ == "__main__": main()
