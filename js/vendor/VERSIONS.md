# Dependencias vendorizadas

Regla (INSTRUCTIONS §0.6): versión exacta, licencia, peso, motivo y alternativa. Sin CDN en producción.

| Paquete | Versión | Licencia | Peso (bruto / gzip) | Motivo | Alternativa | Estado |
|---|---|---|---|---|---|---|
| `@okathira/ghostpdl-wasm` (Ghostscript 10.06.0) | 1.1.0 | AGPL-3.0-or-later | 15,53 MB / 11,08 MB (wasm) + 38 KB / 14 KB (js) | Compresor de PDF (`pdfwrite`) | Build propio con Emscripten; `@bentopdf/gs-wasm` | **Fijada (ADR-002 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** SHA-256 en `LICENSES.md` |
| `citeproc` (citeproc-js) | 2.4.63 | CPAL-1.0 o AGPL-3.0-or-later (LICENSE del paquete; npm declara "AGPL-1.0" por error) | 967 KB / 191 KB | Motor CSL del gestor de fuentes | citation-js 0.9.0 (lo usa por dentro; más pesado) | **En evaluación (S5, ADR-008), pendiente de aprobación.** Hoy solo en `spikes/s5-citas/vendor/`. Parche de 1 línea: `module.exports` → `export default` |
| Estilos y locales CSL (APA 7, IEEE, MLA, Chicago, Harvard, NLM; es-ES, es-MX, es-CL, en-US) | estilos `7fa488bd`, locales `21a175a1` | CC BY-SA 3.0 | APA 13 KB gzip; locale ~4–6 KB gzip | Formatos de cita | — | **En evaluación (S5).** `apa-es.csl` derivado (CC BY-SA 3.0) |

## Política de carga
- Las dependencias pesadas (Ghostscript WASM y similares) se cargan **solo bajo demanda**, al abrir el módulo que las usa. **Nunca en el arranque** ni en el precache del shell.
- Una sola copia por versión en `js/vendor/<paquete>-<versión>/`. Si hay que cambiar de versión, se crea una carpeta nueva y se borra la vieja en el mismo commit, previa aprobación.
