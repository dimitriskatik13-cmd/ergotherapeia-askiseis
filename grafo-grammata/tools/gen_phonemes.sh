#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Phoneme audio generator (v1: eSpeak-NG)
#
# Παράγει ΜΙΑ φορά τα τοπικά αρχεία φωνημάτων στον φάκελο ../sounds/.
# Η εφαρμογή ΔΕΝ κάνει live TTS — παίζει αυτά τα έτοιμα αρχεία (offline).
#
# Αρχιτεκτονική (κλειδωμένη): ο ήχος είναι αποσυνδεδεμένος. Τα αρχεία έχουν
# ΣΤΑΘΕΡΗ ονοματολογία ανά ΦΩΝΗΜΑ (a.mp3, s.mp3, m.mp3 ...). Για να αλλάξει η
# μέθοδος παραγωγής (π.χ. cloud TTS με φυσική φωνή), αρκεί η αντικατάσταση των
# αρχείων με ίδια ονόματα — ΚΑΜΙΑ αλλαγή κώδικα. Η ονοματολογία ΔΕΝ αλλάζει ποτέ.
#
# Απαιτήσεις: espeak-ng + ffmpeg (εδώ χρησιμοποιείται static ffmpeg από pip).
# Εκτέλεση:   bash tools/gen_phonemes.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../sounds"
mkdir -p "$OUT"

# Static ffmpeg από imageio-ffmpeg (pip), αλλιώς system ffmpeg.
FF="$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || echo ffmpeg)"
VOICE="el"   # eSpeak-NG Greek

# Χάρτης: <κλειδί φωνήματος> <eSpeak phoneme token>
# Τα κλειδιά είναι ASCII, σταθερά, ΑΝΑ ΗΧΟ (όχι ανά γράμμα). Ομόηχα γράμματα
# (η/ι/υ -> i, ο/ω -> o) μοιράζονται αρχείο. Πεζό+κεφαλαίο πάντα μοιράζονται.
#   a e i o          : φωνήεντα
#   v gh dh z th      : β γ(/ɣ/) δ(/ð/) ζ θ(/θ/)
#   k l m n ks        : κ λ μ ν ξ(/ks/)
#   p r s t f kh ps   : π ρ σ τ φ χ(/x/) ψ(/ps/)
MAP=(
  "a:a"  "e:e"  "i:i"  "o:o"
  "v:v"  "gh:Q" "dh:D" "z:z"  "th:T"
  "k:k"  "l:l"  "m:m"  "n:n"  "ks:ks"
  "p:p"  "r:r"  "s:s"  "t:t"  "f:f"  "kh:x" "ps:ps"
)

# Εξομάλυνση: κόψιμο σιγής αρχής/τέλους, mono, 44.1k, ήπιο loudnorm, μικρό
# fade ώστε να μην «κλικάρει» η αρχή/τέλος, mp3 192k.
TRIM_LEAD="silenceremove=start_periods=1:start_silence=0.015:start_threshold=-45dB:detection=peak"
filter="${TRIM_LEAD},areverse,${TRIM_LEAD},areverse,loudnorm=I=-17:TP=-1.5:LRA=11,aresample=44100,afade=t=in:st=0:d=0.012,apad=pad_dur=0.06"

echo "ffmpeg: $FF"
echo "voice : eSpeak-NG '$VOICE'"
echo "out   : $OUT"
echo

for pair in "${MAP[@]}"; do
  key="${pair%%:*}"
  tok="${pair##*:}"
  raw="$(mktemp --suffix=.wav)"
  # Παραγωγή ΑΠΟΜΟΝΩΜΕΝΟΥ φωνήματος μέσω [[...]] (espeak phoneme input),
  # ελαφρώς πιο αργό (-s) για ευκρίνεια.
  espeak-ng -v "$VOICE" -s 150 "[[${tok}]]" -w "$raw" 2>/dev/null
  "$FF" -y -loglevel error -i "$raw" -af "$filter" -ac 1 -c:a libmp3lame -b:a 192k "$OUT/${key}.mp3"
  dur="$("$FF" -i "$OUT/${key}.mp3" 2>&1 | grep -o 'Duration: [0-9:.]*' | head -1 || true)"
  printf "  %-3s <- [[%-2s]]  %s\n" "$key" "$tok" "$dur"
  rm -f "$raw"
done

echo
echo "Σύνολο αρχείων: $(ls -1 "$OUT"/*.mp3 | wc -l) (21 μοναδικά φωνήματα)"
echo "OK."
