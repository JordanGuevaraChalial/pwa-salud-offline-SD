/* ============================================================
   SERVICE WORKER - Salud Offline Santo Domingo
   Estrategias de cache:
   1. Cache First (Stale-While-Revalidate) - archivos estaticos
   2. Stale-While-Revalidate - tiles de mapas (OpenStreetMap)
   3. Network First - datos dinamicos (actualizaciones)
   ============================================================ */

// Nombres de las caches (versionar para forzar actualizacion)
const CACHE_ESTATICO = 'salud-offline-estatico-v1';
const CACHE_MAPAS = 'salud-offline-mapas-v1';
const CACHE_DINAMICO = 'salud-offline-dinamico-v1';

// Archivos esenciales para precache (se descargan en la instalacion)
const ARCHIVOS_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/map.css',
  './css/responsive.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/sintomas.js',
  './js/consejos.js',
  './js/map.js',
  './data/centros_medicos.json',
  './data/sintomas.json',
  './data/consejos.json',
  './assets/icons/icon-72x72.png',
  './assets/icons/icon-96x96.png',
  './assets/icons/icon-128x128.png',
  './assets/icons/icon-144x144.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  // Leaflet (CDN - se almacena localmente para offline)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Limite de tiles de mapa en cache (para no exceder los 50MB)
const MAX_TILES_CACHE = 500;

/* ------------------------------------------------------------
   EVENTO INSTALL: Precaché de archivos esenciales
   ------------------------------------------------------------ */
self.addEventListener('install', function(event) {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_ESTATICO)
      .then(function(cache) {
        console.log('[SW] Precaché de archivos esenciales');
        return cache.addAll(ARCHIVOS_PRECACHE);
      })
      .then(function() {
        console.log('[SW] Precaché completado');
        return self.skipWaiting(); // Activar inmediatamente sin esperar
      })
      .catch(function(error) {
        console.error('[SW] Error en precaché:', error);
      })
  );
});

/* ------------------------------------------------------------
   EVENTO ACTIVATE: Limpiar cachés antiguas
   ------------------------------------------------------------ */
self.addEventListener('activate', function(event) {
  console.log('[SW] Activando Service Worker...');
  const cachesPermitidas = [CACHE_ESTATICO, CACHE_MAPAS, CACHE_DINAMICO];

  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(key) {
            return cachesPermitidas.indexOf(key) === -1;
          }).map(function(key) {
            console.log('[SW] Eliminando cache antigua:', key);
            return caches.delete(key);
          })
        );
      })
      .then(function() {
        console.log('[SW] Cachés limpiadas. Tomando control...');
        return self.clients.claim(); // Tomar control de todas las pestañas
      })
  );
});

/* ------------------------------------------------------------
   EVENTO FETCH: Interceptar todas las solicitudes de red
   ------------------------------------------------------------ */
self.addEventListener('fetch', function(event) {
  const solicitud = event.request;

  // Solo manejar solicitudes GET
  if (solicitud.method !== 'GET') return;

  const url = new URL(solicitud.url);

  // ESTRATEGIA 2: Stale-While-Revalidate para tiles de OpenStreetMap
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tile.opencyclemap.org') ||
      url.hostname.includes('cartocdn.com')) {
    event.respondWith(
      caches.open(CACHE_MAPAS).then(function(cache) {
        return cache.match(solicitud).then(function(respuestaCache) {
          // Actualizar en segundo plano
          const actualizacion = fetch(solicitud)
            .then(function(respuestaRed) {
              if (respuestaRed && respuestaRed.status === 200) {
                // Limitar tamano de cache de tiles
                cache.keys().then(function(keys) {
                  if (keys.length > MAX_TILES_CACHE) {
                    cache.delete(keys[0]); // Eliminar el mas antiguo
                  }
                });
                cache.put(solicitud, respuestaRed.clone());
              }
              return respuestaRed;
            })
            .catch(function() {
              return respuestaCache; // Sin conexion, devolver cache
            });

          // Devolver inmediatamente lo que hay en cache (o la red si no hay)
          return respuestaCache || actualizacion;
        });
      })
    );
    return;
  }

  // ESTRATEGIA 1: Cache First + SWR para archivos estaticos de nuestra app
  // (HTML, CSS, JS, JSON de datos, Leaflet CDN, iconos)
  if (url.origin === location.origin ||
      solicitud.url.includes('leaflet') ||
      solicitud.url.includes('unpkg.com')) {
    event.respondWith(
      caches.match(solicitud)
        .then(function(respuestaCache) {
          if (respuestaCache) {
            // Actualizar en segundo plano (Stale-While-Revalidate)
            event.waitUntil(
              fetch(solicitud)
                .then(function(respuestaRed) {
                  if (respuestaRed && respuestaRed.status === 200) {
                    const respuestaClon = respuestaRed.clone();
                    caches.open(CACHE_ESTATICO)
                      .then(function(cache) {
                        cache.put(solicitud, respuestaClon);
                      });
                  }
                  return respuestaRed;
                })
                .catch(function() {
                  // Sin conexion, no hacer nada (ya devolvimos cache)
                })
            );
            return respuestaCache;
          }

          // No esta en cache: intentar de la red y guardar
          return fetch(solicitud)
            .then(function(respuestaRed) {
              if (!respuestaRed || respuestaRed.status !== 200) {
                return respuestaRed;
              }
              const respuestaClon = respuestaRed.clone();
              caches.open(CACHE_ESTATICO)
                .then(function(cache) {
                  cache.put(solicitud, respuestaClon);
                });
              return respuestaRed;
            })
            .catch(function() {
              // Fallback: si es una navegacion y no hay cache, mostrar index.html
              if (solicitud.mode === 'navigate') {
                return caches.match('./index.html');
              }
              return new Response('Contenido no disponible sin conexion', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
    return;
  }

  // ESTRATEGIA 3: Network First para otras solicitudes (fuera de nuestro dominio)
  event.respondWith(
    fetch(solicitud)
      .then(function(respuestaRed) {
        const respuestaClon = respuestaRed.clone();
        caches.open(CACHE_DINAMICO)
          .then(function(cache) {
            cache.put(solicitud, respuestaClon);
          });
        return respuestaRed;
      })
      .catch(function() {
        return caches.match(solicitud);
      })
  );
});

/* ------------------------------------------------------------
   EVENTO MESSAGE: Comunicacion con la aplicacion
   (para forzar actualizacion de datos desde la UI)
   ------------------------------------------------------------ */
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.action === 'clearCache') {
    caches.delete(CACHE_ESTATICO).then(function() {
      caches.delete(CACHE_MAPAS).then(function() {
        caches.delete(CACHE_DINAMICO);
      });
    });
  }
});

/* ------------------------------------------------------------
   EVENTO PUSH (opcional para futuras notificaciones)
   ------------------------------------------------------------ */
self.addEventListener('push', function(event) {
  // Reservado para futuras notificaciones push (ej: actualizacion de datos)
  console.log('[SW] Push recibido:', event);
});
