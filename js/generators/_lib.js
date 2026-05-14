// Generator shared library: PRNG, SVG helpers, A4 viewBox utilities, brand palette.

export const SVG_NS = "http://www.w3.org/2000/svg";

export const palette = {
  green:  "#8DC63F",
  red:    "#ED1C24",
  blue:   "#00AEEF",
  orange: "#F7941D",
  gray:   "#58595B",
  ink:    "#1c1f24",
  line:   "#d6d8dc",
  guide:  "#bfd9f2",
};

// A4 sizes (in mm). We render SVG with viewBox in mm units so printing aligns 1:1.
export const A4 = {
  portrait:  { w: 180, h: 180 }, // exercise body area
  landscape: { w: 260, h: 120 },
};

export function a4ViewBox(orientation = "portrait") {
  const { w, h } = A4[orientation] || A4.portrait;
  return { w, h, viewBox: `0 0 ${w} ${h}` };
}

// mulberry32 PRNG — small, fast, deterministic across browsers.
export function mulberry32(seed) {
  let a = (seed | 0) || 1;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: random in [min, max).
export function rand(rng, min, max) {
  return min + rng() * (max - min);
}
// Random integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}
// Random pick from array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// SVG element factory.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
    node.setAttribute(k, String(attrs[k]));
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(c);
  }
  return node;
}

// Root svg element with proper viewBox.
export function svgRoot(orientation = "portrait", extraAttrs = {}) {
  const { w, h, viewBox } = a4ViewBox(orientation);
  return el("svg", {
    xmlns: SVG_NS,
    viewBox,
    width: `${w}mm`,
    height: `${h}mm`,
    preserveAspectRatio: "xMidYMid meet",
    ...extraAttrs,
  });
}

// Map of stroke-style → dasharray string (units = mm because viewBox is in mm).
export function strokeDash(style) {
  switch (style) {
    case "dashed": return "2 1.5";
    case "dotted": return "0.4 1.4";
    case "long-dash": return "4 2";
    default: return null;
  }
}
