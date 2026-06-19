const CACHE_NAME = "taskeasy-cache-v1";

const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Archivos cacheados correctamente.");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            // Se eliminan las cachés antiguas.
            if (cache !== CACHE_NAME) {
              console.log(
                `[Service Worker] Eliminando caché obsoleta: ${cache}`,
              );
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => {
        // Tomar el control de las pestañas abiertas.
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Se devuelve desde la caché.
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone(); //  Se clona la respuesta para cachearla.

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache); // Se guarda en cache.
          });

          return networkResponse;
        })
        .catch((error) => {
          console.error(
            "[Service Worker] Error al obtener recurso de la red:",
            error,
          );
        });
    }),
  );
});
