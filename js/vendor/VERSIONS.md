# Dependencias vendorizadas

Regla (INSTRUCTIONS §0.6): versión exacta, licencia, peso, motivo y alternativa. Sin CDN en producción.

| Paquete | Versión | Licencia | Peso (bruto / gzip) | Motivo | Alternativa | Estado |
|---|---|---|---|---|---|---|
| `@okathira/ghostpdl-wasm` (Ghostscript 10.06.0) | 1.1.0 | AGPL-3.0-or-later | 15,53 MB / 11,08 MB (wasm) + 38 KB / 14 KB (js) | Compresor de PDF (`pdfwrite`) | Build propio con Emscripten; `@bentopdf/gs-wasm` | **Fijada (ADR-002 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** SHA-256 en `LICENSES.md` |
| `citeproc` (citeproc-js) | **2.4.63** | AGPL-3.0-or-later (elegida de "CPAL-1.0 o AGPL-3.0-or-later"; npm declara "AGPL-1.0" por error) | 967 KB / 191 KB | Motor CSL del gestor de fuentes | citation-js 0.9.0 (lo usa por dentro; más pesado) | **Fijada (ADR-008 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** En `js/vendor/citeproc-2.4.63/`. Parche de 1 línea (`module.exports` → `export default`). Fuente y SHA-256 en `LICENSES.md` |
| Estilos y locales CSL (APA 7, IEEE, MLA, Chicago autor-fecha, Harvard, NLM; es-ES, es-MX, es-CL, en-US) | estilos `7fa488bd2f765eb161e93c7963838ee2c9c17fe5`, locales `21a175a1d84cc1792dd73f5a627de004fba5b207` | CC BY-SA 3.0 | APA 13 KB gzip; locale ~4–6 KB gzip | Formatos de cita | — | **Fijados (ADR-008).** En `js/vendor/csl/`. `apa-es.csl` = derivado **PROVISIONAL** (CC BY-SA 3.0) |
| `@cantoo/pdf-lib` (fork de pdf-lib) | **2.11.1** | MIT | 614 KB / 252 KB | Edición PDF: unir, dividir, formularios, descifrar con permiso | `pdf-lib` 1.17.1 (sin mantenimiento; ignorar el cifrado deja páginas en blanco) — plan de reemplazo en ADR-010 | **Fijada (ADR-010 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** En `js/vendor/cantoo-pdf-lib-2.11.1/`. Fuente y SHA-256 en `LICENSES.md` |
| `pdfjs-dist` (pdf.js) | **6.5.438** | Apache-2.0 (wasm: BSD-2, BSD-3, MIT) | 1,75 MB / 514 KB (+ wasm 421 KB / 147 KB) | Visualizar: miniaturas, vista previa | — | **Fijada (ADR-010 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** En `js/vendor/pdfjs-6.5.438/` (sin fuentes estándar: solo en `spikes/s12-pdf/vendor/` para evaluar). Fuente y SHA-256 en `LICENSES.md` |

## Política de carga
- Las dependencias pesadas (Ghostscript WASM y similares) se cargan **solo bajo demanda**, al abrir el módulo que las usa. **Nunca en el arranque** ni en el precache del shell.
- Una sola copia por versión en `js/vendor/<paquete>-<versión>/`. Si hay que cambiar de versión, se crea una carpeta nueva y se borra la vieja en el mismo commit, previa aprobación.
