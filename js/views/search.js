// Search view — global αναζήτηση/φιλτράρισμα σε όλα τα booklets.

import { loadAllBooklets, searchRecipes, skills as skillTaxonomy, ageBands, levels, listBooklets } from "../data/index.js";
import { exerciseCard } from "../components/exerciseCard.js";
import { buildQuery } from "../router.js";

export async function renderSearch({ query }) {
  const view = document.getElementById("view");
  const state = {
    q: query.q || "",
    level: query.level ? parseInt(query.level, 10) : null,
    age:   query.age   ? parseInt(query.age, 10)   : null,
    skill: query.skill ? query.skill.split(",")    : [],
    bookletId: query.booklet || null,
  };

  view.innerHTML = `
    <nav class="crumb"><a href="#/">Αρχική</a><span class="crumb__sep">›</span><span>Αναζήτηση</span></nav>
    <header class="booklet-head">
      <h1>Αναζήτηση ασκήσεων</h1>
      <div class="searchbar" style="max-width:640px">
        <span aria-hidden="true">🔎</span>
        <input id="q" type="search" placeholder="Αναζήτηση…" value="${escapeAttr(state.q)}" />
      </div>
    </header>
    <section class="booklet-layout">
      <aside class="booklet-filters" id="filters"></aside>
      <div id="results"><div class="empty">Φόρτωση…</div></div>
    </section>
  `;

  await loadAllBooklets();
  renderFilters(state);
  runQuery(state);

  view.querySelector("#q").addEventListener("input", debounce((e) => {
    state.q = e.target.value;
    runQuery(state);
    syncUrl(state);
  }, 120));

  view.querySelector("#filters").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-group]");
    if (!chip) return;
    const group = chip.dataset.group;
    const value = chip.dataset.value;
    if (group === "level")   state.level = state.level === parseInt(value, 10) ? null : parseInt(value, 10);
    else if (group === "age") state.age   = state.age   === parseInt(value, 10) ? null : parseInt(value, 10);
    else if (group === "skill") {
      const i = state.skill.indexOf(value);
      if (i >= 0) state.skill.splice(i, 1); else state.skill.push(value);
    } else if (group === "booklet") {
      state.bookletId = state.bookletId === value ? null : value;
    } else if (group === "clear") {
      state.level = null; state.age = null; state.skill = []; state.bookletId = null;
    }
    renderFilters(state);
    runQuery(state);
    syncUrl(state);
  });
}

function renderFilters(state) {
  const el = document.getElementById("filters");
  const bookletOptions = listBooklets();
  el.innerHTML = `
    <div class="filter-panel">
      <div class="filter-group">
        <div class="filter-group__title">Ενότητα</div>
        <div class="chip-row">
          ${bookletOptions.map(b => `<button class="chip ${state.bookletId === b.id ? 'is-active' : ''}" data-group="booklet" data-value="${b.id}">${b.short}</button>`).join("")}
        </div>
      </div>
      <div class="filter-group">
        <div class="filter-group__title">Επίπεδο</div>
        <div class="chip-row">
          ${levels.map(l => `<button class="chip ${state.level === l ? 'is-active' : ''}" data-group="level" data-value="${l}">${l}</button>`).join("")}
        </div>
      </div>
      <div class="filter-group">
        <div class="filter-group__title">Ηλικία</div>
        <div class="chip-row">
          ${ageBands.map(a => `<button class="chip ${state.age === a.min ? 'is-active' : ''}" data-group="age" data-value="${a.min}">${a.label}</button>`).join("")}
        </div>
      </div>
      <div class="filter-group">
        <div class="filter-group__title">Δεξιότητα</div>
        <div class="chip-row">
          ${Object.keys(skillTaxonomy).map(s => `<button class="chip ${state.skill.includes(s) ? 'is-active' : ''}" data-group="skill" data-value="${s}">${skillTaxonomy[s].label}</button>`).join("")}
        </div>
      </div>
      <button class="btn btn--ghost" data-group="clear">Καθαρισμός όλων</button>
    </div>
  `;
}

function runQuery(state) {
  const results = searchRecipes({
    q: state.q,
    skill: state.skill,
    age: state.age,
    level: state.level,
    bookletId: state.bookletId,
  });
  const el = document.getElementById("results");
  if (!results.length) {
    el.innerHTML = `<div class="empty"><h3>Δεν βρέθηκε άσκηση</h3><p>Δοκίμασε λιγότερα φίλτρα ή διαφορετική λέξη.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="ex-grid" id="grid"></div>`;
  const grid = el.querySelector("#grid");
  results.forEach(r => grid.appendChild(exerciseCard(r)));
}

function syncUrl(state) {
  const q = {};
  if (state.q) q.q = state.q;
  if (state.level) q.level = state.level;
  if (state.age) q.age = state.age;
  if (state.skill.length) q.skill = state.skill.join(",");
  if (state.bookletId) q.booklet = state.bookletId;
  history.replaceState(null, "", `#/search${buildQuery(q)}`);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
