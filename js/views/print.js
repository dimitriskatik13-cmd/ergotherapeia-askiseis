// Print view — A4 sheet έτοιμο για window.print().

import { getRecipe, loadBooklet } from "../data/index.js";
import { get as getGenerator } from "../generators/index.js";
import { mulberry32 } from "../generators/_lib.js";
import { formatAgeRange } from "../i18n.js";

export async function renderPrint({ params, query }) {
  const view = document.getElementById("view");
  view.innerHTML = "";

  // Print stage takes over the layout — push it directly into <body> for cleanest control.
  const stage = document.createElement("div");
  stage.className = "print-stage";

  const id = params.id;
  const bookletId = id.split("-").slice(0, 2).join("-");
  await loadBooklet(bookletId);
  const recipe = getRecipe(id);
  if (!recipe) {
    stage.innerHTML = `<div class="empty"><h3>Δεν βρέθηκε η άσκηση</h3><p><a class="btn" href="#/">Επιστροφή</a></p></div>`;
    view.appendChild(stage);
    return;
  }
  const seed = query.seed ? parseInt(query.seed, 10) : 1;
  const orientation = recipe.printOrientation || "portrait";

  // Toolbar (screen-only)
  const toolbar = document.createElement("div");
  toolbar.className = "print-toolbar no-print";
  toolbar.innerHTML = `
    <div>
      <a class="btn btn--ghost" href="#/exercise/${recipe.id}?seed=${seed}">← Πίσω</a>
      <button class="btn" id="btn-reseed">↻ Νέα παραλλαγή</button>
    </div>
    <span class="print-toolbar__hint">
      Στο παράθυρο εκτύπωσης: <strong>Margins → None</strong> και <strong>Background graphics → On</strong>
      για να τυπωθούν οι χρωματιστές λωρίδες.
    </span>
    <button class="btn btn--primary" id="btn-do-print">🖨 Εκτύπωση</button>
  `;
  stage.appendChild(toolbar);

  // The A4 sheet itself
  const sheet = document.createElement("article");
  sheet.className = `print-sheet ${orientation === "landscape" ? "print-sheet--landscape" : ""}`;

  const levelDots = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < recipe.level ? "is-on" : ""}"></span>`
  ).join("");

  sheet.innerHTML = `
    <div class="print-sheet__strip"></div>
    <div class="print-sheet__header">
      <div class="print-sheet__title-row">
        <h1 class="print-sheet__title">${recipe.title}</h1>
        <span class="print-sheet__level">
          Επίπεδο
          <span class="print-sheet__level-dots">${levelDots}</span>
        </span>
      </div>
      <div class="print-sheet__goal"><strong>Στόχος:</strong> ${recipe.goal}</div>
      <div class="print-sheet__id-row">
        <span>Όνομα: <em></em></span>
        <span>Ημερομηνία: <em></em></span>
        <span>${formatAgeRange(recipe.ageMin, recipe.ageMax)}</span>
      </div>
    </div>
    <div class="print-sheet__instruction">${recipe.childInstruction}</div>
    <div class="print-sheet__body" id="print-body"></div>
    <div class="print-sheet__therapist">
      <strong>Σημείωση θεραπευτή:</strong> ${recipe.therapistNote}
    </div>
    <div class="print-sheet__inspiration">${recipe.inspiration}</div>
    <div class="print-sheet__footer">
      <span><strong>ΣΥΝΟΙΔΑ</strong> · Κέντρα Ειδικών Θεραπειών</span>
      <span>Αρτέμιδα · Σπάτα · Νέα Μάκρη · Μαραθώνας</span>
      <span>www.synoida.gr</span>
    </div>
    <div class="print-sheet__strip"></div>
  `;

  stage.appendChild(sheet);
  view.appendChild(stage);

  renderExerciseSvg(recipe, seed);

  toolbar.querySelector("#btn-do-print").addEventListener("click", () => window.print());
  toolbar.querySelector("#btn-reseed").addEventListener("click", () => {
    const newSeed = (Math.random() * 1e9) | 0;
    history.replaceState(null, "", `#/print/${recipe.id}?seed=${newSeed}`);
    renderExerciseSvg(recipe, newSeed);
  });
}

function renderExerciseSvg(recipe, seed) {
  const stage = document.getElementById("print-body");
  if (!stage) return;
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
