/* ============================================================
   MODULO DE CONSEJOS DE MEDICINA NATURAL
   Carga, busca y filtra consejos. Muestra detalle completo.
   ============================================================ */

const Consejos = (function() {

  // Cargar lista de consejos (con filtros de busqueda y categoria)
  async function cargarLista() {
    const busqueda = document.getElementById('busqueda-consejos').value;
    const categoria = document.getElementById('filtro-categoria-consejo').value;

    try {
      const consejos = await DB.obtenerConsejos(categoria || null, busqueda || null);
      mostrarLista(consejos);
    } catch (error) {
      console.error('[Consejos] Error al cargar:', error);
      document.getElementById('lista-consejos').innerHTML =
        '<p class="sin-resultados">Error al cargar los consejos. Verifica que los datos esten cargados.</p>';
    }
  }

  // Mostrar lista de consejos en la interfaz
  function mostrarLista(consejos) {
    const contenedor = document.getElementById('lista-consejos');

    if (!consejos || consejos.length === 0) {
      contenedor.innerHTML = '<p class="sin-resultados">No se encontraron consejos con los criterios seleccionados.</p>';
      return;
    }

    contenedor.innerHTML = consejos.map(c => `
      <div class="tarjeta-consejo" onclick="UI.mostrarFichaConsejo('${c.id}')">
        <span class="categoria-tag">${c.categoria}</span>
        <h4>${c.titulo}</h4>
        <p class="resumen">${(c.descripcion || '').substring(0, 100)}${(c.descripcion || '').length > 100 ? '...' : ''}</p>
        <div class="aviso-consejo-mini">⚠️ Complementario - No sustituye medico</div>
      </div>
    `).join('');
  }

  // Configurar eventos de busqueda (se llama desde app.js)
  function configurarEventos() {
    const inputBusqueda = document.getElementById('busqueda-consejos');
    const selectCategoria = document.getElementById('filtro-categoria-consejo');

    if (inputBusqueda) {
      let timeout;
      inputBusqueda.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(cargarLista, 300); // Debounce
      });
    }

    if (selectCategoria) {
      selectCategoria.addEventListener('change', cargarLista);
    }
  }

  // API publica
  return {
    cargarLista: cargarLista,
    configurarEventos: configurarEventos
  };
})();
