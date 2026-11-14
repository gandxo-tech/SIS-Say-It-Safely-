const CACHE_NAME = "sis-cache-v24"; // change la version pour forcer la mise à jour chez tout le monde
const urlsToCache = [
  "index.html",
  "classement.html",
  "envoyer.html",
  "voir.html",
  "compte.html",
  "pays.html",
  "bottom-nav.js",
  "leaderboard-utils.js",
  "share-canvas.js",
  "sis-cache.js",
  "leaderboard-sync.js",
  "firebase-config.js",
  "geo-country.js",
  "theme.js",
  "avis.html",
  "conditions.html",
  "politiques.html",
  "propos.html",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "manifest.json"
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

// FETCH
self.addEventListener("fetch", event => {
  const req = event.request;

  // Les envois (POST, etc.) ne passent jamais par le cache
  if (req.method !== "GET") return;

  const isPage = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    // Pages : réseau d'abord (toujours la dernière version), cache en secours hors ligne
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // Images, scripts, polices : cache d'abord, sinon réseau
  event.respondWith(
    caches.match(req).then(response => response || fetch(req))
  );
});
