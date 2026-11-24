# S12 — @cantoo/pdf-lib y pdf.js (unir, dividir, miniaturas, render, cifrados)

**Veredicto: ⚠️ viable con condiciones.** [ADR-010](../../docs/decisions/ADR-010-motores-pdf.md) **aprobado** (24-nov-2026). Unir, dividir, miniaturas, render, formularios y PDFs cifrados funcionan en Chromium 158, Firefox 155 y WebKit 26.6 como ES modules sin build, con la CSP estricta y el worker de pdf.js aislado según ADR-004.

Condiciones (todas aplicadas en este spike):
- **`@cantoo/pdf-lib` 2.11.1, no `pdf-lib` 1.17.1.** Ignorar el cifrado produce páginas en blanco sin avisar; está prohibido y hay una prueba que lo vigila en todo el repo.
- **Apertura con permiso:**
  - PDF con restricciones del propietario → se pregunta «¿es tuyo o tienes permiso?»;
  - PDF con contraseña de apertura → se pide; nunca se salta.
- **Guardas de entrada y de salida:** número de páginas y ninguna página vacía; si fallan, no se entrega.
- **Tope de memoria** de ADR-003 con estimación `8 × entrada`, provisional.
- **Miniaturas perezosas.**
- **Pendiente de dispositivo:** iPhone y PDFs reales, incluidos escaneos JBIG2/JPX.

## Pregunta
Para la Caja PDF y el motor PDF: peso, uso sin build, render en worker, miniaturas de 100 páginas, unir y dividir, PDFs cifrados y formularios. **Memoria y tiempo con 3 PDFs de ~30 MB** en los 3 motores.

## Método
- Fixtures **sintéticos** `[SINT]`, no versionados: `python3 -I spikes/s12-pdf/gen_fixtures.py <carpeta>`, enlazados en `spikes/s12-pdf/fixtures-gen`.
  - 3 PDFs de 27,9 MB, cada uno con 6 fotos de 3000×4000.
  - Uno de 100 páginas (30,7 MB) con texto y una foto pequeña por página.
  - Texto (30 p), formulario AcroForm, cifrado con contraseña de usuario (AES-256), cifrado solo de propietario y uno truncado a la mitad.
- Motores aprobados en `js/vendor/`:
  - `cantoo-pdf-lib-2.11.1/`;
  - `pdfjs-6.5.438/` (`pdf.min.mjs`, `pdf.worker.min.mjs`, `wasm/`).
  - Las fuentes estándar de pdf.js siguen solo aquí (`vendor/pdfjs-6.5.438-standard_fonts/`), para evaluar.
- Módulos del spike, base del motor de la Fase 2:
  - `js/pdf-open.js`: apertura para editar. Las opciones de carga van en lista blanca (`password`, `updateMetadata`); el permiso y la contraseña se piden mediante funciones.
  - `js/output-guard.js`: estado de cada página (`contenido` / `vacia` / `ilegible`), guarda de entrada y guarda de salida.
  - `js/pdf-memory.js`: tope de memoria (ADR-003 con factor 8).
  - `js/main.js`: unir, dividir, miniaturas (todas o perezosas), render, cifrados y formulario.
- Pruebas:
  - `test/pdf-tools.test.mjs`: 10 pruebas en Node;
  - `tests/policy/no-ignore-encryption.test.mjs`: recorre todo el repo.
- `runner/s12run.cjs` en los 3 motores:
  - una pestaña nueva por prueba y una unión de calentamiento descartada (la primera unión en frío tarda ~5×);
  - memoria = pico de RSS de todos los procesos del navegador;
  - bloqueo = mayor retraso de un temporizador de 16 ms;
  - las salidas se validan con pypdf y pdfium.
- La comparación con `pdf-lib` 1.17.1 y el render grande se midieron en el commit `722223f` (pdf-lib quedó descartado y salió del repo).

## Resultados

### Peso (gzip -9)
| Pieza | Bruto | gzip |
|---|---|---|
| **@cantoo/pdf-lib 2.11.1** | 614 KB | **252 KB** |
| pdf.js `pdf.min.mjs` | 474 KB | 136 KB |
| pdf.js `pdf.worker.min.mjs` | 1.272 KB | 378 KB |
| wasm JBIG2 + OpenJPEG + qcms | 421 KB | 147 KB |
| fuentes estándar (solo con `useSystemFonts:false`; no aprobadas) | 798 KB | ~549 KB |
| **Total familia PDF** | | **≈ 913 KB**, bajo demanda |
| (descartado) pdf-lib 1.17.1 | 523 KB | 206 KB |

### Unir 3 × 27,9 MB (18 páginas → 79,7 MB), @cantoo
| Motor | Sin guarda: tiempo / pico / bloqueo | Con guardas: tiempo / pico / bloqueo | Coste de la guarda | Salida |
|---|---|---|---|---|
| Chromium | 0,61–0,74 s / +239 a +324 MB / 59–122 ms | 0,67–0,83 s / +362 a +657 MB / 108–130 ms | 52–73 ms | 18 p en pypdf y pdfium ✅ |
| Firefox | 0,83–1,18 s / +400 a +567 MB / 92–179 ms | 0,87–1,06 s / +452 a +467 MB / 79–120 ms | 50–90 ms | ✅ |
| WebKit | 1,13–1,43 s / +584 a +622 MB / 75–188 ms | 1,10–1,36 s / +606 a +626 MB / 61–100 ms | 22–40 ms | ✅ |

Rangos de 3 ejecuciones completas y 5 repeticiones sueltas.
- El pico es de **3 a 8 veces la entrada**: los 80 MB de entrada se tienen enteros en memoria, más el modelo del documento y la salida.
- La guarda de salida reabre los 80 MB generados. En Chromium sumó entre +94 y +352 MB en dos de las tres ejecuciones (8,2× en el peor caso); en Firefox y WebKit quedó dentro del ruido.
- Con presupuesto de 3 GB supuestos, la unión de 84 MB cae en «aviso» en un iPhone. En escritorio con 8 GB queda en «ok».

### Dividir 100 páginas en 100 archivos, con guarda en cada parte
0,36–0,60 / 0,50–0,63 / 0,53–0,63 s (Chromium / Firefox / WebKit), de los que la guarda supone 65–123 ms. 0 fallos.

### Miniaturas: todas frente a perezosas
Perezosas:
- lado mayor 120 px CSS (≤ 240 px reales);
- IntersectionObserver con 150 px de margen;
- una a la vez;
- se liberan las que salen de pantalla.

Lista de 50 vh y 1000×800 px.

| Motor | 100 p, todas: total / bloqueo / pico | 100 p, perezosas: al abrir dibuja / listo en / 1.ª visible | Recorrer las 100: total / máx. canvases vivos / liberadas / pico |
|---|---|---|---|
| Chromium | 3,2–3,5 s / 11–36 ms / +517 a +650 MB | 35 / 1,3–1,4 s / 0,19–0,25 s | 3,4–3,8 s / 49 / 70 / +601 a +610 MB |
| Firefox | 3,4–3,8 s / 9–16 ms / +179 a +221 MB | 35 / 1,4 s / 0,27–0,34 s | 3,6 s / 49 / 70 / +160 a +171 MB |
| WebKit | 4,2–4,3 s / **400–415 ms** / +285 a +308 MB | 35 / 2,0 s / 0,77–0,81 s | 4,2 s / 49 / 70 / +282 a +308 MB |

18 páginas de 28 MB unidas (unir + miniaturas):
- **todas:** Chromium +963 a +1.551 MB, Firefox +485 a +522 MB, WebKit +694 a +860 MB;
- **perezosas** (las 18 caben en pantalla): +866 / +586 / +677 MB.

- Las miniaturas perezosas **ahorran tiempo y trabajo**: el primer recorrido de pantalla tarda un 40–60 % del total y nunca hay más de 49 canvases. **No bajan el pico de memoria** de forma apreciable: lo dominan los datos del PDF y la decodificación de imágenes en pdf.js, no los canvases (en S12 ya se vio que pasar a `<img>` tampoco ayuda).
- **WebKit dibuja las imágenes en el hilo principal:** una página con foto tarda 400–700 ms. Por eso, una a la vez y solo las visibles.
- El pico de memoria en Chromium varía ±300 MB entre ejecuciones idénticas. Las comparaciones de memoria por debajo de esa cifra no son concluyentes.

### Render grande (commit `722223f`, sin cambios)
Página de 3000×4000 a 12 MP: 0,46 / 0,69 / 0,97 s; pico +145 / +237 / +374 MB; WebKit bloquea 409 ms.

### Cifrados con el flujo aprobado, formularios y archivos dañados (igual en los 3)
| Caso | Resultado |
|---|---|
| Solo propietario, usuario responde **No** (o cierra el diálogo) | `rechazado-sin-permiso`: no se toca; alternativas: «Ver y leer el PDF», «Pedir a quien lo creó una copia sin restricciones» |
| Solo propietario, usuario responde **Sí** | `restringido-confirmado`: página copiada y guarda ✅; pypdf lee el texto («La fotosíntesis es el proceso…») y la salida ya no está cifrada |
| Contraseña de apertura: sin dar / 3 incorrectas / correcta | `sin-contrasena` / `contrasena-incorrecta` / `con-contrasena` (guarda ✅). Nunca se intenta sin la contraseña |
| Ver un PDF restringido con pdf.js | abre las 30 p sin preguntar (ver no modifica) |
| Copiar páginas de un PDF solo de propietario **sin descifrar** (la opción prohibida; reproducido en el commit `722223f` y, para la guarda, en un script fuera del repo) | **página en blanco sin error** con pdf-lib y @cantoo. La guarda de entrada lo marca como «30 de 30 páginas ilegibles» y la de salida como «páginas vacías 1, 2» |
| Formulario: rellenar texto y casilla | ✅ pypdf lee «María Suárez Peña» y `/Yes` |
| PDF truncado a la mitad | **@cantoo lo abre sin error, con 30 p** (21 sin contenido). Guarda de entrada: «El PDF está dañado: 21 de 30 páginas no se pueden leer». pdf.js: `InvalidPDFException` |

### Hallazgos
1. **Ignorar el cifrado corrompe en silencio.** Solución aplicada:
   - lista blanca de opciones en `safeLoad`;
   - prueba de política sobre todo el repo;
   - descifrado con `password` solo tras la confirmación del usuario.
2. **@cantoo/pdf-lib abre PDFs truncados sin error.** Las páginas sin contenido saldrían en blanco al unir. La guarda de entrada lo detecta. Es estructural: decodifica los content streams y busca operadores de dibujo, sin rasterizar, y cuesta 22–123 ms.
3. **La memoria al unir es el riesgo en el iPhone:** +239 a +657 MB para 80 MB de entrada en escritorio. El tope 8× deja el iPhone (3 GB supuestos) en «aviso» desde 64 MB y en «bloqueo» desde 128 MB. Hay que recalibrarlo con el dispositivo.
4. **WebKit bloquea 400–700 ms por página con fotos:** miniaturas perezosas, de una en una.
5. **Arranque en frío:** la primera unión tras abrir el navegador tarda ~5× más (3,7 s frente a 0,7 s en Chromium). Se descarta como calentamiento; en la app conviene precargar el motor al entrar en la Caja PDF.
6. **pdf.js 6 cambió de API:** `PDFDocumentProxy.destroy()` ya no existe; se cierra con `loadingTask.destroy()`. El envoltorio aísla estas diferencias.
7. **Fuente de @cantoo 2.11.1:** el commit que declara no está en GitHub. La fuente exacta es el `src/` del tarball de npm (ver `LICENSES.md` y el riesgo en ADR-010).

## No verificado (y por qué)
- **Escaneos JBIG2 / JPEG 2000:** no tengo un generador de esos códecs; hacen falta PDFs reales (`tests/real/`, tuyos).
- **iPhone:** memoria al unir y al renderizar, bloqueos, el diálogo de permiso y el factor 8×. Página: `…/spikes/s12-pdf/`:
  1. elegir PDFs;
  2. «Unir los elegidos» y luego «Guardar el resultado»;
  3. «Miniaturas perezosas del primero», desplazar la lista y «Anotar tras desplazar»;
  4. «Render grande»;
  5. «Copiar resultados».
- **Reordenar 100 miniaturas arrastrando:** no hay interfaz todavía (Fase 2).
- **Render en un worker con `OffscreenCanvas`:** pdf.js no lo ofrece como API estable; no se probó.
- **Que la guarda detecte todo contenido roto:** se probó con contenido cifrado sin descifrar, bytes aleatorios con y sin FlateDecode, objetos que faltan y truncado real. Un content stream legible que dibuje algo incorrecto no se detecta; para eso habría que rasterizar, y no se hace.

## Reproducir
```bash
node --test spikes/s12-pdf/test/pdf-tools.test.mjs
```
```bash
node --test tests/policy/*.test.mjs
```
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
