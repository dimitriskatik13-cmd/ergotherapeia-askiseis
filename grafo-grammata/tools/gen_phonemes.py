#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Phoneme audio generator (v1: eSpeak-NG)

Παράγει ΜΙΑ φορά τα τοπικά αρχεία φωνημάτων στον φάκελο ../sounds/.
Η εφαρμογή ΔΕΝ κάνει live TTS — παίζει αυτά τα έτοιμα αρχεία (offline).

Αρχιτεκτονική (κλειδωμένη): αποσυνδεδεμένος ήχος, ΣΤΑΘΕΡΗ ονοματολογία ΑΝΑ ΦΩΝΗΜΑ
(a.mp3, s.mp3, m.mp3 …). Αλλαγή μεθόδου = αντικατάσταση αρχείων, χωρίς αλλαγή κώδικα.

ΠΑΡΑΤΕΤΑΜΕΝΑ φωνήματα: κάθε φώνημα «τεντώνεται» χρονικά (διατήρηση τόνου ύψους)
σε έναν στόχο διάρκειας ανά κατηγορία, ώστε να «κρατάνε» (π.χ. «αααα», «σσσσ»,
«μμμμ»). Τα κλειστά/στιγμιαία (p/t/k) μένουν σύντομα — δεν κρατιούνται από τη φύση
τους (φωνητικό όριο). Τα φωνήεντα/τριβόμενα παίρνουν long-mark «:» για λιγότερο
τέντωμα και καθαρότερο ήχο.

Απαιτήσεις: espeak-ng + ffmpeg. Εκτέλεση: python3 tools/gen_phonemes.py
"""
import os, re, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "sounds")
os.makedirs(OUT, exist_ok=True)
VOICE = "el"
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = "ffmpeg"

# key | eSpeak token | rate | target διάρκειας σε sec (0 = χωρίς τέντωμα)
PHON = [
    ("a", "a:", 105, 0.85), ("e", "e:", 105, 0.85), ("i", "i:", 105, 0.85), ("o", "o:", 105, 0.85),
    ("v", "v:", 95, 0.70), ("gh", "Q", 95, 0.70), ("dh", "D", 95, 0.70), ("z", "z:", 95, 0.70), ("th", "T", 95, 0.70),
    # Κλειστά π/τ/κ: σύντομο schwa «@» ώστε να είναι ΑΚΟΥΣΤΑ (φωνητικό όριο).
    ("k", "k@", 130, 0.0), ("l", "l", 95, 0.50), ("m", "m", 95, 0.50), ("n", "n", 95, 0.50), ("ks", "ks", 100, 0.60),
    ("p", "p@", 130, 0.0), ("r", "r", 95, 0.50), ("s", "s:", 95, 0.70), ("t", "t@", 130, 0.0),
    ("f", "f:", 95, 0.70), ("kh", "x", 95, 0.70), ("ps", "ps", 100, 0.60),
]

CLEAN = ("loudnorm=I=-16:TP=-1.5:LRA=11,"
         "silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,areverse,"
         "silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,areverse,"
         "aresample=44100")
TMIN = 0.08  # μέγιστο ~12.5x τέντωμα (ασφάλεια ποιότητας)


def dur(path):
    p = subprocess.run([FF, "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    if not m:
        return 0.0
    h, mn, s = m.groups()
    return int(h) * 3600 + int(mn) * 60 + float(s)


def atempo_chain(t):
    """Αλυσίδα atempo με γινόμενο = t (t<1 ⇒ επιβράδυνση/τέντωμα), κάθε στάδιο ≥0.5."""
    stages, f = [], t
    while f < 0.5 - 1e-9:
        stages.append("atempo=0.5"); f /= 0.5
    stages.append(f"atempo={f:.4f}")
    return ",".join(stages)


def run(cmd):
    subprocess.run(cmd, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)


print(f"ffmpeg: {FF}\nvoice : eSpeak-NG '{VOICE}'\nout   : {OUT}\n")
for key, tok, rate, target in PHON:
    raw = tempfile.mktemp(suffix=".wav")
    clean = tempfile.mktemp(suffix=".wav")
    run(["espeak-ng", "-v", VOICE, "-s", str(rate), f"[[{tok}]]", "-w", raw])
    run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", CLEAN, "-ac", "1", clean])
    base = dur(clean)
    stretch = ""
    if target > 0 and base < target and base > 0:
        t = max(TMIN, base / target)
        stretch = atempo_chain(t) + ","
    af = (stretch +
          "afade=t=in:st=0:d=0.02,areverse,afade=t=in:st=0:d=0.05,areverse,apad=pad_dur=0.05")
    out = os.path.join(OUT, f"{key}.mp3")
    run([FF, "-y", "-loglevel", "error", "-i", clean, "-af", af, "-ac", "1",
         "-c:a", "libmp3lame", "-b:a", "192k", out])
    print(f"  {key:3} <- [[{tok:4}]] @{rate:<3} base={base:.2f}s -> {dur(out):.2f}s")
    for f in (raw, clean):
        try: os.remove(f)
        except OSError: pass

print(f"\nΣύνολο αρχείων: {len([1 for f in os.listdir(OUT) if f.endswith('.mp3')])} (21 μοναδικά φωνήματα)\nOK.")
