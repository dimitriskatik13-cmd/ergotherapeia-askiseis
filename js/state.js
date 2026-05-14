// Lightweight localStorage wrapper for favorites & recents.

const STORAGE_KEY = "synoida-ergo-app/v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* storage full / private mode — ignore */
  }
}

function get(key, fallback) {
  const all = readAll();
  return key in all ? all[key] : fallback;
}

function set(key, value) {
  const all = readAll();
  all[key] = value;
  writeAll(all);
}

// ---------- Favorites ----------

export function getFavorites() {
  return get("favorites", []);
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const favs = getFavorites();
  const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1);
  else favs.unshift(id);
  set("favorites", favs.slice(0, 100));
  return favs.includes(id);
}

// ---------- Recents ----------

export function getRecents() {
  return get("recents", []);
}

export function pushRecent(id) {
  const recents = getRecents().filter(r => r !== id);
  recents.unshift(id);
  set("recents", recents.slice(0, 12));
}
