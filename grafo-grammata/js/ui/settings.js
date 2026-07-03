// ─────────────────────────────────────────────────────────────────────────────
// Settings panel — διακριτικό πάνελ ρυθμίσεων θεραπευτή (κουμπί ⚙️).
// Στοχευμένα γράμματα · επίπεδο βοήθειας · αυστηρότητα · διαβάθμιση (πάχος,
// πίεση, μέγεθος, γραμμές, ταχύτητα) · δεξιόχειρας/αριστερόχειρας.
// Γράφει κατευθείαν στο store· το main.js αντιδρά μέσω subscribe.
// ─────────────────────────────────────────────────────────────────────────────
import { el, clear } from './dom.js';
import { lettersByCase } from '../letters/index.js';

function segmented(label, options, getValue, onPick) {
  const seg = el('div', { class: 'seg' });
  const render = () => {
    clear(seg);
    options.forEach((o) => {
      const active = getValue() === o.value;
      seg.appendChild(el('button', {
        class: 'seg__btn' + (active ? ' is-active' : ''),
        type: 'button',
        onclick: () => { onPick(o.value); render(); },
      }, [o.label]));
    });
  };
  render();
  return el('div', { class: 'field' }, [el('label', { class: 'field__label' }, [label]), seg]);
}

function slider(label, lo, hi, getValue, onInput, fmt) {
  const input = el('input', {
    type: 'range', min: '0', max: '1000', value: String(Math.round(toUnit(getValue()) * 1000)),
    class: 'slider',
  });
  const ends = el('div', { class: 'field__ends' }, [el('span', {}, [lo]), el('span', {}, [hi])]);
  input.addEventListener('input', () => {
    const v = parseInt(input.value, 10) / 1000;
    onInput(v);
  });
  return el('div', { class: 'field' }, [el('label', { class: 'field__label' }, [label]), input, ends]);
  function toUnit(x) { return Math.max(0, Math.min(1, x)); }
}

function toggle(label, getValue, onToggle) {
  const btn = el('button', { class: 'switch', type: 'button', role: 'switch' });
  const knob = el('span', { class: 'switch__knob' });
  btn.appendChild(knob);
  const sync = () => btn.classList.toggle('is-on', !!getValue());
  btn.addEventListener('click', () => { onToggle(!getValue()); sync(); });
  sync();
  return el('div', { class: 'field field--row' }, [el('label', { class: 'field__label' }, [label]), btn]);
}

export function buildSettings({ store, onOpenApproval }) {
  const panel = el('aside', { class: 'panel', id: 'panel', 'aria-hidden': 'true' });
  const inner = el('div', { class: 'panel__inner' });
  panel.appendChild(inner);

  function rebuild() {
    clear(inner);
    const s = store.all();

    inner.appendChild(el('div', { class: 'panel__head' }, [
      el('h2', { class: 'panel__title' }, ['Ρυθμίσεις θεραπευτή']),
      el('button', { class: 'icon-btn', 'aria-label': 'Κλείσιμο', onclick: () => close() }, ['✕']),
    ]));

    // Πεζά / Κεφαλαία
    inner.appendChild(segmented('Σετ γραμμάτων',
      [{ label: 'Πεζά', value: 'lower' }, { label: 'Κεφαλαία', value: 'upper' }],
      () => store.get('case'),
      (v) => {
        if (v === store.get('case')) return;
        const first = lettersByCase(v)[0].char;
        store.update({ case: v, targetLetters: null, currentChar: first });
        rebuild();
      }));

    // Στοχευμένα γράμματα
    inner.appendChild(buildLetterChips(store));

    // Τρόπος βοήθειας (fading level)
    inner.appendChild(segmented('Επίπεδο βοήθειας (Σταδιακή)',
      [1, 2, 3, 4].map((n) => ({ label: String(n), value: n })),
      () => store.get('helpLevel'),
      (v) => store.set('helpLevel', v)));
    inner.appendChild(el('p', { class: 'hintnote' }, [
      'Επ.1: οδηγός+αριθμοί+βέλη · Επ.2: −βέλη · Επ.3: μόνο σημεία έναρξης · Επ.4: χωρίς οδηγό',
    ]));

    // Αυστηρότητα
    inner.appendChild(slider('Αυστηρότητα ελέγχου', 'Χαλαρό', 'Αυστηρό',
      () => store.get('strictness'), (v) => store.set('strictness', v)));

    inner.appendChild(el('div', { class: 'panel__sep' }, ['Διαβάθμιση']));

    // Πάχος
    inner.appendChild(slider('Πάχος γραμμής', 'Λεπτό', 'Παχύ',
      () => (store.get('penWidth') - 0.008) / (0.034 - 0.008),
      (v) => store.set('penWidth', 0.008 + v * (0.034 - 0.008))));

    // Πίεση
    inner.appendChild(toggle('Απόκριση πίεσης (Pencil)',
      () => store.get('pressure'), (v) => store.set('pressure', v)));

    // Μέγεθος (ελάχιστο ≈ κανονικό γράμμα σε τετράδιο Α5)
    inner.appendChild(slider('Μέγεθος γράμματος', 'Τετράδιο Α5', 'Μεγάλο',
      () => store.get('letterSize'), (v) => store.set('letterSize', v)));

    // Γραμμές τετραδίου
    inner.appendChild(segmented('Γραμμές τετραδίου',
      [{ label: 'Καμία', value: 'none' }, { label: 'Απλή', value: 'single' }, { label: 'Διπλή', value: 'double' }],
      () => store.get('lines'), (v) => store.set('lines', v)));

    // Ταχύτητα επίδειξης
    inner.appendChild(slider('Ταχύτητα επίδειξης', 'Αργή', 'Γρήγορη',
      () => store.get('animSpeed'), (v) => store.set('animSpeed', v)));

    inner.appendChild(el('div', { class: 'panel__sep' }, ['Εργονομία']));

    // Χέρι
    inner.appendChild(segmented('Χέρι',
      [{ label: 'Δεξί', value: 'right' }, { label: 'Αριστερό', value: 'left' }],
      () => store.get('hand'), (v) => store.set('hand', v)));

    // Έγκριση φοράς
    inner.appendChild(el('button', {
      class: 'btn btn--ghost btn--block', type: 'button', onclick: () => { close(); onOpenApproval(); },
    }, ['🔎 Έγκριση φοράς (προεπισκόπηση)']));

    inner.appendChild(el('p', { class: 'hintnote hintnote--muted' }, [
      'Δεν αποθηκεύεται κανένα δεδομένο παιδιού. Οι ρυθμίσεις μένουν τοπικά στη συσκευή.',
    ]));
  }

  function buildLetterChips(store) {
    const wrap = el('div', { class: 'field' }, [el('label', { class: 'field__label' }, ['Στοχευμένα γράμματα'])]);
    const grid = el('div', { class: 'chips' });
    const list = lettersByCase(store.get('case'));
    const sel = store.get('targetLetters');
    const allBtn = el('button', {
      class: 'chip chip--all' + (!sel ? ' is-active' : ''), type: 'button',
      onclick: () => { store.update({ targetLetters: null }); rebuild(); },
    }, ['Όλα']);
    grid.appendChild(allBtn);
    list.forEach((l) => {
      const active = sel && sel.includes(l.char);
      grid.appendChild(el('button', {
        class: 'chip' + (active ? ' is-active' : ''), type: 'button',
        onclick: () => {
          let cur = store.get('targetLetters') ? [...store.get('targetLetters')] : [];
          if (cur.includes(l.char)) cur = cur.filter((c) => c !== l.char);
          else cur.push(l.char);
          const next = cur.length ? cur : null;
          let patch = { targetLetters: next };
          // αν το τρέχον γράμμα δεν είναι πια στο σετ, διάλεξε το πρώτο επιλεγμένο
          if (next && !next.includes(store.get('currentChar'))) patch.currentChar = next[0];
          store.update(patch);
          rebuild();
        },
      }, [l.char]));
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function open() { rebuild(); panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); }
  function close() { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); }

  rebuild();
  return { panel, open, close };
}
