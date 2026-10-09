// Сосед — service worker (часть 1: кэш и офлайн)
// Чтобы выпустить обновление, поменяй номер версии.
const VERSION = 'v1';
const SHELL_CACHE = `sosed-shell-${VERSION}`;
const RUNTIME_CACHE = `sosed-runtime-${VERSION}`;

const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Обработчики пушей (часть 3). Файла может ещё не быть — не ломаем из-за этого воркер.
try {
  importScripts('/sw-push.js');
} catch (e) {
  // sw-push.js ещё не добавлен
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('sosed-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // чужие домены не трогаем
  if (url.pathname.startsWith('/api/')) return; // данные всегда с сети

  // Открытие страниц: сначала сеть, если её нет — кэш, потом офлайн-страница
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match('/'))
            .then((hit) => hit || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Остальное (css, js, картинки): отдаём из кэша и обновляем в фоне
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
