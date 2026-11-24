# ADR-002 — Paquete de Ghostscript WASM para el compresor

- **Estado:** **aceptada** por el dueño el 24-nov-2026 (la medición en celular sigue pendiente)
- **Contexto:** el compresor necesita Ghostscript (`pdfwrite`) en el navegador, sin `SharedArrayBuffer` (GitHub Pages no permite COOP/COEP). Ver spike S1.
- **Opciones:**
  1. `@jspawn/ghostscript-wasm` 0.0.2: sin mantenimiento desde 2022.
  2. `@okathira/ghostpdl-wasm` 1.1.0: Ghostscript 10.06.0, ES module, build reproducible con npm provenance, sin pthreads.
  3. `@bentopdf/gs-wasm` 0.1.1: fork de la 2 sin aportes medibles.
  4. Compilar nuestro propio build con Emscripten: más control (quitar drivers que no usamos para reducir peso), pero hay que mantenerlo.
- **Decisión:** opción 2, vendorizada y fijada (`gs.wasm` SHA-256 `e8aaf3af75da65fe0af8d49b30fa717e4ff13eedbbdc0cdd5700f54fb8f667e6`). Se reconsidera la opción 4 si el peso (11 MB gzip) resulta un problema en la descarga móvil.
- **Consecuencias:** licencia AGPL-3.0-or-later → el proyecto se publica como AGPL-3.0 con enlace visible al código. Worker dedicado que se termina tras cada trabajo (la memoria WASM no se libera). Cancelación por `terminate()`. `-dPassThroughJPEGImages=false` es obligatorio.
- **Condiciones del dueño:** se vendoriza una sola vez y queda fijado en `VERSIONS.md`; no se actualiza sin avisar. El WASM se carga **bajo demanda dentro del módulo compresor** (nunca en el arranque ni en el precache del shell; se guarda offline solo con "Descargar para usar sin conexión"). `LICENSES.md` enlaza al código fuente exacto (tag `ghostpdl-10.06.0` + commit del empaquetado).
- **Tope de memoria:** ver [ADR-003](ADR-003-tope-memoria-compresor.md).
