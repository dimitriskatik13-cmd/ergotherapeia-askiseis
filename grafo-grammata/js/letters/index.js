// ─────────────────────────────────────────────────────────────────────────────
// Μητρώο γραμμάτων: τυλίγει LOWER/UPPER στο πλήρες schema του spec και προσφέρει
// βοηθητικές συναρτήσεις (αναζήτηση, φωνήματα, σειρά).
// ─────────────────────────────────────────────────────────────────────────────
import { LOWER, ZONES } from './lower.js';
import { UPPER } from './upper.js';

function build(def, letterCase) {
  return {
    char: def.char,
    case: letterCase,
    phonemeAudio: `${def.ph}.mp3`,   // αποσυνδεδεμένος ήχος, σταθερό όνομα ανά ΦΩΝΗΜΑ
    phonemeKey: def.ph,
    keyword: def.keyword || null,
    zones: { ...ZONES },
    strokes: def.strokes
      .slice()
      .sort((a, b) => a.order - b.order),
  };
}

export const LETTERS_LOWER = LOWER.map((d) => build(d, 'lower'));
export const LETTERS_UPPER = UPPER.map((d) => build(d, 'upper'));
export const ALL_LETTERS = [...LETTERS_LOWER, ...LETTERS_UPPER];

// Κανονική σειρά ελληνικού αλφαβήτου (για ταξινόμηση πάνελ θεραπευτή).
export const GREEK_ORDER = 'αβγδεζηθικλμνξοπρστυφχψω';

export function lettersByCase(letterCase) {
  return letterCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER;
}

export function findLetter(char, letterCase) {
  return lettersByCase(letterCase).find((l) => l.char === char) || null;
}

// Μοναδικά φωνήματα που χρειάζονται προφόρτωση (για service worker / audio cache).
export function uniquePhonemeFiles() {
  const set = new Set();
  ALL_LETTERS.forEach((l) => set.add(l.phonemeAudio));
  return [...set];
}

export { ZONES };
