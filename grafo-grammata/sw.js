/* ─────────────────────────────────────────────────────────────────────────────
   Service worker — offline PWA. Προφορτώνει το app shell + γραμματοσειρές +
   φωνήματα ώστε να δουλεύει χωρίς ίντερνετ στο γραφείο.
   ───────────────────────────────────────────────────────────────────────────── */
const VERSION = 'grafo-v8';
const CACHE = `synoida-${VERSION}`;

const PHONEMES = ['a','e','i','o','v','gh','dh','z','th','k','l','m','n','ks','p','r','s','t','f','kh','ps'];

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/components.css', 'css/app.css',
  'js/main.js', 'js/state.js', 'js/audio.js', 'js/feedback.js', 'js/session.js', 'js/palette.js',
  'js/engine/surface.js', 'js/engine/input.js', 'js/engine/pencil.js',
  'js/engine/tracer.js', 'js/engine/animator.js', 'js/engine/guide.js',
  'js/letters/_dsl.js', 'js/letters/lower.js', 'js/letters/upper.js', 'js/letters/index.js',
  'js/ui/dom.js', 'js/ui/settings.js', 'js/ui/approval.js',
  'brand_assets/fonts/Comfortaa-Variable.ttf', 'brand_assets/fonts/Inter-Variable.ttf',
  'brand_assets/logo/synoida-logo-header.png', 'brand_assets/logo/synoida-icon-pwa.png',
  ...PHONEMES.map((p) => `sounds/${p}.mp3`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
