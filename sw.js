"use strict";

const CACHE = "menelwars-tools-v22.51";
// Jednorazowy most z wersji 22.45. Przy następnym wydaniu wraca na false,
// a o automacie decyduje już strona: samoczynnie tylko na ekranie głównym.
const FORCE_THIS_RELEASE = false;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=22.51",
  "./data.js?v=21.05",
  "./app.js?v=22.51",
  "./item-catalog.js?v=22.51",
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
    if (FORCE_THIS_RELEASE) await self.skipWaiting();
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

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{data={body:event.data?event.data.text():""};}
  event.waitUntil(self.registration.showNotification(data.title||"Ważne ogłoszenie",{
    body:data.body||"W aplikacji pojawiło się ważne ogłoszenie.",icon:"./icon-192.png",badge:"./icon-192.png",
    tag:data.announcementId?`announcement-${data.announcementId}`:"announcement",
    data:{url:data.url||"./?announcement=latest",announcementId:data.announcementId||""}
  }));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data&&event.notification.data.url||"./?announcement=latest",self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    if(windows.length){await windows[0].navigate(target);return windows[0].focus();}
    return self.clients.openWindow(target);
  })());
});
