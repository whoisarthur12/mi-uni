# S11 — Proyectos y almacenamiento

**Veredicto: ⚠️ viable con condiciones** — IndexedDB guarda y relee blobs de 5–80 MB y proyectos de 200 MB en Chromium 158, Firefox 155 y WebKit 26.6 (Linux), y el ZIP de exportación se importa idéntico en un perfil limpio. Condiciones: un **bug de WebKit** obliga a copiar los datos antes de guardarlos, `storage.estimate()` **no sirve en WebKit**, y la política de borrado y la cuota de Safari iOS **siguen sin medir** en un iPhone. Decisión propuesta: [ADR-006](../../docs/decisions/ADR-006-almacenamiento-y-respaldo.md).

## Pregunta
¿Se pueden guardar archivos de decenas de MB en IndexedDB y exportar/importar un proyecto de ~200 MB a ZIP en el navegador, con qué tiempos y memoria, y qué pasa con la cuota, `persist()` y el borrado automático?

## Método
- Página `index.html` (también para el celular: "Copiar resultados"). Datos **aleatorios** (incompresibles, como PDF/JPEG), nunca datos del usuario.
- `js/zip.js`: ZIP **propio, sin dependencias** (STORE para escribir; STORE y DEFLATE vía `DecompressionStream` para leer). El CRC-32 se calcula **al guardar** cada recurso, así exportar es solo componer Blobs (sin copiar datos). 5 pruebas en Node (`node --test spikes/s11-almacenamiento/test/zip.test.mjs`), incluida la validación del ZIP con `zipfile` de Python y la lectura de un ZIP DEFLATE hecho por Python.
- `js/store.js`: almacenes `proyectos`, `recursos` (metadatos + CRC) y `blobs`; exportar/importar proyecto.
- `runner/s11run.cjs` en los 3 motores con **perfil persistente en disco** (un `newContext()` de Playwright es tipo incógnito y guarda IndexedDB en memoria: la primera medición daba 25 MB usados para 200 MB guardados). Memoria = pico de RSS de todos los procesos del navegador.

## Resultados

### Blobs sueltos (ms; "guardar" incluye calcular el CRC)

| Motor | 5 MB CRC / guardar / leer | 30 MB | 80 MB | Pico RSS |
|---|---|---|---|---|
| Chromium 158 | 25 / 32 / 5 | 129 / 174 / 24 | 336 / 448 / 57 | +374 MB |
| Firefox 155 | 44 / 96 / 23 | 340 / 458 / 109 | 1.040 / 1.377 / 306 | +410 MB |
| WebKit 26.6 | 49 / 38 / 13 | 245 / 169 / 69 | 654 / 565 / 352 | +667 MB |

Releídos byte a byte: correctos en los 3. CRC-32 en JS: ~240 MB/s (Chromium) a ~80 MB/s (Firefox).

### Proyecto de 200 MB (5 archivos: 80+80+30+5+5)

| Motor | Crear | Exportar ZIP (y descargar) | Importar (verifica CRC antes y después) | Pico RSS importar | Perfil limpio | ZIP dañado |
|---|---|---|---|---|---|---|
| Chromium | 1,6 s | 0,84 s, +10 MB | 2,5 s | +279 MB | 2,5 s ✅ | rechazado en 0,7 s |
| Firefox | 4,2 s | 0,98 s, +4 MB | 7,8 s | +372 MB | 7,0 s ✅ | rechazado en 2,6 s |
| WebKit | 2,7 s | 0,50 s, +0 MB | 3,1 s | +640 MB | 3,0 s ✅ | rechazado en 0,8 s |

- El ZIP pasa `zipfile.testzip()` de Python en los 3. Importado = original (nombre, tamaño y CRC releído de IndexedDB).
- **Importación interrumpida** (navegador cerrado a mitad): al reabrir quedaba 1 proyecto con marca `importando`; la limpieza de arranque lo borra y quedan 0 blobs huérfanos, en los 3.
- Reimportar el mismo ZIP en el mismo navegador crea una **copia** con ids nuevos (sin colisiones).

### Hallazgos
1. **Bug de WebKit:** un `slice()` de un `File` guardado en IndexedDB **se relee como el archivo entero** (`size` = 5 MB, `arrayBuffer()` = 209 MB). También si se envuelve en `new Blob([slice])`. Un `File` completo o un slice copiado con `arrayBuffer()` se guardan bien y **sobreviven a que se borre el archivo original** (Chromium y Firefox: sin bug). Sin la corrección, 3 de 5 archivos importados quedaban dañados sin ningún error.
2. **`storage.estimate()` en WebKit:** `usage` siempre 0 y `quota` 1.000 MB, pero guardó **1.500 MB sin error**. No sirve para avisar de espacio en WebKit; hay que capturar `QuotaExceededError` y llevar la cuenta propia (los tamaños están en `recursos`).
3. **`persist()`:** `false` en Chromium y WebKit sin interacción ni instalación; en Firefox queda **pendiente** (pide permiso). No se puede contar con él.
4. Exportar no cuesta memoria (+0–10 MB) gracias al CRC precalculado. Importar sí (copia de un archivo a la vez + recolección de basura tardía): +280 a +640 MB de pico en escritorio. **Es el riesgo en iPhone.**
5. **WebKit en sesión efímera** (contexto de Playwright sin perfil, equivalente a la navegación privada de Safari): guardar un Blob en IndexedDB falla con error `null` (perfil persistente: bien). La app debe detectarlo y decir "en navegación privada no se pueden guardar archivos". Confirmar en Safari iOS privado.
6. ZIP propio: 2,4 KB gzip (`zip.js`) frente a 21,5 KB gzip de `fflate` 0.8.2 (MIT). No hace falta la dependencia; límite asumido: sin ZIP64 (máx. 4 GiB y 65.535 archivos por proyecto, con error claro).

### No verificado
- **Safari iOS:** cuota real, borrado tras 7 días sin uso y si las apps en pantalla de inicio están exentas. Lo que se sabe viene de publicaciones de WebKit; `webkit.org` está bloqueado en la red de esta sesión y no pude citarlas. Además, WebKit en Linux no reproduce las políticas de iOS. → Medir en el iPhone con esta página (y repetirla a los 8 días sin abrirla).
- Safari iOS en navegación privada (ver hallazgo 5).
- `QuotaExceededError` en Chromium/Firefox (cuota de 10 GB: no se llenó).

## Cómo probar en el celular
Abrir la página (cuando Pages esté activo: `https://whoisarthur12.github.io/mi-uni/spikes/s11-almacenamiento/`), pulsar "Medir 5 / 30 / 80 MB", luego "Crear proyecto de 200 MB y exportar ZIP", importar el ZIP descargado con "Importar ZIP", y "Copiar resultados". "Borrar datos" libera el espacio.

## Reproducir
```bash
node spikes/s10-plataforma/runner/pages-server.cjs
```
```bash
OUTDIR=/tmp/s11 node spikes/s11-almacenamiento/runner/s11run.cjs
```
