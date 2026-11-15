const CACHE_PREFIX = "one-more-glow-diagnostics-";
const BUILD_VERSION = "__BUILD_VERSION__";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}`;
const SHELL_FILES = [
  "",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    await cache.addAll(SHELL_FILES.map((path) => new URL(path, self.registration.scope).href));
    const index = await cache.match(new URL("index.html", self.registration.scope));
    if (!index) throw new Error("The app shell could not be cached.");
    const html = await index.text();
    const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^\"]*)?)"/g)]
      .map((match) => new URL(match[1], self.registration.scope).href);
    if (assetUrls.length) await cache.addAll(assetUrls);
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin
      || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached ?? (await caches.match(new URL("index.html", self.registration.scope)))
        ?? Response.error();
    }));
    return;
  }

  event.respondWith(fetch(request).then((response) => {
    if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  }).catch(async () => (await caches.match(request)) ?? Response.error()));
});
