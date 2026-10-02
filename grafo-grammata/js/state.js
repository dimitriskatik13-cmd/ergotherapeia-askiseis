// ─────────────────────────────────────────────────────────────────────────────
// State — ΜΟΝΟ ρυθμίσεις θεραπευτή (τοπικά, localStorage). ΚΑΝΕΝΑ δεδομένο
// παιδιού. Καμία αποστολή σε cloud/server. Privacy by design.
// ─────────────────────────────────────────────────────────────────────────────
import { lettersByCase } from './letters/index.js';

const KEY = 'synoida-grafo-settings-v1';

export const DEFAULTS = {
  case: 'lower',          // 'lower' | 'upper'
  targetLetters: null,    // null = όλα · αλλιώς πίνακας από chars (ανά case)
  currentChar: 'α',
  mode: 'trace',          // 'demo' | 'trace' | 'free'
  strictness: 0.4,        // 0 χαλαρό .. 1 αυστηρό
  penWidth: 0.018,        // normalized base width (παχύ→λεπτό)
  pressure: false,        // απόκριση πίεσης Pencil
  penOnly: false,         // «Μόνο Pencil»: το δάχτυλο δεν γράφει (απόρριψη παλάμης)
  letterSize: 0.6,        // 0..1 (μικρό→μεγάλο)
  lines: 'double',        // 'none' | 'single' | 'double'
  animSpeed: 0.5,         // ταχύτητα επίδειξης 0..1
  hand: 'right',          // 'right' | 'left'
};

/** Retain valid preferences, but never trust persisted types or old target sets. */
export function normalizeSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const data = { ...DEFAULTS };
  const enums = { case: ['lower', 'upper', 'numbers'], mode: ['demo', 'trace', 'free'], lines: ['none', 'single', 'double'], hand: ['right', 'left'] };
  for (const [key, allowed] of Object.entries(enums)) {
    const candidate = key === 'mode' && source[key] === 'fading' ? 'trace' : source[key];
    if (allowed.includes(candidate)) data[key] = candidate;
  }
  for (const [key, min, max] of [['strictness', 0, 1], ['penWidth', 0.008, 0.034], ['letterSize', 0, 1], ['animSpeed', 0, 1]]) {
    if (Number.isFinite(source[key])) data[key] = Math.max(min, Math.min(max, source[key]));
  }
  for (const key of ['pressure', 'penOnly']) if (typeof source[key] === 'boolean') data[key] = source[key];
  const letters = lettersByCase(data.case);
  const validChars = new Set(letters.map(letter => letter.char));
  if (Array.isArray(source.targetLetters)) {
    const targets = [...new Set(source.targetLetters.filter(char => validChars.has(char)))];
    if (targets.length) data.targetLetters = targets;
  }
  const active = data.targetLetters || letters.map(letter => letter.char);
  data.currentChar = active.includes(source.currentChar) ? source.currentChar : active[0];
  return data;
}

class Store {
  constructor() {
    this.data = { ...DEFAULTS };
    this.subs = new Set();
    this.load();
  }
  load() {
    let saved;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (_) { /* αγνόησε */ }
    this.data = normalizeSettings(saved);
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) {}
  }
  get(k) { return this.data[k]; }
  all() { return { ...this.data }; }
  set(k, v) { this.update({ [k]: v }); }
  update(patch) {
    this.data = normalizeSettings({ ...this.data, ...patch });
    this.save();
    this.subs.forEach((cb) => cb(this.data, patch));
  }
  subscribe(cb) { this.subs.add(cb); return () => this.subs.delete(cb); }
}

export const store = new Store();
