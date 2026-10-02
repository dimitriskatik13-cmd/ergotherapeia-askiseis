// ─────────────────────────────────────────────────────────────────────────────
// Approval view — οθόνη «Έγκριση φοράς»: προεπισκόπηση ΟΛΩΝ των γραμμάτων με τα
// βέλη/αριθμούς φοράς, ΩΣΤΕ ο Δημήτρης να εγκρίνει γράμμα-γράμμα ΠΡΙΝ κλειδώσει
// οριστικά το dataset (Ενότητα 2 του spec — [ΕΞΑΡΤΗΣΗ]).
// ─────────────────────────────────────────────────────────────────────────────
import { el, clear, modalFocus } from './dom.js';
import { lettersByCase } from '../letters/index.js';
import { renderGuide, fieldMap, letterContentBottom } from '../engine/guide.js';

export function buildApproval(store) {
  const overlay = el('div', { class: 'approval', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'approval-title', 'aria-hidden': 'true', tabindex: '-1' });
  const head = el('div', { class: 'approval__head' });
  const grid = el('div', { class: 'approval__grid' });
  overlay.appendChild(head);
  overlay.appendChild(grid);
  const focus = modalFocus(overlay, { close, initialFocus: () => head.querySelector('.icon-btn') });

  let viewCase = 'lower';

  function cell(letter) {
    const SIZE = 200, dpr = 2;
    const cv = el('canvas');
    cv.width = SIZE * dpr; cv.height = SIZE * dpr;
    cv.style.width = SIZE + 'px'; cv.style.height = SIZE + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const map = fieldMap(SIZE, SIZE, 0.11, letterContentBottom(letter));
    renderGuide(ctx, SIZE, SIZE, letter, {
      map, lines: 'double',
      force: { guide: true, numbers: true, arrows: true },
    });
    const phon = letter.case === 'numbers' ? '' : ` /${letter.phonemeKey}/ ·`;
    const cap = el('div', { class: 'approval__cap' }, [
      el('strong', {}, [letter.char]),
      el('span', {}, [`${phon} ${letter.strokes.length} γρ.`]),
    ]);
    return el('div', { class: 'approval__cell' }, [cap, cv]);
  }

  function renderGridFor(c) {
    clear(grid);
    lettersByCase(c).forEach((l) => grid.appendChild(cell(l)));
  }

  function renderHead() {
    const restoreId = head.contains(document.activeElement) ? document.activeElement.id : null;
    clear(head);
    const seg = el('div', { class: 'seg' });
    [['lower', 'Πεζά'], ['upper', 'Κεφαλαία'], ['numbers', 'Αριθμοί']].forEach(([val, label]) => {
      seg.appendChild(el('button', {
        class: 'seg__btn' + (viewCase === val ? ' is-active' : ''), type: 'button',
        id: `approval-case-${val}`, 'aria-pressed': String(viewCase === val),
        onclick: () => { viewCase = val; renderHead(); renderGridFor(val); },
      }, [label]));
    });
    head.appendChild(el('div', { class: 'approval__titles' }, [
      el('h2', { id: 'approval-title' }, ['Έγκριση φοράς & σειράς γραμμών']),
      el('p', {}, ['Προεπισκόπηση προς έγκριση γράμμα-γράμμα (πρώτη κλινική εκδοχή).']),
    ]));
    head.appendChild(seg);
    head.appendChild(el('button', { class: 'icon-btn', id: 'approval-close', 'aria-label': 'Κλείσιμο', onclick: close }, ['✕']));
    if (restoreId) document.getElementById(restoreId)?.focus({ preventScroll: true });
  }

  function open() {
    viewCase = store.get('case');
    renderHead();
    renderGridFor(viewCase);
    grid.scrollTop = 0;
    focus.open();
  }
  function close() {
    focus.close();
  }

  return { overlay, open, close };
}
