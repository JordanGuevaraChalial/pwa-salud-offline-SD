/* ============================================================
   MODULO DE ASISTENCIA POR SINTOMAS
   Arbol de decision: navega por preguntas hasta llegar a una
   especialidad recomendada. Muestra centros medicos cercanos.
   ============================================================ */

const Sintomas = (function() {
  let arbol = null;
  let nodoActual = null;
  let historial = [];
  let inicializado = false;

  // Inicializar modulo (cargar arbol desde IndexedDB)
  async function inicializar() {
    if (inicializado && arbol) {
      return;
    }
    try {
      arbol = await DB.obtenerArbolSintomas();
      nodoActual = arbol.preguntaInicial;
      historial = [];
      inicializado = true;
      mostrarPreguntaActual();
    } catch (error) {
      console.error('[Sintomas] Error al inicializar:', error);
      document.getElementById('contenido-sintomas').innerHTML =
        '<p class="sin-resultados">Error al cargar el modulo de sintomas. Verifica que los datos esten cargados.</p>';
    }
  }

  // Mostrar la pregunta o resultado actual
  function mostrarPreguntaActual() {
    if (!arbol || !arbol.nodos[nodoActual]) {
      document.getElementById('contenido-sintomas').innerHTML =
        '<p class="sin-resultados">Nodo no encontrado en el arbol de decision.</p>';
      return;
    }

    const nodo = arbol.nodos[nodoActual];
    const contenedor = document.getElementById('contenido-sintomas');
    const numPregunta = historial.length + 1;

    // Actualizar contador y barra de progreso
    document.getElementById('num-pregunta').textContent = numPregunta;
    const progreso = Math.min((numPregunta / 6) * 100, 100);
    document.getElementById('progreso-fill').style.width = progreso + '%';

    if (nodo.esResultado) {
      // ===== PANTALLA DE RESULTADO =====
      let html = `<div class="resultado-asistencia ${nodo.esEmergencia ? 'emergencia' : ''}">`;
      html += `<h3>${nodo.esEmergencia ? '⚠️ ' : ''}Especialidad recomendada:</h3>`;
      html += `<p style="font-size: 24px; font-weight: 700; color: ${nodo.esEmergencia ? '#E53935' : '#1565C0'};">${nodo.especialidad}</p>`;
      html += `<p>${nodo.descripcion || ''}</p>`;

      if (nodo.recomendacion) {
        html += `<div class="recomendacion">${nodo.recomendacion}</div>`;
      }

      // Si es emergencia, mostrar modal
      if (nodo.esEmergencia) {
        setTimeout(() => UI.mostrarModalEmergencia(), 500);
      }

      // Boton para ver centros con esta especialidad
      html += `<button class="btn-principal mt-2" onclick="Sintomas.verCentrosEspecialidad('${nodo.especialidad}')">
        🏥 Ver centros con ${nodo.especialidad}
      </button>`;
      html += `<button class="btn-secundario mt-1" onclick="Sintomas.reiniciar()">🔄 Nueva evaluacion</button>`;
      html += `</div>`;

      contenedor.innerHTML = html;

    } else {
      // ===== PANTALLA DE PREGUNTA =====
      let html = `<h3 class="pregunta-texto">${nodo.pregunta}</h3>`;
      html += `<div class="opciones-respuesta">`;

      nodo.opciones.forEach((opcion, idx) => {
        html += `<button class="opcion-btn" onclick="Sintomas.seleccionarOpcion('${opcion.siguiente}')">
          ${opcion.texto}
        </button>`;
      });

      html += `</div>`;
      contenedor.innerHTML = html;
    }
  }

  // Seleccionar una opcion y avanzar al siguiente nodo
  function seleccionarOpcion(idSiguiente) {
    historial.push(nodoActual);
    nodoActual = idSiguiente;
    mostrarPreguntaActual();
  }

  // Volver a la pregunta anterior
  function anteriorPregunta() {
    if (historial.length > 0) {
      nodoActual = historial.pop();
      mostrarPreguntaActual();
    } else {
      // Si no hay historial, volver al inicio
      UI.mostrarPantalla('inicio');
    }
  }

  // Reiniciar la evaluacion desde el principio
  function reiniciar() {
    historial = [];
    nodoActual = arbol ? arbol.preguntaInicial : 'INICIO';
    UI.cerrarModalEmergencia();
    mostrarPreguntaActual();
  }

  // Buscar y mostrar centros medicos con la especialidad recomendada
  async function verCentrosEspecialidad(especialidad) {
    UI.mostrarToast('Buscando centros con ' + especialidad + '...');
    try {
      const centros = await DB.buscarCentrosPorEspecialidad(especialidad);

      if (centros.length === 0) {
        UI.mostrarToast('No se encontraron centros registrados con ' + especialidad);
        return;
      }

      // Mostrar en el mapa con filtro aplicado
      UI.mostrarPantalla('mapa');
      setTimeout(() => {
        Mapa.mostrarCentrosFiltrados(centros);
        UI.mostrarToast(centros.length + ' centros con ' + especialidad);
      }, 300);

    } catch (error) {
      console.error('[Sintomas] Error al buscar centros:', error);
      UI.mostrarToast('Error al buscar centros medicos');
    }
  }

  // API publica
  return {
    inicializar: inicializar,
    seleccionarOpcion: seleccionarOpcion,
    anteriorPregunta: anteriorPregunta,
    reiniciar: reiniciar,
    verCentrosEspecialidad: verCentrosEspecialidad
  };
})();
