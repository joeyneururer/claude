"""Scene script v2 (Gabriel, single take). All times are anchored to spoken phrases via find()."""
import json, os, re
from words import find as F, WORDS, cues

os.makedirs("data", exist_ok=True)
SUBS = dict(words=WORDS, cues=cues())
SPEECH_END = WORDS[-1]["e"]
END = round(SPEECH_END + 2.6, 2)
E = lambda p, a=0.0: F(p, a, end=True)

def W(*ws):
    return [list(w) + [""] * (3 - len(w)) for w in ws]

def ws(phrase, after=0.0, cls=None):
    """words of a spoken phrase, each timed to its own word start: [[text, t, cls]...]"""
    t0 = F(phrase, after); toks = phrase.split()
    i = next(k for k, w in enumerate(WORDS) if w["s"] == t0)
    return [[toks[j], WORDS[i + j]["s"], (cls or {}).get(j, "")] for j in range(len(toks))]

# ---------------- anchors ----------------
a = {}
a["kennst"] = F("kennst du das")
a["weisst"] = F("Und weißt du was")
a["nein"] = F("mit Nein")
a["summe"] = F("eine hohe fünfstellige Summe")
a["merken"] = F("nicht mal merken")
a["minuten"] = F("In den nächsten vier Minuten")
a["warum"] = F("warum Küchenstudios versuchen")
a["anders"] = F("und was Studios anders machen")
a["termine"] = F("viele Termine im Kalender")
a["wenig"] = F("viel zu wenig Aufträge")
a["denkst"] = F("Und wenn du dir gerade denkst")
a["braeuchte"] = F("eigentlich bräuchte ich doch")
a["gefangen"] = F("gefangen")
a["def"] = F("Das Paradoxon lautet")
a["je"] = F("je mehr Anfragen ein Betrieb")
a["klingt"] = F("Klingt erst mal falsch")
a["genau"] = F("Genau deshalb ist es aber")
a["logisch"] = F("Es klingt logisch")
a["trifft"] = F("es trifft kaum eine Branche")
a["ehrlich"] = F("Sind wir doch mal ehrlich")
a["hundert"] = F("mehrere hunderttausend Euro")
a["ausst"] = F("in deiner Ausstellung")
a["verk"] = F("deine Verkäufer sind")
a["profis"] = F("Planungsprofis")
a["stunde"] = F("deren Stunde richtig Geld")
a["zwischen"] = F("und zwischen einer Anfrage")
a["nirgendwo"] = F("Nirgendwo ist also")
a["bares"] = F("verlierst du bares Geld")
a["reflex"] = F("Was macht jetzt also")
a["kauft"] = F("Er kauft Aufmerksamkeit")
a["papier"] = F("auf dem Papier funktioniert")
a["telefon"] = F("das Telefon klingelt")
a["aufschwung"] = F("es fühlt sich nach Aufschwung")
a["aber"] = F("Aber lass mich dir")
a["gefahr"] = F("der gefährlichste Moment")
a["denn"] = F("Denn mehr Aufmerksamkeit macht")
a["mehr1"] = F("Du hast mehr Termine mit Menschen")
a["mehr2"] = F("du hast mehr Termine ohne Budget")
a["mehr3"] = F("und dein Verkäufer investiert")
a["bitter"] = F("Das Bitterste ist")
a["ertrinkst"] = F("Du ertrinkst hier also")
a["zurueck"] = F("Und jetzt einmal zurück")
a["magisch"] = F("auf magische Art")
a["nervt"] = F("nervt es dich")
a["planen"] = F("die planen nicht besser")
a["verstanden"] = F("Die haben nämlich ganz einfach")
a["kanschat"] = F("Bei Küchenplanung Kanschat")
a["clemens"] = F("Bei Küchenplanung Clemens")
a["peaks"] = F("keine kurzfristigen Peaks")
a["marq"] = F("Marquardt Küchen zum Beispiel")
a["hinter"] = F("Hinter diesen Ergebnissen")
a["b1"] = F("Der erste Baustein")
a["b1s"] = E("richtige Anziehung.") + 0.1
a["wir"] = F("Wir bei RESULTZ")
a["b2"] = F("Der zweite Baustein")
a["passt"] = F("In deinen Kalender kommt nur")
a["b3"] = F("Der dritte Baustein")
a["grundsatz"] = F("Und ein Grundsatz")
a["weil"] = F("Weil wir genau wissen")
a["garant"] = F("garantieren wir geeigneten")
a["geeignet"] = F("Geeignet bedeutet")
a["cta"] = F("Wenn du jetzt wissen möchtest")
a["click1"] = F("dann klicke jetzt unterhalb")
a["finden"] = F("Und wir beide finden")
a["haken"] = F("Denn das ist der eine Haken")
a["click2"] = F("Klicke also jetzt unterhalb")

layout = [
    dict(t=0, m="full"),
    dict(t=a["minuten"], m="side"), dict(t=a["denkst"], m="full", d=0.8),
    dict(t=a["def"], m="pip", d=0), dict(t=a["klingt"], m="side", d=0),
    dict(t=a["trifft"], m="full"),
    dict(t=a["ehrlich"], m="pip"), dict(t=a["reflex"], m="full", d=0),
    dict(t=a["kauft"], m="side"), dict(t=a["papier"], m="sideR"),
    dict(t=a["aber"], m="full", d=0),
    dict(t=a["denn"], m="side", d=0.6), dict(t=a["mehr1"], m="pip", d=0),
    dict(t=a["bitter"], m="side", d=0), dict(t=a["ertrinkst"], m="full", d=0),
    dict(t=a["magisch"] - 0.6, m="side"), dict(t=a["nervt"] - 0.4, m="full"),
    dict(t=a["verstanden"], m="sideR"), dict(t=a["kanschat"], m="pip"),
    dict(t=a["hinter"], m="full", d=0), dict(t=a["b1s"], m="side", d=0),
    dict(t=a["passt"], m="full"), dict(t=a["b3"], m="side"),
    dict(t=a["grundsatz"], m="pip"), dict(t=a["weil"], m="full", d=0),
    dict(t=a["garant"], m="pip", d=0), dict(t=a["geeignet"], m="side", d=0),
    dict(t=a["cta"], m="full", d=0),
    dict(t=a["finden"] - 0.3, m="side"), dict(t=a["click2"], m="pip", d=0.6), dict(t=SPEECH_END + 0.2, m="out", d=0.6),
]
punch = [
    dict(t=a["nein"] + 0.5, z=1.45, d=1.4), dict(t=F("so hart"), z=1.5, d=1.4), dict(t=a["gefahr"], z=1.55, d=2.4),
    dict(t=a["nervt"], z=1.45, d=1.6), dict(t=F("Nur wer wirklich passt") if False else E("wer wirklich passt") - 0.6, z=1.4, d=1.4),
]

# camera cuts on sentence starts: wide (1.0) ↔ medium (1.28), at least 4.5 s apart, not on layout moves
starts = [(WORDS[i]["s"], WORDS[i - 1]["w"][-1] in ".?!:") for i in range(1, len(WORDS)) if WORDS[i - 1]["w"][-1] in ".?!:,"]
cams, last, z = [dict(t=0, z=1.0)], 0, 1.0
for t, sent in starts:
    if t - last < (4.0 if sent else 6.5) or any(abs(t - k["t"]) < 0.6 for k in layout[1:]): continue
    z = 1.28 if z == 1.0 else 1.0
    cams.append(dict(t=round(t - 0.04, 3), z=z)); last = t

S = []
add = lambda **k: S.append(k)

# ---------------- HOOK ----------------
add(type="kin", s=a["kennst"], e=a["weisst"] - 0.1, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=320, lines=[
    dict(size=64, style="color:#B8B4AC", w=W(("Kennst", a["kennst"]), ("du", a["kennst"] + 0.3), ("das", a["kennst"] + 0.5))),
    dict(size=160, w=W(("Aufmerksamkeits-", F("Aufmerksamkeits-Paradoxon?")))),
    dict(size=160, w=W(("Paradoxon?", F("Aufmerksamkeits-Paradoxon?") + 0.4, "grad")))])
add(type="pills", dim="r", s=a["nein"], e=a["summe"] - 0.1, items=[dict(t="Die allermeisten: Nein.", at=E("mit Nein") - 0.35, x=1220, y=380, cls="r", size=40, pad="18px 32px")])
add(type="counter", dim="r", s=a["summe"], e=a["minuten"] - 0.05, x=1180, y=250, w=700, at=a["summe"] + 0.2, dur=1.0, scramble=True, final="5-stellig", to=50000,
    size=124, cls="red", label=["kostet sie", a["summe"]], sub=["jeden Monat.", a["summe"] + 0.9], lsize=26)
add(type="hand", dim="r", s=a["merken"] - 0.2, e=a["minuten"] - 0.05, at=a["merken"] - 0.2, dur=0.8, t="…und sie merken es nicht mal", x=1180, y=560, size=54)
add(type="cards", s=a["minuten"], e=a["termine"] - 0.6, x=912, y=330, kicker=["In den nächsten Minuten", a["minuten"] + 0.3, "o"], items=[
    dict(t="Warum die übliche Lösung das Problem erst verursacht", at=a["warum"], size=40),
    dict(t="Was Studios mit vollen Auftragsbüchern anders machen", at=a["anders"], size=40)])
add(type="calbook", s=a["termine"] - 0.5, e=a["denkst"] - 0.05, fillAt=a["termine"], emptyAt=a["wenig"] - 0.3)
add(type="hand", dim="t", s=a["braeuchte"], e=F("dann bleib unbedingt"), at=a["braeuchte"], dur=1.5, t="„Ich bräuchte doch einfach nur mehr Anfragen …“", x=110, y=70, size=54, rot=-3)
add(type="stamp", dim="r", s=a["gefangen"] - 0.05, e=a["def"] - 0.05, at=a["gefangen"], t="Gefangen im Paradoxon", x=1060, y=200, size=52, rot=-7)

# ---------------- DEFINITION ----------------
add(type="chapter", s=a["def"], e=a["klingt"] - 0.05, num="01", kicker="Das Aufmerksamkeits-Paradoxon", cin="circle", cx=960, cy=540, cout="wipe",
    shrinkAt=a["je"] - 0.3, title=W(("Das", a["def"] + 0.05), ("Paradoxon.", a["def"] + 0.4, "grad")), nosubs=True)
_je = ws("je mehr Anfragen", 0, {2: "grad"}); _je[0][0] = "Je"
add(type="kin", s=a["je"], e=a["klingt"] - 0.05, x=96, y=280, size=92, gap=16, nowrap=True, cout="cut", nosubs=True, lines=[
    dict(w=_je),
    dict(w=ws("ein Betrieb einkauft, desto mehr")),
    dict(w=ws("Zeit verschwendet er an Menschen,")),
    dict(w=ws("die niemals kaufen werden.", F("an Menschen, die"), {1: "red", 2: "red"}))])
add(type="chart", s=a["klingt"], e=a["trifft"] - 0.05, x=972, y=330, w=780, h=420, title="Was jeder glaubt", series=[
    dict(pts=[[0, .12], [.25, .3], [.5, .5], [.75, .7], [1, .9]], color="green", at=F("Mehr Aufmerksamkeit,"), dur=2.6, label="das muss doch gut sein?", cls="g", lx=-380, ly=-80, labelAt=F("das muss doch"),
         morph=dict(pts=[[0, .12], [.25, .3], [.5, .34], [.75, .22], [1, .1]], at=a["genau"], dur=1.0, color="red", label="Paradoxon", cls="r", spring=True))])
add(type="pills", s=a["klingt"], e=a["trifft"] - 0.05, items=[
    dict(t="Mehr Aufmerksamkeit", at=F("Mehr Aufmerksamkeit,"), x=972, y=820, size=23),
    dict(t="Mehr Reichweite", at=F("mehr Reichweite,"), x=1268, y=820, size=23),
    dict(t="Mehr Anfragen", at=F("mehr Anfragen, das"), x=1508, y=820, size=23)])
add(type="hand", s=a["logisch"], e=a["trifft"] - 0.05, at=a["logisch"], dur=0.8, t="klingt logisch. ist es nicht.", x=1180, y=230, size=50)
add(type="photo", s=a["ehrlich"], e=a["zwischen"] - 0.05, img="gen/showroom.png", cin="circle", cx=1600, cy=850, cout="cut")
add(type="counter", s=a["hundert"] - 0.2, e=a["zwischen"] - 0.05, cout="cut", x=96, y=260, w=1000, at=a["hundert"], dur=1.3, to=100000, suf=" €", size=150, cls="paper",
    label=["oft mehrere", a["hundert"] - 0.2], sub=["stehen in deiner Ausstellung.", a["ausst"]], lsize=34)
add(type="pills", s=a["profis"], e=a["zwischen"] - 0.05, items=[
    dict(t="Planungsprofis", at=a["profis"], x=110, y=640, size=30, icon="user"),
    dict(t="jede Stunde richtig Geld wert", at=a["stunde"], x=110, y=720, cls="o", size=30, icon="euro", out=a["zwischen"] - 0.05)])
add(type="bars", s=a["zwischen"], e=a["nirgendwo"] - 0.05, cover="stone", cin="cut", cout="wipe", x=96, y=200, w=1240,
    title=W(("Zwischen", a["zwischen"] + 0.3), ("Anfrage", F("einer Anfrage und") + 0.3), ("und", F("und einem Küchenkäufer")), ("Käufer", F("Küchenkäufer"), "grad"), ("liegt:", F("liegt oft"))), rows=[
        dict(label="Planungsgespräch", at=F("ein Planungsgespräch"), color="grad", steps=[dict(at=F("von zwei,"), v=.5, txt="2 Std."), dict(at=F("drei oder sogar"), v=.75, txt="3 Std."), dict(at=F("vier Stunden"), v=1.0, txt="4 Std.")])])
add(type="gap", s=a["nirgendwo"], e=a["reflex"] - 0.05, cin="wipe", cout="cut", openAt=F("der Abstand zwischen"), labelAt=F("größer als"), gapLabel="nirgendwo größer als bei dir",
    title=W(("Der", F("der Abstand zwischen")), ("Abstand", F("Abstand zwischen Anfrage"), "grad"), ("zwischen", F("zwischen Anfrage und Käufer")), ("Anfrage", F("Anfrage und Käufer")), ("und", F("und Käufer größer")), ("Käufer.", F("Käufer größer"))),
    coins=[a["bares"] - 0.6, a["bares"] - 0.2, a["bares"] + 0.2, a["bares"] + 0.45, a["bares"] + 0.7], money=["…und genau dort verlierst du bares Geld.", F("und genau in diesem")])

# ---------------- REFLEX + TWIST ----------------
add(type="cards", s=a["kauft"], e=a["papier"] - 0.05, y=230, title=W(("Er", a["kauft"]), ("kauft", a["kauft"] + 0.3), ("Aufmerksamkeit.", a["kauft"] + 0.6, "grad")), tsize=62, items=[
    dict(t="Anzeigenpaket", at=F("ein Anzeigenpaket"), n="1"), dict(t="Leadportale", at=F("Leadportale"), n="2"), dict(t="Hausmesse mit Rabatten", at=F("eine Hausmesse"), n="3")])
add(type="chart", s=a["papier"], e=a["aber"] - 0.05, cout="cut", x=110, y=330, w=860, h=420, title="Auf dem Papier", series=[
    dict(pts=[[0, .1], [.2, .18], [.45, .4], [.7, .62], [1, .9]], color="green", at=a["papier"] + 0.3, dur=1.8, label="mehr Anfragen kommen rein", cls="g", labelAt=F("mehr Anfragen kommen"), lx=-330, ly=-70)])
add(type="phone", s=a["telefon"], e=a["aber"] - 0.05, cout="cut", at=a["telefon"], x=120, y=100)
add(type="pills", s=a["aufschwung"], e=a["aber"] - 0.05, items=[dict(t="fühlt sich nach Aufschwung an", at=F("Aufschwung"), x=110, y=840, cls="g", size=30, out=a["aber"] - 0.05)])
add(type="kin", s=a["gefahr"], e=a["denn"] - 0.05, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=330, lines=[
    dict(size=72, style="color:#B8B4AC", w=W(("Der", a["gefahr"] + 0.1))),
    dict(size=170, w=W(("gefährlichste", F("gefährlichste"), "grad"))),
    dict(size=170, w=W(("Moment.", F("Moment im ganzen"))))])
add(type="chart", s=a["denn"], e=a["mehr1"] - 0.05, cout="cut", x=972, y=330, w=780, h=420, title="Mehr Aufmerksamkeit …", series=[
    dict(pts=[[0, .1], [.3, .3], [.6, .52], [1, .78]], color="orange", at=a["denn"] + 0.2, dur=1.6, label="Aufmerksamkeit", cls="o", lx=-250, ly=24),
    dict(pts=[[0, .06], [.3, .08], [.6, .1], [1, .12]], color="mute", at=F("macht dein Problem"), dur=1.0, label="Problem", lx=-140, ly=-74,
         morph=dict(pts=[[0, .06], [.3, .2], [.6, .55], [1, .96]], at=F("sie verschlimmert"), dur=0.9, color="red", label="Problem wird schlimmer", cls="r", spring=True))])
add(type="mehr", s=a["mehr1"], e=a["bitter"] - 0.05, cin="cut", cout="circle", cx=1600, cy=850, items=[
    dict(head="Mehr Termine", word="ohne Kaufkraft", at=a["mehr1"], tr="cut", icon="euro"),
    dict(head="Mehr Termine", word="ohne Budget", at=a["mehr2"], tr="up", icon="cal"),
    dict(head="Mehr Stunden", word="mit Menschen, die nie kaufen", at=a["mehr3"], tr="wipe", icon="clock")])
add(type="map", s=a["bitter"], e=a["ertrinkst"] - 0.05, cout="cut", title=["Ein Lead. Vier Studios.", F("ein Portal verkauft")], pins=[
    dict(x=230, y=330, at=a["bitter"] + 0.3, label="dein Studio", s0="mine"),
    dict(x=640, y=280, at=a["bitter"] + 0.5, label="Mitbewerber", s0="grey"),
    dict(x=330, y=640, at=a["bitter"] + 0.7, label="Mitbewerber", s0="grey"),
    dict(x=700, y=620, at=a["bitter"] + 0.9, label="Mitbewerber", s0="grey")],
    fly=[dict(t="Lead", from_=[400, 460], to=0, at=F("einen Lead an")), dict(t="Lead", from_=[400, 460], to=1, at=F("drei oder vier deiner")),
         dict(t="Lead", from_=[400, 460], to=2, at=F("vier deiner Mitbewerber")), dict(t="Lead", from_=[400, 460], to=3, at=F("Mitbewerber gleich"))])
add(type="kin", s=a["ertrinkst"], e=a["zurueck"] - 0.05, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=250, gap=8, lines=[
    dict(size=110, w=ws("Du ertrinkst hier also nicht")),
    dict(size=110, style="color:#B8B4AC", w=ws("an zu wenig Anfragen,")),
    dict(size=110, w=ws("du ertrinkst an den", F("an zu wenig Anfragen,"))),
    dict(size=150, w=[["falschen.", F("falschen Anfragen."), "grad"]])])

# ---------------- PROOF ----------------
add(type="map", s=a["magisch"] - 0.6, e=a["nervt"] - 0.45, title=["Die Kunden laufen wie von selbst zu?", a["magisch"] - 0.3], pins=[
    dict(x=520, y=440, at=a["magisch"] - 0.3, s0="grey", big=True, st=[dict(at=F("zulaufen."), s="green", label="Studio in deiner Region")]),
    dict(x=220, y=300, at=a["magisch"] - 0.1, s0="grey"), dict(x=700, y=700, at=a["magisch"], s0="grey"), dict(x=260, y=660, at=a["magisch"] + 0.1, s0="grey")],
    fly=[dict(t="Anfrage", from_=[60, 120], to=0, at=F("zulaufen.") + 0.2), dict(t="Anfrage", from_=[760, 140], to=0, at=F("Eins davon")), dict(t="Anfrage", from_=[60, 760], to=0, at=F("auch in deiner Region"))])
add(type="hand", dim="r", s=a["nervt"], e=a["planen"] - 0.05, at=a["nervt"], dur=0.7, t="nervt, oder?", x=1290, y=210, size=78,
    arrow=dict(x=1180, y=290, w=120, h=90, d="M110 10 C 80 50, 50 70, 10 80 M10 80 l24 -2 M10 80 l12 -20"))
add(type="pills", dim="r", s=a["planen"], e=a["verstanden"] - 0.05, items=[
    dict(t="planen nicht besser als du", at=a["planen"], x=1250, y=300, size=30, icon="x"),
    dict(t="du hast das bessere Angebot", at=F("sogar das bessere"), x=1250, y=380, size=30, icon="check"),
    dict(t="aber: volle Auftragsbücher", at=F("aber deren Auftragsbücher"), x=1250, y=460, cls="g", size=30)])
add(type="chart", s=a["verstanden"], e=a["kanschat"] - 0.05, x=110, y=330, w=860, h=420, title="Das Paradoxon …", series=[
    dict(pts=[[0, .8], [.3, .62], [.6, .4], [1, .14]], color="red", at=a["verstanden"] + 0.1, dur=1.0, label="umgekehrt", cls="g", labelAt=F("umgekehrt."), lx=-210, ly=-80,
         morph=dict(pts=[[0, .12], [.3, .35], [.6, .6], [1, .9]], at=F("verstanden und"), dur=1.0, color="green", spring=True))])
add(type="cases", s=a["kanschat"], e=a["marq"] - 0.05, cin="wipe", cout="circle", cx=1640, cy=820, kicker=["✓", "Echte Studios"], cards=[
    dict(x=96, y=200, w=780, h=440, at=a["kanschat"], name="Küchenplanung<br>Kanschat", logoH=120, photo="gen/faces/face3.png", photoPos="50% 30%",
         val=dict(at=F("rund 100.000"), to=100000, suf=" €", pre="rund ", dur=1.1), vsize=96, vsub="zusätzlicher Küchenumsatz", vsubAt=F("zusätzlicher Küchenumsatz"),
         chips=[dict(t="in den ersten 3 Monaten", at=F("in den ersten drei"))]),
    dict(x=940, y=200, w=780, h=440, at=a["clemens"], logo="assets/clemens.svg", logoImgH=150, logoH=160, photo="gen/faces/face1.png", photoPos="50% 30%",
         val=dict(at=F("über 130.000"), to=130000, suf=" €", pre="über ", dur=1.1), vsize=96, vsub="zusätzlicher Umsatz", vsubAt=F("über 130.000") + 0.9)])
add(type="pills", s=a["peaks"], e=a["marq"] - 0.05, items=[dict(t="keine kurzfristigen Peaks", at=a["peaks"], x=110, y=690, cls="g", size=30, icon="check")])
add(type="cases", s=a["marq"], e=a["hinter"] - 0.05, cin="circle", cx=1640, cy=820, cout="cut", kicker=["✓", "Echte Studios"], cards=[
    dict(x=96, y=170, w=1300, h=600, at=a["marq"], logo="assets/marquardt.png", logoBg="#000", logoImgH=120, logoH=170, place="", photo="gen/faces/face2.png", photoS=210, photoPos="60% 25%",
         val=dict(at=F("über 2,7 Millionen"), to=2.7, dec=1, pre="über ", suf=" Mio. €", dur=2.0), vsize=168, vsub="zusätzlicher Umsatz", vsubAt=F("an zusätzlichen Umsatz"),
         chips=[dict(t="in den letzten 12 Monaten", at=F("in den letzten zwölf"))])])

# ---------------- TRIPLE-A ----------------
add(type="kin", s=a["wir"], e=a["b1s"] - 0.05, cover="dim", cin="cut", cout="cut", nosubs=True, align="center", y=330, lines=[
    dict(size=34, style="color:#B8B4AC;font-weight:600;letter-spacing:.14em", w=W(("DAS", a["wir"] + 0.15), ("SYSTEM", a["wir"] + 0.3))),
    dict(size=170, w=W(("Triple-A-System", F("Triple-A-System."), "grad"))),
    dict(size=44, style="color:#B8B4AC;font-weight:700;margin-top:22px", w=W(("Anziehung", a["b1"] + 0.2), ("·", a["b1"] + 0.3), ("Auswahl", a["b1"] + 0.4), ("·", a["b1"] + 0.5), ("Abschlussweg", a["b1"] + 0.6)))])
NAMES = [["ANZIEHUNG", "Die Botschaft filtert vor dem ersten Klick."], ["AUSWAHL", "Jede Anfrage geprüft, bevor sie in deinen Kalender kommt."], ["ABSCHLUSSWEG", "Vom Klick zum Termin in wenigen Tagen."]]
add(type="triple", s=a["b1s"], e=a["passt"] - 0.05, cout="cut", y=140, names=NAMES,
    active=[dict(i=0, at=a["b1s"] + 0.2), dict(i=1, at=a["b2"])],
    extras={0: [dict(k="chip", t="nicht: bloße „Kücheninteressenten“", at=F("bloße Kücheninteressenten"), cls="r", strike=F("sondern ganz konkret")),
                dict(k="chip", t="sondern: unmittelbar vor dem Küchenkauf", at=F("unmittelbar vor"), cls="g", icon="check"),
                dict(k="chip", t="filtert vor dem ersten Klick", at=F("bevor der erste Klick"), cls="o")],
            1: [dict(k="chip", t="KI-gestützt kontaktiert", at=F("KI-gestützt"), icon="bot", cls=""),
                dict(k="chip", t="von Küchenexperten angerufen und qualifiziert", at=F("angerufen und"), icon="phone", cls=""),
                dict(k="br", at=F("denn bevor eine")), dict(k="chip", t="Budget", at=F("Budget, Zeitplan"), cls="g", icon="check"),
                dict(k="chip", t="Zeitplan", at=F("Zeitplan und konkretes"), cls="g", icon="check"),
                dict(k="chip", t="konkretes Vorhaben", at=F("konkretes Vorhaben"), cls="g", icon="check")]})
add(type="hand", s=F("den fast alle"), e=F("Jede Anfrage wird"), at=F("den fast alle"), dur=0.8, t="den überspringen fast alle", x=1310, y=60, size=52)
add(type="pills", dim="r", s=a["passt"], e=a["b3"] - 0.05, items=[dict(t="Nur wer wirklich passt.", at=F("wer wirklich passt"), x=1180, y=320, cls="g", size=40, pad="18px 32px", icon="check")])
add(type="triple", s=a["b3"], e=a["grundsatz"] - 0.05, cout="wipe", y=140, done=[0, 1], active=[dict(i=2, at=a["b3"] + 0.3)], names=NAMES,
    extras={2: [dict(k="swap", a="Wochen", b="Tage", at=F("mehrere Wochen"), at2=F("wenige Tage.")),
                dict(k="chip", t="Wer zuerst ernst nimmt, gewinnt.", at=F("zuerst ernst genommen"), cls="g", icon="check")]})
add(type="map", s=a["grundsatz"], e=a["weil"] - 0.05, cover="stone", cin="circle", cx=960, cy=540, cout="cut", x=980, y=150, w=844, h=780,
    title=["Ein Studio pro Region.", F("wir arbeiten pro Region")], circle=dict(x=380, y=370, r=220, at=F("mit genau einem"), label="dein Gebiet · exklusiv"),
    pins=[dict(x=380, y=370, at=F("arbeiten pro Region"), label="dein Studio", s0="mine", big=True),
          dict(x=700, y=250, at=F("einzigen Studio.") - 0.3, s0="grey"), dict(x=640, y=560, at=F("einzigen Studio.") - 0.15, s0="grey"),
          dict(x=150, y=640, at=F("einzigen Studio."), s0="grey"), dict(x=110, y=200, at=F("einzigen Studio.") + 0.15, s0="grey")])
add(type="kin", s=a["grundsatz"], e=a["weil"] - 0.05, cout="cut", x=96, y=300, w=840, size=86, lines=[
    dict(size=34, style="color:#B8B4AC;font-weight:600;letter-spacing:.06em", w=W(("EIN", a["grundsatz"] + 0.1), ("GRUNDSATZ", a["grundsatz"] + 0.25))),
    dict(w=W(("Deine", F("Deine Anfrage gehört")), ("Anfrage", F("Anfrage gehört also")))), dict(w=W(("gehört", F("gehört also immer")), ("dir.", F("also immer exklusiv")))),
    dict(w=W(("Exklusiv.", F("exklusiv deinem"), "grad")))])

# ---------------- GARANTIE ----------------
add(type="counter", s=a["garant"], e=a["geeignet"] - 0.05, cover="stone", cin="circle", cx=960, cy=540, cout="wipe", x=96, y=240, w=1700, at=F("von 50.000"), dur=1.4, to=50000,
    suf=" €", size=300, cls="green", label=["Unsere Garantie", a["garant"] + 0.3], sub=["zusätzlicher Umsatz in den ersten 90 Tagen.", F("in den ersten 90")], lsize=34, ssize=52)
add(type="stamp", s=F("90 Tagen.") + 0.2, e=a["geeignet"] - 0.05, at=F("90 Tagen.") + 0.2, t="schriftlich garantiert*", x=560, y=650, size=50, color="#5BBF6A", rot=-6)
add(type="pills", s=F("90 Tagen."), e=a["geeignet"] - 0.05, items=[dict(t="* für geeignete Küchenstudios", at=F("90 Tagen.") + 0.3, x=110, y=880, size=22)])
add(type="cards", s=a["geeignet"], e=a["cta"] - 0.05, y=200, title=W(("Geeignet", a["geeignet"]), ("heißt:", a["geeignet"] + 0.7, "grad")), tsize=64, items=[
    dict(t="Funktionierender Verkaufsprozess", at=F("erstens,"), icon="check"),
    dict(t="Bereit, eng und konsequent mit uns zu arbeiten", at=F("Zweitens,"), icon="check", size=32),
    dict(t="Interessenten gewissenhaft bearbeiten", at=F("drittens,"), icon="check")])
add(type="pills", s=F("Dass du ein funktionierendes"), e=a["cta"] - 0.05, items=[dict(t="vorausgesetzt: funktionierendes Angebot · freie Kapazitäten", at=F("Dass du ein funktionierendes") + 0.2, x=912, y=850, size=24)])

# ---------------- CTA ----------------
add(type="pills", dim="r", s=a["click1"], e=a["finden"] - 0.35, items=[dict(t="Button unter dem Video", at=F("klicke jetzt unterhalb"), x=1300, y=760, cls="o", size=36, pad="20px 34px", icon="arrowDown")])
add(type="map", s=a["finden"] - 0.3, e=a["click2"] - 0.05, title=["Ist deine Region noch frei?", a["finden"]], circle=dict(x=440, y=470, r=230, at=F("nur einmal."), label="pro Region nur einmal"),
    pins=[dict(x=440, y=470, at=a["finden"] + 0.3, label="deine Region?", s0="orange", big=True, st=[dict(at=F("vergeben ist,"), s="red", label="vergeben")]),
          dict(x=560, y=560, at=F("mit deinem Mitbewerber."), s0="red", label="dein Mitbewerber")])
add(type="end", s=a["click2"], e=END, cin="wipe", cout="cut", nosubs=True,
    title=W(("Jetzt", a["click2"] + 0.1), ("prüfen,", a["click2"] + 0.25), ("ob", F("Prüf, ob", a["click2"])), ("dein", F("deine Region frei", a["click2"])), ("Gebiet", F("Region frei ist.", a["click2"])), ("frei", F("frei ist.", a["click2"]), "grad"), ("ist.", F("frei ist.", a["click2"]) + 0.15, "grad")),
    btnAt=a["click2"] + 0.3, clickAt=F("auf den Button.", a["click2"]) + 0.3, slotAt=F("Prüf, ob", a["click2"]) + 0.2, pickAt=F("frei ist.", a["click2"]), handAt=F("Der Rest ist"))

for sc in S:
    for f in sc.get("fly", []): f["from"] = f.pop("from_")
    if "cout" not in sc and any(k["m"] == "full" and k.get("d", 0.7) == 0 and abs(k["t"] - sc["e"]) < 0.12 for k in layout):
        sc["cout"] = "cut"

# ---------------- background screen (live display) ----------------
screen = [
    dict(t=0, logo=56, lines=[["Planbar", "", 44], ["neue", "", 44], ["Kunden.", "grad", 44]]),
    dict(t=a["minuten"], kicker=["4", "Minuten"], lines=[["Ein", "", 46], ["Denkfehler.", "red", 46]]),
    dict(t=a["klingt"], kicker=["01", "Paradoxon"], lines=[["Mehr", "", 44], ["Anfragen.", "", 44], ["Weniger", "", 44], ["Käufer.", "red", 44]]),
    dict(t=a["reflex"] - 0.7, kicker=["02", "Reflex"], lines=[["Mehr", "", 46], ["Werbung,", "", 46], ["mehr", "", 46], ["Portale.", "grad", 46]]),
    dict(t=a["denn"], kicker=["!", "Twist"], lines=[["Du", "", 44], ["ertrinkst", "", 44], ["an den", "", 44], ["falschen.", "red", 48]]),
    dict(t=a["zurueck"], kicker=["✓", "Studios"], lines=[["Volle", "", 46], ["Auftrags-", "", 46], ["bücher.", "green", 46]]),
    dict(t=a["marq"], kicker=["✓", "Studios"], lines=[["2,7 Mio. €", "green", 48], ["in 12", "", 36], ["Monaten.", "", 36]]),
    dict(t=a["hinter"], kicker=["03", "Triple-A"], lines=[["Anziehung.", "", 40], ["Auswahl.", "mute", 40], ["Abschluss-", "mute", 40], ["weg.", "mute", 40]]),
    dict(t=a["b2"], kicker=["03", "Triple-A"], lines=[["Anziehung.", "mute", 40], ["Auswahl.", "", 40], ["Abschluss-", "mute", 40], ["weg.", "mute", 40]]),
    dict(t=a["b3"], kicker=["03", "Triple-A"], lines=[["Anziehung.", "mute", 40], ["Auswahl.", "mute", 40], ["Abschluss-", "", 40], ["weg.", "", 40]]),
    dict(t=a["grundsatz"], kicker=["1×", "Region"], lines=[["Ein", "", 48], ["Studio.", "", 48], ["Exklusiv.", "grad", 48]]),
    dict(t=a["weil"] - 0.7, kicker=["✓", "Garantie"], lines=[["50.000 €", "green", 50], ["in 90", "", 38], ["Tagen.*", "", 38]]),
    dict(t=a["cta"] - 0.7, logo=64, lines=[]),
]
occl = json.load(open("gen/occl.json"))
timeline = dict(layout=layout, punch=punch, cams=cams, scenes=S, screen=screen, occl=occl, end=END, srcOffset=0)
open("data/timeline.js", "w").write("window.TL=" + json.dumps(timeline, ensure_ascii=False) + ";")
open("data/edl.js", "w").write("window.EDL=" + json.dumps(dict(frames=len(os.listdir("th")))) + ";")
open("data/subs.js", "w").write("window.SUBS=" + json.dumps(SUBS, ensure_ascii=False) + ";")
json.dump(dict(gefahr=a["gefahr"], hinter=a["hinter"], end=END, speech_end=SPEECH_END), open("marks.json", "w"))

# ---------------- SFX ----------------
sfx = []
def fx(t, name, vol=0.5): sfx.append(dict(t=round(t, 3), n=name, v=vol))
for i, k in enumerate(layout[1:]):
    if k.get("d", 0.7) > 0: fx(k["t"] - 0.05, "whoosh" + str(1 + i % 2), 0.28)
for sc in S:
    ty = sc["type"]
    if sc.get("cin") in ("wipe", "circle", "up"): fx(sc["s"] - 0.08, "whoosh" + str(1 + int(sc["s"]) % 2), 0.4)
    if sc.get("cin") == "cut" and sc.get("cover"): fx(sc["s"], "impact", 0.32)
    if ty == "cards":
        for it in sc["items"]:
            fx(it["at"], "card" + str(1 + int(it["at"] * 10) % 2), 0.4)
            if it.get("icon") == "check": fx(it["at"] + 0.25, "tick1", 0.45)
    if ty == "counter": fx(sc["at"], "counter", 0.4)
    if ty == "stamp": fx(sc["at"], "stamp", 0.6)
    if ty == "hand": fx(sc["at"], "marker", 0.33)
    if ty == "phone": fx(sc["at"], "phone", 0.38)
    if ty == "pills":
        for it in sc["items"]: fx(it["at"], "tick2", 0.3)
    if ty == "mehr":
        for it in sc["items"]: fx(it["at"], "impact" if it["tr"] == "cut" else "whoosh1", 0.35)
    if ty == "map":
        for p in sc["pins"]: fx(p["at"], "pop", 0.22)
        for f in sc.get("fly", []): fx(f["at"], "whoosh2", 0.2)
        if sc.get("circle"): fx(sc["circle"]["at"], "riser", 0.25)
        for p in sc["pins"]:
            for s_ in p.get("st", []): fx(s_["at"], "error" if s_["s"] == "red" else "tick1", 0.35)
    if ty == "chart":
        for se in sc["series"]:
            if se.get("morph"): fx(se["morph"]["at"], "error" if se["morph"].get("color") == "red" else "tick1", 0.4)
    if ty == "cases":
        for c in sc["cards"]:
            fx(c["at"], "card1", 0.45)
            if c.get("val"): fx(c["val"]["at"], "counter", 0.42)
            for ch in c.get("chips", []): fx(ch["at"], "tick2", 0.3)
    if ty == "triple":
        for a_ in sc.get("active", []): fx(a_["at"], "tick1", 0.45)
        for lst in sc["extras"].values():
            for x in lst:
                if x["k"] == "chip": fx(x["at"], "tick2", 0.3)
                if x["k"] == "swap": fx(x["at2"], "error", 0.25)
    if ty == "gap":
        for c in sc["coins"][:3]: sfx.append(dict(t=round(c, 3), n="counter", v=0.15, cut=0.32))
    if ty == "bars":
        for r in sc["rows"]:
            for s_ in r["steps"]: fx(s_["at"], "tick2", 0.3)
    if ty == "end":
        fx(sc["clickAt"], "click", 0.6); fx(sc["pickAt"], "click", 0.45); fx(sc["btnAt"], "pop", 0.3)
fx(a["nein"] + 0.5, "error", 0.3)
fx(a["gefahr"], "impact", 0.6); fx(a["gefahr"] - 1.9, "riser", 0.35)
for st in screen[1:]: fx(st["t"], "tick2", 0.12)
sfx.sort(key=lambda x: x["t"])
json.dump(sfx, open("sfx.json", "w"), indent=0)
print(len(S), "scenes,", len(sfx), "sfx,", len(cams), "camera cuts, END", END)
