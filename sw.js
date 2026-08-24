const CACHE = "menelwars-tools-0.0.7.5.6.6.0";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(ASSETS))
  );
});


self.addEventListener("activate", event => {

  event.waitUntil(
    (async () => {

      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();

    })()
  );
});


self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {

      try {

        // Najpierw zawsze próbujemy pobrać aktualną wersję.
        const response =
          await fetch(
            event.request,
            {
              cache: "no-store"
            }
          );

        // Jeśli się udało, aktualizujemy cache.
        const cache =
          await caches.open(CACHE);

        cache.put(
          event.request,
          response.clone()
        );

        return response;

      } catch (error) {

        // Brak internetu → korzystamy z cache.
        const cached =
          await caches.match(
            event.request
          );

        if (cached) {
          return cached;
        }

        // Dla nawigacji spróbuj otworzyć cached index.
        if (
          event.request.mode ===
          "navigate"
        ) {

          return caches.match(
            "./index.html"
          );
        }

        throw error;
      }

    })()
  );
});