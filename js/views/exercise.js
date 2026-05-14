// Exercise view: μεγάλο preview + sidebar με μεταδεδομένα + actions.

import { getRecipe, loadBooklet, getBookletMeta } from "../data/index.js";
import { get as getGenerator } from "../generators/index.js";
import { mulberry32 } from "../generators/_lib.js";
import { skills as skillTaxonomy } from "../data/skills.js";
import { formatAgeRange } from "../i18n.js";
import { isFavorite, toggleFavorite, pushRecent } from "../state.js";

export async function renderExercise({ params, query }) {
  const view = document.getElementById("view");
  const id = params.id;

  // The recipe may belong to a booklet we haven't loaded yet.
  const bookletId = id.split("-").slice(0, 2).join("-");
  await loadBooklet(bookletId);

  const recipe = getRecipe(id);
  if (!recipe) {
    view.innerHTML = `<div class="empty"><h3>Δεν βρέθηκε η άσκηση</h3><p><a class="btn" href="#/">Επιστροφή</a></p></div>`;
    return;
  }

  pushRecent(recipe.id);
  const bMeta = getBookletMeta(bookletId);
  const seed = query.seed ? parseInt(query.seed, 10) : 1;
  const fav = isFavorite(recipe.id);

  view.innerHTML = `
    <nav class="crumb">
      <a href="#/">Αρχική</a>
      <span class="crumb__sep">›</span>
      <a href="#/booklet/${bookletId}">${bMeta?.title || ""}</a>
      <span class="crumb__sep">›</span>
      <span>${recipe.title}</span>
    </nav>

    <header class="booklet-head">
      <h1>${recipe.title}</h1>
      <div class="booklet-head__meta">
        <span class="pill pill--${bMeta?.accent || "gray"}">Book ${recipe.book} · Booklet ${recipe.booklet}</span>
        <span class="pill">${formatAgeRange(recipe.ageMin, recipe.ageMax)}</span>
        <span class="pill">Επ. ${recipe.level}</span>
        ${(recipe.skill || []).map(s => `<span class="pill">${skillTaxonomy[s]?.label || s}</span>`).join("")}
      </div>
    </header>

    <section class="ex-layout">
      <div class="ex-preview" id="preview"></div>
      <aside class="ex-side">
        <div class="ex-side__group">
          <span class="ex-side__label">Οδηγία προς το παιδί</span>
          <span class="ex-side__text">${recipe.childInstruction}</span>
        </div>
        <div class="ex-side__group">
          <span class="ex-side__label">Στόχος</span>
          <span class="ex-side__text">${recipe.goal}</span>
        </div>
        <div class="ex-side__group">
          <span class="ex-side__label">Σημείωση θεραπευτή</span>
          <span class="ex-side__text ex-side__text--muted">${recipe.therapistNote}</span>
        </div>
        <div class="ex-side__group">
          <span class="ex-side__label">Ενέργειες</span>
          <div class="ex-side__actions">
            <button class="btn btn--primary" id="btn-print">🖨  Εκτύπωση A4</button>
            <button class="btn" id="btn-newseed">↻  Νέα παραλλαγή</button>
            <button class="btn ${fav ? 'btn--accent-orange' : ''}" id="btn-fav">${fav ? "★ Αγαπημένο" : "☆ Αγαπημένο"}</button>
          </div>
        </div>
        <div class="ex-side__group">
          <span class="ex-side__label">Έμπνευση</span>
          <span class="ex-side__text ex-side__text--muted">${recipe.inspiration}</span>
        </div>
      </aside>
    </section>
  `;

  renderPreview(recipe, seed);

  view.querySelector("#btn-newseed").addEventListener("click", () => {
    const newSeed = (Math.random() * 1e9) | 0;
    history.replaceState(null, "", `#/exercise/${recipe.id}?seed=${newSeed}`);
    renderPreview(recipe, newSeed);
  });

  view.querySelector("#btn-print").addEventListener("click", () => {
    window.location.hash = `#/print/${recipe.id}?seed=${seed}`;
  });

  view.querySelector("#btn-fav").addEventListener("click", (e) => {
    const nowFav = toggleFavorite(recipe.id);
    e.currentTarget.textContent = nowFav ? "★ Αγαπημένο" : "☆ Αγαπημένο";
    e.currentTarget.classList.toggle("btn--accent-orange", nowFav);
  });
}

function renderPreview(recipe, seed) {
  const stage = document.getElementById("preview");
  stage.innerHTML = "";
  const gen = getGenerator(recipe.generator);
  if (!gen) {
    stage.textContent = "Δεν βρέθηκε generator: " + recipe.generator;
    return;
  }
  const rng = mulberry32(seed);
  const svg = gen.render(recipe.params, rng, recipe.printOrientation || "portrait");
  stage.appendChild(svg);
}
