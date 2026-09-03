"use strict";

const CACHE = "menelwars-tools-v21.99";
// Jednorazowa naprawa bardzo starych instalacji PWA, które nie pokazały
// banera aktualizacji i nadal serwują app.js v21.58.
const FORCE_LEGACY_RECOVERY = false;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=21.99",
  "./data.js?v=21.05",
  "./app.js?v=21.99",
  "./item-catalog.js?v=21.99",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./mapa-warszawa.png",
  "./onion-growth-atlas.png?v=21.09",
  "./potato-growth-atlas-v4.png?v=21.60",
  "./assets/achievements/overall-bronze.png",
  "./assets/achievements/overall-silver.png",
  "./assets/achievements/overall-gold.png",
  "./assets/achievements/overall-platinum.png",
  "./assets/achievements/distillery-medal.png",
  "./assets/achievements/garden-medal.png",
  "./assets/achievements/pvp-medal.png",
  "./assets/achievements/map-medal.png",
  "./assets/achievements/gang-medal.png",
  "./assets/achievements/easter-egg-medal.png",
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
  event.waitUntil((async () => {
    await cacheCoreBestEffort();
    // Tylko ten release naprawczy omija oczekiwanie. Kolejne aktualizacje
    // pozostaną ręczne, przez banner „Odśwież”.
    if (FORCE_LEGACY_RECOVERY) await self.skipWaiting();
  })());
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
    if (FORCE_LEGACY_RECOVERY) {
      const clients = await self.clients.matchAll({type:"window",includeUncontrolled:true});
      await Promise.allSettled(clients.map(client => client.navigate(client.url)));
    }
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

async function cacheFirst(request) {
  const cached = await caches.match(request,{ignoreSearch:false});
  if (cached) return cached;

  const response = await fetch(request,{cache:"no-store"});
  if (response && response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener("fetch",event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Dokument zawsze sprawdzamy w sieci, żeby szybko wykryć nowe numery
  // wersji. Pliki statyczne mają numer wersji w URL, więc mogą startować
  // natychmiast z cache bez oczekiwania na GitHub Pages.
  event.respondWith(
    request.mode === "navigate"
      ? networkFirst(request)
      : cacheFirst(request)
  );
});
