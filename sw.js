const CACHE_NAME = "sis-cache-v6"; // change si tu veux forcer maj
const urlsToCache = [
  "index.html",
  "envoyer.html",
  "voir.html",
  "avis.html",
  "conditions.html",
  "politiques.html",
  "propos.html",
  "icon/icon-192.png",
  "icon/icon-512.png"
];

// INSTALL : mise en cache direct
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // active direct
});

// ACTIVATE : nettoie anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// FETCH : réponse cache d’abord, sinon réseau
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});