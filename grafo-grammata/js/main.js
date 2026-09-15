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
  const toolbar = el('nav', {class:'activity-toolbar','aria-label':'Πλοήγηση δραστηριότητας'}, [homeBtn,gear]);
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
    const isNumber = data.case === 'numbers';
    prevBtn.setAttribute('aria-label', isNumber ? 'Προηγούμενος αριθμός' : 'Προηγούμενο γράμμα');
    nextBtn.setAttribute('aria-label', isNumber ? 'Επόμενος αριθμός' : 'Επόμενο γράμμα');
    phonBtn.replaceChildren(icon('ic-speaker'), document.createTextNode(isNumber ? 'Άκουσε' : 'Φώνημα'));
    modeButtons.forEach((m) => m.btn.classList.toggle('is-active', m.value === data.mode));
    replayBtn.style.display = data.mode === 'demo' ? '' : 'none';
    doneBtn.classList.toggle('is-done', session.completed);
    document.body.classList.toggle('hand-left', data.hand === 'left');
    const many = activeList(data).length > 1;
    prevBtn.disabled = nextBtn.disabled = !many;
  }

  function react(data, patch) {
    session.applySettings(data);
    const restart = !patch || ('currentChar' in patch) || ('mode' in patch) || ('case' in patch) || ('targetLetters' in patch);
    if (restart) session.configure({ letter: currentLetter(data), mode: data.mode });
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
    session._interruptStroke(true);
    session.input.disable(); session._stopAnim(); feedback.stop();
    settings.close(); approval.close();
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
    };
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
