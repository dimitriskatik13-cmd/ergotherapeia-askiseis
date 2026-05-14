// colouring — απλά γεωμετρικά σχήματα για χρωματισμό μέσα στα όρια.
// Δικά μας στοιχειώδη σχήματα — όχι αναπαραγωγή illustrations.

import { el, svgRoot, a4ViewBox, palette, randInt, pick } from "./_lib.js";

export const id = "colouring";
export const label = "Χρωματισμός σχημάτων";
export const description = "Κλειστά γεωμετρικά σχήματα για χρωματισμό. Έλεγχος ορίων.";

export const defaultParams = {
  shapeCount: 5, complexity: 1, sizeRange: [22, 36], showLabels: false,
};

export const levelPresets = {
  1: { shapeCount: 3, complexity: 1, sizeRange: [36, 48] },
  2: { shapeCount: 5, complexity: 1, sizeRange: [26, 38] },
  3: { shapeCount: 7, complexity: 2, sizeRange: [22, 32] },
  4: { shapeCount: 10, complexity: 2, sizeRange: [16, 26] },
  5: { shapeCount: 14, complexity: 3, sizeRange: [12, 22] },
};

const shapeKinds = ["circle", "square", "triangle", "diamond", "pentagon", "star"];

function polygonPoints(cx, cy, r, sides, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(" ");
}

function starPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(" ");
}

function makeShape(kind, cx, cy, r) {
  switch (kind) {
    case "circle":   return el("circle",  { cx, cy, r, fill: "none", stroke: palette.gray, "stroke-width": 1 });
    case "square":   return el("rect",    { x: cx - r, y: cy - r, width: r * 2, height: r * 2, rx: r * 0.08, fill: "none", stroke: palette.gray, "stroke-width": 1 });
    case "triangle": return el("polygon", { points: polygonPoints(cx, cy, r, 3), fill: "none", stroke: palette.gray, "stroke-width": 1 });
    case "diamond":  return el("polygon", { points: polygonPoints(cx, cy, r, 4, 0), fill: "none", stroke: palette.gray, "stroke-width": 1 });
    case "pentagon": return el("polygon", { points: polygonPoints(cx, cy, r, 5), fill: "none", stroke: palette.gray, "stroke-width": 1 });
    case "star":     return el("polygon", { points: starPoints(cx, cy, r), fill: "none", stroke: palette.gray, "stroke-width": 1 });
  }
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const placed = [];
  let attempts = 0;
  while (placed.length < p.shapeCount && attempts < p.shapeCount * 50) {
    attempts++;
    const r = p.sizeRange[0] + rng() * (p.sizeRange[1] - p.sizeRange[0]);
    const x = r + 4 + rng() * (w - 2 * (r + 4));
    const y = r + 4 + rng() * (h - 2 * (r + 4));
    const overlaps = placed.some(s => Math.hypot(s.x - x, s.y - y) < (s.r + r) * 1.05);
    if (overlaps) continue;
    const kind = pick(rng, p.complexity >= 3 ? shapeKinds : shapeKinds.slice(0, 3 + p.complexity));
    placed.push({ x, y, r, kind });
    svg.appendChild(makeShape(kind, x, y, r));
  }
  return svg;
}

export const thumbnail = render;
