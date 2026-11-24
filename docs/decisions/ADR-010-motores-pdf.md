# ADR-010 — Motores PDF: @cantoo/pdf-lib + pdf.js

- **Estado:** **aceptada** por el dueño (24-nov-2026), con estas condiciones:
  1. versiones fijas en `js/vendor/VERSIONS.md`, licencias, SHA-256 y fuente exacta en `LICENSES.md`;
  2. prueba que falle si la opción de pdf-lib que ignora el cifrado aparece en cualquier archivo del repo;
  3. guarda de salida al unir/editar;
  4. riesgo de mantenimiento del fork y plan de reemplazo anotados (abajo).
  Medido en Chromium 158, Firefox 155 y WebKit 26.6; **iPhone y PDFs reales pendientes**.
- **Contexto:** el motor PDF compartido (INSTRUCTIONS Fase 2.1) necesita **editar** (unir, dividir, rotar, formularios, marcas) y **ver** (miniaturas, vista previa). Ghostscript (ADR-002) solo comprime. Datos en `spikes/s12-pdf/README.md`.

## Opciones
| Opción | Versión | Licencia | Peso gzip | Mantenimiento | Cifrados |
|---|---|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | 206 KB | sin publicar desde 2021 | No descifra; ignorar el cifrado → **páginas en blanco sin error** |
| **@cantoo/pdf-lib** | **2.11.1** | MIT | 252 KB | activo (versión del 15-sep-2026; commits hasta el 18-nov-2026) | ✅ descifra con `password` |
| **pdf.js** (`pdfjs-dist`) | **6.5.438** | Apache-2.0 (wasm: BSD-2 OpenJPEG, BSD-3 JBIG2/PDFium, MIT qcms) | 136 + 378 + 147 KB | activo (Mozilla) | ✅ con contraseña |

Las licencias son compatibles con AGPL-3.0 (Apache-2.0 es compatible con GPLv3/AGPLv3).

## Decisión
1. **Edición: `@cantoo/pdf-lib` 2.11.1** en `js/vendor/cantoo-pdf-lib-2.11.1/` (`pdf-lib.esm.min.js`, ES module, sin importaciones sueltas ni `eval`). En los 3 motores une 3×28 MB en 0,6–1,2 s.
2. **Visualización: pdf.js 6.5.438** en `js/vendor/pdfjs-6.5.438/`: `pdf.min.mjs`, `pdf.worker.min.mjs` y `wasm/` (JBIG2, OpenJPEG, qcms) para escaneos. Las fuentes estándar quedan **fuera** (con `useSystemFonts`, el valor por defecto, no hacen falta); siguen solo en `spikes/s12-pdf/vendor/` para evaluar y se añaden con aprobación si un PDF real lo exige.
3. **Worker de pdf.js según ADR-004:** `blob:` con `lockdown.js` primero; `isEvalSupported: false`; `useWorkerFetch: false` (la página entrega wasm y fuentes); se cierra con `loadingTask.destroy()`.
4. **Prohibido ignorar el cifrado.** La carga pasa por `safeLoad`, que solo acepta las opciones `password` y `updateMetadata` (lista blanca). `tests/policy/no-ignore-encryption.test.mjs` recorre **todos** los archivos del repo (código y documentación) y falla si aparece el nombre de esa opción. Única excepción: el propio paquete vendorizado, que la define, con un número fijo de apariciones (4) para detectar cambios al actualizar.
5. **PDFs cifrados (decisión del dueño):** `openForEdit` en `pdf-open.js`.
   - **Solo restricciones del propietario** (abre sin contraseña): se **avisa y se pide confirmación**: «Este PDF tiene restricciones de su autor… ¿Es tuyo o tienes permiso para modificarlo?». Se informa de que el resultado no conservará las restricciones y de que el original no se toca. **Solo con un «Sí» explícito se procede**; cerrar el diálogo cuenta como «No». Sin confirmación no se modifica nada y se ofrecen alternativas: verlo y leerlo (ver no modifica), o pedir al autor una copia sin restricciones.
   - **Contraseña de apertura:** se pide al usuario (3 intentos). **Nunca se intenta saltar ni adivinar.** Sin contraseña, mensaje claro.
   - Ver (miniaturas, vista previa) no modifica el PDF: pdf.js abre los restringidos sin preguntar y pide contraseña si hace falta.
6. **Guarda de entrada y de salida** (`output-guard.js`):
   - **Entrada:** cada página se clasifica como `contenido`, `vacia` (en blanco a propósito) o `ilegible` (el contenido falta, no se decodifica o es basura binaria). Un PDF con páginas ilegibles **no se procesa**: «El PDF está dañado: N de M páginas no se pueden leer». Motivo: S12 mostró que @cantoo/pdf-lib abre un PDF truncado **sin error** (21 de 30 páginas sin contenido).
   - **Salida:** antes de entregar se **reabre** el PDF generado, se comprueba el **número de páginas esperado** y que **ninguna página quedó vacía** si su página de origen tenía contenido. Si falla, **no se entrega** y se avisa: «El resultado no pasó la comprobación y no se ha entregado. Tus archivos originales no se han modificado.»
   - Es estructural (decodifica los content streams y busca operadores de dibujo), no rasteriza. Coste medido: 22–99 ms; memoria dentro del ruido de medición.
7. **Memoria (decisión del dueño):** la política de ADR-003 se extiende a la Caja PDF (`pdf-memory.js`):
   - presupuesto 1/3 de la RAM (3 GB supuestos en móvil si no hay `deviceMemory`);
   - niveles ok / aviso / bloqueo;
   - aprendizaje de cierres;
   - estimación **provisional `pico ≈ 8 × entrada`**, porque S12 midió de 3,9 a 7,9× (WebKit ~7×).
   Con 3 GB supuestos (iPhone): sin aviso hasta 64 MB de entrada, con aviso hasta 128 MB, bloqueo por encima. Unir 3×28 MB (84 MB) → aviso. **Se recalibra con el iPhone del dueño.**
8. **Miniaturas perezosas (decisión del dueño):**
   - solo se dibujan las visibles (IntersectionObserver con 150 px de margen), una a la vez;
   - lado mayor ≤ 120 px CSS × `devicePixelRatio` (máx. 2), es decir, ≤ 240 px reales;
   - las que salen de pantalla se liberan (canvas a 0×0 y `page.cleanup()`).
   Medido: al abrir dibuja 35 de 100 (1,3 / 1,4 / 2,0 s en vez de 3,2 / 3,4 / 4,2 s) y retiene como máximo 49 canvases. El pico de memoria apenas cambia (−0 a −11 %): lo dominan los datos del PDF y la decodificación de imágenes dentro de pdf.js, no los canvases.
9. **Validación:** todo PDF generado pasa la guarda de salida antes de entregarlo, como el guard del compresor.

## Riesgo de mantenimiento del fork y plan de reemplazo
- **Riesgo:** `@cantoo/pdf-lib` es el fork de una empresa pequeña (Cantoo), no de la comunidad original.
  - **Hallazgo:** el `gitHead` del paquete npm 2.11.1 (`c8c88e84…`) **no existe en el repositorio público**: GitHub responde «not our ref». El último tag público es `v2.9.2`, y `master` (`e2c09ed`, 18-nov-2026) declara la versión 2.11.0. La fuente exacta de 2.11.1 está en el propio paquete npm: incluye `src/`, con 316 archivos TypeScript. Licencia MIT: no hay obligación de publicar la fuente, pero la conservamos trazable (integridad del tarball en `LICENSES.md`).
- **Señales a vigilar** (en cada revisión de dependencias):
  - un año sin versiones;
  - incidencias de seguridad sin respuesta;
  - cambio de licencia;
  - versiones publicadas sin código en GitHub.
- **Plan de reemplazo**, en orden:
  1. Nuestro código usa la Caja PDF solo a través de `engines/pdf` (el envoltorio de la Fase 2.1). Ningún módulo importa pdf-lib directamente, así que cambiar de motor toca un solo archivo.
  2. **Volver a `pdf-lib` 1.17.1** (misma API): se pierde el descifrado. Los PDFs restringidos o con contraseña se rechazarían con mensaje claro en vez de procesarse; la guarda de entrada evita las páginas en blanco.
  3. **Fork propio** desde el `src/` del tarball 2.11.1 (MIT), solo con parches de seguridad.
  4. Alternativa más pesada: hacer las operaciones de página con Ghostscript (ya vendorizado, AGPL), a costa de memoria y tiempo.
- Las pruebas de `spikes/s12-pdf/test/` (apertura con permiso, guarda, memoria) sirven como pruebas de aceptación para cualquier sustituto.

## Consecuencias
- La familia PDF sin Ghostscript pesa ≈ 913 KB gzip, cargada solo bajo demanda.
- `pdf-lib` 1.17.1 sale del repo. Su medición queda en el historial (commit `722223f`) y en el README de S12.
- **Pendiente de dispositivo:** memoria real en el iPhone al unir y renderizar (recalibrar el factor 8×); escaneos JBIG2/JPX reales; reordenar arrastrando (Fase 2).
