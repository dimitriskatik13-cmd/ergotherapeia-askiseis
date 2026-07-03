// ─────────────────────────────────────────────────────────────────────────────
// Tracer — ΕΝΘΑΡΡΥΝΤΙΚΟΣ έλεγχος ιχνηλάτησης (ΟΧΙ τιμωρητικός).
// Ελέγχει: σωστή άκρη έναρξης (①), φορά, σειρά strokes, επαρκή κάλυψη.
// Δεν εμφανίζει «κόκκινο Χ», δεν σβήνει — δίνει ΑΠΑΛΕΣ θετικές υποδείξεις.
// Ο ρυθμιστής αυστηρότητας ελέγχει ανοχή απόστασης & κατώφλι κάλυψης.
// ─────────────────────────────────────────────────────────────────────────────
import { pathLength } from '../letters/_dsl.js';

const SAMPLES = 44;

function resample(points, n) {
  const total = pathLength(points);
  if (total === 0) return points.map((p) => ({ x: p.x, y: p.y }));
  const step = total / (n - 1);
  const out = [{ x: points[0].x, y: points[0].y }];
  let i = 1, acc = 0, prev = points[0];
  for (let k = 1; k < n - 1; k++) {
    const target = k * step;
    while (i < points.length) {
      const seg = Math.hypot(points[i].x - prev.x, points[i].y - prev.y);
      if (acc + seg >= target) {
        const f = seg === 0 ? 0 : (target - acc) / seg;
        out.push({ x: prev.x + (points[i].x - prev.x) * f, y: prev.y + (points[i].y - prev.y) * f });
        break;
      }
      acc += seg; prev = points[i]; i++;
    }
  }
  out.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  return out;
}

export class Tracer {
  constructor(letter, strictness = 0.4) {
    this.samples = letter.strokes.map((s) => resample(s.points, SAMPLES));
    this.setStrictness(strictness);
    this.reset();
  }

  setStrictness(s) {
    s = Math.max(0, Math.min(1, s));
    this.tol = 0.115 - 0.070 * s;       // χαλαρό 0.115 → αυστηρό 0.045
    this.coverNeed = 0.66 + 0.28 * s;   // χαλαρό 0.66 → αυστηρό 0.94 (πιο ακριβές)
  }

  /** Ελάχιστη ανοχή σε normalized μονάδες — ώστε στα ΜΙΚΡΑ μεγέθη γράμματος η
   *  ανοχή να μην πέφτει κάτω από λίγα pixels (φυσικό όριο δαχτύλου/Pencil). */
  setToleranceFloor(f) { this.tolFloor = Math.max(0, f || 0); }

  _tol() { return Math.max(this.tol, this.tolFloor || 0); }

  reset() {
    this.active = 0;
    this.covered = this.samples.map((arr) => new Array(arr.length).fill(false));
    this.done = false;
    this.touchStartIdx = null;
  }

  get totalStrokes() { return this.samples.length; }

  _nearest(stroke, pt) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < stroke.length; i++) {
      const d = Math.hypot(stroke[i].x - pt.x, stroke[i].y - pt.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return { idx: best, dist: bestD };
  }

  coverage(strokeIdx) {
    const c = this.covered[strokeIdx];
    let n = 0;
    for (const v of c) if (v) n++;
    return n / c.length;
  }

  /** Έναρξη μιας πινελιάς του παιδιού. Επιστρέφει απαλή υπόδειξη (ή null). */
  beginTouch(pt) {
    if (this.done) return null;
    const tol = this._tol();
    const stroke = this.samples[this.active];
    const { idx, dist } = this._nearest(stroke, pt);
    this.touchStartIdx = idx;
    if (dist > tol * 2.2) {
      return { type: 'offpath', msg: 'Ξεκίνα πάνω στη γραμμή 🙂' };
    }
    const startCovered = this.covered[this.active][0];
    // Αν ξεκίνησε κοντά στο ΤΕΛΟΣ ενώ η αρχή ① δεν έχει καλυφθεί → απαλή υπόδειξη
    if (!startCovered && idx > stroke.length * 0.6) {
      return { type: 'wrongstart', msg: 'Ξεκίνα από το ① 👆' };
    }
    return null;
  }

  /** Τροφοδότηση σημείων (normalized) κατά τη γραφή. */
  feed(points) {
    if (this.done) return null;
    const tol = this._tol();
    const stroke = this.samples[this.active];
    const cov = this.covered[this.active];
    for (const pt of points) {
      const { idx, dist } = this._nearest(stroke, pt);
      if (dist <= tol) {
        cov[idx] = true;
        // απαλό «πάχος» κάλυψης: μάρκαρε και τους άμεσους γείτονες
        if (idx > 0 && dist <= tol * 0.85) cov[idx - 1] = true;
        if (idx < cov.length - 1 && dist <= tol * 0.85) cov[idx + 1] = true;
      }
    }
    // Αν το τρέχον stroke ολοκληρώθηκε ΚΑΤΑ τη διάρκεια της κίνησης, προχώρησε
    // στο επόμενο — έτσι το παιδί μπορεί να γράψει π.χ. το η με ΜΙΑ συνεχόμενη
    // κίνηση (①→②) χωρίς να σηκώσει το χέρι. Η ολοκλήρωση ΤΟΥ ΓΡΑΜΜΑΤΟΣ όμως
    // κρίνεται ΜΟΝΟ στο σήκωμα (endTouch) — ποτέ ήχος/εφέ ενώ ακόμα γράφει.
    while (!this.done && this.active < this.samples.length - 1 && this._strokeDone(this.active)) {
      this.active += 1;
      this.touchStartIdx = null;   // η αφή δεν «ξεκίνησε» σε αυτό το stroke
    }
    return null;
  }

  /** Ένα stroke θεωρείται «τελειωμένο» μόνο αν: επαρκής κάλυψη ΚΑΙ ξεκίνησε
   *  από την αρχή ① ΚΑΙ έφτασε ΩΣ ΤΟ ΤΕΛΟΣ της γραμμής. */
  _strokeDone(i) {
    const cov = this.covered[i];
    const n = cov.length;
    const startOk = cov[0] || cov[1] || cov[2];
    const endOk = cov[n - 1] || cov[n - 2] || cov[n - 3];
    return startOk && endOk && this.coverage(i) >= this.coverNeed;
  }

  /** Τέλος πινελιάς (σήκωμα χεριού) — ΕΔΩ μόνο κρίνεται η ολοκλήρωση. */
  endTouch() {
    if (this.done) return null;
    if (this._strokeDone(this.active)) {
      if (this.active >= this.samples.length - 1) {
        this.done = true;
        return { type: 'complete' };
      }
      this.active += 1;
      this.touchStartIdx = null;
      return { type: 'stroke-done', next: this.active };
    }
    // Αν η αφή ΔΕΝ ξεκίνησε σε αυτό το stroke (συνεχόμενη κίνηση που πέρασε ήδη
    // στο επόμενο), μην δίνεις υποδείξεις — το παιδί απλώς σήκωσε το χέρι.
    if (this.touchStartIdx === null) return null;
    // Απαλές, μη τιμωρητικές υποδείξεις
    const cov = this.covered[this.active];
    const cv = this.coverage(this.active);
    if (cv >= this.coverNeed && !(cov[0] || cov[1])) {
      return { type: 'wrongstart', msg: 'Ξεκίνα από το ① 👆' };
    }
    if (cv > 0.18) {
      return { type: 'partial', msg: 'Ακολούθησε όλη τη γραμμή ως το τέλος 👍' };
    }
    return null;
  }
}
