/* ============================================================
   MODULO DE INTERFAZ DE USUARIO (UI)
   Gestiona navegacion entre pantallas, estado de conexion,
   filtros, modales y notificaciones toast.
   ============================================================ */

const UI = (function() {
  let pantallaActual = 'inicio';

  // Inicializar modulo UI
  function init() {
    // Detectar estado de conexion
    actualizarEstadoConexion();
    window.addEventListener('online', actualizarEstadoConexion);
    window.addEventListener('offline', actualizarEstadoConexion);

    // Manejar hash en URL (para shortcuts del manifest)
    if (window.location.hash) {
      const hashPantalla = window.location.hash.replace('#', '');
      if (document.getElementById('pantalla-' + hashPantalla)) {
        mostrarPantalla(hashPantalla);
      }
    }
  }

  // Actualizar indicador de conexion
  function actualizarEstadoConexion() {
    const indicador = document.getElementById('indicador-conexion');
    const texto = document.getElementById('texto-conexion');

    if (navigator.onLine) {
      indicador.className = 'indicador online';
      texto.textContent = 'En linea';
    } else {
      indicador.className = 'indicador offline';
      texto.textContent = 'Modo offline ✓';
      mostrarToast('📴 Funcionando sin internet');
    }
  }

  // Mostrar una pantalla especifica
  function mostrarPantalla(nombrePantalla) {
    // Ocultar todas las pantallas
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(p => {
      p.hidden = true;
      p.classList.remove('activa');
    });

    // Mostrar la pantalla seleccionada
    const pantallaObjetivo = document.getElementById('pantalla-' + nombrePantalla);
    if (pantallaObjetivo) {
      pantallaObjetivo.hidden = false;
      pantallaObjetivo.classList.add('activa');
      pantallaActual = nombrePantalla;

      // Actualizar navegacion inferior
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('activo');
        if (item.dataset.pantalla === nombrePantalla) {
          item.classList.add('activo');
        }
      });

      // Scroll al top
      window.scrollTo(0, 0);

      // Inicializar contenido especifico segun pantalla
      if (nombrePantalla === 'mapa') {
        setTimeout(() => Mapa.inicializarSiNoExiste(), 100);
      } else if (nombrePantalla === 'consejos') {
        Consejos.cargarLista();
      } else if (nombrePantalla === 'sintomas') {
        Sintomas.inicializar();
      } else if (nombrePantalla === 'configuracion') {
        actualizarInfoConfiguracion();
      }
    }
  }

  // Mostrar panel de filtros
  function mostrarFiltros() {
    const panel = document.getElementById('panel-filtros');
    panel.hidden = !panel.hidden;
  }

  // Cerrar panel de filtros
  function cerrarFiltros() {
    document.getElementById('panel-filtros').hidden = true;
  }

  // Mostrar ficha de centro medico
  async function mostrarFichaCentro(idCentro) {
    const centro = await DB.obtenerCentroPorId(idCentro);
    if (!centro) {
      mostrarToast('Centro medico no encontrado');
      return;
    }

    document.getElementById('ficha-nombre-corto').textContent = centro.nombreCorto || centro.nombreOficial;

    const contenido = document.getElementById('ficha-contenido');
    contenido.innerHTML = `
      <div class="ficha-seccion">
        <h4>🏥 Informacion General</h4>
        <div class="ficha-dato"><span class="etiqueta">Nombre oficial:</span><span class="valor">${centro.nombreOficial || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Tipo:</span><span class="valor">${centro.tipoCentro || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Institucion:</span><span class="valor">${centro.institucion || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Nivel de atencion:</span><span class="valor">${centro.nivelAtencion || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Parroquia:</span><span class="valor">${centro.parroquia || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Distrito de salud:</span><span class="valor">${centro.distritoSalud || 'N/A'}</span></div>
      </div>

      <div class="ficha-seccion">
        <h4>📍 Ubicacion y Contacto</h4>
        <div class="ficha-dato"><span class="etiqueta">Direccion:</span><span class="valor">${centro.direccion || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Telefono:</span><span class="valor">${centro.telefono || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Horario:</span><span class="valor">${centro.horarioAtencion || 'N/A'}</span></div>
        <div class="ficha-dato"><span class="etiqueta">Coordenadas:</span><span class="valor">${centro.ubicacion ? centro.ubicacion.latitud.toFixed(5) + ', ' + centro.ubicacion.longitud.toFixed(5) : 'N/A'}</span></div>
        ${centro.telefono ? `<button class="btn-principal btn-llamar" onclick="window.location.href='tel:${centro.telefono.replace(/[^0-9]/g, '')}'">📞 Llamar</button>` : ''}
        ${centro.ubicacion ? `<button class="btn-principal btn-ruta" onclick="Mapa.trazarRuta(${centro.ubicacion.latitud}, ${centro.ubicacion.longitud}); UI.mostrarPantalla('mapa')">🚶 Como llegar</button>` : ''}
      </div>

      <div class="ficha-seccion">
        <h4>🩺 Especialidades</h4>
        <div class="lista-especialidades">
          ${(centro.especialidades || []).map(e => `<span class="tag">${e}</span>`).join('') || '<p>No especificado</p>'}
        </div>
      </div>

      <div class="ficha-seccion">
        <h4>🛠️ Servicios</h4>
        <div class="lista-servicios">
          ${(centro.servicios || []).map(s => `<span class="tag servicio">${s}</span>`).join('') || '<p>No especificado</p>'}
        </div>
      </div>

      ${centro.observaciones ? `
      <div class="ficha-seccion">
        <h4>📝 Observaciones</h4>
        <p>${centro.observaciones}</p>
      </div>` : ''}
    `;

    mostrarPantalla('ficha-centro');
  }

  // Mostrar ficha de consejo natural
  async function mostrarFichaConsejo(idConsejo) {
    const consejo = await DB.obtenerConsejoPorId(idConsejo);
    if (!consejo) {
      mostrarToast('Consejo no encontrado');
      return;
    }

    const contenido = document.getElementById('ficha-consejo-contenido');
    contenido.innerHTML = `
      <div class="ficha-seccion">
        <span class="categoria-tag">${consejo.categoria}</span>
        <h4 style="margin-top: 12px; font-size: 20px;">${consejo.titulo}</h4>
        <p style="margin-top: 8px; line-height: 1.6;">${consejo.descripcion}</p>
      </div>

      <div class="ficha-seccion">
        <h4>🥗 Ingredientes</h4>
        <ul style="margin-left: 20px; line-height: 1.8;">
          ${(consejo.ingredientes || []).map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>

      <div class="ficha-seccion">
        <h4>👨‍🍳 Modo de preparacion</h4>
        <p style="line-height: 1.6;">${consejo.modoPreparacion}</p>
      </div>

      <div class="ficha-seccion" style="border-left: 4px solid #FB8C00; background: #FFF3E0;">
        <h4 style="color: #E65100;">⚠️ Precauciones</h4>
        <p style="line-height: 1.6; font-weight: 600;">${consejo.precauciones}</p>
        <p style="margin-top: 8px; font-size: 14px;"><strong>IMPORTANTE:</strong> Este consejo es complementario y NO sustituye la consulta medica profesional.</p>
      </div>
    `;

    mostrarPantalla('ficha-consejo');
  }

  // Mostrar modal de emergencia
  function mostrarModalEmergencia() {
    document.getElementById('modal-emergencia').hidden = false;
  }

  // Cerrar modal de emergencia
  function cerrarModalEmergencia() {
    document.getElementById('modal-emergencia').hidden = true;
  }

  // Mostrar notificacion toast
  function mostrarToast(mensaje, duracion) {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.hidden = false;
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
      toast.hidden = true;
    }, duracion || 3000);
  }

  // Actualizar informacion en pantalla de Configuracion
  async function actualizarInfoConfiguracion() {
    try {
      const almacenamiento = await DB.obtenerAlmacenamientoUsado();
      document.getElementById('almacenamiento-uso').textContent = almacenamiento;

      const centros = await DB.obtenerTodosCentros();
      document.getElementById('centros-cantidad').textContent = centros.length;
    } catch (e) {
      console.error('[UI] Error al actualizar configuracion:', e);
    }
  }

  // API publica
  return {
    init: init,
    mostrarPantalla: mostrarPantalla,
    mostrarFiltros: mostrarFiltros,
    cerrarFiltros: cerrarFiltros,
    mostrarFichaCentro: mostrarFichaCentro,
    mostrarFichaConsejo: mostrarFichaConsejo,
    mostrarModalEmergencia: mostrarModalEmergencia,
    cerrarModalEmergencia: cerrarModalEmergencia,
    mostrarToast: mostrarToast
  };
})();
