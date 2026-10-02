import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS_LOWER, LETTERS_UPPER } from '../js/letters/index.js';
import { Tracer } from '../js/engine/tracer.js';

const letters = [...LETTERS_LOWER, ...LETTERS_UPPER];
const get = char => letters.find(letter => letter.char === char);
const draw = (tracer, points) => {
  tracer.beginTouch(points[0]); tracer.feed(points); return tracer.endTouch();
};

for (const strictness of [0, 0.4, 0.5, 1]) {
  test(`all 49 letters accept reversed order and direction at ${strictness}`, () => {
    for (const letter of letters) for (const side of [56, 240, 450]) {
      const tracer = new Tracer(letter, strictness);
      tracer.setToleranceFloor(12 / side);
      for (const stroke of [...letter.strokes].reverse()) draw(tracer, [...stroke.points].reverse());
      assert.equal(tracer.done, true, `${letter.char}, side ${side}`);
    }
  });
}

test('a letter can begin halfway along any stroke and finish its pieces in another order', () => {
  for (const letter of letters) {
    const tracer = new Tracer(letter);
    for (const stroke of [...letter.strokes].reverse()) {
      const middle = Math.floor(stroke.points.length / 2);
      draw(tracer, stroke.points.slice(middle));
      draw(tracer, stroke.points.slice(0, middle + 1).reverse());
    }
    assert.equal(tracer.done, true, letter.char);
  }
});

test('a closed circle may start on any quarter and run either way', () => {
  const letter = get('ο'), ring = letter.strokes[0].points.slice(0, -1);
  for (const fraction of [0, .25, .5, .75]) for (const reverse of [false, true]) {
    const cut = Math.floor(ring.length * fraction);
    const points = [...ring.slice(cut), ...ring.slice(0, cut), ring[cut]];
    const tracer = new Tracer(letter, 1);
    draw(tracer, reverse ? points.reverse() : points);
    assert.equal(tracer.done, true, `${fraction}, reverse ${reverse}`);
  }
});

test('completion waits for lift even after full reverse coverage', () => {
  const letter = get('Ι'), points = [...letter.strokes[0].points].reverse();
  const tracer = new Tracer(letter);
  tracer.beginTouch(points[0]); tracer.feed(points);
  assert.equal(tracer.done, false);
  assert.equal(tracer.endTouch().type, 'complete');
});

test('isolated taps and lifted jumps never fill a missing path', () => {
  for (const char of ['Ι', 'ο', 'κ', 'β', 'γ']) {
    const tracer = new Tracer(get(char));
    for (const stroke of get(char).strokes) for (const point of [stroke.points[0], stroke.points.at(-1)]) {
      draw(tracer, [point]);
    }
    assert.equal(tracer.done, false, char);
  }
});

test('important missing parts are rejected even at loose settings and small sizes', () => {
  for (const char of ['κ', 'Κ', 'π', 'Π', 'θ', 'Θ', 'α']) for (const missing of get(char).strokes.keys()) {
    for (const side of [56, 240, 450]) {
      const tracer = new Tracer(get(char), 0);
      tracer.setToleranceFloor(12 / side);
      for (const [i, stroke] of get(char).strokes.entries()) if (i !== missing) draw(tracer, stroke.points);
      assert.equal(tracer.done, false, `${char}, missing ${missing + 1}, side ${side}`);
    }
  }
});

test('correct shape followed by a long unrelated extension does not complete', () => {
  for (const char of ['ς', 'ζ', 'ξ', 'Β', 'Ρ']) for (const strictness of [0, .4, 1]) {
    const letter = get(char), tracer = new Tracer(letter, strictness);
    for (const stroke of letter.strokes.slice(0, -1)) draw(tracer, stroke.points);
    const points = letter.strokes.at(-1).points, last = points.at(-1);
    const extension = Array.from({length:100}, (_, i) => ({x:last.x + .4 * (i + 1) / 100, y:last.y}));
    draw(tracer, [...points, ...extension]);
    assert.equal(tracer.done, false, `${char} @ ${strictness}`);
  }
});

test('palm rollback restores coverage from differently ordered strokes exactly', () => {
  const letter = get('κ'), tracer = new Tracer(letter);
  draw(tracer, [...letter.strokes[2].points].reverse());
  const saved = tracer.snapshot();
  tracer.beginTouch(letter.strokes[0].points[0]); tracer.feed(letter.strokes[0].points);
  tracer.restore(saved);
  assert.deepEqual(tracer.snapshot(), saved);
  draw(tracer, [...letter.strokes[1].points].reverse());
  assert.equal(tracer.done, false);
  draw(tracer, [...letter.strokes[0].points].reverse());
  assert.equal(tracer.done, true);
});

test('a mirrored kappa is not the target shape', () => {
  const tracer = new Tracer(get('κ'));
  for (const stroke of get('κ').strokes) draw(tracer, stroke.points.map(p => ({x:1 - p.x, y:p.y})));
  assert.equal(tracer.done, false);
});
