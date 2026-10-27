// geofencing.js - Módulo de alertas de proximidad (geofencing) - VERSIÓN CORREGIDA
const Geofencing = (function() {
  let watchId = null;
  let centrosCercanosNotificados = new Set(); // Evitar notificar repetidamente
  const RADIO_ALERTA = 500; // metros - notificar si está a menos de 500m

  // Fórmula Haversine: calcula distancia en km entre dos coordenadas
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // retorna en km
  }

  // Iniciar monitoreo de proximidad
  function iniciarMonitoreo() {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalizacion');
      return;
    }
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones');
      return;
    }

    // Pedir permiso de notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permiso => {
        if (permiso === 'granted') comenzarMonitoreo();
        else alert('Necesitas permitir notificaciones para esta funcion');
      });
    } else if (Notification.permission === 'granted') {
      comenzarMonitoreo();
    } else {
      alert('Permiso de notificaciones denegado. Activalo en ajustes del navegador.');
    }
  }

  function comenzarMonitoreo() {
    if (watchId !== null) {
      alert('El monitoreo ya esta activo');
      return;
    }

    // Monitorear ubicación continuamente (GPS, funciona sin internet)
    watchId = navigator.geolocation.watchPosition(
      async (posicion) => {
        const latUser = posicion.coords.latitude;
        const lonUser = posicion.coords.longitude;

        try {
          // Obtener centros desde IndexedDB (offline)
          const centros = await DB.obtenerTodosCentros();

          centros.forEach(centro => {
            if (!centro.ubicacion) return; // saltar si no tiene coordenadas
            const distKm = calcularDistancia(latUser, lonUser,
                              centro.ubicacion.latitud, centro.ubicacion.longitud);
            const distMetros = distKm * 1000;

            // Si está dentro del radio y NO notificado antes → notificar
            if (distMetros < RADIO_ALERTA && !centrosCercanosNotificados.has(centro.id)) {
              centrosCercanosNotificados.add(centro.id);
              new Notification('Centro medico cercano', {
                body: 'Estas a ' + Math.round(distMetros) + 'm de ' + (centro.nombreCorto || centro.nombreOficial) + '. Toca para abrir la app.',
                icon: 'assets/icons/icon-192x192.png',
                tag: 'centro-' + centro.id,
                vibrate: [200, 100, 200] // vibración en móviles Android
              });
            }

            // Si se aleja más de 1.5× el radio, resetear para notificar de nuevo
            if (distMetros > RADIO_ALERTA * 1.5) {
              centrosCercanosNotificados.delete(centro.id);
            }
          });
        } catch (e) {
          console.error('[Geofencing] Error al obtener centros:', e);
        }
      },
      (error) => console.log('[Geofencing] Error:', error.code, error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    alert('Alertas de proximidad activadas. Recibiras notificaciones cuando estes cerca de un centro medico.');
  }

  function detenerMonitoreo() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      alert('Alertas de proximidad desactivadas.');
    } else {
      alert('El monitoreo no esta activo.');
    }
  }

  return { iniciarMonitoreo, detenerMonitoreo };
})();