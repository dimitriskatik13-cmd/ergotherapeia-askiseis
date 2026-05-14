// patternCopy — πρότυπο grid αριστερά, κενό grid δεξιά. Το παιδί αντιγράφει το πρότυπο.

import { el, svgRoot, a4ViewBox, palette, randInt, pick } from "./_lib.js";

export const id = "patternCopy";
export const label = "Αντιγραφή μοτίβου";
export const description = "Πρότυπο σε πλέγμα αριστερά. Το παιδί αντιγράφει στο κενό πλέγμα δεξιά.";

export const defaultParams = {
  gridSize: 3, filledRatio: 0.4, motif: "dot", showLines: true,
};

export const levelPresets = {
  1: { gridSize: 2, filledRatio: 0.5,  motif: "dot",      showLines: true },
  2: { gridSize: 3, filledRatio: 0.45, motif: "dot",      showLines: true },
  3: { gridSize: 3, filledRatio: 0.5,  motif: "shape",    showLines: true },
  4: { gridSize: 4, filledRatio: 0.4,  motif: "shape",    showLines: true },
  5: { gridSize: 5, filledRatio: 0.35, motif: "shape",    showLines: true },
};

const motifShapes = ["●", "▲", "■", "◆", "+"];

function drawGrid(svg, ox, oy, cellSize, p, pattern) {
  // Grid lines
  if (p.showLines) {
    for (let i = 0; i <= p.gridSize; i++) {
      svg.appendChild(el("line", { x1: ox, y1: oy + i * cellSize, x2: ox + p.gridSize * cellSize, y2: oy + i * cellSize, stroke: palette.line, "stroke-width": 0.5 }));
      svg.appendChild(el("line", { x1: ox + i * cellSize, y1: oy, x2: ox + i * cellSize, y2: oy + p.gridSize * cellSize, stroke: palette.line, "stroke-width": 0.5 }));
    }
  }
  if (!pattern) return;
  for (let r = 0; r < p.gridSize; r++) {
    for (let c = 0; c < p.gridSize; c++) {
      const cell = pattern[r * p.gridSize + c];
      if (!cell) continue;
      const cx = ox + c * cellSize + cellSize / 2;
      const cy = oy + r * cellSize + cellSize / 2;
      if (p.motif === "dot") {
        svg.appendChild(el("circle", { cx, cy, r: cellSize * 0.18, fill: palette.gray }));
      } else {
        const t = el("text", { x: cx, y: cy + cellSize * 0.18, "text-anchor": "middle", "font-size": cellSize * 0.55, fill: palette.gray });
        t.textContent = cell;
        svg.appendChild(t);
      }
    }
  }
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  // Make a pattern array
  const total = p.gridSize * p.gridSize;
  const pattern = Array(total).fill(null);
  const fillCount = Math.max(1, Math.round(total * p.filledRatio));
  const indices = [...Array(total).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < fillCount; i++) {
    pattern[indices[i]] = p.motif === "shape" ? pick(rng, motifShapes) : "•";
  }

  // Two grids side by side
  const padding = 14;
  const gap = 10;
  const usableW = w - padding * 2 - gap;
  const cellSize = Math.min((usableW / 2) / p.gridSize, (h - padding * 2 - 12) / p.gridSize);
  const gridW = cellSize * p.gridSize;
  const oy = (h - gridW) / 2 + 6;

  const oxLeft = padding;
  const oxRight = padding + gridW + gap + (usableW - 2 * gridW - gap);

  // Headers
  const labelL = el("text", { x: oxLeft + gridW / 2, y: oy - 4, "text-anchor": "middle", "font-size": 4, fill: palette.ink, "font-weight": 700 });
  labelL.textContent = "Πρότυπο";
  svg.appendChild(labelL);
  const labelR = el("text", { x: oxRight + gridW / 2, y: oy - 4, "text-anchor": "middle", "font-size": 4, fill: palette.ink, "font-weight": 700 });
  labelR.textContent = "Αντίγραψε εδώ";
  svg.appendChild(labelR);

  drawGrid(svg, oxLeft, oy, cellSize, p, pattern);
  drawGrid(svg, oxRight, oy, cellSize, p, null);
  return svg;
}

export const thumbnail = render;
