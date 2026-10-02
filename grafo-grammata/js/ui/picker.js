// ─────────────────────────────────────────────────────────────────────────────
// Picker — γρήγορη μετάβαση σε γράμμα ή αριθμό με ένα πάτημα.
// Δείχνει τη λίστα που ήδη κυκλοφορούν τα βελάκια ◀ ▶ και αλλάζει ΜΟΝΟ τον
// τρέχοντα χαρακτήρα. Οι στοχευμένοι χαρακτήρες ορίζονται στις Ρυθμίσεις.
// ─────────────────────────────────────────────────────────────────────────────
import { el, clear, modalFocus } from './dom.js';

export function buildPicker({ getList, getCurrent, isNumbers, onPick }) {
  const title = el('h2', { class: 'panel__title', id: 'picker-title' });
  const grid = el('div', { class: 'picker__grid', role: 'group', 'aria-labelledby': 'picker-title' });
  const card = el('div', { class: 'picker__card' }, [
    el('div', { class: 'picker__head' }, [
      title,
      el('button', { class: 'icon-btn', type: 'button', id: 'picker-close', 'aria-label': 'Κλείσιμο', onclick: () => close() }, ['✕']),
    ]),
    grid,
  ]);
  const overlay = el('div', {
    class: 'picker', id: 'picker', role: 'dialog', 'aria-modal': 'true',
    'aria-labelledby': 'picker-title', 'aria-hidden': 'true', tabindex: '-1',
  }, [card]);
  // Πάτημα έξω από την κάρτα κλείνει, χωρίς να φτάσει στο χαρτί.
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const focus = modalFocus(overlay, { close, initialFocus: () => grid.querySelector('.is-current') || grid.querySelector('.chip') });

  function open() {
    title.textContent = isNumbers() ? 'Διάλεξε αριθμό' : 'Διάλεξε γράμμα';
    clear(grid);
    for (const letter of getList()) {
      const current = letter.char === getCurrent();
      grid.appendChild(el('button', {
        class: 'chip' + (current ? ' is-current' : ''), type: 'button',
        'aria-pressed': String(current),
        onclick: () => { close(); onPick(letter.char); },
      }, [letter.char]));
    }
    focus.open();
  }
  function close() { focus.close(); }

  return { overlay, open, close };
}
