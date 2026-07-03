// ─────────────────────────────────────────────────────────────────────────────
// Guide renderer — ζωγραφίζει τον ΟΔΗΓΟ ενός γράμματος σε canvas 2D:
//   αχνό γράμμα-οδηγό · αριθμημένα σημεία έναρξης ① · βέλη κατεύθυνσης ·
//   γραμμές τετραδίου (απλή / διπλή με διακεκομμένη μέση).
//
// Χρησιμοποιείται ΚΑΙ από την εφαρμογή ΚΑΙ από την οθόνη «Έγκριση φοράς».
// Όλες οι συντεταγμένες των γραμμάτων είναι normalized 0..1 (τετράγωνο πεδίο).
// ─────────────────────────────────────────────────────────────────────────────
import { PALETTE, STROKE_COLORS, tint } from '../palette.js';
import { pointAtFraction, pathLength } from '../letters/_dsl.js';

/**
 * Αντιστοίχιση normalized πεδίου [0,1]² σε pixels του canvas (τετράγωνο,
 * κεντραρισμένο, με padding). Επιστρέφει συναρτήσεις tx/ty και την κλίμακα.
 */
export function fieldMap(w, h, padRatio = 0.08) {
  const pad = Math.min(w, h) * padRatio;
  const side = Math.min(w, h) - 2 * pad;
  const ox = (w - side) / 2;
  const oy = (h - side) / 2;
  return {
    side,
    tx: (x) => ox + x * side,
    ty: (y) => oy + y * side,
    s: (v) => v * side,
  };
}

/** Επίπεδο βοήθειας → σημαίες εμφάνισης (Ενότητα 3 του spec). */
export function helpFlags(level) {
  switch (level) {
    case 1: return { guide: true, numbers: true, arrows: true };
    case 2: return { guide: true, numbers: true, arrows: false };
    case 3: return { guide: false, numbers: true, arrows: false };
    case 4: return { guide: false, numbers: false, arrows: false };
    default: return { guide: true, numbers: true, arrows: true };
  }
}

/** Γραμμές τετραδίου. type: 'none' | 'single' | 'double'. Απλώνουν σε όλο το
 *  πλάτος του καμβά (σαν σελίδα τετραδίου), στις θέσεις ζωνών του map. */
export function drawNotebookLines(ctx, w, h, map, zones, type = 'double') {
  if (type === 'none') return;
  const x0 = 16, x1 = w - 16;
  const lineAt = (y, dashed = false, strong = false) => {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = Math.max(1, map.s(strong ? 0.006 : 0.004));
    ctx.strokeStyle = tint(PALETTE.green, strong ? 0.45 : 0.30);
    ctx.setLineDash(dashed ? [Math.max(5, map.s(0.02)), Math.max(4, map.s(0.018))] : []);
    ctx.moveTo(x0, map.ty(y));
    ctx.lineTo(x1, map.ty(y));
    ctx.stroke();
    ctx.restore();
  };
  if (type === 'single') {
    lineAt(zones.baseline, false, true);
    return;
  }
  // double: πάνω γραμμή, διακεκομμένη μέση, κάτω (baseline)
  lineAt(zones.xHeightTop, false, false);
  lineAt(zones.baseline, false, true);
  lineAt((zones.xHeightTop + zones.baseline) / 2, true, false);
}

/** Αχνό γράμμα-οδηγό (παχιά απαλή διαδρομή). */
export function drawGuideLetter(ctx, letter, map, { color = PALETTE.grey, alpha = 0.18, width = 0.085 } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = tint(color, alpha);
  ctx.lineWidth = map.s(width);
  for (const st of letter.strokes) {
    ctx.beginPath();
    st.points.forEach((p, i) => {
      const X = map.tx(p.x), Y = map.ty(p.y);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Αριθμημένα σημεία έναρξης ①②③ στην αρχή κάθε stroke. */
export function drawStartNumbers(ctx, letter, map, { radius = 0.045, fontRatio = 0.052 } = {}) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const r = Math.max(map.s(radius), 8); // ελάχιστο αναγνώσιμο μέγεθος στα μικρά γράμματα
  // De-collision: αν δύο σημεία έναρξης πέφτουν σχεδόν στο ίδιο σημείο,
  // απομακρύνουμε ελαφρώς το badge ώστε να φαίνονται και τα δύο.
  const placed = [];
  const spots = letter.strokes.map((st) => ({ x: map.tx(st.points[0].x), y: map.ty(st.points[0].y) }));
  spots.forEach((sp) => {
    let { x, y } = sp;
    for (let guard = 0; guard < 8; guard++) {
      const hit = placed.find((q) => Math.hypot(q.x - x, q.y - y) < r * 2.1);
      if (!hit) break;
      const dx = x - hit.x, dy = y - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      x = hit.x + (dx / d) * r * 2.15;
      y = hit.y + (dy / d) * r * 2.15 + r * 0.2;
    }
    placed.push({ x, y });
  });
  letter.strokes.forEach((st, idx) => {
    const X = placed[idx].x, Y = placed[idx].y;
    const col = STROKE_COLORS[idx % STROKE_COLORS.length];
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(map.s(0.008), 1.4);
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `700 ${Math.max(map.s(fontRatio), 10)}px Inter, sans-serif`;
    ctx.fillText(st.startLabel, X, Y + map.s(0.002));
  });
  ctx.restore();
}

/**
 * Βέλη κατεύθυνσης κατά μήκος των strokes — μεγάλα, με «κοντάρι» (σαν →) και
 * πλήθος ανάλογο του μήκους (μικρή γραμμή → 1 βέλος, μεγάλη → έως 3).
 */
export function drawArrows(ctx, letter, map, { size = 0.04, spacing = 0.22 } = {}) {
  ctx.save();
  const px = Math.max(map.s(size), 6); // ελάχιστο ορατό μέγεθος στα μικρά γράμματα
  letter.strokes.forEach((st, idx) => {
    const col = STROKE_COLORS[idx % STROKE_COLORS.length];
    const L = pathLength(st.points);
    const n = Math.max(1, Math.min(3, Math.round(L / spacing)));
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 1);
      const { x, y, angle } = pointAtFraction(st.points, f);
      drawArrow(ctx, map.tx(x), map.ty(y), angle, px, col);
    }
  });
  ctx.restore();
}

function drawArrow(ctx, x, y, angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // λευκό «φωτοστέφανο» για αντίθεση πάνω στον αχνό οδηγό
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = size * 1.05;
  ctx.beginPath();
  ctx.moveTo(-size * 1.45, 0);
  ctx.lineTo(size * 0.15, 0);
  ctx.stroke();
  // κοντάρι
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(-size * 1.35, 0);
  ctx.lineTo(-size * 0.05, 0);
  ctx.stroke();
  // κεφαλή
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 1.05, 0);
  ctx.lineTo(-size * 0.5, size * 0.74);
  ctx.lineTo(-size * 0.5, -size * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Ολοκληρωμένη απόδοση οδηγού με βάση επίπεδο βοήθειας ή ρητές σημαίες.
 * opts: { level, lines, zones, force:{guide,numbers,arrows}, guideColor, guideAlpha }
 */
export function renderGuide(ctx, w, h, letter, opts = {}) {
  const map = opts.map || fieldMap(w, h, opts.padRatio);
  const lineMap = opts.lineMap || map; // οι γραμμές μπορεί να έχουν δικό τους χάρτη
  const flags = opts.force || helpFlags(opts.level ?? 1);
  if (opts.lines && opts.lines !== 'none') {
    drawNotebookLines(ctx, w, h, lineMap, letter.zones, opts.lines);
  }
  if (flags.guide) {
    drawGuideLetter(ctx, letter, map, { color: opts.guideColor, alpha: opts.guideAlpha });
  }
  if (flags.arrows) drawArrows(ctx, letter, map, opts.arrowOpts || {});
  if (flags.numbers) drawStartNumbers(ctx, letter, map, opts.numberOpts || {});
  return map;
}
