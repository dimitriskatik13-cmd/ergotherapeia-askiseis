// ─────────────────────────────────────────────────────────────────────────────
// Surface — διαχειρίζεται τρία στοιβαγμένα canvases με σωστό devicePixelRatio
// scaling (καθαρή γραμμή σε Retina) και κοινή αντιστοίχιση normalized↔pixels:
//   guide  : γραμμές τετραδίου, αχνός οδηγός, αριθμοί, βέλη (στατικό)
//   ink    : η γραφή του παιδιού + animation «μολυβιού»
//   fx     : διακριτική επιβράβευση (glow, μπαλόνια)
// ─────────────────────────────────────────────────────────────────────────────
import { fieldMap } from './guide.js';

export class Surface {
  constructor(container) {
    this.el = container;
    this.layers = {};
    ['guide', 'ink', 'fx'].forEach((name, i) => {
      const cv = document.createElement('canvas');
      cv.className = `surf-layer surf-${name}`;
      cv.style.zIndex = String(i + 1);
      this.el.appendChild(cv);
      this.layers[name] = cv;
    });
    this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.w = 0; this.h = 0;
    this.map = null;
    this.padRatio = 0.08;
    this._onResize = null;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.el);
    this.resize();
  }

  setPadRatio(p) { this.padRatio = p; this._recomputeMap(); }

  _recomputeMap() {
    if (this.w > 0 && this.h > 0) this.map = fieldMap(this.w, this.h, this.padRatio);
  }

  ctx(name) { return this.layers[name].getContext('2d'); }

  resize() {
    const rect = this.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    for (const name of Object.keys(this.layers)) {
      const cv = this.layers[name];
      cv.width = Math.round(w * this.dpr);
      cv.height = Math.round(h * this.dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      const ctx = cv.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this._recomputeMap();
    if (this._onResize) this._onResize();
  }

  onResize(cb) { this._onResize = cb; }

  /** Καθαρισμός ενός layer (σε CSS pixels). */
  clear(name) {
    const ctx = this.ctx(name);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.layers[name].width, this.layers[name].height);
    ctx.restore();
  }

  /** Event client coords → normalized πεδίο [0,1]² (μπορεί να βγει εκτός [0,1]). */
  toNorm(clientX, clientY) {
    const rect = this.el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const m = this.map;
    return { x: (px - (this.w - m.side) / 2) / m.side, y: (py - (this.h - m.side) / 2) / m.side };
  }

  destroy() { this._ro.disconnect(); }
}
