// ─────────────────────────────────────────────────────────────────────────────
// Tracer — ΕΝΘΑΡΡΥΝΤΙΚΟΣ έλεγχος ιχνηλάτησης (ΟΧΙ τιμωρητικός).
// Γράμματα: επαρκής κάλυψη του σχήματος, ανεξάρτητα από φορά/σειρά/αφετηρία.
// Αριθμοί: διατηρείται ο υπάρχων έλεγχος φοράς και σειράς.
// Δεν εμφανίζει «κόκκινο Χ», δεν σβήνει — δίνει ΑΠΑΛΕΣ θετικές υποδείξεις.
// Ο ρυθμιστής αυστηρότητας ελέγχει ανοχή απόστασης & κατώφλι κάλυψης.
// ─────────────────────────────────────────────────────────────────────────────
import { pathLength } from '../letters/_dsl.js';

const SAMPLES = 120;
// Unsigned local alignment: about 57 degrees of freedom on either side of
// a model tangent. This is geometry, not the arrow's suggested writing order.
const MIN_SHAPE_ALIGNMENT = 0.55;

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
    if (!/^\d+$/.test(letter.char)) return new ShapeTracer(letter, strictness);
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
    // Check the actual lift endpoint here, rather than during dense feed:
    // feed can advance multiple connected strokes before the final pointer.
    const endsAtTarget = this.lastPointer && this._dist(this.lastPointer,this.samples[this.active].at(-1)) <= Math.max(this._tol() * 0.85,0.055);
    if (this._strokeDone(this.active) && endsAtTarget) {
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

/**
 * Shape-first letter tracing. Arrows teach a suggested movement; they are not
 * acceptance gates. Only actual ink segments earn coverage, in any direction
 * or order. Keeping each model stroke separately prevents a missing component
 * from being hidden by good coverage of a longer neighbouring component.
 */
class ShapeTracer {
  constructor(letter, strictness) {
    this.samples = letter.strokes.map(st => resample(st.points, SAMPLES));
    this.tangents = this.samples.map(points => points.map((_, k) => {
      const a = points[Math.max(0, k - 1)], b = points[Math.min(points.length - 1, k + 1)];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      return length ? {x:(b.x - a.x) / length,y:(b.y - a.y) / length} : null;
    }));
    this.lengths = letter.strokes.map(st => pathLength(st.points));
    this.totalLength = this.lengths.reduce((sum, length) => sum + length, 0);
    this.setStrictness(strictness);
    this.reset();
  }
  setStrictness(value) {
    const s = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.4));
    this.tol = 0.075 - 0.025 * s;
    this.coverNeed = 0.88 + 0.08 * s;
    this.maxTravelRatio = 3.2 - 1.2 * s;
    this.maxOffPathRatio = 0.20 - 0.08 * s;
  }
  setToleranceFloor(value) {
    this.tolFloor = Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  _tol() {
    // The pixel floor helps on small letters, but cannot swallow a missing arm.
    return Math.max(this.tol, Math.min(this.tolFloor || 0, 0.085));
  }
  reset() {
    this.covered = this.samples.map(points => points.map(() => false));
    this.counts = this.samples.map(() => 0);
    this.travel = 0;
    this.offPathTravel = 0;
    this.done = false;
    this.touchAllowed = false;
    this.lastPointer = null;
    this.retry = false;
  }
  snapshot() {
    return {
      covered: this.covered.map(row => row.slice()), counts: this.counts.slice(),
      travel: this.travel, offPathTravel: this.offPathTravel, done: this.done,
      touchAllowed: this.touchAllowed, retry: this.retry,
      lastPointer: this.lastPointer ? {...this.lastPointer} : null,
    };
  }
  restore(saved) {
    if (!saved) return;
    this.covered = saved.covered.map(row => row.slice());
    this.counts = saved.counts.slice();
    this.travel = saved.travel; this.offPathTravel = saved.offPathTravel;
    this.done = saved.done; this.touchAllowed = saved.touchAllowed; this.retry = saved.retry;
    this.lastPointer = saved.lastPointer ? {...saved.lastPointer} : null;
  }
  get totalStrokes() { return this.samples.length; }
  get active() { return this.samples.findIndex((_, i) => this.coverage(i) < this.coverNeed); }
  get progress() { return this.counts.map(count => count - 1); }
  coverage(i) { return this.counts[i] / this.samples[i].length; }
  beginTouch(point) {
    if (this.done) return null;
    // A rejected scribble must not poison the next clean attempt. Partial valid
    // writing remains available across lifts, including lifts at intersections.
    if (this.retry) this.reset();
    this.touchAllowed = true;
    this.lastPointer = {...point};
    return null;
  }
  _mark(point, radiusSquared, motion) {
    let nearest = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const samples = this.samples[i], covered = this.covered[i];
      for (let k = 0; k < samples.length; k++) {
        const dx = point.x - samples[k].x, dy = point.y - samples[k].y;
        const distance = dx * dx + dy * dy;
        const tangent = this.tangents[i][k];
        // Nearby ink must follow the local geometry, in EITHER direction.
        // Otherwise broad pixel tolerance lets raster scans fill curved forms.
        const followsShape = motion && (!tangent || Math.abs(motion.x * tangent.x + motion.y * tangent.y) >= MIN_SHAPE_ALIGNMENT);
        if (followsShape) nearest = Math.min(nearest, distance);
        if (distance <= radiusSquared && followsShape && !covered[k]) {
          covered[k] = true; this.counts[i]++;
        }
      }
    }
    return nearest;
  }
  feed(points) {
    if (this.done || !this.touchAllowed) return null;
    const radiusSquared = this._tol() ** 2;
    for (const point of points) {
      const start = this.lastPointer || point;
      const distance = Math.hypot(point.x - start.x, point.y - start.y);
      const motion = distance ? {x:(point.x-start.x)/distance,y:(point.y-start.y)/distance} : null;
      const steps = Math.max(1, Math.min(1024, Math.ceil(distance / 0.01)));
      this.travel += distance;
      // Interpolate the actual straight pointer segment, never a target curve.
      // beginTouch resets lastPointer so lifted movements never draw a bridge.
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const p = {x: start.x + (point.x - start.x) * t, y: start.y + (point.y - start.y) * t};
        if (this._mark(p, radiusSquared, motion) > radiusSquared) this.offPathTravel += distance / steps;
      }
      this.lastPointer = {...point};
    }
    return null;
  }
  endTouch() {
    if (this.done || !this.touchAllowed) return null;
    this.touchAllowed = false;
    this.retry = this.travel > this.totalLength * this.maxTravelRatio
      || this.offPathTravel > Math.max(0.10, this.totalLength * this.maxOffPathRatio);
    if (this.retry) return {type:'shape', msg:'Πάμε ξανά κοντά στο σχήμα του γράμματος 🙂'};
    const radiusSquared = this._tol() ** 2;
    const endsOnShape = this.lastPointer && this.samples.some(points => points.some(p =>
      (p.x - this.lastPointer.x) ** 2 + (p.y - this.lastPointer.y) ** 2 <= radiusSquared));
    if (endsOnShape && this.travel >= this.totalLength * 0.72
      && this.samples.every((_, i) => this.coverage(i) >= this.coverNeed)) {
      this.done = true;
      return {type:'complete'};
    }
    return {type:'partial', msg:'Συμπλήρωσε το σχήμα του γράμματος 🙂'};
  }
}
