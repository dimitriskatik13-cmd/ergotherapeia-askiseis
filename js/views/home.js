// Home view: hero + search + 10 booklet cards.

import { listBooklets } from "../data/index.js";

function bookletCard(b) {
  const a = document.createElement("a");
  a.className = "card";
  a.href = `#/booklet/${b.id}`;
  a.setAttribute("aria-label", b.title);

  a.innerHTML = `
    <span class="card__accent card__accent--${b.accent}"></span>
    <div class="card__eyebrow">Book ${b.book} · Booklet ${b.booklet}</div>
    <div class="card__title">${b.title}</div>
    <div class="card__desc">${b.description}</div>
    <div class="card__meta">
      <span class="pill pill--${b.accent}">${b.short}</span>
      <span class="pill">${b.ageRange[0]}-${b.ageRange[1]} ετών</span>
    </div>
  `;
  return a;
}

export function renderHome({ query } = {}) {
  const view = document.getElementById("view");
  const all = listBooklets();
  const book1 = all.filter(b => b.book === 1);
  const book2 = all.filter(b => b.book === 2);

  const q = (query?.q || "").trim();

  view.innerHTML = `
    <section class="home-hero">
      <h1>Εργοθεραπευτικές Ασκήσεις</h1>
      <p class="home-hero__sub">
        Βιβλιοθήκη εκτυπώσιμων ασκήσεων για γραφοκινητική προετοιμασία, εμπνευσμένη
        από τη μεθοδολογική προσέγγιση Teodorescu/Addy. Διαλέξτε ενότητα, επιλέξτε
        άσκηση, εκτυπώστε σε A4 για τη συνεδρία ή το σπίτι.
      </p>
      <div class="searchbar home-search">
        <span aria-hidden="true">🔎</span>
        <input id="home-search" type="search" placeholder="Αναζήτηση (π.χ. ζιγκ-ζαγκ, κύκλοι, λαβύρινθος)…" value="${escapeAttr(q)}" />
      </div>
    </section>

    <section class="home-section">
      <header class="home-section__head">
        <h2>Book 1 — Θεμελίωση</h2>
        <span class="pill">${book1.length} ενότητες</span>
      </header>
      <div class="book-row" id="row-book1"></div>
    </section>

    <section class="home-section">
      <header class="home-section__head">
        <h2>Book 2 — Επέκταση & ολοκλήρωση</h2>
        <span class="pill">${book2.length} ενότητες</span>
      </header>
      <div class="book-row" id="row-book2"></div>
    </section>
  `;

  const r1 = view.querySelector("#row-book1");
  const r2 = view.querySelector("#row-book2");
  book1.forEach(b => r1.appendChild(bookletCard(b)));
  book2.forEach(b => r2.appendChild(bookletCard(b)));

  const input = view.querySelector("#home-search");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value.trim();
      if (value) window.location.hash = `#/search?q=${encodeURIComponent(value)}`;
    }
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
