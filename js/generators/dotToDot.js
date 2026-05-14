// dotToDot — αριθμημένες τελείες που το παιδί ενώνει με τη σειρά για να αποκαλύψει σχήμα.

import { el, svgRoot, a4ViewBox, palette, rand } from "./_lib.js";

export const id = "dotToDot";
export const label = "Ένωσε τις τελείες";
export const description = "Αριθμημένες τελείες σε σειρά που αποκαλύπτουν ένα σχήμα.";

export const defaultParams = {
  pointCount: 10, shapeHint: "polygon", showNumbers: true, closeShape: true,
};

export const levelPresets = {
  1: { pointCount: 4,  shapeHint: "polygon", closeShape: true },
  2: { pointCount: 7,  shapeHint: "polygon", closeShape: true },
  3: { pointCount: 12, shapeHint: "polygon", closeShape: true },
  4: { pointCount: 18, shapeHint: "freeform", closeShape: false },
  5: { pointCount: 28, shapeHint: "freeform", closeShape: false },
};

function polygonShape(n, cx, cy, r, rng) {
  const pts = [];
  const radiusJitter = 0.18;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = r * (1 - radiusJitter + rng() * radiusJitter * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

function freeform(n, cx, cy, r, rng) {
  // Pseudo-random walk constrained inside circle of radius r
  const pts = [];
  let a = rng() * Math.PI * 2;
  let rr = r * 0.5;
  for (let i = 0; i < n; i++) {
    a += (rng() - 0.5) * 1.3;
    rr = Math.min(r, Math.max(r * 0.2, rr + (rng() - 0.5) * r * 0.25));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) / 2 - 10;
  const pts = p.shapeHint === "freeform" ? freeform(p.pointCount, cx, cy, r, rng) : polygonShape(p.pointCount, cx, cy, r, rng);

  // No connecting lines visible — αυτές τις σχεδιάζει το παιδί
  pts.forEach(([x, y], i) => {
    svg.appendChild(el("circle", { cx: x, cy: y, r: 1.4, fill: palette.gray }));
    if (p.showNumbers) {
      const dx = (x - cx) / (Math.hypot(x - cx, y - cy) || 1);
      const dy = (y - cy) / (Math.hypot(x - cx, y - cy) || 1);
      const tx = x + dx * 4, ty = y + dy * 4 + 1.2;
      const t = el("text", { x: tx, y: ty, "text-anchor": "middle", "font-size": 3.5, fill: palette.gray, "font-weight": 600 });
      t.textContent = String(i + 1);
      svg.appendChild(t);
    }
  });

  // Highlight first point
  const [fx, fy] = pts[0];
  svg.appendChild(el("circle", { cx: fx, cy: fy, r: 2.4, fill: palette.green }));
  return svg;
}

export const thumbnail = render;
