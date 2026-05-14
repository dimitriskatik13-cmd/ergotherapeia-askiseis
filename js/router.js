// Minimal hash-based router. Supports #/path?query=string

const routes = [];

export function route(pattern, handler) {
  // Pattern syntax: "/booklet/:id"  → params.id
  const keys = [];
  const regex = new RegExp("^" + pattern.replace(/:[A-Za-z]+/g, (m) => {
    keys.push(m.slice(1));
    return "([^/]+)";
  }) + "$");
  routes.push({ regex, keys, handler });
}

export function navigate(hash) {
  if (hash.startsWith("#")) hash = hash.slice(1);
  if (!hash.startsWith("/")) hash = "/" + hash;
  window.location.hash = hash;
}

function parseHash() {
  let raw = window.location.hash || "#/";
  if (raw.startsWith("#")) raw = raw.slice(1);
  const [path, queryStr = ""] = raw.split("?");
  const query = {};
  for (const part of queryStr.split("&").filter(Boolean)) {
    const [k, v = ""] = part.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return { path: path || "/", query };
}

let lastRender = 0;

export function dispatch() {
  const { path, query } = parseHash();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] || "")));
      const renderId = ++lastRender;
      Promise.resolve(r.handler({ params, query, path })).catch(err => {
        console.error("[router] route handler failed:", err);
      });
      // Update active nav links
      document.querySelectorAll("[data-nav]").forEach(a => {
        const target = a.getAttribute("href").replace(/^#/, "");
        a.classList.toggle("is-active", path === target);
      });
      // Scroll to top on each navigation
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      return;
    }
  }
  console.warn("[router] no route matched:", path);
}

export function start() {
  window.addEventListener("hashchange", dispatch);
  if (!window.location.hash) window.location.hash = "#/";
  else dispatch();
}

export function buildQuery(obj) {
  const parts = [];
  for (const k of Object.keys(obj)) {
    if (obj[k] == null || obj[k] === "") continue;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
  }
  return parts.length ? "?" + parts.join("&") : "";
}
