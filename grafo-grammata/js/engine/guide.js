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
export function fieldMap(w, h, padRatio = 0.08, contentBottom = 1) {
  const pad = Math.min(w, h) * padRatio;
  let side = Math.min(w, h) - 2 * pad;
  if (contentBottom > 1) side = Math.min(side, h * 0.94 / (2 * (contentBottom - 0.5)));
  const ox = (w - side) / 2;
  const oy = (h - side) / 2;
  return {
    side,
    tx: (x) => ox + x * side,
    ty: (y) => oy + y * side,
    s: (v) => v * side,
  };
}

/** Includes pen clearance for a descender extending below the unit field. */
export function letterContentBottom(letter) {
  return Math.max(1, ...letter.strokes.flatMap(st => st.points.map(p => p.y + 0.03)));
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
export function drawGuideLetter(ctx, letter, map, { color = PALETTE.grey, alpha = 0.18, width = 0.045 } = {}) {
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
  // Στα μικρά μεγέθη τα badges ΜΙΚΡΑΙΝΟΥΝ μαζί με το γράμμα (αναλογικά με την
  // πλευρά του), με μικρό όριο αναγνωσιμότητας — ώστε να μην κρύβουν το ίχνος.
  const r = Math.max(map.s(radius), Math.min(8, map.side * 0.095));
  // De-collision: αν δύο σημεία έναρξης πέφτουν σχεδόν στο ίδιο σημείο,
  // απομακρύνουμε ελαφρώς το badge ώστε να φαίνονται και τα δύο.
  const placed = [];
  const spots = letter.strokes.map((st) => ({ x: map.tx(st.points[0].x), y: map.ty(st.points[0].y) }));
  const offsets = [[-1.6,-1.7],[1.6,-1.7],[-2.3,0],[2.3,0],[0,-3.2],[-2.2,2.0],[2.2,2.0]];
  spots.forEach((sp) => {
    let choice;
    for (const [dx,dy] of offsets) {
      const q = {x:sp.x+dx*r, y:sp.y+dy*r};
      if (!placed.some(p => Math.hypot(p.x-q.x,p.y-q.y) < r*2.15)) { choice=q; break; }
    }
    placed.push(choice || {x:sp.x+3*r,y:sp.y-3*r});
  });
  // Every displaced badge is linked to a dot at the TRUE stroke start.
  spots.forEach((sp,idx) => {
    const q=placed[idx], col=STROKE_COLORS[idx % STROKE_COLORS.length];
    ctx.strokeStyle=col; ctx.lineWidth=Math.max(1,map.s(0.003));
    ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(sp.x,sp.y,Math.max(1.7,map.s(0.009)),0,Math.PI*2);ctx.fill();
  });
  letter.strokes.forEach((st, idx) => {
    const X = placed[idx].x, Y = placed[idx].y;
    const col = STROKE_COLORS[idx % STROKE_COLORS.length];
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(r * 0.16, 1.1);
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.fillStyle = col;
    // Η γραμματοσειρά δένει με την ακτίνα του badge — μικραίνει μαζί του.
    ctx.font = `700 ${Math.max(r * 1.2, 6)}px Inter, sans-serif`;
    ctx.fillText(st.startLabel, X, Y + map.s(0.002));
  });
  ctx.restore();
}

/**
 * Βέλη κατεύθυνσης κατά μήκος των strokes — μεγάλα, με «κοντάρι» (σαν →) και
 * πλήθος ανάλογο του μήκους (μικρή γραμμή → 1 βέλος, μεγάλη → έως 6).
 */
export function drawArrows(ctx, letter, map, { size = 0.04, spacing = 0.22 } = {}) {
  ctx.save();
  // Στα μικρά μεγέθη τα βέλη μικραίνουν μαζί με το γράμμα (με όριο ορατότητας)
  // και μπαίνει ΕΝΑ ανά γραμμή — για να φαίνεται καθαρά το ίχνος.
  const px = Math.max(map.s(size), Math.min(6, map.side * 0.075));
  const tiny = map.side < 90;
  letter.strokes.forEach((st, idx) => {
    const col = STROKE_COLORS[idx % STROKE_COLORS.length];
    const L = pathLength(st.points);
    if (st.arrow === false) return;
    const n = tiny ? 1 : Math.max(1, Math.min(6, Math.round(L / spacing)));
    const fractions = tiny && letter.case === 'numbers' ? [0.5] : (st.arrowFractions || Array.from({length:n}, (_,i)=>(i+1)/(n+1)));
    for (const f of fractions) {
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
