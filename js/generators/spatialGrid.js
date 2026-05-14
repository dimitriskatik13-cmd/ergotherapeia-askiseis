// spatialGrid — πλέγμα με αντικείμενα σε συγκεκριμένες θέσεις. Στόχος: προσανατολισμός & χωρική γλώσσα.

import { el, svgRoot, a4ViewBox, palette, randInt, pick } from "./_lib.js";

export const id = "spatialGrid";
export const label = "Χωρικό πλέγμα";
export const description = "Πλέγμα με αντικείμενα. Το παιδί κυκλώνει αντικείμενα βάσει οδηγίας θέσης.";

export const defaultParams = {
  rows: 4, cols: 5, objectDensity: 0.55, symbolSet: "simple", showLabels: true,
};

export const levelPresets = {
  1: { rows: 3, cols: 4, objectDensity: 0.6,  symbolSet: "simple" },
  2: { rows: 4, cols: 5, objectDensity: 0.55, symbolSet: "simple" },
  3: { rows: 5, cols: 6, objectDensity: 0.5,  symbolSet: "varied" },
  4: { rows: 6, cols: 8, objectDensity: 0.45, symbolSet: "varied" },
  5: { rows: 7, cols: 10, objectDensity: 0.4, symbolSet: "varied" },
};

const symbols = {
  simple: ["●", "■", "▲"],
  varied: ["●", "■", "▲", "◆", "★", "✦", "♣"],
};

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const margin = 10;
  const cellW = (w - margin * 2) / p.cols;
  const cellH = (h - margin * 2 - 14) / p.rows;
  const palette3 = [palette.green, palette.red, palette.blue, palette.orange, palette.gray];
  const symList = symbols[p.symbolSet] || symbols.simple;

  // Grid lines (very light)
  for (let i = 0; i <= p.rows; i++) {
    svg.appendChild(el("line", { x1: margin, y1: margin + i * cellH, x2: margin + p.cols * cellW, y2: margin + i * cellH, stroke: palette.line, "stroke-width": 0.4 }));
  }
  for (let j = 0; j <= p.cols; j++) {
    svg.appendChild(el("line", { x1: margin + j * cellW, y1: margin, x2: margin + j * cellW, y2: margin + p.rows * cellH, stroke: palette.line, "stroke-width": 0.4 }));
  }

  // Place objects randomly
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      if (rng() > p.objectDensity) continue;
      const cx = margin + c * cellW + cellW / 2;
      const cy = margin + r * cellH + cellH / 2 + cellH * 0.18;
      const sym = pick(rng, symList);
      const color = pick(rng, palette3);
      const t = el("text", {
        x: cx, y: cy,
        "text-anchor": "middle",
        "font-size": Math.min(cellW, cellH) * 0.55,
        fill: color,
        "font-weight": 600,
      });
      t.textContent = sym;
      svg.appendChild(t);
    }
  }

  if (p.showLabels) {
    // Bottom hint area for the therapist to write the instruction
    const lbl = el("text", {
      x: margin, y: h - 4,
      "font-size": 3.5, fill: palette.gray, "font-style": "italic",
    });
    lbl.textContent = "Οδηγία: «Κύκλωσε όλα τα …» (συμπληρώνεται από τον θεραπευτή)";
    svg.appendChild(lbl);
  }
  return svg;
}

export const thumbnail = render;
