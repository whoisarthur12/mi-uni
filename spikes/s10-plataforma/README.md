# S10 — Plataforma

**Veredicto global: ⚠️ viable con condiciones** — todo funciona en Chromium 158, Firefox 155 y WebKit 26.6 (Linux); falta confirmarlo en el iPhone y en un Android reales y en la URL real de Pages.

| Parte | Veredicto | Decisión |
|---|---|---|
| CSP en workers | ✅ con límites | [ADR-004](../../docs/decisions/ADR-004-csp-en-workers.md) |
| Router por hash | ✅ | `app/js/router.js` (lógica pura, 6 pruebas) |
| Service worker, cachés versionadas, offline por módulo, actualización | ✅ (11/11 pasos × 3 motores) | [ADR-005](../../docs/decisions/ADR-005-service-worker-y-cache.md) |
| Tope de canvas | ⚠️ escritorio medido; iOS sin medir | Reducir al cargar a ≤ 16,7 MP (4096²) hasta medir el iPhone |
| Instalación PWA | ✅ Chromium sin errores de instalabilidad; iOS/Android sin probar | Manifiesto con rutas relativas (`app/manifest.webmanifest`) |
| Versiones mínimas | ✅ (datos de MDN BCD 8.1.10) | Safari iOS **16.4** como mínimo; Wake Lock opcional |

## CSP y workers (`csp/`)
- **Pregunta:** ¿cómo impedir que un worker con datos del usuario se conecte a otro origen si GitHub Pages no permite cabeceras CSP?
- **Método:** servidor testigo en otro origen (`csp/runner/witness.cjs`) que registra cada petición con un token. 7 vías de red × 5 escenarios × 3 motores (Chromium 158, Firefox 155, WebKit 26.6). Runners: `runner/s10run.cjs` (escenarios), `runner/s10var.cjs` (variantes de CSP + Ghostscript de punta a punta), `runner/s10dyn.cjs` (Firefox e importaciones dinámicas).
- **Resultado:** worker por URL → 6 fugas por navegador. Worker `blob:` → 0. Bloqueo de APIs solo → 1 fuga (`import()`). `blob:` + bloqueo → 0. CSP desde el SW → 0 solo con la página controlada. Ghostscript funciona en `blob:` + bloqueo en los tres, con 9–15 ms de inicio por worker (WASM precompilado en la página).
- **Veredicto:** ✅ viable con límites (ver ADR-004: `<meta>` sin `frame-ancestors`, iOS real sin probar).
- **Decisión:** workers siempre desde `blob:` vía `core/workers.js`; `lockdown.js` como primer import; WASM compilado en la página y enviado como `WebAssembly.Module`; `'wasm-unsafe-eval'` obligatorio.

### Reproducir
```bash
python3 -m http.server 8765                                    # raíz del repo
node spikes/s10-plataforma/csp/runner/witness.cjs /tmp/witness.log  # testigo en 127.0.0.1:8766
WITNESS_LOG=/tmp/witness.log node spikes/s10-plataforma/csp/runner/s10run.cjs               # requiere Playwright con chromium/firefox/webkit
```
Para `s10var.cjs` hay que enlazar `csp/fixtures-gen` a los fixtures de S1.

## Router, service worker y offline (`app/`)
- **Pregunta:** ¿el router por hash, el SW con cachés versionadas y la descarga offline por módulo funcionan bajo `/<repo>/` con la caché HTTP de Pages (`max-age=600`), sin dejar usuarios atrapados en versiones viejas?
- **Método:** mini-PWA (`app/`) servida por `runner/pages-server.cjs`, que imita a Pages (sitio bajo `/mi-uni/`, `max-age=600`, `ETag`, simulación de publicación nueva, caída y archivo corrupto). `runner/s10app.cjs` recorre 11 pasos por motor. Lógica pura probada en Node: `node --test spikes/s10-plataforma/app/test/*.test.*` (11 pruebas).
- **Resultado:** 11/11 en los 3 motores con el servidor caído. Descarga del módulo pesado (Ghostscript real, 15,57 MB, SHA-256 verificado): 0,4 / 1,25 / 0,95 s (Chromium / Firefox / WebKit); WASM compilado sin conexión desde la caché en 72 / 195 / 119 ms. Actualización con 2 pestañas: ambas pasan a v2. Shell: 11,9 KB gzip. Detalle y 8 hallazgos en ADR-005 (el más importante: sin `cache: 'reload'` el precache guarda archivos de la versión anterior en Chromium y Firefox).
- **Veredicto:** ✅ viable. **Decisión:** ADR-005.

## Tope de canvas (`canvas/`)
- **Pregunta:** ¿cuál es el canvas más grande utilizable en cada motor, en la página y en un worker (`OffscreenCanvas`)?
- **Método:** `canvas/index.html` pinta un píxel en la esquina inferior derecha y lo relee (un canvas demasiado grande puede quedar en blanco sin lanzar error); búsqueda binaria; además, cuántos canvas de 4096² (64 MB) caben vivos y cuánto tarda codificar 4000×3000 a JPEG. La misma página sirve para el celular ("Copiar resultados").
- **Resultado (escritorio Linux, no representa iOS):**

| Motor | Lado máx. | Cuadrado máx. | Área máx. | 4096² vivos (tope 24) | JPEG 12 MP página / worker |
|---|---|---|---|---|---|
| Chromium 158 | 65.535 | 16.384 | 268 MP | ≥ 24 (≥ 1,5 GB) | 93 / 96 ms |
| Firefox 155 | 65.535 (32.767 con ancho 16.384) | 23.168 | 537 MP | ≥ 24 | 103 / 69 ms |
| WebKit 26.6 | ≥ 131.072 (tope de la búsqueda) | 16.384 | 268 MP | ≥ 24 | 402 / 249 ms |

  Página y `OffscreenCanvas` en worker `blob:` dan los mismos límites en los 3.
- **Veredicto:** ⚠️ en escritorio no hay problema; **el límite que importa es el de iOS**, documentado por terceros en ~16,7 MP por canvas y un tope de memoria total de canvas por pestaña (**no verificado**). Hasta medir el iPhone: reducir toda imagen al cargarla a ≤ 16,7 MP y liberar canvases (`width = height = 0`).

## Instalación PWA
- Chromium (CDP `Page.getInstallabilityErrors`) bajo `/mi-uni/…/app/`: **0 errores** de manifiesto y de instalabilidad; `scope` resuelto a la carpeta correcta. Runner: `runner/s10install.cjs`.
- Firefox de escritorio no instala PWAs (BCD: `link rel=manifest` no soportado). iOS instala con "Añadir a pantalla de inicio" (no hay `beforeinstallprompt`): la UI debe explicar los pasos en iPhone. **Sin probar en dispositivos reales.**

## Versiones mínimas (MDN browser-compat-data 8.1.10, 19-nov-2026)

| Función | Safari iOS | Chrome Android | Firefox | Samsung Internet |
|---|---|---|---|---|
| Workers de tipo módulo | 15 | 80 | 114 | 13 |
| `OffscreenCanvas` (2D, `convertToBlob`) | **16.4** | 69 | 105 | 10 |
| `'wasm-unsafe-eval'` | 16 | 97 | 102 | 18 |
| CSP `worker-src` | 15.5 | 59 | 58 | 7 |
| `WebAssembly.compileStreaming` | 15 | 60 | 58 | 8 |
| Wake Lock | **18.4** | 84 | 126 | 14 |
| `storage.persist()` / `estimate()` | 15.2 / 17 | 55 / 61 | 57 / 57 | 6 / 8 |
| `navigator.deviceMemory` | no | 63 | no | 8 |
| Manifiesto: `icons` | 15.4 | 39 | no | 4 |

**Propuesta:** mínimo **Safari iOS 16.4** (lo fija `OffscreenCanvas`); Wake Lock solo como mejora opcional (iOS 18.4). Sin `deviceMemory` en iOS/Firefox, ADR-003 ya asume 3 / 4 GB.

### Reproducir
```bash
node spikes/s10-plataforma/runner/pages-server.cjs        # Pages simulado en :8770
```
```bash
node spikes/s10-plataforma/runner/s10app.cjs              # OFFLINE=server para no usar setOffline
```
```bash
node spikes/s10-plataforma/runner/s10canvas.cjs
```
```bash
node spikes/s10-plataforma/runner/s10install.cjs
```
`runner/gen-assets.cjs` regenera `app/modules/pesado/assets.json`; `app/gen_icons.py` los íconos (Pillow).
