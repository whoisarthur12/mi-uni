# S5 — Citas (CSL) y metadatos por DOI/ISBN

**Veredicto: ⚠️ viable con condiciones.** ADR-007 y ADR-008 **aprobados** (24-nov-2026). El estilo `apa-es.csl` es **PROVISIONAL**: aplica solo la edición en español de APA 7, sin reglas de ninguna universidad, hasta tener el reglamento del dueño.
- citeproc-js genera APA 7 en español correcta en los 10 tipos de prueba, en Node y en los 3 motores, también dentro de un worker.
- CrossRef y Open Library responden por CORS desde el navegador, sin servidor propio.

Condiciones:
- Hace falta un estilo derivado `apa-es`: ningún estilo ni locale oficial da APA en español.
- Hay que traducir los tipos de CrossRef a tipos CSL.
- El motor tarda hasta 1,3 s en crearse: va en un worker y se crea una sola vez.
- Google Books sin clave no es fiable.
- Falta validar el resultado con el reglamento de tu universidad.

Decisiones: [ADR-007](../../docs/decisions/ADR-007-excepcion-de-red-doi-isbn.md) (red) y [ADR-008](../../docs/decisions/ADR-008-motor-de-citas-csl.md) (motor).

## Pregunta
¿Qué procesador CSL usar sin build? ¿Cuánto pesa con estilos y locales, y es correcta la salida APA 7 en español? ¿Responden CrossRef, Open Library y Google Books desde un navegador (CORS), y qué datos se envían?

## Método
- `js/vendor/citeproc-2.4.63/citeproc.mjs` (raíz del repo, tras la aprobación de ADR-008): citeproc-js con una sola línea cambiada para usarlo como ES module.
- `js/vendor/csl/`: estilos y locales oficiales de CSL, fijados por commit.
- `js/vendor/csl/apa-es.csl` (**provisional**): se genera con `python3 -I spikes/s5-citas/tools/make_apa_es.py`.
- `js/cite.js` (envoltorio), `js/cite-worker.js`, `js/net-guard.js` (la excepción de red), `js/lookup.js` (DOI/ISBN → CSL-JSON), `js/sanitize.js` y `js/ref-form.js` (formulario editable: tras una búsqueda o para la entrada manual).
- `tests/policy/net-guard-scope.test.mjs` (raíz del repo): falla si cualquier archivo fuera del net-guard usa la excepción.
- 15 pruebas en Node con la salida esperada de 10 tipos de fuente y las reglas del net-guard: `node --test spikes/s5-citas/test/cite.test.mjs`.
- `runner/s5run.cjs` en los 3 motores mide rendimiento, consultas reales, cabeceras enviadas (vistas desde Playwright), CSP y sanitización.

## Resultados

### Peso (gzip -9)
| Pieza | Bruto | gzip |
|---|---|---|
| citeproc-js 2.4.63 | 967 KB | **191 KB** |
| `apa-es.csl` / `apa.csl` | 86 KB | 13 KB |
| locale `es-ES` + `en-US` (respaldo) | 57 KB | 10 KB |
| IEEE · MLA · Chicago autor-fecha · Harvard · NLM | — | 3 · 7 · 21 · 2 · — KB |
| **Módulo Fuentes con APA** | | **≈ 214 KB** (bajo demanda) |

### Rendimiento (100 referencias APA)
| Motor | Crear motor | Bibliografía | 50 citas | En worker: crear / bibliografía / bloqueo máx. de la página |
|---|---|---|---|---|
| Chromium 158 | 745 ms | 119 ms | 13 ms | 699 / 155 / **17 ms** |
| Firefox 155 | 1.187 ms | 176 ms | 33 ms | 1.144 / 264 / **18 ms** |
| WebKit 26.6 | 923 ms | 199 ms | 31 ms | 960 / 210 / **26 ms** |

Parsear el XML del estilo cuesta 13 ms; casi todo el tiempo es construir el motor, y darle el estilo ya parseado no ayuda (Node: 525 → 501 ms).

### Salida APA 7 (`apa-es` + `es-ES`), muestra
```
Hernández Sampieri, R., Fernández Collado, C. y Baptista Lucio, P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill.
Kucsko, G. y Maurer, P. C. (2013). Nanometre-scale thermometry in a living cell. Nature, 500(7460), 54–58. https://doi.org/10.1038/nature12373
Pérez, A. (2010). La educación en el Caribe. En F. Moya Pons (Ed.), Historia social del Caribe (pp. 45–78). Ediciones Unicaribe.
Rodríguez, L. (2024, 15 de marzo). Aumenta la matrícula universitaria. Diario Libre. https://www.diariolibre.com/ejemplo
UASD. (s. f.). Calendario académico. Portal UASD. Recuperado el 24 de noviembre de 2026, de https://uasd.edu.do/c
Citas: (García Márquez, 1967) · (Kucsko y Maurer, 2013) · (López et al., 2020) · García Márquez (1967) · (García Márquez, 1967, p. 12)
```
En HTML las cursivas salen como `<i>`.

| Problema con los estilos oficiales | `apa.csl` + `es-ES` | `apa.csl` + `es-MX` | `apa-es` + `es-ES` |
|---|---|---|---|
| "&" entre autores (APA en español usa "y") | ✗ | ✗ | ✓ |
| Coma antes de "y" | ✗ | ✗ | ✓ |
| "2024, marzo 15" | ✗ | ✗ | ✓ "15 de marzo" |
| Guion en páginas (54-58) | ✗ | ✓ | ✓ |
| "s. f." / "6.ª ed." | ✓ | ✗ "s/f", "6a ed." | ✓ |
| "Recuperado URL" sin fecha de consulta | ✗ | ✗ | ✓ (se omite) |

### Red: DOI/ISBN (CORS real, origen `http://localhost:8770`)
| Consulta | Chromium | Firefox* | WebKit |
|---|---|---|---|
| DOI 10.1038/nature12373 (CrossRef) | ✅ 616 ms | ✅ 199 ms | ✅ 255 ms |
| DOI en forma `https://doi.org/…` | ✅ normalizado | ✅ | ✅ |
| DOI inexistente | 404 → "no encontrado" | ✅ | ✅ |
| ISBN 978-84-376-0494-7 (Open Library) | ✅ 2,1 s | ✅ 0,3 s | ✅ 4,3 s |
| ISBN-10 0-14-032872-6 → 13 | ✅ | ✅ | ✅ |
| Otro host (`example.com`) | bloqueado por CSP | bloqueado | bloqueado |
| Cabeceras enviadas | `Origin` sí; **sin Referer ni cookies** | igual | igual |

\* Firefox no confía en la CA del proxy de este contenedor (`SEC_ERROR_UNKNOWN_ISSUER`): solo para esta medición se usa `ignoreHTTPSErrors`. Es un artefacto del entorno, no del CORS.

CORS: CrossRef y Open Library mandan `Access-Control-Allow-Origin: *`; Google Books devuelve el origen, pero sin clave respondió **429** (cuota diaria del proyecto anónimo agotada).

### Hallazgos
1. **CrossRef no devuelve tipos CSL:** su CSL-JSON trae `type: "journal-article"`. Sin traducirlo, citeproc formateaba los artículos como "En Nature (Vol. 500, Número 7460, pp. 54–58). Springer…". Corregido con `cslType()` (con prueba).
2. **Ningún estilo/locale oficial da APA en español** (tabla anterior) → `apa-es.csl` generado por script.
3. **Open Library:** "Gabriel García Márquez" → "Márquez, G. G." (no puede saber que el apellido es compuesto), y devuelve un libro real para un ISBN de relleno (9780000000002). La revisión obligatoria antes de citar no es opcional.
4. **CrossRef trae los títulos en mayúsculas de título** ("Regulation of Translation Initiation…"); APA pide tipo oración. El formulario debe señalarlo.
5. **Sanitización:** el título malicioso `<img onerror>`, `<script>`, `<a href="javascript:">` queda en texto plano en los 3 motores; se conservan `<i>` y `<sub>`.
6. citeproc usa espacios de no separación en "s. f.", "et al." y "p. 12" (correcto; tenerlo en cuenta al comparar textos).
7. **citeproc-js funciona en un worker** sin `DOMParser` en los 3 motores y no usa red (el camino con XHR solo existe para entornos sin parser y no se activa).

## Interfaz tras las decisiones del dueño (24-nov-2026)
- **ISBN:** solo Open Library; Google Books solo como respaldo **sin clave**, sin depender de él.
- **Siempre editable:** la búsqueda solo rellena un **borrador**; los autores (apellidos y nombres) son editables antes de guardar. El botón **"Entrada manual"** abre el mismo formulario vacío.
- **Validación:** sin título no se guarda; una página web sin fecha exige la fecha de consulta.
- Medido con `runner/s5form.cjs` en los 3 motores: ISBN de *Cien años de soledad* → borrador "Márquez, G." → corregido a "García Márquez, Gabriel" → `García Márquez, G. (2004). Cien años de soledad. Cátedra.` y `(García Márquez, 2004)`. La página web sin fecha se rechaza hasta poner la fecha de consulta.

## Pendiente
- `apa-es` sigue **PROVISIONAL** hasta tener el **reglamento de formato** de la universidad (INSTRUCTIONS §11.3). No se inventan reglas.
- Medir en el iPhone: `…/spikes/s5-citas/` → "Medir 100 referencias", buscar un DOI y un ISBN, "Copiar resultados".

## Reproducir
```bash
node --test spikes/s5-citas/test/cite.test.mjs
```
```bash
node spikes/s10-plataforma/runner/pages-server.cjs
```
```bash
node spikes/s5-citas/runner/s5run.cjs
```
