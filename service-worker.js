/**
 * ============================================================================
 * SERVICE WORKER - TASKEASY PWA
 * ============================================================================
 * El Service Worker es un script que el navegador corre en segundo plano,
 * separado de la página web. Permite interceptar peticiones de red, manejar
 * la caché para soporte offline y recibir notificaciones push.
 */

// 1. Nombre de la caché y versión. Cambiar el número de versión (v1 -> v2)
// obligará al navegador a actualizar la caché de los usuarios.
const CACHE_NAME = 'taskeasy-cache-v1';

// 2. Lista de recursos esenciales que se deben almacenar en caché inmediatamente
// durante la fase de instalación del Service Worker (Pre-caching).
const ASSETS_TO_CACHE = [
  './',                  // Ruta raíz
  'index.html',          // Estructura HTML
  'styles.css',          // Estilos y transiciones
  'app.js',              // Lógica de la aplicación
  'manifest.json',       // Metadatos de la PWA
  'icons/icon-192.png',  // Icono para launcher
  'icons/icon-512.png'   // Icono para pantalla de carga
];

/**
 * EVENTO: INSTALL (Instalación)
 * Se dispara cuando el Service Worker se registra por primera vez.
 * Aquí abrimos la caché y guardamos todos los recursos de la lista ASSETS_TO_CACHE.
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Evento Install: Guardando archivos en caché.');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Archivos cacheados correctamente.');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Forzamos al Service Worker recién instalado a que se convierta en el SW activo.
        return self.skipWaiting();
      })
  );
});

/**
 * EVENTO: ACTIVATE (Activación)
 * Se dispara una vez que el Service Worker viejo se descarta y el nuevo toma el control.
 * Aquí limpiamos las cachés antiguas para liberar almacenamiento en el dispositivo.
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Evento Activate: Limpiando cachés antiguas.');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Si el nombre de la caché en el navegador no coincide con la versión actual, la eliminamos.
          if (cache !== CACHE_NAME) {
            console.log(`[Service Worker] Eliminando caché obsoleta: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Reclamamos el control de las pestañas abiertas inmediatamente.
      return self.clients.claim();
    })
  );
});

/**
 * EVENTO: FETCH (Interceptación de Peticiones)
 * Se dispara cada vez que la aplicación realiza una solicitud HTTP (cargar scripts,
 * imágenes, CSS, o peticiones de red).
 * 
 * Estrategia aplicada: Cache-First (Caché Primero).
 * - Busca el recurso en la caché.
 * - Si existe en la caché (incluso estando offline), lo devuelve instantáneamente.
 * - Si no está en la caché, intenta buscarlo en la red.
 */
self.addEventListener('fetch', (event) => {
  // Evitamos interceptar peticiones de extensiones del navegador (por ejemplo chrome-extension://)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 1. Si el archivo está en la caché, lo servimos de inmediato.
        if (cachedResponse) {
          // console.log(`[Service Worker] Sirviendo desde Caché: ${event.request.url}`);
          return cachedResponse;
        }

        // 2. Si no está en caché, lo solicitamos a la red.
        return fetch(event.request).then((networkResponse) => {
          // Si la respuesta no es válida, la devolvemos sin más.
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonamos la respuesta porque es un stream que solo se puede consumir una vez.
          const responseToCache = networkResponse.clone();

          // Guardamos dinámicamente el recurso recién descargado en la caché para el futuro.
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((error) => {
          console.error('[Service Worker] Error al obtener recurso de la red:', error);
          // Aquí se podría retornar un archivo de fallback offline si fuera necesario (ej. offline.html).
        });
      })
  );
});
