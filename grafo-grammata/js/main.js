// ─────────────────────────────────────────────────────────────────────────────
// ΣΥΝΟΙΔΑ · «Γράφω Γράμματα» — bootstrap & ενορχήστρωση UI.
// ─────────────────────────────────────────────────────────────────────────────
import { store } from './state.js';
import { Phonemes } from './audio.js';
import { Feedback } from './feedback.js';
import { Session } from './session.js';
import { buildSettings } from './ui/settings.js';
import { buildApproval } from './ui/approval.js';
import { el, clear } from './ui/dom.js';
import { lettersByCase, findLetter, uniquePhonemeFiles } from './letters/index.js';
import { APP_VERSION } from './version.js';

const MODES = [
  { value: 'demo', label: 'Δείξε μου' },
  { value: 'trace', label: 'Ακολούθησε' },
  { value: 'fading', label: 'Σταδιακή' },
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

  // ── Header: το chrome ΣΥΝΟΙΔΑ είναι στατικό στο index.html — εδώ μπαίνει
  // μόνο το γρανάζι ρυθμίσεων και η έκδοση στο υποσέλιδο.
  const gear = el('button', { class: 'icon-btn gear', 'aria-label': 'Ρυθμίσεις', title: 'Ρυθμίσεις θεραπευτή' }, ['⚙️']);
  document.getElementById('gear-slot')?.appendChild(gear);
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = `έκδ. ${APP_VERSION}`;

  // ── Backdrop (soft organic μπαλόνια) ─────────────────────────────────────────
  const backdrop = el('div', { class: 'backdrop', 'aria-hidden': 'true' }, [
    el('span', { class: 'blob blob--blue' }), el('span', { class: 'blob blob--green' }),
    el('span', { class: 'blob blob--orange' }), el('span', { class: 'blob blob--red' }),
  ]);

  // ── Paper (writing surface) ──────────────────────────────────────────────────
  const hint = el('div', { class: 'hint', id: 'hint' });
  const paper = el('section', { class: 'paper', id: 'paper' }, [hint]);

  // ── Rail (έλεγχοι θεραπευτή) ─────────────────────────────────────────────────
  const bigLetter = el('div', { class: 'rail__char' });
  const prevBtn = el('button', { class: 'navbtn', 'aria-label': 'Προηγούμενο γράμμα' }, ['◀']);
  const nextBtn = el('button', { class: 'navbtn', 'aria-label': 'Επόμενο γράμμα' }, ['▶']);
  const letterRow = el('div', { class: 'rail__letterrow' }, [prevBtn, bigLetter, nextBtn]);

  const modesWrap = el('div', { class: 'rail__modes' });
  const modeButtons = MODES.map((m) => {
    const b = el('button', { class: 'modebtn', type: 'button', onclick: () => store.set('mode', m.value) }, [m.label]);
    modesWrap.appendChild(b);
    return { ...m, btn: b };
  });

  const doneBtn = el('button', { class: 'btn btn--cta', type: 'button' }, ['✓ Ολοκλήρωση']);
  const clearBtn = el('button', { class: 'btn btn--soft', type: 'button' }, ['↺ Καθαρισμός']);
  const phonBtn = el('button', { class: 'btn btn--soft', type: 'button' }, ['🔊 Φώνημα']);
  const replayBtn = el('button', { class: 'btn btn--soft', type: 'button' }, ['▶ Επίδειξη ξανά']);
  const actions = el('div', { class: 'rail__actions' }, [doneBtn, clearBtn, phonBtn, replayBtn]);

  const rail = el('aside', { class: 'rail' }, [letterRow, modesWrap, actions]);

  const stage = el('main', { class: 'stage' }, [rail, el('div', { class: 'paper-wrap' }, [paper])]);

  app.appendChild(backdrop);
  app.appendChild(stage);

  // ── Σύνδεση engine ───────────────────────────────────────────────────────────
  const phonemes = new Phonemes('sounds/');
  const feedback = new Feedback(null, hint); // surface μπαίνει μετά
  const session = new Session(paper, phonemes, hint, feedback);
  feedback.surface = session.surface;        // ο feedback χρειάζεται το ίδιο surface

  session.onComplete = () => { doneBtn.classList.add('is-done'); };

  // Ξεκλείδωμα ήχου στο πρώτο άγγιγμα + προθέρμανση cache φωνημάτων.
  const unlockOnce = () => { phonemes.unlock(); window.removeEventListener('pointerdown', unlockOnce); };
  window.addEventListener('pointerdown', unlockOnce, { once: true });
  phonemes.preload(uniquePhonemeFiles());

  // ── Settings panel + Approval ────────────────────────────────────────────────
  const approval = buildApproval(store);
  const settings = buildSettings({ store, onOpenApproval: approval.open });
  document.body.appendChild(settings.panel);
  document.body.appendChild(approval.overlay);
  gear.addEventListener('click', settings.open);

  // ── Actions ──────────────────────────────────────────────────────────────────
  doneBtn.addEventListener('click', () => session.completeByTherapist());
  clearBtn.addEventListener('click', () => { doneBtn.classList.remove('is-done'); session.clearInk(); });
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

  // ── UI sync ──────────────────────────────────────────────────────────────────
  function updateUI(data) {
    bigLetter.textContent = data.currentChar;
    modeButtons.forEach((m) => m.btn.classList.toggle('is-active', m.value === data.mode));
    replayBtn.style.display = data.mode === 'demo' ? '' : 'none';
    doneBtn.classList.remove('is-done');
    document.body.classList.toggle('hand-left', data.hand === 'left');
    const many = activeList(data).length > 1;
    prevBtn.disabled = nextBtn.disabled = !many;
  }

  let last = { currentChar: null, mode: null, case: null };
  function react(data, patch) {
    session.applySettings(data);
    updateUI(data);
    const restart = !patch || ('currentChar' in patch) || ('mode' in patch) || ('case' in patch) || ('targetLetters' in patch);
    if (restart) session.configure({ letter: currentLetter(data), mode: data.mode });
  }

  store.subscribe((data, patch) => react(data, patch));

  // αρχικό: εξασφάλισε έγκυρο currentChar για το τρέχον case/target
  const init = store.all();
  if (!findLetter(init.currentChar, init.case)) {
    store.set('currentChar', activeList(init)[0].char);
  } else {
    react(store.all(), null);
  }

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
    };
  }

  // ── Service worker (offline PWA) ─────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
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
