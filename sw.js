/* Sakshi AMS service worker – makes the app installable and fast. Data always comes live from the database. */
const VERSION = 'sakshi-ams-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('googleapis.com') && url.hostname.startsWith('firestore')) return;   // never cache live data
  const sameOrigin = url.origin === location.origin;
  const lib = /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname);
  if (!sameOrigin && !lib) return;
  if (req.mode === 'navigate') {            // pages: network first, fall back to the saved copy when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {   // files & libraries: saved copy first, refreshed in the background
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
