// Ρυθμίσεις κοινόχρηστου iPad, ένδειξη «Μόνο Pencil» και επίδειξη.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalizeSettings } from '../js/state.js';
import { InputController } from '../js/engine/input.js';
import { Animator } from '../js/engine/animator.js';
import { Session } from '../js/session.js';
import { LETTERS_LOWER } from '../js/letters/index.js';

test('repetitions per letter accept only 1, 3 or 5', () => {
  for (const reps of [1, 3, 5]) assert.equal(normalizeSettings({ reps }).reps, reps);
  for (const reps of [0, 2, 4, 6, '3', null, NaN, true]) assert.equal(normalizeSettings({ reps }).reps, DEFAULTS.reps);
  assert.equal(DEFAULTS.reps, 1);
});

test('reset returns every preference to its default but stays on the same screen and character', async () => {
  const saved = [];
  const left = { case: 'upper', currentChar: 'Κ', mode: 'free', targetLetters: ['Κ', 'Λ'], strictness: 1, penWidth: 0.03,
    pressure: true, penOnly: true, letterSize: 0.1, lines: 'none', animSpeed: 0.9, hand: 'left', reps: 5 };
  globalThis.localStorage = { getItem: () => JSON.stringify(left), setItem: (_, value) => saved.push(JSON.parse(value)) };
  try {
    const { store } = await import('../js/state.js?reset');
    assert.deepEqual(store.all(), left);
    const patches = [];
    store.subscribe((_, patch) => patches.push(patch));
    store.resetPreferences();
    const expected = { ...DEFAULTS, case: 'upper', currentChar: 'Κ', mode: 'free' };
    assert.deepEqual(store.all(), expected);
    assert.deepEqual(saved.at(-1), expected);
    assert.equal(patches.length, 1);
  } finally { delete globalThis.localStorage; }
});

function harness() {
  const listeners = {}, calls = [];
  const el = { addEventListener: (name, cb) => { listeners[name] = cb; }, setPointerCapture() {}, releasePointerCapture() {} };
  const input = new InputController({ el, toNorm: (x, y) => ({ x, y }) }, {
    onDown: () => calls.push('down'), onUp: () => calls.push('up'), onBlocked: () => calls.push('blocked'),
  });
  input.enable();
  const fire = (name, props = {}) => listeners[name]({
    pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0, pressure: 0.5, width: 40, height: 40, preventDefault() {}, ...props,
  });
  return { input, fire, calls };
}

test('Pencil-only tells a finger or mouse why nothing is written when no Pencil is in use', () => {
  for (const pointerType of ['touch', 'mouse']) {
    const h = harness(); h.input.setPenOnly(true);
    h.fire('pointerdown', { pointerType });
    assert.deepEqual(h.calls, ['blocked'], pointerType);
  }
});

test('Pencil-only stays silent for a palm and for touches around Pencil writing', () => {
  const realNow = Date.now; let now = 500000; Date.now = () => now;
  try {
    const palm = harness(); palm.input.setPenOnly(true);
    palm.fire('pointerdown', { width: 90, height: 90 });
    assert.deepEqual(palm.calls, []);

    const h = harness(); h.input.setPenOnly(true);
    h.fire('pointerdown', { pointerType: 'pen' });
    h.fire('pointerdown', { pointerId: 2 });                 // η παλάμη όσο γράφει το Pencil
    h.fire('pointerup', { pointerType: 'pen' });
    now += 3000; h.fire('pointerdown', { pointerId: 2 });     // λίγο μετά το σήκωμα
    assert.deepEqual(h.calls, ['down', 'up']);
    now += 8100; h.fire('pointerdown', { pointerId: 2 });     // κανένα Pencil πια
    assert.deepEqual(h.calls, ['down', 'up', 'blocked']);
  } finally { Date.now = realNow; }
});

test('without Pencil-only a finger writes and nothing is reported as blocked', () => {
  const h = harness();
  h.fire('pointerdown'); h.fire('pointerup');
  assert.deepEqual(h.calls, ['down', 'up']);
  h.input.disable(); h.input.setPenOnly(true);
  h.fire('pointerdown');
  assert.deepEqual(h.calls, ['down', 'up']);
});

// ── Επίδειξη ─────────────────────────────────────────────────────────────────
function demoSurface() {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => (typeof name === 'string' ? () => calls.push(name) : undefined), set: () => true });
  return { calls, surface: { map: { tx: x => x * 100, ty: y => y * 100, s: v => v * 100 }, ctx: () => ctx, clear: name => calls.push('clear:' + name) } };
}

test('a finished demonstration can be redrawn; an unplayed one draws nothing', () => {
  const { calls, surface } = demoSurface();
  const animator = new Animator(surface, LETTERS_LOWER[0]);
  animator.redraw();
  assert.deepEqual(calls, []);
  animator.startT = 0;            // έπαιξε και τελείωσε
  animator.redraw();
  assert.equal(calls[0], 'clear:ink');
  assert.ok(calls.filter(name => name === 'stroke').length >= LETTERS_LOWER[0].strokes.length);
});

test('changing the letter size in demo mode redraws the finished demonstration at the new size', () => {
  let redraws = 0;
  const session = Object.assign(Object.create(Session.prototype), {
    settings: { letterSize: 0.9 }, mode: 'demo', tracer: null, animator: { redraw: () => redraws++ },
    surface: { setPadRatio() {} }, input: { setPenOnly() {} }, _redrawGuide() {},
  });
  session.applySettings({ letterSize: 0.9, penOnly: false });
  assert.equal(redraws, 0);
  session.applySettings({ letterSize: 0.3, penOnly: false });
  assert.equal(redraws, 1);
  session.animator = null;
  assert.doesNotThrow(() => session.applySettings({ letterSize: 0.5, penOnly: false }));
});
