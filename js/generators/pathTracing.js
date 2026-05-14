// pathTracing — διπλές παράλληλες γραμμές (διάδρομος) για ελεγχόμενη ιχνηλάτηση.
// Το παιδί τραβάει ανάμεσα στα δύο όρια.

import { el, svgRoot, a4ViewBox, palette, rand } from "./_lib.js";

export const id = "pathTracing";
export const label = "Διάδρομος ιχνηλάτησης";
export const description = "Διπλές παράλληλες γραμμές. Το παιδί κινείται ανάμεσα στα όρια.";

export const defaultParams = {
  pathType: "straight", // "straight" | "curve" | "loop"
  corridorWidth: 14,
  segments: 6,
  showStartEnd: true,
};

export const levelPresets = {
  1: { pathType: "straight", corridorWidth: 22, segments: 1 },
  2: { pathType: "straight", corridorWidth: 16, segments: 4 },
  3: { pathType: "curve",    corridorWidth: 14, segments: 6 },
  4: { pathType: "curve",    corridorWidth: 9,  segments: 8 },
  5: { pathType: "loop",     corridorWidth: 7,  segments: 10 },
};

function centerPath(p, rng, w, h) {
  const margin = 14;
  const pts = [];
  const n = Math.max(p.segments, 1);
  if (p.pathType === "straight") {
    for (let i = 0; i <= n; i++) {
      pts.push([margin + ((w - margin * 2) * i) / n, h / 2]);
    }
  } else if (p.pathType === "curve") {
    for (let i = 0; i <= n * 8; i++) {
      const t = i / (n * 8);
      const x = margin + (w - margin * 2) * t;
      const y = h / 2 + Math.sin(t * n * Math.PI) * (h / 4) * (0.6 + rng() * 0.2);
      pts.push([x, y]);
    }
  } else {
    // loop — spirals & switchbacks (a winding path)
    let x = margin, y = h / 2;
    pts.push([x, y]);
    let dir = 1;
    const stepX = (w - margin * 2) / (n * 2);
    const yAmp = h / 3.5;
    for (let i = 0; i < n; i++) {
      x += stepX;
      y = h / 2 - dir * yAmp;
      for (let k = 1; k <= 6; k++) pts.push([x - stepX + (stepX * k) / 6, h / 2 - dir * yAmp * Math.sin((k / 6) * Math.PI)]);
      x += stepX;
      dir *= -1;
    }
    pts.push([w - margin, h / 2]);
  }
  return pts;
}

function offsetPath(pts, dist) {
  // Simple normal-offset (good enough for visual purposes; not exact)
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0], dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    out.push([pts[i][0] + nx * dist, pts[i][1] + ny * dist]);
  }
  return out;
}

const toPath = (pts) => pts.map((p, i) => (i === 0 ? "M " : "L ") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const center = centerPath(p, rng, w, h);
  const top = offsetPath(center, -p.corridorWidth / 2);
  const bot = offsetPath(center, p.corridorWidth / 2);

  // Filled corridor (very light) for visual aid
  const fillD = toPath(top) + " " + toPath([...bot].reverse()).replace("M ", "L ") + " Z";
  svg.appendChild(el("path", { d: fillD, fill: palette.guide, opacity: 0.25 }));

  // Two boundary lines
  for (const line of [top, bot]) {
    svg.appendChild(el("path", {
      d: toPath(line), fill: "none", stroke: palette.gray,
      "stroke-width": 0.7, "stroke-linecap": "round", "stroke-linejoin": "round",
    }));
  }

  if (p.showStartEnd) {
    const [sx, sy] = center[0];
    const [ex, ey] = center[center.length - 1];
    svg.appendChild(el("circle", { cx: sx, cy: sy, r: 3, fill: palette.green }));
    svg.appendChild(el("text", { x: sx, y: sy + 1.4, "text-anchor": "middle", "font-size": 3.2, fill: "#fff", "font-weight": 700 })).textContent = "★";
    svg.appendChild(el("circle", { cx: ex, cy: ey, r: 3, fill: "none", stroke: palette.red, "stroke-width": 0.8 }));
    svg.appendChild(el("circle", { cx: ex, cy: ey, r: 1.2, fill: palette.red }));
  }
  return svg;
}

export const thumbnail = render;
