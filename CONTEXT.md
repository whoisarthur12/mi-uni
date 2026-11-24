# CONTEXT.md — "Mi Uni": suite de herramientas universitarias gratuitas, offline y privadas

> **Para quién es este documento:** la IA (o persona) que va a desarrollar el proyecto. Explica **qué** se construye, **por qué**, **qué decisiones ya están tomadas**, qué está **sin verificar** y cómo debe comportarse **cada módulo**. Léelo completo antes de escribir una línea de código. Las reglas de trabajo, el orden de construcción y los criterios de aceptación están en `INSTRUCTIONS.md`.

> **Versión 2.** Incorpora, tras evaluar un informe externo de arquitectura, el **sistema de proyectos local**, el **bus de eventos interno**, el **diagnóstico local** (en lugar de telemetría), las **fichas técnicas** por herramienta, el **hito MVP** y la **lista de espera** del catálogo ampliado. Lo que se adoptó y lo que se rechazó (con motivos) está en §3.5.

---

## 1. Resumen en un párrafo

"Mi Uni" es **una sola aplicación web instalable (PWA)**, estática, alojada en **GitHub Pages**, que reúne en un mismo lugar las herramientas que un estudiante universitario necesita para **preparar y entregar trabajos**: comprimir, escanear y manipular PDFs, convertir documentos de Office a PDF, generar portadas y bibliografías, corregir ortografía, analizar y comparar textos, armar horarios, imprimir plantillas, crear gráficos, diagramas, presentaciones y ecuaciones. **Todo corre en el navegador del usuario**: ningún archivo, texto ni dato personal se envía a un servidor. Funciona sin internet una vez descargados los módulos.

La idea central es que las herramientas **se conecten entre sí** (un **perfil compartido** autocompleta portadas, plantillas y presentaciones; el motor de PDF lo comparten el escáner, el compresor y la caja de herramientas; el motor de texto lo comparten el contador, el corrector y el comparador) y que el conjunto sea **más cómodo, más privado y más útil para el contexto dominicano** que usar diez sitios distintos.

**Los proyectos son el punto de encuentro.** Además de las herramientas sueltas ("uso rápido", sin crear nada), el usuario puede abrir un **proyecto** (p. ej., "Informe de Biología") que reúne en un mismo lugar los documentos, referencias, gráficos y notas de esa tarea. Cada herramienta puede **guardar su resultado en el proyecto** y otras pueden **leerlo** mediante contratos de datos definidos, sin conocerse entre sí. Esa es la diferencia entre una colección de utilidades y un ecosistema. Todo sigue siendo **local**: los proyectos viven en el dispositivo y se respaldan exportándolos.

---

## 2. Dueño, contexto y restricciones

- **Dueño:** Miguel Suárez, freelance de desarrollo web en República Dominicana. Se comunica en **español**. Prefiere respuestas **densas, estructuradas, directas y sin relleno**; le gusta que le corrijan con claridad.
- **Estudiará** una licenciatura en ciencia de datos (3 años) y hoy cursa un diplomado en ciberseguridad. Las herramientas deben servirle a él y, por extensión, a cualquier estudiante.
- **Stack que domina:** HTML/CSS/JS estático, GitHub, Hostinger, Claude Code.
- **Restricciones duras:**
  1. **Sin backend.** Nada de servidores, bases de datos remotas ni cuentas de usuario.
  2. **Sin costos recurrentes.** Solo servicios gratuitos.
  3. **Sin build obligatorio.** El código debe poder servirse tal cual (ES modules). Se permiten herramientas de desarrollo opcionales (tests, linters), pero **nada que el navegador necesite compilar**.
  4. **Privacidad por diseño:** los archivos del usuario nunca salen del dispositivo.
  5. **Interfaz en español** (variante neutra latinoamericana; formatos de número y fecha de RD).
  6. **Mobile-first:** el uso principal es el celular (Chrome en Android, Safari en iPhone), con soporte completo en escritorio.
- **Formato de papel por defecto:** **Carta (8,5 × 11 pulgadas)**, porque es el habitual en República Dominicana. A4 como opción.

---

## 3. Qué entra y qué NO entra

### 3.1 Módulos incluidos (16)

| # | Módulo | Resumen |
|---|---|---|
| 0 | **Perfil y Proyectos** (núcleo) | Datos del estudiante y de sus materias, más **proyectos** que reúnen documentos, referencias, gráficos y notas de una misma tarea |
| 1 | **Compresor de PDF a tamaño objetivo** | "Hazlo ≤ 5 MB" con la mayor calidad posible; controles manuales de DPI y calidad |
| 2 | **Escáner de bolsillo** | Cámara → recorte y enderezado → PDF limpio y liviano |
| 3 | **Caja de herramientas PDF** | Unir, dividir, reordenar, rotar, numerar, marca de agua, firmar, rellenar formularios, imágenes↔PDF |
| 4 | **Word/PowerPoint/Excel → PDF** | Conversión local con dos motores (liviano y alta fidelidad) |
| 5 | **Generador de portadas** | Portadas con plantillas (APA, genérica universitaria), autocompletadas desde el perfil |
| 6 | **Gestor de fuentes y bibliografías** | Biblioteca personal de fuentes + citas y bibliografía en varios estilos (CSL) |
| 7 | **Corrector ortográfico offline (español)** | Revisión de ortografía con diccionario personal |
| 8 | **Contador y analizador de texto** | Palabras, páginas estimadas, tiempos de lectura/oratoria, legibilidad, repeticiones |
| 9 | **Comparador de versiones de texto** | Diferencias entre dos borradores, con informe |
| 10 | **Armador de horarios** | Combina secciones sin choques; exporta imagen, PDF y calendario `.ics` |
| 11 | **Plantillas imprimibles** | Cornell, rayadas, cuadriculadas, planificadores, etc., en PDF vectorial |
| 12 | **Gráficos desde datos pegados** | Pegas una tabla, eliges tipo de gráfico, exportas imagen |
| 13 | **Mapas mentales, diagramas de flujo y líneas de tiempo** | Edición basada en texto con vista previa y exportación |
| 14 | **Presentaciones desde Markdown** | Escribes texto, obtienes diapositivas exportables a PDF/HTML |
| 15 | **Editor de ecuaciones** | Editor visual de fórmulas con exportación a LaTeX/MathML/imagen |

> El módulo 0 (Perfil y Proyectos) es infraestructura más que "herramienta", pero se presenta al usuario como dos secciones propias ("Mi perfil" y "Mis proyectos"). Los otros 15 son las herramientas.

### 3.2 Fuera de alcance (no construir, aunque parezca buena idea)

Estas decisiones ya se discutieron con el dueño. **No las reintroduzcas por iniciativa propia:**

- **Detector de IA y detector de plagio.** Se descartaron: los detectores de IA no son fiables (alta tasa de falsos positivos y rendimiento pobre, especialmente en textos de no nativos) y un detector de plagio real necesita un corpus enorme que un sitio estático no tiene. No ofrecer ni siquiera una versión "aproximada".
- Procesador de texto completo, asistente de entrega, biblioteca de apuntes con OCR, flashcards con repetición espaciada, transcriptor de clases, terminal Linux en el navegador, etc. El dueño prefirió quedarse con la lista de arriba.
- Backend, cuentas, sincronización en la nube, **telemetría o analítica remota**, publicidad.
- Colaboración en tiempo real, sistema de plugins públicos, microservicios y estructuras de monorepo pensadas para equipos grandes.
- Teleprompter: es un **proyecto aparte** (otro repositorio). No integrarlo aquí.
- Frameworks pesados (React, Angular, Vue) y bundlers como requisito de ejecución.

### 3.3 Hito MVP (primer lanzamiento público)

**Contenido del MVP:** Perfil + Proyectos + **Compresor de PDF** + **Caja de herramientas PDF** + **Generador de portadas** + **Gestor de fuentes y bibliografías** + **Contador y analizador de texto**.

**Por qué este conjunto:**
- Cubre el dolor inmediato del dueño: entregar PDFs ≤ 5 MB y poder unir, dividir y ordenar.
- **Demuestra la integración**, que es el objetivo del producto: un mismo proyecto reúne el PDF final, la portada, las referencias y el análisis del texto.
- Valida de una vez los motores más reutilizables (PDF, texto y exportación) y el sistema de proyectos.

**Flujo de referencia del MVP (criterio de integración):**
1. Crear el proyecto "Informe de Biología" con la plantilla *Trabajo/tarea*.
2. Añadir fuentes en el gestor de bibliografías y generar la bibliografía APA 7 dentro del proyecto.
3. Generar la portada con los datos del perfil y guardarla en el proyecto.
4. Unir portada + documento + bibliografía con la caja PDF y comprimir a ≤ 5 MB con el compresor.
5. Revisar conteo de palabras y páginas con el contador sobre el texto del proyecto.
6. Exportar el proyecto completo (ZIP) e importarlo en otro navegador: queda idéntico.

**Después del MVP, en este orden:** Escáner de bolsillo, Comparador y Corrector (Fase 4) → Horarios y Plantillas imprimibles (Fase 5) → módulos visuales (Fase 6) → Office→PDF (Fase 7). No se lanza una versión pública con herramientas a medias: es preferible un conjunto pequeño, estable y realmente conectado.

### 3.4 Lista de espera (NO construir ahora)

El dueño tiene un catálogo ampliado de otra conversación (se conoce aquí solo por un informe externo: **confirmarlo con él**). Estas herramientas **no están en alcance**; solo entran si el dueño las promueve y pasan el procedimiento de admisión (`INSTRUCTIONS.md` §13):

- **Documentos/PDF:** recortador inteligente de PDF; ocultador de información sensible (con **redacción real**: eliminar el contenido subyacente, no tapar con un rectángulo negro); editor de metadatos independiente (parte ya cubierta por la caja PDF); lector de documentos paralelo.
- **Investigación:** lector académico con anotaciones, organizador de investigaciones, gestor de trabajos finales.
- **Estudio:** temporizador de estudio, tarjetas de estudio con repetición espaciada, calculadora de notas, entrenador de exposiciones, generador de apuntes Cornell (parcialmente cubierto por las plantillas imprimibles).
- **Ciencia:** laboratorio de estadística, analizador de regresiones, laboratorio de matrices, tabla periódica interactiva, matriz de decisiones.
- **Creatividad y utilidades:** pizarra digital, hojas de contacto, conversor de imágenes, generador de códigos QR, verificador de integridad (SHA-256), renombrador masivo de archivos.

**Regla:** mientras estén en lista de espera, **no se diseñan ni se construyen**, aunque parezcan fáciles. Sí se exige que la arquitectura (motores, proyectos, eventos) sea lo bastante limpia para admitirlas después sin reconstruir nada.

### 3.5 Qué se adoptó y qué se rechazó del informe externo de arquitectura

| Propuesta del informe | Decisión | Motivo |
|---|---|---|
| Motores compartidos y regla "reutilizar antes de crear" | **Adoptada** | Ya era el principio de Mi Uni; ahora es regla escrita |
| Sistema central de proyectos y entidades compartidas | **Adoptada (solo local)** | Es lo que convierte utilidades sueltas en un ecosistema |
| Eventos internos entre herramientas | **Adoptada** | Desacopla módulos; los eventos informan, no ordenan |
| Ficha técnica por herramienta antes de programar | **Adoptada** | Evita decisiones inconsistentes entre módulos |
| Matriz de priorización de 5 criterios | **Adoptada** | Base del procedimiento de admisión de herramientas |
| Buscador como protagonista de la navegación | **Adoptada** | Con muchas herramientas es la vía principal de acceso |
| Redacción real en PDF | **Adoptada para la lista de espera** | Advertencia correcta si algún día se construye |
| No prometer sincronización sin confirmación del servidor | **Adoptada como principio futuro** | Aplica solo si algún día existe sincronización |
| Backend, PostgreSQL, API, cuentas, sincronización, colaboración | **Rechazada (por ahora)** | Choca con "sin backend, gratis, una persona" y con GitHub Pages |
| Telemetría de uso | **Rechazada; sustituida por diagnóstico local** | Contradice la privacidad verificable |
| React + Next + Tailwind + Redux, TypeScript obligatorio | **Rechazada (por ahora)** | Se mantiene JS vanilla; si la interfaz se complica, evaluar Preact + htm (sin build) |
| Monorepo con `services/` e `infrastructure/`, equipos por áreas, microservicios | **Rechazada** | Sobreingeniería para una persona |
| Plugins públicos | **Rechazada** | Antes hacen falta módulos internos estables |
| Catálogo de ~40 herramientas | **Lista de espera** | Alcance controlado (§3.4) |

**Lo que el informe omite y Mi Uni sí cubre:** el compresor a ≤ 5 MB y el escáner de bolsillo (la necesidad real del dueño), los límites de memoria y tamaño de la conversión Office→PDF, las licencias (AGPL de Ghostscript) y los topes de iOS. Esta decisión se registra como **ADR-001** en `docs/decisions/`.

---

## 4. Principios de diseño (la brújula del proyecto)

1. **Privacidad verificable.** No basta con prometer que nada sale del dispositivo: la app debe **poder demostrarlo** (política CSP restrictiva, indicador visible cuando se usa la red, cero analítica, fuentes y librerías alojadas localmente).
2. **Offline primero.** Cada módulo declara qué necesita para funcionar sin conexión y el usuario puede **descargarlo bajo demanda** (los módulos pesados no se bajan hasta que se piden).
3. **Honestidad sobre los límites.** Si una conversión puede perder fidelidad, si un archivo es demasiado grande para la memoria del teléfono o si una compresión degradaría el texto, la app **lo dice con claridad** y ofrece alternativas. Nada de promesas imposibles.
4. **Nunca empeorar el trabajo del usuario.** Un compresor nunca entrega un archivo mayor que el original; un conversor muestra una vista previa antes de dar el resultado por bueno.
5. **Un núcleo, muchos módulos.** Lo común (PDF, texto, almacenamiento, perfil, exportación) se escribe una vez y se reutiliza.
6. **Rápido en celulares modestos.** Presupuestos de rendimiento y de memoria explícitos (ver `INSTRUCTIONS.md`).
7. **Sencillo de mantener por una sola persona.** Vanilla JS, módulos pequeños, documentación por módulo, decisiones registradas.
8. **Reutilizar antes de crear.** Ninguna herramienta nueva se desarrolla sin determinar primero qué motores, componentes, entidades y eventos existentes puede reutilizar. Si no reutiliza nada, se justifica por escrito.
9. **El proyecto es el punto de encuentro, pero nunca un requisito.** Cualquier herramienta funciona en "uso rápido" sin crear proyecto ni cuenta; el proyecto se ofrece al terminar ("Guardar en un proyecto").
10. **Los eventos informan, no ordenan.** Una herramienta anuncia lo que ocurrió; el usuario decide qué hacer con ello. Cero automatizaciones silenciosas.

---

## 5. Decisiones técnicas ya tomadas

| Tema | Decisión | Motivo |
|---|---|---|
| Hosting | GitHub Pages, repositorio público | Gratis, HTTPS (requerido por cámara y service workers) |
| Lenguaje | HTML + CSS + JavaScript, **ES modules**, sin bundler | Despliegue directo, mantenimiento simple |
| Estructura | **PWA única** con *shell* + módulos cargados bajo demanda (`import()` dinámico) | Una instalación, módulos pesados solo si se usan |
| Navegación | Router por *hash* (`#/ruta`) | GitHub Pages no reescribe rutas; el *history API* daría 404 al recargar |
| Almacenamiento | **IndexedDB** (datos) + **Cache API** (assets pesados) + `localStorage` solo para ajustes triviales | Capacidad y robustez |
| Respaldo | Exportar/importar **todo** como JSON (o ZIP) | Sin backend no hay copia en la nube |
| Proyectos | **Sistema local de proyectos y entidades** con IDs estables (ver §8.6); exportable como ZIP | Convierte herramientas sueltas en flujos completos |
| Comunicación entre módulos | **Bus de eventos local** (`EventTarget`) + contratos de datos en `ctx.projects` (ver §8.7) | Los módulos no se importan entre sí |
| Cuentas y sincronización | **Ninguna** (por ahora) | Sin backend; sincronizar sería una fase futura y opcional |
| Telemetría | **Ninguna remota.** Solo **diagnóstico local** visible para el usuario (ver §8.8) | Privacidad verificable |
| Alcance inicial | **Hito MVP** de 7 componentes conectados (ver §3.3) | Lanzar poco, estable y realmente integrado |
| Procesamiento pesado | **Web Workers** | La UI nunca se congela |
| Motor de PDF (manipulación) | `pdf-lib` | Escritura/edición de PDFs en el navegador (MIT) |
| Motor de PDF (render) | `pdf.js` | Miniaturas, vistas previas y rasterizado (Apache-2.0) |
| Compresión de PDF | **Ghostscript compilado a WASM** (principal) + modo "escaneo" con pdf.js/pdf-lib | Conserva texto y vectores con control de DPI/calidad |
| Escáner | **OpenCV.js** (o una librería construida sobre él) para detección de bordes y corrección de perspectiva | Visión por computador local |
| Word/PPT/Excel → PDF | Dos niveles: motor **liviano** en WASM por defecto + **LibreOffice WASM** opcional de "alta fidelidad" | Equilibrio entre peso y fidelidad |
| Ortografía | Hunspell/`nspell` con diccionario español | Corrector local |
| Citas | **CSL** (Citation Style Language) con un procesador JS (`citeproc-js` o `citation-js`) | Estilos oficiales; escribir APA a mano es propenso a errores |
| Diferencias de texto | `jsdiff` (o equivalente) | Madura y suficiente |
| Gráficos | Chart.js o ECharts (elegir en la fase de pruebas según exportación SVG) | Gráficos exportables |
| Diagramas | Mermaid (flujos, líneas de tiempo, mapas mentales) + markmap (Markdown→mapa mental) | Edición basada en texto |
| Presentaciones | Marp Core (Markdown→diapositivas) o equivalente | Markdown → HTML/PDF |
| Ecuaciones | MathLive (editor) + KaTeX (render) | Editor visual + render rápido |
| Documentos Word | Librería `docx` (generar `.docx` editables) | Portadas/bibliografías exportables a Word |
| Licencia del proyecto | **AGPL-3.0** (ver §6) | Obligada por Ghostscript; el repo ya es público |

---

## 6. Licencias (importante, léelo)

- **Ghostscript es AGPL** (con licencia comercial alternativa de Artifex). MuPDF también lo es. Como la app se **distribuye** a los usuarios (el navegador descarga el código), la forma segura de cumplir es publicar **todo el proyecto bajo AGPL-3.0**, con archivo `LICENSE`, y un **enlace visible al código fuente** en la interfaz.
- Las demás librerías previstas (pdf-lib, pdf.js, docx, KaTeX, MathLive, Mermaid, Chart.js, nspell, jsdiff…) son MIT/Apache-2.0/BSD, **compatibles** con una distribución AGPL-3.0. **Verifica la licencia exacta de cada dependencia y anótala** en `vendor/VERSIONS.md`.
- **Diccionarios de ortografía** (Hunspell español) y **estilos CSL** tienen licencias propias (típicamente copyleft/atribución). **Revísalas antes de redistribuirlas** y conserva los avisos de atribución.
- **Fuentes tipográficas** incluidas (si se añaden fuentes métricamente compatibles para la conversión de Office): comprobar licencia (suelen ser OFL).
- **Si el dueño quisiera cerrar el código o vender el servicio como producto cerrado, necesitaría una licencia comercial de Artifex.** Avísale antes de cambiar el modelo de negocio.

---

## 7. Cosas NO verificadas (comprobar con pruebas reales antes de depender de ellas)

Este documento fue elaborado con investigación parcial. **Trata esta lista como "hipótesis a validar" en la Fase 0.**

1. **Ghostscript WASM:** qué paquete usar (hay varios, algunos con numeración de versión muy baja) y si está mantenido; tamaño del módulo, tiempo de carga, RAM con PDFs de 30–100 MB en el celular del dueño; si necesita `SharedArrayBuffer`.
2. **Conversión Office → PDF:**
   - LibreOffice en WASM existe, pero un reporte indica ~**150 MB** de binario, **10–15 s** de arranque y **200–300 MB** de RAM por conversión (una sola fuente: medirlo).
   - Alternativas livianas mencionadas: `office2pdf` (Rust, con bindings WASM, DOCX/XLSX/PPTX) y Pandoc+Typst en WASM para DOCX. Fidelidad menor y desigual.
   - La fidelidad perfecta con Word no es alcanzable; hay que **medirla** con documentos reales.
3. **GitHub Pages:** límite de **100 MB por archivo** y repositorio recomendado por debajo de ~1 GB. Un LibreOffice WASM de ~150 MB **no cabe en un solo archivo**: hay que **trocearlo** (p. ej., trozos ≤ 50 MB con un manifiesto) o alojarlo fuera, comprobando CORS.
4. **OpenCV.js:** tamaño real, rendimiento y consumo de memoria en iPhone/Android de gama media; si conviene una librería ya construida sobre él.
5. **Límites de memoria móvil:** Safari en iOS impone un tope al área de un `<canvas>` (del orden de 16 millones de píxeles; **verificar**) y a la memoria total de la pestaña. Las fotos de cámara de 12+ MP pueden provocar cierres si no se reducen al cargarlas.
   - **Fase 0 (S10, parcial):** en escritorio el canvas máximo es 268 MP (Chromium/WebKit) y 537 MP (Firefox), igual en `OffscreenCanvas`. **iOS sin medir**: página `spikes/s10-plataforma/canvas/` lista para el iPhone. Mientras tanto, reducir al cargar a ≤ 16,7 MP.
6. **`nspell` + diccionario español:** tamaño, tiempo de carga, calidad de sugerencias, licencia del diccionario.
7. **Marp Core en navegador:** confirmar que funciona sin build y cómo exportar PDF fiable desde el navegador (imprimir con `@page` vs. rasterizar diapositivas). La impresión en iOS tiene peculiaridades.
8. **Mermaid:** exportar a PNG puede fallar por etiquetas con `foreignObject` (contaminan el canvas); verificar la configuración que permite exportar bien.
9. **Ecuaciones a Word:** pegar MathML en Word y su comportamiento varía; convertir LaTeX a OMML (formato nativo de Word) no es trivial y puede tener restricciones de licencia en herramientas de Microsoft. Plan B: exportar la ecuación como imagen (PNG/SVG).
10. **CSL:** peso de los estilos y locales, comportamiento del procesador con las **variantes en español** (`es-ES`, `es-MX`, etc.) y licencia de los estilos.
11. **CORS de APIs de metadatos** (CrossRef por DOI, Open Library/Google Books por ISBN): confirmar que responden desde un navegador, sus límites y cuáles necesitan clave. **Obtener metadatos desde una URL cualquiera no es viable sin servidor** por CORS: ofrecer formulario manual.
12. **Fórmulas de legibilidad en español** (Fernández-Huerta, Szigriszt-Pazos/INFLESZ): verificar coeficientes contra la fuente original antes de publicarlas, y la calidad del contador de sílabas.
13. **`File System Access API`** solo existe en navegadores Chromium; hay que garantizar la alternativa (descarga clásica).
14. **Wake Lock, `OffscreenCanvas`, módulos en Workers** y otras APIs: confirmar versiones mínimas de Safari iOS.
   - **✅ Resuelto (S10, MDN BCD 8.1.10):** workers módulo iOS 15; `OffscreenCanvas` iOS 16.4; `'wasm-unsafe-eval'` iOS 16; Wake Lock iOS 18.4. Propuesta: mínimo **Safari iOS 16.4**; Wake Lock opcional. Tabla en `spikes/s10-plataforma/README.md`.
15. **Cuota y persistencia de IndexedDB:** límites reales por navegador (sobre todo Safari/iOS), si `navigator.storage.persist()` se concede, y si el navegador puede **borrar datos** de sitios que no se usan durante un tiempo (en Safari hay políticas de este tipo; comprobar si las apps instaladas en pantalla de inicio están exentas). Condiciona el diseño del respaldo.
   - **Fase 0 (S11, parcial):** `persist()` no se concede sin gesto/instalación (Chromium, WebKit) y en Firefox pide permiso; `estimate()` en WebKit no cuenta los blobs. Cuota y borrado de Safari iOS **sin medir** (página `spikes/s11-almacenamiento/` lista). Estrategia en ADR-006: recordatorio de respaldo + ZIP.
16. **Proyectos con archivos grandes:** comportamiento al guardar *blobs* de decenas de MB en IndexedDB, rendimiento al exportar/importar un proyecto a ZIP de cientos de MB en celulares y si hace falta procesar por trozos.
   - **Fase 0 (S11):** 5–80 MB en IndexedDB y proyecto de 200 MB a ZIP e importado idéntico en los 3 motores (exportar < 1 s sin coste de memoria; importar 2,5–7,8 s, +280–640 MB de pico en escritorio). Bug de WebKit con `File.slice()` → copiar antes de guardar. iPhone pendiente (ADR-006).

---

## 8. Arquitectura

### 8.1 Visión general

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SHELL (index.html, router, navegación, ajustes, instalación PWA)         │
│   └─ carga módulos bajo demanda con import()                             │
├──────────────────────────────────────────────────────────────────────────┤
│ MÓDULOS (js/modules/<id>/)                                               │
│  compresor · escaner · caja-pdf · office-pdf · portadas · fuentes ·      │
│  corrector · contador · comparador · horarios · plantillas · graficos ·  │
│  diagramas · presentaciones · ecuaciones                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ MOTORES COMPARTIDOS (js/engines/)                                        │
│  pdf/ (pdf-lib + pdf.js)   text/ (tokens, oraciones, sílabas, diff)      │
│  image/ (cargar, reducir, JPEG)   docx/ (exportar .docx)                 │
│  render/ (SVG/PNG/PDF export)   target-search/ (búsqueda de tamaño)     │
├──────────────────────────────────────────────────────────────────────────┤
│ NÚCLEO (js/core/)                                                        │
│  storage  profile  projects  events  files  workers  net-guard  backup   │
│  settings  diag (diagnóstico local)  search (buscador de herramientas)   │
├──────────────────────────────────────────────────────────────────────────┤
│ SERVICE WORKER: precache del shell · caché de módulos · descarga offline │
│ por módulo · versionado y limpieza                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Estructura del repositorio

```
mi-uni/
├─ index.html · manifest.webmanifest · sw.js
├─ css/            tokens.css · base.css · components.css
├─ js/
│  ├─ shell/       app.js · router.js · registry.js · nav.js · install.js
│  ├─ core/        storage.js · profile.js · files.js · workers.js
│  │               net-guard.js · backup.js · settings.js
│  │               projects.js · events.js · diag.js · search.js
│  ├─ engines/     pdf/ · text/ · image/ · docx/ · render/ · target-search/
│  ├─ modules/     <id>/ index.js · ui.js · logic.js · worker.js · README.md
│  └─ vendor/      (copias locales de librerías) · VERSIONS.md · licencias
├─ assets/         wasm/ · dictionaries/ · csl/ · fonts/ · templates/ · icons/
├─ tests/          unitarios (Node) · fixtures/ (PDFs, docs, imágenes de prueba)
├─ docs/           CONTEXT.md · INSTRUCTIONS.md · modules/*.md · decisions/ADR-*.md
├─ LICENSE         (AGPL-3.0)
└─ README.md
```

### 8.3 Contrato de módulo

Todo módulo exporta un objeto con esta forma (el *shell* lo registra y lo monta):

```js
export default {
  id: 'compresor',                 // único, minúsculas, sin espacios
  nombre: 'Compresor de PDF',
  categoria: 'pdf',                // pdf | documentos | planificacion | visual
  icono: 'icons/compresor.svg',
  ruta: '#/compresor',
  pesado: true,                    // si requiere descarga opcional de assets
  assets: ['assets/wasm/gs.wasm'], // lo que necesita para funcionar offline
  async montar(contenedor, ctx) {},   // ctx: storage, profile, projects, events, files, workers, net, ui, settings
  async desmontar() {},               // liberar memoria, terminar workers
};
```

Reglas: un módulo **no importa a otro módulo directamente**; comparte código solo a través de `engines/` y `core/`. Esto permite desplegar o probar cada módulo por separado.

### 8.4 Control de red (privacidad verificable)

- Una **Content-Security-Policy** vía `<meta http-equiv>` restringe `connect-src` a `'self'` más una **lista blanca explícita** (solo las APIs de metadatos, p. ej. CrossRef/Open Library, y únicamente si el dueño confirma su uso).
- `core/net-guard.js` envuelve `fetch` y **registra y muestra** cualquier petición externa; la UI enseña un indicador ("Esta acción consultó crossref.org") y el usuario puede desactivarlas en Ajustes.
- Ninguna petición puede transportar contenido de archivos del usuario.
- Sin CDN de librerías, sin fuentes remotas, sin analítica.

### 8.5 Offline y caché

- **Shell** (HTML, CSS, núcleo, navegación): precache en la instalación.
- **Módulos livianos:** caché en uso (*stale-while-revalidate* con versión).
- **Módulos pesados** (Ghostscript, OpenCV, LibreOffice, diccionario, Mermaid…): el usuario pulsa **"Descargar para usar sin conexión"**; se guardan en Cache API con **nombre versionado**, con barra de progreso y tamaño visible. Se solicita almacenamiento persistente (`navigator.storage.persist()`) y se muestra el espacio usado, con opción de liberar por módulo.
- Versionado: al publicar una versión nueva, el service worker conserva lo vigente hasta que la nueva esté completa y luego limpia lo viejo.

### 8.6 Sistema de proyectos y entidades compartidas

**Idea.** Un **proyecto** es un espacio donde el usuario reúne los recursos de un mismo objetivo (una tarea, una investigación, una presentación). Los módulos no comparten sus almacenes internos: se comunican a través de **entidades con contrato** y de la API `ctx.projects`. Así, un cambio interno en un módulo no rompe a los demás.

**Entidad base** (todos los recursos la comparten):

```json
{
  "id": "uuid",
  "tipo": "documento | referencia | nota | dataset | grafico | diagrama | presentacion | horario",
  "proyectoId": "uuid | null",
  "titulo": "Texto legible",
  "creado": "2026-11-21T15:00:00-04:00",
  "modificado": "2026-11-21T15:30:00-04:00",
  "origen": "id del módulo que lo creó, p. ej. compresor",
  "version": 1
}
```

**Contratos por tipo** (los campos específicos se suman a la entidad base):

| Tipo | Contenido específico |
|---|---|
| `documento` | `nombre`, `mime`, `tamano`, `hash` (SHA-256), `blobId` (los bytes viven en un almacén aparte), `paginas` si aplica |
| `referencia` | Objeto en formato **CSL JSON** (autores como `{family, given}`, `issued`, `container-title`, `DOI`, etc.) |
| `nota` | `texto` (Markdown), `etiquetas` |
| `dataset` | `columnas` (nombre y tipo) y `filas` (o `blobId` si es grande) |
| `grafico` | `spec` (configuración reproducible) + `imagenBlobId` |
| `diagrama` | `fuente` (texto Mermaid/Markdown) + `imagenBlobId` |
| `presentacion` | `markdown` + `tema` + opcionalmente el PDF exportado |
| `horario` | combinación elegida, preferencias y exportaciones |

**Proyecto:**

```json
{
  "id": "uuid",
  "tipo": "proyecto",
  "plantilla": "trabajo | investigacion | presentacion | datos | libre",
  "nombre": "Informe de Biología",
  "cursoId": "id del curso del perfil | null",
  "recursos": [{ "tipo": "documento", "id": "uuid" }, { "tipo": "referencia", "id": "uuid" }],
  "creado": "...",
  "modificado": "..."
}
```

**Reglas.**
- Los **bytes de archivos** se guardan en un almacén `blobs` de IndexedDB, separado de los metadatos, y se referencian por `blobId` y `hash` (permite detectar duplicados).
- Un recurso puede **no pertenecer a ningún proyecto** (`proyectoId: null`): es el "uso rápido".
- **Plantillas de proyecto** (solo sugieren herramientas; no limitan): Trabajo/tarea, Investigación, Presentación, Análisis de datos, Libre.
- **Papelera local:** borrar un recurso o proyecto lo mueve a la papelera; se vacía manualmente.
- **Exportar/importar proyecto:** ZIP con `manifest.json` (entidades, versión del esquema) y los archivos. Importar crea IDs nuevos si hay colisiones.
- El **esquema está versionado** y `storage.js` aplica migraciones; ningún módulo toca el esquema directamente.
- La app muestra **espacio usado** por proyecto y avisa antes de agotar la cuota.

**API (`ctx.projects`), resumen:** `crear(plantilla, datos)`, `obtener(id)`, `listar(filtro)`, `guardarRecurso(proyectoId, entidad, bytes?)`, `leerRecurso(id)`, `quitarRecurso(id)`, `exportar(id)`, `importar(archivo)`, `suscribir(callback)`.

### 8.7 Bus de eventos interno

**Idea.** Un evento es una notificación local de que **algo ocurrió**. No obliga a nadie a hacer nada.

- Implementación: `EventTarget`/`CustomEvent` en `core/events.js`; nombres con formato `dominio:accion`.
- **El payload solo lleva identificadores y metadatos** (`{ id, tipo, proyectoId, origen }`), **nunca contenido** de archivos ni textos.
- Los eventos **no se persisten** (no son un registro). Quien se suscribe debe darse de baja en `desmontar()`.

**Catálogo inicial:**

| Evento | Cuándo se publica | Quién podría reaccionar (siempre sugiriendo, nunca ejecutando solo) |
|---|---|---|
| `documento:importado` | Se añade un archivo a un proyecto | Contador, comparador, metadatos |
| `documento:generado` | Un módulo produce un PDF/DOCX/imagen | Proyecto (lo lista), compresor ("¿comprimir?") |
| `referencia:añadida` / `referencia:actualizada` | Cambia la biblioteca de fuentes | Bibliografía, proyecto |
| `grafico:generado` | Se crea un gráfico o diagrama | Proyecto, presentaciones |
| `proyecto:creado` / `proyecto:exportado` | Ciclo de vida del proyecto | Panel de actividad local |
| `perfil:actualizado` / `curso:cambiado` | Cambian datos del perfil | Portadas, plantillas, presentaciones, horarios |
| `horario:fijado` | Se elige una combinación de horario | Plantillas (horario en blanco), exportaciones |

**Ejemplo correcto:** al añadir una referencia, el sistema anuncia `referencia:añadida`; el módulo de bibliografía muestra un aviso "¿Incluirla en tu lista?". **Ejemplo incorrecto:** que la bibliografía se reescriba sola.

### 8.8 Diagnóstico local (en lugar de telemetría)

Se descarta la telemetría remota. En su lugar, un **registro local** pensado para mejorar la app y ayudar al dueño a medir rendimiento en celulares reales:

- Se guarda en IndexedDB (rotación: últimos ~500 registros) un resumen por operación: `{ evento, modulo, duracionMs, exito, versionApp, dispositivoGenerico }`. **Nunca** contenido de documentos, textos, nombres de archivo ni credenciales.
- Pantalla **"Diagnóstico"** con tasa de éxito y tiempos por módulo, y el porcentaje de proyectos que usan 2 o más módulos (indicador de integración, visible solo para el usuario).
- Botón **"Copiar reporte"**: el usuario decide si lo comparte. **No se envía nada automáticamente.**
- Es **opt-in**, con una explicación breve y la posibilidad de borrarlo cuando quiera.

---

## 9. Especificación módulo por módulo

> Formato: **Propósito → Qué hace → Cómo (técnica) → Límites/riesgos → Aceptación.** Las fases y el orden están en `INSTRUCTIONS.md`.

### 9.0 Perfil compartido y Proyectos (núcleo)

#### 9.0.a Perfil compartido

**Propósito.** Evitar reescribir los mismos datos en cada portada, plantilla o presentación.

**Qué hace.**
- Guarda **un perfil del estudiante**: nombre completo, universidad, facultad/escuela, carrera, matrícula (opcional), ciudad, idioma.
- Guarda **cursos/materias** del periodo: nombre, código, profesor, sección, periodo académico. Se pueden archivar al terminar el semestre.
- Ofrece **valores por defecto**: tamaño de papel (Carta), estilo de cita preferido, fuente y tamaño habituales.
- Expone a los módulos una API simple: `ctx.profile.get()`, `ctx.profile.curso(id)` y suscripción a cambios.
- **Autocompleta** portadas, portadas de cuaderno (plantillas), diapositiva de título (presentaciones) y las materias del armador de horarios.

**Cómo.** Esquema versionado en IndexedDB; exportación/importación JSON; cifrado opcional con contraseña (WebCrypto, PBKDF2 + AES-GCM) para quien comparta dispositivo.

**Límites.** **No almacenar** números de documentos de identidad, pasaportes ni datos financieros. La matrícula es opcional. El perfil nunca se envía a ningún sitio.

**Aceptación.** Editar el perfil actualiza al instante los módulos abiertos; exportar/importar en otro navegador reproduce todo; sin perfil, los módulos funcionan igual (los campos quedan vacíos y editables).

#### 9.0.b Proyectos

**Propósito.** Que el usuario piense en **resultados** ("terminar mi informe") y no en herramientas sueltas. Es la funcionalidad transversal más importante del producto.

**Qué hace.**
- **Crear proyectos** a partir de plantillas (Trabajo/tarea, Investigación, Presentación, Análisis de datos, Libre), opcionalmente ligados a un **curso** del perfil.
- **Panel de proyecto:** recursos agrupados por tipo (documentos, referencias, notas, datos y gráficos, entregables), con tamaño y fecha de modificación; abrir cada recurso **en el módulo adecuado**; renombrar, mover entre proyectos, duplicar, borrar (a la papelera).
- **"Guardar en proyecto"** desde cualquier herramienta al terminar, y **"Usar un recurso del proyecto"** al empezar (p. ej., el compresor ofrece los PDF del proyecto).
- **Búsqueda dentro del proyecto** y desde el buscador global.
- **Exportar/importar** un proyecto como ZIP (respaldo y traslado entre dispositivos).
- **Espacio usado** por proyecto y avisos de cuota.

**Qué NO hace.** No sincroniza con la nube, no colabora en tiempo real y no es obligatorio.

**Integración por módulo** (qué lee, qué guarda y qué eventos publica):

| Módulo | Lee del proyecto | Guarda en el proyecto | Eventos que publica |
|---|---|---|---|
| Compresor | `documento` (PDF) | `documento` (PDF comprimido) | `documento:generado` |
| Caja PDF | `documento`(s) | `documento` (unido/dividido/editado) | `documento:generado` |
| Escáner | — | `documento` (PDF escaneado) | `documento:generado` |
| Office → PDF | `documento` (docx/pptx/xlsx) | `documento` (PDF) | `documento:generado` |
| Portadas | perfil y curso | `documento` (PDF/DOCX) | `documento:generado` |
| Fuentes y bibliografía | `referencia` | `referencia`; `documento` (bibliografía exportada) | `referencia:añadida`, `referencia:actualizada`, `documento:generado` |
| Corrector | `documento`/`nota` de texto | `nota` o `documento` (texto corregido), opcional | — |
| Contador | `documento`/`nota` de texto | `nota` con el informe, opcional | — |
| Comparador | dos `documento`/`nota` de texto | `documento` (informe de diferencias) | `documento:generado` |
| Horarios | cursos del perfil | `horario` (+ PNG/PDF/.ics) | `horario:fijado` |
| Plantillas | perfil | `documento` (PDF) | `documento:generado` |
| Gráficos | `dataset` | `dataset`, `grafico` | `grafico:generado` |
| Diagramas | `nota` | `diagrama` | `grafico:generado` |
| Presentaciones | `grafico`, `referencia`, perfil | `presentacion` (+ PDF) | `documento:generado` |
| Ecuaciones | — | `nota` (LaTeX + imagen) | — |

**Límites/riesgos.** El almacenamiento local puede perderse si el usuario borra los datos del navegador o si el sistema los limpia (ver §7, punto 15): por eso exportar es fácil y se recuerda periódicamente. Un proyecto con muchos PDFs grandes consume cuota rápido: mostrar el uso y permitir limpiar.

**Aceptación.** El **flujo de referencia del MVP** (§3.3) se completa de punta a punta; exportar el proyecto a ZIP e importarlo en otro navegador lo reproduce idéntico; cada módulo funciona igualmente sin proyecto; ningún módulo accede al almacén de otro.

---

### 9.1 Compresor de PDF a tamaño objetivo

**Propósito.** El dolor principal del dueño: entregar tareas que **no pueden pasar de 5 MB** partiendo de PDFs mucho más grandes.

**Idea clave.** El producto no es "elige DPI y calidad"; es **"dime el tamaño máximo y yo busco la mayor calidad que cabe"**. Los controles manuales existen como modo avanzado.

**Qué hace.**
1. **Diagnóstico:** analiza qué pesa (cantidad y peso de imágenes, DPI efectivo, formatos, fuentes, metadatos, adjuntos, si las páginas son escaneos completos) y lo muestra ("92 % imágenes").
2. **Pasada sin pérdida:** quita metadatos y objetos sin usar, deduplica imágenes, recomprime flujos, subsetea fuentes. Si ya cabe en la meta, **termina sin degradar**.
3. **Búsqueda con pérdida:** una escala de **agresividad 0–1** que mapea a pares (DPI, calidad) —punto de partida a calibrar: `300/85 → 250/80 → 200/75 → 150/70 → 150/60 → 120/55 → 100/50 → 90/45 → 72/40`— y una **búsqueda binaria** (máx. 5–6 iteraciones) del nivel menos agresivo que cumpla la meta. Para acelerar, **estima con una muestra** (~10 % de las páginas repartidas) y confirma con 1–2 corridas completas.
4. **Escalera de emergencia** si no llega: rasterizar solo páginas pesadas → rasterizar todo a ~100 DPI en gris → **dividir en partes** (cada una ≤ meta) → informar con claridad.
5. **Guard final:** verifica que el PDF abre, conserva el nº de páginas y **nunca pesa más que el original** (si pesara más, entrega el original y avisa).

**Meta de tamaño.** Por defecto **4.800.000 bytes**: "5 MB" puede significar 5.000.000 o 5.242.880 bytes según la plataforma; 4,8 MB cumple en ambos. Zona de aceptación: resultado entre **90 % y 100 %** de la meta (no sobrecomprimir).

**Palancas (mayor a menor impacto).** Bajar DPI → calidad JPEG (forzando recompresión de JPEG existentes) → escala de grises en páginas casi sin color → blanquear fondo y subir contraste en escaneos → encoder JPEG optimizado y submuestreo de croma 4:2:0 → CMYK→RGB → texto en 1 bit (solo "modo documento", con aviso de aspereza).

**Cómo.** Ghostscript WASM en un Worker con argumentos construidos por `gs-args.js` (parámetros a verificar: `-dDownsample*Images`, `-d*ImageResolution`, `-d*ImageDict` con `/QFactor`, y **`-dPassThroughJPEGImages=false`**, sin el cual los JPEG existentes no se recomprimen). Modo "escaneo": pdf.js renderiza páginas → procesamiento (gris, blanqueo, niveles) → JPEG → `pdf-lib` ensambla.

**Límites/riesgos.** Un PDF de solo texto casi no comprime. Reescribir un PDF puede **aumentarlo** o perder formularios, firmas, marcadores; los PDFs **cifrados** pueden no abrirse. RAM limitada en celulares. **El "modo escaneo" pierde el texto seleccionable.**

**Aceptación.** Sobre un banco de prueba representativo, ≥ 80 % de los archivos llegan a la zona 90–100 % de la meta; el resto cae correctamente en la escalera; ninguno sale roto ni mayor que el original; la UI no se congela y se puede cancelar.

---

### 9.2 Escáner de bolsillo

**Propósito.** Convertir fotos de páginas en un PDF limpio, derecho y liviano, sin apps de terceros.

**Qué hace.**
- Captura con la cámara (`getUserMedia`, o `<input type="file" accept="image/*" capture>` como alternativa fiable en móvil) o importa desde la galería.
- **Detecta los bordes de la hoja** automáticamente y deja **ajustar las 4 esquinas** a mano.
- **Corrige la perspectiva** (la hoja queda rectangular) y ofrece "ajustar a Carta/A4".
- **Filtros:** Original, Mejorado (balance de blancos y niveles automáticos), Gris, **Blanco y negro** (umbral adaptativo). Enderezado (*deskew*) y rotación.
- **Varias páginas:** lista con miniaturas, reordenar, borrar, repetir una toma.
- **Salida:** PDF ensamblado con `pdf-lib`, **ajustable a un tamaño objetivo** (≤ 5 MB) reutilizando la lógica de `target-search`.

**Cómo.** OpenCV.js (o librería sobre él) para contornos y `warpPerspective`. Como el escáner **controla la codificación**, la búsqueda de tamaño es rápida: se prueban calidades/DPI codificando con canvas y se mide el resultado, sin ejecutar Ghostscript.

**Límites/riesgos.** Las fotos de 12+ MP deben **reducirse al cargarlas** (p. ej., lado largo ≤ ~3500 px, y respetando el tope de área de canvas de iOS) y procesarse **una a una** liberando memoria. La detección de bordes falla con fondos de color similar a la hoja o poca luz: por eso la edición manual de esquinas es obligatoria, no opcional. Las imágenes HEIC pueden requerir conversión.

**Aceptación.** Fotografiar 10 páginas de un libro sobre una mesa produce un PDF derecho, legible y ≤ 5 MB en un celular de gama media, sin cierres por memoria.

---

### 9.3 Caja de herramientas PDF

**Propósito.** Las operaciones de PDF del día a día, sin subir nada.

**Qué hace.**
- **Unir** varios PDFs; **dividir** por rangos (`1-3,5,8-10`), cada N páginas o **por tamaño máximo** (reutiliza `split`).
- **Organizar:** cuadrícula de **miniaturas** (pdf.js) para reordenar arrastrando, borrar, rotar y duplicar páginas; extraer páginas.
- **Numerar páginas** (posición, formato "Página X de Y", número inicial, omitir la portada).
- **Marca de agua** de texto o imagen (opacidad, rotación, mosaico).
- **Firmar:** dibujar la firma con el dedo/ratón o subir una imagen, guardarla **localmente**, colocarla y escalarla sobre la página.
- **Rellenar formularios** (campos AcroForm vía `pdf-lib`), con opción de "aplanar".
- **Imágenes → PDF** y **PDF → imágenes** (a un DPI elegido, descarga en ZIP).
- **Metadatos:** ver, editar y limpiar.

**Límites/riesgos.** `pdf-lib` no abre PDFs cifrados con contraseña (informar con claridad). Archivos grandes agotan la memoria del teléfono. La fidelidad al editar PDFs complejos tiene límites; avisar cuando una operación pueda alterar el documento.

**Aceptación.** Cada operación produce un PDF que abre correctamente en un visor externo; el reordenamiento por miniaturas es fluido con 100 páginas; los formularios simples se rellenan y guardan.

---

### 9.4 Word / PowerPoint / Excel → PDF

**Propósito.** Convertir documentos de Office a PDF **sin servidor**, siendo honestos sobre la fidelidad.

**Estrategia de dos motores.**
1. **Motor liviano (por defecto):** una librería WASM ligera (`office2pdf`, Pandoc+Typst para DOCX u otra equivalente que se elija en la Fase 0). Rápido y pequeño, **fidelidad parcial** (diseños complejos, SmartArt, tipografías especiales pueden diferir).
2. **Motor de alta fidelidad (opcional):** **LibreOffice en WASM**, **descargable bajo demanda** y cacheado (cientos de MB; ver §7, puntos 2–3). Más fiel, pero lento al arrancar y con alto consumo de RAM; en celulares modestos puede fallar.

**Qué hace.** Detecta el tipo (`.docx`, `.pptx`, `.xlsx`, y quizá `.odt/.rtf`), elige motor (el usuario puede forzar uno), muestra **progreso**, y presenta una **vista previa de las primeras páginas** (renderizadas con pdf.js) para que el usuario compruebe el resultado **antes de descargar**. Ofrece enlazar con el compresor ("hacerlo ≤ 5 MB").

**Puntos de fidelidad a gestionar.**
- **Fuentes:** Calibri, Cambria, Times New Roman y Arial no existen en el entorno WASM; se sustituyen por fuentes **métricamente compatibles** (p. ej., Carlito, Caladea, Liberation) para que el texto no se reacomode. Verificar licencias y peso.
- **Excel:** áreas de impresión, saltos de página y escala determinan la salida.
- **PowerPoint:** se pierden animaciones y transiciones; fuentes incrustadas y objetos complejos pueden variar.
- **Aviso permanente** en la UI: "el resultado puede diferir de Word/PowerPoint/Excel".

**Aceptación.** Con un banco de 15 documentos reales (informes con tablas e imágenes, presentaciones, hojas con gráficos) se documentan **resultados por motor** (fiel / aceptable / falla) y la UI recomienda el motor adecuado. Nunca se entrega un PDF vacío o corrupto sin avisar.

---

### 9.5 Generador de portadas

**Propósito.** Portadas correctas en un minuto, con datos del perfil.

**Qué hace.**
- Plantillas: **APA 7 (portada de estudiante)**, portada **universitaria genérica**, portada **sobria** y portada con **logo** (el usuario sube el logo de su universidad).
- Campos: título, autor, universidad, facultad, carrera, materia, código, profesor, fecha de entrega, ciudad. **Autocompletados** desde el perfil/curso elegido.
- Configurable: tipo y tamaño de letra, interlineado, alineación, márgenes, papel (Carta por defecto).
- Exporta a **PDF** (vectorial) y a **`.docx` editable** (para que el estudiante pueda ajustar y unirla a su documento).
- Vista previa en vivo; guardar **plantillas propias** (cada universidad tiene su formato).

**Límites.** **Las normas de portada de cada universidad varían**; las plantillas incluidas son puntos de partida. Pedir al dueño el reglamento de formato de su universidad para crear una plantilla propia fiel.

**Aceptación.** La portada APA exportada a PDF y a DOCX respeta los elementos del estilo; al cambiar de curso en el perfil, los campos se actualizan; el `.docx` abre bien en Word.

---

### 9.6 Gestor de fuentes y bibliografías

**Propósito.** Llevar tus fuentes en un solo lugar y generar citas y referencias sin errores de formato.

**Qué hace.**
- **Biblioteca personal** (IndexedDB): tipo de fuente (libro, capítulo, artículo, web, tesis, informe, video, etc.), autores, año, título, editorial/revista, volumen/número/páginas, DOI, URL, fecha de consulta, **notas** y **etiquetas**; agrupar por **proyecto/tarea**.
- **Importar/exportar:** BibTeX, RIS y **CSL JSON**.
- **Búsqueda de metadatos:** por **DOI** (CrossRef) y por **ISBN** (Open Library/Google Books), que **requieren internet**; el usuario las lanza explícitamente y la app lo indica. **Por URL: formulario manual** (no es posible leer páginas arbitrarias desde el navegador).
- **Generar:** lista de **referencias/bibliografía** y **citas en el texto** (entre paréntesis y narrativa), en **APA 7** (principal) y otros estilos (IEEE, MLA, Chicago, Vancouver, Harvard…), con idioma español.
- **Copiar con formato** (HTML enriquecido, para pegar en Word conservando cursivas) y exportar a `.docx`, `.md` y `.txt`.

**Cómo.** Motor **CSL** con estilos y locales oficiales (en lugar de escribir APA a mano). Mapeo de las respuestas de las APIs a CSL JSON.

**Límites/riesgos.** Los metadatos de las APIs pueden estar incompletos o mal capitalizados: la UI debe permitir **revisar y corregir** antes de citar. Verificar CORS, límites de uso y licencias de los estilos (ver §6 y §7).

**Aceptación.** Una lista de 20 fuentes de tipos distintos produce una bibliografía APA 7 ordenada y con cursivas correctas; importar/exportar BibTeX conserva los datos; funciona sin internet salvo la búsqueda por DOI/ISBN.

---

### 9.7 Corrector ortográfico offline (español)

**Propósito.** Revisar ortografía sin enviar el texto a ningún servicio.

**Qué hace.**
- Revisa un texto pegado o importado (`.txt`, `.docx`, `.md`) y **resalta** las palabras dudosas con **sugerencias** ordenadas por similitud.
- **Diccionario personal** (palabras, nombres propios, **dominicanismos**, términos técnicos): añadir, ignorar una vez, ignorar siempre; exportar/importar.
- Resultado en dos vistas: texto marcado y **lista de errores**; contador de errores.
- Procesa en un **Worker** y por trozos para no bloquear con documentos largos.

**Cómo.** `nspell` (o Hunspell WASM) con un diccionario de español; la marca visual se hace sobre un editor `contenteditable` o una capa superpuesta (un `<textarea>` no permite subrayado).

**Límites (decirlo en la UI).** Es un corrector **ortográfico, no gramatical**: no detecta errores como *haber/a ver*, *hay/ahí/ay* o concordancias. Opcionalmente, un conjunto **pequeño y conservador** de avisos de confusión frecuente, **desactivado por defecto** para evitar falsos positivos. El tamaño y la licencia del diccionario se verifican en la Fase 0.

**Aceptación.** Un texto de 5.000 palabras se revisa en pocos segundos en el celular de referencia; las palabras añadidas al diccionario personal persisten; no se hace ninguna petición de red.

---

### 9.8 Contador y analizador de texto

**Propósito.** Saber con precisión cuánto mide un texto y cómo se lee.

**Qué hace.**
- **Conteos:** palabras, caracteres (con y sin espacios), oraciones, párrafos, **páginas estimadas** (parámetros: fuente, tamaño, interlineado, márgenes; valores orientativos: ~250–300 palabras/página a doble espacio y ~500–600 a espacio simple en Times 12; **todo ajustable**).
- **Tiempos:** lectura silenciosa y **tiempo de exposición oral** (valores iniciales orientativos ~200–250 y ~130–150 palabras/minuto, editables).
- **Legibilidad en español:** índices **Fernández-Huerta** y **Szigriszt-Pazos (INFLESZ)** con interpretación en palabras. *(Verificar las fórmulas contra las fuentes originales antes de publicarlas.)*
- **Frecuencias:** palabras más usadas (excluyendo palabras vacías), **repeticiones cercanas**, **oraciones muy largas**, **muletillas** frecuentes.
- Compara el conteo contra un **límite** que el usuario define ("máx. 1.500 palabras") con aviso visual.

**Cómo.** Motor de texto compartido (`engines/text`): segmentación en palabras y oraciones sensible al español (abreviaturas, puntos de números), contador de **sílabas** por reglas (diptongos, hiatos). Todo en el cliente, sin límite artificial de longitud (procesamiento por trozos para textos enormes).

**Límites.** El conteo de sílabas por reglas tiene errores en casos raros; las métricas de legibilidad son **orientativas**, no veredictos.

**Aceptación.** Los conteos coinciden con los de Word en textos de prueba (tolerancia documentada); 100.000 palabras se analizan sin congelar la UI.

---

### 9.9 Comparador de versiones de texto

**Propósito.** Ver exactamente qué cambió entre dos borradores.

**Qué hace.**
- Entrada: pegar dos textos o importar archivos (`.txt`, `.md`, `.docx`, y texto extraído de PDF).
- Vistas: **lado a lado** y **en línea**; niveles de comparación por **palabra**, **oración** o **párrafo**.
- Opciones: ignorar mayúsculas, espacios, signos o saltos de línea.
- **Estadísticas** del cambio (palabras añadidas/eliminadas, % modificado) y **navegación** entre diferencias.
- Exporta un **informe** (HTML/PDF) con las diferencias marcadas.

**Cómo.** `jsdiff`. Para documentos grandes: **alinear primero por párrafos** y luego comparar por palabras dentro de cada par, para evitar costes cuadráticos. Procesar en Worker.

**Límites.** No es un detector de plagio (compara **dos textos que tú das**). Un documento con formato (negritas, tablas) se compara solo como texto.

**Aceptación.** Dos versiones de 20.000 palabras se comparan en pocos segundos; las diferencias se pueden recorrer una a una; el informe exportado se abre correctamente.

---

### 9.10 Armador de horarios

**Propósito.** Combinar materias y secciones sin choques y obtener un horario listo para usar.

**Qué hace.**
- Cargas **materias** con sus **secciones** (profesor, días, horas, aula). Datos autocompletables desde el perfil y reutilizables entre semestres.
- **Genera todas las combinaciones sin choques** (una sección por materia) y las **ordena** según preferencias: evitar ciertos días u horas, minimizar huecos, compactar días, preferir un profesor.
- Vista semanal con colores por materia; **comparar** varias opciones y **fijar** una.
- **Exporta:** imagen (PNG), PDF y **calendario `.ics`** (eventos semanales recurrentes hasta la fecha de fin del semestre, zona horaria **America/Santo_Domingo**, UTC-4 sin horario de verano).

**Cómo.** Búsqueda con *backtracking* y poda por choques; puntuación para ordenar; generación de `.ics` conforme a RFC 5545; render a SVG/canvas para la imagen y a `pdf-lib` para el PDF.

**Límites.** Si hay muchísimas secciones, limitar y avisar el número de combinaciones; las horas se introducen a mano (no se importan del sistema de la universidad).

**Aceptación.** Con 6 materias y 3 secciones cada una devuelve opciones válidas sin choques en < 1 s; el `.ics` se importa correctamente en Google Calendar y Apple Calendar.

---

### 9.11 Plantillas imprimibles

**Propósito.** Generar hojas para estudiar, organizarse y tomar apuntes, listas para imprimir.

**Qué hace.**
- Catálogo: **Cornell**, **rayada**, **cuadriculada**, **de puntos**, **milimetrada**, **planificador semanal y mensual**, **horario semanal en blanco**, **lista de tareas/checklist**, **cuadro de repaso**, **portada de cuaderno** y **tarjetas de estudio** imprimibles (varias por hoja).
- Parámetros: **papel** (Carta por defecto/A4), orientación, márgenes (con margen extra para perforar), separación de líneas, grosor y color, encabezado con nombre/materia desde el perfil.
- **PDF vectorial** (nítido a cualquier escala) con vista previa; varias páginas en un solo archivo.

**Cómo.** Generación directa con `pdf-lib` (líneas y texto vectoriales); previsualización con pdf.js o SVG.

**Aceptación.** Las medidas impresas son exactas (comprobar con regla en una impresión real), los márgenes de perforación son correctos y el PDF pesa muy poco.

---

### 9.12 Gráficos desde datos pegados

**Propósito.** De una tabla pegada a un gráfico presentable en segundos.

**Qué hace.**
- **Pegar** datos desde Excel/Sheets (TSV), CSV o JSON, o **importar** un archivo.
- **Detección** de encabezados y tipos de columna; selector de **separador decimal** (en español se usa coma: `1.234,56`; el inglés usa `1,234.56`), con detección y confirmación.
- Tipos: barras (agrupadas/apiladas), líneas, áreas, circular, dispersión, histograma.
- Personalización: título, etiquetas de ejes, leyenda, cuadrícula, etiquetas de datos, tamaño de fuente y **paletas accesibles** (aptas para daltonismo).
- **Exportar:** PNG a 2×/3× de resolución, **SVG** (si el motor elegido lo permite) y **copiar al portapapeles** como imagen para pegar en Word.

**Límites.** Es un graficador **sencillo**, no un sistema de análisis. Con decenas de miles de puntos, muestrear o avisar. Decidir en la Fase 0 entre Chart.js (PNG) y ECharts (SVG) según la necesidad de exportación vectorial.

**Aceptación.** Pegar una tabla de Excel con coma decimal produce un gráfico correcto; el PNG exportado conserva nitidez al insertarlo en un documento.

---

### 9.13 Mapas mentales, diagramas de flujo y líneas de tiempo

**Propósito.** Crear esquemas visuales a partir de **texto**, rápido y sin arrastrar cajas.

**Qué hace.**
- Tres modos: **diagrama de flujo**, **línea de tiempo** y **mapa mental** (este último puede partir de un **esquema en Markdown**, p. ej., con markmap).
- **Editor de texto con vista previa en vivo**, con plantillas y ejemplos listos.
- **Temas** legibles y modo claro/oscuro; ajuste automático de tamaño.
- **Exporta** a **SVG**, **PNG** y **PDF**; guarda diagramas en la biblioteca local.

**Límites/riesgos.** La edición es **basada en texto** (no hay arrastrar-y-soltar libre en la primera versión; es una decisión de alcance). Mermaid es pesado (carga diferida). Exportar a PNG puede fallar por `foreignObject`: configurar etiquetas sin HTML y probarlo.

**Aceptación.** Un diagrama de 30 nodos se renderiza y exporta a PNG/SVG/PDF sin errores; las plantillas funcionan sin conexión.

---

### 9.14 Presentaciones desde Markdown

**Propósito.** Escribir contenido y obtener diapositivas sobrias, sin pelear con un editor visual.

**Qué hace.**
- Markdown con separadores `---`; **temas sobrios** (2–3); relaciones de aspecto **16:9 y 4:3**; imágenes arrastradas e incrustadas; **código con resaltado** y **fórmulas** (KaTeX).
- **Notas del orador**, **modo presentador** (cronómetro y diapositiva siguiente) y **portada autogenerada** con datos del perfil.
- **Exporta** a **PDF** (impresión con `@page` ajustado al tamaño de la diapositiva) y a **HTML autónomo**; la exportación a **PPTX** queda como **opción experimental** posterior (de calidad limitada).

**Límites/riesgos.** El PDF por impresión depende del navegador (especialmente iOS): probar y documentar el método fiable. No es un sustituto de PowerPoint ni de Canva: es un camino rápido y limpio.

**Aceptación.** Un documento Markdown de 15 diapositivas con imágenes, código y una fórmula se exporta a un PDF con el tamaño correcto y sin cortes; el HTML exportado funciona sin conexión.

---

### 9.15 Editor de ecuaciones

**Propósito.** Escribir fórmulas matemáticas visualmente y llevarlas a un documento.

**Qué hace.**
- **Editor visual** (MathLive) con teclado matemático táctil, y entrada directa de **LaTeX**; render con KaTeX.
- **Plantillas** frecuentes (fracciones, raíces, sumatorias, integrales, matrices, estadística y probabilidad), **favoritos** e **historial**.
- **Exporta/copia:** **LaTeX**, **MathML**, **SVG** y **PNG** (fondo transparente). Para Word se ofrecen: pegar **MathML** (a verificar) y, como plan seguro, **insertar como imagen**.

**Límites/riesgos.** Convertir a **ecuaciones nativas de Word (OMML)** no es trivial; mantenerlo como mejora condicionada a lo que revele la Fase 0. El editor táctil debe probarse en celulares reales (teclado virtual, selección).

**Aceptación.** Una fórmula compleja (integral con límites y fracciones) se crea desde el celular, se copia como LaTeX/PNG y se ve correcta en un documento externo.

---

## 10. Experiencia de uso (UX) transversal

- **Pantalla de inicio** con las herramientas agrupadas por categoría (**PDF**, **Documentos**, **Planificación**, **Visual**), un **buscador protagonista** (encuentra por nombre, descripción, palabras clave, sinónimos y categoría; también proyectos y documentos recientes), la sección **Mis proyectos** y accesos recientes. Regla: el usuario puede usar cualquier herramienta **sin crear un proyecto**; el proyecto se ofrece al terminar ("Guardar en un proyecto").
- **Flujos conectados** (atajos entre módulos): "Escanear → Comprimir", "Convertir Office → Comprimir", "Portada → Unir con mi PDF", "Bibliografía → copiar a mi documento". Se implementan **pasando archivos por el núcleo** (no acoplando módulos).
- **Arrastrar y soltar** en escritorio; en móvil, selector de archivos y cámara. **Compartir** (`navigator.share`) cuando exista.
- **Estados claros:** cargando, procesando (con barra de progreso y botón *Cancelar*), error (con causa y qué hacer), éxito (con resumen: tamaño, páginas, parámetros).
- **Accesibilidad** (WCAG 2.1 AA como meta), teclado completo, contraste suficiente, objetivos táctiles ≥ 44 px, `lang="es"`.
- **Tema** claro/oscuro/alto contraste; respeto de `prefers-reduced-motion`.
- **Aviso de privacidad** breve y permanente: "Tus archivos no salen de tu dispositivo".

---

## 11. Riesgos transversales

1. **Memoria en celulares:** PDFs grandes, fotos de 12+ MP, WASM de cientos de MB. Mitigación: reducir al cargar, procesar secuencialmente, liberar buffers, avisar límites, probar en un Android de gama media y un iPhone real.
2. **Peso y complejidad del alcance:** son 16 módulos. Mitigación: **construir por fases** (ver `INSTRUCTIONS.md`), cada módulo usable por sí solo, y no avanzar sin cumplir la aceptación de la fase anterior.
3. **Fidelidad de conversiones** (Office→PDF) y **de edición de PDF**: comunicar límites, mostrar vistas previas, no prometer más de lo medido.
4. **Safari/iOS:** cámara, `OffscreenCanvas`, límites de canvas, módulos en Workers, instalación PWA y caché. Probar pronto, no al final.
5. **Licencias** (AGPL, diccionarios, estilos CSL, fuentes): revisar y documentar desde el principio.
6. **Actualización y caché del service worker:** errores clásicos de PWA (usuarios atrapados en versiones viejas). Mitigación: versionado estricto y botón "Buscar actualización".
7. **Pérdida de datos locales** (limpiar el navegador): recordatorio periódico de **exportar respaldo** y almacenamiento persistente.
8. **Dependencias abandonadas** (p. ej., builds WASM con poco mantenimiento): fijar versiones, copiarlas a `vendor/`, documentar alternativas.
9. **Crecimiento del alcance** por el catálogo ampliado: mitigación con la **lista de espera** (§3.4), el procedimiento de admisión y la regla de una sola herramienta nueva a la vez.
10. **Complejidad del modelo de proyectos:** si crece demasiado se vuelve el cuello de botella. Mitigación: contratos mínimos, esquema versionado, pruebas de exportar/importar y no añadir tipos de entidad sin ficha técnica.

---

## 12. Decisiones cerradas y abiertas

### 12.1 Cerradas (con base en las restricciones del dueño y la evaluación del informe externo)
1. **Plataforma:** PWA, web primero (móvil y escritorio).
2. **Cuentas:** ninguna por ahora; todo local con exportar/importar. Cuentas y sincronización solo si más adelante hay una necesidad real, como fase aparte y opcional.
3. **Alcance inicial:** **hito MVP** pequeño pero conectado (§3.3); el resto del catálogo en lista de espera (§3.4).
4. **Equipo:** una persona con apoyo de IA.
5. **Telemetría:** ninguna remota; diagnóstico local (§8.8).
6. **Tecnología de interfaz:** JS vanilla con módulos ES; reevaluar Preact + htm solo si la complejidad lo justifica (con ADR).

> Si el dueño quiere cambiar alguna de estas decisiones, hay que actualizar este documento y el ADR-001.

### 12.2 Abiertas (el dueño debe confirmarlas)

1. **Nombre definitivo** del proyecto y **dominio** (¿`usuario.github.io/mi-uni` o dominio propio?).
2. **Licencia:** confirmar **AGPL-3.0** para todo el proyecto (recomendado) o separar el compresor en otro repositorio.
3. **Formatos de su universidad:** reglamento de portadas, márgenes, fuentes, estilo de cita exigido. Es la materia prima para plantillas fieles.
4. **Dónde alojar los assets muy grandes** (LibreOffice WASM), si se decide incluirlo: troceado en GitHub Pages u otro alojamiento gratuito con CORS.
5. **Escala de notas / calendario académico:** no aplica a esta lista, pero el armador de horarios necesita las **fechas de inicio y fin** del semestre para el `.ics`.
6. **Dispositivos de prueba** del dueño (modelo de celular y navegador) para fijar presupuestos de rendimiento.

---

## 13. Glosario

- **PWA:** aplicación web instalable que funciona sin conexión gracias a un *service worker*.
- **Service worker:** script que intercepta peticiones y gestiona la caché para uso offline.
- **WASM (WebAssembly):** formato que permite ejecutar código compilado (C/C++/Rust) dentro del navegador.
- **Web Worker:** hilo en segundo plano; evita que la interfaz se congele.
- **IndexedDB / Cache API:** almacenamiento del navegador para datos y para archivos de la app, respectivamente.
- **CSL (Citation Style Language):** formato estándar de estilos de citas (APA, IEEE…) con procesadores en JS.
- **Meta de tamaño:** tamaño máximo en bytes que debe tener el PDF resultante.
- **Agresividad:** parámetro 0–1 que mapea a pares (DPI, calidad) en el compresor.
- **DPI efectivo:** resolución real de una imagen según el tamaño con el que se dibuja en la página.
- **Guard:** comprobación final que impide entregar un resultado peor o roto.
- **Net-guard:** envoltorio que controla y registra cualquier petición de red.
- **ADR:** *Architecture Decision Record*; nota breve que documenta una decisión técnica y su motivo.
- **Proyecto:** espacio local donde se reúnen los recursos de un mismo objetivo (una tarea, una investigación).
- **Entidad:** unidad de datos compartida entre módulos (documento, referencia, nota, dataset, gráfico…) con ID estable y contrato definido.
- **Evento:** notificación interna de que algo ocurrió (`documento:generado`); informa, no ordena.
- **Ficha técnica:** documento breve que se redacta **antes** de programar una herramienta (entradas, salidas, motores que reutiliza, errores, pruebas).
- **Hito MVP:** primer lanzamiento público (7 componentes conectados, §3.3).
- **Lista de espera:** herramientas conocidas pero fuera de alcance hasta que el dueño las promueva (§3.4).
- **Diagnóstico local:** registro de errores y tiempos que vive solo en el dispositivo y que el usuario puede copiar o borrar.
