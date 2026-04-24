/* EGREENCITY'S — Service Worker v1.8 (2026-04) */
const CACHE = 'egreencitys-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/produits.html',
  '/reseau.html',
  '/investisseurs.html',
  '/mentions-legales.html',
  '/blog.html',
  '/faq.html',
  '/economies.html',
  '/cgv.html',
  '/video-presentation.html',
  '/video-presentation-9x16.html',
  '/logo.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin
  if (url.origin !== self.location.origin) return;
  // Network-first for HTML to always get fresh content, fallback cache offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }
  // Cache-first for static assets
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return resp;
    }).catch(() => cached))
  );
});
