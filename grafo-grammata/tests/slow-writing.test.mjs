// Αργή, τρεμάμενη ή διακοπτόμενη γραφή πάνω στο υπόδειγμα πρέπει να εγκρίνεται.
// Συνθετικές κινήσεις με σταθερό seed· κανένα δεδομένο παιδιού.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS_LOWER, LETTERS_UPPER } from '../js/letters/index.js';
import { Tracer } from '../js/engine/tracer.js';

const letters = [...LETTERS_LOWER, ...LETTERS_UPPER];
let seed = 777;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 0.7071; };

// Κίνηση πάνω στη διαδρομή με ταχύτητα v px/s και δειγματοληψία hz. Τρέμουλο
// πλάτους A px σε f Hz κάθετα στη γραμμή, θόρυβος αισθητήρα sigma px και
// προαιρετική παύση (ακίνητο μολύβι στην οθόνη) στη μέση της κίνησης.
function write(points, side, c, phase = 0) {
  const px = points.map(p => ({ x: p.x * side, y: p.y * side }));
  const cum = [0];
  for (let i = 1; i < px.length; i++) cum.push(cum[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y));
  const length = cum.at(-1), out = [];
  let i = 1, paused = !c.pause;
  for (let n = 0, s = 0; ; n++) {
    while (i < px.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / seg, a = px[i - 1], b = px[i];
    const tx = (b.x - a.x) / seg, ty = (b.y - a.y) / seg;
    const sample = () => {
      const off = (c.A || 0) * Math.sin(2 * Math.PI * (c.f || 0) * (n / c.hz + phase));
      return {
        x: (a.x + (b.x - a.x) * u - ty * off + gauss() * c.sigma) / side,
        y: (a.y + (b.y - a.y) * u + tx * off + gauss() * c.sigma) / side,
      };
    };
    out.push(sample());
    if (!paused && s >= length / 2) { paused = true; for (let k = 0; k < c.pause * c.hz; k++) out.push(sample()); }
    if (s >= length) break;
    s = Math.min(length, s + c.v / c.hz);
  }
  return out;
}

function trace(letter, side, c, strictness = 0.4) {
  const tracer = new Tracer(letter, strictness);
  tracer.setToleranceFloor(12 / side);
  let result = null;
  for (const [k, stroke] of letter.strokes.entries()) {
    const points = write(stroke.points, side, c, k * 0.37);
    tracer.beginTouch(points[0]);
    for (const point of points) tracer.feed([point]);
    result = tracer.endTouch();
  }
  return result?.type;
}

function rejected(side, c, strictness) {
  seed = 777;
  return letters.filter(letter => trace(letter, side, c, strictness) !== 'complete').map(letter => letter.char);
}

const PENCIL = { hz: 240, f: 8 }, FINGER = { hz: 60, f: 8 };
const WRITERS = [
  ['Pencil 120 px/s, tremor 1 px', { ...PENCIL, v: 120, A: 1, sigma: 0.1 }],
  ['Pencil 60 px/s, tremor 1 px', { ...PENCIL, v: 60, A: 1, sigma: 0.1 }],
  ['Pencil 60 px/s, tremor 2 px', { ...PENCIL, v: 60, A: 2, sigma: 0.1 }],
  ['Pencil 40 px/s, tremor 2 px', { ...PENCIL, v: 40, A: 2, sigma: 0.2 }],
  ['Pencil 60 px/s, sensor noise only', { ...PENCIL, v: 60, A: 0, sigma: 0.25 }],
  ['finger 120 px/s, tremor 2 px', { ...FINGER, v: 120, A: 2, sigma: 0.2 }],
  ['finger 60 px/s, tremor 2 px', { ...FINGER, v: 60, A: 2, sigma: 0.2 }],
  ['finger 40 px/s, tremor 3 px', { ...FINGER, f: 6, v: 40, A: 3, sigma: 0.3 }],
];

for (const [name, config] of WRITERS) {
  test(`all 49 letters accept slow or shaky writing on the model: ${name}`, () => {
    for (const side of [240, 319, 450]) assert.deepEqual(rejected(side, config), [], `side ${side}`);
  });
}

test('slow shaky writing is accepted at the loosest, default and strictest accuracy', () => {
  for (const strictness of [0, 0.4, 1]) {
    assert.deepEqual(rejected(319, WRITERS[3][1], strictness), [], `strictness ${strictness}`);
  }
});

test('resting the Pencil on the screen mid-stroke does not reject the letter', () => {
  for (const [hz, sigma] of [[240, 0.1], [240, 0.05], [60, 0.3]]) for (const pause of [2, 4]) {
    assert.deepEqual(rejected(319, { hz, v: 150, sigma, pause }), [], `${hz} Hz, pause ${pause} s`);
  }
});

test('jitter alone, with the pen held in place, earns no coverage and no travel', () => {
  const letter = letters.find(l => l.char === 'ο'), tracer = new Tracer(letter);
  tracer.setToleranceFloor(12 / 319);
  const at = letter.strokes[0].points[0];
  seed = 5;
  tracer.beginTouch(at);
  for (let k = 0; k < 2000; k++) tracer.feed([{ x: at.x + gauss() * 0.3 / 319, y: at.y + gauss() * 0.3 / 319 }]);
  const result = tracer.endTouch();
  assert.equal(result.type, 'partial');
  assert.equal(tracer.coverage(0), 0);
  assert.ok(tracer.travel < 0.02, `travel ${tracer.travel}`);
});
