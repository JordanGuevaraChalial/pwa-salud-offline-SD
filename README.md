# 🏥 Salud Offline Santo Domingo - PWA

Aplicación Web Progresiva (PWA) para geolocalización de centros médicos y asistencia sanitaria sin internet en el cantón Santo Domingo.

**Proyecto de titulación - Ingeniería en Tecnologías de la Información - ESPE**

---

## 📋 Requisitos del sistema

- Navegador moderno con soporte para Service Workers e IndexedDB:
  - Chrome 80+ (Android)
  - Firefox 75+ (Android)
  - Safari 13+ (iOS)
- Servidor local para desarrollo (los Service Workers requieren HTTPS o localhost)
- Python 3+ (para servidor local simple) o VS Code con extensión Live Server

---

## 🚀 Cómo ejecutar el proyecto

### Opción 1: VS Code + Live Server (recomendado)
1. Instalar VS Code
2. Instalar extensión "Live Server"
3. Abrir la carpeta del proyecto en VS Code
4. Click derecho en `index.html` → "Open with Live Server"
5. La app se abre en `http://127.0.0.1:5500`

### Opción 2: Python HTTP Server
```bash
cd D:\DESARROLLO_TESIS
python -m http.server 8080
# Abrir en el navegador: http://localhost:8080
```

### Opción 3: Node.js http-server
```bash
npm install -g http-server
cd D:\DESARROLLO_TESIS
http-server -p 8080
```

---

## 📁 Estructura del proyecto

```
DESARROLLO_TESIS/
├── index.html              # Página principal (todas las pantallas)
├── manifest.json           # Configuración PWA (instalación)
├── service-worker.js       # Service Worker (funcionamiento offline)
├── README.md               # Este archivo
├── css/
│   ├── style.css           # Estilos generales (colores, botones, tarjetas)
│   ├── map.css             # Estilos del mapa Leaflet
│   └── responsive.css      # Estilos adaptables (mobile, tablet, desktop)
├── js/
│   ├── app.js              # Punto de entrada, inicialización
│   ├── db.js               # IndexedDB (base de datos local)
│   ├── ui.js               # Navegación entre pantallas, UI helpers
│   ├── map.js              # Integración Leaflet + OpenStreetMap
│   ├── sintomas.js         # Árbol de decisión de asistencia por síntomas
│   └── consejos.js         # Módulo de consejos de medicina natural
├── data/
│   ├── centros_medicos.json  # Base de datos de centros médicos (completar)
│   ├── sintomas.json         # Árbol de decisión de síntomas
│   └── consejos.json         # Consejos de medicina natural
├── assets/
│   └── icons/              # Íconos de la app (varios tamaños)
└── docs/                   # Documentación técnica adicional
```

---

## 🧪 Cómo probar el funcionamiento offline

1. **Primera carga:** Abre la app con internet. Esto descarga y almacena en caché todos los archivos.
2. **Instalar:** En Chrome Android → menú ⋮ → "Agregar a pantalla de inicio"
3. **Modo offline:** Activa el modo avión (desactiva Wi-Fi y datos móviles)
4. **Abrir la app:** Toca el ícono en la pantalla de inicio. La app debe cargar desde la caché.
5. **Verificar:**
   - ✅ El mapa se muestra (tiles cargados previamente)
   - ✅ Los marcadores de centros médicos aparecen
   - ✅ El botón "Mi ubicación" funciona (GPS no necesita internet)
   - ✅ El módulo de síntomas navega correctamente
   - ✅ Los consejos se muestran y se pueden buscar

---

## 🔧 Herramientas de depuración (Chrome DevTools)

- **Application → Service Workers:** Verificar que el SW esté activo
- **Application → Cache Storage:** Ver archivos en caché
- **Application → IndexedDB:** Ver datos almacenados localmente
- **Network → Offline checkbox:** Simular modo sin conexión
- **Lighthouse → PWA:** Auditar calidad de la PWA

---

## 📝 Tareas pendientes de desarrollo

- [ ] Completar datos de centros médicos (mínimo 20) en `data/centros_medicos.json`
- [ ] Verificar coordenadas GPS de cada centro en OpenStreetMap
- [ ] Ampliar árbol de decisión de síntomas (más nodos)
- [ ] Agregar más consejos naturales (mínimo 20)
- [ ] Probar en dispositivos físicos (Android gama baja, media, iOS)
- [ ] Optimizar tamaño de caché de tiles de mapa
- [ ] Implementar actualización automática de datos cuando hay internet

---

## 📚 Referencias técnicas

- [MDN - Progressive Web Apps](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)
- [IndexedDB API - MDN](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API)
- [Service Worker API - MDN](https://developer.mozilla.org/es/docs/Web/API/Service_Worker_API)
- [Web App Manifest - W3C](https://www.w3.org/TR/appmanifest/)
