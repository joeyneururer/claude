"""Corrected word list (script spelling) for Gabriel's take + subtitle cues + phrase anchors."""
import json, re

MED = json.load(open("words_med.json"))
FAST = json.load(open("../newtake/words_new.json"))
# medium model dropped "Ausstellung stehen, deine Verkäufer" — splice the fast model's words in
GAP = (77.3, 79.5)
W = [w for w in MED if not (GAP[0] <= w["s"] < GAP[1])] + [w for w in FAST if GAP[0] <= w["s"] < GAP[1]]
W.sort(key=lambda w: w["s"])

FIX = [
    (["Aufmerksamkeits", "-Paradoxon?"], ["Aufmerksamkeits-Paradoxon?"]),
    (["Aufmerksamkeits", "-Paradoxon"], ["Aufmerksamkeits-Paradoxon"]),
    (["Allermeisten"], ["allermeisten"]), (["NEIN,"], ["Nein,"]),
    (["5", "-stellige"], ["fünfstellige"]), (["4", "Minuten"], ["vier", "Minuten"]),
    (["neue", "Kundenproblem"], ["Neukundenproblem"]),
    (["Lead", "-Portale,"], ["Leadportale,"]),
    (["Döbel", "-Discount", "da"], ["Möbeldiscounter"]),
    (["bitterste"], ["Bitterste"]), (["erdrinkst"], ["ertrinkst"]),
    (["Krüchenplanung"], ["Küchenplanung"]), (["Crunchart"], ["Kanschat"]),
    (["100", ".000"], ["100.000"]), (["130", ".000"], ["130.000"]), (["50", ".000"], ["50.000"]),
    (["Krüchenumsatz"], ["Küchenumsatz"]), (["Krüchen"], ["Küchen"]), (["Krüchenkauf"], ["Küchenkauf"]),
    (["2", ",7"], ["2,7"]), (["Results"], ["RESULTZ"]),
    (["Triple", "-A", "-System."], ["Triple-A-System."]), (["AAA", "-System"], ["Triple-A-System"]),
    (["übers", "UBI"], ["über", "so", "gut", "wie"]),
    (["KI", "-gestützt"], ["KI-gestützt"]),
    (["interessanten", "Gewissenhaft."], ["Interessenten", "gewissenhaft."]),
    (["Unternehmer."], ["Unternehmern."]), (["erstmal"], ["erst", "mal"]),
]

def apply(words):
    out, i = [], 0
    while i < len(words):
        hit = next(((s, d) for s, d in FIX if [w["w"] for w in words[i:i + len(s)]] == s), None)
        if not hit:
            out.append(dict(w=words[i]["w"], s=words[i]["s"], e=words[i]["e"])); i += 1; continue
        src, dst = hit
        s, e = words[i]["s"], words[i + len(src) - 1]["e"]
        for k, t in enumerate(dst):
            out.append(dict(w=t, s=round(s + (e - s) * k / len(dst), 3), e=round(s + (e - s) * (k + 1) / len(dst), 3)))
        i += len(src)
    return out

WORDS = apply(W)
norm = lambda t: re.sub(r"[^a-zäöüß0-9]", "", t.lower())
NW = [norm(w["w"]) for w in WORDS]

def find(phrase, after=0.0, end=False):
    toks = [norm(t) for t in phrase.split()]
    for i in range(len(NW) - len(toks) + 1):
        if WORDS[i]["s"] >= after and NW[i:i + len(toks)] == toks:
            return WORDS[i + len(toks) - 1]["e"] if end else WORDS[i]["s"]
    raise KeyError(f"phrase not found after {after}: {phrase}")

def cues():
    out, cur = [], []
    def flush():
        if cur:
            out.append(dict(s=cur[0]["s"], e=cur[-1]["e"], words=[dict(x) for x in cur])); cur.clear()
    for i, w in enumerate(WORDS):
        if cur and w["s"] - cur[-1]["e"] > 0.45: flush()
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        nxt = WORDS[i + 1] if i + 1 < len(WORDS) else None
        longer = nxt and len(text) + 1 + len(nxt["w"]) > 46
        if (w["w"][-1] in ".?!:" and len(text) > 8) or longer or (w["w"][-1] == "," and len(text) > 22) or not nxt:
            flush()
    for i, c in enumerate(out):
        nxt = out[i + 1]["s"] if i + 1 < len(out) else c["e"] + 1
        c["e"] = round(min(nxt - 0.02, c["e"] + 0.6), 3)
    return out

if __name__ == "__main__":
    json.dump(dict(words=WORDS, cues=cues()), open("subs.json", "w"), ensure_ascii=False)
    print(len(WORDS), "words", len(cues()), "cues")
    print(" ".join(w["w"] for w in WORDS)[:1500])
