# Dependencias vendorizadas

Regla (INSTRUCTIONS §0.6): versión exacta, licencia, peso, motivo y alternativa. Sin CDN en producción.

| Paquete | Versión | Licencia | Peso (bruto / gzip) | Motivo | Alternativa | Estado |
|---|---|---|---|---|---|---|
| `@okathira/ghostpdl-wasm` (Ghostscript 10.06.0) | 1.1.0 | AGPL-3.0-or-later | 15,53 MB / 11,08 MB (wasm) + 38 KB / 14 KB (js) | Compresor de PDF (`pdfwrite`) | Build propio con Emscripten; `@bentopdf/gs-wasm` | **Fijada (ADR-002 aprobado 24-nov-2026). No actualizar sin aviso al dueño.** SHA-256 en `LICENSES.md` |

## Política de carga
- Las dependencias pesadas (Ghostscript WASM y similares) se cargan **solo bajo demanda**, al abrir el módulo que las usa. **Nunca en el arranque** ni en el precache del shell.
- Una sola copia por versión en `js/vendor/<paquete>-<versión>/`. Si hay que cambiar de versión, se crea una carpeta nueva y se borra la vieja en el mismo commit, previa aprobación.
