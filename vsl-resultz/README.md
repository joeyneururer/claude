# RESULTZ VSL – Motion-Pipeline

Code-Quelle des Video Sales Letters für Küchenstudios (Talking Head + Motion Graphics im RESULTZ-Look).
Medien (Takes, Logos, Fonts, KI-Assets, Renderframes) liegen bewusst nicht im Repo.

Ablauf:
1. `transcribe.py` – Wortzeiten der Takes (faster-whisper)
2. `edl.py` – Schnitt: Köpfe/Enden trimmen, lange Pausen straffen → `th.mov`
3. `words.py` – Transkript in Skript-Schreibweise + Untertitel-Cues
4. `timeline.py` – Szenen-Drehbuch (alle Zeiten auf Wortanker) → `data/*.js`, `sfx.json`
5. `index.html` + `engine.js` – framegenaue Engine, `render.js` rendert Frames (Playwright)
6. `mix.py` – Stimme, 3 Musik-Cues mit Ducking, SFX → Mix, danach Loudnorm auf −15 LUFS
