// Booklet view: μεταδεδομένα της ενότητας + λίστα ασκήσεων με sidebar φίλτρων.

import { getBookletMeta, loadBooklet, getRecipesInBooklet, skills as skillTaxonomy, ageBands, levels } from "../data/index.js";
import { exerciseCard } from "../components/exerciseCard.js";
import { buildQuery } from "../router.js";

export async function renderBooklet({ params, query }) {
  const view = document.getElementById("view");
  const meta = getBookletMeta(params.id);
  if (!meta) {
    view.innerHTML = `<div class="empty"><h3>Δεν βρέθηκε η ενότητα</h3><p><a class="btn" href="#/">Επιστροφή στην αρχική</a></p></div>`;
    return;
  }

  // Loading skeleton
  view.innerHTML = `
    <nav class="crumb"><a href="#/">Αρχική</a><span class="crumb__sep">›</span><span>${meta.title}</span></nav>
    <header class="booklet-head">
      <h1>${meta.title}</h1>
      <div class="booklet-head__meta">
        <span class="pill pill--${meta.accent}">Book ${meta.book} · Booklet ${meta.booklet}</span>
        <span class="pill">${meta.ageRange[0]}-${meta.ageRange[1]} ετών</span>
        <span class="pill">${meta.short}</span>
      </div>
      <p class="booklet-head__desc">${meta.description}</p>
    </header>
    <section class="booklet-layout">
      <aside class="booklet-filters" id="filters"></aside>
      <div id="ex-list"><div class="empty">Φόρτωση ασκήσεων…</div></div>
    </section>
  `;

  await loadBooklet(meta.id);
  const recipes = getRecipesInBooklet(meta.id);

  const state = {
    level: query.level ? parseInt(query.level, 10) : null,
    age:   query.age   ? parseInt(query.age, 10)   : null,
    skill: query.skill ? query.skill.split(",")    : [],
  };

  renderFilters(view.querySelector("#filters"), meta, state);
  renderList(view.querySelector("#ex-list"), recipes, state);

  // Event delegation for filter chips
  view.querySelector("#filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const group = chip.dataset.group;
    const value = chip.dataset.value;
    if (group === "level") {
      state.level = state.level === parseInt(value, 10) ? null : parseInt(value, 10);
    } else if (group === "age") {
      state.age = state.age === parseInt(value, 10) ? null : parseInt(value, 10);
    } else if (group === "skill") {
      const i = state.skill.indexOf(value);
      if (i >= 0) state.skill.splice(i, 1); else state.skill.push(value);
    } else if (group === "clear") {
      state.level = null; state.age = null; state.skill = [];
    }
    renderFilters(view.querySelector("#filters"), meta, state);
    renderList(view.querySelector("#ex-list"), recipes, state);
    syncUrl(meta.id, state);
  });
}

function renderFilters(el, meta, state) {
  const bookletSkills = meta.skills || Object.keys(skillTaxonomy);
  el.innerHTML = `
    <div class="filter-panel">
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
          ${bookletSkills.map(s => `<button class="chip ${state.skill.includes(s) ? 'is-active' : ''}" data-group="skill" data-value="${s}">${skillTaxonomy[s]?.label || s}</button>`).join("")}
        </div>
      </div>
      ${ (state.level || state.age || state.skill.length) ? `<button class="btn btn--ghost" data-group="clear">Καθαρισμός</button>` : "" }
    </div>
  `;
}

function renderList(el, recipes, state) {
  const filtered = recipes.filter(r => {
    if (state.level != null && r.level !== state.level) return false;
    if (state.age != null && !(r.ageMin <= state.age && state.age <= r.ageMax)) return false;
    if (state.skill.length && !state.skill.some(s => (r.skill || []).includes(s))) return false;
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = `<div class="empty"><h3>Δεν υπάρχουν ασκήσεις με αυτά τα φίλτρα</h3><p>Δοκίμασε να ξεκαθαρίσεις κάποια κριτήρια.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="ex-grid" id="grid"></div>`;
  const grid = el.querySelector("#grid");
  filtered.forEach(r => grid.appendChild(exerciseCard(r)));
}

function syncUrl(bookletId, state) {
  const q = {};
  if (state.level) q.level = state.level;
  if (state.age) q.age = state.age;
  if (state.skill.length) q.skill = state.skill.join(",");
  history.replaceState(null, "", `#/booklet/${bookletId}${buildQuery(q)}`);
}
