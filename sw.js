// Bewaart de app op de telefoon, zodat hij ook zonder internet opent.
const CACHE = "lampen-v10";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
// Langer wachten op het netwerk vertraagt het openen (en dus het verbinden met de lampen).
const NETWORK_WAIT_MS = 1500;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Eerst het netwerk, zodat updates doorkomen. Duurt dat te lang of is er geen
// internet, dan de bewaarde versie; het netwerk werkt de bewaarde versie dan nog bij.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const network = fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  const cached = () => caches.match(event.request, { ignoreSearch: true });
  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(cached);
  event.respondWith(
    Promise.race([network, slow.then((hit) => hit || network)])
      .catch(() => cached().then((hit) => hit || Response.error()))
  );
});
