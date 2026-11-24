# Licencias de terceros

Resumen de licencias de todo lo redistribuido. El detalle (versión exacta, peso, motivo, alternativa) está en [`js/vendor/VERSIONS.md`](js/vendor/VERSIONS.md).
Proyecto: **AGPL-3.0-only** (obligado por Ghostscript; ver `CONTEXT.md` §6).

| Componente | Licencia | Compatible con AGPL-3.0 | Notas |
|---|---|---|---|
| Ghostscript 10.06.0 vía `@okathira/ghostpdl-wasm` 1.1.0 | AGPL-3.0-or-later | Sí (obliga a AGPL en todo el proyecto) | Ver sección «Código fuente correspondiente» abajo; Artifex ofrece licencia comercial |
| citeproc-js 2.4.63 | CPAL-1.0 **o** AGPL-3.0-or-later (a elección): **se usa AGPL-3.0-or-later** | Sí | Ver «Código fuente correspondiente» abajo |
| Estilos y locales CSL | CC BY-SA 3.0 | Sí (datos con licencia propia; atribución y misma licencia en derivados) | `apa-es.csl` derivado de `apa.csl`, también CC BY-SA 3.0; ver `js/vendor/csl/README.md` |
| `@cantoo/pdf-lib` 2.11.1 *(en evaluación, S12)* | MIT | Sí | Fuente: https://github.com/cantoo-scribe/pdf-lib/tree/c8c88e84dcd5510ec35921123bb5140fe02a7115 (`gitHead` del paquete npm) |
| pdf.js (`pdfjs-dist` 6.5.438) *(en evaluación, S12)* | Apache-2.0; wasm OpenJPEG (BSD-2), JBIG2 de PDFium (BSD-3), qcms (MIT) | Sí (Apache-2.0 compatible con AGPL-3.0) | Fuente: https://github.com/mozilla/pdf.js/tree/0a4153349dc473ba950fc17941c5ca7eda43c1de (`gitHead`); licencias de los wasm en `spikes/s12-pdf/vendor/pdfjs-6.5.438/wasm/` |

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

### citeproc-js — `js/vendor/citeproc-2.4.63/`
`citeproc.mjs` es `citeproc_commonjs.js` (código fuente legible, no minificado) con **un único cambio**: la última línea `module.exports = CSL` pasa a `export default CSL;` (para usarlo como ES module sin build).

| Pieza | Fuente exacta | Verificación |
|---|---|---|
| citeproc-js **2.4.63** | https://github.com/Juris-M/citeproc-js/tree/73bc1b44bc7d54d0bfec4e070fd27f5efe024ff9 (commit del 16-abr-2023 que fija `"version": "2.4.63"`; el proyecto no publica tags 2.x) | `citeproc_commonjs.js` en ese commit tiene el mismo SHA-256 que el del paquete npm (comprobado) |
| Paquete npm | https://registry.npmjs.org/citeproc/-/citeproc-2.4.63.tgz — integridad `sha512-68F95Bp4UbgZU/DBUGQn0qV3HDZLCdI9+Bb2ByrTaNJDL5VEm9LqaiNaxljsvoaExSLEXe1/r6n2Z06SCzW3/Q==` | `npm view citeproc@2.4.63 dist.integrity` |

SHA-256:
- `citeproc_commonjs.js` original (npm y commit `73bc1b44`): `55abba1a8b8b48c14323fd053f9646013b4b7a0c977938064ecf5195a502b9f1`
- `citeproc.mjs` (parcheado): `ec98e1e6f5e183e3cb3fb516ca106b8a2b5331c82b91481fd5c9d85b4e7d7674`
- `LICENSE`: `b96ca8e1716f93449b480083c7510c18d129fa9afa4644d62c6347c06177ce30`

### Estilos y locales CSL — `js/vendor/csl/`
Sin modificar, salvo `apa-es.csl` (derivado generado por `spikes/s5-citas/tools/make_apa_es.py`). Fuentes: https://github.com/citation-style-language/styles/tree/7fa488bd2f765eb161e93c7963838ee2c9c17fe5 y https://github.com/citation-style-language/locales/tree/21a175a1d84cc1792dd73f5a627de004fba5b207.

| Archivo | SHA-256 |
|---|---|
| apa.csl | `3917def5fc951b104d64216c3373096042368b9704ba269ca83c14ebaba889fc` |
| apa-es.csl (derivado) | `5a481a5165773b9810c3b56e04f317ad7f544e6c922bdc079061455d777318c9` |
| chicago-author-date.csl | `002fade78d7e4fe9d42936a16b43a8066b097013f6255df40b1bfba6631eff9b` |
| harvard-cite-them-right.csl | `0ca3d2c7c881cd98cdd81098b5349f5921edf430498aa9a5a41918621cf7cc45` |
| ieee.csl | `b4c7619fc16c45a31e4cc3271eab94ffe83192d3b4c7fc729470a3b459448de3` |
| modern-language-association.csl | `e1432698ef28938d044b06bd45ddcc57d6b974cec25f71007075646a11f99484` |
| nlm-citation-sequence.csl | `492f7935df42054b33d515f7275122f419780df990ea35925dcbbff0fecf1137` |
| locales-es-ES.xml | `ae4a12f612be754e54843ba88ae6641eb708647cea164b5b922bb6bf9b21c91f` |
| locales-es-MX.xml | `2287c429cb73361034d3d1dc03a6a5444c5e4cd322d08a3b1e06854aa4c35477` |
| locales-es-CL.xml | `3e25e64d5f872dc139182ca71c142d97c863c0c709d58b87c8467f86b6acfe30` |
| locales-en-US.xml | `ac864c7c21166b4390d82c31792cdc509400727fa0060b43d8aa17e07f9cb079` |

La interfaz de la app enlazará a este archivo y al repositorio de Mi Uni (obligación de ofrecer el código a los usuarios que interactúan por red, AGPL §13).
