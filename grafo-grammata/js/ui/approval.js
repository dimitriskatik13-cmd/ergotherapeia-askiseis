// ─────────────────────────────────────────────────────────────────────────────
// Approval view — οθόνη «Έγκριση φοράς»: προεπισκόπηση ΟΛΩΝ των γραμμάτων με τα
// βέλη/αριθμούς φοράς, ΩΣΤΕ ο Δημήτρης να εγκρίνει γράμμα-γράμμα ΠΡΙΝ κλειδώσει
// οριστικά το dataset (Ενότητα 2 του spec — [ΕΞΑΡΤΗΣΗ]).
// ─────────────────────────────────────────────────────────────────────────────
import { el, clear } from './dom.js';
import { lettersByCase } from '../letters/index.js';
import { renderGuide, fieldMap } from '../engine/guide.js';

export function buildApproval(store) {
  const overlay = el('div', { class: 'approval', 'aria-hidden': 'true' });
  const head = el('div', { class: 'approval__head' });
  const grid = el('div', { class: 'approval__grid' });
  overlay.appendChild(head);
  overlay.appendChild(grid);

  let viewCase = 'lower';

  function cell(letter) {
    const SIZE = 200, dpr = 2;
    const cv = el('canvas');
    cv.width = SIZE * dpr; cv.height = SIZE * dpr;
    cv.style.width = SIZE + 'px'; cv.style.height = SIZE + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const map = fieldMap(SIZE, SIZE, 0.11);
    renderGuide(ctx, SIZE, SIZE, letter, {
      map, lines: 'double',
      force: { guide: true, numbers: true, arrows: true },
      arrowOpts: { fractions: [0.32, 0.7], size: 0.03 },
    });
    const cap = el('div', { class: 'approval__cap' }, [
      el('strong', {}, [letter.char]),
      el('span', {}, [` /${letter.phonemeKey}/ · ${letter.strokes.length} γρ.`]),
    ]);
    return el('div', { class: 'approval__cell' }, [cap, cv]);
  }

  function renderGridFor(c) {
    clear(grid);
    lettersByCase(c).forEach((l) => grid.appendChild(cell(l)));
  }

  function renderHead() {
    clear(head);
    const seg = el('div', { class: 'seg' });
    [['lower', 'Πεζά'], ['upper', 'Κεφαλαία']].forEach(([val, label]) => {
      seg.appendChild(el('button', {
        class: 'seg__btn' + (viewCase === val ? ' is-active' : ''), type: 'button',
        onclick: () => { viewCase = val; renderHead(); renderGridFor(val); },
      }, [label]));
    });
    head.appendChild(el('div', { class: 'approval__titles' }, [
      el('h2', {}, ['Έγκριση φοράς & σειράς γραμμών']),
      el('p', {}, ['Προεπισκόπηση προς έγκριση γράμμα-γράμμα (πρώτη κλινική εκδοχή).']),
    ]));
    head.appendChild(seg);
    head.appendChild(el('button', { class: 'icon-btn', 'aria-label': 'Κλείσιμο', onclick: close }, ['✕']));
  }

  function open() {
    viewCase = store.get('case');
    renderHead();
    renderGridFor(viewCase);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }
  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  return { overlay, open, close };
}
