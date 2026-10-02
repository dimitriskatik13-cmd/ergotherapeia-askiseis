// Η γραφή δεν χρειάζεται να αγγίζει ακριβώς την τελεία έναρξης ή την άκρη.
// Το σχήμα όμως πρέπει να υπάρχει: κλειστά σχήματα κλείνουν, καμία γραμμή δεν λείπει.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS_LOWER, LETTERS_UPPER, LETTERS_NUMBERS } from '../js/letters/index.js';
import { Tracer } from '../js/engine/tracer.js';

const letters = [...LETTERS_LOWER, ...LETTERS_UPPER];
const get = char => letters.find(letter => letter.char === char);
const SIDE = 319;
const draw = (tracer, points) => { tracer.beginTouch(points[0]); for (const point of points) tracer.feed([point]); return tracer.endTouch(); };

/** Η γραμμή πάνω στο υπόδειγμα, χωρίς τα πρώτα startPx και τα τελευταία endPx. */
function cut(points, startPx, endPx, side = SIDE) {
  const px = points.map(p => ({ x: p.x * side, y: p.y * side })), cum = [0];
  for (let i = 1; i < px.length; i++) cum.push(cum[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y));
  // Ποτέ περισσότερο από το 45% μιας γραμμής από κάθε άκρο.
  const from = Math.min(startPx, cum.at(-1) * 0.45), to = cum.at(-1) - Math.min(endPx, cum.at(-1) * 0.45), out = [];
  for (let s = from; ; s = Math.min(to, s + 1.5)) {
    let i = 1; while (i < px.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / seg;
    out.push({ x: (px[i - 1].x + (px[i].x - px[i - 1].x) * u) / side, y: (px[i - 1].y + (px[i].y - px[i - 1].y) * u) / side });
    if (s >= to) break;
  }
  return out;
}
function written(letter, startPx, endPx, strictness = 0.4, side = SIDE) {
  const tracer = new Tracer(letter, strictness);
  tracer.setToleranceFloor(12 / side);
  for (const stroke of letter.strokes) draw(tracer, cut(stroke.points, startPx, endPx, side));
  return tracer.done;
}

// Γράμματα με ξεχωριστές γραμμές. Στις 29/09 τα περισσότερα απορρίπτονταν από τα 26 έως 32 px.
const DISTINCT = ['ε', 'ι', 'κ', 'λ', 'ν', 'π', 'τ', 'υ', 'χ', 'Α', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Ι', 'Κ', 'Λ', 'Ν', 'Π', 'Ρ', 'Σ', 'Τ', 'Χ'];

test('a stroke may begin well after its start dot', () => {
  for (const char of DISTINCT) assert.equal(written(get(char), 32, 0), true, char);
});

test('a stroke may stop well before its tip', () => {
  for (const char of DISTINCT) assert.equal(written(get(char), 0, 36), true, char);
});

test('a stroke may miss both the dot and the tip by a little', () => {
  for (const char of DISTINCT) assert.equal(written(get(char), 22, 22), true, char);
});

test('every letter still accepts a small gap at the dot, at the tip, or both', () => {
  for (const letter of letters) {
    assert.equal(written(letter, 22, 0), true, `${letter.char} start`);
    assert.equal(written(letter, 0, 20), true, `${letter.char} end`);
    assert.equal(written(letter, 16, 16), true, `${letter.char} both`);
  }
});

test('the strictest accuracy keeps the ends tighter than the default', () => {
  const loose = DISTINCT.filter(char => written(get(char), 30, 30, 0.4)).length;
  const strict = DISTINCT.filter(char => written(get(char), 30, 30, 1)).length;
  assert.ok(strict < loose, `${strict} strict, ${loose} default`);
});

test('half a stroke is not a stroke, however generous the ends', () => {
  for (const char of DISTINCT) for (const strictness of [0, 0.4]) {
    const letter = get(char), tracer = new Tracer(letter, strictness);
    tracer.setToleranceFloor(12 / SIDE);
    for (const stroke of letter.strokes) {
      const length = cut(stroke.points, 0, 0).length * 1.5;
      draw(tracer, cut(stroke.points, length * 0.3, length * 0.3));
    }
    assert.equal(tracer.done, false, `${char} @ ${strictness}`);
  }
});

test('a closed shape must still close', () => {
  for (const char of ['ο', 'Ο', 'θ', 'Θ']) {
    const letter = get(char), tracer = new Tracer(letter, 0.4);
    tracer.setToleranceFloor(12 / SIDE);
    assert.equal(tracer.closed[0], true, char);
    const ring = cut(letter.strokes[0].points, 0, 0);
    draw(tracer, ring.slice(0, Math.floor(ring.length * 0.7)));
    for (const stroke of letter.strokes.slice(1)) draw(tracer, cut(stroke.points, 0, 0));
    assert.equal(tracer.done, false, char);
  }
});

test('a stroke that runs along its neighbour keeps both ends: the bowl alone is never α', () => {
  const alpha = get('α');
  for (const side of [97.8, 151.62, 240, 319]) for (const strictness of [0, 0.4]) {
    const tracer = new Tracer(alpha, strictness);
    tracer.setToleranceFloor(12 / side);
    // Κυματιστή γραφή του κύκλου, ώστε να «απλώνει» όσο γίνεται προς το πόδι.
    const bowl = cut(alpha.strokes[0].points, 0, 0, side).map((p, i) => ({ x: p.x + Math.sin(i * 0.9) * 2 / side, y: p.y + Math.cos(i * 0.7) * 2 / side }));
    draw(tracer, bowl);
    assert.equal(tracer.done, false, `side ${side} @ ${strictness}`);
  }
});

test('the prompt waits for the lift that should have finished the letter', () => {
  const epsilon = get('Ε'), tracer = new Tracer(epsilon);
  const lifts = epsilon.strokes.map((stroke, i) => draw(tracer, i < 3 ? stroke.points : stroke.points.slice(0, 5)));
  assert.deepEqual(lifts.slice(0, 3), [{ type: 'partial' }, { type: 'partial' }, { type: 'partial' }]);
  assert.match(lifts[3].msg, /Συμπλήρωσε/);

  const alpha = get('α'), second = new Tracer(alpha);
  assert.deepEqual(draw(second, alpha.strokes[0].points), { type: 'partial' });
  assert.match(draw(second, alpha.strokes[1].points.slice(0, 12)).msg, /Συμπλήρωσε/);
});

// ── Αριθμοί: ίδια ανοχή στα άκρα, με τον έλεγχο φοράς και σειράς όπως ήταν ──────
const digits = LETTERS_NUMBERS.slice(0, 10), digit = char => LETTERS_NUMBERS.find(l => l.char === char);

test('a digit stroke may begin well after its start dot', () => {
  // Στις 29/09 όλα απορρίπτονταν από τα 46 έως 48 px.
  for (const char of ['0', '2', '3', '4', '5', '6', '7', '8']) assert.equal(written(digit(char), 54, 0), true, char);
  for (const letter of digits) assert.equal(written(letter, 44, 0), true, letter.char);
});

test('a digit stroke may stop well before its tip, short bars included', () => {
  // Στις 29/09 το 5 και το 7 απορρίπτονταν από τα 16 px, τα υπόλοιπα από τα 40.
  for (const letter of digits) assert.equal(written(letter, 0, 26), true, letter.char);
  for (const char of ['0', '2', '3', '6', '8', '9']) assert.equal(written(digit(char), 0, 48), true, char);
  for (const letter of digits) assert.equal(written(letter, 20, 20), true, `${letter.char} both`);
});

test('the looser start never lets 1 lose its flag', () => {
  const one = digit('1');
  for (const strictness of [0, 0.4, 1]) for (const side of [150, 319]) {
    assert.equal(written(one, 70 * side / SIDE, 0, strictness, side), false, `${strictness} @ ${side}`);
  }
});

test('half a digit stroke is not a digit', () => {
  for (const letter of digits) for (const strictness of [0, 0.4]) {
    const tracer = new Tracer(letter, strictness);
    tracer.setToleranceFloor(12 / SIDE);
    for (const stroke of letter.strokes) {
      const length = cut(stroke.points, 0, 0).length * 1.5;
      draw(tracer, cut(stroke.points, length * 0.3, length * 0.3));
    }
    assert.equal(tracer.done, false, `${letter.char} @ ${strictness}`);
  }
});

test('digit direction and order are still required', () => {
  for (const letter of LETTERS_NUMBERS) {
    const backwards = new Tracer(letter);
    for (const stroke of letter.strokes) draw(backwards, [...cut(stroke.points, 0, 0)].reverse());
    assert.equal(backwards.done, false, `${letter.char} backwards`);
    if (letter.strokes.length < 2) continue;
    const swapped = new Tracer(letter);
    for (const stroke of [...letter.strokes].reverse()) draw(swapped, cut(stroke.points, 0, 0));
    assert.equal(swapped.done, false, `${letter.char} last stroke first`);
  }
});
