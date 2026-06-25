#!/usr/bin/env bash
# ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Phoneme generator (wrapper).
# Η πραγματική λογική είναι στο gen_phonemes.py (καθαρότερα μαθηματικά διάρκειας).
# Απαιτήσεις: espeak-ng + ffmpeg (π.χ. pip install imageio-ffmpeg).
set -euo pipefail
exec python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/gen_phonemes.py"
