const CACHE_NAME = 'pt-pwa-v3';
const PINNED_RUNTIME_URL = 'https://cdn.jsdelivr.net/gh/DrDKov/project-tracker-site@805be0b49a87b3f4d007f3d0de47340580369319/assets/app.js';

const APP_SHELL = [
  './',
  'index.html',
  'assets/app.js',
  'assets/app.css',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  PINNED_RUNTIME_URL
];

const APP_SHELL_URLS = APP_SHELL.map(path => new URL(path, self.registration.scope).toString());
const APP_SHELL_SET = new Set(APP_SHELL_URLS);

function stripUrl(url) {
  const clean = new URL(url.toString());
  clean.search = '';
  clean.hash = '';
  return clean.toString();
}

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
}

function appShellCacheKey(url) {
  const cleanUrl = stripUrl(url);
  return APP_SHELL_SET.has(cleanUrl) ? cleanUrl : null;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isSupabaseRequest(url)) return;

  const cacheKey = appShellCacheKey(url);

  if (cacheKey) {
    event.respondWith(
      caches.match(cacheKey).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
