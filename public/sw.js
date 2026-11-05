// Krpex service worker: only shows /offline.html when a page can't load because the device is offline.
// It caches nothing else, so it never serves stale pages, data or uploads.
const CACHE = "krpex-offline-v1"
const OFFLINE = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.mode !== "navigate" || req.method !== "GET") return
  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) || (await fetch(req))
      } catch {
        return (await caches.match(OFFLINE)) || Response.error()
      }
    })(),
  )
})
