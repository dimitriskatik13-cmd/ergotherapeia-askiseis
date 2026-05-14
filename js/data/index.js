// Data layer — booklet metadata + lazy-loaded recipes + in-memory indexes for search/filter.

import { booklets, getBooklet } from "./booklets.js";
import { skills, ageBands, levels } from "./skills.js";
import { normalize, tokens } from "../i18n.js";

const recipeCache = new Map(); // id -> recipe
const loadedBooklets = new Set();
const bookletPromises = new Map();

// Index structures, rebuilt as booklets load.
const idx = {
  byBooklet: new Map(),  // bookletId -> recipe[]
  bySkill:   new Map(),  // skill -> Set<recipeId>
  byAge:     new Map(),  // age -> Set<recipeId>
  byLevel:   new Map(),  // 1..5 -> Set<recipeId>
  search:    new Map(),  // token -> Set<recipeId>
  allIds:    new Set(),
};

async function importBooklet(bookletId) {
  const module = await import(`./recipes/${bookletId}.js`);
  return module.default || [];
}

export async function loadBooklet(bookletId) {
  if (loadedBooklets.has(bookletId)) {
    return idx.byBooklet.get(bookletId) || [];
  }
  if (bookletPromises.has(bookletId)) {
    return bookletPromises.get(bookletId);
  }
  const promise = importBooklet(bookletId)
    .then(recipes => {
      indexRecipes(bookletId, recipes);
      loadedBooklets.add(bookletId);
      return recipes;
    })
    .catch(err => {
      console.warn(`[data] Booklet ${bookletId} δεν φορτώθηκε:`, err);
      loadedBooklets.add(bookletId);
      idx.byBooklet.set(bookletId, []);
      return [];
    });
  bookletPromises.set(bookletId, promise);
  return promise;
}

export async function loadAllBooklets() {
  await Promise.all(booklets.map(b => loadBooklet(b.id)));
}

function indexRecipes(bookletId, recipes) {
  idx.byBooklet.set(bookletId, recipes);
  for (const r of recipes) {
    recipeCache.set(r.id, r);
    idx.allIds.add(r.id);

    for (const s of (r.skill || [])) {
      if (!idx.bySkill.has(s)) idx.bySkill.set(s, new Set());
      idx.bySkill.get(s).add(r.id);
    }
    for (let a = r.ageMin; a <= r.ageMax; a++) {
      if (!idx.byAge.has(a)) idx.byAge.set(a, new Set());
      idx.byAge.get(a).add(r.id);
    }
    if (r.level != null) {
      if (!idx.byLevel.has(r.level)) idx.byLevel.set(r.level, new Set());
      idx.byLevel.get(r.level).add(r.id);
    }

    const searchable = [r.title, r.childInstruction, r.therapistNote, r.goal, ...(r.skill || [])].filter(Boolean).join(" ");
    for (const t of tokens(searchable)) {
      if (!idx.search.has(t)) idx.search.set(t, new Set());
      idx.search.get(t).add(r.id);
    }
  }
}

export function getRecipe(id) {
  return recipeCache.get(id);
}

export function listBooklets() {
  return booklets;
}

export function getBookletMeta(id) {
  return getBooklet(id);
}

export function getRecipesInBooklet(bookletId) {
  return idx.byBooklet.get(bookletId) || [];
}

export { skills, ageBands, levels };

// ---------- Search & filter ----------

export function searchRecipes({ q, skill, age, level, bookletId } = {}) {
  let candidates = null;

  const intersect = (set) => {
    if (!set) return;
    if (candidates === null) candidates = new Set(set);
    else for (const id of [...candidates]) if (!set.has(id)) candidates.delete(id);
  };

  if (bookletId) {
    const recipes = idx.byBooklet.get(bookletId) || [];
    intersect(new Set(recipes.map(r => r.id)));
  }
  if (skill && skill.length) {
    const union = new Set();
    for (const s of skill) {
      const ids = idx.bySkill.get(s);
      if (ids) for (const id of ids) union.add(id);
    }
    intersect(union);
  }
  if (age != null) {
    intersect(idx.byAge.get(age) || new Set());
  }
  if (level != null) {
    intersect(idx.byLevel.get(level) || new Set());
  }
  if (q && q.trim()) {
    const qtokens = tokens(q);
    let qSet = null;
    for (const t of qtokens) {
      const partial = new Set();
      for (const [key, ids] of idx.search.entries()) {
        if (key.startsWith(t)) for (const id of ids) partial.add(id);
      }
      if (qSet === null) qSet = partial;
      else for (const id of [...qSet]) if (!partial.has(id)) qSet.delete(id);
    }
    intersect(qSet || new Set());
  }

  if (candidates === null) candidates = new Set(idx.allIds);
  return [...candidates].map(id => recipeCache.get(id)).filter(Boolean);
}
