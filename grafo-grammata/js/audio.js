// Offline playback: approved phonemes use original PCM WAV files so encoding
// cannot alter their release/frication. Number names also use approved Melina WAV.
// Legacy dataset names ending in .mp3 are accepted and routed to WAV.

export class Phonemes {
  constructor(basePath = 'sounds/') {
    this.base = basePath;
    this.ctx = null;
    this.raw = new Map();       // key → ArrayBuffer (προφορτωμένο, χωρίς decode)
    this.buffers = new Map();   // key → AudioBuffer (decoded)
    this.elements = new Map();  // key → HTMLAudioElement (fallback)
    this.useWebAudio = typeof (window.AudioContext || window.webkitAudioContext) === 'function';
  }

  _key(name) { return name.replace(/\.(?:mp3|wav)$/i, ''); }
  _url(key) { return `${this.base}${key}.wav`; }

  /** Αρχικοποίηση AudioContext — απαιτεί χειρονομία χρήστη (π.χ. το ✓). */
  unlock() {
    if (this.useWebAudio && !this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { this.useWebAudio = false; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /** Προθέρμανση cache (fetch μόνο) — ΧΩΡΙΣ AudioContext/decode (όχι gesture). */
  async preload(names = []) {
    const keys = [...new Set(names.map((n) => this._key(n)))];
    await Promise.all(keys.map(async (k) => {
      try {
        if (this.useWebAudio) {
          if (this.raw.has(k) || this.buffers.has(k)) return;
          const res = await fetch(this._url(k));
          this.raw.set(k, await res.arrayBuffer());
        } else if (!this.elements.has(k)) {
          const a = new Audio(this._url(k)); a.preload = 'auto';
          this.elements.set(k, a);
        }
      } catch (_) { /* αγνόησε — υπάρχει το service worker cache */ }
    }));
  }

  async _ensure(key) {
    if (this.useWebAudio) {
      if (this.buffers.has(key)) return;
      if (!this.ctx) this.unlock();
      let arr = this.raw.get(key);
      if (!arr) { const res = await fetch(this._url(key)); arr = await res.arrayBuffer(); }
      else { arr = arr.slice(0); } // decodeAudioData «καταναλώνει» το buffer
      const buf = await this.ctx.decodeAudioData(arr);
      this.buffers.set(key, buf);
    } else {
      if (this.elements.has(key)) return;
      const a = new Audio(this._url(key));
      a.preload = 'auto';
      this.elements.set(key, a);
    }
  }

  /** Παίξε το φώνημα. Δέχεται «a» ή «a.mp3». */
  async play(name) {
    const key = this._key(name);
    this.unlock();
    try {
      if (this.useWebAudio) {
        await this._ensure(key);
        const buf = this.buffers.get(key);
        if (!buf) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        // Τα αρχεία έχουν ήδη ομαλά άκρα. Μόνο 2/4ms προστασία από clicks,
        // ώστε να διατηρείται η εγκεκριμένη αρχή των σύντομων συμφώνων.
        const t0 = this.ctx.currentTime;
        const dur = buf.duration;
        const atk = 0.002, rel = Math.min(0.004, dur * 0.1);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(1.0, t0 + atk);
        gain.gain.setValueAtTime(1.0, t0 + Math.max(atk, dur - rel));
        gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        src.connect(gain).connect(this.ctx.destination);
        src.start(0);
      } else {
        await this._ensure(key);
        const a = this.elements.get(key);
        if (a) { a.currentTime = 0; await a.play(); }
      }
    } catch (e) {
      // σιωπηλή αποτυχία — ο θεραπευτής μπορεί να δώσει το φώνημα προφορικά
      console.warn('phoneme play failed:', key, e);
    }
  }
}
