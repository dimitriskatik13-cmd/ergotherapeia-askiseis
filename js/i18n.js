// Greek normalization helpers. Strips accents/diacritics and standardizes final sigma.

export function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove combining marks (Greek accents)
    .replace(/ς/g, "σ");   // final sigma → sigma
}

export function tokens(str) {
  const norm = normalize(str);
  return norm.split(/[^\p{L}\p{N}]+/u).filter(t => t && t.length > 1);
}

export function formatAgeRange(min, max) {
  if (min === max) return `${min} ετών`;
  return `${min}-${max} ετών`;
}

export function levelLabel(n) {
  return `Επίπεδο ${n}`;
}
