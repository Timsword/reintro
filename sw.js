// Offline support. The cache name comes from the app version the page registers with
// (sw.js?v=0.3.1), so bumping APP_VERSION in index.html is the only change needed per release.
const VERSION = 'reintro-' + (new URL(self.location).searchParams.get('v') || 'dev');
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser's HTTP cache, so a new version never caches stale files
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // Only same-origin GETs. GitHub API calls and update checks (?check=…) always go straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.searchParams.has('check')) return;

  // The page itself: network first (newest version when online), saved copy when offline or slow.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await withTimeout(fetch(req.url, { cache: 'no-store' }), 4000);
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Icons and manifest: saved copy first, network as fallback.
  e.respondWith(caches.open(VERSION).then(async cache =>
    (await cache.match(req, { ignoreSearch: true })) ||
    fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; })));
});
