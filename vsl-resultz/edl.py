"""Build the talking-head edit: trim heads/tails, tighten long pauses, emit
segments + global word timeline."""
import json, subprocess, os

U = "/root/.claude/uploads/f2dd73af-605b-5d67-a545-c5d4471333e6/"
CLIPS = [
    ("1._Hook_Take_3.wav", "cd7a66ab-1._Hook_Take_3.mp4", "hook"),
    ("2._Definition_Hook_3.wav", "7b733a24-2._Definition_Hook_3.mp4", "def"),
    ("3._Reflex__Twist_Take_3.wav", "48ebcea7-3._Reflex__Twist_Take_3.mp4", "reflex"),
    ("4._Proof_Take_3.wav", "60c1463a-4._Proof_Take_3.mp4", "proof"),
    ("5._Triple-A_Take_1.wav", "15807f7a-5._Triple-A_Take_1.mp4", "triple"),
    ("6._Garanrie_Take_2.wav", "8455c811-6._Garanrie_Take_2.mp4", "garantie"),
    ("7._CTA_Take_3.wav", "6c358d56-7._CTA_Take_3.mp4", "cta"),
]
GAP_MAX = 0.62    # pauses longer than this get tightened
GAP_KEEP = 0.34   # ...down to this
HEAD, TAIL = 0.18, 0.30
BETWEEN = 0.30    # breath between chapters

T = json.load(open("transcripts.json"))
segments, words, chapters = [], [], []
g = 0.0
for key, mp4, name in CLIPS:
    w = T[key]["words"]
    # split clip at long gaps
    runs, start = [], 0
    for i in range(len(w) - 1):
        if w[i + 1]["s"] - w[i]["e"] > GAP_MAX:
            runs.append((start, i)); start = i + 1
    runs.append((start, len(w) - 1))
    ch_start = g
    for ri, (a, b) in enumerate(runs):
        tin = max(0, w[a]["s"] - (HEAD if ri == 0 else GAP_KEEP / 2))
        tout = w[b]["e"] + (TAIL if ri == len(runs) - 1 else GAP_KEEP / 2)
        tout = tin + round((tout - tin) * 25) / 25
        segments.append(dict(file=U + mp4, clip=name, tin=round(tin, 3), tout=round(tout, 3), g=round(g, 4)))
        for x in w[a:b + 1]:
            words.append(dict(w=x["w"].strip(), s=round(g + x["s"] - tin, 3), e=round(g + x["e"] - tin, 3), clip=name, seg=len(segments) - 1))
        g += tout - tin
    chapters.append(dict(name=name, s=round(ch_start, 3), e=round(g, 4)))
    g += 0.32
    segments[-1]["tout"] = round(segments[-1]["tout"] + 0.32, 3)

json.dump(dict(segments=segments, words=words, chapters=chapters, duration=round(g, 4)),
          open("edl.json", "w"), ensure_ascii=False, indent=1)
print("segments", len(segments), "duration", round(g, 2))
for c in chapters:
    print(f"{c['name']:9s} {c['s']:7.2f} {c['e']:7.2f}")
