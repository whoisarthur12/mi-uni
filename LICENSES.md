# Licencias de terceros

Resumen de licencias de todo lo redistribuido. El detalle (versión exacta, peso, motivo, alternativa) está en [`js/vendor/VERSIONS.md`](js/vendor/VERSIONS.md).
Proyecto: **AGPL-3.0-only** (obligado por Ghostscript; ver `CONTEXT.md` §6).

| Componente | Licencia | Compatible con AGPL-3.0 | Notas |
|---|---|---|---|
| Ghostscript 10.06.0 vía `@okathira/ghostpdl-wasm` 1.1.0 | AGPL-3.0-or-later | Sí (obliga a AGPL en todo el proyecto) | Ver sección «Código fuente correspondiente» abajo; Artifex ofrece licencia comercial |
| citeproc-js 2.4.63 *(en evaluación, S5)* | CPAL-1.0 **o** AGPL-3.0-or-later (a elección) | Sí, eligiendo AGPL-3.0-or-later | Fuente: paquete npm `citeproc@2.4.63` y https://github.com/Juris-M/citeproc-js; único cambio documentado en ADR-008 |
| Estilos y locales CSL *(en evaluación, S5)* | CC BY-SA 3.0 | Sí (contenido de datos, licencia separada; requiere atribución y misma licencia en derivados) | `apa-es.csl` derivado de `apa.csl`, también CC BY-SA 3.0; ver `spikes/s5-citas/vendor/csl/README.md` |

## Código fuente correspondiente (AGPL §6 y §13)

### Ghostscript WASM — `js/vendor/ghostpdl-wasm-1.1.0/`
Los binarios `gs.wasm` y `gs.js` se redistribuyen **sin modificar**. Su código fuente exacto es:

| Pieza | Fuente exacta | Verificación |
|---|---|---|
| Ghostscript/GhostPDL **10.06.0** | https://github.com/ArtifexSoftware/ghostpdl/tree/ghostpdl-10.06.0 — tag `ghostpdl-10.06.0`, commit `2d6e764c1f4a73520ed6de6dd3fa78ad30cd6a63` | El submódulo `ghostpdl` del empaquetado apunta a ese commit (comprobado con `git ls-tree`) |
| Empaquetado Emscripten `@okathira/ghostpdl-wasm` **1.1.0** (scripts `compile.sh`, `optimize_with_binaryen.sh`, flags de compilación) | https://github.com/okathira/ghostpdl-wasm/tree/a62b7d686b21cf88f6425b3e989d1062b9af4256 | `gitHead` del paquete npm; procedencia SLSA en https://registry.npmjs.org/-/npm/v1/attestations/@okathira%2fghostpdl-wasm@1.1.0 |
| Toolchain | `emscripten/emsdk:4.0.13` (imagen Docker declarada en `package.json` del empaquetado) | — |

SHA-256 de los archivos vendorizados:
- `gs.wasm`: `e8aaf3af75da65fe0af8d49b30fa717e4ff13eedbbdc0cdd5700f54fb8f667e6`
- `gs.js`: `5e7e3b3dfc7afc5e60de8dd6dab66145c75afb74f7d671f711f390b3bb69c6d0`

La interfaz de la app enlazará a este archivo y al repositorio de Mi Uni (obligación de ofrecer el código a los usuarios que interactúan por red, AGPL §13).
