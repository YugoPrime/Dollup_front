/* Doll Up Boutique service worker.
 *
 * Two jobs only:
 *  1. Make the store installable. Chrome on Android only shows its automatic
 *     "Install app" prompt when a service worker with a fetch handler controls
 *     the page.
 *  2. When a page navigation fails (no signal), show /offline.html instead of
 *     Chrome's dino page.
 *
 * It caches nothing else on purpose: prices, stock and the bag must always
 * come from the network. Every non-navigation request passes straight through.
 *
 * Kill switch: if this worker ever misbehaves, replace this file with one that
 * calls self.registration.unregister() in "activate" and redeploy. sw.js is
 * served no-store (next.config.ts), so phones pick the change up on their next
 * visit.
 */

const CACHE = "dub-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("dub-") && k !== CACHE).map((k) => caches.delete(k)),
      );
      // Lets the page request start while the worker boots, so routing
      // navigations through it costs no extra latency.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(req);
      } catch (err) {
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
        throw err;
      }
    })(),
  );
});
