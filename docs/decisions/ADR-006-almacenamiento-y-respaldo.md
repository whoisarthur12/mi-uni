# ADR-006 — Almacenamiento de proyectos, exportación ZIP y respaldo

- **Estado:** propuesta (medida en Chromium 158, Firefox 155 y WebKit 26.6 sobre Linux; **Safari iOS real pendiente**)
- **Contexto:** los proyectos guardan PDFs e imágenes de decenas de MB en el navegador (CONTEXT §8.6). Hay que poder exportarlos e importarlos como ZIP (~200 MB) sin servidor, y el navegador puede borrar los datos (Safari) o quedarse sin espacio. Datos en `spikes/s11-almacenamiento/README.md`.

## Decisión
1. **IndexedDB con tres almacenes:** `proyectos`, `recursos` (metadatos, tamaño y **CRC-32**) y `blobs` (los datos, un registro por recurso). El CRC se calcula al guardar.
2. **Nunca guardar un `slice()` de un `File`:** se copia antes con `arrayBuffer()` (bug de WebKit: se relee el archivo entero). Un `File` completo sí se guarda directo. `core/storage.js` aplica la regla siempre (no por detección de navegador).
3. **Verificar después de escribir:** tras guardar, se relee el blob desde IndexedDB y se compara tamaño y CRC. Coste: una lectura extra (80 MB: 0,06–0,35 s de lectura + CRC). Detectó el bug anterior; detectará el próximo.
4. **ZIP propio (`core/zip.js`, ~2,4 KB gzip, sin dependencias):** escritura STORE componiendo Blobs (exportar 200 MB: < 1 s, +0–10 MB de memoria); lectura STORE y DEFLATE (`DecompressionStream`). Sin ZIP64: > 4 GiB o > 65.535 archivos → error claro y "exportar por partes". Se descarta `fflate` (21,5 KB gzip) por innecesario.
5. **Formato del ZIP:** `proyecto.json` (`formato: "mi-uni-proyecto/1"`, proyecto y recursos con ruta, tamaño y CRC) + `archivos/<id>-<nombre>`.
6. **Importación en 3 fases:** verificar todo el ZIP (tamaño + CRC, sin escribir) → escribir un archivo por transacción con el proyecto marcado `importando` → quitar la marca. Al arrancar, borrar proyectos con `importando` (medido: limpia todo tras cerrar el navegador a mitad). Si el id existe, importar como copia con ids nuevos.
7. **Espacio:** `storage.estimate()` solo como guía (en WebKit `usage` = 0); la cuenta propia sale de `recursos`; capturar `QuotaExceededError` y abortar la transacción con mensaje claro.
8. **Respaldo (por el riesgo de borrado en Safari):** `persist()` pedido con un gesto del usuario y explicación, sin depender de él; **recordatorio de exportar** cada 7 días con cambios sin exportar (fecha del último respaldo por proyecto); aviso fijo en iPhone de que instalar la app en la pantalla de inicio reduce el riesgo (a confirmar en el iPhone).

## Consecuencias
- Importar cuesta memoria del tamaño del archivo más grande (copia) y en escritorio el pico llegó a +640 MB (WebKit) por recolección de basura tardía. **En iPhone es el principal riesgo:** si la medición real falla, plan B = guardar archivos grandes en trozos de 8–16 MB (un registro por trozo) para que la copia nunca supere un trozo.
- La verificación después de escribir duplica las lecturas al guardar/importar; se mantiene por seguridad de datos.
- Pendiente en iPhone: cuota real, `QuotaExceededError`, borrado tras 7 días, exención de la app instalada y memoria al importar 200 MB.
