// ─────────────────────────────────────────────────────────────────────────────
// ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — Geometry DSL για τα ίχνη (strokes) των γραμμάτων
//
// Όλες οι συντεταγμένες είναι normalized 0..1 μέσα σε τετράγωνο πεδίο, με y προς
// τα ΚΑΤΩ (όπως ο καμβάς). Κάθε γράμμα ορίζεται ως πίνακας από strokes· κάθε
// stroke είναι μια διαδρομή σημείων με τη ΣΩΣΤΗ ΦΟΡΑ (πρώτο σημείο = αφετηρία ①).
//
// Οι βοηθητικές συναρτήσεις παράγουν πυκνά δείγματα σημείων ώστε η ιχνηλάτηση,
// τα βέλη και το animation «μολυβιού» να είναι ομαλά.
// ─────────────────────────────────────────────────────────────────────────────

const D2R = Math.PI / 180;

/** Σημείο. */
export const P = (x, y) => ({ x, y });

/** Ευθύγραμμο τμήμα από (x1,y1) σε (x2,y2), n+1 σημεία. */
export function line(x1, y1, x2, y2, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

/**
 * Τόξο έλλειψης. Γωνίες σε ΜΟΙΡΕΣ. Με y προς τα κάτω:
 *   0° = δεξιά, 90° = κάτω, 180° = αριστερά, 270°/-90° = πάνω.
 * Φθίνουσες γωνίες ⇒ αριστερόστροφη (CCW) φορά οπτικά (όπως γράφουμε το «ο»).
 */
export function ellipseArc(cx, cy, rx, ry, a0, a1, n = 36) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * (i / n)) * D2R;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/** Κυκλικό τόξο (ειδική περίπτωση έλλειψης). */
export const arc = (cx, cy, r, a0, a1, n = 36) => ellipseArc(cx, cy, r, r, a0, a1, n);

/** Τετραγωνικό Bézier (μία γωνία ελέγχου). */
export function quad(p0, pc, p1, n = 22) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * pc.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * pc.y + t * t * p1.y,
    });
  }
  return pts;
}

/** Κυβικό Bézier (δύο γωνίες ελέγχου). */
export function cubic(p0, c1, c2, p1, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
  return pts;
}

/** Πολυγραμμή από σημεία P(...), με γραμμική παρεμβολή ανάμεσά τους. */
export function poly(points, nPerSeg = 10) {
  let out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg = line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, nPerSeg);
    out = out.concat(i === 0 ? seg : seg.slice(1));
  }
  return out;
}

/** Ενώνει επιμέρους διαδρομές σε ΕΝΑ stroke, αφαιρώντας διπλά ακριανά σημεία. */
export function chain(...parts) {
  const out = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-4) out.push(p);
    }
  }
  return out;
}

/** Δομή ενός stroke. order ξεκινά από 1. */
export function stroke(order, points, { arrow = true, startLabel = null } = {}) {
  return { order, points, arrow, startLabel: startLabel ?? String(order) };
}

/** Συνολικό μήκος μιας διαδρομής σημείων (normalized μονάδες). */
export function pathLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return L;
}

/** Σημείο σε ποσοστό t (0..1) του μήκους + εφαπτομενική γωνία (rad). Για βέλη. */
export function pointAtFraction(points, t) {
  const total = pathLength(points);
  if (total === 0) return { x: points[0].x, y: points[0].y, angle: 0 };
  const target = total * Math.max(0, Math.min(1, t));
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      const x = points[i - 1].x + (points[i].x - points[i - 1].x) * f;
      const y = points[i - 1].y + (points[i].y - points[i - 1].y) * f;
      const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
      return { x, y, angle };
    }
    acc += seg;
  }
  const a = points[points.length - 1], b = points[points.length - 2] || a;
  return { x: a.x, y: a.y, angle: Math.atan2(a.y - b.y, a.x - b.x) };
}
