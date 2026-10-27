/* ============================================================
   ARCHIVO PRINCIPAL - Inicializacion de la aplicacion
   Punto de entrada: carga datos, inicializa modulos, configura eventos.
   ============================================================ */

// Esperar a que el DOM este listo
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[APP] Iniciando Salud Offline Santo Domingo v1.0.0');

  // 1. Inicializar modulo de UI (estado de conexion, navegacion)
  UI.init();

  // 2. Cargar datos iniciales en IndexedDB (si no existen)
  try {
    await DB.cargarDatosIniciales();
    console.log('[APP] Datos iniciales listos');
  } catch (error) {
    console.error('[APP] Error al cargar datos iniciales:', error);
    UI.mostrarToast('⚠️ Error al cargar datos. Se requiere internet la primera vez.');
  }

  // 3. Configurar eventos de busqueda
  Consejos.configurarEventos();
  Mapa.configurarEventos();

  // 4. Mostrar informacion de version
  document.getElementById('app-version').textContent = '1.0.0';

  // 5. Verificar soporte de PWA
  if (!('serviceWorker' in navigator)) {
    UI.mostrarToast('⚠️ Tu navegador no soporta Service Workers. Algunas funciones offline no estaran disponibles.');
  }

  if (!('indexedDB' in window)) {
    UI.mostrarToast('⚠️ Tu navegador no soporta IndexedDB. Los datos no se almacenaran localmente.');
  }

  console.log('[APP] Aplicacion inicializada correctamente');
});

// ============================================================
// FUNCIONES GLOBALES AUXILIARES (para debugging y desarrollo)
// ============================================================

// Recargar datos forzosamente (desarrollo)
async function recargarDatos() {
  console.log('[APP] Recargando datos...');
  await DB.limpiarDatos();
}

// Mostrar estado de la aplicacion en consola
function estadoApp() {
  console.log('=== ESTADO DE LA APLICACION ===');
  console.log('Conexion:', navigator.onLine ? 'Online' : 'Offline');
  console.log('Service Worker:', 'serviceWorker' in navigator ? 'Soportado' : 'No soportado');
  console.log('IndexedDB:', 'indexedDB' in window ? 'Soportado' : 'No soportado');
  console.log('Geolocalizacion:', 'geolocation' in navigator ? 'Soportada' : 'No soportada');
  DB.obtenerTodosCentros().then(c => console.log('Centros medicos cargados:', c.length));
}
