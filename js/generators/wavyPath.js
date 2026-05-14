// wavyPath — κυματιστές καμπύλες για ομαλή κίνηση και ρευστότητα.

import { el, svgRoot, a4ViewBox, palette, strokeDash, rand } from "./_lib.js";

export const id = "wavyPath";
export const label = "Κυματιστή γραμμή";
export const description = "Καμπύλες ημιτονοειδείς γραμμές για ρευστή κίνηση χεριού.";

export const defaultParams = {
  cycles: 3, amplitude: 16, lineCount: 2,
  strokeStyle: "dashed", startArrow: true, orientation: "horizontal",
  amplitudeJitter: 0.1,
};

export const levelPresets = {
  1: { cycles: 2, amplitude: 26, lineCount: 1, strokeStyle: "long-dash", amplitudeJitter: 0 },
  2: { cycles: 3, amplitude: 18, lineCount: 2, strokeStyle: "dashed",    amplitudeJitter: 0.1 },
  3: { cycles: 4, amplitude: 14, lineCount: 2, strokeStyle: "dashed",    amplitudeJitter: 0.2 },
  4: { cycles: 6, amplitude: 10, lineCount: 3, strokeStyle: "dotted",    amplitudeJitter: 0.3 },
  5: { cycles: 8, amplitude: 7,  lineCount: 4, strokeStyle: "dotted",    amplitudeJitter: 0.45 },
};

function buildPath(rng, p, w, h) {
  const horizontal = p.orientation !== "vertical";
  const margin = 10;
  const usable = horizontal ? w - margin * 2 : h - margin * 2;
  const samples = Math.max(40, p.cycles * 16);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const along = margin + t * usable;
    const phase = t * p.cycles * Math.PI * 2;
    const ampJit = 1 + (rng() - 0.5) * 2 * p.amplitudeJitter;
    const offset = Math.sin(phase) * (p.amplitude / 2) * ampJit;
    const center = (horizontal ? h : w) / 2;
    pts.push(horizontal ? [along, center + offset] : [center + offset, along]);
  }
  return pts;
}

function smoothPath(points) {
  // Catmull-Rom-ish smoothing via quadratic curves
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);
  const dash = strokeDash(p.strokeStyle);
  const lineSpacing = Math.min(34, (h - 40) / Math.max(p.lineCount, 1));
  const startY = (h - lineSpacing * (p.lineCount - 1)) / 2;

  for (let i = 0; i < p.lineCount; i++) {
    const yOffset = startY + i * lineSpacing - h / 2;
    const pts = buildPath(rng, p, w, h).map(([x, y]) => [x, y + yOffset]);
    const d = smoothPath(pts);

    if (p.startArrow) {
      const [sx, sy] = pts[0];
      svg.appendChild(el("circle", { cx: sx - 4, cy: sy, r: 2.2, fill: palette.green }));
    }
    svg.appendChild(el("path", {
      d, fill: "none", stroke: palette.gray,
      "stroke-width": 0.9, "stroke-linecap": "round", "stroke-linejoin": "round",
      "stroke-dasharray": dash,
    }));
    const last = pts[pts.length - 1];
    svg.appendChild(el("circle", { cx: last[0] + 3, cy: last[1], r: 3, fill: "none", stroke: palette.red, "stroke-width": 0.8 }));
    svg.appendChild(el("circle", { cx: last[0] + 3, cy: last[1], r: 1.2, fill: palette.red }));
  }
  return svg;
}

export const thumbnail = render;
