// Παλέτα ΣΥΝΟΙΔΑ — ΜΟΝΟ αυτά τα χρώματα (για χρήση σε canvas/JS).
// Σε CSS ορίζονται ξανά ως custom properties (css/tokens.css).
export const PALETTE = {
  green: '#8DC63F',
  red: '#ED1C24',
  blue: '#00AEEF',
  orange: '#F7941D',
  grey: '#58595B',
  bg: '#F7F6F8',
  paper: '#FFFFFF',
  bgAlt: '#F5F5F5',
};

// Σειρά χρωμάτων για τους αριθμούς έναρξης των strokes (κυκλικά).
export const STROKE_COLORS = [
  PALETTE.blue, PALETTE.orange, PALETTE.green, PALETTE.red,
];

// Απαλό tint ενός brand χρώματος (rgba) — μόνο 5–15% για backgrounds/accents.
export function tint(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
