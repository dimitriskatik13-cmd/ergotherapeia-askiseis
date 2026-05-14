// nestedShapes — γεωμετρικά σχήματα εμφωλευμένα μέσα σε άλλα.
// Στόχος: αναγνώριση φόρμας, διάκριση φιγούρας-φόντου, προσανατολισμός.

import { el, svgRoot, a4ViewBox, palette, randInt, pick } from "./_lib.js";

export const id = "nestedShapes";
export const label = "Εμφωλευμένα σχήματα";
export const description = "Σχήματα μέσα σε σχήματα. Το παιδί διακρίνει και χρωματίζει επίπεδα.";

export const defaultParams = {
  groupCount: 3, levels: 3, rotateOdd: true,
};

export const levelPresets = {
  1: { groupCount: 1, levels: 2, rotateOdd: false },
  2: { groupCount: 2, levels: 3, rotateOdd: false },
  3: { groupCount: 3, levels: 3, rotateOdd: true },
  4: { groupCount: 4, levels: 4, rotateOdd: true },
  5: { groupCount: 6, levels: 4, rotateOdd: true },
};

const shapes = ["circle", "square", "triangle", "diamond"];

function drawShape(kind, cx, cy, r, rot = 0) {
  const a = (i, n) => -Math.PI / 2 + rot + (i / n) * Math.PI * 2;
  if (kind === "circle") return el("circle", { cx, cy, r, fill: "none", stroke: palette.gray, "stroke-width": 0.8 });
  if (kind === "square") return el("rect", { x: cx - r, y: cy - r, width: r * 2, height: r * 2, transform: `rotate(${(rot * 180/Math.PI).toFixed(1)} ${cx} ${cy})`, fill: "none", stroke: palette.gray, "stroke-width": 0.8 });
  const n = kind === "triangle" ? 3 : 4;
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push(`${(cx + Math.cos(a(i, n)) * r).toFixed(2)},${(cy + Math.sin(a(i, n)) * r).toFixed(2)}`);
  }
  return el("polygon", { points: pts.join(" "), fill: "none", stroke: palette.gray, "stroke-width": 0.8 });
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  // Tile the canvas in a grid of groupCount cells
  const cols = Math.ceil(Math.sqrt(p.groupCount));
  const rows = Math.ceil(p.groupCount / cols);
  const cellW = w / cols, cellH = h / rows;
  const baseR = Math.min(cellW, cellH) / 2 - 6;

  for (let g = 0; g < p.groupCount; g++) {
    const col = g % cols, row = Math.floor(g / cols);
    const cx = cellW * col + cellW / 2;
    const cy = cellH * row + cellH / 2;
    const kindOuter = pick(rng, shapes);
    for (let i = 0; i < p.levels; i++) {
      const r = baseR * (1 - i / p.levels);
      const kind = (i % 2 === 0) ? kindOuter : pick(rng, shapes.filter(s => s !== kindOuter));
      const rot = p.rotateOdd && i % 2 === 1 ? Math.PI / 4 : 0;
      svg.appendChild(drawShape(kind, cx, cy, r, rot));
    }
  }
  return svg;
}

export const thumbnail = render;
