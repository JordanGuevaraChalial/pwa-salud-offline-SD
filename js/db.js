/* ============================================================
   MODULO DE BASE DE DATOS LOCAL - IndexedDB
   Almacenes: centrosMedicos, nodosSintomas, consejosNaturales, configuracion
   ============================================================ */

const DB = (function() {
  const NOMBRE_DB = 'SaludOfflineDB';
  const VERSION_DB = 1;
  let dbInstance = null;

  // Abrir o crear la base de datos
  function abrirDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);

      solicitud.onupgradeneeded = function(event) {
        const db = event.target.result;
        console.log('[DB] Actualizando estructura de base de datos...');

        // Almacen: centrosMedicos
        if (!db.objectStoreNames.contains('centrosMedicos')) {
          const store = db.createObjectStore('centrosMedicos', { keyPath: 'id' });
          store.createIndex('tipoCentro', 'tipoCentro', { unique: false });
          store.createIndex('institucion', 'institucion', { unique: false });
          store.createIndex('distritoSalud', 'distritoSalud', { unique: false });
          store.createIndex('parroquia', 'parroquia', { unique: false });
          console.log('[DB] Almacen centrosMedicos creado');
        }

        // Almacen: nodosSintomas (arbol de decision)
        if (!db.objectStoreNames.contains('nodosSintomas')) {
          const store = db.createObjectStore('nodosSintomas', { keyPath: 'id' });
          store.createIndex('esResultado', 'esResultado', { unique: false });
          store.createIndex('especialidad', 'especialidad', { unique: false });
          console.log('[DB] Almacen nodosSintomas creado');
        }

        // Almacen: consejosNaturales
        if (!db.objectStoreNames.contains('consejosNaturales')) {
          const store = db.createObjectStore('consejosNaturales', { keyPath: 'id' });
          store.createIndex('categoria', 'categoria', { unique: false });
          console.log('[DB] Almacen consejosNaturales creado');
        }

        // Almacen: configuracion
        if (!db.objectStoreNames.contains('configuracion')) {
          db.createObjectStore('configuracion', { keyPath: 'clave' });
          console.log('[DB] Almacen configuracion creado');
        }
      };

      solicitud.onsuccess = function(event) {
        dbInstance = event.target.result;
        console.log('[DB] Base de datos abierta exitosamente');
        resolve(dbInstance);
      };

      solicitud.onerror = function(event) {
        console.error('[DB] Error al abrir base de datos:', event.target.error);
        reject('Error al abrir la base de datos: ' + event.target.error);
      };
    });
  }

  // Cargar datos iniciales desde archivos JSON a IndexedDB
  async function cargarDatosIniciales() {
    try {
      const db = await abrirDB();

      // Verificar si ya hay datos cargados
      const count = await new Promise((resolve) => {
        const tx = db.transaction('centrosMedicos', 'readonly');
        const store = tx.objectStore('centrosMedicos');
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });

      if (count > 0) {
        console.log('[DB] Datos ya cargados. Saltando inicializacion.');
        document.getElementById('db-estado').textContent = 'Activa ✓';
        document.getElementById('centros-cantidad').textContent = count;
        return;
      }

      console.log('[DB] Cargando datos iniciales...');

      // 1. Cargar centros medicos
      const respCentros = await fetch('data/centros_medicos.json');
      const centros = await respCentros.json();

      const txCentros = db.transaction('centrosMedicos', 'readwrite');
      const storeCentros = txCentros.objectStore('centrosMedicos');
      centros.forEach(centro => storeCentros.put(centro));
      await txComplete(txCentros);
      console.log('[DB] ' + centros.length + ' centros medicos cargados');

      // 2. Cargar arbol de sintomas
      const respSintomas = await fetch('data/sintomas.json');
      const sintomasData = await respSintomas.json();

      const txSint = db.transaction('nodosSintomas', 'readwrite');
      const storeSint = txSint.objectStore('nodosSintomas');
      Object.entries(sintomasData.nodos).forEach(([id, nodo]) => {
        storeSint.put(Object.assign({ id: id }, nodo));
      });
      await txComplete(txSint);
      console.log('[DB] Arbol de sintomas cargado');

      // Guardar pregunta inicial en configuracion
      const txConfig = db.transaction('configuracion', 'readwrite');
      txConfig.objectStore('configuracion').put({
        clave: 'preguntaInicial',
        valor: sintomasData.preguntaInicial
      });
      txConfig.objectStore('configuracion').put({
        clave: 'versionDatos',
        valor: '1.0.0',
        fechaActualizacion: '2026-10-01'
      });
      await txComplete(txConfig);

      // 3. Cargar consejos naturales
      const respConsejos = await fetch('data/consejos.json');
      const consejos = await respConsejos.json();

      const txCons = db.transaction('consejosNaturales', 'readwrite');
      const storeCons = txCons.objectStore('consejosNaturales');
      consejos.forEach(consejo => storeCons.put(consejo));
      await txComplete(txCons);
      console.log('[DB] ' + consejos.length + ' consejos naturales cargados');

      document.getElementById('db-estado').textContent = 'Activa ✓';
      document.getElementById('centros-cantidad').textContent = centros.length;
      console.log('[DB] Datos iniciales cargados exitosamente');

    } catch (error) {
      console.error('[DB] Error al cargar datos iniciales:', error);
      document.getElementById('db-estado').textContent = 'Error: ' + error.message;
    }
  }

  // Helper: esperar a que una transaccion se complete
  function txComplete(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // Obtener todos los centros medicos
  function obtenerTodosCentros() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await abrirDB();
        const tx = db.transaction('centrosMedicos', 'readonly');
        const store = tx.objectStore('centrosMedicos');
        const solicitud = store.getAll();
        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
      } catch (e) { reject(e); }
    });
  }

  // Obtener un centro medico por ID
  function obtenerCentroPorId(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await abrirDB();
        const tx = db.transaction('centrosMedicos', 'readonly');
        const store = tx.objectStore('centrosMedicos');
        const solicitud = store.get(id);
        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
      } catch (e) { reject(e); }
    });
  }

  // Buscar centros por especialidad
  async function buscarCentrosPorEspecialidad(especialidad) {
    const centros = await obtenerTodosCentros();
    const termino = especialidad.toLowerCase().trim();
    return centros.filter(c =>
      c.especialidades && c.especialidades.some(e =>
        e.toLowerCase().includes(termino)
      )
    );
  }

  // Buscar centros por texto (nombre, direccion, tipo)
  async function buscarCentrosPorTexto(texto) {
    const centros = await obtenerTodosCentros();
    const termino = texto.toLowerCase().trim();
    if (!termino) return centros;
    return centros.filter(c =>
      (c.nombreOficial && c.nombreOficial.toLowerCase().includes(termino)) ||
      (c.nombreCorto && c.nombreCorto.toLowerCase().includes(termino)) ||
      (c.direccion && c.direccion.toLowerCase().includes(termino)) ||
      (c.tipoCentro && c.tipoCentro.toLowerCase().includes(termino))
    );
  }

  // Obtener datos del arbol de sintomas
  function obtenerArbolSintomas() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await abrirDB();

        // Obtener pregunta inicial
        const txConfig = db.transaction('configuracion', 'readonly');
        const configStore = txConfig.objectStore('configuracion');
        const reqConfig = configStore.get('preguntaInicial');

        // Obtener todos los nodos
        const txNodos = db.transaction('nodosSintomas', 'readonly');
        const nodosStore = txNodos.objectStore('nodosSintomas');
        const reqNodos = nodosStore.getAll();

        reqConfig.onsuccess = function() {
          const preguntaInicial = reqConfig.result ? reqConfig.result.valor : 'INICIO';
          reqNodos.onsuccess = function() {
            const nodosArray = reqNodos.result;
            const nodosObjeto = {};
            nodosArray.forEach(n => {
              const { id, ...resto } = n;
              nodosObjeto[id] = resto;
            });
            resolve({ preguntaInicial: preguntaInicial, nodos: nodosObjeto });
          };
          reqNodos.onerror = () => reject(reqNodos.error);
        };
        reqConfig.onerror = () => reject(reqConfig.error);
      } catch (e) { reject(e); }
    });
  }

  // Obtener consejos naturales (con filtros opcionales)
  function obtenerConsejos(categoria, busqueda) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await abrirDB();
        const tx = db.transaction('consejosNaturales', 'readonly');
        const store = tx.objectStore('consejosNaturales');
        const solicitud = store.getAll();
        solicitud.onsuccess = function() {
          let consejos = solicitud.result;
          if (categoria) {
            consejos = consejos.filter(c => c.categoria === categoria);
          }
          if (busqueda) {
            const termino = busqueda.toLowerCase();
            consejos = consejos.filter(c =>
              (c.titulo && c.titulo.toLowerCase().includes(termino)) ||
              (c.descripcion && c.descripcion.toLowerCase().includes(termino)) ||
              (c.categoria && c.categoria.toLowerCase().includes(termino))
            );
          }
          resolve(consejos);
        };
        solicitud.onerror = () => reject(solicitud.error);
      } catch (e) { reject(e); }
    });
  }

  // Obtener un consejo por ID
  function obtenerConsejoPorId(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await abrirDB();
        const tx = db.transaction('consejosNaturales', 'readonly');
        const store = tx.objectStore('consejosNaturales');
        const solicitud = store.get(id);
        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
      } catch (e) { reject(e); }
    });
  }

  // Limpiar todos los datos (desde Configuracion)
  async function limpiarDatos() {
    if (!confirm('¿Estas seguro de borrar todos los datos almacenados? La aplicacion necesitara internet para recargarlos.')) {
      return;
    }
    try {
      const db = await abrirDB();
      const stores = ['centrosMedicos', 'nodosSintomas', 'consejosNaturales', 'configuracion'];
      for (const storeName of stores) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        await txComplete(tx);
      }
      // Limpiar cache del Service Worker
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      UI.mostrarToast('Datos borrados. Recarga la pagina para reiniciar.');
      setTimeout(() => location.reload(), 2000);
    } catch (error) {
      console.error('[DB] Error al limpiar datos:', error);
      UI.mostrarToast('Error al borrar datos');
    }
  }

  // Actualizar datos (cuando hay internet)
  async function actualizarDatos() {
    if (!navigator.onLine) {
      UI.mostrarToast('⚠️ Necesitas internet para actualizar los datos');
      return;
    }
    UI.mostrarToast('🔄 Actualizando datos...');
    try {
      // Limpiar y recargar
      const db = await abrirDB();
      const tx = db.transaction('centrosMedicos', 'readwrite');
      tx.objectStore('centrosMedicos').clear();
      await txComplete(tx);

      await cargarDatosIniciales();
      UI.mostrarToast('✅ Datos actualizados correctamente');
    } catch (error) {
      console.error('[DB] Error al actualizar:', error);
      UI.mostrarToast('Error al actualizar datos');
    }
  }

  // Calcular espacio de almacenamiento usado
  async function obtenerAlmacenamientoUsado() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimado = await navigator.storage.estimate();
      const usadoMB = (estimado.usage / (1024 * 1024)).toFixed(2);
      const totalMB = (estimado.quota / (1024 * 1024)).toFixed(1);
      return usadoMB + ' MB de ' + totalMB + ' MB';
    }
    return 'No disponible';
  }

  // API publica
  return {
    abrirDB: abrirDB,
    cargarDatosIniciales: cargarDatosIniciales,
    obtenerTodosCentros: obtenerTodosCentros,
    obtenerCentroPorId: obtenerCentroPorId,
    buscarCentrosPorEspecialidad: buscarCentrosPorEspecialidad,
    buscarCentrosPorTexto: buscarCentrosPorTexto,
    obtenerArbolSintomas: obtenerArbolSintomas,
    obtenerConsejos: obtenerConsejos,
    obtenerConsejoPorId: obtenerConsejoPorId,
    limpiarDatos: limpiarDatos,
    actualizarDatos: actualizarDatos,
    obtenerAlmacenamientoUsado: obtenerAlmacenamientoUsado
  };
})();
