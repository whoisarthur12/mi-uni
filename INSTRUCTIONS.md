# INSTRUCTIONS.md — Cómo desarrollar "Mi Uni"

> **Léelo después de `CONTEXT.md`.** `CONTEXT.md` explica **qué** se construye y por qué; este archivo explica **cómo trabajar**: reglas, convenciones, orden de construcción, criterios de aceptación y cuándo preguntar. Si algo aquí contradice a `CONTEXT.md`, **detente y pregunta al dueño** en lugar de elegir en silencio.

> **Versión 2.** Incorpora el sistema de proyectos y eventos, el diagnóstico local, el **hito MVP** (que reordena las fases), las fichas técnicas y el procedimiento de admisión de herramientas nuevas. Ver `CONTEXT.md` §3.3–3.5.

---

## 0. Reglas de trabajo (obligatorias)

1. **Trabaja por fases, en orden.** No empieces una fase si la anterior no cumple su criterio de aceptación. Dentro de una fase, **un módulo a la vez**.
2. **Mide, no supongas.** Toda afirmación de rendimiento, tamaño, ahorro o fidelidad debe salir de una **medición reproducible** (banco de pruebas, ver §9). Si no la mediste, dilo.
3. **No inventes APIs, parámetros ni flags.** Si no estás seguro de que una función de una librería (Ghostscript, pdf-lib, pdf.js, OpenCV.js, nspell, Marp, citeproc…) exista o se comporte como crees, **léela en su documentación o código y pruébala**. Si no puedes confirmarlo, repórtalo y propón alternativa.
4. **La lista de "cosas no verificadas" (`CONTEXT.md` §7) es tu primera tarea**, no un detalle: se resuelve en la Fase 0 con pruebas reales y se **actualiza `CONTEXT.md`** con los hallazgos.
5. **Respeta el alcance.** No agregues módulos ni funciones fuera de `CONTEXT.md` §3.1. **Está prohibido** reintroducir los elementos de §3.2 (detector de IA/plagio, procesador de texto, etc.). Si crees que falta algo importante, **propónlo** y espera confirmación.
6. **Sin dependencias nuevas ni herramientas de build** sin permiso. Para cada dependencia: nombre, versión exacta, licencia, peso, motivo y alternativa, anotados en `js/vendor/VERSIONS.md`.
7. **Sin CDN en producción.** Todas las librerías, WASM, fuentes, diccionarios y estilos se **copian al repositorio** y se sirven localmente, para que funcionen offline y sin terceros.
8. **Privacidad primero:** ningún contenido del usuario sale del dispositivo. Verifícalo con la pestaña de red del navegador en cada módulo (ver §7).
9. **Idioma:** interfaz, mensajes de error, comentarios y documentación en **español**; identificadores de código en inglés **o** español, pero **un criterio consistente** por todo el proyecto (recomendado: código en inglés, textos al usuario en español).
10. **Al terminar cada módulo/fase:** resume en **máximo 8 líneas** qué hiciste, qué mediste, qué falla y qué sigue. Cuando la fase requiera probar en el celular del dueño, **espera su confirmación**.
11. **Decisiones técnicas importantes** → escribe un **ADR** corto en `docs/decisions/` (contexto, opciones, decisión, consecuencias).
12. **No hagas commits ni despliegues** sin que el dueño lo pida. Cuando los haga, mensajes claros en español.
13. **Estilo de comunicación con el dueño:** respuestas **densas, estructuradas y directas**, sin relleno; si algo está mal o es riesgoso, dilo claramente.
14. **Regla de reutilización:** ninguna herramienta nueva se desarrolla sin determinar antes qué motores, componentes, entidades y eventos existentes puede reutilizar. Si no reutiliza nada, justifícalo por escrito en su ficha.
15. **Ficha técnica antes de programar:** cada módulo empieza con su ficha en `docs/modules/<id>.md` (plantilla en §10). Sin ficha aprobada por el dueño no se escribe código del módulo.
16. **Proyectos y eventos:** todo módulo con resultado guardable debe poder **guardarlo en un proyecto**, **leer** del proyecto lo que le corresponda y **publicar** los eventos del catálogo (`CONTEXT.md` §8.7). **Siempre debe funcionar también sin proyecto.** Los módulos se comunican **solo** mediante `ctx.projects` y `ctx.events`.
17. **Sin telemetría remota.** Solo diagnóstico local (`CONTEXT.md` §8.8). No añadas analítica, pixeles ni envíos automáticos de ningún tipo.
18. **Lista de espera:** no construyas nada de `CONTEXT.md` §3.4 sin que el dueño lo promueva y se cumpla §13.

---

## 1. Convenciones de código

### 1.1 General
- JavaScript moderno con **ES modules** (`<script type="module">`), **sin transpilar ni empaquetar**.
- Funciones pequeñas, nombres descriptivos, **sin variables globales**. Comunicación por parámetros, eventos (`EventTarget`/`CustomEvent`) o el objeto `ctx` del módulo.
- **Rutas siempre relativas** (`./js/…`, no `/js/…`): GitHub Pages sirve el sitio bajo `/nombre-repo/`. Esto aplica a `manifest.webmanifest` (`start_url`, `scope`), al service worker y a cualquier `fetch`.
- **Router por hash** (`#/ruta`). No usar `history.pushState` con rutas "limpias" (da 404 al recargar en Pages).
- Manejo de errores **visible y útil** en español: qué pasó, por qué y qué puede hacer el usuario. Prohibido `alert()`/`confirm()`: usar componentes propios de diálogo y *toast*.
- Comentarios solo donde la lógica **no sea evidente** (el *por qué*, no el *qué*).

### 1.2 Reglas por capa
| Capa | Puede | No puede |
|---|---|---|
| `core/` | Usar APIs del navegador, IndexedDB, Cache API | Importar de `modules/` o `engines/` |
| `engines/` | Usar `core/` y librerías vendor | Tocar el DOM; importar de `modules/` |
| `modules/<id>/` | Usar `core/` (incluidos `projects` y `events`) y `engines/` | **Importar de otro módulo**; leer almacenes de otro módulo; llamar `fetch` directo (usar `net-guard`) |
| `shell/` | Registrar y montar módulos | Contener lógica de herramientas |

- **Lógica pura** (cálculo, parseo, algoritmos) separada de la **UI**, para poder probarla en Node sin navegador.
- **Comunicación entre módulos:** únicamente por entidades (`ctx.projects`) y eventos (`ctx.events`). Un evento **informa**; nunca desencadena acciones sin que el usuario las confirme. El payload de un evento lleva IDs y metadatos, **nunca contenido** de archivos o textos.
- **Todo trabajo pesado en Web Workers** (Ghostscript, OpenCV, LibreOffice, diff grande, ortografía, rasterizado). La UI **nunca** debe congelarse. Mensajes tipados `{ type, id, payload }`, con **progreso** y **cancelación** (`AbortSignal` o mensaje `cancel`).
- **Memoria:** liberar `ArrayBuffer`, `ImageBitmap`, canvases y URLs de objeto (`URL.revokeObjectURL`) tan pronto dejen de usarse; terminar Workers inactivos; procesar archivos grandes por trozos o página a página.

### 1.3 Contrato de módulo
Cada módulo exporta por defecto el objeto descrito en `CONTEXT.md` §8.3 (`id`, `nombre`, `categoria`, `ruta`, `pesado`, `assets`, `montar(contenedor, ctx)`, `desmontar()`). Reglas:
- `montar` crea su DOM dentro de `contenedor` y **no deja nada fuera**; `desmontar` limpia listeners, Workers y memoria.
- Cada módulo tiene su `README.md` (qué hace, límites, decisiones, cómo probarlo).
- Los datos propios del módulo se guardan con **prefijo de su `id`** en IndexedDB.
- Todo módulo con resultado guardable ofrece **"Guardar en proyecto"** (opcional) y publica los eventos de `CONTEXT.md` §8.7 que correspondan. La tabla de integración de `CONTEXT.md` §9.0.b es el contrato.

### 1.4 UI y estilo
- **Mobile-first**, responsivo, con tokens CSS (`css/tokens.css`) para color, espaciado, tipografía y radios; tema claro/oscuro/alto contraste.
- **Accesibilidad (meta WCAG 2.1 AA):** HTML semántico, `aria-label` en controles de icono, foco visible, navegación completa con teclado, contraste suficiente, objetivos táctiles ≥ 44×44 px, mensajes de estado con `aria-live`, respeto de `prefers-reduced-motion`, `<html lang="es">`.
- Sin fuentes remotas ni íconos desde CDN: SVG locales.
- Componentes comunes (botón, diálogo, barra de progreso, selector de archivos, *toast*, tarjeta de resultado) **una sola vez** en `css/components.css` y `shell/`.

---

## 2. Presupuestos de rendimiento (objetivos; ajustar con datos reales de la Fase 0)

| Concepto | Objetivo |
|---|---|
| Carga inicial del shell (sin módulos) | ≤ ~150 KB comprimidos; interactivo en ≤ 3 s en 4G medio |
| Cambio entre módulos livianos | < 500 ms tras la primera carga |
| Respuesta de la UI durante procesos pesados | Sin bloqueos > 100 ms; progreso visible cada ~250 ms |
| Memoria | No superar ~1/3 de la RAM típica del dispositivo de referencia; **avisar y degradar con elegancia** antes de que el navegador cierre la pestaña |
| Módulos pesados | Cargados **solo bajo demanda**; tamaño y progreso visibles; cancelables |

El **dispositivo de referencia** lo fija el dueño (Pregunta 6 en §11). Hasta entonces, prueba en un Android de gama media y un iPhone.

---

## 3. Fases, tareas y criterios de aceptación

> Esfuerzo relativo: **S** (pequeño), **M** (medio), **L** (grande), **XL** (muy grande). Cada fase termina con un **informe breve** y, si aplica, una **prueba en el celular del dueño**.

**Orden de construcción (versión 2):**

| Fase | Contenido | Hito |
|---|---|---|
| 0 | Pruebas de viabilidad (spikes) | — |
| 1 | Shell, núcleo, perfil, **proyectos, eventos, diagnóstico y buscador** | — |
| 2 | Familia PDF: motor, **Compresor**, **Caja PDF** | — |
| 3 | Texto y documentos: **Contador**, **Portadas**, **Fuentes/Bibliografía** | **HITO MVP** (lanzamiento público) |
| 4 | Ampliación: **Escáner**, **Comparador**, **Corrector** | — |
| 5 | Planificación e impresión: **Horarios**, **Plantillas** | — |
| 6 | Visuales: **Gráficos**, **Diagramas**, **Presentaciones**, **Ecuaciones** | — |
| 7 | **Office → PDF** | — |
| 8 | Pulido y publicación final | Versión 1.0 |

### FASE 0 — Pruebas de viabilidad ("spikes")  ·  esfuerzo M–L
Objetivo: **resolver las dudas de `CONTEXT.md` §7 antes de construir nada grande.** Cada spike es una página mínima descartable en `spikes/`, con una conclusión escrita (✅ viable / ⚠️ viable con condiciones / ❌ no viable) y mediciones.

| Spike | Qué probar | Qué medir/decidir |
|---|---|---|
| S1 Ghostscript WASM | Elegir paquete mantenido; comprimir PDFs de 5, 30 y 80 MB | Tamaño del WASM, tiempo de carga, tiempo de compresión, RAM, si necesita `SharedArrayBuffer`, efecto real de `-dPassThroughJPEGImages=false` |
| S2 Escáner | OpenCV.js (o librería sobre él): bordes + perspectiva con 10 fotos reales | Tamaño, tiempo por foto, memoria en iPhone/Android, tasa de aciertos de detección |
| S3 Office→PDF | Motor liviano (office2pdf / Pandoc+Typst / otro) y LibreOffice WASM, con 15 documentos reales | Fidelidad (fiel/aceptable/falla), tiempo, RAM, tamaño de assets, **cómo trocear >100 MB** para Pages |
| S4 Ortografía | `nspell` + diccionario español | Tamaño, carga, calidad de sugerencias, **licencia** del diccionario |
| S5 Citas (CSL) | citeproc-js/citation-js con APA 7 en `es` | Peso de estilos/locales, corrección de salida, licencias; **CORS** de CrossRef y Open Library/Google Books |
| S6 Presentaciones | Marp Core en navegador; exportar PDF por impresión (Chrome Android, Safari iOS) | Qué método de PDF es fiable; peso |
| S7 Diagramas | Mermaid + markmap; exportar PNG/SVG/PDF | Problema de `foreignObject`, peso, rendimiento |
| S8 Ecuaciones | MathLive + KaTeX; pegado de MathML en Word; exportar SVG/PNG | Qué funciona en Word; plan B de imagen |
| S9 Gráficos | Chart.js vs ECharts | Calidad de exportación (PNG/SVG), peso |
| S10 Plataforma | Router por hash, service worker con caché versionado, límites de canvas/memoria en iOS, CSP por `<meta>` con WASM | Qué directivas CSP necesita WASM (`'wasm-unsafe-eval'`), tope de canvas, comportamiento de la instalación PWA |
| S11 Proyectos y almacenamiento | Guardar *blobs* de 5, 30 y 80 MB en IndexedDB; exportar/importar un proyecto de ~200 MB a ZIP; `navigator.storage.persist()`; comportamiento en Safari iOS | Cuota real, tiempos, necesidad de procesar por trozos, si el navegador borra datos tras un tiempo sin uso, estrategia de respaldo |

**Prioridad dentro de la Fase 0:** primero los spikes que condicionan el **hito MVP** (S1 Ghostscript, S5 citas/CSL, S10 plataforma y S11 proyectos y almacenamiento). Los demás (S2 escáner, S3 Office→PDF, S4 ortografía, S6–S9 visuales) pueden hacerse justo antes de la fase que los necesita, pero **antes de construir ese módulo**.

**Entregables de la Fase 0:**
- `docs/decisions/ADR-*.md` por cada decisión (motor elegido, licencias, estrategia de troceado, etc.).
- `CONTEXT.md` §7 **actualizado**: cada duda marcada como resuelta con el dato medido.
- `js/vendor/VERSIONS.md` inicial con versiones y licencias.
- **Informe al dueño** con los spikes ❌ o ⚠️ y propuesta de plan B para cada uno.

**Aceptación:** todos los spikes tienen conclusión escrita con números; el dueño aprobó el informe.

---

### FASE 1 — Shell, núcleo, perfil y proyectos  ·  esfuerzo L
Construir la base sobre la que se apoyan todos los módulos.

**Tareas**
1. `index.html`, `manifest.webmanifest` (rutas relativas, íconos 192/512/maskable, `display: standalone`) y estructura del repositorio.
2. **Shell:** router por hash, registro de módulos con `import()` dinámico, pantalla de inicio (categorías, buscador, recientes), navegación y pantalla de **Ajustes** (tema, papel, estilo de cita por defecto, uso de almacenamiento, red).
3. **Núcleo:** `storage.js` (envoltorio de IndexedDB con versionado/migraciones), `files.js` (abrir con selector/arrastrar; guardar con `File System Access API` si existe y **descarga clásica** como alternativa; `navigator.share` cuando esté disponible), `workers.js` (utilidades de Worker con progreso y cancelación), `net-guard.js` (envoltura de `fetch` con lista blanca y registro), `backup.js` (exportar/importar todo en JSON/ZIP), `settings.js`.
4. **Perfil compartido** (módulo 0): perfil + cursos, API `ctx.profile`, exportación/importación, cifrado opcional.
5. **Proyectos** (`core/projects.js`): modelo de entidades y contratos de `CONTEXT.md` §8.6; almacenes `proyectos`, `recursos` y `blobs` en IndexedDB con esquema versionado y migraciones; API `ctx.projects` (crear, obtener, listar, guardar/leer/quitar recurso, suscribirse); plantillas de proyecto; papelera local; **exportar/importar proyecto como ZIP**; indicador de espacio y avisos de cuota; pantalla "Mis proyectos" con panel de proyecto. **Requisitos de ADR-006:** archivos en trozos de 8 MB; **verificar después de escribir** cada trozo (releer y comparar tamaño y CRC) antes de confirmar el recurso; importación trozo por trozo con marca `importando` y limpieza al arrancar; **fecha del último respaldo** por proyecto y **aviso** de respaldo pendiente (≥ 7 días con cambios sin exportar).
6. **Eventos** (`core/events.js`): bus sobre `EventTarget`, catálogo de `CONTEXT.md` §8.7, validación de que el payload solo contenga IDs y metadatos, utilidad para suscribirse y **desuscribirse automáticamente al desmontar** un módulo.
7. **Diagnóstico local** (`core/diag.js`): registro de errores y duraciones según `CONTEXT.md` §8.8, pantalla "Diagnóstico", botón "Copiar reporte"; opt-in y **sin envío automático**.
8. **Buscador** (`core/search.js`): índice en memoria de herramientas (nombre, descripción, palabras clave, sinónimos, categoría) y de proyectos/recursos recientes; búsqueda tolerante a tildes y mayúsculas.
9. **Service worker:** precache del shell, caché versionado, estrategia por tipo de recurso, **descarga offline por módulo** con progreso, `navigator.storage.persist()`, botón "Buscar actualización", limpieza de versiones viejas.
10. **CSP** por `<meta>` y *net-guard*; `ui-kit` (tokens, componentes, tema, accesibilidad).
11. Esqueleto de pruebas (Node para lógica pura) y *pipeline* de despliegue a Pages documentado.

**Aceptación**
- La app se instala como PWA y **abre sin internet** (shell + perfil).
- Un módulo "de ejemplo" se carga bajo demanda y se descarga para offline con progreso.
- Perfil editable, exportable e importable; los cambios se propagan a un módulo abierto.
- Cada proyecto muestra la **fecha de su último respaldo** y la app **avisa** cuando hay cambios sin exportar desde hace ≥ 7 días; todo archivo guardado se **relee y verifica** antes de confirmarse.
- Un módulo "de ejemplo" **guarda un resultado en un proyecto**, otro módulo "de ejemplo" lo **lee** y el evento correspondiente se publica; exportar el proyecto a ZIP e importarlo en otro navegador lo reproduce idéntico.
- El buscador encuentra herramientas por nombre, sinónimo y categoría, y proyectos por nombre.
- La pantalla Diagnóstico muestra errores y tiempos locales y permite copiar el reporte; no genera ninguna petición de red.
- Pestaña de red: **cero peticiones externas**.
- Funciona en Chrome Android, Safari iPhone y escritorio; rutas correctas en la URL real de Pages.

---

### FASE 2 — Familia PDF (compresor y caja)  ·  esfuerzo XL (el corazón del producto)
Orden: **motor PDF compartido → Compresor → Caja PDF** (el compresor resuelve la necesidad más urgente del dueño). El Escáner pasa a la Fase 4, tras el hito MVP.

**2.1 Motor PDF compartido (`engines/pdf`, `engines/image`, `engines/target-search`)**
- Envoltorios de `@cantoo/pdf-lib` 2.11.1 y `pdf.js` 6.5.438 (ADR-010): abrir, miniaturas, render a canvas/`OffscreenCanvas`, ensamblar. **Ningún módulo importa pdf-lib ni pdf.js directamente**: solo `engines/pdf`, para poder cambiar de motor tocando un único archivo (plan de reemplazo del fork en ADR-010).
- Partir del spike S12:
  - `pdf-open.js`: apertura con permiso y contraseña; opciones de carga en lista blanca;
  - `output-guard.js`: guarda de entrada y de salida;
  - `pdf-memory.js`: tope de memoria 8×, provisional;
  - las miniaturas perezosas de `main.js`.
  Las pruebas de `spikes/s12-pdf/test/` pasan a ser pruebas del motor.
- Prohibido ignorar el cifrado de un PDF: `tests/policy/no-ignore-encryption.test.mjs` debe pasar siempre.
- Carga de imágenes con **reducción inmediata** (lado largo máximo configurable) y respeto del tope de canvas de iOS.
- `target-search`: **búsqueda genérica de tamaño objetivo** — recibe una función `probar(nivel) → bytes` y devuelve el mejor nivel que cumpla, con búsqueda binaria, máximo de iteraciones y detección de no monotonía. Lo reutilizan el compresor y el escáner.

**2.2 Compresor de PDF** (spec en `CONTEXT.md` §9.1)
1. Prueba de concepto con Ghostscript (resultado del S1) y `gs-args.js` (argumentos a verificar contra la versión empaquetada).
2. **Diagnóstico** del PDF (`diagnose.js`) y desglose visual de qué pesa.
3. **Pasada sin pérdida** (`lossless.js`).
4. Controles manuales (DPI 72–300, calidad 10–100, gris) y presets.
5. **Modo tamaño objetivo:** meta por defecto **4.800.000 bytes**, escala de agresividad, búsqueda binaria con **estimación por muestra**, zona de aceptación 90–100 %.
6. **Guard** (abre, mismo nº de páginas, nunca mayor que el original) y **escalera de emergencia** (rasterizar páginas pesadas → rasterizar todo → **dividir en partes**).
7. **Modo escaneo** (gris automático por saturación, blanqueo de fondo, niveles, binarizado opcional) con **aviso de pérdida de texto seleccionable**.
8. Vista previa **antes/después** de la página más exigente, con zoom y deslizador; resumen de parámetros finales; **piso de calidad** configurable (por defecto ~100 DPI en escaneos de texto; si hay que bajar de ahí, avisar y pedir confirmación).
9. Lotes (varios archivos, descarga en ZIP) y cancelación.

*Aceptación:* sobre el banco de pruebas (§9), ≥ 80 % de los archivos llegan a la zona 90–100 % de la meta en el nº de iteraciones previsto; el resto cae correctamente en la escalera con mensaje claro; **ninguno** sale roto, mayor que el original ni con distinto nº de páginas; UI fluida y cancelable; ningún dato sale del dispositivo.

**2.3 Caja de herramientas PDF** (spec §9.3)
- Unir, dividir (rangos / cada N / por tamaño), organizar con miniaturas (arrastrar, borrar, rotar, duplicar, extraer), numerar páginas, marca de agua, firmar (firmas guardadas localmente), rellenar formularios, imágenes↔PDF, metadatos.
- PDFs cifrados según CONTEXT §9.3 (confirmación «¿es tuyo o tienes permiso?» para restricciones del propietario; contraseña de apertura pedida, nunca saltada). Mensajes claros para límites de memoria (ADR-003 + ADR-010).
- **Guarda de entrada y de salida en toda operación que escriba un PDF.** Si falla, no se entrega y se avisa.

*Aceptación:* cada operación genera un PDF que pasa la guarda y abre bien en un visor externo; reordenar 100 páginas por miniaturas es fluido; formularios simples se rellenan y guardan.

**Atajos entre módulos de esta fase:** Caja PDF→Compresor, "Dividir en partes" desde el Compresor (mediante el núcleo, sin acoplar módulos). El atajo Escáner→Compresor se añade en la Fase 4.

**Integración con proyectos (obligatoria en esta fase):** Compresor y Caja PDF pueden **tomar** un `documento` de un proyecto, **guardar** el resultado como `documento` y publicar `documento:generado`, y funcionan igual sin proyecto.

---

### FASE 3 — Documentos y texto (cierra el MVP)  ·  esfuerzo L
Orden: **motor de texto → Contador → Portadas → Fuentes/Bibliografía** → **HITO MVP**. (Comparador y Corrector pasan a la Fase 4.)

**3.1 Motor de texto (`engines/text`)** — tokenización de palabras y oraciones sensible al español, contador de sílabas por reglas, normalización (tildes, mayúsculas), extracción de texto desde `.txt/.md/.docx/PDF`. **Pruebas unitarias exhaustivas** (abreviaturas, números, comillas, guiones largos).

**3.2 Contador y analizador** (§9.8) — conteos, páginas estimadas parametrizables, tiempos de lectura/oratoria, legibilidad (Fernández-Huerta e INFLESZ **tras verificar las fórmulas con la fuente original** y documentarlas), frecuencias, repeticiones, oraciones largas, muletillas, límite configurable con aviso.
*Aceptación:* conteos coinciden con Word en textos de prueba (tolerancia documentada); 100.000 palabras sin congelar la UI.

**3.3 Generador de portadas** (§9.5) — plantillas (APA 7 estudiante, genérica, sobria, con logo), campos autocompletados del perfil/curso, ajustes tipográficos, vista previa, exportación a **PDF vectorial** y **`.docx` editable** (librería `docx`), plantillas propias guardables. **Pedir al dueño el reglamento de su universidad** para una plantilla fiel.
*Aceptación:* APA exportada a PDF y DOCX respeta los elementos del estilo; el `.docx` abre bien en Word; cambiar de curso actualiza campos.

**3.4 Gestor de fuentes y bibliografías** (§9.6) — biblioteca (IndexedDB), importar/exportar BibTeX/RIS/CSL JSON, búsqueda por DOI e ISBN **solo con acción explícita y aviso de red** (lista blanca en *net-guard*), formulario manual para URL, **motor CSL** (APA 7 principal + IEEE, MLA, Chicago, Vancouver, Harvard), citas en texto (paréntesis y narrativa), copiar como HTML enriquecido y exportar `.docx/.md/.txt`. **Revisión/corrección obligatoria** de metadatos antes de citar.
*Aceptación:* 20 fuentes de tipos distintos → bibliografía APA 7 ordenada y con cursivas correctas; importar/exportar BibTeX conserva datos; funciona sin internet salvo DOI/ISBN.

### HITO MVP — primer lanzamiento público

Se alcanza al terminar las Fases 1–3. **No se avanza a la Fase 4 hasta cumplirlo.**

- [ ] Los 7 componentes (Perfil, Proyectos, Compresor, Caja PDF, Portadas, Fuentes/Bibliografía, Contador) cumplen su criterio de aceptación.
- [ ] El **flujo de referencia** de `CONTEXT.md` §3.3 se ejecuta de punta a punta **por el dueño**, en su celular y en su computador, incluyendo exportar el proyecto a ZIP e importarlo en otro navegador.
- [ ] Cada módulo guarda en proyecto, lee del proyecto lo que le corresponde y publica sus eventos; **todos funcionan también sin proyecto**.
- [ ] Probado con **PDFs reales** del dueño (los pesados de sus tareas).
- [ ] Instalación PWA, uso offline de los módulos descargados y **auditoría de red limpia**.
- [ ] README, página de privacidad, enlace al código fuente (AGPL) y créditos publicados.
- [ ] Informe breve al dueño: qué funcionó, qué no y qué se aprendió para las fases siguientes.

---

### FASE 4 — Ampliación: Escáner, Comparador y Corrector  ·  esfuerzo L–XL
Se construye **después del hito MVP**. El Escáner va primero: es el complemento natural del Compresor, pero depende de OpenCV.js y del manejo de memoria en móvil (resultado del spike S2). Todos guardan en proyecto y publican eventos como el resto de módulos.

**4.1 Escáner de bolsillo** (spec §9.2)
- Captura (cámara + alternativa por `<input capture>`) e importación de galería.
- Detección automática de bordes **+ edición manual obligatoria de las 4 esquinas**; corrección de perspectiva; ajustar a Carta/A4.
- Filtros (Original, Mejorado, Gris, B/N adaptativo), enderezado y rotación.
- Multipágina (reordenar/borrar/repetir), ensamblado con `pdf-lib`, **tamaño objetivo** vía `target-search`.
- Gestión estricta de memoria (procesar de a una página, reducir al cargar, liberar canvases).

*Aceptación:* 10 páginas de un libro fotografiadas en un celular de gama media producen un PDF derecho, legible y ≤ 5 MB, sin cierres por memoria.

**Atajo entre módulos:** Escáner→Compresor (mediante el núcleo, sin acoplar módulos).

**4.2 Comparador de versiones** (§9.9) — diff por palabra/oración/párrafo, vistas lado a lado y en línea, opciones de normalización, estadísticas, navegación entre cambios, **alineación previa por párrafos** para documentos grandes, informe exportable.
*Aceptación:* dos versiones de 20.000 palabras en pocos segundos; informe exportado correcto.

**4.3 Corrector ortográfico** (§9.7) — `nspell` en Worker por trozos, resaltado sobre `contenteditable` o capa superpuesta, sugerencias, diccionario personal exportable, **aviso visible de que no revisa gramática**. Avisos de confusión frecuente (opcionales, **desactivados por defecto**).
*Aceptación:* 5.000 palabras en pocos segundos; diccionario personal persistente; **cero peticiones de red**.

---

### FASE 5 — Planificación e impresión  ·  esfuerzo M
**5.1 Armador de horarios** (§9.10) — modelo materia→secciones→bloques, *backtracking* con poda, puntuación y filtros de preferencias, vista semanal, comparación y fijación de opciones, exportación **PNG, PDF y `.ics`** (RFC 5545, zona `America/Santo_Domingo`, recurrencia semanal hasta fin de semestre). Límite y aviso cuando las combinaciones sean muy numerosas.
*Aceptación:* 6 materias × 3 secciones → opciones sin choques en < 1 s; `.ics` importa bien en Google Calendar y Apple Calendar.

**5.2 Plantillas imprimibles** (§9.11) — catálogo (Cornell, rayada, cuadriculada, puntos, milimetrada, planificadores, horario en blanco, checklist, cuadro de repaso, portada de cuaderno, tarjetas de estudio), parámetros de papel/orientación/márgenes (con margen de perforación)/color/grosor, encabezado desde el perfil, **PDF vectorial** multipágina con vista previa.
*Aceptación:* medidas impresas exactas (verificadas con regla en una impresión real); PDFs muy livianos.

---

### FASE 6 — Módulos visuales  ·  esfuerzo L
**6.1 Gráficos desde datos pegados** (§9.12) — parseo de TSV/CSV/JSON, detección de encabezados y tipos, **detección y confirmación del separador decimal** (coma/punto), tipos de gráfico, personalización, paletas accesibles, exportación PNG (2×/3×), SVG (si el motor lo permite) y **copiar al portapapeles**.
*Aceptación:* tabla de Excel con coma decimal → gráfico correcto; PNG nítido al insertarlo en un documento.

**6.2 Mapas mentales, diagramas y líneas de tiempo** (§9.13) — editor de texto con vista previa en vivo, plantillas, temas, modo oscuro, exportación SVG/PNG/PDF (con la solución al problema de `foreignObject` validada en el spike), biblioteca local.
*Aceptación:* 30 nodos se renderizan y exportan sin errores; plantillas funcionan offline.

**6.3 Presentaciones desde Markdown** (§9.14) — Marp Core (o alternativa decidida), temas sobrios, 16:9/4:3, imágenes incrustadas, código resaltado, KaTeX, notas del orador, **modo presentador**, diapositiva de portada desde el perfil, exportación a **PDF** (método validado en el spike) y **HTML autónomo**. **PPTX: opcional y posterior**, marcado como experimental.
*Aceptación:* 15 diapositivas con imágenes, código y una fórmula exportan a un PDF con tamaño correcto y sin cortes; el HTML funciona sin conexión.

**6.4 Editor de ecuaciones** (§9.15) — MathLive + KaTeX, plantillas, favoritos e historial, exportación/copia en LaTeX, MathML, SVG y PNG transparente; ruta a Word según el resultado del spike (**plan B: imagen**).
*Aceptación:* una fórmula compleja se crea desde el celular, se copia y se ve correcta en un documento externo.

---

### FASE 7 — Office → PDF  ·  esfuerzo XL (se deja casi al final a propósito: es el módulo más incierto y pesado)
1. **Motor liviano** (el elegido en S3) con detección de tipo, progreso, vista previa de las primeras páginas (pdf.js) y atajo hacia el Compresor.
2. **Fuentes métricamente compatibles** (Calibri/Cambria/Times/Arial → equivalentes) tras verificar licencias y peso.
3. **Motor de alta fidelidad (LibreOffice WASM)** como descarga opcional: **troceado** de assets ≤ ~50 MB con manifiesto y reensamblado, descarga reanudable con progreso, advertencia clara de tamaño y RAM, y **degradación elegante** (si falla, sugerir el motor liviano).
4. Banco de **15 documentos reales** con tabla de resultados por motor (fiel / aceptable / falla) y recomendación automática en la UI.
5. **Aviso permanente** sobre posibles diferencias con Word/PowerPoint/Excel; nunca entregar un PDF vacío o corrupto sin avisar.

*Aceptación:* tabla de fidelidad publicada en `docs/modules/office-pdf.md`; la UI recomienda el motor correcto; los fallos dan mensajes útiles; en un celular sin memoria suficiente el módulo lo detecta y propone alternativa en vez de cerrarse.

---

### FASE 8 — Pulido, rendimiento y publicación  ·  esfuerzo M
- Revisión de **accesibilidad** (teclado, lector de pantalla, contraste, objetivos táctiles) en todos los módulos.
- Revisión de **rendimiento y memoria** contra los presupuestos de §2; optimizar cargas diferidas.
- **Flujos conectados** definitivos entre módulos (Escáner→Compresor, Office→Compresor, Portada→Unir, Bibliografía→copiar).
- **Auditoría del modelo de proyectos y eventos:** comprobar que ningún módulo se salta el contrato (acceso a almacenes ajenos, eventos con contenido, automatismos silenciosos) y que exportar/importar proyectos sigue siendo fiable con el catálogo completo.
- Pantalla de **ayuda corta** por módulo, página "Privacidad" y enlace al **código fuente** (obligación AGPL), página de **créditos y licencias** generada desde `VERSIONS.md`.
- Recordatorio periódico de **exportar respaldo** (ya obligatorio desde la Fase 1, ADR-006): revisar que el aviso funciona en todos los flujos.
- Pruebas finales cruzadas (ver §8) y checklist de lanzamiento.

*Aceptación:* checklist de §8 completo en Chrome Android, Safari iPhone y escritorio; auditoría de red sin peticiones externas no autorizadas; instalación y uso offline verificados.

---

## 4. Banco de pruebas (obligatorio desde la Fase 0)

Crea `tests/fixtures/` y `tests/results.md`. Los archivos **reales** los aportará el dueño; mientras tanto genera **sintéticos y márcalos como tales**.

**PDF (compresor/caja):** (1) escaneo/foto de celular a color 30–60 MB; (2) Word exportado con imágenes; (3) PowerPoint exportado; (4) escaneo B/N de 100 páginas; (5) vectoriales y mapas; (6) solo texto; (7) con formularios; (8) cifrado; (9) ya ≤ 5 MB (debe quedar intacto); (10) corrupto (debe fallar con mensaje claro).
**Imágenes (escáner):** 10 fotos de páginas con distintas luces/fondos, incluyendo casos difíciles (hoja blanca sobre mesa blanca, sombras, ángulo fuerte).
**Office (Fase 7):** 15 documentos (informes con tablas e imágenes, presentaciones, hojas con gráficos, uno con fuentes raras).
**Texto:** textos de 1.000, 20.000 y 100.000 palabras; versiones con cambios conocidos; texto con errores ortográficos conocidos.
**Citas:** 20 fuentes de tipos distintos con resultado esperado en APA 7.
**Horarios:** conjuntos con y sin solución posible.
**Proyectos:** el proyecto de referencia del hito MVP; exportar/importar un ZIP con ~200 MB de adjuntos; migración de esquema de una versión a la siguiente; colisión de IDs al importar; proyecto con recursos eliminados (papelera).

Cada fila de `tests/results.md` registra: módulo, archivo, parámetros, **resultado**, tiempo, memoria aproximada, dispositivo y observación. **No se da una fase por terminada sin actualizar esta tabla.**

---

## 5. Seguridad y privacidad (checklist de diseño)

- **CSP** por `<meta>`: `default-src 'self'`; `connect-src 'self'` + lista blanca mínima; `script-src 'self'` más lo que WASM requiera (`'wasm-unsafe-eval'`, a verificar); `object-src 'none'`; `img-src 'self' data: blob:`.
- **Sin `eval` ni `new Function`** salvo que una librería lo exija; si lo exige, documentarlo en un ADR.
- **Entradas no confiables:** PDFs, documentos de Office, imágenes y Markdown **pueden ser maliciosos**. Nunca insertar HTML derivado del usuario sin **sanitizar**; Markdown y SVG → sanitización; Mermaid con `securityLevel` estricto; no ejecutar macros ni scripts de documentos.
- **Archivos y datos locales:** nada se sube; las firmas, el perfil y las fuentes viven en IndexedDB. Ofrecer **borrar todos los datos**.
- **No almacenar** números de documentos de identidad, pasaportes ni datos financieros en el perfil.
- **Dependencias:** versiones fijadas y copiadas a `vendor/`; revisar licencias; no cargar código remoto en tiempo de ejecución.
- **Sin analítica, sin cookies de seguimiento, sin fuentes remotas.**

---

## 6. Estrategia de caché y actualización (service worker)

1. **Nombres de caché versionados** (`shell-vN`, `mod-<id>-vN`, `assets-<id>-vN`).
2. **Shell:** precache al instalar; actualización en segundo plano y aviso "Hay una versión nueva — Actualizar".
3. **Módulos livianos:** *stale-while-revalidate*.
4. **Módulos pesados:** solo se guardan cuando el usuario pulsa **"Descargar para usar sin conexión"**; descarga con progreso y reanudación; verificación de integridad (tamaño/hash del manifiesto); posibilidad de **eliminar por módulo**.
5. **Limpieza:** al activar una versión nueva se eliminan las cachés viejas **solo después** de que la nueva esté completa.
6. **Pruebas obligatorias:** instalar, ir a modo avión, abrir; publicar versión nueva y comprobar que se actualiza sin dejar usuarios atascados; borrar caché y verificar que el estado se recupera.

---

## 7. Cómo verificar la privacidad (en cada módulo)

1. Abrir DevTools → pestaña **Red**; ejecutar el flujo completo del módulo con un archivo.
2. Comprobar que **no hay peticiones** que lleven datos del usuario ni a dominios no autorizados.
3. Las únicas excepciones permitidas: consultas explícitas por **DOI/ISBN** (módulo de fuentes) y la **descarga inicial de assets** propios del sitio.
4. Registrar el resultado en `tests/results.md`.

---

## 8. Checklist de calidad antes de dar una fase por terminada

- [ ] Sin errores ni *warnings* relevantes en consola (Chrome y Safari).
- [ ] La UI no se congela en procesos pesados; **cancelar funciona** y libera memoria.
- [ ] Probado en **Chrome Android**, **Safari iPhone** y **escritorio**; en vertical y horizontal.
- [ ] Mensajes claros para: archivo cifrado/corrupto, memoria insuficiente, formato no soportado, permiso de cámara denegado, meta de tamaño imposible, falta de espacio de almacenamiento.
- [ ] **Rutas relativas** verificadas en la **URL real de GitHub Pages**.
- [ ] **Offline** verificado (modo avión) para lo que el módulo promete.
- [ ] **Red auditada** (§7).
- [ ] Accesibilidad básica: teclado, foco, contraste, `aria`.
- [ ] Resultado **nunca peor** que la entrada (compresor) y vista previa cuando hay riesgo de pérdida (conversión, escaneo).
- [ ] El módulo **guarda en proyecto, lee del proyecto y publica sus eventos** (si aplica) y **funciona igual sin proyecto**; el payload de los eventos no contiene contenido.
- [ ] Banco de pruebas actualizado y **criterio de aceptación de la fase cumplido con datos**.
- [ ] `README` del módulo y ADRs al día; `VERSIONS.md` y licencias actualizados.

---

## 9. Despliegue en GitHub Pages

1. Repositorio **público**; Settings → Pages → rama `main`, carpeta raíz.
2. Cada archivo debe pesar **< 100 MB**; para assets mayores, **trocear** (≤ ~50 MB) con manifiesto, o alojar fuera comprobando CORS.
3. Probar siempre en `https://<usuario>.github.io/<repo>/`, **no solo en local**: cambian rutas y el *scope* del service worker.
4. En local: servidor estático (`python3 -m http.server`); la cámara y el micrófono funcionan en `localhost`.
5. Confirmar si algún módulo requiere `SharedArrayBuffer` (necesita aislamiento *cross-origin*, que Pages no permite con encabezados): si lo requiere, evaluar `coi-serviceworker` o un plan B y **documentarlo en un ADR**.
6. Recordar los límites suaves de Pages (tamaño del repositorio y ancho de banda) al decidir qué assets pesados incluir.

---

### 9.1 Red del entorno de desarrollo (ADR-009)
El entorno en la nube donde trabaja el agente tiene red limitada. Hosts añadidos con aprobación del dueño (lista exacta; se mantiene igual que en ADR-009):
- `cdn.playwright.dev` (navegadores de prueba)
- `api.crossref.org`, `openlibrary.org`, `www.googleapis.com` (S5: medición de DOI/ISBN)

Además están permitidos los registros de paquetes (npm, PyPI, apt) y los servidores MCP. **Cualquier ampliación futura pasa por el dueño:** pedirla explicando para qué, esperar su aprobación, y registrarla aquí y en ADR-009. La red del entorno de desarrollo **no** amplía lo que puede hacer la app.

### 9.2 Única excepción de red de la app (ADR-007)
La app solo puede salir de su propio origen para consultas de **DOI/ISBN** a `api.crossref.org`, `openlibrary.org` y `www.googleapis.com`, a petición explícita del usuario y enviando solo el identificador. La excepción vive **únicamente** en el net-guard; `node --test tests/policy/net-guard-scope.test.mjs` falla si cualquier otro archivo la usa. Esta prueba se ejecuta antes de cada PR.

## 10. Ficha técnica y documentación por módulo (`docs/modules/<id>.md`)

### 10.1 Ficha técnica (se escribe ANTES de programar; la aprueba el dueño)

- **Nombre** y **categoría**.
- **Problema que resuelve** y **usuario objetivo**.
- **Entradas** (formatos, tamaños) y **salidas**.
- **Motores y núcleo que reutiliza** (obligatorio; si no reutiliza nada, justificarlo).
- **Entidades de proyecto** que lee y que escribe (contratos de `CONTEXT.md` §8.6).
- **Eventos** que publica y a cuáles reacciona (§8.7).
- **Procesamiento:** local; si usa red, qué petición, por qué y con qué aviso.
- **Formatos compatibles** y límites (tamaño, memoria, dispositivos).
- **Estados de error** y mensaje al usuario en cada caso.
- **Requisitos de accesibilidad.**
- **Pruebas necesarias** (qué archivos del banco de pruebas) y **criterio de aceptación**.
- **Riesgos** y plan B.

### 10.2 Documentación final (se completa al terminar el módulo)

**Qué hace** · **Qué no hace (límites)** · **Dependencias y versiones** · **Decisiones (enlaces a ADR)** · **Resultados de pruebas** (resumen) · **Problemas conocidos** · **Cómo probarlo a mano** · **Ideas futuras (no implementadas)**.

---

## 11. Cuándo preguntar al dueño

Pregunta **solo** si te bloquea o cambia el producto:
1. **Dispositivo de referencia** (modelo de celular/navegador) para fijar presupuestos.
2. **Archivos reales** para el banco de pruebas (PDFs pesados de tareas, Word/PowerPoint/Excel de ejemplo, fotos de páginas).
3. **Reglamento de formato de su universidad** (portada, márgenes, fuente, estilo de cita).
4. Si un spike resulta ❌/⚠️ y hay que **cambiar de motor o recortar alcance**.
5. Si se decide incluir **LibreOffice WASM** y dónde alojarlo.
6. **Nombre/dominio** y confirmación de la **licencia AGPL-3.0**.
7. **Fechas del semestre** para el `.ics` del armador de horarios.
8. **Promover una herramienta de la lista de espera** (`CONTEXT.md` §3.4) o confirmar que el catálogo ampliado sigue vigente.

Para todo lo demás: **decide con criterio, anota la decisión (ADR corto) y continúa.**

---

## 12. Definición de "terminado" (global)

El proyecto está listo para publicarse cuando:
- Los 16 módulos cumplen su criterio de aceptación (o están **explícitamente marcados** como "experimental" o "diferido" con motivo).
- El **sistema de proyectos** permite el flujo completo de `CONTEXT.md` §3.3 y exportar/importar proyectos es fiable; ningún módulo viola el contrato de entidades y eventos.
- La app se **instala**, abre **sin conexión** (módulos descargados) y **no realiza peticiones no autorizadas**.
- Las conversiones y compresiones **comunican sus límites** y nunca empeoran silenciosamente el trabajo del usuario.
- La documentación (README, ADRs, docs por módulo, créditos y licencias) está completa y el **código fuente es accesible** desde la interfaz (AGPL-3.0).
- El dueño probó el conjunto en su celular y en su computador y aprobó el informe final.

---

## 13. Admisión de herramientas nuevas (de la lista de espera al alcance)

1. **El dueño promueve** la herramienta de forma explícita.
2. Se redacta su **ficha técnica** (§10.1) y se declara qué motores, entidades y eventos reutiliza. Si no reutiliza nada existente, se justifica por escrito.
3. Se **puntúa de 1 a 5** en cinco criterios: **Utilidad** (¿resuelve un problema frecuente?), **Reutilización** (¿aprovecha lo ya construido?), **Complejidad** (5 = muy simple), **Diferenciación** (¿aporta algo especial?) e **Integración** (¿se conecta con otras herramientas?). Orientación: **menos de 15 sobre 25** → se pospone; **15 o más** → candidata. Es una guía: decide el dueño.
4. Se asigna a una fase. **Solo una herramienta nueva en desarrollo a la vez** fuera del plan de fases.
5. Se registra en `CONTEXT.md` §3.1 (y se retira de §3.4) y se actualiza este documento.

**Nota:** una herramienta muy simple puede ser estratégica si valida un motor que otras usarán (por ejemplo, el contador de texto valida el motor de texto y el procesamiento local).
