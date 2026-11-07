// Krpex service worker: shows /offline.html when a page can't load because the device is offline, and shows
// push notifications (9.4). It caches nothing else, so it never serves stale pages, data or uploads.
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

// 9.4: show a push notification (the server sends title, body, url, tag; see lib/push/send-pushes.ts).
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "Krpex", body: event.data ? event.data.text() : "" }
  }
  const url = typeof data.url === "string" && /^\/[A-Za-z0-9]/.test(data.url) ? data.url : "/notifications"
  event.waitUntil(
    self.registration.showNotification(data.title || "Krpex", {
      body: data.body || "",
      tag: data.tag,
      icon: "/apple-icon",
      badge: "/apple-icon",
      data: { url },
    }),
  )
})

// Open the link in an existing Krpex tab if there is one, otherwise in a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const tab of tabs) {
        if (new URL(tab.url).origin === self.location.origin && "focus" in tab) {
          await tab.focus()
          if ("navigate" in tab) await tab.navigate(url).catch(() => {})
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
