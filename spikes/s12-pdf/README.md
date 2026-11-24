# S12 — pdf-lib y pdf.js (unir, dividir, miniaturas, render, cifrados)

**Veredicto: ⚠️ viable con condiciones.** Unir, dividir, miniaturas, render, formularios y PDFs cifrados funcionan en Chromium 158, Firefox 155 y WebKit 26.6 como ES modules sin build, con la CSP estricta y el worker de pdf.js aislado según ADR-004.

Condiciones:
- **No usar `pdf-lib` 1.17.1:** con `ignoreEncryption` produce **páginas en blanco sin avisar**, y no se mantiene desde 2021. Propuesta: su fork mantenido **`@cantoo/pdf-lib` 2.11.1**, que descifra con contraseña.
- **Memoria al unir:** el pico es de 4 a 8 veces el tamaño de entrada. Necesita un tope como el de ADR-003.
- **WebKit bloquea el hilo principal ~400–470 ms** al renderizar páginas con fotos.
- **Pendiente de dispositivo:** iPhone y PDFs reales, incluidos escaneos JBIG2/JPX.

Decisión propuesta: [ADR-010](../../docs/decisions/ADR-010-motores-pdf.md). **Añade dependencias: necesita tu aprobación.**

## Pregunta
Para Caja PDF y el motor PDF: peso, uso sin build, render en worker, miniaturas de 100 páginas, unir y dividir, PDFs cifrados y formularios. **Memoria y tiempo con 3 PDFs de ~30 MB** en los 3 motores.

## Método
- Fixtures **sintéticos** `[SINT]` (no versionados), generados con `python3 -I spikes/s12-pdf/gen_fixtures.py <carpeta>` y enlazados en `spikes/s12-pdf/fixtures-gen`:
  - 3 PDFs de 27,9 MB con 6 fotos de 3000×4000 cada uno;
  - uno de 100 páginas (30,7 MB) con texto y una foto pequeña por página;
  - texto (30 p), formulario AcroForm, cifrado con contraseña de usuario (AES-256), cifrado solo de propietario y uno truncado.
- Candidatos en `vendor/` (solo para evaluar):
  - `pdf-lib` 1.17.1 y `@cantoo/pdf-lib` 2.11.1 (`dist/*.esm.min.js`, sin importaciones sueltas ni `eval`);
  - `pdfjs-dist` 6.5.438: `pdf.min.mjs`, `pdf.worker.min.mjs`, `wasm/` (JBIG2, OpenJPEG, qcms) y `standard_fonts/`.
- Worker de pdf.js según ADR-004:
  - es un `blob:` que importa primero `lockdown.js` y luego el worker; guarda los mensajes que llegan mientras carga;
  - opciones `isEvalSupported: false` y `useWorkerFetch: false`: la página descarga las fuentes y el wasm y se los pasa al worker.
- `runner/s12run.cjs`:
  - una pestaña nueva por prueba;
  - memoria = pico de RSS de todos los procesos del navegador;
  - bloqueo = mayor retraso de un temporizador de 16 ms en la página;
  - las salidas se validan con pypdf y pdfium.

## Resultados

### Peso (gzip -9)
| Pieza | Bruto | gzip |
|---|---|---|
| pdf-lib 1.17.1 | 523 KB | 206 KB |
| **@cantoo/pdf-lib 2.11.1** | 614 KB | **252 KB** |
| pdf.js `pdf.min.mjs` | 474 KB | 136 KB |
| pdf.js `pdf.worker.min.mjs` | 1.272 KB | 378 KB |
| wasm JBIG2 + OpenJPEG + qcms | 421 KB | 147 KB |
| fuentes estándar (solo con `useSystemFonts:false`) | 798 KB | ~549 KB |
| **Total familia PDF (sin fuentes estándar)** | | **≈ 913 KB**, bajo demanda |

### Unir 3 × 27,9 MB (18 páginas → 79,7 MB)
| Motor | pdf-lib: tiempo / pico / bloqueo | @cantoo: tiempo / pico / bloqueo | Salida |
|---|---|---|---|
| Chromium | 0,78 s / +378 MB / 59 ms | 0,61 s / +313 MB / 105 ms | 18 p en pypdf y pdfium ✅ |
| Firefox | 0,98 s / +445 MB / 43 ms | 1,00 s / +321 MB / 161 ms | ✅ |
| WebKit | 1,43 s / +633 MB / 70 ms | 1,19 s / +577 MB / 68 ms | ✅ |

El pico es de **3,9 a 7,9 veces la entrada**: los 80 MB de entrada se tienen enteros en memoria, más el modelo del documento y la salida.

### Dividir 100 páginas en 100 archivos
0,35 / 0,47 / 0,47 s (Chromium / Firefox / WebKit).

### Miniaturas (escala 0,2) y render
| Motor | 100 p: 1.ª / mediana / p95 por página | 100 p: total / bloqueo / pico | 18 p de 28 MB (unido): total / pico (unir + miniaturas) | Render 12 MP (×5): tiempo / bloqueo / pico |
|---|---|---|---|---|
| Chromium | 68 / 33 / 41 ms | 3,5 s / 29 ms / +637 MB | 4,5 s / +968 MB | 0,46 s / 70 ms / +145 MB |
| Firefox | 46 / 33 / 41 ms | 3,6 s / 13 ms / +138 MB | 6,2 s / +454 MB | 0,69 s / 38 ms / +237 MB |
| WebKit | 489 / 34 / 47 ms | 4,3 s / **400 ms** / +296 MB | 6,0 s / +737 MB | 0,97 s / **409 ms** / +374 MB |

- Convertir cada miniatura en `<img>` JPEG y liberar el canvas **no bajó el pico** (Chromium 637 → 571 MB con 100 p; 968 → 963 MB con 18 p; Firefox sube): el pico lo dominan los datos del PDF y la decodificación, no los canvas retenidos.

### Cifrados, formularios y archivos dañados (igual en los 3)
| Caso | pdf-lib 1.17.1 | @cantoo/pdf-lib 2.11.1 | pdf.js |
|---|---|---|---|
| Contraseña de usuario, sin darla | error claro "is encrypted" | igual | `PasswordException` |
| …con `ignoreEncryption` y guardar | guarda el archivo **aún cifrado** | igual | — |
| …con la contraseña | no soportado | ✅ descifra (texto intacto según pypdf) | ✅ abre 30 p |
| Solo propietario, copiar una página a otro PDF con `ignoreEncryption` | **página en blanco** (0 píxeles de tinta, pypdf no decodifica), **sin error** | **igual: en blanco** | abre sin pedir nada |
| …con `password: ''` | — | ✅ idéntica al original (2.659 píxeles de tinta en ambas) | — |
| Formulario: rellenar texto y casilla | ✅ pypdf lee "María Suárez Peña" y `/Yes` | — | — |
| PDF truncado | error de parseo | — | `InvalidPDFException` |

### Hallazgos
1. **`ignoreEncryption` corrompe en silencio.** Unir un PDF cifrado por el propietario (habitual en PDFs de universidades y bancos) daría páginas en blanco sin error. Regla: no usar nunca `ignoreEncryption`. Usar `@cantoo/pdf-lib` con `password` (vacía para "solo propietario"; si no, pedir la contraseña).
2. **La memoria al unir es el riesgo en el iPhone.** +313 a +633 MB para 80 MB de entrada en escritorio. Necesita un tope como el de ADR-003 (presupuesto = 1/3 de la RAM).
3. **WebKit dibuja las imágenes grandes en el hilo principal:** bloqueos de ~400–470 ms por página con foto, frente a 30–80 ms en Chromium y Firefox. Las miniaturas deben generarse de forma diferida (las visibles primero) y con un indicador de progreso.
4. **pdf.js 6 cambió de API:** `PDFDocumentProxy.destroy()` ya no existe; se cierra con `loadingTask.destroy()`. El envoltorio debe aislar estas diferencias.
5. Con `useSystemFonts` (por defecto) pdf.js no pide las fuentes estándar. Con `useSystemFonts:false`, la página las descarga y el worker bloqueado dibuja el texto bien en los 3. El worker nunca usa red.

## No verificado (y por qué)
- **Escaneos JBIG2 / JPEG 2000:** no tengo un generador de esos códecs; hacen falta PDFs reales (`tests/real/`, tuyos).
- **iPhone:** memoria al unir y al renderizar, y bloqueos. Página: `…/spikes/s12-pdf/` → elegir PDFs → «Unir los elegidos», «Miniaturas», «Render grande» → «Copiar resultados».
- **Reordenar 100 miniaturas arrastrando:** no hay interfaz todavía (Fase 2). Solo se midió generarlas.
- **Render dentro de un worker con `OffscreenCanvas`:** pdf.js no lo ofrece como API estable; no se probó.

## Reproducir
```bash
python3 -I spikes/s12-pdf/gen_fixtures.py /tmp/s12fx
```
```bash
ln -sfn /tmp/s12fx spikes/s12-pdf/fixtures-gen
```
```bash
node spikes/s10-plataforma/runner/pages-server.cjs
```
```bash
OUTDIR=/tmp/s12 node spikes/s12-pdf/runner/s12run.cjs
```
