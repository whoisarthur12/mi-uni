# Mi Uni

Suite PWA gratuita, estática y 100 % local de herramientas universitarias (PDF, portadas, bibliografías, texto…). Ningún archivo sale del dispositivo.

- Qué se construye y por qué: [`CONTEXT.md`](CONTEXT.md)
- Cómo se trabaja (fases, reglas, aceptación): [`INSTRUCTIONS.md`](INSTRUCTIONS.md)
- Decisiones: [`docs/decisions/`](docs/decisions/)
- Pruebas de viabilidad (Fase 0): [`spikes/`](spikes/)

Estado: **Fase 1 mínima** (ADR-011). App: `https://whoisarthur12.github.io/mi-uni/` · Páginas de prueba de la Fase 0: `…/mi-uni/pruebas/` · Maqueta de diseño: `…/mi-uni/diseno/`.

## Estructura de la app
| Ruta | Qué es |
|---|---|
| `index.html`, `manifest.webmanifest`, `icons/` | Shell instalable (PWA). CSP por `<meta>` (ADR-004) |
| `sw.js`, `sw-config.js` | Service worker: shell en caché versionada, módulos livianos y descarga explícita de los pesados (ADR-005) |
| `css/ui.css` | ui-kit: tokens y componentes de la maqueta aprobada (ADR-013) |
| `js/app.js`, `js/shell/` | Router por hash, cabecera, pestañas, vistas y catálogo de herramientas |
| `js/core/` | Núcleo: `router`, `net-guard` (única salida de red: solo el propio sitio), `workers` (única fábrica de workers: `blob:` + `lockdown`), `offline`, `sw-client`, `theme`, `db` (IndexedDB versionada), `ajustes` (perfil), `proyectos` + `zip` + `respaldo` (ADR-006), `dialogo`, `hooks` (eventos, diagnóstico y buscador mínimos) |
| `js/engines/pdf/` | Motor PDF compartido (ADR-010): único punto que importa pdf.js y @cantoo/pdf-lib; apertura con permiso, guardas, pesos por página |
| `js/modules/<id>/` | Herramientas; se cargan con `import()` al abrirlas. **Compresor:** `js/modules/compresor/` ([`docs/compresor.md`](docs/compresor.md)) |
| `js/vendor/` | Dependencias fijadas (versiones en `js/vendor/VERSIONS.md`) |

## Pruebas
```bash
for t in tests/core/*.test.* tests/policy/*.test.mjs; do node --test "$t"; done
```
```bash
node spikes/s10-plataforma/runner/pages-server.cjs
```
```bash
node tests/ui/shell.e2e.cjs
```
```bash
node tests/ui/ajustes.e2e.cjs
```
```bash
node tests/ui/proyectos.e2e.cjs chromium,firefox,webkit --grande
```
```bash
FX_S12=/tmp/s12fx FX_S1=/tmp/s1fx node tests/ui/compresor.e2e.cjs
```
(PDFs sintéticos: `python3 -I spikes/s12-pdf/gen_fixtures.py /tmp/s12fx` y `python3 -I spikes/s1-ghostscript/gen_fixtures.py /tmp/s1fx`. Nunca PDFs del usuario.)

## Puntos de enganche (ADR-011, bloque 5)
El buscador completo, la pantalla de diagnóstico y el catálogo completo de eventos llegan **después del Compresor y antes del lanzamiento público**. Ya existen sus puntos de enganche en `js/core/hooks.js`, y el código los usa:
- **Eventos:** `publicar(tipo, {ids…})` / `suscribir(tipo, fn)`. Hoy se publican `proyecto:creado`, `documento:generado` (al guardar en un proyecto), `perfil:cambiado` y `compresor:resultado`.
- **Diagnóstico local:** `diag(tipo, datos)` guarda en memoria, sin red, las rutas, los errores del SW, las descargas sin conexión, los cierres de pestaña detectados (ADR-003) y el resultado o error de cada compresión (tamaños, pasadas, ms). `diagnostico()` devuelve el registro.
- **Buscador:** `buscar(texto, elementos)`, sin distinguir tildes; hoy filtra las herramientas de Inicio.
```bash
node tools/auditar.cjs tests/ui/app.auditoria.cjs
```
Tras cambiar un archivo pesado de un módulo: `node tools/gen-assets.mjs`. Tras cambiar un archivo del shell: subir `SHELL_VERSION` en `sw-config.js`.

Licencia: [AGPL-3.0](LICENSE). Licencias de terceros: [`LICENSES.md`](LICENSES.md).
