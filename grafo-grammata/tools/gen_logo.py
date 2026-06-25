#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — PLACEHOLDER logo + PWA icon generator.

ΠΡΟΣΟΧΗ (TODO Δημήτρη): Αυτά είναι ΠΡΟΣΩΡΙΝΑ assets, σχεδιασμένα στο στυλ της
ΣΥΝΟΙΔΑ (μπαλόνια + wordmark σε Comfortaa, χρώματα brand). ΔΕΝ είναι το επίσημο
logo. Αντικατέστησέ τα με τα πραγματικά αρχεία, ΙΔΙΑ ονόματα:
    brand_assets/logo/synoida-logo-header.png
    brand_assets/logo/synoida-icon-pwa.png
Καμία αλλαγή κώδικα δεν χρειάζεται — η εφαρμογή δείχνει αυτές τις διαδρομές.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_DIR = os.path.join(HERE, "..", "brand_assets", "logo")
FONT = os.path.join(HERE, "..", "brand_assets", "fonts", "Comfortaa-Variable.ttf")
os.makedirs(LOGO_DIR, exist_ok=True)

GREEN, RED, BLUE, ORANGE, GREY = "#8DC63F", "#ED1C24", "#00AEEF", "#F7941D", "#58595B"
SS = 4  # supersampling για ομαλά anti-aliased σχήματα


def hex2rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def load_font(px, weight=600):
    f = ImageFont.truetype(FONT, px)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def balloons(draw, cx, cy, r):
    """Σύμπλεγμα 4 'μπαλονιών' (circle motif) στα χρώματα του brand."""
    spec = [
        (-0.55, -0.30, 0.78, BLUE),
        (0.50, -0.45, 0.62, GREEN),
        (0.20, 0.55, 0.70, ORANGE),
        (-0.30, 0.42, 0.50, RED),
    ]
    for dx, dy, rr, col in spec:
        x, y, rad = cx + dx * r, cy + dy * r, rr * r
        draw.ellipse([x - rad, y - rad, x + rad, y + rad], fill=hex2rgba(col, 235))
        # απαλό highlight
        hr = rad * 0.32
        hx, hy = x - rad * 0.30, y - rad * 0.34
        draw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(255, 255, 255, 70))


def make_header():
    W, H = 760, 200
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    balloons(d, 132 * SS, 100 * SS, 78 * SS)
    font = load_font(96 * SS, weight=600)
    tx, ty = 250 * SS, 100 * SS
    # κάθετο κεντράρισμα wordmark
    bbox = d.textbbox((0, 0), "ΣΥΝΟΙΔΑ", font=font)
    th = bbox[3] - bbox[1]
    d.text((tx, ty - th / 2 - bbox[1]), "ΣΥΝΟΙΔΑ", font=font, fill=hex2rgba(GREY))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(LOGO_DIR, "synoida-logo-header.png"))
    print("wrote synoida-logo-header.png", img.size)


def make_icon(size=512):
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # απαλό off-white στρογγυλεμένο πλακίδιο (μέσα στη maskable safe-zone)
    pad = int(size * 0.06) * SS
    d.rounded_rectangle([pad, pad, size * SS - pad, size * SS - pad],
                        radius=int(size * 0.22) * SS, fill=hex2rgba("#F7F6F8"))
    balloons(d, size * SS * 0.5, size * SS * 0.44, size * SS * 0.27)
    font = load_font(int(size * 0.20) * SS, weight=600)
    bbox = d.textbbox((0, 0), "ΣΥΝΟΙΔΑ", font=font)
    tw = bbox[2] - bbox[0]
    d.text((size * SS * 0.5 - tw / 2 - bbox[0], size * SS * 0.70),
           "ΣΥΝΟΙΔΑ", font=font, fill=hex2rgba(GREY))
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(LOGO_DIR, "synoida-icon-pwa.png"))
    print("wrote synoida-icon-pwa.png", img.size)


if __name__ == "__main__":
    make_header()
    make_icon(512)
