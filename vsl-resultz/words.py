"""Corrected word list (script spelling) on top of whisper timings + subtitle cues."""
import json, re

W = json.load(open("words_final.json"))

# (whisper token sequence) -> (corrected tokens)
FIX = [
    (["Aufmerksamkeits", "-Paradoxon"], ["Aufmerksamkeits-Paradoxon"]),
    (["5", "-stelligen"], ["fünfstelligen"]),
    (["es", "ist", "teilweise", "nicht", "mal", "merken."], ["man", "es", "teilweise", "nicht", "mal", "merkt."]),
    (["ihren", "Neukrundenproblem"], ["ihr", "Neukundenproblem"]),
    (["hunderttausel"], ["hunderttausend"]),
    (["Telefon", "hat."], ["Telefonat."]),
    (["liebt", "Portale,"], ["Leadportale,"]),
    (["Möbeldiskounter"], ["Möbeldiscounter"]),
    (["Möbeldiskounter."], ["Möbeldiscounter."]),
    (["bitteste?"], ["Bitterste:"]),
    (["Grunde."], ["Kunde."]),
    (["Konkurrenz", "-"], ["Konkurrenz-"]),
    (["Falschen."], ["falschen."]),
    (["100", ".000"], ["100.000"]),
    (["3", "Monaten"], ["drei", "Monaten"]),
    (["Cunchart"], ["Kanschat"]),
    (["Markfahrt", "-Küchen"], ["Marquardt", "Küchen"]),
    (["Cranstow"], ["kennst", "du"]),
    (["2", ",7"], ["2,7"]),
    (["12", "Monaten"], ["zwölf", "Monaten"]),
    (["Ausfahrt."], ["Auswahl."]),
    (["Results"], ["RESULTZ"]),
    (["Triple", "A", "System"], ["Triple-A-System"]),
    (["3", "Bausteine,"], ["Drei", "Bausteine,"]),
    (["Krüchen", "drauf"], ["Küchenkauf"]),
    (["basiert."], ["passiert."]),
    (["KI", "gestützt,"], ["KI-gestützt"]),
    (["Damin"], ["Termin"]),
    (["Damin,"], ["Termin,"]),
    (["Bartzeit,"], ["Wartezeit"]),
    (["Tag,"], ["Tag"]),
    (["Krüchenstudio."], ["Küchenstudio."]),
    (["50", ".000"], ["50.000"]),
    (["Geignet"], ["Geeignet"]),
    (["AAA", "-System"], ["Triple-A-System"]),
    (["ausseht,"], ["aussieht:"]),
    (["bucht", "dir"], ["buch", "dir"]),
    (["Paradoxum"], ["Paradoxon"]),
    (["ein", "Markt."], ["einmal."]),
    (["Wettbewerb."], ["Wettbewerber."]),
    (["eine", "Haken"], ["der", "eine", "Haken"]),
    (["3", "oder", "4"], ["drei", "oder", "vier"]),
]

def apply(words):
    out, i = [], 0
    while i < len(words):
        hit = None
        for src, dst in FIX:
            if [w["w"] for w in words[i:i + len(src)]] == src:
                hit = (src, dst); break
        if not hit:
            out.append(dict(words[i])); i += 1; continue
        src, dst = hit
        s, e = words[i]["s"], words[i + len(src) - 1]["e"]
        n = len(dst)
        for k, t in enumerate(dst):
            out.append(dict(w=t, s=round(s + (e - s) * k / n, 3), e=round(s + (e - s) * (k + 1) / n, 3)))
        i += len(src)
    return out

WORDS = apply(W)

def norm(t):
    return re.sub(r"[^a-zäöüß0-9]", "", t.lower())

NW = [norm(w["w"]) for w in WORDS]

def find(phrase, after=0.0, end=False):
    toks = [norm(t) for t in phrase.split()]
    for i in range(len(NW) - len(toks) + 1):
        if WORDS[i]["s"] < after:
            continue
        if NW[i:i + len(toks)] == toks:
            return WORDS[i + len(toks) - 1]["e"] if end else WORDS[i]["s"]
    raise KeyError(f"phrase not found after {after}: {phrase}")

def cues(max_chars=34):
    """Subtitle cues: break on punctuation, pauses and length (one or two lines)."""
    out, cur = [], []
    def flush():
        if cur:
            out.append(dict(s=cur[0]["s"], e=cur[-1]["e"], words=[dict(w=x["w"], s=x["s"], e=x["e"]) for x in cur]))
            cur.clear()
    for i, w in enumerate(WORDS):
        if cur and (w["s"] - cur[-1]["e"] > 0.45):
            flush()
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        nxt = WORDS[i + 1] if i + 1 < len(WORDS) else None
        longer = nxt and len(text) + 1 + len(nxt["w"]) > 46
        if (w["w"][-1] in ".?!:" and len(text) > 8) or longer \
                or (w["w"][-1] == "," and len(text) > 22) or not nxt:
            flush()
    for i, c in enumerate(out):  # hold each cue until the next starts (max +0.6s)
        nxt = out[i + 1]["s"] if i + 1 < len(out) else c["e"] + 1
        c["e"] = round(min(nxt - 0.02, c["e"] + 0.6), 3)
    return out

if __name__ == "__main__":
    json.dump(dict(words=WORDS, cues=cues()), open("subs.json", "w"), ensure_ascii=False)
    for c in cues()[:12]:
        print(f'{c["s"]:7.2f} {c["e"]:7.2f}  ' + " ".join(w["w"] for w in c["words"]))
    print(len(cues()), "cues")
