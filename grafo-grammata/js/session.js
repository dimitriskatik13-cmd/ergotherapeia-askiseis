// ─────────────────────────────────────────────────────────────────────────────
// Session — ο πυρήνας μιας άσκησης γραφής: ενώνει Surface + Input + Pencil +
// Tracer + Animator + Phonemes + Feedback και υλοποιεί τους 4 τρόπους:
//   demo (Δείξε μου) · trace (Ακολούθησε) · fading (Σταδιακή) · free (Ελεύθερη)
// ─────────────────────────────────────────────────────────────────────────────
import { Surface } from './engine/surface.js';
import { InputController } from './engine/input.js';
import { Pencil } from './engine/pencil.js';
import { Tracer } from './engine/tracer.js';
import { Animator } from './engine/animator.js';
import { renderGuide, helpFlags } from './engine/guide.js';
import { GREEK_ORDER } from './letters/index.js';
import { STROKE_COLORS, PALETTE } from './palette.js';

const INK_COLOR = '#3a3f45';

export class Session {
  constructor(container, phonemes, hintEl, feedback) {
    this.surface = new Surface(container);
    this.phonemes = phonemes;
    this.feedback = feedback;
    this.settings = null;
    this.letter = null;
    this.mode = 'trace';
    this.tracer = null;
    this.animator = null;
    this.pencil = null;
    this.completed = false;
    this.onComplete = null;       // callback(letter)
    this.input = new InputController(this.surface, {
      onDown: (p) => this._down(p),
      onMove: (ps) => this._move(ps),
      onUp: (p) => this._up(p),
    });
    this.surface.onResize(() => this._redrawAll());
  }

  applySettings(s) {
    this.settings = s;
    this.surface.setPadRatio(0.20 - 0.17 * s.letterSize);
    if (this.tracer) this.tracer.setStrictness(s.strictness);
    this._redrawGuide();
  }

  accentFor(letter) {
    const i = Math.max(0, GREEK_ORDER.indexOf(letter.char.toLowerCase()));
    return STROKE_COLORS[i % STROKE_COLORS.length];
  }

  setLetter(letter) {
    this.letter = letter;
    this._start();
  }

  setMode(mode) {
    this.mode = mode;
    this._start();
  }

  /** Όρισε γράμμα ΚΑΙ mode μαζί με ΜΙΑ επανεκκίνηση. */
  configure({ letter, mode }) {
    if (letter) this.letter = letter;
    if (mode) this.mode = mode;
    this._start();
  }

  /** (Επαν)εκκίνηση της τρέχουσας άσκησης με βάση mode/letter/settings. */
  _start() {
    if (!this.letter || !this.settings) return;
    this._stopAnim();
    this.surface.clear('ink');
    this.surface.clear('fx');
    this.feedback.stop();
    this.feedback.clearHint();
    this.completed = false;
    this.pencil = null;

    const tracerActive = (this.mode === 'trace' || this.mode === 'fading');
    this.tracer = tracerActive ? new Tracer(this.letter, this.settings.strictness) : null;

    this._redrawGuide();

    if (this.mode === 'demo') {
      this.input.disable();
      this.replayDemo();
    } else {
      this.input.enable();
    }
  }

  _effectiveLevel() {
    if (this.mode === 'demo' || this.mode === 'trace') return 1;
    if (this.mode === 'free') return 4;
    return this.settings.helpLevel; // fading
  }

  _redrawGuide() {
    if (!this.letter || !this.settings) return;
    const surf = this.surface;
    surf.clear('guide');
    renderGuide(surf.ctx('guide'), surf.w, surf.h, this.letter, {
      map: surf.map,
      level: this._effectiveLevel(),
      lines: this.settings.lines,
      arrowOpts: { size: 0.044 },
    });
  }

  _redrawAll() {
    // μετά από resize: ξαναζωγράφισε οδηγό· η μελάνη/animation επανεκκινεί καθαρά
    this._redrawGuide();
    if (this.mode === 'demo' && !this.completed) this.replayDemo();
    else this.surface.clear('ink');
  }

  // ── Input → Pencil + Tracer ────────────────────────────────────────────────
  _down(p) {
    if (this.completed) return;
    this.pencil = new Pencil(this.surface.ctx('ink'), this.surface.map, {
      color: INK_COLOR,
      baseWidth: this.settings.penWidth,
      pressure: this.settings.pressure,
    });
    this.pencil.begin(p);
    if (this.tracer) {
      const h = this.tracer.beginTouch(p);
      this.tracer.feed([p]);           // το σημείο εκκίνησης μετράει στην κάλυψη
      if (h && h.msg) this.feedback.hint(h.msg);
    }
  }

  _move(ps) {
    if (!this.pencil) return;
    this.pencil.extend(ps);
    // Συγκεντρώνουμε κάλυψη ΧΩΡΙΣ να ολοκληρώνουμε εδώ — η ολοκλήρωση κρίνεται
    // μόνο στο σήκωμα του χεριού (ώστε να μην παίζει το φώνημα ενώ ακόμα γράφει).
    if (this.tracer) this.tracer.feed(ps);
  }

  _up(p) {
    if (!this.pencil) return;
    this.pencil.end();
    this.pencil = null;
    if (this.tracer && !this.completed) {
      this.tracer.feed([p]);           // το τελικό σημείο μετράει στην κάλυψη
      const r = this.tracer.endTouch();
      if (r && r.type === 'complete') this._completeInternal();
      else if (r && r.msg) this.feedback.hint(r.msg);
    }
  }

  // ── Ολοκλήρωση ──────────────────────────────────────────────────────────────
  _completeInternal() {
    if (this.completed) return;
    this.completed = true;
    this.input.disable();
    this._celebrate();          // ΧΩΡΙΣ ήχο — το φώνημα παίζει ΜΟΝΟ με το κουμπί 🔊
    if (this.onComplete) this.onComplete(this.letter);
  }

  /** Κουμπί «Ολοκλήρωση» (✓) του θεραπευτή — διακριτική επιβράβευση ΧΩΡΙΣ ήχο. */
  completeByTherapist() {
    if (this.completed) return;
    this.completed = true;
    this.input.disable();
    this._stopAnim();
    this._celebrate();
    if (this.onComplete) this.onComplete(this.letter);
  }

  _celebrate() {
    this.feedback.celebrate(this.letter, this.accentFor(this.letter));
  }

  /** Το ΜΟΝΟ σημείο που παίζει φώνημα: το κουμπί 🔊 Φώνημα του θεραπευτή. */
  repeatPhoneme() { if (this.letter) this.phonemes.play(this.letter.phonemeAudio); }

  clearInk() {
    this._stopAnim();
    this.surface.clear('ink');
    this.surface.clear('fx');
    this.feedback.stop();
    this.completed = false;
    if (this.tracer) this.tracer.reset();
    if (this.mode !== 'demo') this.input.enable();
    this._redrawGuide();
  }

  replayDemo() {
    if (!this.letter) return;
    this._stopAnim();
    this.surface.clear('ink');
    this.completed = false;
    this.animator = new Animator(this.surface, this.letter, {
      color: INK_COLOR,
      baseWidth: Math.max(this.settings.penWidth, 0.02),
      speed: this.settings.animSpeed,
    });
    this.animator.play(() => { /* μένει στην οθόνη */ });
  }

  _stopAnim() { if (this.animator) { this.animator.stop(); this.animator = null; } }
}
