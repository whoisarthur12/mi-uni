# ADR-005 — Service worker, cachés versionadas y descarga offline por módulo

- **Estado:** propuesta (medida en Chromium 158, Firefox 155 y WebKit 26.6 sobre Linux; **iPhone y Android reales pendientes**)
- **Contexto:** la app vive en GitHub Pages bajo `/<repo>/`, sin cabeceras propias y con `Cache-Control: max-age=600` en todo. Debe abrir sin internet (shell + módulos descargados), actualizarse sin dejar a nadie atrapado en una versión vieja y descargar módulos pesados (Ghostscript: 15,5 MB) solo cuando el usuario lo pida (INSTRUCTIONS §6, ADR-002).

## Método
- Mini-PWA en `spikes/s10-plataforma/app/` (shell, router por hash, SW clásico, un módulo liviano y uno pesado que compila el WASM real de Ghostscript).
- Servidor que imita a Pages (`runner/pages-server.cjs`): sitio bajo `/mi-uni/`, `max-age=600`, `ETag`; puede simular una publicación nueva (cambia marcadores de versión), caerse (503) o corromper un archivo.
- `runner/s10app.cjs`: 11 pasos de punta a punta por navegador. "Sin conexión" = servidor caído **y** `context.setOffline(true)`, y aparte solo servidor caído.

## Resultados (11/11 pasos en los 3 motores con el servidor caído)

| Prueba | Chromium | Firefox | WebKit |
|---|---|---|---|
| 1.ª visita con deep link `#/m/ligero` (cachés creadas) | ✅ 116 ms | ✅ 615 ms | ✅ 95 ms |
| Atrás / adelante / recarga / ruta inexistente | ✅ | ✅ | ✅ |
| Sin conexión: shell + módulo liviano | ✅ 0 peticiones al servidor | ✅ | ✅ (ver nota 4) |
| Descarga del módulo pesado (15,57 MB, 3 archivos, SHA-256) | 397 ms | 1.254 ms | 950 ms |
| Sin conexión: Ghostscript compilado desde la caché | ✅ 72 ms | ✅ 195 ms | ✅ 119 ms |
| Archivo corrupto → descarga rechazada, módulo no marcado completo | ✅ | ✅ | ✅ |
| Reanudación tras el fallo (2 de 3 archivos reutilizados) | ✅ 15 ms | ✅ 551 ms | ✅ 46 ms |
| Versión nueva con **2 pestañas** → "Actualizar" en una → ambas recargan en v2 | ✅ 1,4 s | ✅ 1,8 s | ✅ 0,6 s |
| Limpieza: `shell-v1` y `mod-ligero-v1` borradas al activar v2 | ✅ | ✅ | ✅ |
| Nueva versión de assets pesados: la vieja sigue sirviendo offline hasta completar la nueva; luego se borra | ✅ (copia local, 148 ms, 0 bytes de red) | ✅ 811 ms | ✅ 109 ms |
| `navigator.storage.persist()` | `false` | **pendiente** (pide permiso) | `false` |
| `storage.estimate()` cuota | 10.255 MB | 10.240 MB | 1.000 MB |

Shell completo (HTML, CSS, manifiesto, SW, router, descargas, íconos): **27,8 KB brutos / 11,9 KB gzip**.

### Hallazgos que cambian el diseño
1. **La caché HTTP de Pages contamina el precache.** Precacheando con el modo por defecto, la versión 3 guardó el `index.html` de la versión 2 (servido por la caché HTTP, `max-age=600`) en **Chromium y Firefox**; WebKit no. Con `cache: 'reload'` las 3 guardan la versión correcta. Lo mismo pasa con *stale-while-revalidate*: sin `cache: 'no-cache'` la revalidación trae la copia vieja durante 10 min (Chromium mostró `LIGERO_1` tras actualizar).
2. **`register()` falla sin conexión** (no puede bajar `sw.js`): hay que caer a `getRegistration()` o el shell pierde el acceso al SW.
3. **`controllerchange` también salta en la 1.ª visita** (`clients.claim()`): recargar ahí rompió la página en Firefox. Solo se recarga si ya había un controlador.
4. **Firefox importa el primer módulo antes de que el SW controle la página**, así que el *stale-while-revalidate* no lo guardaba y el módulo liviano no abría sin conexión. Solución: precachear los archivos de los módulos livianos en `install`.
5. **Firefox: `persist()` deja la promesa pendiente** hasta que el usuario responde el permiso. Nunca se espera dentro de un flujo.
6. Un `import()` fallido sin conexión **no queda memorizado** en ningún motor: tras descargar, reintentar la misma URL funciona.
7. WebKit con `context.setOffline(true)` de Playwright rechaza los `import()` que el SW sirve desde la caché; con el servidor realmente caído funciona. Se toma como artefacto de la emulación, **a confirmar en el iPhone en modo avión**.
8. La UI no puede fiarse de `navigator.onLine` (con el servidor caído vale `true`): el mensaje se decide por el error real.

## Decisión
1. **SW clásico** (`importScripts`), no módulo: compatibilidad uniforme. Configuración y lógica pura en `sw-config.js` (probada en Node).
2. **Cachés:** `shell-vN` · `mod-<id>-vN` · `assets-<id>-vN`. Subir la versión correspondiente en cada publicación que cambie esos archivos.
3. **Estrategias:** navegación dentro del scope → `index.html` del shell (router por hash); shell → *cache-first*; módulos livianos → precache en `install` + *stale-while-revalidate* con `cache: 'no-cache'`; assets pesados → solo de la caché si se descargaron, si no, red sin guardar.
4. **Todo `fetch` de precache usa `cache: 'reload'`**; el SW se registra con `updateViaCache: 'none'`.
5. **Actualización:** sin `skipWaiting` automático. Aviso "Hay una versión nueva — Actualizar" → `SKIP_WAITING` → `controllerchange` → recarga (todas las pestañas). Botón "Buscar actualización" = `registration.update()`.
6. **Descarga offline por módulo** (desde la página, no desde el SW, para que no la mate el ciclo de vida del SW): manifiesto con tamaño y SHA-256 por archivo; se verifica cada archivo antes de guardarlo; el manifiesto se guarda **al final** como marca de "completo"; reanudación por archivo; si una versión anterior tiene el mismo archivo (mismo hash) se copia sin red.
7. **URLs de assets pesados inmutables** (llevan la versión en la ruta, p. ej. `ghostpdl-wasm-1.1.0/`), para que el SW pueda servirlas desde cualquier caché.
8. **Limpieza:** shell y `mod-*` viejos en `activate` (solo ocurre si el `install` nuevo terminó); `assets-<id>` viejos solo cuando la versión actual del mismo módulo está completa.
9. `persist()` se pide con un gesto del usuario y con explicación, sin bloquear nada (S11 decidirá cuándo).

## Consecuencias
- La reanudación es por archivo: un archivo de 50 MB cortado a la mitad se baja de nuevo. Para LibreOffice (Fase 7) los trozos de ≤ 50 MB ya dan esa granularidad.
- Cada archivo descargado se arma completo en memoria para calcular el hash (15,5 MB aquí). Para trozos de 50 MB el pico es ~2× el trozo; aceptable, a medir en móvil.
- Pendiente: probar en la URL real de Pages, en el iPhone (modo avión, instalación desde Safari) y en Chrome Android.
