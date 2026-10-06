/* ─────────────────────────────────────────────────────────────────────────────
   Service worker — offline PWA. Προφορτώνει το app shell + γραμματοσειρές +
   φωνήματα ώστε να δουλεύει χωρίς ίντερνετ στο γραφείο.
   ───────────────────────────────────────────────────────────────────────────── */
// Ανεβαίνει ΜΑΖΙ με το APP_VERSION στο js/version.js σε κάθε deploy.
const VERSION = 'grafo-v29';
const CACHE = `synoida-${VERSION}`;

const PHONEMES = ['a','e','i','o','v','gh','dh','z','th','k','l','m','n','ks','p','r','s','t','f','kh','ps'];
const NUMBER_SOUNDS = Array.from({ length: 32 }, (_, i) => `sounds/num-${i}.wav`);

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/components.css', 'css/app.css', 'css/celebration.css',
  'js/main.js', 'js/state.js', 'js/audio.js', 'js/feedback.js', 'js/session.js', 'js/palette.js', 'js/version.js', 'js/updates.js',
  'js/engine/surface.js', 'js/engine/input.js', 'js/engine/pencil.js',
  'js/engine/tracer.js', 'js/engine/animator.js', 'js/engine/guide.js',
  'js/letters/_dsl.js', 'js/letters/lower.js', 'js/letters/upper.js', 'js/letters/numbers.js', 'js/letters/index.js',
  'js/ui/dom.js', 'js/ui/settings.js', 'js/ui/approval.js', 'js/ui/picker.js',
  'brand_assets/fonts/Comfortaa.woff2', 'brand_assets/fonts/Inter.woff2',
  'brand_assets/logo/synoida-logo.webp', 'brand_assets/logo/synoida-icon-pwa.png',
  ...PHONEMES.map((p) => `sounds/${p}.wav`),
  ...NUMBER_SOUNDS,
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'no-cache' → πάντα επαλήθευση με τον server, ΟΧΙ από HTTP cache.
      // Αλλιώς μια νέα έκδοση του SW μπορεί να ξανα-κασάρει ΠΑΛΙΑ αρχεία και η
      // εφαρμογή να «κολλήσει» σε παλιά έκδοση μέχρι το επόμενο deploy.
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('synoida-grafo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const cached = req.cache === 'reload' || req.cache === 'no-store'
    ? Promise.resolve(undefined) : caches.match(req).catch(() => undefined);
  e.respondWith(
    cached.then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (req.cache !== 'no-store' && res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          const save = caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          // Cache storage failure must not replace a valid network response.
          if (e.waitUntil) e.waitUntil(save);
        }
        return res;
      }).catch(async (error) => {
        // An audio/module miss must fail as its own resource, never as HTML.
        if (req.mode !== 'navigate') throw error;
        const shell = await caches.match('index.html').catch(() => undefined);
        if (shell) return shell;
        throw error;
      });
    })
  );
});
