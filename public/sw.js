// Service worker for the published web version: saves the whole app on the
// first visit so it opens from the Home Screen without an internet connection.
//
// `npm run build:web` lists every file of the build in /precache.json and
// stamps this cache name with a build ID, so each deploy replaces the old copy.
const CACHE = 'one-percent-better-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        const response = await fetch('/precache.json', { cache: 'no-store' }).catch(() => null);
        const urls = response && response.ok ? await response.json() : ['/'];
        await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Network first, so a new deploy shows up as soon as you're online; fall back
// to the saved copy when offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Every page of the app is served by the same single-page index.
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
