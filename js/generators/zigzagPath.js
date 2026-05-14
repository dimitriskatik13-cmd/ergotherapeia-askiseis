// zigzagPath — ζιγκ-ζαγκ διαδρομές για γραφοκινητική ιχνηλάτηση.
// Παράγει μία ή περισσότερες παράλληλες ζιγκ-ζαγκ γραμμές με μεταβλητή γωνία/amplitude/μήκος.

import { el, svgRoot, a4ViewBox, palette, strokeDash, rand, randInt } from "./_lib.js";

export const id = "zigzagPath";
export const label = "Ζιγκ-ζαγκ μονοπάτι";
export const description = "Παράλληλες ζιγκ-ζαγκ γραμμές. Το παιδί ακολουθεί τη γραμμή χωρίς να ξεφεύγει.";

export const defaultParams = {
  segments: 6,
  amplitude: 14,
  lineCount: 2,
  strokeStyle: "dashed",     // "solid" | "dashed" | "dotted"
  startArrow: true,
  angleVariation: 0.15,      // 0..1 — πόσο τυχαία το ύψος κάθε segment
  orientation: "horizontal", // "horizontal" | "vertical"
};

export const levelPresets = {
  1: { segments: 4,  amplitude: 28, lineCount: 1, strokeStyle: "long-dash", angleVariation: 0 },
  2: { segments: 6,  amplitude: 20, lineCount: 2, strokeStyle: "dashed",    angleVariation: 0.1 },
  3: { segments: 9,  amplitude: 14, lineCount: 3, strokeStyle: "dashed",    angleVariation: 0.2 },
  4: { segments: 12, amplitude: 9,  lineCount: 3, strokeStyle: "dotted",    angleVariation: 0.35 },
  5: { segments: 16, amplitude: 6,  lineCount: 4, strokeStyle: "dotted",    angleVariation: 0.5 },
};

function buildPath(rng, params, w, h) {
  const { segments, amplitude, angleVariation, orientation } = params;
  const horizontal = orientation !== "vertical";
  const margin = 10;
  const usable = horizontal ? w - margin * 2 : h - margin * 2;
  const stepLen = usable / segments;

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const along = margin + i * stepLen;
    // alternating zig/zag: i parity controls direction
    const baseOffset = (i % 2 === 0) ? -amplitude / 2 : amplitude / 2;
    const jitter = (rng() - 0.5) * 2 * angleVariation * (amplitude / 2);
    const offset = baseOffset + jitter;
    const center = (horizontal ? h : w) / 2;
    if (horizontal) {
      points.push([along, center + offset]);
    } else {
      points.push([center + offset, along]);
    }
  }
  return points;
}

function pointsToPath(points) {
  return points.map((p, i) => (i === 0 ? `M ${p[0].toFixed(2)} ${p[1].toFixed(2)}` : `L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)).join(" ");
}

export function render(params = {}, rng, orientation = "portrait") {
  const p = { ...defaultParams, ...params };
  const { w, h } = a4ViewBox(orientation);
  const svg = svgRoot(orientation, { class: "gen-zigzag" });

  // Background subtle guide (very light, optional)
  // We keep the body white — focus on the line.

  // Generate parallel zigzag lines, vertically offset
  const lineSpacing = Math.min(28, (h - 40) / Math.max(p.lineCount, 1));
  const startY = (h - lineSpacing * (p.lineCount - 1)) / 2;

  const dash = strokeDash(p.strokeStyle);
  const stroke = palette.gray;
  const strokeWidth = 0.9;

  for (let i = 0; i < p.lineCount; i++) {
    const yOffset = startY + i * lineSpacing - h / 2;
    const points = buildPath(rng, p, w, h).map(([x, y]) => [x, y + yOffset]);
    const d = pointsToPath(points);

    // Start arrow (left, on first line)
    if (p.startArrow) {
      const [sx, sy] = points[0];
      svg.appendChild(el("circle", {
        cx: sx - 4, cy: sy, r: 2.2,
        fill: palette.green,
      }));
      svg.appendChild(el("polygon", {
        points: `${sx - 1},${sy - 1.6} ${sx + 1.4},${sy} ${sx - 1},${sy + 1.6}`,
        fill: palette.green,
      }));
    }

    svg.appendChild(el("path", {
      d,
      fill: "none",
      stroke,
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-dasharray": dash,
    }));

    // End target (right, last point)
    const last = points[points.length - 1];
    svg.appendChild(el("circle", {
      cx: last[0] + 3, cy: last[1], r: 3,
      fill: "none",
      stroke: palette.red,
      "stroke-width": 0.8,
    }));
    svg.appendChild(el("circle", {
      cx: last[0] + 3, cy: last[1], r: 1.2,
      fill: palette.red,
    }));
  }

  return svg;
}

export function thumbnail(params = {}, rng) {
  // Smaller, simplified thumbnail (also portrait).
  return render(params, rng, "portrait");
}
