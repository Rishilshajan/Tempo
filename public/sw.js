// Tempo service worker.
// Minimal shell: satisfies PWA installability (needs a fetch handler) and gives
// a lightweight runtime cache for static assets. Full offline support and web
// push are layered in with the Phase 4 alert engine.

const CACHE = "tempo-v1";

self.addEventListener("install", () => {
  // Activate this worker immediately on first install.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// ---- Web Push -------------------------------------------------------------

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tempo", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Tempo";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/today" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if we have one, otherwise open a new one.
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// ---- Runtime cache --------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GETs on our own origin; let everything else hit the network.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Network-first so the app never serves stale pages or data, with a cached
  // fallback when the device is offline.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        // Cache successful static asset responses for offline reuse.
        if (fresh.ok && request.destination && request.destination !== "document") {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Offline and no cached response");
      }
    })(),
  );
});
