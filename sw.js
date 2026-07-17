const CACHE_NAME = 'event-cue-studio-v1.5.0-20260717';
const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/app-v1.5.css',
  '/assets/app-v1.5.js',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/og-thumbnail-v1.5.jpg',
  '/reset.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('event-cue-studio-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 버전 파일은 캐시 우선, 나머지는 네트워크 우선으로 갱신 안정성을 높입니다.
  const immutableAsset = /\/assets\/app-v1\.5\.(css|js)$|\/icon-(192|512)\.png$|\/og-thumbnail-v1\.5\.jpg$/.test(url.pathname);
  if (immutableAsset) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
