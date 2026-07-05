// ─────────────────────────────────────────────────────────────────────────────
// State — ΜΟΝΟ ρυθμίσεις θεραπευτή (τοπικά, localStorage). ΚΑΝΕΝΑ δεδομένο
// παιδιού. Καμία αποστολή σε cloud/server. Privacy by design.
// ─────────────────────────────────────────────────────────────────────────────
const KEY = 'synoida-grafo-settings-v1';

export const DEFAULTS = {
  case: 'lower',          // 'lower' | 'upper'
  targetLetters: null,    // null = όλα · αλλιώς πίνακας από chars (ανά case)
  currentChar: 'α',
  mode: 'trace',          // 'demo' | 'trace' | 'free' | 'fading'
  helpLevel: 1,           // 1..4 (fading)
  strictness: 0.4,        // 0 χαλαρό .. 1 αυστηρό
  penWidth: 0.018,        // normalized base width (παχύ→λεπτό)
  pressure: false,        // απόκριση πίεσης Pencil
  penOnly: false,         // «Μόνο Pencil»: το δάχτυλο δεν γράφει (απόρριψη παλάμης)
  letterSize: 0.6,        // 0..1 (μικρό→μεγάλο)
  lines: 'double',        // 'none' | 'single' | 'double'
  animSpeed: 0.5,         // ταχύτητα επίδειξης 0..1
  hand: 'right',          // 'right' | 'left'
};

class Store {
  constructor() {
    this.data = { ...DEFAULTS };
    this.subs = new Set();
    this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (_) { /* αγνόησε */ }
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) {}
  }
  get(k) { return this.data[k]; }
  all() { return { ...this.data }; }
  set(k, v) { this.update({ [k]: v }); }
  update(patch) {
    this.data = { ...this.data, ...patch };
    this.save();
    this.subs.forEach((cb) => cb(this.data, patch));
  }
  subscribe(cb) { this.subs.add(cb); return () => this.subs.delete(cb); }
}

export const store = new Store();
