// ─────────────────────────────────────────────────────────────────────────────
// Feedback — ΔΙΑΚΡΙΤΙΚΗ, ήρεμη ανατροφοδότηση (πλαίσιο γραφείου, ΟΧΙ παιχνίδι).
//   • Απαλές θετικές υποδείξεις (toast), όχι «κόκκινο Χ».
//   • Επιβράβευση ολοκλήρωσης: απαλό glow στο χρώμα του γράμματος + 1–2 μπαλόνια
//     χαμηλής opacity. Κανένα θορυβώδες εφέ/πόντοι/ταμπλό.
// ─────────────────────────────────────────────────────────────────────────────
import { PALETTE, STROKE_COLORS, tint } from './palette.js';

export class Feedback {
  constructor(surface, hintEl) {
    this.surface = surface;
    this.hintEl = hintEl;
    this._hintTimer = null;
    this._raf = null;
  }

  hint(msg) {
    if (!this.hintEl) return;
    this.hintEl.textContent = msg;
    this.hintEl.classList.add('is-visible');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this.clearHint(), 2200);
  }

  clearHint() {
    if (this.hintEl) this.hintEl.classList.remove('is-visible');
  }

  /** Επιβράβευση ολοκλήρωσης: glow στο γράμμα + λίγα μπαλόνια (χαμηλή opacity). */
  celebrate(letter, accent) {
    const surf = this.surface;
    const map = surf.map;
    const color = accent || PALETTE.green;
    const balloons = makeBalloons(map, color);
    const T = 1300;
    let start = null;
    cancelAnimationFrame(this._raf);
    const frame = (ts) => {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / T);
      surf.clear('fx');
      const ctx = surf.ctx('fx');
      // glow: παχιά απαλή επανασχεδίαση του γράμματος, παλμός που σβήνει
      const pulse = Math.sin(Math.min(1, t * 1.4) * Math.PI); // 0→1→0
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = tint(color, 0.55 * (1 - t) + 0.10);
      ctx.shadowColor = tint(color, 0.6);
      ctx.shadowBlur = map.s(0.05) * (0.6 + pulse);
      ctx.lineWidth = map.s(0.075);
      for (const st of letter.strokes) {
        ctx.beginPath();
        st.points.forEach((p, i) => {
          const X = map.tx(p.x), Y = map.ty(p.y);
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        });
        ctx.stroke();
      }
      ctx.restore();
      // μπαλόνια: ανεβαίνουν ελαφρά & σβήνουν
      for (const b of balloons) {
        const y = b.y - t * map.s(0.10);
        ctx.save();
        ctx.globalAlpha = (1 - t) * b.alpha;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (1 - t) * b.alpha * 0.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, y - b.r * 0.32, b.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (t < 1) {
        this._raf = requestAnimationFrame(frame);
      } else {
        surf.clear('fx');
      }
    };
    this._raf = requestAnimationFrame(frame);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this.surface.clear('fx');
  }
}

function makeBalloons(map, color) {
  const cols = [color, PALETTE.blue, PALETTE.orange];
  const spots = [
    { x: 0.30, y: 0.40, r: 0.05 },
    { x: 0.70, y: 0.46, r: 0.042 },
  ];
  return spots.map((s, i) => ({
    x: map.tx(s.x), y: map.ty(s.y), r: map.s(s.r),
    color: cols[i % cols.length], alpha: 0.18,
  }));
}
