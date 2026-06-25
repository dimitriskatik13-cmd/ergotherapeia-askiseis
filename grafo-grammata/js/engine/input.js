// ─────────────────────────────────────────────────────────────────────────────
// InputController — Pointer Events για ομαλή γραφή δαχτύλου/Apple Pencil.
//   • pointerdown/move/up (ΟΧΙ ξεχωριστά mouse/touch)
//   • getCoalescedEvents() στο move → πιάνει τα πυκνά σημεία του Pencil
//   • setPointerCapture + preventDefault → η σελίδα ΔΕΝ scroll-άρει/zoom-άρει
//   • normalized συντεταγμένες + pressure
// Η CSS ορίζει touch-action:none στο surface element.
// ─────────────────────────────────────────────────────────────────────────────

export class InputController {
  constructor(surface, handlers = {}) {
    this.surface = surface;
    this.h = handlers;          // { onDown, onMove, onUp }
    this.enabled = false;
    this.activeId = null;
    const el = surface.el;
    this._down = (e) => this._handleDown(e);
    this._move = (e) => this._handleMove(e);
    this._up = (e) => this._handleUp(e);
    el.addEventListener('pointerdown', this._down);
    el.addEventListener('pointermove', this._move);
    el.addEventListener('pointerup', this._up);
    el.addEventListener('pointercancel', this._up);
    el.addEventListener('pointerleave', this._up);
    // Επιπλέον φραγμοί scroll/zoom στο ίδιο το στοιχείο.
    el.addEventListener('touchstart', (e) => { if (this.enabled) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', (e) => { if (this.enabled) e.preventDefault(); }, { passive: false });
  }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; this.activeId = null; }

  _pt(e) {
    const n = this.surface.toNorm(e.clientX, e.clientY);
    // pressure: 0 σε browsers χωρίς υποστήριξη → πέφτουμε σε 0.5
    let p = e.pressure;
    if (p === 0 || p == null) p = (e.pointerType === 'pen') ? 0.5 : 0.5;
    return { x: n.x, y: n.y, p, type: e.pointerType };
  }

  _handleDown(e) {
    if (!this.enabled || this.activeId !== null) return;
    e.preventDefault();
    this.activeId = e.pointerId;
    try { this.surface.el.setPointerCapture(e.pointerId); } catch (_) {}
    this.h.onDown && this.h.onDown(this._pt(e));
  }

  _handleMove(e) {
    if (!this.enabled || e.pointerId !== this.activeId) return;
    e.preventDefault();
    let evs = [];
    if (typeof e.getCoalescedEvents === 'function') {
      const c = e.getCoalescedEvents();
      evs = (c && c.length) ? c : [e];
    } else {
      evs = [e];
    }
    const pts = evs.map((ev) => this._pt(ev));
    this.h.onMove && this.h.onMove(pts);
  }

  _handleUp(e) {
    if (e.pointerId !== this.activeId) return;
    e.preventDefault();
    try { this.surface.el.releasePointerCapture(e.pointerId); } catch (_) {}
    this.activeId = null;
    this.h.onUp && this.h.onUp(this._pt(e));
  }
}
