// Sips by Evve — lets the app open without internet, without ever holding back an update.
// Pages are always fetched fresh from the internet first; the saved copy is only used when
// there's no connection. Your orders/stock are never stored here — they live in the app's own
// storage and in Supabase as before. Supabase requests are not touched at all.
const CACHE = 'sips-app-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-64.png'];
const SUPABASE_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;
  const isLib = req.url.startsWith(SUPABASE_LIB);
  if (!sameSite && !isLib) return;                 // Supabase data, photos, etc.: untouched
  if (sameSite && url.searchParams.has('_v')) return; // the app's "is there a new version?" check
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: sameSite }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
