"""Scene script for the RESULTZ VSL. Times are seconds on the edited talking-head timeline
(anchored to word starts, see words_timed.txt). Writes data/*.js and sfx.json."""
import json, os

os.makedirs("data", exist_ok=True)
E = json.load(open("edl.json"))
SUBS = json.load(open("subs.json"))
END = 386.6

def W(*ws):
    """words helper: W(('Mehr', 67.1), ('Umsatz', 68.9, 'green'))"""
    return [list(w) + [""] * (3 - len(w)) for w in ws]

layout = [
    dict(t=0, m="full"),
    dict(t=22.9, m="side"), dict(t=44.4, m="full", d=0.8),
    dict(t=55.7, m="pip", d=0), dict(t=65.7, m="side", d=0),
    dict(t=76.1, m="full"),
    dict(t=79.2, m="pip"), dict(t=112.45, m="full", d=0),
    dict(t=116.5, m="side"), dict(t=122.4, m="full"),
    dict(t=123.6, m="sideR"), dict(t=129.7, m="full", d=0),
    dict(t=133.6, m="side", d=0.6), dict(t=139.5, m="pip", d=0),
    dict(t=155.35, m="full", d=0), dict(t=156.5, m="side"),
    dict(t=163.9, m="pip", d=0), dict(t=166.5, m="sideR", d=0),
    dict(t=174.15, m="full", d=0),
    dict(t=184.2, m="side"), dict(t=190.5, m="full"),
    dict(t=200.5, m="sideR"), dict(t=205.0, m="pip"),
    dict(t=231.6, m="full", d=0),
    dict(t=235.3, m="pip", d=0), dict(t=247.0, m="side", d=0),
    dict(t=282.9, m="full"), dict(t=287.4, m="side"),
    dict(t=303.5, m="pip"), dict(t=315.3, m="full", d=0),
    dict(t=324.0, m="pip", d=0), dict(t=332.0, m="side", d=0),
    dict(t=352.1, m="full", d=0),
    dict(t=360.9, m="side"), dict(t=378.0, m="pip", d=0.6), dict(t=383.8, m="out", d=0.6),
]
punch = [
    dict(t=16.6, z=1.2, d=1.4), dict(t=77.8, z=1.2, d=1.4), dict(t=130.9, z=1.24, d=2.6),
    dict(t=174.2, z=1.16, d=4.2), dict(t=194.2, z=1.18, d=1.4), dict(t=325.3, z=1.15, d=2.0),
]

S = []
add = lambda **k: S.append(k)

# ---------------- HOOK ----------------
add(type="kin", s=9.8, e=11.95, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=320, lines=[
    dict(size=64, style="color:#B8B4AC", w=W(("Kennst", 9.0 + 0.8), ("du", 9.86), ("das", 9.92))),
    dict(size=160, w=W(("Aufmerksamkeits-", 10.0))),
    dict(size=160, w=W(("Paradoxon?", 10.35, "grad")))])
add(type="pills", dim="r", s=16.6, e=18.9, items=[dict(t="Die meisten: Nein.", at=16.6, x=1240, y=380, cls="r", size=40, pad="18px 32px")])
add(type="counter", dim="r", s=19.3, e=22.85, x=1180, y=250, w=700, at=19.3, dur=1.0, scramble=True, final="5-stellig", pre="", to=50000,
    size=124, cls="red", label=["kostet dich", 19.3], sub=["jeden Monat.", 18.3 + 1.9], lsize=26)
add(type="hand", dim="r", s=21.4, e=22.85, at=21.4, dur=0.9, t="…und du merkst es nicht mal", x=1180, y=560, size=56)
add(type="cards", s=22.9, e=37.3, x=912, y=330, kicker=["In den nächsten Minuten", 23.3, "o"], title=None, items=[
    dict(t="Warum die übliche Lösung das Problem erst verursacht", at=25.5, size=40),
    dict(t="Was Studios mit vollen Auftragsbüchern anders machen", at=33.3, size=40)])
add(type="calbook", s=37.4, e=44.35, fillAt=39.3, emptyAt=42.4)
add(type="hand", dim="t", s=46.9, e=49.8, at=46.9, dur=1.6, t="„Ich bräuchte doch nur mehr Anfragen …“", x=110, y=150, size=76, rot=-3)
add(type="stamp", dim="r", s=52.9, e=55.4, at=52.9, t="Gefangen im Paradoxon", x=1060, y=200, size=52, rot=-7)

# ---------------- DEFINITION ----------------
add(type="chapter", s=55.7, e=65.6, num="01", kicker="Das Aufmerksamkeits-Paradoxon", cin="circle", cx=960, cy=540, cout="wipe",
    shrinkAt=57.6, title=W(("Das", 55.9), ("Paradoxon.", 56.5, "grad")), nosubs=True)
add(type="kin", s=57.9, e=65.6, x=96, y=290, size=112, gap=14, cout="cut", nosubs=True, lines=[
    dict(w=W(("Je", 57.9), ("mehr", 58.1), ("Aufmerksamkeit", 58.4, "grad"))),
    dict(w=W(("ein", 59.2), ("Betrieb", 59.6), ("einkauft,", 60.0))),
    dict(w=W(("desto", 60.9), ("mehr", 61.2), ("Zeit", 61.5), ("verliert", 61.9), ("er", 62.6))),
    dict(w=W(("an", 62.7), ("Menschen,", 62.9), ("die", 63.7), ("niemals", 63.9, "red"), ("kaufen", 64.7, "red"), ("werden.", 65.0)))])
add(type="chart", s=65.7, e=76.0, x=972, y=330, w=780, h=420, title="Was jeder glaubt", series=[
    dict(pts=[[0, .12], [.25, .3], [.5, .5], [.75, .7], [1, .9]], color="green", at=67.1, dur=2.4, label="Mehr Reichweite = mehr Umsatz?", cls="g", lx=-430, ly=-80, labelAt=68.9,
         morph=dict(pts=[[0, .12], [.25, .3], [.5, .34], [.75, .22], [1, .1]], at=70.4, dur=1.0, color="red", label="Paradoxon", cls="r", spring=True))])
add(type="pills", s=67.1, e=76.0, items=[
    dict(t="Mehr Reichweite", at=67.1, x=972, y=820, cls="", size=24),
    dict(t="Mehr Anfragen", at=68.1, x=1232, y=820, cls="", size=24),
    dict(t="Mehr Umsatz?", at=68.9, x=1466, y=820, cls="g", size=24)])
add(type="hand", s=71.6, e=76.0, at=71.6, dur=0.8, t="klingt logisch. ist es nicht.", x=1180, y=230, size=50)
add(type="photo", s=79.2, e=88.2, img="gen/showroom.png", cin="circle", cx=1600, cy=850, cout="cut")
add(type="counter", s=79.9, e=88.2, cout="cut", x=96, y=260, w=1000, at=80.1, dur=1.3, to=100000, suf=" €", pre="", size=150, cls="paper",
    label=["mehrere", 80.0], sub=["stehen in deiner Ausstellung.", 81.2], lsize=34)
add(type="cutout", s=83.1, e=88.2, cout="cut", src="gen/kitchen_cut.png", x=640, y=380, w=1000, at=83.0)
add(type="pills", s=84.5, e=88.2, items=[
    dict(t="Planungsprofis", at=84.5, x=110, y=640, cls="", size=30, icon="user"),
    dict(t="jede Stunde richtig Geld wert", at=85.6, x=110, y=720, cls="o", size=30, icon="euro", out=88.2)])
add(type="bars", s=88.3, e=99.9, cover="stone", cin="cut", cout="wipe", x=96, y=200, w=1240,
    title=W(("Zwischen", 88.5), ("Anfrage", 89.1), ("und", 89.6), ("Käufer", 90.7, "grad"), ("liegt:", 91.6)), rows=[
        dict(label="Planungsgespräch", at=92.7, color="grad", steps=[dict(at=94.1, v=.5, txt="2 Std."), dict(at=95.0, v=.75, txt="3 Std."), dict(at=96.2, v=1.0, txt="4 Std.")]),
        dict(label="Telefonat", at=98.3, color="red", steps=[dict(at=98.7, v=.012, txt="2 Min.")])])
add(type="gap", s=100.0, e=112.4, cin="wipe", cout="cut", openAt=101.4, labelAt=104.9, gapLabel="nirgendwo größer als bei dir",
    title=W(("Der", 100.9), ("Abstand", 101.4, "grad"), ("zwischen", 102.1), ("Anfrage", 102.8), ("und", 103.4), ("Käufer.", 104.2)),
    coins=[108.6, 109.4, 110.3, 110.9, 111.1], money=["…kostet dich jeden Monat sehr viel Geld.", 108.6])

# ---------------- REFLEX + TWIST ----------------
add(type="cards", s=116.5, e=122.3, y=230, title=W(("Er", 116.5), ("kauft", 116.6), ("Aufmerksamkeit.", 116.8, "grad")), tsize=62, items=[
    dict(t="Leadportale", at=117.8, n="1"), dict(t="Anzeigenpaket", at=118.9, n="2"), dict(t="Hausmesse mit Rabatt", at=120.2, n="3")])
add(type="chart", s=123.6, e=129.6, cout="cut", x=110, y=330, w=860, h=420, title="Auf dem Papier", series=[
    dict(pts=[[0, .1], [.2, .18], [.45, .4], [.7, .62], [1, .9]], color="green", at=123.9, dur=1.8, label="Anfragen", cls="g", labelAt=125.0, lx=-150, ly=-70)])
add(type="phone", s=126.2, e=129.6, cout="cut", at=126.2, x=120, y=100)
add(type="pills", s=128.0, e=129.6, items=[dict(t="fühlt sich nach Aufschwung an", at=128.0, x=110, y=840, cls="g", size=30, out=129.6)])
add(type="kin", s=130.9, e=133.5, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=330, lines=[
    dict(size=72, style="color:#B8B4AC", w=W(("Der", 130.7))),
    dict(size=170, w=W(("gefährlichste", 130.9, "grad"))),
    dict(size=170, w=W(("Moment.", 131.6)))])
add(type="chart", s=133.6, e=139.4, cout="cut", x=972, y=330, w=780, h=420, title="Mehr Aufmerksamkeit …", series=[
    dict(pts=[[0, .1], [.3, .3], [.6, .52], [1, .78]], color="orange", at=133.9, dur=1.6, label="Aufmerksamkeit", cls="o", lx=-250, ly=24),
    dict(pts=[[0, .06], [.3, .08], [.6, .1], [1, .12]], color="mute", at=135.3, dur=1.2, label="Problem", cls="", lx=-140, ly=-74,
         morph=dict(pts=[[0, .06], [.3, .2], [.6, .55], [1, .96]], at=137.8, dur=0.9, color="red", label="Problem wird schlimmer", cls="r", spring=True))])
add(type="mehr", s=139.5, e=152.3, cin="cut", cout="circle", cx=1600, cy=850, items=[
    dict(word="Preisvergleicher", at=139.5, tr="cut", icon="euro", sub=[dict(t="greifen deine Planung gratis ab", at=141.0), dict(t="kaufen beim Möbeldiscounter", at=143.0)]),
    dict(word="Termine", at=144.6, tr="up", icon="cal", sub=[dict(t="ohne Budget", at=145.6), dict(t="ohne Zeitplan", at=147.1)]),
    dict(word="Stunden", at=148.3, tr="wipe", icon="clock", sub=[dict(t="dein bester Verkäufer plant und rechnet", at=149.4)])])
add(type="contract", s=152.4, e=155.3, cin="circle", cx=1300, cy=540, cout="cut",
    title=W(("Für", 152.9), ("Menschen,", 153.2), ("die", 153.9), ("nie", 154.0, "red"), ("unterschreiben.", 154.3)))
add(type="map", s=156.5, e=163.8, title=["Eine Adresse. Vier Studios.", 157.2], pins=[
    dict(x=230, y=330, at=157.4, label="dein Studio", s0="mine"),
    dict(x=640, y=280, at=157.6, label="Wettbewerber", s0="grey"),
    dict(x=330, y=640, at=157.8, label="Wettbewerber", s0="grey"),
    dict(x=700, y=620, at=158.0, label="Wettbewerber", s0="grey")],
    fly=[dict(t="Anfrage", from_=[400, 460], to=0, at=160.1), dict(t="Anfrage", from_=[400, 460], to=1, at=160.5),
         dict(t="Anfrage", from_=[400, 460], to=2, at=160.9), dict(t="Anfrage", from_=[400, 460], to=3, at=161.3)])
add(type="kin", s=163.9, e=166.4, cover="stone", cin="wipe", cout="up", nosubs=True, x=96, y=330, lines=[
    dict(size=150, w=W(("Eine", 163.95), ("Adresse", 164.2))),
    dict(size=150, w=W(("ist", 164.6), ("kein", 165.4, "grad"), ("Kunde.", 165.7, "grad")))])
add(type="cards", s=166.5, e=174.1, cout="cut", x=110, y=200, w=860, kicker=["Gleiche Anfrage, vier Angebote", 166.6, "r"], items=[
    dict(t="Studio A  ·  −5 %", at=167.0, icon="x", cls="bad", size=32), dict(t="Studio B  ·  −10 %", at=167.4, icon="x", cls="bad", size=32),
    dict(t="Studio C  ·  −15 %", at=167.7, icon="x", cls="bad", size=32), dict(t="Du  ·  −20 % ?", at=170.4, icon="x", cls="bad", size=32)])
add(type="stamp", s=171.8, e=174.1, cout="cut", at=171.8, t="Preiskampf", x=360, y=830, size=54, rot=-6)
add(type="kin", s=174.2, e=179.3, cover="dim", cin="cut", cout="cut", nosubs=True, x=96, y=250, gap=8, lines=[
    dict(size=110, w=W(("Du", 174.2), ("ertrinkst", 174.3), ("nicht", 175.2))),
    dict(size=110, style="color:#B8B4AC", w=W(("an", 175.4), ("zu", 175.7), ("wenig", 176.0), ("Anfragen.", 176.4))),
    dict(size=110, w=W(("Du", 177.4), ("ertrinkst", 177.5), ("an", 178.1), ("den", 178.2))),
    dict(size=150, w=W(("falschen.", 178.3, "grad")))])

# ---------------- PROOF ----------------
add(type="map", s=184.2, e=190.4, title=["Die Kunden laufen von allein zu?", 186.8], pins=[
    dict(x=520, y=440, at=184.6, label="", s0="grey", big=True, st=[dict(at=187.7, s="green", label="Studio in deiner Region")]),
    dict(x=220, y=300, at=185.0, s0="grey"), dict(x=700, y=700, at=185.2, s0="grey"), dict(x=260, y=660, at=185.4, s0="grey")],
    fly=[dict(t="Anfrage", from_=[60, 120], to=0, at=188.0), dict(t="Anfrage", from_=[800, 140], to=0, at=188.4), dict(t="Anfrage", from_=[60, 760], to=0, at=188.8)])
add(type="hand", dim="r", s=194.2, e=195.7, at=194.2, dur=0.7, t="nervt, oder?", x=1290, y=210, size=78,
    arrow=dict(x=1180, y=290, w=120, h=90, d="M110 10 C 80 50, 50 70, 10 80 M10 80 l24 -2 M10 80 l12 -20"))
add(type="pills", dim="r", s=195.9, e=200.4, items=[
    dict(t="planen nicht besser als du", at=195.9, x=1250, y=300, cls="", size=30, icon="x"),
    dict(t="du hast das bessere Angebot", at=198.4, x=1250, y=380, cls="", size=30, icon="check")])
add(type="chart", s=200.5, e=204.9, x=110, y=330, w=860, h=420, title="Das Paradoxon …", series=[
    dict(pts=[[0, .8], [.3, .62], [.6, .4], [1, .14]], color="red", at=200.6, dur=1.0, label="umgekehrt", cls="g", labelAt=203.3, lx=-210, ly=-80,
         morph=dict(pts=[[0, .12], [.3, .35], [.6, .6], [1, .9]], at=202.6, dur=1.0, color="green", spring=True))])
add(type="cases", s=205.0, e=219.7, cin="wipe", cout="circle", cx=1640, cy=820, kicker=["✓", "Echte Studios"], cards=[
    dict(x=96, y=200, w=820, h=580, at=205.0, logo="assets/clemens.svg", logoImgH=150, logoH=160, place="aus der Nähe von Bonn", placeAt=206.9,
         val=dict(at=208.3, to=100000, suf=" €", pre="rund ", dur=1.2), vsize=104, vsub="zusätzlicher Küchenumsatz", vsubAt=209.6,
         chips=[dict(t="in den ersten 3 Monaten", at=211.4)]),
    dict(x=980, y=200, w=760, h=360, at=213.9, name="Küchenplanung<br>Kanschat", place="ähnliche Ergebnisse", placeAt=214.4, logoH=110, vsize=10, vtext="", vsub="")],
    ghosts=[dict(x=980, y=600, w=760, h=110), dict(x=980, y=600, w=760, h=110), dict(x=980, y=600, w=760, h=110)], ghostAt=215.4,
    ghostLabel=dict(t="+ ganz viele andere", x=1010, y=630))
add(type="pills", s=217.8, e=219.7, items=[dict(t="keine kurzfristigen Peaks", at=217.8, x=1010, y=760, cls="g", size=28, icon="check")])
add(type="cases", s=219.8, e=231.3, cin="circle", cx=1640, cy=820, cout="cut", kicker=["✓", "Echte Studios"], cards=[
    dict(x=96, y=200, w=1300, h=680, at=219.9, logo="assets/marquardt.png", logoBg="#000", logoImgH=120, logoH=170, place="den Namen kennst du vermutlich", placeAt=222.0,
         val=dict(at=226.1, to=2.7, dec=1, pre="über ", suf=" Mio. €", dur=2.4), vsize=190, vsub="zusätzlicher Umsatz", vsubAt=229.6,
         chips=[dict(t="in 12 Monaten", at=224.7)])])

# ---------------- TRIPLE-A ----------------
add(type="kin", s=235.3, e=240.3, cover="stone", cin="wipe", cout="cut", nosubs=True, x=96, y=290, strike=[dict(i=2, at=236.4)], lines=[
    dict(size=110, style="color:#B8B4AC", w=W(("Nicht", 235.7), ("mehr", 236.1), ("Aufmerksamkeit.", 236.4))),
    dict(size=150, w=W(("Sondern", 237.7), ("die", 238.8), ("richtige", 239.0))),
    dict(size=150, w=W(("Auswahl.", 239.4, "green")))])
add(type="chapter", s=240.4, e=247.0, num="02", kicker="Das System", cin="cut", cout="wipe",
    title=W(("Das", 242.9), ("Triple-A-System.", 243.4, "grad")))
add(type="pills", s=245.2, e=247.0, items=[
    dict(t="Anziehung", at=245.5, x=110, y=870, cls="", size=30), dict(t="Auswahl", at=245.9, x=340, y=870, cls="", size=30),
    dict(t="Abschlussweg", at=246.3, x=540, y=870, cls="", size=30)])
add(type="triple", s=247.0, e=282.85, cout="cut", y=140, filterAt=258.6,
    active=[dict(i=0, at=247.6), dict(i=1, at=262.4)],
    extras={0: [dict(k="chip", t="nicht: „Kücheninteressenten“", at=252.8, cls="r", strike=254.5), dict(k="chip", t="sondern: konkret vor dem Küchenkauf", at=254.9, cls="g", icon="check"),
                dict(k="chip", t="filtert vor dem ersten Klick", at=259.1, cls="o")],
            1: [dict(k="chip", t="KI-gestützt kontaktiert", at=269.4, cls="", icon="bot"), dict(k="chip", t="von Küchenexperten qualifiziert", at=272.9, cls="", icon="phone"),
                dict(k="br", at=276.1), dict(k="chip", t="Budget", at=279.3, cls="g", icon="check"), dict(k="chip", t="Zeitrahmen", at=280.3, cls="g", icon="check"),
                dict(k="chip", t="Ernsthaftigkeit", at=281.1, cls="g", icon="check")]})
add(type="hand", s=266.6, e=270.0, at=266.6, dur=0.8, t="den überspringen fast alle", x=1310, y=60, size=52)
add(type="pills", dim="r", s=283.0, e=287.3, items=[dict(t="Nur wer dorthin gehört.", at=284.8, x=1180, y=320, cls="g", size=40, pad="18px 32px", icon="check")])
add(type="triple", s=287.4, e=303.4, cout="wipe", y=140, done=[0, 1], active=[dict(i=2, at=287.7)],
    extras={2: [dict(k="swap", at=293.4, at2=294.5), dict(k="bar", at=295.2, dur=2.6), dict(k="msg", t="Erinnerung: Termin morgen, 10:00", at=298.6),
                dict(k="chip", t="Wer zuerst ernst nimmt, verkauft.", at=300.5, cls="g", icon="check")]})
add(type="map", s=303.5, e=315.0, cover="stone", cin="circle", cx=960, cy=540, cout="cut", x=980, y=150, w=844, h=780,
    title=["Ein Studio pro Region.", 307.6], circle=dict(x=380, y=370, r=220, at=308.3, label="dein Gebiet · exklusiv"),
    pins=[dict(x=380, y=370, at=307.8, label="dein Studio", s0="mine", big=True),
          dict(x=700, y=250, at=309.0, s0="grey"), dict(x=640, y=560, at=309.2, s0="grey"), dict(x=150, y=640, at=309.4, s0="grey"), dict(x=110, y=200, at=309.6, s0="grey")])
add(type="kin", s=304.4, e=315.0, cout="cut", x=96, y=300, w=840, size=86, lines=[
    dict(size=34, style="color:#B8B4AC;font-weight:600;letter-spacing:.06em", w=W(("EIN", 304.0), ("GRUNDSATZ", 304.5))),
    dict(w=W(("Deine", 311.4), ("Anfragen", 311.6))), dict(w=W(("gehören", 312.1), ("dir.", 312.9))),
    dict(w=W(("Exklusiv.", 314.1, "grad")))])

# ---------------- GARANTIE ----------------
add(type="counter", s=324.0, e=331.9, cover="stone", cin="circle", cx=960, cy=540, cout="wipe", x=96, y=240, w=1700, at=325.3, dur=1.4, to=50000,
    suf=" €", size=300, cls="green", label=["mindestens", 324.0], sub=["zusätzlicher Umsatz in den ersten 90 Tagen.", 326.6], lsize=34, ssize=52)
add(type="stamp", s=330.3, e=331.9, at=330.3, t="schriftlich garantiert*", x=560, y=650, size=50, color="#5BBF6A", rot=-6)
add(type="pills", s=330.6, e=331.9, items=[dict(t="* für geeignete Küchenstudios", at=330.6, x=110, y=880, cls="", size=22)])
add(type="cards", s=332.0, e=352.0, y=200, title=W(("Geeignet", 332.0), ("heißt:", 332.7, "grad")), tsize=64, items=[
    dict(t="Funktionierender Verkaufsprozess", at=335.5, icon="check"),
    dict(t="Bereit, eng mit uns zusammenzuarbeiten", at=338.8, icon="check"),
    dict(t="Neue Interessenten sofort und konsequent bearbeiten", at=342.8, icon="check", size=31)])
add(type="pills", s=347.4, e=352.0, items=[dict(t="vorausgesetzt: gutes Produkt · freie Kapazitäten", at=347.6, x=912, y=850, cls="", size=24)])

# ---------------- CTA ----------------
add(type="pills", dim="r", s=358.1, e=360.8, items=[dict(t="Kostenloses Erstgespräch", at=358.3, x=1340, y=120, cls="o", size=36, pad="20px 34px", icon="arrowDown")])
add(type="map", s=360.9, e=377.9, title=["Ist deine Region noch frei?", 365.2], circle=dict(x=440, y=470, r=230, at=370.3, label="pro Region genau einmal"),
    pins=[dict(x=440, y=470, at=361.4, label="deine Region?", s0="orange", big=True, st=[dict(at=373.8, s="red", label="vergeben")]),
          dict(x=560, y=560, at=376.4, s0="red", label="dein Wettbewerber")])
add(type="end", s=378.0, e=END, cin="wipe", cout="cut", nosubs=True,
    title=W(("Jetzt", 378.1), ("prüfen,", 378.3), ("ob", 378.5), ("dein", 378.6), ("Gebiet", 378.75), ("frei", 378.9, "grad"), ("ist.", 379.0, "grad")),
    btnAt=378.4, clickAt=379.2, slotAt=379.6, pickAt=380.1, handAt=381.6)

for sc in S:
    for f in sc.get("fly", []):
        f["from"] = f.pop("from_")

timeline = dict(layout=layout, punch=punch, scenes=S, end=END)
open("data/timeline.js", "w").write("window.TL=" + json.dumps(timeline, ensure_ascii=False) + ";")
open("data/edl.js", "w").write("window.EDL=" + json.dumps(dict(segments=E["segments"], frames=9598), ensure_ascii=False) + ";")
open("data/subs.js", "w").write("window.SUBS=" + json.dumps(SUBS, ensure_ascii=False) + ";")

# ---------------- SFX ----------------
sfx = []
def fx(t, name, vol=0.5): sfx.append(dict(t=round(t, 3), n=name, v=vol))
for i, k in enumerate(layout[1:]):
    if k.get("d", 0.7) > 0: fx(k["t"] - 0.05, "whoosh" + str(1 + i % 2), 0.28)
for sc in S:
    ty = sc["type"]
    if sc.get("cin") in ("wipe", "circle", "up"): fx(sc["s"] - 0.08, "whoosh" + str(1 + int(sc["s"]) % 2), 0.4)
    if sc.get("cin") == "cut" and sc.get("cover"): fx(sc["s"], "impact", 0.32)
    if ty == "kin" and sc.get("cover") != "dim" and not sc.get("cover"):
        pass
    if ty in ("cards",):
        for it in sc["items"]: fx(it["at"], "card" + str(1 + int(it["at"] * 10) % 2), 0.4)
        for it in sc["items"]:
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
        for a in sc.get("active", []): fx(a["at"], "tick1", 0.45)
        for lst in sc["extras"].values():
            for x in lst:
                if x["k"] in ("chip", "msg"): fx(x["at"], "pop" if x["k"] == "msg" else "tick2", 0.3)
                if x["k"] == "swap": fx(x["at2"], "error", 0.25)
    if ty == "gap":
        for c in sc["coins"]: fx(c, "counter", 0.15)
    if ty == "bars":
        for r in sc["rows"]:
            for s_ in r["steps"]: fx(s_["at"], "tick2", 0.3)
    if ty == "end":
        fx(sc["clickAt"], "click", 0.6); fx(sc["pickAt"], "click", 0.45); fx(sc["btnAt"], "pop", 0.3)
    if ty == "contract": fx(154.0, "error", 0.35)
fx(16.6, "error", 0.3)
fx(130.9, "impact", 0.6); fx(129.0, "riser", 0.35)
fx(338.4 - 3.0 + 0.0, "tick1", 0.0)
sfx.sort(key=lambda x: x["t"])
json.dump(sfx, open("sfx.json", "w"), indent=0)
print(len(S), "scenes,", len(sfx), "sfx")
