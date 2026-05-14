// maze — απλός orthogonal λαβύρινθος με μία είσοδο και μία έξοδο.

import { el, svgRoot, a4ViewBox, palette, randInt } from "./_lib.js";

export const id = "maze";
export const label = "Λαβύρινθος";
export const description = "Λαβύρινθος με σταθερή είσοδο/έξοδο. Το παιδί τραβάει τη διαδρομή.";

export const defaultParams = {
  rows: 7, cols: 9, wallWidth: 0.6, corridorMark: true,
};

export const levelPresets = {
  1: { rows: 4, cols: 5,  wallWidth: 0.7 },
  2: { rows: 6, cols: 7,  wallWidth: 0.6 },
  3: { rows: 8, cols: 10, wallWidth: 0.6 },
  4: { rows: 10, cols: 13, wallWidth: 0.5 },
  5: { rows: 13, cols: 17, wallWidth: 0.45 },
};

function carveMaze(rows, cols, rng) {
  // Recursive backtracking
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({
    n: true, e: true, s: true, w: true, visited: false,
  })));
  function carve(r, c) {
    cells[r][c].visited = true;
    const dirs = [
      { d: "n", dr: -1, dc: 0, opp: "s" },
      { d: "e", dr: 0,  dc: 1, opp: "w" },
      { d: "s", dr: 1,  dc: 0, opp: "n" },
      { d: "w", dr: 0,  dc: -1, opp: "e" },
    ];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const { d, dr, dc, opp } of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (cells[nr][nc].visited) continue;
      cells[r][c][d] = false;
      cells[nr][nc][opp] = false;
      carve(nr, nc);
    }
  }
  carve(0, 0);
  return cells;
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const margin = 8;
  const cellW = (w - margin * 2) / p.cols;
  const cellH = (h - margin * 2) / p.rows;

  const cells = carveMaze(p.rows, p.cols, rng);

  // Open entrance (top-left, north wall of [0,0]) and exit (bottom-right, south wall of [rows-1, cols-1])
  cells[0][0].w = false;
  cells[p.rows - 1][p.cols - 1].e = false;

  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      const x = margin + c * cellW;
      const y = margin + r * cellH;
      const cell = cells[r][c];
      const stroke = { stroke: palette.gray, "stroke-width": p.wallWidth, "stroke-linecap": "square" };
      if (cell.n) svg.appendChild(el("line", { x1: x,         y1: y,         x2: x + cellW, y2: y,         ...stroke }));
      if (cell.s) svg.appendChild(el("line", { x1: x,         y1: y + cellH, x2: x + cellW, y2: y + cellH, ...stroke }));
      if (cell.w) svg.appendChild(el("line", { x1: x,         y1: y,         x2: x,         y2: y + cellH, ...stroke }));
      if (cell.e) svg.appendChild(el("line", { x1: x + cellW, y1: y,         x2: x + cellW, y2: y + cellH, ...stroke }));
    }
  }

  if (p.corridorMark) {
    // Start (green) outside entrance
    svg.appendChild(el("circle", { cx: margin - cellW * 0.3, cy: margin + cellH / 2, r: 2.2, fill: palette.green }));
    // End (red) outside exit
    svg.appendChild(el("circle", { cx: margin + p.cols * cellW + cellW * 0.3, cy: margin + p.rows * cellH - cellH / 2, r: 2.2, fill: palette.red }));
  }
  return svg;
}

export const thumbnail = render;
