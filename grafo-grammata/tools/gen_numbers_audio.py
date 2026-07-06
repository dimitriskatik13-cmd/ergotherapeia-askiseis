#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Ήχοι αριθμών 0–31 (v1: eSpeak-NG)

Παράγει sounds/num-<n>.mp3 με το ΟΝΟΜΑ κάθε αριθμού στα ελληνικά («δεκαεπτά»).
Ίδια αποσυνδεδεμένη λογική με τα φωνήματα: αντικατάσταση αρχείων με ίδια
ονόματα = αναβάθμιση φωνής χωρίς αλλαγή κώδικα.

Απαιτήσεις: espeak-ng + ffmpeg. Εκτέλεση: python3 tools/gen_numbers_audio.py
"""
import os, re, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "sounds")
os.makedirs(OUT, exist_ok=True)
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = "ffmpeg"

UNITS = {0: "μηδέν", 1: "ένα", 2: "δύο", 3: "τρία", 4: "τέσσερα", 5: "πέντε",
         6: "έξι", 7: "επτά", 8: "οκτώ", 9: "εννέα", 10: "δέκα", 11: "έντεκα",
         12: "δώδεκα", 13: "δεκατρία", 14: "δεκατέσσερα", 15: "δεκαπέντε",
         16: "δεκαέξι", 17: "δεκαεπτά", 18: "δεκαοκτώ", 19: "δεκαεννέα", 20: "είκοσι"}

def name(n):
    if n <= 20: return UNITS[n]
    if n < 30: return "είκοσι " + UNITS[n - 20]
    if n == 30: return "τριάντα"
    return "τριάντα " + UNITS[n - 30]

CLEAN = ("loudnorm=I=-16:TP=-1.5:LRA=11,"
         "silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,areverse,"
         "silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,areverse,"
         "aresample=44100,afade=t=in:st=0:d=0.02,areverse,afade=t=in:st=0:d=0.05,areverse,"
         "apad=pad_dur=0.05")

def dur(path):
    p = subprocess.run([FF, "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    return 0.0 if not m else int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

print(f"ffmpeg: {FF}\nout   : {OUT}\n")
for n in range(32):
    raw = tempfile.mktemp(suffix=".wav")
    subprocess.run(["espeak-ng", "-v", "el", "-s", "130", name(n), "-w", raw],
                   stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    out = os.path.join(OUT, f"num-{n}.mp3")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", CLEAN,
                    "-ac", "1", "-c:a", "libmp3lame", "-b:a", "192k", out],
                   stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    print(f"  num-{n:<2} «{name(n)}»  {dur(out):.2f}s")
    try: os.remove(raw)
    except OSError: pass
print("\nOK — 32 αρχεία αριθμών.")
