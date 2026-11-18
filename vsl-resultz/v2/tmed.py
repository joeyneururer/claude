import json, numpy as np, wave
from faster_whisper import WhisperModel
m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
w_ = wave.open("../newtake/g16.wav"); a = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(np.float32) / 32768
prompt = "Aufmerksamkeits-Paradoxon, Küchenstudios, Triple-A-System, RESULTZ, Marquardt Küchen, Küchenplanung Clemens, Küchenplanung Kanschat, Leadportale, Möbeldiscounter"
segs, _ = m.transcribe(a, language="de", word_timestamps=True, beam_size=5, initial_prompt=prompt)
words = []
for s in segs:
    words += [dict(w=x.word.strip(), s=round(x.start, 3), e=round(x.end, 3)) for x in s.words]
    print(f"[{s.start:6.1f}] {s.text.strip()}", flush=True)
json.dump(words, open("words_med.json", "w"), ensure_ascii=False)
