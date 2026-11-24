# ADR-010 — Motores PDF: @cantoo/pdf-lib + pdf.js

- **Estado:** propuesta (medida en Chromium 158, Firefox 155 y WebKit 26.6; iPhone y PDFs reales pendientes). **Añade dependencias: requiere aprobación** antes de pasar de `spikes/s12-pdf/vendor/` a `js/vendor/`.
- **Contexto:** el motor PDF compartido (INSTRUCTIONS Fase 2.1) necesita **editar** (unir, dividir, rotar, formularios, marcas) y **ver** (miniaturas, vista previa). Ghostscript (ADR-002) solo comprime. Datos en `spikes/s12-pdf/README.md`.

## Opciones
| Opción | Versión | Licencia | Peso gzip | Mantenimiento | Cifrados |
|---|---|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | 206 KB | sin publicar desde 2021 | No descifra; `ignoreEncryption` → **páginas en blanco sin error** |
| **@cantoo/pdf-lib** | **2.11.1** | MIT | 252 KB | activo (sep-2026) | ✅ descifra con `password` |
| **pdf.js** (`pdfjs-dist`) | **6.5.438** | Apache-2.0 (wasm: BSD-2 OpenJPEG, BSD-3 JBIG2/PDFium, MIT qcms) | 136 + 378 + 147 KB | activo (Mozilla) | ✅ con contraseña |

Las licencias son compatibles con AGPL-3.0 (Apache-2.0 es compatible con GPLv3/AGPLv3).

## Decisión propuesta
1. **Edición: `@cantoo/pdf-lib` 2.11.1** (`dist/pdf-lib.esm.min.js`, ES module, sin importaciones sueltas ni `eval`). En los 3 motores une 3×28 MB igual de rápido que pdf-lib (0,6–1,2 s) y con un pico algo menor.
2. **Visualización: pdf.js 6.5.438.** `pdf.min.mjs` y `pdf.worker.min.mjs`, más `wasm/` (JBIG2, OpenJPEG, qcms) para escaneos. Las fuentes estándar quedan fuera por ahora: con `useSystemFonts` (por defecto) no hacen falta; se añaden si un PDF real lo exige.
3. **Worker de pdf.js según ADR-004:** `blob:` con `lockdown.js` primero; `isEvalSupported: false`; `useWorkerFetch: false` (la página entrega wasm y fuentes); se cierra con `loadingTask.destroy()`.
4. **Cifrados:** prohibido `ignoreEncryption`. Abrir con `password: ''` (PDF cifrado solo por el propietario). Si falla, pedir la contraseña al usuario. Si no la tiene, mensaje claro y no se procesa. **Pregunta al dueño:** ¿quitar automáticamente las restricciones de propietario al unir o editar, o avisar y pedir confirmación?
5. **Memoria:** el pico al unir es de 3,9 a 7,9 veces la entrada. Se extiende la política de ADR-003 a la Caja PDF: presupuesto 1/3 de la RAM, estimado como `pico ≈ 8 × entrada_MB` (provisional, peor caso medido en WebKit), con niveles ok / aviso / bloqueo.
6. **Miniaturas diferidas:** solo se generan las visibles (IntersectionObserver), una a la vez y con progreso. WebKit bloquea ~400–470 ms por página con fotos.
7. **Validación:** todo PDF generado se reabre antes de entregarlo (mismo número de páginas, abre sin error), como el guard del compresor.

## Consecuencias
- La familia PDF sin Ghostscript pesa ≈ 913 KB gzip, cargada solo bajo demanda.
- `pdf-lib` original queda descartado. Si `@cantoo/pdf-lib` dejara de mantenerse, la API es la misma: se puede volver a pdf-lib (sin descifrado) o hacer un fork propio.
- Pendiente de dispositivo: memoria real en el iPhone al unir y renderizar; escaneos JBIG2/JPX reales.
