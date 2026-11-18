"""Single-take edit from detected silences: pauses > 0.55 s shrink to ~0.36 s; frame-aligned."""
import json
SRC = "../newtake/gabriel.mp4"
KEEP_A, KEEP_B = 0.20, 0.16        # keep this much after a pause starts / before speech resumes
DUR = 349.76
sil = [tuple(map(float, l.split())) for l in open("silences.txt") if l.strip()]
cuts = [(s + KEEP_A, e - KEEP_B) for s, e in sil if e - s > 0.55]
first_word = 0.0
keep, cur = [], 0.0
for a, b in cuts:
    if a <= 0.05: cur = b; continue
    keep.append((cur, a)); cur = b
keep.append((cur, DUR))
segs, g = [], 0.0
for tin, tout in keep:
    if tout - tin < 0.2: continue
    tout = tin + round((tout - tin) * 25) / 25
    segs.append(dict(tin=round(tin, 3), tout=round(tout, 3), g=round(g, 4)))
    g += tout - tin
json.dump(dict(src=SRC, segments=segs, duration=round(g, 4)), open("edl.json", "w"), indent=0)
print(len(segs), "segments, duration", round(g, 2), "first", segs[0], "last", segs[-1])
