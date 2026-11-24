# Licencias de terceros

Resumen de licencias de todo lo redistribuido. El detalle (versión exacta, peso, motivo, alternativa) está en [`js/vendor/VERSIONS.md`](js/vendor/VERSIONS.md).
Proyecto: **AGPL-3.0-only** (obligado por Ghostscript; ver `CONTEXT.md` §6).

| Componente | Licencia | Compatible con AGPL-3.0 | Notas |
|---|---|---|---|
| Ghostscript 10.06.0 vía `@okathira/ghostpdl-wasm` 1.1.0 | AGPL-3.0-or-later | Sí (obliga a AGPL en todo el proyecto) | Ver sección «Código fuente correspondiente» abajo; Artifex ofrece licencia comercial |
| citeproc-js 2.4.63 | CPAL-1.0 **o** AGPL-3.0-or-later (a elección): **se usa AGPL-3.0-or-later** | Sí | Ver «Código fuente correspondiente» abajo |
| Estilos y locales CSL | CC BY-SA 3.0 | Sí (datos con licencia propia; atribución y misma licencia en derivados) | `apa-es.csl` derivado de `apa.csl`, también CC BY-SA 3.0; ver `js/vendor/csl/README.md` |
| `@cantoo/pdf-lib` 2.11.1 | MIT | Sí | Ver «Código fuente correspondiente» abajo |
| pdf.js (`pdfjs-dist` 6.5.438) | Apache-2.0; wasm OpenJPEG (BSD-2), JBIG2 de PDFium (BSD-3), qcms (MIT) | Sí (Apache-2.0 compatible con AGPL-3.0) | Ver «Código fuente correspondiente» abajo; licencias de los wasm en `js/vendor/pdfjs-6.5.438/wasm/` |
| Inter 4.001 (fuente) | SIL Open Font License 1.1 | Sí (la OFL permite incluirla en software de cualquier licencia; no se vende sola) | Ver «Código fuente correspondiente» abajo |

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

### @cantoo/pdf-lib — `js/vendor/cantoo-pdf-lib-2.11.1/` (ADR-010)
`pdf-lib.esm.min.js` es `dist/pdf-lib.esm.min.js` del paquete npm, **sin modificar**.

| Pieza | Fuente exacta | Verificación |
|---|---|---|
| Paquete npm **2.11.1** (15-sep-2026) | https://registry.npmjs.org/@cantoo/pdf-lib/-/pdf-lib-2.11.1.tgz — integridad `sha512-lYuRJFfXgoP8WVE8HYSeoLfDcnSXmjMLmdZS7YvmYHngbcZfiqDOruHrZBqjYizkrNa4ad1yW4WCrPYyb26T3Q==`. **El tarball incluye el código fuente TypeScript (`src/`, 316 archivos)**: es la fuente exacta de esta versión | `dist/pdf-lib.esm.min.js` del tarball tiene el mismo SHA-256 que el vendorizado (comprobado) |
| Repositorio | https://github.com/cantoo-scribe/pdf-lib | El `gitHead` declarado (`c8c88e84dcd5510ec35921123bb5140fe02a7115`) **no está publicado** (GitHub: «not our ref»); último tag público `v2.9.2`; `master` `e2c09ed` (18-nov-2026) declara 2.11.0. Riesgo anotado en ADR-010 |

SHA-256:
- `pdf-lib.esm.min.js`: `ac197f002ca7b6f7789334be108ee13a97928b561eafa774d303d43bb7dd7fd1`
- `LICENSE.md`: `f2c9fc00fdb66eb99ac156ba52d734af66d8d309f65753ae809ad34ee2883bcb`

### pdf.js — `js/vendor/pdfjs-6.5.438/` (ADR-010)
Archivos de `pdfjs-dist` 6.5.438 **sin modificar** (`build/pdf.min.mjs`, `build/pdf.worker.min.mjs`, `wasm/`, `LICENSE`).

| Pieza | Fuente exacta | Verificación |
|---|---|---|
| pdf.js **6.5.438** | https://github.com/mozilla/pdf.js/tree/v6.5.438 — tag `v6.5.438`, commit `0a4153349dc473ba950fc17941c5ca7eda43c1de` | El tag apunta al `gitHead` del paquete npm (comprobado con `git ls-remote`) |
| Paquete npm | https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.5.438.tgz — integridad `sha512-vg8Pw1x+AFKy4AMDvhuWl5cOYV8d698UoEANoFFhc79hqXDnZQqnOXoxw3HG907WHOg1JYOvLhP756boddFxpA==` | `npm view pdfjs-dist@6.5.438 dist.integrity` |
| wasm (OpenJPEG, JBIG2 de PDFium, qcms) | Compilados por Mozilla desde el mismo tag; licencias y avisos en `wasm/LICENSE_*` | — |

| Archivo | SHA-256 |
|---|---|
| pdf.min.mjs | `3a88402882cfa3e7e72c2c9b5149f52f0f88baf1c5b62aa11a41abdbc2072440` |
| pdf.worker.min.mjs | `1e64c8240e54735ec5913b37acd5134747799cb8c6bb3777c70adbc01232d2aa` |
| LICENSE | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` |
| wasm/jbig2.wasm | `466f45c2a61a698152fb5400c27e56ff2ceb73dcb71fde3fc366a502308eaab0` |
| wasm/openjpeg.wasm | `7ea4b2b04613370ad4e9c1162da750cc88b4b176eac0d0c164b3caff23fc0a46` |
| wasm/qcms_bg.wasm | `663d86126d5f5fcb1c61490f94353e2a8375660b8c5498ab3ebab5a34b08800e` |
| wasm/LICENSE_JBIG2 | `9e66b7f1b934a28b37f3bc4dac97915de1674271e79a0a88182a18ed9731b4d1` |
| wasm/LICENSE_OPENJPEG | `a6af136f3e15038a666b61f376612a07d9a4e48cb7c01adbf3e33b3f14ab49b6` |
| wasm/LICENSE_PDFJS_JBIG2 | `aad3cce09842e00e9e11ad5e8fef8cc02fbc3a3768fe2f007443b9cee37aaee5` |
| wasm/LICENSE_PDFJS_OPENJPEG | `717fc62da03292dbb4dd0c8280bd4ce7bb8550dcf31d772bc93455fb50313425` |
| wasm/LICENSE_PDFJS_QCMS | `508a77d2e7b51d98adeed32648ad124b7b30241a8e70b2e72c99f92d8e5874d1` |
| wasm/LICENSE_QCMS | `36d847ae882f6574ebc72f56a4f354e4f104fde4a584373496482e97d52d31bc` |

### Inter — `js/vendor/inter-4.001/` (ADR-013)
`inter-latin-wght-normal.woff2`: subconjunto latino (U+0000–00FF y signos comunes) de la fuente variable Inter, eje `wght` 100–900, versión **4.001** (`git-66647c0bb`), **sin modificar**, tal como lo publica Fontsource. `OFL.txt` es la licencia del paquete.

| Pieza | Fuente exacta | Verificación |
|---|---|---|
| Inter 4.001 | https://github.com/rsms/inter/tree/66647c0bbbe41a850d79d9c76fb13add3378940f (commit del que se compiló, 24-may-2024; antecesor del tag `v4.1`); copyright 2016 The Inter Project Authors | La tabla `name` de la fuente dice «Version 4.001;git-66647c0bb»; el commit existe y es antecesor de `v4.1` (comprobado con git) |
| Paquete npm | https://registry.npmjs.org/@fontsource-variable/inter/-/inter-5.3.0.tgz — integridad `sha512-OupL48va4JNofb97w6NYeF9S7W/kHNKM0Er8Dem5nqi4jeOLrVJDoE8tZEpnMJmtkvNbB1EIPPwHcdkF6b1oUA==` | `npm view @fontsource-variable/inter@5.3.0 dist.integrity` |

SHA-256:
- `inter-latin-wght-normal.woff2`: `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62`
- `OFL.txt`: `3b0a5fca3d17942cde889069889dedbbbd075e9b599968c82a95f4d944e9b345`

La interfaz de la app enlazará a este archivo y al repositorio de Mi Uni (obligación de ofrecer el código a los usuarios que interactúan por red, AGPL §13).
