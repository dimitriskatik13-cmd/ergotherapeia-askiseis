// mirrorDrawing — αριστερά σχήμα/μοτίβο, δεξιά κενός χώρος με κάθετο άξονα συμμετρίας.
// Το παιδί σχεδιάζει την κατοπτρική εκδοχή.

import { el, svgRoot, a4ViewBox, palette, rand, randInt } from "./_lib.js";

export const id = "mirrorDrawing";
export const label = "Σχέδιο σε καθρέφτη";
export const description = "Σχήμα στη μία πλευρά. Το παιδί φτιάχνει την κατοπτρική εκδοχή απέναντι από τον άξονα.";

export const defaultParams = {
  axis: "vertical", // "vertical" | "horizontal"
  complexity: 2,    // 1..4
  showGuides: true,
  pointCount: 6,
};

export const levelPresets = {
  1: { complexity: 1, pointCount: 4, showGuides: true },
  2: { complexity: 2, pointCount: 6, showGuides: true },
  3: { complexity: 2, pointCount: 8, showGuides: true },
  4: { complexity: 3, pointCount: 10, showGuides: false },
  5: { complexity: 4, pointCount: 14, showGuides: false },
};

function generateMotif(rng, complexity, pointCount, originX, originY, areaW, areaH) {
  // Random polyline inside the source area
  const pts = [];
  for (let i = 0; i < pointCount; i++) {
    const x = originX + 6 + rng() * (areaW - 12);
    const y = originY + 6 + rng() * (areaH - 12);
    pts.push([x, y]);
  }
  // For higher complexity, add small loops/branches
  return pts;
}

function pathFrom(pts) {
  return pts.map((p, i) => (i === 0 ? "M " : "L ") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation);

  const padding = 8;
  const axisVertical = p.axis === "vertical";

  if (axisVertical) {
    const areaW = (w - padding * 2) / 2 - 4;
    const areaH = h - padding * 2;
    const leftX = padding;
    const rightX = w / 2 + 4;

    // Axis line (dashed)
    svg.appendChild(el("line", {
      x1: w / 2, y1: padding, x2: w / 2, y2: h - padding,
      stroke: palette.blue, "stroke-width": 0.6, "stroke-dasharray": "1 1.5",
    }));

    if (p.showGuides) {
      // Faint dot grid on both sides for support
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          const dx = (areaW / 6) * (c + 0.5);
          const dy = (areaH / 8) * (r + 0.5);
          svg.appendChild(el("circle", { cx: leftX + dx, cy: padding + dy, r: 0.3, fill: palette.line }));
          svg.appendChild(el("circle", { cx: rightX + dx, cy: padding + dy, r: 0.3, fill: palette.line }));
        }
      }
    }

    // Source motif on the left
    const pts = generateMotif(rng, p.complexity, p.pointCount, leftX, padding, areaW, areaH);
    svg.appendChild(el("path", {
      d: pathFrom(pts), fill: "none", stroke: palette.gray,
      "stroke-width": 0.9, "stroke-linecap": "round", "stroke-linejoin": "round",
    }));
    pts.forEach(([x, y]) => svg.appendChild(el("circle", { cx: x, cy: y, r: 0.9, fill: palette.gray })));

    // Right side stays empty (the child draws)
  } else {
    // Horizontal axis
    const areaH = (h - padding * 2) / 2 - 4;
    const areaW = w - padding * 2;
    const topY = padding;
    const botY = h / 2 + 4;

    svg.appendChild(el("line", {
      x1: padding, y1: h / 2, x2: w - padding, y2: h / 2,
      stroke: palette.blue, "stroke-width": 0.6, "stroke-dasharray": "1 1.5",
    }));

    const pts = generateMotif(rng, p.complexity, p.pointCount, padding, topY, areaW, areaH);
    svg.appendChild(el("path", {
      d: pathFrom(pts), fill: "none", stroke: palette.gray,
      "stroke-width": 0.9, "stroke-linecap": "round", "stroke-linejoin": "round",
    }));
    pts.forEach(([x, y]) => svg.appendChild(el("circle", { cx: x, cy: y, r: 0.9, fill: palette.gray })));
  }

  return svg;
}

export const thumbnail = render;
