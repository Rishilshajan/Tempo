// Tempo Service Worker
// Handles:
// - PWA installation
// - Web Push notifications
// - Notification click handling
// - Lightweight caching for static assets
//
// IMPORTANT:
// Next.js App Router / RSC requests are intentionally NOT intercepted.
// This prevents streamed RSC responses from causing "Error in input stream".

const CACHE = "tempo-v2";

// -----------------------------------------------------------------------------
// Install
// -----------------------------------------------------------------------------

self.addEventListener("install", () => {
  // Activate this worker immediately.
  self.skipWaiting();
});

// -----------------------------------------------------------------------------
// Activate
// -----------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches belonging to older Service Worker versions.
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key)),
      );

      // Take control of existing pages immediately.
      await self.clients.claim();
    })(),
  );
});

// -----------------------------------------------------------------------------
// Web Push
// -----------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Tempo",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Tempo";

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [100, 50, 100],

    data: {
      url: data.url || "/today",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

// -----------------------------------------------------------------------------
// Notification Click
// -----------------------------------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    (event.notification.data && event.notification.data.url) ||
    "/today";

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Focus an existing Tempo window if one exists.
      const existing = clientsArr.find(
        (client) => "focus" in client,
      );

      if (existing) {
        await existing.focus();

        if ("navigate" in existing) {
          await existing.navigate(url);
        }
      } else {
        // Otherwise open Tempo in a new window.
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// -----------------------------------------------------------------------------
// Runtime Cache
// -----------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  const url = new URL(request.url);

  // ---------------------------------------------------------------------------
  // Only handle GET requests from Tempo's own origin.
  // ---------------------------------------------------------------------------

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // ---------------------------------------------------------------------------
  // IMPORTANT:
  //
  // Do NOT intercept Next.js App Router / React Server Component requests.
  //
  // Next.js uses streamed RSC responses such as:
  //
  // /today?_rsc=...
  //
  // Trying to cache/intercept these responses can cause:
  //
  // "Error in input stream"
  //
  // ---------------------------------------------------------------------------

  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Router-Prefetch") ||
    request.headers.has("Next-Url")
  ) {
    return;
  }

  // ---------------------------------------------------------------------------
  // Never intercept API requests.
  //
  // API responses can contain dynamic/server-side data and should always
  // communicate directly with the server.
  // ---------------------------------------------------------------------------

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // ---------------------------------------------------------------------------
  // Only cache static assets.
  //
  // We intentionally do NOT cache:
  // - HTML documents
  // - Next.js RSC responses
  // - API responses
  // - dynamic application data
  // ---------------------------------------------------------------------------

  const cacheableDestinations = new Set([
    "script",
    "style",
    "image",
    "font",
    "manifest",
  ]);

  if (!cacheableDestinations.has(request.destination)) {
    return;
  }

  // ---------------------------------------------------------------------------
  // Network-first strategy for static assets.
  // ---------------------------------------------------------------------------

  event.respondWith(
    (async () => {
      try {
        // Always try the network first.
        const fresh = await fetch(request);

        if (fresh.ok) {
          const cache = await caches.open(CACHE);

          // Cache a clone of the response.
          //
          // Use waitUntil so the cache operation can continue without
          // interfering with the response stream returned to the browser.
          event.waitUntil(
            cache.put(request, fresh.clone()).catch(() => {
              // Ignore cache failures.
            }),
          );
        }

        return fresh;
      } catch {
        // Network failed.
        // Try to serve a previously cached static asset.
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        // Nothing available in cache.
        throw new Error("Offline and no cached response");
      }
    })(),
  );
});