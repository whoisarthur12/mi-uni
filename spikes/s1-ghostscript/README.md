# S1 — Ghostscript WASM

**Veredicto: ⚠️ viable con condiciones** (rendimiento y RAM en celular real: pendiente de medir en el dispositivo del dueño).

## Pregunta
¿Qué paquete de Ghostscript WASM usar? ¿Peso, tiempo de carga, tiempo de compresión, RAM? ¿Necesita `SharedArrayBuffer`? ¿Efecto real de `-dPassThroughJPEGImages=false`? ¿Se puede estimar el tamaño con una muestra de páginas?

## Método
- Candidatos en npm (24-nov-2026): `@jspawn/ghostscript-wasm` 0.0.2 (último cambio 2022, abandonado), `@okathira/ghostpdl-wasm` 1.1.0 (nov-2025, build reproducible en GitHub Actions con *npm provenance*), `@bentopdf/gs-wasm` 0.1.1 (fork de okathira: mismo `gs.js`, WASM casi idéntico). `ghostscript-js` es un binding nativo de Node, no sirve.
- Elegido **`@okathira/ghostpdl-wasm` 1.1.0** → **Ghostscript 10.06.0 (2025-09-09)**, ES module, sin pthreads.
- Fixtures **sintéticos** `[SINT]` generados con `gen_fixtures.py` (fotos simuladas de hojas con ruido de sensor, texto vectorial, mixto). No se versionan (pesan 165 MB); se regeneran con `python3 -I gen_fixtures.py <carpeta>`.
- Medido en Node 22 y en **Chromium headless** (Playwright) con worker `type: module` y la CSP `<meta>` prevista. Máquina: contenedor Linux x86_64, 4 vCPU, 16 GB. **No es un celular.**
- Página de medición para el teléfono del dueño: `index.html` (elige un PDF → tabla → "Copiar resultados").

## Resultados medidos

**Peso:** `gs.wasm` 15.533.045 B (**11,08 MB gzip -9**), `gs.js` 38.034 B (14 KB gzip). Fuentes e init compiladas dentro (`%rom%`), no hacen falta assets extra. Drivers: `pdfwrite`, `ps2write`, `png*`, `jpeg*`, `tiff*`, `txtwrite`, `inkcov`…

**Carga (Chromium, desde caché HTTP local, sin red):** instanciar worker + compilar WASM = **249 ms** en frío, 108–117 ms en caliente. Por la red hay que sumar la descarga de ~11 MB. **No requiere `SharedArrayBuffer`** (`crossOriginIsolated=false` y funciona) → compatible con GitHub Pages sin COOP/COEP.

**Compresión (Chromium, worker, DPI/calidad):**

| Archivo [SINT] | Entrada | Parámetros | Salida | Ratio | Tiempo | Pico RSS Chromium (base 350 MB) |
|---|---|---|---|---|---|---|
| texto 30 p | 0,02 MB | 150/60 | 0,021 MB | 0,87 | 0,38 s | 477 MB |
| fotos 2 p | 6,00 MB | 150/60 | 0,40 MB | 0,067 | 0,74 s | 507 MB |
| mixto 10 p | 24,87 MB | 150/60 | 1,02 MB | 0,041 | 1,43 s | 557 MB |
| fotos 6 p | 27,89 MB | 150/60 | 1,20 MB | 0,043 | 1,79 s | 566 MB |
| fotos 6 p | 27,89 MB | 600/30 (sin reducir) | 2,89 MB | 0,103 | 2,35 s | 589 MB |
| fotos 11 p | 79,62 MB | 150/60 | 2,19 MB | 0,028 | 3,85 s | 700 MB |
| fotos 11 p | 79,62 MB | 300/85 | 12,60 MB | 0,158 | 6,16 s | 705 MB |
| fotos 11 p | 79,62 MB | 72/40 | 0,74 MB | 0,009 | 3,38 s | 829 MB |

- Tamaño **monótono** en DPI y en calidad (30 MB a 150 DPI: q85→2,03 MB, q70→1,39, q50→1,08, q30→0,85; a q60: 300 DPI→3,56, 200→1,80, 100→0,73, 72→0,50 MB). Apto para búsqueda binaria.
- **`-dPassThroughJPEGImages=false` es imprescindible:** sin reducción de DPI, con `true` (valor por defecto) el JPEG se copia intacto → **ratio 0,80**; con `false` se recomprime → **ratio 0,10**. Cuando sí se reduce, el flag no cambia nada (la imagen se recodifica de todos modos).
- `QFactor` de `ColorImageDict` se aplica (el tamaño varía con él). La conversión calidad→QFactor usada (escala IJG) está en `gs-args.js`.
- **Reutilización:** la misma instancia acepta varios `callMain` seguidos (3 corridas OK sin reinicializar). La memoria WASM crece y **no se libera**: terminar el worker al acabar cada trabajo.
- **Cancelar:** `callMain` es síncrono; la única cancelación real es `worker.terminate()` (instantáneo, medido 0 ms). Reiniciar cuesta ~110 ms más la caché.
- **Progreso:** sin `-dQUIET`, `pdfwrite` imprime `Page N` por página → barra de progreso real.
- **Estimación por muestra (`-sPageList=1,6,11`, 3 de 11 páginas):** error del estimado **0,2–0,6 %** contra la corrida completa, en **~29 %** del tiempo. El error será mayor con PDFs heterogéneos reales.
- Salidas validadas con pypdf y pdfium: abren, conservan el nº de páginas y las imágenes bajan a la resolución pedida (3000×4000 → 1275×1699 a 150 DPI).

## Hallazgos que afectan a otras partes
1. **La CSP `<meta>` del documento NO se aplica a un worker cargado desde URL de red.** Medido: `fetch` a otro origen **bloqueado desde la página** y **permitido desde el worker**. GitHub Pages no envía cabeceras CSP. Por tanto `'wasm-unsafe-eval'` tampoco hace falta dentro del worker. → Se investiga en S10 (workers `blob:` que heredan la CSP y/o bloqueo de `fetch` dentro del worker) y se registra en ADR.
2. La CSP `<meta>` bloquea `<style>` inline (`default-src 'self'`): el CSS debe ir en archivos o se añade `style-src 'self'` explícito.

## Riesgos y condiciones
- **RAM (corregido tras medición por trabajo):** init ≈ 70 MB; un trabajo de 80 MB ≈ **+192 MB**. La columna «Pico RSS» de la tabla es **acumulada** (varias corridas en el mismo worker; 3×80 MB = +395 MB porque la memoria WASM no se devuelve). Política por dispositivo, worker nuevo por pasada y análisis de "procesar por partes": **[ADR-003](../../docs/decisions/ADR-003-tope-memoria-compresor.md)**, implementada en `memory-policy.js` (6 pruebas en `test/`).
- **CPU:** un celular será probablemente 3–6× más lento (estimación, **no medido**). Con 80 MB eso daría ~12–25 s por pasada, lo que obliga a estimar por muestra en la búsqueda binaria.
- Los fixtures son sintéticos y homogéneos: la calibración de la escala de agresividad necesita **PDFs reales**.
- La primera descarga son 11 MB (gzip). Hay que confirmar que GitHub Pages sirve `.wasm` comprimido (no se pudo probar sin desplegar).

## Decisión recomendada
Usar `@okathira/ghostpdl-wasm` 1.1.0 vendorizado en `js/vendor/ghostpdl-wasm-1.1.0/` ([ADR-002](../../docs/decisions/ADR-002-ghostscript-wasm.md)). **Un worker nuevo por cada pasada de Ghostscript**, terminado al acabar; búsqueda binaria con estimación por `-sPageList` y confirmación completa; cancelación por `terminate()`.

## Cómo reproducir
```bash
python3 -I spikes/s1-ghostscript/gen_fixtures.py /tmp/fx
ln -s /tmp/fx spikes/s1-ghostscript/fixtures-gen
python3 -m http.server 8765   # en la raíz del repo
# abrir http://localhost:8765/spikes/s1-ghostscript/ y elegir un PDF
```
