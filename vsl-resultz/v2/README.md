# RESULTZ VSL v2 – Gabriel-Take

Ersetzt die sieben Einzelclips durch Gabriels durchgehenden 1080p-Take.

- `words.py` – Transkript (faster-whisper medium, eine Lücke aus dem small-Modell ergänzt), Skript-Schreibweise, Untertitel, `find()` für Phrasen-Anker
- `timeline.py` – Drehbuch, alle Zeiten an gesprochenen Phrasen verankert; Kamera-Schnitte Totale/Nahe auf Satzanfängen
- `engine.js` – Screen-Replacement: der Bildschirm im Hintergrund wird per Homographie (zwei gemessene Quads, Bildversatz bei 2:07 im Quellvideo) durch ein eigenes RESULTZ-Display ersetzt; Pflanzenzweig per Matte darüber
- `mix.py` – Stimme, drei Musik-Cues (Lyria) mit Ducking, SFX; danach Loudnorm −15 LUFS
