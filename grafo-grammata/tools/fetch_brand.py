#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Brand assets (ΕΠΙΣΗΜΟ logo).

Κατεβάζει το επίσημο logo ΣΥΝΟΙΔΑ από το repo του site (synoida-site) και
παράγει τα δύο αρχεία που χρησιμοποιεί η εφαρμογή (ίδια ονόματα — καμία αλλαγή
κώδικα). Έτσι ταιριάζει με τις άλλες εφαρμογές ΣΥΝΟΙΔΑ (Χτίζω Πρόταση, Προανάγνωση
— χρησιμοποιούν το ίδιο σήμα).

Πηγή: https://github.com/dimitriskatik13-cmd/synoida-site/tree/main/assets
Εκτέλεση: python3 tools/fetch_brand.py   (απαιτεί Pillow + δίκτυο)
"""
import os, io, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "brand_assets", "logo")
os.makedirs(OUT, exist_ok=True)
BASE = "https://raw.githubusercontent.com/dimitriskatik13-cmd/synoida-site/main/assets"


def fetch(name):
    with urllib.request.urlopen(f"{BASE}/{name}", timeout=40) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


# 1) HEADER — επίσημο οριζόντιο logo (σήμα + wordmark «σύνοιδα»)
horiz = fetch("logo-horizontal.png")
horiz = horiz.crop(horiz.getbbox())
horiz.save(os.path.join(OUT, "synoida-logo-header.png"))
print("synoida-logo-header.png", horiz.size)

# 2) PWA ICON — μόνο το ΣΗΜΑ (παιδάκι + πέταλα) σε λευκό τετράγωνο (maskable-safe)
stacked = fetch("app-synoida-logo.png")  # σήμα πάνω, wordmark κάτω
w, h = stacked.size
mark = stacked.crop((0, 0, w, int(h * 0.69)))   # πάνω τμήμα = το σήμα (χωρίς το wordmark)
mark = mark.crop(mark.getbbox())
S = 512
icon = Image.new("RGBA", (S, S), (255, 255, 255, 255))
scale = min(S * 0.80 / mark.width, S * 0.74 / mark.height)
nw, nh = int(mark.width * scale), int(mark.height * scale)
mark = mark.resize((nw, nh), Image.LANCZOS)
icon.alpha_composite(mark, ((S - nw) // 2, (S - nh) // 2))
icon.save(os.path.join(OUT, "synoida-icon-pwa.png"))
print("synoida-icon-pwa.png", icon.size)
print("OK — επίσημα brand assets έτοιμα.")
