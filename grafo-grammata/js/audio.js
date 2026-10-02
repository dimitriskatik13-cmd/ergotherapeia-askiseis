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
    this._fetching = new Map();
    this._preparing = new Map();
    this._retry = new Set();
    this._playRequest = 0;
    this._source = null;
    this._activeElement = null;
    this._resume = null;
    this.useWebAudio = typeof (window.AudioContext || window.webkitAudioContext) === 'function';
  }

  _key(name) { return name.replace(/\.(?:mp3|wav)$/i, ''); }
  _url(key) { return `${this.base}${key}.wav`; }

  /** Αρχικοποίηση AudioContext — απαιτεί χειρονομία χρήστη (π.χ. το ✓). */
  unlock() {
    if (this.ctx?.state === 'closed') this.ctx = null;
    if (this.useWebAudio && !this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { this.useWebAudio = false; }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this._resume = Promise.resolve(this.ctx.resume()).then(() => true, () => false);
    }
  }

  async _loadRaw(key) {
    if (this.raw.has(key)) return this.raw.get(key);
    if (this._fetching.has(key)) return this._fetching.get(key);
    const pending = (async () => {
      const res = await fetch(this._url(key), this._retry.has(key) ? { cache: 'reload' } : undefined);
      if (!(res?.status >= 200 && res.status < 300)) throw new Error(`Audio HTTP ${res?.status}`);
      if (res.headers?.get('content-type')?.includes('text/html')) throw new Error('Audio response is HTML');
      const bytes = await res.arrayBuffer();
      if (!bytes.byteLength) throw new Error('Audio response is empty');
      this.raw.set(key, bytes);
      return bytes;
    })();
    this._fetching.set(key, pending);
    try { return await pending; }
    catch (error) { this._retry.add(key); throw error; }
    finally { if (this._fetching.get(key) === pending) this._fetching.delete(key); }
  }

  _audioElement(key) {
    if (!this.elements.has(key)) {
      const a = new Audio(this._url(key));
      a.preload = 'auto';
      this.elements.set(key, a);
    }
    return this.elements.get(key);
  }

  /** Προθέρμανση cache (fetch μόνο) — ΧΩΡΙΣ AudioContext/decode (όχι gesture). */
  async preload(names = []) {
    const keys = [...new Set(names.map((n) => this._key(n)))];
    await Promise.all(keys.map(async (k) => {
      try {
        if (this.useWebAudio) {
          if (this.raw.has(k) || this.buffers.has(k)) return;
          await this._loadRaw(k);
        } else this._audioElement(k);
      } catch (_) { /* αγνόησε — υπάρχει το service worker cache */ }
    }));
  }

  async _ensure(key) {
    if (!this.useWebAudio) { this._audioElement(key); return; }
    if (this.buffers.has(key)) return;
    if (this._preparing.has(key)) return this._preparing.get(key);
    if (!this.ctx) this.unlock();
    if (!this.useWebAudio) { this._audioElement(key); return; }
    const pending = (async () => {
      let bytes;
      try {
        bytes = await this._loadRaw(key);
        // decodeAudioData may consume its argument. Never pass retained raw.
        const buf = await this.ctx.decodeAudioData(bytes.slice(0));
        if (!(buf?.duration > 0)) throw new Error('Decoded audio is empty');
        this.buffers.set(key, buf);
        this.raw.delete(key);
        this._retry.delete(key);
      } catch (error) {
        // A later manual click must fetch fresh bytes after a failed decode.
        if (this.raw.get(key) === bytes) this.raw.delete(key);
        this._retry.add(key);
        throw error;
      }
    })();
    this._preparing.set(key, pending);
    try { return await pending; }
    finally { if (this._preparing.get(key) === pending) this._preparing.delete(key); }
  }

  _stopPlayback() {
    try { this._source?.stop(); } catch (_) {}
    this._source = null;
    this._activeElement?.pause?.();
    this._activeElement = null;
  }

  /** Cancel pending playback and active sound when the exercise is reset. */
  stop() {
    this._playRequest++;
    this._stopPlayback();
  }

  /** Manual playback. true = started; false = failed or superseded by a click. */
  async play(name) {
    const request = ++this._playRequest;
    let key, element;
    try {
      key = this._key(name);
      this._stopPlayback();
      this.unlock();
      await this._ensure(key);
      if (request !== this._playRequest) return false;
      if (this.useWebAudio) {
        if (this.ctx.state === 'suspended' && !(await this._resume)) return false;
        if (request !== this._playRequest) return false;
        const buf = this.buffers.get(key);
        if (!buf) return false;
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
        this._source = src;
        src.onended = () => { if (this._source === src) this._source = null; };
      } else {
        element = this._audioElement(key);
        this._activeElement = element;
        element.currentTime = 0;
        await element.play();
      }
      return request === this._playRequest;
    } catch (e) {
      if (request === this._playRequest && element && this.elements.get(key) === element) {
        element.pause?.();
        this.elements.delete(key);
        this._activeElement = null;
      }
      console.warn('phoneme play failed:', key, e);
      return false;
    }
  }
}
