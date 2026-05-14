// circleFill — συγκεντρικοί κύκλοι ή σπείρες προς συμπλήρωση (γέμισμα από κέντρο/περιφέρεια).

import { el, svgRoot, a4ViewBox, palette, strokeDash } from "./_lib.js";

export const id = "circleFill";
export const label = "Κύκλοι προς συμπλήρωση";
export const description = "Πλέγμα ή συγκεντρικοί κύκλοι για χρωματισμό σπιράλ από κέντρο προς έξω.";

export const defaultParams = {
  mode: "concentric", // "concentric" | "grid"
  count: 6, spacing: 7, startFromCenter: true,
  strokeStyle: "solid", gridCols: 5, gridRows: 5,
};

export const levelPresets = {
  1: { mode: "grid", gridCols: 4, gridRows: 4, count: 16, strokeStyle: "solid" },
  2: { mode: "concentric", count: 4, spacing: 12, strokeStyle: "solid" },
  3: { mode: "concentric", count: 7, spacing: 8, strokeStyle: "solid" },
  4: { mode: "concentric", count: 10, spacing: 6, strokeStyle: "dashed" },
  5: { mode: "concentric", count: 14, spacing: 5, strokeStyle: "dashed" },
};

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);
  const dash = strokeDash(p.strokeStyle);

  if (p.mode === "grid") {
    const r = Math.min((w - 20) / p.gridCols, (h - 20) / p.gridRows) / 2.4;
    const stepX = (w - 20) / Math.max(p.gridCols - 1, 1);
    const stepY = (h - 20) / Math.max(p.gridRows - 1, 1);
    for (let row = 0; row < p.gridRows; row++) {
      for (let col = 0; col < p.gridCols; col++) {
        svg.appendChild(el("circle", {
          cx: 10 + col * stepX, cy: 10 + row * stepY, r,
          fill: "none", stroke: palette.gray, "stroke-width": 0.7, "stroke-dasharray": dash,
        }));
      }
    }
  } else {
    const cx = w / 2, cy = h / 2;
    for (let i = 1; i <= p.count; i++) {
      svg.appendChild(el("circle", {
        cx, cy, r: i * p.spacing,
        fill: "none", stroke: palette.gray, "stroke-width": 0.7, "stroke-dasharray": dash,
      }));
    }
    if (p.startFromCenter) {
      svg.appendChild(el("circle", { cx, cy, r: 1.6, fill: palette.green }));
    }
  }
  return svg;
}

export const thumbnail = render;
