// ─────────────────────────────────────────────────────────────────────────────
// Session — ο πυρήνας μιας άσκησης γραφής: ενώνει Surface + Input + Pencil +
// Tracer + Animator + Phonemes + Feedback και υλοποιεί τους 3 τρόπους:
//   demo (Δείξε μου) · trace (Ακολούθησε) · free (Ελεύθερη)
// ─────────────────────────────────────────────────────────────────────────────
import { Surface } from './engine/surface.js';
import { InputController } from './engine/input.js';
import { Pencil } from './engine/pencil.js';
import { Tracer } from './engine/tracer.js';
import { Animator } from './engine/animator.js';
import { renderGuide, letterContentBottom } from './engine/guide.js';

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
      onCancel: () => this._interruptStroke(),
      onBlocked: () => this.feedback.hint('Γράφει μόνο το Pencil ✏️'),
    });
    this._tracerSnap = null;
    this._inkSnap = null;
    this._inkStale = false;   // η προσπάθεια απορρίφθηκε: η μελάνη της δεν μετρά πια
    this._armsSeen = null;
    this.surface.onResize(() => this._redrawAll());
  }

  applySettings(s) {
    const sizeChanged = this.settings && this.settings.letterSize !== s.letterSize;
    this.settings = s;
    // Διευρυμένη διαβάθμιση: μέγιστο ≈ γεμίζει τον καμβά, ελάχιστο ≈ κανονικό
    // γράμμα τετραδίου Α5 (βλ. Surface: το γράμμα «κουμπώνει» στη γραμμή βάσης
    // και στο ελάχιστο φτάνει ~μέση της γραμμής).
    this.surface.setPadRatio(0.02 + 0.45 * (1 - s.letterSize));
    this.input.setPenOnly(s.penOnly);
    if (this.tracer) {
      this.tracer.setStrictness(s.strictness);
      this.tracer.setToleranceFloor(12 / this.surface.map.side);
    }
    this._redrawGuide();
    if (sizeChanged && this.mode === 'demo') this.animator?.redraw();
    if (sizeChanged && this.mode !== 'demo') {
      if (this.pencil) { this._interruptStroke(true); this.input.disable(); if (!this.completed) this.input.enable(); }
      this._redrawInk();
    }
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
    if ((!letter || letter === this.letter) && (!mode || mode === this.mode)) return;
    if (letter) this.letter = letter;
    if (mode) this.mode = mode;
    this._start();
  }

  /** (Επαν)εκκίνηση της τρέχουσας άσκησης με βάση mode/letter/settings. */
  _start() {
    if (!this.letter || !this.settings) return;
    this._audioAttempt = (this._audioAttempt || 0) + 1;
    this.phonemes.stop?.();
    this._stopAnim();
    this.surface.setContentBottom(letterContentBottom(this.letter));
    this.surface.clear('ink');
    this.feedback.stop();
    this.feedback.clearHint();
    this.completed = false;
    this.pencil = null;
    this.inkHistory = [];
    this.activeStroke = null;
    this._setInkStale(false);
    this._armsSeen = null;

    const tracerActive = this.mode === 'trace';
    this.tracer = tracerActive ? new Tracer(this.letter, this.settings.strictness) : null;
    if (this.tracer) this.tracer.setToleranceFloor(12 / this.surface.map.side);

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
    return 1;
  }

  _redrawGuide() {
    if (!this.letter || !this.settings) return;
    const surf = this.surface;
    surf.clear('guide');
    renderGuide(surf.ctx('guide'), surf.w, surf.h, this.letter, {
      map: surf.map,
      lineMap: surf.lineMap,
      level: this._effectiveLevel(),
      lines: this.settings.lines,
    });
  }

  _redrawInk() {
    this.surface.clear('ink');
    for (const stroke of this.inkHistory || []) {
      const pen = new Pencil(this.surface.ctx('ink'), this.surface.map, stroke.opts);
      pen.begin(stroke.points[0]);
      pen.extend(stroke.points.slice(1));
      pen.end();
    }
  }

  _redrawAll() {
    if (this.tracer) this.tracer.setToleranceFloor(12 / this.surface.map.side);
    this._redrawGuide();
    if (this.mode === 'demo') this.replayDemo();
    else {
      // Finished strokes are stored in letter coordinates, so rotation/resizing
      // preserves both the visible handwriting and the matching tracer progress.
      if (this.pencil) {
        this._interruptStroke(true);
        this.input.disable();
        if (!this.completed) this.input.enable();
      }
      this._redrawInk();
      if (this.completed) this.feedback?.showCompleted?.(this.letter, this.inkHistory);
    }
  }

  // ── Input → Pencil + Tracer ────────────────────────────────────────────────
  _down(p) {
    if (this.completed) return;
    // Στιγμιότυπο ΠΡΙΝ την πινελιά — αν αποδειχθεί «παλάμη» (έρθει Pencil ή
    // pointercancel), αναιρείται πλήρως: μελάνη ΚΑΙ πρόοδος ιχνηλάτησης.
    this._tracerSnap = this.tracer ? this.tracer.snapshot() : null;
    this._inkSnap = { history: this.inkHistory, stale: this._inkStale, arms: this._armsSeen };
    // Η απορριφθείσα προσπάθεια έμεινε αχνή ως εδώ. Η νέα γραφή ξεκινά καθαρή,
    // όπως ακριβώς ξεκινά από την αρχή και ο έλεγχος.
    if (this._inkStale) {
      this.inkHistory = [];
      this.surface.clear('ink');
      this._setInkStale(false);
    }
    let hint = null;
    if (this.tracer) {
      hint = this.tracer.beginTouch(p);
      this._dropRearmedInk();
    }
    this.pencil = new Pencil(this.surface.ctx('ink'), this.surface.map, {
      color: INK_COLOR,
      baseWidth: this.settings.penWidth,
      pressure: this.settings.pressure,
    });
    this.activeStroke = {points:[{...p}],opts:{color:INK_COLOR,baseWidth:this.settings.penWidth,pressure:this.settings.pressure},group:this.tracer?.active};
    this.pencil.begin(p);
    this.feedback.clearHint();
    if (this.tracer) {
      this.tracer.feed([p]);           // το σημείο εκκίνησης μετράει στην κάλυψη
      if (hint && hint.msg) this.feedback.hint(hint.msg);
    }
  }

  _move(ps) {
    if (!this.pencil) return;
    this.pencil.extend(ps);
    if (this.activeStroke) this.activeStroke.points.push(...ps.map(p=>({...p})));
    // Συγκεντρώνουμε κάλυψη ΧΩΡΙΣ να ολοκληρώνουμε εδώ — η ολοκλήρωση κρίνεται
    // μόνο στο σήκωμα του χεριού (ώστε να μην παίζει το φώνημα ενώ ακόμα γράφει).
    if (this.tracer) this.tracer.feed(ps);
  }

  _up(p) {
    if (!this.pencil) return;
    this.pencil.extend([p]); // Include the actual lift position, even without a final move event.
    this.pencil.end();
    const finished = this.activeStroke;
    if (finished) {
      finished.points.push({...p});
      this.inkHistory.push(finished);
      this.activeStroke = null;
    }
    this.pencil = null;
    this._tracerSnap = null;           // η πινελιά «έκατσε» — δεν αναιρείται πια
    this._inkSnap = null;
    if (this.tracer && !this.completed) {
      this.tracer.feed([p]);           // το τελικό σημείο μετράει στην κάλυψη
      const r = this.tracer.endTouch();
      this._dropRearmedInk(finished);
      if (r && r.type === 'complete') this._completeInternal();
      else {
        if (r && r.restart) this._setInkStale(true);
        if (r && r.msg) this.feedback.hint(r.msg);
      }
    }
  }

  // ── Η μελάνη ακολουθεί την πρόοδο του ελέγχου ──────────────────────────────
  // Ό,τι φαίνεται σκούρο στο χαρτί μετρά. Όταν ο έλεγχος ξεκινά από την αρχή,
  // η παλιά μελάνη δεν μένει να δείχνει ένα «έτοιμο» γράμμα που δεν εγκρίνεται.
  _setInkStale(stale) {
    this._inkStale = stale;
    this.surface.el.classList.toggle('has-stale-ink', stale);
  }

  /** Αριθμοί: κίνηση που ξαναρχίζει αφήνει πίσω τη μελάνη της παλιάς απόπειρας. */
  _dropRearmedInk(current = null) {
    const arms = this.tracer.arms;
    if (!arms) return;
    const seen = this._armsSeen || [];
    const rearmed = new Set(arms.flatMap((count, i) => (count !== (seen[i] || 0) ? [i] : [])));
    this._armsSeen = arms.slice();
    const kept = this.inkHistory.filter((stroke) => stroke === current || !rearmed.has(stroke.group));
    if (kept.length === this.inkHistory.length) return;
    this.inkHistory = kept;
    this._redrawInk();
  }

  // ── Αναίρεση τυχαίας πινελιάς (παλάμη / pointercancel) ─────────────────────
  // Keep real handwriting on capture loss/rotation. Only a cancelled touch
  // (potential palm) is rolled back. Interruption never approves the letter.
  _interruptStroke(preserveTouch = false) {
    if (!this.pencil) return;
    if (!preserveTouch && !['pen', 'mouse'].includes(this.activeStroke?.points[0]?.type)) {
      this._cancelStroke();
      return;
    }
    this.pencil.end();
    if (this.activeStroke) this.inkHistory.push(this.activeStroke);
    this.activeStroke = null;
    this.pencil = null;
    this._tracerSnap = null;
    this._inkSnap = null;
    if (this.tracer) this.tracer.touchAllowed = false;
    this.feedback.clearHint();
  }

  _cancelStroke() {
    if (!this.pencil) return;
    this.activeStroke = null;
    this.pencil = null;
    if (this.tracer && this._tracerSnap) this.tracer.restore(this._tracerSnap);
    this._tracerSnap = null;
    // Το άγγιγμα δεν έγινε ποτέ: γυρίζει πίσω και ό,τι καθάρισε ξεκινώντας.
    if (this._inkSnap) {
      this.inkHistory = this._inkSnap.history;
      this._armsSeen = this._inkSnap.arms;
      this._setInkStale(this._inkSnap.stale);
      this._inkSnap = null;
    }
    // Οι τελειωμένες πινελιές ξαναγράφονται από το ιστορικό· η ακυρωμένη όχι.
    this._redrawInk();
    this.feedback.clearHint();
  }

  // ── Ολοκλήρωση ──────────────────────────────────────────────────────────────
  _completeInternal() {
    if (this.completed) return;
    this.completed = true;
    this.input.disable();
    this.feedback.clearHint();
    this._celebrate();          // ΧΩΡΙΣ ήχο — το φώνημα παίζει ΜΟΝΟ με το κουμπί 🔊
    if (this.onComplete) this.onComplete(this.letter);
  }

  /** Κουμπί «Ολοκλήρωση» (✓) του θεραπευτή — διακριτική επιβράβευση ΧΩΡΙΣ ήχο. */
  completeByTherapist() {
    if (this.completed) return;
    this.completed = true;
    this.input.disable();
    this.feedback.clearHint();
    this._stopAnim();
    this._setInkStale(false);
    this._celebrate();
    if (this.onComplete) this.onComplete(this.letter);
  }

  _celebrate() {
    this.feedback.celebrate(this.letter, this.inkHistory);
  }

  /** Το ΜΟΝΟ σημείο που παίζει φώνημα: το κουμπί 🔊 Φώνημα του θεραπευτή. */
  async repeatPhoneme() {
    if (!this.letter) return;
    const letter = this.letter;
    const attempt = this._audioAttempt = (this._audioAttempt || 0) + 1;
    this.feedback.clearHint();
    const played = await this.phonemes.play(letter.phonemeAudio);
    if (played === false && attempt === this._audioAttempt && letter === this.letter) {
      this.feedback.hint('Δεν ακούστηκε ο ήχος. Πάτησε ξανά.');
    }
    return played;
  }

  clearInk() {
    this._audioAttempt = (this._audioAttempt || 0) + 1;
    this.phonemes.stop?.();
    this.input.disable();
    this.pencil = null;
    this.activeStroke = null;
    this.inkHistory = [];
    this._stopAnim();
    this.surface.clear('ink');
    this.feedback.stop();
    this.feedback.clearHint();
    this.completed = false;
    this._setInkStale(false);
    this._armsSeen = null;
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
