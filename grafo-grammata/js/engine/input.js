// ─────────────────────────────────────────────────────────────────────────────
// InputController — Pointer Events για ομαλή γραφή δαχτύλου/Apple Pencil.
//   • pointerdown/move/up (ΟΧΙ ξεχωριστά mouse/touch)
//   • getCoalescedEvents() στο move → πιάνει τα πυκνά σημεία του Pencil
//   • setPointerCapture + preventDefault → η σελίδα ΔΕΝ scroll-άρει/zoom-άρει
//
// ΑΠΟΡΡΙΨΗ ΠΑΛΑΜΗΣ (palm rejection):
//   • Το Pencil έχει ΠΑΝΤΑ προτεραιότητα: αν γράφει κατά λάθος η παλάμη (touch)
//     και ακουμπήσει το Pencil, η τυχαία πινελιά ΑΚΥΡΩΝΕΤΑΙ (onCancel) και ο
//     έλεγχος περνά στο Pencil.
//   • Για λίγη ώρα μετά από κάθε επαφή Pencil (και στο hover), τα touch δεν
//     γράφουν — η παλάμη που ακουμπά ανάμεσα στα γράμματα αγνοείται σιωπηλά.
//   • Επαφές με μεγάλη επιφάνεια (πλάτος/ύψος επαφής) απορρίπτονται ως παλάμη.
//   • Ρύθμιση θεραπευτή «Μόνο Pencil»: το δάχτυλο δεν γράφει καθόλου.
//   • Δεύτερη ταυτόχρονη επαφή αγνοείται· pointercancel αναιρεί την πινελιά.
// Η CSS ορίζει touch-action:none στο surface element.
// ─────────────────────────────────────────────────────────────────────────────

// ΠΡΟΣΟΧΗ στα όρια: το iOS αναφέρει το ΚΑΝΟΝΙΚΟ δάχτυλο ως επαφή ~40-50px,
// οπότε το όριο παλάμης πρέπει να είναι αρκετά ψηλότερα — αλλιώς μπλοκάρεται
// η γραφή με δάχτυλο. Το sticky παράθυρο κρατιέται μικρό ώστε λίγο μετά το
// Pencil να ξαναδουλεύει το δάχτυλο.
const PEN_STICKY_MS = 8000;  // μετά από ΕΠΑΦΗ Pencil, το δάχτυλο δεν γράφει για τόσο
const PALM_SIZE_PX = 55;     // επαφή πλατύτερη από τόσο ⇒ παλάμη

export class InputController {
  constructor(surface, handlers = {}) {
    this.surface = surface;
    this.h = handlers;          // { onDown, onMove, onUp, onCancel }
    this.enabled = false;
    this.penOnly = false;
    this.activeId = null;
    this.activeType = null;
    this.lastPenTs = 0;
    const el = surface.el;
    el.addEventListener('pointerdown', (e) => this._handleDown(e));
    el.addEventListener('pointermove', (e) => this._handleMove(e));
    el.addEventListener('pointerup', (e) => this._handleUp(e, false));
    el.addEventListener('pointercancel', (e) => this._handleUp(e, true));
    el.addEventListener('pointerleave', (e) => this._handleUp(e, false));
    // Επιπλέον φραγμοί scroll/zoom στο ίδιο το στοιχείο.
    el.addEventListener('touchstart', (e) => { if (this.enabled) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', (e) => { if (this.enabled) e.preventDefault(); }, { passive: false });
  }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; this.activeId = null; this.activeType = null; }
  setPenOnly(v) { this.penOnly = !!v; }

  _pt(e) {
    const n = this.surface.toNorm(e.clientX, e.clientY);
    // pressure: 0 σε browsers χωρίς υποστήριξη → πέφτουμε σε 0.5
    let p = e.pressure;
    if (p === 0 || p == null) p = 0.5;
    return { x: n.x, y: n.y, p, type: e.pointerType };
  }

  /** Πρέπει αυτό το touch να αγνοηθεί ως παλάμη; */
  _rejectTouch(e) {
    if (e.pointerType !== 'touch') return false;
    if (this.penOnly) return true;
    if (Date.now() - this.lastPenTs < PEN_STICKY_MS) return true;
    if ((e.width || 0) > PALM_SIZE_PX || (e.height || 0) > PALM_SIZE_PX) return true;
    return false;
  }

  _handleDown(e) {
    if (!this.enabled) return;
    if (e.pointerType === 'pen') this.lastPenTs = Date.now();
    e.preventDefault();
    if (this.activeId !== null) {
      // Προτεραιότητα Pencil: ακύρωσε την πινελιά της παλάμης και πάρε τον έλεγχο.
      if (e.pointerType === 'pen' && this.activeType === 'touch') {
        try { this.surface.el.releasePointerCapture(this.activeId); } catch (_) {}
        this.activeId = null;
        this.activeType = null;
        if (this.h.onCancel) this.h.onCancel();
      } else {
        return; // δεύτερη ταυτόχρονη επαφή — αγνόησε
      }
    }
    if (this._rejectTouch(e)) return; // σιωπηλή απόρριψη παλάμης
    this.activeId = e.pointerId;
    this.activeType = e.pointerType;
    try { this.surface.el.setPointerCapture(e.pointerId); } catch (_) {}
    if (this.h.onDown) this.h.onDown(this._pt(e));
  }

  _handleMove(e) {
    // ΜΟΝΟ η επαφή (pointerdown) του Pencil ανανεώνει το sticky — όχι το hover,
    // αλλιώς το δάχτυλο μπλοκάρεται όσο το Pencil απλώς πλησιάζει την οθόνη.
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
    if (this.h.onMove) this.h.onMove(pts);
  }

  _handleUp(e, cancelled) {
    // το σήκωμα του Pencil μετράει ως «πρόσφατη χρήση» (sticky από το τέλος της πινελιάς)
    if (e.pointerType === 'pen') this.lastPenTs = Date.now();
    if (e.pointerId !== this.activeId) return;
    e.preventDefault();
    try { this.surface.el.releasePointerCapture(e.pointerId); } catch (_) {}
    this.activeId = null;
    this.activeType = null;
    if (cancelled) {
      if (this.h.onCancel) this.h.onCancel();
    } else if (this.h.onUp) {
      this.h.onUp(this._pt(e));
    }
  }
}
