"""Audio mix: cleaned voice + 3 music cues (ducked) + SFX → mix.wav (48 kHz stereo)."""
import json, subprocess, numpy as np

SR = 48000
END = 386.6
N = int(END * SR)

def load(path, mono=False, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path]
    if af: cmd += ["-af", af]
    cmd += ["-ac", "1" if mono else "2", "-ar", str(SR), "-f", "f32le", "-"]
    a = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    return a.copy() if mono else a.reshape(-1, 2).copy()

def db(x): return 10 ** (x / 20)
def rms(x): return float(np.sqrt(np.mean(np.square(x)) + 1e-12))

out = np.zeros((N, 2), np.float32)

# ---- voice ----
voice = load("th.mov", mono=True,
             af="highpass=f=75,afftdn=nf=-28:tn=1,equalizer=f=220:t=q:w=1.2:g=-1.5,equalizer=f=3200:t=q:w=1.4:g=2.5,"
                "equalizer=f=7000:t=q:w=2:g=-2,acompressor=threshold=-22dB:ratio=3:attack=6:release=90:makeup=2,alimiter=limit=0.95")
voice = voice[:N]
act = np.abs(voice) > 0.02
voice *= db(-19) / rms(voice[act])          # speech RMS ≈ -19 dBFS
out[:len(voice)] += voice[:, None]

# voice activity envelope for ducking (attack 40 ms, release 450 ms)
hop = 480
vv = np.pad(voice, (0, N - len(voice) + (-N) % hop)); env = np.sqrt(np.square(vv).reshape(-1, hop).mean(1))
on = (20 * np.log10(env + 1e-9) > -42).astype(np.float32)
sm = np.zeros_like(on); a_att, a_rel = 1 - np.exp(-1 / (0.04 * SR / hop)), 1 - np.exp(-1 / (0.45 * SR / hop))
for i in range(1, len(on)):
    k = a_att if on[i] > sm[i - 1] else a_rel
    sm[i] = sm[i - 1] + k * (on[i] - sm[i - 1])
duck = np.repeat(sm, hop)[:N]
duck = np.pad(duck, (0, max(0, N - len(duck))))

# ---- music ----
def place(buf, t0, gain_db=0.0, fade_in=0.0, fade_out=0.0, until=None):
    s = int(t0 * SR); e = min(N, s + len(buf))
    if until is not None: e = min(e, int(until * SR))
    seg = buf[: e - s].copy() * db(gain_db)
    if fade_in: n = int(fade_in * SR); seg[:n] *= np.linspace(0, 1, n)[:, None]
    if fade_out: n = min(len(seg), int(fade_out * SR)); seg[-n:] *= np.linspace(1, 0, n)[:, None]
    return s, seg

A = load("gen/musicA.mp3"); B = load("gen/musicB.mp3"); C = load("gen/musicC.mp3")
for m in (A, B, C): m *= db(-20) / rms(m[int(5 * SR):int(60 * SR)])
# extend C by 26 bars (105.46 BPM) with a short crossfade on the bar line
bar = 4 * 60 / 105.46
L1, S2 = 84.0, 84.0 - 28 * bar
x = int(0.3 * SR)
c1, c2 = C[: int(L1 * SR)], C[int(S2 * SR):]
fade = np.linspace(0, 1, x)[:, None]
Cx = np.concatenate([c1[:-x], c1[-x:] * (1 - fade) + c2[:x] * fade, c2[x:]])

music = np.zeros((N, 2), np.float32)
for buf, t0, g, fi, fo, until in [(A, 0.0, 0, 1.5, 0.35, 130.85), (B, 130.85, 0, 0.0, 2.0, 232.2), (Cx, 230.6, 0, 1.6, 0.0, None)]:
    s, seg = place(buf, t0, g, fi, fo, until)
    music[s:s + len(seg)] += seg
# level automation: bed under voice, lift in pauses and on the end card
t = np.arange(N) / SR
base = np.full(N, -6.0)
base[t > 383.7] = -1.5
k = int(0.8 * SR); cs = np.cumsum(np.pad(base, (k // 2, k - k // 2), mode="edge")); base = (cs[k:] - cs[:-k]) / k
base[: int(0.4 * SR)] = -6.0
gain = db(base) * (1 - (1 - db(-9.5)) * duck)     # −9.5 dB while he speaks
music *= gain[:, None]
end_fade = int(0.7 * SR)
music[-end_fade:] *= np.linspace(1, 0, end_fade)[:, None] ** 1.5
out += music

# ---- sfx ----
cache = {}
for fx in json.load(open("sfx.json")):
    if fx["v"] <= 0: continue
    if fx["n"] not in cache:
        b = load(f"gen/{fx['n']}.mp3")
        b *= db(-3) / (np.abs(b).max() + 1e-9)
        cache[fx["n"]] = b
    s, seg = place(cache[fx["n"]], max(0, fx["t"]), 20 * np.log10(fx["v"] * 0.62))
    out[s:s + len(seg)] += seg

out = np.clip(out, -1, 1)
pcm = (out * 32767).astype(np.int16)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", "mix_raw.wav"],
               input=pcm.tobytes(), check=True)
print("voice rms", 20 * np.log10(rms(voice[act])), "music peak", 20 * np.log10(np.abs(music).max()))
