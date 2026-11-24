# ADR-006 — Almacenamiento de proyectos, exportación ZIP y respaldo

- **Estado:** **aceptada como provisional** por el dueño (24-nov-2026) con tres condiciones, ya incorporadas abajo. Pasa a definitiva tras medir en el iPhone.
- **Implementación (Fase 1, bloque 3):** `js/core/proyectos.js`, `zip.js` y `respaldo.js`, con las tres condiciones. Medido en la app: trozos de 8 MB verificados, ZIP exportado e importado idéntico, ZIP dañado rechazado sin dejar nada, limpieza tras un corte, e importación de 200 MB con un pico de +258 / +171 / +141 MB (Chromium / Firefox / WebKit). Sigue provisional hasta la prueba de 8 días en el iPhone (hasta el 2-dic-2026).
- **Contexto:** los proyectos guardan PDFs e imágenes de decenas de MB en el navegador (CONTEXT §8.6). Hay que poder exportarlos e importarlos como ZIP (~200 MB) sin servidor, y el navegador puede borrar los datos (Safari) o quedarse sin espacio. Datos en `spikes/s11-almacenamiento/README.md`.

## Decisión
1. **IndexedDB con tres almacenes:** `proyectos`, `recursos` (metadatos, tamaño y **CRC-32**) y `trozos` (los datos en **trozos de 8 MB**, clave `[recursoId, i]`, cada uno con su tamaño y CRC). El CRC se calcula al guardar. *(Condición 2 del dueño.)*
2. **Nunca guardar un `slice()` de un `File`:** se copia antes con `arrayBuffer()` (bug de WebKit: se relee el archivo entero). Un `File` completo sí se guarda directo. `core/storage.js` aplica la regla siempre (no por detección de navegador).
3. **Verificar después de escribir — regla permanente** *(condición 1 del dueño)*: cada trozo guardado en IndexedDB se relee y se compara (tamaño y CRC) antes de confirmarlo; el recurso solo se registra cuando todos sus trozos pasaron; si no, se borra lo escrito y se informa. Ningún módulo puede guardar archivos en IndexedDB sin pasar por esta ruta de `core/storage.js`.
4. **ZIP propio (`core/zip.js`, ~2,4 KB gzip, sin dependencias):** escritura STORE componiendo Blobs (exportar 200 MB: < 1 s, +0–10 MB de memoria); lectura STORE y DEFLATE (`DecompressionStream`). Sin ZIP64: > 4 GiB o > 65.535 archivos → error claro y "exportar por partes". Se descarta `fflate` (21,5 KB gzip) por innecesario.
5. **Formato del ZIP:** `proyecto.json` (`formato: "mi-uni-proyecto/1"`, proyecto y recursos con ruta, tamaño y CRC) + `archivos/<id>-<nombre>`.
6. **Importación archivo por archivo y trozo por trozo** *(condición 2)*: proyecto marcado `importando` → cada archivo se copia y escribe en trozos de 8 MB, calculando su CRC mientras se escribe (el ZIP se lee una vez) → si un CRC no coincide se borra todo → se quita la marca. Al arrancar se borran proyectos con `importando` y trozos sin recurso. Pico medido con 200 MB: +133 a +173 MB (antes +279 a +647 MB). Si el id existe, importar como copia con ids nuevos.
7. **Espacio:** `storage.estimate()` solo como guía (en WebKit `usage` = 0); la cuenta propia sale de `recursos`; capturar `QuotaExceededError` y abortar la transacción con mensaje claro.
8. **Respaldo ZIP = requisito de producto** *(condición 3)*: cada proyecto guarda `modificado` y `ultimoRespaldo`; la app muestra la fecha del último respaldo y avisa si hay cambios sin exportar desde hace ≥ 7 días (configurable en Ajustes) o datos nunca exportados (`backup-policy.js`). `persist()` se pide con un gesto y explicación, sin depender de él. En iPhone, aviso de que instalar la app en la pantalla de inicio puede reducir el riesgo de borrado (a confirmar).

9. **Navegación privada:** si guardar un Blob falla (WebKit efímero da error `null`), mensaje específico y la herramienta sigue funcionando sin proyecto.

## Consecuencias
- Con trozos de 8 MB la memoria de importar ya no depende del tamaño del archivo; queda medir el pico real en el iPhone.
- La verificación después de escribir duplica las lecturas al guardar/importar (Firefox: importar 200 MB pasa de 7,8 a 9,6 s); se mantiene por seguridad de datos.
- Pendiente en iPhone: cuota real, `QuotaExceededError`, borrado tras 7 días, exención de la app instalada y memoria al importar 200 MB.
