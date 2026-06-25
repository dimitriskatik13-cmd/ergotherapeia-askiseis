// ─────────────────────────────────────────────────────────────────────────────
// Animator — Επίδειξη «Δείξε μου»: το γράμμα «γράφεται» μόνο του με τη ΣΩΣΤΗ
// φορά & σειρά γραμμών, με ένα animated «μολύβι» στην άκρη. Ταχύτητα ρυθμιζόμενη.
// Ζωγραφίζει στο ink layer (το παιδί δεν γράφει στην επίδειξη).
// ─────────────────────────────────────────────────────────────────────────────
import { PALETTE } from '../palette.js';

export class Animator {
  constructor(surface, letter, opts = {}) {
    this.surface = surface;
    this.letter = letter;
    this.color = opts.color || '#3a3f45';
    this.baseWidth = opts.baseWidth ?? 0.02;
    this.speed = opts.speed ?? 0.5;     // 0..1
    this.raf = null;
    this.startT = null;
    this.onDone = null;
    // arc-length tables ανά stroke
    this.tables = letter.strokes.map((st) => buildTable(st.points));
    this.totalLen = this.tables.reduce((a, t) => a + t.len, 0);
  }

  play(onDone) {
    this.stop();
    this.onDone = onDone;
    this.startT = null;
    const speedUnitsPerSec = 0.35 + 1.15 * this.speed; // normalized units/sec
    const interPause = 0.35; // sec ανάμεσα σε strokes
    const step = (ts) => {
      if (this.startT == null) this.startT = ts;
      const elapsed = (ts - this.startT) / 1000;
      // πόσο μήκος έχουμε «γράψει», λαμβάνοντας υπόψη παύσεις ανά stroke
      let budget = elapsed * speedUnitsPerSec;
      this._render(budget, interPause * speedUnitsPerSec);
      const totalWithPauses = this.totalLen + interPause * speedUnitsPerSec * (this.tables.length - 1);
      if (budget >= totalWithPauses) {
        this.raf = null;
        if (this.onDone) this.onDone();
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  _render(budget, pausePerStroke) {
    const surf = this.surface;
    const map = surf.map;
    const ctx = surf.ctx('ink');
    surf.clear('ink');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = map.s(this.baseWidth);

    let remaining = budget;
    let head = null;
    for (let s = 0; s < this.tables.length; s++) {
      const t = this.tables[s];
      if (remaining <= 0) break;
      const drawLen = Math.min(t.len, remaining);
      const pts = sampleUpTo(t, drawLen);
      if (pts.length > 1) {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const X = map.tx(p.x), Y = map.ty(p.y);
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        });
        ctx.stroke();
        head = pts[pts.length - 1];
      } else if (pts.length === 1) {
        head = pts[0];
      }
      remaining -= drawLen;
      if (drawLen >= t.len) remaining -= pausePerStroke; // παύση μετά το stroke
    }
    if (head) this._pencilMark(ctx, map, head);
    ctx.restore();
  }

  _pencilMark(ctx, map, p) {
    const X = map.tx(p.x), Y = map.ty(p.y);
    const r = map.s(this.baseWidth) * 0.95;
    ctx.save();
    ctx.fillStyle = PALETTE.orange;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = r * 1.2;
    ctx.beginPath();
    ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function buildTable(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points, cum, len: cum[cum.length - 1] };
}

function sampleUpTo(table, dist) {
  const { points, cum } = table;
  if (dist <= 0) return [points[0]];
  const out = [];
  for (let i = 0; i < points.length; i++) {
    if (cum[i] <= dist) {
      out.push(points[i]);
    } else {
      const seg = cum[i] - cum[i - 1];
      const f = seg === 0 ? 0 : (dist - cum[i - 1]) / seg;
      out.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f });
      break;
    }
  }
  return out;
}
