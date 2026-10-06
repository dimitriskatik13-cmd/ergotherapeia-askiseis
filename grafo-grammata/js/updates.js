// ─────────────────────────────────────────────────────────────────────────────
// Νέα έκδοση — ο service worker κατεβάζει τη νέα έκδοση στο παρασκήνιο και
// παίρνει αμέσως τον έλεγχο. Η ανοιχτή σελίδα όμως τρέχει ακόμη την παλιά.
// Εδώ: έλεγχος για ενημέρωση σε κάθε άνοιγμα, και ένα μήνυμα με ένα κουμπί
// που ξαναφορτώνει τη σελίδα. Κανένας αριθμός έκδοσης δεν εμφανίζεται.
// ─────────────────────────────────────────────────────────────────────────────
import { el } from './ui/dom.js';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** Το μήνυμα «νέα έκδοση», κρυφό μέχρι να χρειαστεί. */
export function buildUpdateNote(reload) {
  const note = el('div', { class: 'update-note', role: 'status', 'aria-live': 'polite' }, [
    el('span', {}, ['Υπάρχει νέα έκδοση.']),
    el('button', { class: 'btn btn--cta', type: 'button', onclick: reload }, ['Ανανέωση']),
  ]);
  note.hidden = true;
  return note;
}

/**
 * Σύνδεση με τον service worker. Επιστρέφει false εκεί που δεν υπάρχει
 * (τοπική δοκιμή, παλιός browser), ώστε η εφαρμογή να τρέχει όπως πριν.
 */
export function watchUpdates(note, { serviceWorker, hostname, win = window, doc = document } = {}) {
  if (!serviceWorker || LOCAL_HOSTS.includes(hostname)) return false;
  // Στην πρώτη εγκατάσταση δεν υπάρχει τίποτα να ανανεωθεί.
  let hadController = !!serviceWorker.controller;
  serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) note.hidden = false;
    hadController = true;
  });
  win.addEventListener('load', async () => {
    let registration;
    try { registration = await serviceWorker.register('sw.js'); } catch (_) { return; }
    // Έλεγχος σε κάθε άνοιγμα της εφαρμογής, όχι μόνο όταν το αποφασίσει ο browser.
    const check = () => registration.update().catch(() => {});
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') check(); });
    check();
  });
  return true;
}
