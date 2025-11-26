const CACHE_NAME = "dot-pdf-cache-v1";

// IMPORTANT: Use RELATIVE paths so it works on Vercel
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./LOGO.png",
  "./manifest.json"
];

// Install SW and cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate SW and clear older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Serve cached files, fallback to network
self.addEventListener("fetch", (event) => {
  // Ignore chrome extension or devtools requests
  if (
    event.request.url.startsWith("chrome-extension") ||
    event.request.url.includes("extension")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() =>
          caches.match("./index.html") // fallback for offline
        )
      );
    })
  );
});
