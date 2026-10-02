// Εκκίνηση χωρίς φόρτωση όλων των ήχων, και «Μπράβο» χωρίς σάρωση του καμβά.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Phonemes } from '../js/audio.js';
import { Feedback } from '../js/feedback.js';
import { GUIDE_WIDTH } from '../js/engine/guide.js';
import { ALL_LETTERS } from '../js/letters/index.js';

const response = (byte = 82) => ({ status: 200, headers: { get: () => 'audio/wav' }, arrayBuffer: async () => new Uint8Array([byte]).buffer });
function web() {
  const counts = { created: 0, started: 0 };
  class Context {
    constructor() { counts.created++; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    async decodeAudioData() { return { duration: 0.3 }; }
    createBufferSource() { return { connect: () => ({ connect() {} }), start: () => counts.started++, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
  }
  globalThis.window = { AudioContext: Context };
  return { audio: new Phonemes(), counts };
}

test('only the sound of the letter on screen is fetched, without unlocking audio', async () => {
  const urls = []; globalThis.fetch = async (url) => { urls.push(url); return response(); };
  const { audio, counts } = web();
  await audio.warm('a.mp3');
  assert.deepEqual(urls, ['sounds/a.wav']);
  assert.equal(counts.created, 0);
  await audio.warm('a.mp3');
  assert.equal(urls.length, 1);
});

test('moving to another letter keeps one undecoded sound in memory, not one per letter seen', async () => {
  globalThis.fetch = async () => response();
  const { audio } = web();
  for (const letter of ALL_LETTERS.slice(0, 12)) await audio.warm(letter.phonemeAudio);
  assert.deepEqual([...audio.raw.keys()], [audio._key(ALL_LETTERS[11].phonemeAudio)]);
});

test('a sound that was never warmed still plays on demand, and played sounds stay ready', async () => {
  const urls = []; globalThis.fetch = async (url) => { urls.push(url); return response(); };
  const { audio, counts } = web();
  await audio.warm('a.mp3');
  assert.equal(await audio.play('v.mp3'), true);
  assert.equal(await audio.play('a.mp3'), true);
  await audio.warm('s.mp3');
  assert.equal(await audio.play('v.mp3'), true);
  assert.deepEqual(urls, ['sounds/a.wav', 'sounds/v.wav', 'sounds/s.wav']);
  assert.equal(counts.started, 3);
});

test('startup no longer preloads every sound', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /preload\(/);
  assert.match(main, /phonemes\.warm\(session\.letter\.phonemeAudio\)/);
});

// ── «Μπράβο» ─────────────────────────────────────────────────────────────────
function surface({ side = 300, dpr = 2, width = 800, height = 600 } = {}) {
  return {
    dpr, map: { side, tx: x => 100 + x * side, ty: y => 50 + y * side, s: v => v * side },
    layers: { ink: { width: width * dpr, height: height * dpr } },
  };
}
const letter = { strokes: [{ points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.9 }] }] };

test('the completed preview box comes from the model and the ink, with their line widths', () => {
  const feedback = new Feedback(surface(), null);
  const half = 300 * GUIDE_WIDTH / 2, pad = 4;
  assert.deepEqual(feedback._bounds(letter, []), {
    left: Math.floor((160 - half) * 2) - pad, top: Math.floor((110 - half) * 2) - pad,
    width: Math.ceil((340 + half) * 2) + pad - (Math.floor((160 - half) * 2) - pad),
    height: Math.ceil((320 + half) * 2) + pad - (Math.floor((110 - half) * 2) - pad),
  });
  // Μελάνη έξω από το υπόδειγμα μεγαλώνει το πλαίσιο· η πίεση Pencil το φαρδαίνει.
  const ink = [{ points: [{ x: 0.05, y: 0.5 }, { x: 0.95, y: 1.2 }], opts: { baseWidth: 0.03, pressure: false } }];
  const plain = feedback._bounds(letter, ink), pressed = feedback._bounds(letter, [{ ...ink[0], opts: { baseWidth: 0.03, pressure: true } }]);
  assert.equal(plain.left, Math.floor((115 - 4.5) * 2) - pad);
  assert.equal(plain.top + plain.height, Math.ceil((410 + 4.5) * 2) + pad);
  assert.ok(pressed.left < plain.left && pressed.width > plain.width);
});

test('the preview box never leaves the canvas and is empty for a hidden surface', () => {
  const far = [{ points: [{ x: -5, y: -5 }, { x: 9, y: 9 }], opts: {} }];
  assert.deepEqual(new Feedback(surface(), null)._bounds(letter, far), { left: 0, top: 0, width: 1600, height: 1200 });
  assert.equal(new Feedback(surface({ width: 0, height: 0 }), null)._bounds(letter, []), null);
});

test('the reward no longer reads back the canvas pixels', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/feedback.js', import.meta.url), 'utf8'), /getImageData/);
});

// ── Αχρησιμοποίητα αρχεία ────────────────────────────────────────────────────
test('only the files the app loads are shipped beside it', () => {
  const sounds = readdirSync(new URL('../sounds/', import.meta.url));
  assert.deepEqual(sounds.filter(name => !name.endsWith('.wav')), []);
  const fonts = readdirSync(new URL('../brand_assets/fonts/', import.meta.url));
  assert.deepEqual(fonts.filter(name => name.endsWith('.ttf')), []);
});
