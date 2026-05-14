// Thumbnail card για άσκηση — εμφανίζει preview SVG + τίτλο + meta.

import { get as getGenerator } from "../generators/index.js";
import { mulberry32 } from "../generators/_lib.js";
import { skills as skillTaxonomy } from "../data/skills.js";
import { formatAgeRange } from "../i18n.js";

export function exerciseCard(recipe) {
  const card = document.createElement("a");
  card.className = "ex-card";
  card.href = `#/exercise/${recipe.id}`;
  card.setAttribute("aria-label", recipe.title);

  const thumb = document.createElement("div");
  thumb.className = "ex-card__thumb";
  const gen = getGenerator(recipe.generator);
  if (gen) {
    const rng = mulberry32(1); // σταθερό seed για consistent UI thumbnails
    const svg = gen.thumbnail ? gen.thumbnail(recipe.params, rng) : gen.render(recipe.params, rng, recipe.printOrientation || "portrait");
    thumb.appendChild(svg);
  }
  card.appendChild(thumb);

  const body = document.createElement("div");
  body.className = "ex-card__body";

  const title = document.createElement("div");
  title.className = "ex-card__title";
  title.textContent = recipe.title;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "ex-card__meta";
  meta.innerHTML = `
    <span>${formatAgeRange(recipe.ageMin, recipe.ageMax)}</span>
    <span>Επ. ${recipe.level}</span>
    ${recipe.skill && recipe.skill[0] ? `<span>${skillTaxonomy[recipe.skill[0]]?.label || recipe.skill[0]}</span>` : ""}
  `;
  body.appendChild(meta);

  card.appendChild(body);
  return card;
}
