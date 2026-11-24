# Dependencias vendorizadas

Regla (INSTRUCTIONS §0.6): versión exacta, licencia, peso, motivo y alternativa. Sin CDN en producción.

| Paquete | Versión | Licencia | Peso (bruto / gzip) | Motivo | Alternativa | Estado |
|---|---|---|---|---|---|---|
| `@okathira/ghostpdl-wasm` (Ghostscript 10.06.0) | 1.1.0 | AGPL-3.0-or-later | 15,53 MB / 11,08 MB (wasm) + 38 KB / 14 KB (js) | Compresor de PDF (`pdfwrite`) | Build propio con Emscripten; `@bentopdf/gs-wasm` | Spike S1 ⚠️ |
