"use strict";

const CACHE = "menelwars-tools-v21.38";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=21.38",
  "./data.js?v=21.05",
  "./app.js?v=21.38",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./mapa-warszawa.png",
  "./onion-growth-atlas.png?v=21.09",
  "./empty-soil.png?v=21.09"
];

async function cacheCoreBestEffort() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(
    CORE_ASSETS.map(async asset => {
      const response = await fetch(asset,{cache:"no-store"});
      if (response && response.ok) {
        await cache.put(asset,response.clone());
      }
    })
  );
}

self.addEventListener("install",event => {
  // Celowo bez skipWaiting(): działająca karta nie jest podmieniana w trakcie
  // operacji. UI pokaże przycisk „Odśwież”, gdy nowy worker czeka.
  event.waitUntil(cacheCoreBestEffort());
});

self.addEventListener("message",event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate",event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("menelwars-tools-") && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request,{cache:"no-store"});
    if (response && response.ok) {
      await cache.put(request,response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request,{ignoreSearch:false});
    if (cached) return cached;

    if (request.mode === "navigate") {
      const index =
        await caches.match("./index.html") ||
        await caches.match("./");
      if (index) return index;
    }

    throw error;
  }
}

self.addEventListener("fetch",event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});
