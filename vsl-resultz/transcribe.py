import sys, glob, json, os
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for f in sorted(glob.glob("audio/*.wav")):
    import numpy as np, wave
    w_=wave.open(f); a=np.frombuffer(w_.readframes(w_.getnframes()),np.int16).astype(np.float32)/32768
    segs, info = m.transcribe(a, language="de", word_timestamps=True, vad_filter=True)
    words=[]; text=[]
    for s in segs:
        text.append(s.text.strip())
        words += [dict(w=w.word, s=round(w.start,2), e=round(w.end,2)) for w in s.words]
    k=os.path.basename(f)
    out[k]=dict(text=" ".join(text), words=words)
    print("==", k, "\n", " ".join(text), flush=True)
json.dump(out, open("transcripts.json","w"), ensure_ascii=False, indent=1)
