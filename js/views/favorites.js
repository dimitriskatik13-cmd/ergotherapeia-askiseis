// Favorites view — λίστα αποθηκευμένων ασκήσεων από το localStorage.

import { getFavorites } from "../state.js";
import { loadAllBooklets, getRecipe } from "../data/index.js";
import { exerciseCard } from "../components/exerciseCard.js";

export async function renderFavorites() {
  const view = document.getElementById("view");
  view.innerHTML = `
    <nav class="crumb"><a href="#/">Αρχική</a><span class="crumb__sep">›</span><span>Αγαπημένα</span></nav>
    <header class="booklet-head">
      <h1>Αγαπημένες ασκήσεις</h1>
      <p class="booklet-head__desc">Οι ασκήσεις που έχεις σημειώσει ως αγαπημένες σε αυτή τη συσκευή.</p>
    </header>
    <div id="results"><div class="empty">Φόρτωση…</div></div>
  `;

  await loadAllBooklets();
  const ids = getFavorites();
  const recipes = ids.map(getRecipe).filter(Boolean);

  const el = document.getElementById("results");
  if (!recipes.length) {
    el.innerHTML = `<div class="empty"><h3>Δεν υπάρχουν αγαπημένα ακόμη</h3><p>Σημείωσε ασκήσεις με το ☆ από την οθόνη προεπισκόπησης για να εμφανιστούν εδώ.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="ex-grid" id="grid"></div>`;
  const grid = el.querySelector("#grid");
  recipes.forEach(r => grid.appendChild(exerciseCard(r)));
}
