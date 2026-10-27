/* ============================================================
   MODULO DE MAPAS - Leaflet + OpenStreetMap
   Muestra centros medicos, geolocalizacion del usuario,
   filtros y trazado de rutas. Funciona offline con tiles en cache.
   ============================================================ */

const Mapa = (function() {
  let mapa = null;
  let capaMarcadores = null;
  let marcadorUbicacion = null;
  let lineaRuta = null;
  const CENTRO_SANTO_DOMINGO = [-0.25, -79.17]; // Aproximado

  // Inicializar mapa solo una vez
  function inicializarSiNoExiste() {
    if (mapa) {
      // Si ya existe, invalidar tamaño para que se renderice bien
      setTimeout(() => mapa.invalidateSize(), 100);
      return;
    }
    inicializar();
  }

  // Inicializar el mapa
  function inicializar() {
    try {
      mapa = L.map('mapa', {
        center: CENTRO_SANTO_DOMINGO,
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
        maxBounds: [[-0.5, -79.5], [0.0, -78.8]], // Limitar a la zona
        maxBoundsViscosity: 1.0
      });

      // Capa de mapas base de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 10
      }).addTo(mapa);

      // Crear capa de marcadores
      capaMarcadores = L.layerGroup().addTo(mapa);

      // Cargar marcadores de centros medicos
      cargarMarcadores();

      // Invalidar tamaño después de renderizar
      setTimeout(() => mapa.invalidateSize(), 200);

      console.log('[Mapa] Mapa inicializado correctamente');
    } catch (error) {
      console.error('[Mapa] Error al inicializar:', error);
      UI.mostrarToast('Error al cargar el mapa. Verifica tu conexion.');
    }
  }

  // Cargar marcadores de todos los centros medicos
  async function cargarMarcadores() {
    try {
      const centros = await DB.obtenerTodosCentros();
      mostrarCentrosEnMapa(centros);
    } catch (error) {
      console.error('[Mapa] Error al cargar marcadores:', error);
    }
  }

  // Mostrar una lista especifica de centros en el mapa
  function mostrarCentrosFiltrados(centros) {
    mostrarCentrosEnMapa(centros);
  }

  // Mostrar centros en el mapa
  function mostrarCentrosEnMapa(centros) {
    if (!capaMarcadores) return;

    capaMarcadores.clearLayers();

    if (!centros || centros.length === 0) {
      UI.mostrarToast('No hay centros medicos para mostrar');
      return;
    }

    const bounds = [];

    centros.forEach(centro => {
      if (centro.ubicacion && centro.ubicacion.latitud && centro.ubicacion.longitud) {
        const icono = crearIconoMarcador(centro.tipoCentro, centro.institucion);

        const marcador = L.marker(
          [centro.ubicacion.latitud, centro.ubicacion.longitud],
          { icon: icono, title: centro.nombreCorto || centro.nombreOficial }
        );

        // Popup al tocar el marcador
        marcador.bindPopup(`
          <div class="popup-centro">
            <strong>${centro.nombreCorto || centro.nombreOficial}</strong>
            <small>${centro.tipoCentro || ''} - ${centro.institucion || ''}</small>
            <small>${centro.direccion || ''}</small>
            <button class="btn-popup" onclick="UI.mostrarFichaCentro('${centro.id}')">
              Ver ficha completa
            </button>
          </div>
        `, { maxWidth: 250 });

        marcador.addTo(capaMarcadores);
        bounds.push([centro.ubicacion.latitud, centro.ubicacion.longitud]);
      }
    });

    // Ajustar vista para mostrar todos los marcadores
    if (bounds.length > 1) {
      mapa.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      mapa.setView(bounds[0], 15);
    }
  }

  // Crear icono personalizado segun tipo de centro
  function crearIconoMarcador(tipoCentro, institucion) {
    let claseCSS = 'marcador-otro';

    if (institucion === 'IESS') {
      claseCSS = 'marcador-iess';
    } else if (tipoCentro && tipoCentro.toLowerCase().includes('hospital')) {
      claseCSS = 'marcador-hospital';
    } else if (tipoCentro && tipoCentro.toLowerCase().includes('centro de salud')) {
      claseCSS = 'marcador-centro-salud';
    } else if (tipoCentro && (tipoCentro.toLowerCase().includes('clinica') || tipoCentro.toLowerCase().includes('consultorio'))) {
      claseCSS = 'marcador-clinica';
    }

    return L.divIcon({
      className: 'icono-centro-medico',
      html: `<div class="marcador-pin ${claseCSS}"><span>🏥</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  // Obtener ubicacion actual del usuario (GPS, funciona sin internet)
  function obtenerMiUbicacion() {
    if (!navigator.geolocation) {
      UI.mostrarToast('Tu dispositivo no soporta geolocalizacion');
      return;
    }

    UI.mostrarToast('📍 Obteniendo tu ubicacion...');

    navigator.geolocation.getCurrentPosition(
      function(posicion) {
        const lat = posicion.coords.latitude;
        const lon = posicion.coords.longitude;
        const precision = posicion.coords.accuracy;

        // Eliminar marcador anterior
        if (marcadorUbicacion) {
          mapa.removeLayer(marcadorUbicacion);
        }

        // Crear marcador de ubicacion del usuario
        marcadorUbicacion = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'icono-ubicacion-usuario',
            html: '<div class="marcador-usuario"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapa);

        // Agregar circulo de precision
        L.circle([lat, lon], {
          radius: precision,
          color: '#43A047',
          fillColor: '#43A047',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(mapa);

        // Centrar mapa en la ubicacion del usuario
        mapa.setView([lat, lon], 15);

        UI.mostrarToast(`✅ Ubicacion obtenida (precision: ${Math.round(precision)}m)`);
        console.log('[Mapa] Ubicacion:', lat, lon, 'Precision:', precision);
      },
      function(error) {
        console.error('[Mapa] Error de geolocalizacion:', error);
        let mensaje = 'No se pudo obtener tu ubicacion.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensaje = 'Permiso de ubicacion denegado. Activalo en ajustes.';
            break;
          case error.POSITION_UNAVAILABLE:
            mensaje = 'Ubicacion no disponible. Activa el GPS.';
            break;
          case error.TIMEOUT:
            mensaje = 'Tiempo de espera agotado. Intenta de nuevo.';
            break;
        }
        UI.mostrarToast('⚠️ ' + mensaje);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // Aplicar filtros desde el panel de filtros
  async function aplicarFiltros() {
    try {
      let centros = await DB.obtenerTodosCentros();

      // Filtro por tipo (checkboxes)
      const tiposSeleccionados = [];
      document.querySelectorAll('#filtro-tipo input[type="checkbox"]:checked').forEach(cb => {
        tiposSeleccionados.push(cb.value);
      });

      if (tiposSeleccionados.length > 0) {
        centros = centros.filter(c => tiposSeleccionados.includes(c.tipoCentro));
      }

      // Filtro por institucion
      const institucion = document.getElementById('filtro-institucion').value;
      if (institucion) {
        centros = centros.filter(c => c.institucion === institucion);
      }

      // Filtro por texto de busqueda
      const textoBusqueda = document.getElementById('busqueda-mapa').value;
      if (textoBusqueda) {
        const termino = textoBusqueda.toLowerCase();
        centros = centros.filter(c =>
          (c.nombreOficial && c.nombreOficial.toLowerCase().includes(termino)) ||
          (c.nombreCorto && c.nombreCorto.toLowerCase().includes(termino)) ||
          (c.direccion && c.direccion.toLowerCase().includes(termino))
        );
      }

      mostrarCentrosEnMapa(centros);
      UI.cerrarFiltros();
      UI.mostrarToast(centros.length + ' centros encontrados');

    } catch (error) {
      console.error('[Mapa] Error al aplicar filtros:', error);
    }
  }

  // Trazar ruta desde ubicacion del usuario hasta un destino
  function trazarRuta(latDestino, lonDestino) {
    if (!marcadorUbicacion) {
      UI.mostrarToast('📍 Primero obtén tu ubicacion (boton 📍)');
      return;
    }

    const latOrigen = marcadorUbicacion.getLatLng().lat;
    const lonOrigen = marcadorUbicacion.getLatLng().lng;

    // Eliminar ruta anterior
    if (lineaRuta) {
      mapa.removeLayer(lineaRuta);
    }

    // Dibujar linea punteada (ruta aproximada)
    lineaRuta = L.polyline(
      [[latOrigen, lonOrigen], [latDestino, lonDestino]],
      { color: '#1E88E5', weight: 5, opacity: 0.8, dashArray: '10, 10', className: 'ruta-linea' }
    ).addTo(mapa);

    // Ajustar vista para mostrar origen y destino
    mapa.fitBounds([[latOrigen, lonOrigen], [latDestino, lonDestino]], { padding: [60, 60] });

    // Calcular distancia (formula Haversine)
    const distancia = calcularDistancia(latOrigen, lonOrigen, latDestino, lonDestino);
    UI.mostrarToast(`🚶 Distancia aproximada: ${distancia.toFixed(2)} km. Sigue la linea punteada.`);
  }

  // Formula Haversine para calcular distancia entre dos puntos
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Configurar eventos de busqueda en el mapa
  function configurarEventos() {
    const inputBusqueda = document.getElementById('busqueda-mapa');
    if (inputBusqueda) {
      let timeout;
      inputBusqueda.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          const texto = inputBusqueda.value;
          const centros = await DB.buscarCentrosPorTexto(texto);
          mostrarCentrosEnMapa(centros);
        }, 400);
      });
    }
  }

  // API publica
  return {
    inicializar: inicializar,
    inicializarSiNoExiste: inicializarSiNoExiste,
    cargarMarcadores: cargarMarcadores,
    mostrarCentrosFiltrados: mostrarCentrosFiltrados,
    obtenerMiUbicacion: obtenerMiUbicacion,
    aplicarFiltros: aplicarFiltros,
    trazarRuta: trazarRuta,
    configurarEventos: configurarEventos
  };
})();
