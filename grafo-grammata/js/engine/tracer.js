// ─────────────────────────────────────────────────────────────────────────────
// Tracer — ΕΝΘΑΡΡΥΝΤΙΚΟΣ έλεγχος ιχνηλάτησης (ΟΧΙ τιμωρητικός).
// Ελέγχει: σωστή άκρη έναρξης (①), φορά, σειρά strokes, επαρκή κάλυψη.
// Δεν εμφανίζει «κόκκινο Χ», δεν σβήνει — δίνει ΑΠΑΛΕΣ θετικές υποδείξεις.
// Ο ρυθμιστής αυστηρότητας ελέγχει ανοχή απόστασης & κατώφλι κάλυψης.
// ─────────────────────────────────────────────────────────────────────────────
import { pathLength } from '../letters/_dsl.js';

const SAMPLES = 120;

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
    // User-defined easier zone includes the midpoint. Above 50%, preserve
    // the previously approved strict criteria exactly.
    if (s <= 0.5) {
      const t = s * 2;
      this.tol = 0.17 - 0.035 * t;
      this.endFraction = 0.78 + 0.06 * t;
      this.maxTravelRatio = 3.2 - 0.4 * t;
      this.coverNeed = 0.60 + 0.06 * t;
      this.floorMultiplier = 1.2 - 0.2 * t;
      return;
    }
    this.floorMultiplier = 1;
    this.tol = 0.135 - 0.075 * s;
    this.endFraction = 0.84 + 0.12 * s;
    this.maxTravelRatio = 2.8 - 0.8 * s;
    this.coverNeed = 0.66 + 0.28 * s;
  }
  setToleranceFloor(f) { this.tolFloor = Math.max(0, f || 0); }
  _tol() { return Math.max(this.tol, (this.tolFloor || 0) * this.floorMultiplier); }
  _startTol() { return Math.min(0.14, Math.max(this._tol(), 0.075)); }
  reset() {
    this.active = 0;
    this.covered = this.samples.map((arr) => new Array(arr.length).fill(false));
    this.progress = this.samples.map(() => -1);
    this.lastAccepted = this.samples.map(() => null);
    this.travel = this.samples.map(() => 0);
    this.travelPoint = this.samples.map(() => null);
    this.done = false;
    this.touchStartIdx = null;
    this.touchAllowed = false;
    this.issue = null;
    this.awaitStart = true;
    this.lastPointer = null;
  }
  snapshot() {
    return {
      active: this.active, done: this.done, touchStartIdx: this.touchStartIdx,
      touchAllowed: this.touchAllowed, issue: this.issue, awaitStart: this.awaitStart,
      lastPointer: this.lastPointer ? {...this.lastPointer} : null,
      lastAccepted: this.lastAccepted.map(p=>p ? {...p} : null),
      travel: this.travel.slice(), travelPoint: this.travelPoint.map(p=>p ? {...p} : null),
      progress: this.progress.slice(), covered: this.covered.map((c) => c.slice()),
    };
  }
  restore(s) {
    if (!s) return;
    this.active = s.active; this.done = s.done; this.touchStartIdx = s.touchStartIdx;
    this.touchAllowed = s.touchAllowed; this.issue = s.issue; this.awaitStart = s.awaitStart;
    this.lastPointer = s.lastPointer ? {...s.lastPointer} : null;
    this.lastAccepted = s.lastAccepted.map(p=>p ? {...p} : null);
    this.travel = s.travel.slice(); this.travelPoint = s.travelPoint.map(p=>p ? {...p} : null);
    this.progress = s.progress.slice(); this.covered = s.covered.map((c) => c.slice());
  }
  get totalStrokes() { return this.samples.length; }
  coverage(i) { return this.covered[i].filter(Boolean).length / this.covered[i].length; }
  _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  _hint(type) {
    return { type, msg: type === 'direction'
      ? 'Πάμε ξανά προς το βελάκι 🙂'
      : `Ξεκίνα από το ${this.active + 1} 👆` };
  }
  beginTouch(pt) {
    if (this.done) return null;
    this.issue = null; this.touchAllowed = false; this.lastPointer = {...pt};
    const i = this.active, st = this.samples[i], p = this.progress[i];
    this.travelPoint[i] = {...pt};
    // Resume wins at self-intersections: the same position can be both the
    // original start and an intermediate point of a continuous beta/loop.
    const mustRestart = this.travel[i] > pathLength(st) * this.maxTravelRatio;
    if (!mustRestart && p > 3 && this._dist(pt, st[p]) <= this._startTol()) {
      this.awaitStart = false; this.touchAllowed = true; this.touchStartIdx = p;
      return null;
    }
    if (this._dist(pt, st[0]) <= this._startTol()) {
      this.progress[i] = 0; this.travel[i] = 0; this.covered[i].fill(false); this.covered[i][0] = true;
      this.awaitStart = false; this.touchAllowed = true; this.touchStartIdx = 0;
      return null;
    }
    if (p >= 0 && this._dist(pt, st[p]) <= this._startTol()) {
      this.awaitStart = false; this.touchAllowed = true; this.touchStartIdx = p;
      return null;
    }
    // A stroke may approach the start from its numbered badge. Arm on entering
    // the true start instead of discarding the entire pointer gesture.
    this.touchAllowed = true; this.awaitStart = true;
    this.touchStartIdx = null; this.issue = 'wrongstart';
    return this._hint('wrongstart');
  }
  feed(points) {
    if (this.done || !this.touchAllowed) return null;
    // Browsers may deliver sparse pointer events. Interpolate the actual
    // straight pointer segment, never the target curve, to preserve that motion.
    const dense = [];
    for (const pt of points) {
      const a = this.lastPointer || pt;
      const count = Math.max(1, Math.min(512, Math.ceil(this._dist(a,pt) / 0.003)));
      for (let k=1;k<=count;k++) dense.push({x:a.x+(pt.x-a.x)*k/count,y:a.y+(pt.y-a.y)*k/count});
      this.lastPointer = {...pt};
    }
    for (const pt of dense) {
      const i = this.active, st = this.samples[i], n = st.length;
      if (this.awaitStart) {
        // Consecutive strokes can be connected, but the next actual start must be reached.
        if (this._dist(pt, st[0]) > this._startTol()) continue;
        this.progress[i] = 0; this.travel[i] = 0; this.travelPoint[i] = {...pt}; this.covered[i].fill(false); this.covered[i][0] = true; this.awaitStart = false; this.issue = null;
      }
      const previousPointer = this.travelPoint[i];
      if (previousPointer) this.travel[i] += this._dist(previousPointer,pt);
      this.travelPoint[i] = {...pt};
      const p = this.progress[i];
      // A bounded forward window disambiguates loops/crossings and prevents
      // jumping from the start of a closed curve straight to its coincident end.
      let best = p, bestD = Infinity;
      const lo = Math.max(0, p - 6), hi = Math.min(n - 1, p + 18);
      for (let k = lo; k <= hi; k++) {
        const d = this._dist(pt, st[k]);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (bestD > this._tol()) continue;
      if (best < p - 5) {
        // Small corrections are tolerated; a sustained reversal earns no progress.
        this.issue = 'direction';
        continue;
      }
      if (best > p) {
        // A wide pixel tolerance must not turn backwards motion around a small
        // loop into forward progress. Ignore clearly opposed local movement.
        if (previousPointer && p >= 0) {
          const mx=pt.x-previousPointer.x, my=pt.y-previousPointer.y;
          const tx=st[best].x-st[p].x, ty=st[best].y-st[p].y;
          const magnitude=Math.hypot(mx,my)*Math.hypot(tx,ty);
          if (magnitude > 1e-9 && (mx*tx+my*ty) / magnitude < -0.35) {
            this.issue='direction';
            continue;
          }
        }
        // Require the intervening path to stay near this pointer segment.
        // This also avoids accepting shortcuts across a tight corner.
        const a = st[p], dx = pt.x-a.x, dy = pt.y-a.y, den = dx*dx+dy*dy;
        let follows = true;
        for (let k = p+1; k < best; k++) {
          const t = den ? Math.max(0, Math.min(1, ((st[k].x-a.x)*dx+(st[k].y-a.y)*dy)/den)) : 0;
          if (this._dist(st[k], {x:a.x+t*dx,y:a.y+t*dy}) > this._tol()) follows = false;
        }
        if (!follows) continue;
        for (let k = p; k <= best; k++) this.covered[i][k] = true;
        this.progress[i] = best;
      }
      this.lastAccepted[i] = {...pt};
      if (this._strokeDone(i) && i < this.samples.length - 1) {
        this.active += 1; this.awaitStart = true; this.touchStartIdx = null;
      }
    }
    return null;
  }
  _strokeDone(i) {
    const st=this.samples[i], last=this.lastAccepted[i];
    // Accept a small natural finishing gap. The slider now affects completion,
    // while ordered progression and proximity to the correct end are still required.
    return this.progress[i] >= Math.ceil((st.length - 1) * this.endFraction)
      && this.covered[i][0] && this.coverage(i) >= this.coverNeed
      && this.travel[i] <= pathLength(st) * this.maxTravelRatio
      && last && this._dist(last,st.at(-1)) <= Math.max(this._tol() * 0.85,0.055);
  }
  endTouch() {
    if (this.done) return null;
    this.touchAllowed = false;
    if (this._strokeDone(this.active)) {
      if (this.active === this.samples.length - 1) {
        this.done = true;
        return {type:'complete'};
      }
      this.active += 1; this.awaitStart = true;
      return {type:'stroke-done',next:this.active};
    }
    if (this.travel[this.active] > pathLength(this.samples[this.active]) * this.maxTravelRatio) {
      return {type:'shape',msg:'Πάμε ξανά κοντά στο σχήμα του γράμματος 🙂'};
    }
    if (this.issue) return this._hint(this.issue);
    if (this.awaitStart) return null;
    return {type:'partial',msg:'Συνέχισε προς το βελάκι μέχρι το τέλος 🙂'};
  }
}
