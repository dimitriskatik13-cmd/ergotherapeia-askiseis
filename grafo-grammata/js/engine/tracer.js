// ─────────────────────────────────────────────────────────────────────────────
// Tracer — ΕΝΘΑΡΡΥΝΤΙΚΟΣ έλεγχος ιχνηλάτησης (ΟΧΙ τιμωρητικός).
// Γράμματα: επαρκής κάλυψη του σχήματος, ανεξάρτητα από φορά/σειρά/αφετηρία.
// Αριθμοί: διατηρείται ο υπάρχων έλεγχος φοράς και σειράς.
// Δεν εμφανίζει «κόκκινο Χ» — δίνει ΑΠΑΛΕΣ θετικές υποδείξεις. Προσπάθεια που
// ξαναρχίζει μένει αχνή στο χαρτί ώσπου να ξαναγράψει το παιδί (βλ. Session).
// Ο ρυθμιστής αυστηρότητας ελέγχει ανοχή απόστασης & κατώφλι κάλυψης.
// ─────────────────────────────────────────────────────────────────────────────
import { pathLength } from '../letters/_dsl.js';

const SAMPLES = 120;
// Unsigned local alignment: about 57 degrees of freedom on either side of
// a model tangent. This is geometry, not the arrow's suggested writing order.
const MIN_SHAPE_ALIGNMENT = 0.55;
// Slow or shaky handwriting delivers samples less than a pixel apart, where
// the raw point-to-point heading is sensor noise. Letter direction and travel
// are therefore read from smoothed motion: a follower dragged on a short leash
// behind the pointer. Coarse steps give the heading while the leash is slack
// and measure off-shape ink without counting jitter.
// Lengths are fractions of the 12 px tolerance floor, capped in letter units
// so that small letters keep their curves.
const LEASH = 1 / 2, MAX_LEASH = 0.02;    // 6 px
const STRIDE = 1 / 6, MAX_STRIDE = 0.008; // 2 px
const DEFAULT_FLOOR = 12 / 320;
// Writing that stops a little short of the start dot or of the tip is still
// the same shape, so both ends of an open stroke are optional. A closed stroke
// such as ο keeps its ends: there the join is the shape. So does a stroke
// that mostly runs along a neighbour, like the leg of α beside the bowl: its
// ends are what tells it apart.
const CLOSED_GAP = 0.05, WIDEST_TOLERANCE = 0.085, MIN_OWN_SHARE = 0.5, OWN_MARGIN = 0.05;
// Such a stroke is mostly covered by the neighbour's ink alone, so it counts
// as written only when the part that is its own has been written too.
const OWN_NEED = 0.7, MIN_OWN_SAMPLES = 6;
const LIFT_REACH = 1.5;

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
    this.lengths = this.samples.map((points) => pathLength(points));
    // Closest the middle of a stroke comes back beside its own start, having
    // travelled at least twice that far. Infinity for a stroke that never does.
    this.fold = this.samples.map((points, i) => {
      const step = this.lengths[i] / (points.length - 1);
      return Math.min(Infinity, ...points
        .map((p, k) => ({ gap: Math.hypot(p.x - points[0].x, p.y - points[0].y), run: k * step, k }))
        .filter(({ gap, run, k }) => k >= points.length * 0.2 && k <= points.length * 0.8 && run >= 2 * gap)
        .map(({ gap }) => gap));
    });
    this.setStrictness(strictness);
    this.reset();
  }
  setStrictness(s) {
    s = Math.max(0, Math.min(1, s));
    // How far before its tip a stroke may stop, as a length. A fraction alone
    // left a short bar almost no room while a long curve had plenty.
    this.endReach = 0.12 - 0.07 * s;
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
  // Direction and order are still checked, but the pen need not land on the
  // start dot or lift exactly at the tip: same leniency as the letters.
  // Picking a stroke up again where it stopped keeps its earlier reach.
  _resumeTol() { return Math.min(0.14, Math.max(this._tol(), 0.075)); }
  // The start zone never swallows a later part of the same stroke that folds
  // back beside the dot, such as the stem of 1 next to its flag.
  _startTol(i) {
    const reach = Math.min(0.20, Math.max(this._tol() * 1.4, 0.075));
    return Math.max(this._resumeTol(), Math.min(reach, this.fold[i] * 0.85));
  }
  _endRadius() { return Math.max(this._tol() * 1.15, 0.075); }
  _endFraction(i) { return Math.max(0.6, Math.min(this.endFraction, 1 - this.endReach / this.lengths[i])); }
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
    // How many times each stroke has started over. The page drops the ink of
    // an abandoned attempt when this moves, so the paper matches the progress.
    this.arms = this.samples.map(() => 0);
  }
  snapshot() {
    return {
      active: this.active, done: this.done, touchStartIdx: this.touchStartIdx,
      touchAllowed: this.touchAllowed, issue: this.issue, awaitStart: this.awaitStart,
      lastPointer: this.lastPointer ? {...this.lastPointer} : null,
      lastAccepted: this.lastAccepted.map(p=>p ? {...p} : null),
      travel: this.travel.slice(), travelPoint: this.travelPoint.map(p=>p ? {...p} : null),
      progress: this.progress.slice(), covered: this.covered.map((c) => c.slice()),
      arms: this.arms.slice(),
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
    this.arms = s.arms.slice();
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
    if (!mustRestart && p > 3 && this._dist(pt, st[p]) <= this._resumeTol()) {
      this.awaitStart = false; this.touchAllowed = true; this.touchStartIdx = p;
      return null;
    }
    if (this._dist(pt, st[0]) <= this._startTol(i)) {
      this.progress[i] = 0; this.travel[i] = 0; this.covered[i].fill(false); this.covered[i][0] = true;
      this.arms[i]++;
      this.awaitStart = false; this.touchAllowed = true; this.touchStartIdx = 0;
      return null;
    }
    if (p >= 0 && this._dist(pt, st[p]) <= this._resumeTol()) {
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
        if (this._dist(pt, st[0]) > this._startTol(i)) continue;
        this.progress[i] = 0; this.travel[i] = 0; this.travelPoint[i] = {...pt}; this.covered[i].fill(false); this.covered[i][0] = true; this.awaitStart = false; this.issue = null;
        this.arms[i]++;
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
    return this.progress[i] >= Math.ceil((st.length - 1) * this._endFraction(i))
      && this.covered[i][0] && this.coverage(i) >= this.coverNeed
      && this.travel[i] <= pathLength(st) * this.maxTravelRatio
      && last && this._dist(last,st.at(-1)) <= this._endRadius();
  }
  endTouch() {
    if (this.done) return null;
    this.touchAllowed = false;
    // Check the actual lift endpoint here, rather than during dense feed:
    // feed can advance multiple connected strokes before the final pointer.
    const endsAtTarget = this.lastPointer && this._dist(this.lastPointer,this.samples[this.active].at(-1)) <= this._endRadius();
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
    this.closed = this.samples.map(points =>
      Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) <= CLOSED_GAP);
    // Samples no other stroke could cover, even at the widest tolerance.
    this.own = this.samples.map((points, i) => points.map((p, k) => !this.samples.some((others, j) =>
      j !== i && others.some((q, m) => {
        const a = this.tangents[i][k], b = this.tangents[j][m];
        return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= WIDEST_TOLERANCE ** 2
          && (!a || !b || Math.abs(a.x * b.x + a.y * b.y) >= MIN_SHAPE_ALIGNMENT);
      }))));
    this.setStrictness(strictness);
    this.reset();
  }
  setStrictness(value) {
    const s = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.4));
    this.tol = 0.075 - 0.025 * s;
    this.coverNeed = 0.88 + 0.08 * s;
    this.maxTravelRatio = 3.2 - 1.2 * s;
    // Smoothed headings turn gradually at corners, which forgives a little
    // ink there. The loose end of the range is capped to keep scans rejected.
    this.maxOffPathRatio = Math.min(0.16, 0.20 - 0.08 * s);
    // Optional length at each open end: a fixed reach, but never more than a
    // share of the stroke, so a short bar still has to be written.
    const reach = 0.12 - 0.06 * s, share = 0.18 - 0.08 * s;
    this.core = this.samples.map((points, i) => {
      const last = points.length - 1;
      const ownShare = this.own[i].filter(Boolean).length / (last + 1);
      let skip = this.closed[i] || ownShare < MIN_OWN_SHARE ? 0
        : Math.round(Math.min(reach / this.lengths[i], share) * last);
      // What stays required must still fail without this stroke's own ink.
      const distinct = (trim) => {
        const size = last + 1 - 2 * trim;
        const own = this.own[i].slice(trim, last + 1 - trim).filter(Boolean).length;
        return own >= (1 - this.coverNeed + OWN_MARGIN) * size;
      };
      while (skip > 0 && !distinct(skip)) skip--;
      return points.map((_, k) => k >= skip && k <= last - skip);
    });
    this.coreSize = this.core.map(row => row.filter(Boolean).length);
    this.coreLength = this.lengths.reduce((sum, length, i) => sum + length * this.coreSize[i] / this.samples[i].length, 0);
    // The slider can move mid-attempt; ink already written keeps counting.
    if (this.covered) this.counts = this.covered.map((row, i) => row.filter((hit, k) => hit && this.core[i][k]).length);
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
    this.marked = 0;
    this.lifts = 0;
    this.travel = 0;
    this.offPathTravel = 0;
    this.done = false;
    this.touchAllowed = false;
    this.lastPointer = null;
    this.retry = false;
    this.follower = null;
    this.anchor = null;
    this.lead = null;
    this.heading = null;
    this.touchBase = 0;
  }
  snapshot() {
    const copy = point => point ? {...point} : null;
    return {
      covered: this.covered.map(row => row.slice()), counts: this.counts.slice(), marked: this.marked, lifts: this.lifts,
      travel: this.travel, offPathTravel: this.offPathTravel, done: this.done,
      touchAllowed: this.touchAllowed, retry: this.retry,
      lastPointer: copy(this.lastPointer), follower: copy(this.follower),
      anchor: copy(this.anchor), lead: copy(this.lead), heading: copy(this.heading),
      touchBase: this.touchBase,
    };
  }
  restore(saved) {
    if (!saved) return;
    const copy = point => point ? {...point} : null;
    this.covered = saved.covered.map(row => row.slice());
    this.counts = saved.counts.slice(); this.marked = saved.marked; this.lifts = saved.lifts;
    this.travel = saved.travel; this.offPathTravel = saved.offPathTravel;
    this.done = saved.done; this.touchAllowed = saved.touchAllowed; this.retry = saved.retry;
    this.lastPointer = copy(saved.lastPointer); this.follower = copy(saved.follower);
    this.anchor = copy(saved.anchor); this.lead = copy(saved.lead); this.heading = copy(saved.heading);
    this.touchBase = saved.touchBase;
  }
  get totalStrokes() { return this.samples.length; }
  get active() { return this.samples.findIndex((_, i) => this.coverage(i) < this.coverNeed); }
  get progress() { return this.counts.map(count => count - 1); }
  coverage(i) { return this.counts[i] / this.coreSize[i]; }
  _ownWritten(i) {
    let own = 0, hit = 0;
    for (let k = 0; k < this.own[i].length; k++) if (this.own[i][k]) { own++; if (this.covered[i][k]) hit++; }
    return own < MIN_OWN_SAMPLES || hit >= OWN_NEED * own;
  }
  beginTouch(point) {
    if (this.done) return null;
    // A rejected scribble must not poison the next clean attempt. Partial valid
    // writing remains available across lifts, including lifts at intersections.
    if (this.retry) this.reset();
    this.touchAllowed = true;
    this.lastPointer = {...point};
    // Lifted movements never draw a bridge, so smoothing restarts here too.
    this.follower = {...point}; this.anchor = {...point};
    this.lead = null; this.heading = null;
    this.touchBase = this.marked;
    return null;
  }
  /** Drag the follower behind the pointer; returns how far it advanced. */
  _follow(point, leash) {
    const dx = point.x - this.follower.x, dy = point.y - this.follower.y;
    const distance = Math.hypot(dx, dy);
    // A slack leash right after a start or a reversal has no usable heading.
    this.lead = distance >= leash / 2 ? {x: dx / distance, y: dy / distance} : null;
    if (distance <= leash) return 0;
    const advance = distance - leash;
    this.follower.x += dx / distance * advance; this.follower.y += dy / distance * advance;
    return advance;
  }
  _step(point, stride) {
    const dx = point.x - this.anchor.x, dy = point.y - this.anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance < stride) return 0;
    this.heading = {x: dx / distance, y: dy / distance};
    this.anchor = {...point};
    return distance;
  }
  _followsShape(tangent) {
    // Nearby ink must follow the local geometry, in EITHER direction.
    // Otherwise broad pixel tolerance lets raster scans fill curved forms.
    const motion = this.lead || this.heading;
    if (!motion) return false;
    return !tangent || Math.abs(motion.x * tangent.x + motion.y * tangent.y) >= MIN_SHAPE_ALIGNMENT;
  }
  _mark(point, radiusSquared) {
    let nearest = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const samples = this.samples[i], covered = this.covered[i];
      for (let k = 0; k < samples.length; k++) {
        const dx = point.x - samples[k].x, dy = point.y - samples[k].y;
        const distance = dx * dx + dy * dy;
        if (distance > radiusSquared && distance >= nearest) continue;
        if (!this._followsShape(this.tangents[i][k])) continue;
        if (distance < nearest) nearest = distance;
        if (distance <= radiusSquared && !covered[k]) {
          covered[k] = true; this.marked++;
          if (this.core[i][k]) this.counts[i]++;
        }
      }
    }
    return nearest;
  }
  feed(points) {
    if (this.done || !this.touchAllowed) return null;
    const radiusSquared = this._tol() ** 2;
    const floor = this.tolFloor || DEFAULT_FLOOR;
    const leash = Math.min(floor * LEASH, MAX_LEASH), stride = Math.min(floor * STRIDE, MAX_STRIDE);
    for (const point of points) {
      const start = this.lastPointer || point;
      const distance = Math.hypot(point.x - start.x, point.y - start.y);
      const steps = Math.max(1, Math.min(1024, Math.ceil(distance / 0.01)));
      // Interpolate the actual straight pointer segment, never a target curve.
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const p = {x: start.x + (point.x - start.x) * t, y: start.y + (point.y - start.y) * t};
        this.travel += this._follow(p, leash);
        const stepped = this._step(p, stride);
        if (this._mark(p, radiusSquared) > radiusSquared) this.offPathTravel += stepped;
      }
      this.lastPointer = {...point};
    }
    return null;
  }
  endTouch() {
    if (this.done || !this.touchAllowed) return null;
    this.touchAllowed = false;
    const radiusSquared = this._tol() ** 2;
    // The leash lags behind a final hook; the last stride speaks for the tip.
    if (this.lastPointer && this.heading) { this.lead = null; this._mark(this.lastPointer, radiusSquared); }
    // A hook or tail often curls a little inside or outside the model, so the
    // lift may land one and a half tolerances away. A stray extension still fails.
    const endsOnShape = this.lastPointer && this.samples.some(points => points.some(p =>
      (p.x - this.lastPointer.x) ** 2 + (p.y - this.lastPointer.y) ** 2 <= radiusSquared * LIFT_REACH ** 2));
    // The follower trails the pointer; the slack it never walked is real ink.
    if (this.lastPointer && this.follower) {
      const slack = Math.hypot(this.lastPointer.x - this.follower.x, this.lastPointer.y - this.follower.y);
      this.travel += slack;
      this.follower = {...this.lastPointer};
    }
    const offShape = this.offPathTravel > Math.max(0.10, this.totalLength * this.maxOffPathRatio);
    this.retry = offShape || this.travel > this.totalLength * this.maxTravelRatio;
    // restart: the next touch begins a new attempt, so this ink no longer counts.
    if (this.retry) return {type:'shape', restart:true, msg: offShape
      ? 'Πάμε ξανά κοντά στο σχήμα του γράμματος 🙂'
      : 'Πάμε ξανά, μία φορά πάνω στο γράμμα 🙂'};
    const covered = this.samples.every((_, i) => this.coverage(i) >= this.coverNeed && this._ownWritten(i));
    if (covered && endsOnShape && this.travel >= this.coreLength * 0.72) {
      this.done = true;
      return {type:'complete'};
    }
    if (covered) return {type:'partial', msg:'Γράψε λίγο ακόμα πάνω στο γράμμα 🙂'};
    // One productive lift per stroke is the normal way to write the letter and
    // needs no prompt. From the lift that should have finished it, say so.
    if (this.marked > this.touchBase && ++this.lifts < this.samples.length) return {type:'partial'};
    return {type:'partial', msg:'Συμπλήρωσε το σχήμα του γράμματος 🙂'};
  }
}
