// dotting — πλέγμα κενών κύκλων που το παιδί συμπληρώνει με τελείες.
// Στόχος: στόχευση, έλεγχος πίεσης.

import { el, svgRoot, a4ViewBox, palette, randInt } from "./_lib.js";

export const id = "dotting";
export const label = "Σημειοποίηση";
export const description = "Πλέγμα κενών κύκλων. Το παιδί τοποθετεί μια τελεία μέσα σε κάθε κύκλο.";

export const defaultParams = {
  rows: 6, cols: 7, dotRadius: 4, pattern: "uniform",
  jitter: 0,
};

export const levelPresets = {
  1: { rows: 4, cols: 4, dotRadius: 7, pattern: "uniform", jitter: 0 },
  2: { rows: 5, cols: 6, dotRadius: 5, pattern: "uniform", jitter: 0 },
  3: { rows: 7, cols: 8, dotRadius: 4, pattern: "uniform", jitter: 0.1 },
  4: { rows: 8, cols: 10, dotRadius: 3, pattern: "scatter", jitter: 0.3 },
  5: { rows: 10, cols: 12, dotRadius: 2.5, pattern: "scatter", jitter: 0.5 },
};

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const marginX = 10, marginY = 12;
  const stepX = (w - marginX * 2) / Math.max(p.cols - 1, 1);
  const stepY = (h - marginY * 2) / Math.max(p.rows - 1, 1);

  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      let x = marginX + c * stepX;
      let y = marginY + r * stepY;
      if (p.pattern === "scatter") {
        x += (rng() - 0.5) * stepX * p.jitter * 2;
        y += (rng() - 0.5) * stepY * p.jitter * 2;
      } else if (p.jitter > 0) {
        x += (rng() - 0.5) * 2 * p.jitter * stepX * 0.3;
        y += (rng() - 0.5) * 2 * p.jitter * stepY * 0.3;
      }
      svg.appendChild(el("circle", {
        cx: x, cy: y, r: p.dotRadius,
        fill: "none", stroke: palette.gray, "stroke-width": 0.6,
      }));
    }
  }
  return svg;
}

export const thumbnail = render;
