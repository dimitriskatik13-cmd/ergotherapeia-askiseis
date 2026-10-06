// ─────────────────────────────────────────────────────────────────────────────
// ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — bootstrap & ενορχήστρωση UI.
// ─────────────────────────────────────────────────────────────────────────────
import { store } from './state.js';
import { Phonemes } from './audio.js';
import { Feedback } from './feedback.js';
import { Session } from './session.js';
import { buildSettings } from './ui/settings.js';
import { buildApproval } from './ui/approval.js';
import { buildPicker } from './ui/picker.js';
import { el, clear } from './ui/dom.js';
import { lettersByCase, findLetter } from './letters/index.js';

const MODES = [
  { value: 'demo', label: 'Δείξε μου' },
  { value: 'trace', label: 'Ακολούθησε' },
  { value: 'free', label: 'Ελεύθερη' },
];

function activeList(data) {
  const all = lettersByCase(data.case);
  const t = data.targetLetters;
  return t ? all.filter((l) => t.includes(l.char)) : all;
}
function currentLetter(data) {
  return findLetter(data.currentChar, data.case) || activeList(data)[0] || lettersByCase(data.case)[0];
}

function bootstrap() {
  const app = document.getElementById('app');
  clear(app);

  // Shared SVG symbols copied from Χτίζω πρόταση.
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + name); svg.appendChild(use); return svg;
  }
  const homeBtn = el('button', {class:'btn btn--home',type:'button',id:'home-button'}, [icon('ic-home'),'Αρχική']);
  const gear = el('button', {class:'btn btn--settings',type:'button','aria-label':'Ρυθμίσεις'}, [icon('ic-sliders'),'Ρυθμίσεις']);
  // Ορατό μόνο όταν το δάχτυλο δεν γράφει, για να μη μοιάζει η οθόνη χαλασμένη.
  const penOnlyNote = el('span', {class:'toolbar-note',id:'pen-only-note'}, ['Μόνο Pencil']);
  const toolbar = el('nav', {class:'activity-toolbar','aria-label':'Πλοήγηση δραστηριότητας'}, [homeBtn,gear,penOnlyNote]);

  // ── Backdrop (soft organic μπαλόνια) ─────────────────────────────────────────
  const backdrop = el('div', { class: 'backdrop', 'aria-hidden': 'true' }, [
    el('span', { class: 'blob blob--blue' }), el('span', { class: 'blob blob--green' }),
    el('span', { class: 'blob blob--orange' }), el('span', { class: 'blob blob--red' }),
  ]);

  // ── Paper (writing surface) ──────────────────────────────────────────────────
  const hint = el('div', { class: 'hint', id: 'hint', role: 'status', 'aria-live': 'polite' });
  // Μετά το «Μπράβο»: το παιδί συνεχίζει μόνο του, χωρίς να ψάχνει στο πλάι.
  const againBtn = el('button', { class: 'btn', type: 'button', id: 'paper-again' }, [icon('ic-refresh'), 'Ξανά']);
  const nextPaperBtn = el('button', { class: 'btn', type: 'button', id: 'paper-next' }, ['Επόμενο', el('span', { 'aria-hidden': 'true' }, ['▶'])]);
  const repDots = el('div', { class: 'paper-reps', role: 'img' });
  const paperActions = el('div', { class: 'paper-actions', id: 'paper-actions' }, [
    repDots, el('div', { class: 'paper-actions__buttons' }, [againBtn, nextPaperBtn]),
  ]);
  paperActions.hidden = true;
  const paper = el('section', { class: 'paper', id: 'paper' }, [hint, paperActions]);

  // ── Rail (έλεγχοι θεραπευτή) ─────────────────────────────────────────────────
  const bigLetter = el('button', { class: 'rail__char', type: 'button', id: 'pick-letter', 'aria-haspopup': 'dialog' });
  const prevBtn = el('button', { class: 'navbtn', 'aria-label': 'Προηγούμενο γράμμα' }, ['◀']);
  const nextBtn = el('button', { class: 'navbtn', 'aria-label': 'Επόμενο γράμμα' }, ['▶']);
  const letterRow = el('div', { class: 'rail__letterrow' }, [prevBtn, bigLetter, nextBtn]);

  const modesWrap = el('div', { class: 'rail__modes' });
  const modeButtons = MODES.map((m) => {
    const b = el('button', { class: 'modebtn', type: 'button', onclick: () => selectMode(m.value) }, [m.label]);
    modesWrap.appendChild(b);
    return { ...m, btn: b };
  });

  const doneBtn = el('button', { class: 'btn btn--cta', type: 'button' }, [icon('ic-check'),'Ολοκλήρωση']);
  const clearBtn = el('button', { class: 'btn btn--soft', type: 'button' }, [icon('ic-refresh'),'Καθαρισμός']);
  const phonBtn = el('button', { class: 'btn btn--soft', type: 'button' }, [icon('ic-speaker'),'Φώνημα']);
  const replayBtn = el('button', { class: 'btn btn--soft', type: 'button' }, [icon('ic-refresh'),'Επίδειξη ξανά']);
  const actions = el('div', { class: 'rail__actions' }, [doneBtn, clearBtn, phonBtn, replayBtn]);

  const rail = el('aside', { class: 'rail' }, [letterRow, modesWrap, actions]);

  const stage = el('main', { class: 'stage' }, [rail, el('div', { class: 'paper-wrap' }, [paper])]);

  const lettersChoice = el('button', {class:'menu-choice',type:'button',id:'choose-letters','aria-pressed':'false'}, ['Γράμματα']);
  const numbersChoice = el('button', {class:'menu-choice',type:'button',id:'choose-numbers','aria-pressed':'false'}, ['Αριθμοί']);
  let selectedActivity = null;
  const startBtn = el('button', {class:'btn menu-start',type:'button',id:'start-activity'}, ['Ξεκίνα']);
  startBtn.disabled = true;
  const home = el('section', {class:'home-menu',id:'home-screen','aria-labelledby':'home-title'}, [
    el('h1', {id:'home-title',tabindex:'-1'}, ['Γράφω Γράμματα']),
    el('p', {class:'home-menu__label'}, ['ΕΠΙΛΕΞΕ ΔΡΑΣΤΗΡΙΟΤΗΤΑ']),
    el('div', {class:'home-menu__choices',role:'group','aria-label':'Δραστηριότητα'}, [lettersChoice,numbersChoice]),
    startBtn,
  ]);
  const activity = el('div', {class:'activity-screen',id:'activity-screen'}, [toolbar,stage]);
  app.append(backdrop,home,activity);


  // ── Σύνδεση engine ───────────────────────────────────────────────────────────
  const phonemes = new Phonemes('sounds/');
  const feedback = new Feedback(null, hint); // surface μπαίνει μετά
  const session = new Session(paper, phonemes, hint, feedback);
  feedback.surface = session.surface;        // ο feedback χρειάζεται το ίδιο surface

  // ── Μετά την ολοκλήρωση: «Ξανά» / «Επόμενο» πάνω στο χαρτί ──────────────────
  const REWARD_MS = 2000;     // όσο κρατά το «Μπράβο»· τα κουμπιά δεν το σκεπάζουν
  let repsDone = 0, actionsTimer = null;
  function hidePaperActions() {
    clearTimeout(actionsTimer); actionsTimer = null;
    paperActions.hidden = true;
  }
  function showPaperActions() {
    actionsTimer = null;
    if (!session.completed) return;
    const data = store.all(), reps = data.reps, done = Math.min(repsDone, reps);
    const hasNext = activeList(data).length > 1;
    // Όσο μένουν επαναλήψεις προτείνεται το «Ξανά», μετά το «Επόμενο».
    const again = done < reps || !hasNext;
    againBtn.className = 'btn ' + (again ? 'btn--cta' : 'btn--ghost');
    nextPaperBtn.className = 'btn ' + (again ? 'btn--ghost' : 'btn--cta');
    nextPaperBtn.hidden = !hasNext;
    repDots.hidden = reps === 1;
    repDots.setAttribute('aria-label', `${done} από ${reps}`);
    repDots.replaceChildren(...Array.from({ length: reps }, (_, i) => el('span', { class: i < done ? 'is-done' : '' })));
    paperActions.hidden = false;
  }
  session.onComplete = () => {
    doneBtn.classList.add('is-done');
    repsDone++;
    clearTimeout(actionsTimer);
    actionsTimer = setTimeout(showPaperActions, REWARD_MS);
  };
  function writeAgain() { hidePaperActions(); doneBtn.classList.remove('is-done'); session.clearInk(); }

  // Ξεκλείδωμα ήχου στο πρώτο άγγιγμα. Ο ήχος κάθε γράμματος ετοιμάζεται όταν εμφανίζεται.
  const unlockOnce = () => { phonemes.unlock(); window.removeEventListener('pointerdown', unlockOnce); };
  window.addEventListener('pointerdown', unlockOnce, { once: true });

  // ── Settings panel + Approval ────────────────────────────────────────────────
  const approval = buildApproval(store);
  const settings = buildSettings({ store, onOpenApproval: approval.open });
  document.body.append(settings.backdrop, settings.panel);
  document.body.appendChild(approval.overlay);
  gear.addEventListener('click', settings.open);

  // ── Actions ──────────────────────────────────────────────────────────────────
  function selectMode(mode) {
    if (mode === 'trace' && store.get('mode') === 'trace') {
      hidePaperActions();
      session.clearInk();
      updateUI(store.all());
      return;
    }
    // Δεύτερο πάτημα στο «Δείξε μου» ξαναπαίζει την επίδειξη.
    if (mode === 'demo' && store.get('mode') === 'demo') { session.replayDemo(); return; }
    store.set('mode', mode);
  }

  doneBtn.addEventListener('click', () => session.completeByTherapist());
  clearBtn.addEventListener('click', writeAgain);
  againBtn.addEventListener('click', writeAgain);
  phonBtn.addEventListener('click', () => session.repeatPhoneme());
  replayBtn.addEventListener('click', () => session.replayDemo());

  function stepLetter(dir) {
    const data = store.all();
    const list = activeList(data);
    const idx = Math.max(0, list.findIndex((l) => l.char === data.currentChar));
    const next = list[(idx + dir + list.length) % list.length];
    if (next) store.set('currentChar', next.char);
  }
  prevBtn.addEventListener('click', () => stepLetter(-1));
  nextBtn.addEventListener('click', () => stepLetter(1));
  nextPaperBtn.addEventListener('click', () => stepLetter(1));

  // ── Γρήγορη επιλογή: πάτημα στο μεγάλο γράμμα ────────────────────────────────
  const picker = buildPicker({
    getList: () => activeList(store.all()),
    getCurrent: () => store.get('currentChar'),
    isNumbers: () => store.get('case') === 'numbers',
    onPick: (char) => store.set('currentChar', char),
  });
  document.body.appendChild(picker.overlay);
  bigLetter.addEventListener('click', picker.open);

  // ── UI sync ──────────────────────────────────────────────────────────────────
  function updateUI(data) {
    bigLetter.textContent = data.currentChar;
    const isNumber = data.case === 'numbers';
    bigLetter.setAttribute('aria-label', `${isNumber ? 'Επιλογή αριθμού' : 'Επιλογή γράμματος'}: ${data.currentChar}`);
    penOnlyNote.hidden = !data.penOnly;
    prevBtn.setAttribute('aria-label', isNumber ? 'Προηγούμενος αριθμός' : 'Προηγούμενο γράμμα');
    nextBtn.setAttribute('aria-label', isNumber ? 'Επόμενος αριθμός' : 'Επόμενο γράμμα');
    phonBtn.replaceChildren(icon('ic-speaker'), document.createTextNode(isNumber ? 'Άκουσε' : 'Φώνημα'));
    modeButtons.forEach((m) => {
      m.btn.classList.toggle('is-active', m.value === data.mode);
      m.btn.setAttribute('aria-pressed', String(m.value === data.mode));
    });
    replayBtn.style.display = data.mode === 'demo' ? '' : 'none';
    doneBtn.hidden = data.mode !== 'free';
    doneBtn.classList.toggle('is-done', session.completed);
    document.body.classList.toggle('hand-left', data.hand === 'left');
    const many = activeList(data).length > 1;
    prevBtn.disabled = nextBtn.disabled = bigLetter.disabled = !many;
    if (!paperActions.hidden) showPaperActions();
  }

  function react(data, patch) {
    session.applySettings(data);
    const restart = !patch || ('currentChar' in patch) || ('mode' in patch) || ('case' in patch) || ('targetLetters' in patch);
    if (restart) {
      const before = session.letter, mode = session.mode;
      session.configure({ letter: currentLetter(data), mode: data.mode });
      // Νέο γράμμα ή τρόπος: οι επαναλήψεις μετρούν από την αρχή.
      if (session.letter !== before || session.mode !== mode) { repsDone = 0; hidePaperActions(); }
      if (session.letter !== before) phonemes.warm(session.letter.phonemeAudio);
    }
    updateUI(data);
  }

  store.subscribe((data, patch) => react(data, patch));

  let lastLetterCase = store.get('case') === 'upper' ? 'upper' : 'lower';
  function openActivity(kind) {
    const current = store.all();
    if (current.case !== 'numbers') lastLetterCase = current.case;
    const category = kind === 'numbers' ? 'numbers' : lastLetterCase;
    const sameCategory = category === current.case;
    const character = sameCategory ? currentLetter(current).char : lettersByCase(category)[0].char;
    home.hidden = true; activity.hidden = false; document.body.classList.remove('is-home');
    session.surface.resize();
    store.update({case:category,currentChar:character,targetLetters:sameCategory ? current.targetLetters : null});
    if (!session.completed && session.mode !== 'demo') session.input.enable();
    if (session.mode === 'demo') session.replayDemo();
    homeBtn.focus();
  }
  function showHome() {
    phonemes.stop();
    session._interruptStroke(true);
    session.input.disable(); session._stopAnim(); feedback.stop();
    settings.close(); approval.close(); picker.close();
    activity.hidden = true; home.hidden = false; document.body.classList.add('is-home');
    home.querySelector('h1').focus();
  }
  function selectActivity(kind) {
    selectedActivity = kind;
    for (const [button, value] of [[lettersChoice,'letters'],[numbersChoice,'numbers']]) {
      button.classList.toggle('is-selected', kind === value);
      button.setAttribute('aria-pressed', String(kind === value));
    }
    startBtn.disabled = false;
  }
  lettersChoice.addEventListener('click', () => selectActivity('letters'));
  numbersChoice.addEventListener('click', () => selectActivity('numbers'));
  startBtn.addEventListener('click', () => { if (selectedActivity) openActivity(selectedActivity); });
  homeBtn.addEventListener('click', showHome);

  // αρχικό: εξασφάλισε έγκυρο currentChar για το τρέχον case/target
  const params = new URLSearchParams(location.search);
  const requestedCase = params.get('case') || 'lower';
  const requestedChar = params.get('char');
  if (requestedChar && findLetter(requestedChar, requestedCase)) {
    store.update({case:requestedCase, currentChar:requestedChar, targetLetters:null, mode:'trace'});
  }
  const init = store.all();
  if (!findLetter(init.currentChar, init.case)) {
    store.set('currentChar', activeList(init)[0].char);
  } else {
    react(store.all(), null);
  }

  // Normal entry always shows the two-category menu. Explicit character review
  // links keep their direct-entry behavior for local regression checks.
  if (requestedChar && findLetter(requestedChar, requestedCase)) {
    home.hidden = true; document.body.classList.remove('is-home');
  } else showHome();

  // ── Debug hook (μόνο με ?debug — για αυτοματοποιημένο έλεγχο) ─────────────────
  if (new URLSearchParams(location.search).has('debug')) {
    window.__GRAFO__ = {
      store, session,
      strokes: () => session.letter.strokes.map((s) => s.points),
      toClient: (x, y) => {
        const r = paper.getBoundingClientRect();
        return { x: r.left + session.surface.map.tx(x), y: r.top + session.surface.map.ty(y) };
      },
      inkBlank: () => {
        const c = session.surface.layers.ink;
        const ctx = c.getContext('2d');
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
        return true;
      },
      inkAlphaAt: (nx, ny) => {
        const s = session.surface;
        const X = Math.round(s.map.tx(nx) * s.dpr);
        const Y = Math.round(s.map.ty(ny) * s.dpr);
        return s.layers.ink.getContext('2d').getImageData(X, Y, 1, 1).data[3];
      },
      done: () => session.completed,
      lifts: [],
    };
    // Τι είδε ο έλεγχος σε κάθε σήκωμα: για διάγνωση «έγραψα σωστά και δεν το έπιασε».
    const readout = el('div', { class: 'debug-readout', id: 'debug-readout' });
    document.body.appendChild(readout);
    let strokeActive = false;
    const before = () => { strokeActive = session.input.activeId !== null; };
    const after = (event) => {
      if (!strokeActive && event.type !== 'pointerup') return;
      const t = session.tracer, side = session.surface.map.side, last = t?.lastPointer;
      const entry = { event: event.type, pointer: event.pointerType, wasWriting: strokeActive, completed: session.completed };
      if (t && t.coreLength) {
        const tol = t._tol(), lift = last ? Math.min(...t.samples.flat().map((q) => Math.hypot(q.x - last.x, q.y - last.y))) : null;
        Object.assign(entry, {
          coverage: t.samples.map((_, i) => Math.round(t.coverage(i) * 100)), need: Math.round(t.coverNeed * 100),
          liftPx: lift === null ? null : Math.round(lift * side), liftMaxPx: Math.round(tol * 1.5 * side),
          travel: +(t.travel / t.coreLength).toFixed(2), offShape: +t.offPathTravel.toFixed(3),
          offShapeMax: +Math.max(0.10, t.totalLength * t.maxOffPathRatio).toFixed(3), restart: t.retry, sidePx: Math.round(side),
        });
      }
      entry.outcome = entry.completed ? 'ΟΛΟΚΛΗΡΩΘΗΚΕ'
        : event.type !== 'pointerup' ? 'ΔΙΑΚΟΠΗ, δεν ελέγχθηκε'
          : strokeActive ? 'δεν ολοκληρώθηκε' : 'σήκωμα χωρίς ενεργή γραφή';
      window.__GRAFO__.lifts.push(entry);
      readout.textContent = `${window.__GRAFO__.lifts.length}. ${entry.event} · ` + (entry.coverage
        ? `κάλυψη ${entry.coverage.join('/')}% (θέλει ${entry.need}) · σήκωμα ${entry.liftPx}px (έως ${entry.liftMaxPx}) · διαδρομή ${entry.travel} (θέλει 0.72) · εκτός ${entry.offShape}/${entry.offShapeMax} · `
        : '') + entry.outcome;
    };
    // Αλλαγή μεγέθους της επιφάνειας την ώρα που γράφει: κόβει την πινελιά χωρίς γεγονός δείκτη.
    const interrupt = session._interruptStroke.bind(session);
    session._interruptStroke = (preserveTouch) => {
      if (session.pencil && preserveTouch) {
        window.__GRAFO__.lifts.push({ event: 'resize', wasWriting: true, completed: session.completed, outcome: 'ΔΙΑΚΟΠΗ από αλλαγή μεγέθους, δεν ελέγχθηκε', surface: [session.surface.w, session.surface.h] });
        readout.textContent = `${window.__GRAFO__.lifts.length}. ΔΙΑΚΟΠΗ από αλλαγή μεγέθους της επιφάνειας (${session.surface.w}×${session.surface.h}), δεν ελέγχθηκε`;
      }
      return interrupt(preserveTouch);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
      document.addEventListener(type, before, true);   // πριν από τον χειρισμό της εφαρμογής
      paper.addEventListener(type, after);              // μετά από αυτόν
    }
  }

  // ── Service worker (offline PWA) ─────────────────────────────────────────────
  if ('serviceWorker' in navigator && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
