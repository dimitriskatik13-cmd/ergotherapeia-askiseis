// Ό,τι φαίνεται σκούρο στο χαρτί πρέπει να μετρά στον έλεγχο, και τα μηνύματα
// να εμφανίζονται μόνο όταν έχουν κάτι να πουν.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS_LOWER, LETTERS_UPPER, LETTERS_NUMBERS } from '../js/letters/index.js';
import { Tracer } from '../js/engine/tracer.js';
import { Session } from '../js/session.js';

const letters = [...LETTERS_LOWER, ...LETTERS_UPPER];
const get = char => [...letters, ...LETTERS_NUMBERS].find(letter => letter.char === char);
const draw = (tracer, points) => { tracer.beginTouch(points[0]); tracer.feed(points); return tracer.endTouch(); };
const line = (a, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }));

// ── Έλεγχος γραμμάτων ────────────────────────────────────────────────────────
test('a correct intermediate lift is silent on every multi-stroke letter', () => {
  for (const letter of letters.filter(l => l.strokes.length > 1)) {
    const tracer = new Tracer(letter);
    const results = letter.strokes.map(stroke => draw(tracer, stroke.points));
    for (const result of results.slice(0, -1)) assert.deepEqual(result, { type: 'partial' }, letter.char);
    assert.equal(results.at(-1).type, 'complete', letter.char);
  }
});

test('a lift that adds nothing to the shape still gets the prompt', () => {
  const letter = get('Ε'), tracer = new Tracer(letter);
  draw(tracer, letter.strokes[0].points);
  assert.match(draw(tracer, [letter.strokes[0].points[0]]).msg, /Συμπλήρωσε/);
  assert.match(draw(tracer, letter.strokes[0].points).msg, /Συμπλήρωσε/);
});

test('going over the same line too many times restarts with its own message', () => {
  const letter = get('α'), tracer = new Tracer(letter);
  let result = null, passes = 0;
  while (!result?.restart && passes < 10) { result = draw(tracer, letter.strokes[0].points); passes++; }
  assert.ok(passes > 2, `${passes} passes`);
  assert.equal(result.type, 'shape');
  assert.match(result.msg, /μία φορά/);
  assert.doesNotMatch(result.msg, /κοντά/);
  // The next attempt starts over: the old circle no longer counts.
  assert.equal(draw(tracer, letter.strokes[1].points).type, 'partial');
  assert.ok(tracer.coverage(0) < 0.5, `circle coverage ${tracer.coverage(0)}`);
  assert.equal(draw(tracer, letter.strokes[0].points).type, 'complete');
});

test('ink away from the letter restarts with the near-the-shape message', () => {
  const letter = get('α'), tracer = new Tracer(letter);
  draw(tracer, letter.strokes[0].points);
  const result = draw(tracer, line({ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 }));
  assert.equal(result.restart, true);
  assert.match(result.msg, /κοντά στο σχήμα/);
});

// ── Χαρτί ────────────────────────────────────────────────────────────────────
function paper(char, strictness = 0.4) {
  const classes = new Set(), hints = [], cleared = [];
  const ctx = { save() {}, restore() {}, beginPath() {}, arc() {}, fill() {}, moveTo() {}, quadraticCurveTo() {}, stroke() {}, lineTo() {} };
  const tracer = new Tracer(get(char), strictness);
  const session = Object.assign(Object.create(Session.prototype), {
    surface: {
      el: { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } },
      map: { side: 200, tx: x => x * 200, ty: y => y * 200, s: v => v * 200 },
      clear: name => cleared.push(name), ctx: () => ctx,
    },
    settings: { penWidth: 0.02, pressure: false },
    feedback: { clearHint() {}, hint: msg => hints.push(msg), celebrate() {} },
    input: { disable() {} },
    letter: get(char), tracer, inkHistory: [], completed: false,
    _inkStale: false, _inkSnap: null, _armsSeen: null,
  });
  const write = (points, type = 'pen') => {
    const typed = points.map(p => ({ ...p, p: 0.5, type }));
    session._down(typed[0]); session._move(typed.slice(1)); session._up(typed.at(-1));
  };
  return { session, tracer, classes, hints, cleared, write };
}

test('a rejected letter attempt fades, then the next touch starts on clean paper', () => {
  const { session, classes, hints, cleared, write } = paper('α');
  const [circle, stem] = get('α').strokes.map(stroke => stroke.points);
  for (let pass = 0; pass < 10 && !session._inkStale; pass++) write(circle);
  const rejected = session.inkHistory.length;
  assert.ok(rejected > 2);
  assert.ok(classes.has('has-stale-ink'));
  assert.match(hints.at(-1), /μία φορά/);

  write(stem);
  assert.equal(classes.has('has-stale-ink'), false);
  assert.ok(cleared.includes('ink'));
  assert.equal(session.inkHistory.length, 1);
  assert.equal(session.completed, false);
  write(circle);
  assert.equal(session.completed, true);
  assert.equal(session.inkHistory.length, 2);
});

test('a palm touch after a rejected attempt gives back the faded ink and the progress', () => {
  const { session, tracer, classes, write } = paper('α');
  const circle = get('α').strokes[0].points;
  for (let pass = 0; pass < 10 && !session._inkStale; pass++) write(circle);
  const before = session.inkHistory.slice(), saved = tracer.snapshot();
  session._down({ ...circle[0], p: 0.5, type: 'touch' });
  assert.equal(session.inkHistory.length, 0);
  session._cancelStroke();
  assert.deepEqual(session.inkHistory, before);
  assert.ok(classes.has('has-stale-ink'));
  assert.deepEqual(tracer.snapshot(), saved);
});

test('the therapist can still accept a rejected attempt, with its ink shown in full', () => {
  const { session, classes, write } = paper('α');
  const circle = get('α').strokes[0].points;
  for (let pass = 0; pass < 10 && !session._inkStale; pass++) write(circle);
  const kept = session.inkHistory.length;
  session._stopAnim = () => {};
  session.completeByTherapist();
  assert.equal(classes.has('has-stale-ink'), false);
  assert.equal(session.inkHistory.length, kept);
});

// ── Αριθμοί: ίδια αρχή, χωρίς αλλαγή στον έλεγχο φοράς ───────────────────────
test('a number stroke written backwards leaves the paper when the child starts again', () => {
  const { session, write } = paper('2');
  const stroke = get('2').strokes[0].points;
  write([...stroke].reverse());
  assert.equal(session.completed, false);
  assert.equal(session.inkHistory.length, 1);
  write(stroke);
  assert.equal(session.completed, true);
  assert.equal(session.inkHistory.length, 1);
});

test('restarting a half-written number stroke drops the abandoned half only', () => {
  const { session, write } = paper('4');
  const [first, second] = get('4').strokes.map(stroke => stroke.points);
  write(first);
  write(second.slice(0, Math.ceil(second.length / 2)));
  assert.equal(session.inkHistory.length, 2);
  write(second);
  assert.equal(session.completed, true);
  assert.deepEqual(session.inkHistory.map(stroke => stroke.group), [0, 1]);
  assert.equal(session.inkHistory[1].points.length, second.length + 1);
});

test('resuming a number stroke where it stopped keeps all of its ink', () => {
  const { session, write } = paper('2');
  const stroke = get('2').strokes[0].points, middle = Math.floor(stroke.length / 2);
  write(stroke.slice(0, middle + 1));
  write(stroke.slice(middle));
  assert.equal(session.completed, true);
  assert.equal(session.inkHistory.length, 2);
});

test('number acceptance is unchanged by the restart bookkeeping', () => {
  for (const letter of LETTERS_NUMBERS) {
    const tracer = new Tracer(letter), saved = tracer.snapshot();
    draw(tracer, letter.strokes[0].points.slice(0, 3));
    tracer.restore(saved);
    assert.deepEqual(tracer.snapshot(), saved, letter.char);
    for (const stroke of letter.strokes) draw(tracer, stroke.points);
    assert.equal(tracer.done, true, letter.char);
  }
});
