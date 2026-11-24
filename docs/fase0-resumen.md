# Fase 0 — Resumen de veredictos (24-nov-2026)

Mediciones en Chromium 158, Firefox 155 y WebKit 26.6 (Linux, contenedor de 4 vCPU), con fixtures **sintéticos**. Nada de lo que no esté marcado como «iPhone ✅» se ha probado en un teléfono. Orden y alcance tras la decisión del dueño: [ADR-011](decisions/ADR-011-orden-fase0-y-fase1-minima.md).

## Spikes hechos
| Spike | Veredicto | Medidas clave | Decisión | Riesgos abiertos | Pendiente de dispositivo |
|---|---|---|---|---|---|
| **S1 Ghostscript WASM** | ⚠️ viable con condiciones | 11,08 MB gzip; carga 108–249 ms; 80 MB → 2,19 MB en 3,9 s (150 DPI/q60); +192 MB por trabajo de 80 MB; estimación por muestra con 0,2–0,6 % de error en el 29 % del tiempo; sin `SharedArrayBuffer` | ADR-002 ✅ (`@okathira/ghostpdl-wasm` 1.1.0); ADR-003 (tope de memoria) | CPU del móvil 3–6× más lenta (estimado, no medido); escala de agresividad sin calibrar con PDFs reales; Pages sirviendo `.wasm` comprimido sin comprobar | Tiempo y RAM al comprimir 5/30/80 MB; recalibrar ADR-003 |
| **S10 Plataforma** | ⚠️ viable con condiciones | Worker `blob:` + `lockdown` → 0 fugas de red en los 3 (worker por URL: 6); SW 11/11 pasos × 3; Safari iOS mínimo 16.4 | ADR-004 ✅ (CSP en workers); ADR-005 ✅ (SW y cachés) | `<meta>` sin `frame-ancestors`; tope de canvas de iOS sin medir (se reduce a ≤ 16,7 MP) | **iPhone ✅: Pages carga, descarga del módulo pesado verificada (14,9 MB) y funciona sin conexión (24-nov)**. Falta: canvas, instalación PWA en Android |
| **S11 Almacenamiento** | ⚠️ viable con condiciones | Proyecto de 200 MB: exportar ZIP 0,5–1 s (+0–10 MB); importar con trozos de 8 MB +133 a +173 MB, 3–9,6 s; ZIP dañado rechazado; importación cortada limpiada | ADR-006 ✅ provisional (verificar al escribir, trozos de 8 MB, respaldo obligatorio) | Bug de WebKit con `File.slice()` (corregido copiando); `storage.estimate()` inútil en WebKit; `persist()` no fiable; navegación privada de Safari no guarda blobs | **Prueba de 8 días hasta el 2-dic-2026**: borrado por inactividad, cuota y exención de la app instalada; memoria al importar 200 MB |
| **S5 Citas (CSL)** | ⚠️ viable con condiciones | Módulo ≈ 214 KB gzip; crear motor 0,7–1,2 s (en worker, bloqueo ≤ 26 ms); bibliografía de 100 refs 119–199 ms; APA 7 en español correcta en 10 tipos; CrossRef y Open Library por CORS | ADR-007 ✅ (única excepción de red); ADR-008 ✅ (citeproc-js 2.4.63) | `apa-es.csl` **PROVISIONAL** hasta tener el reglamento de la universidad; Google Books sin clave da 429; Open Library separa mal los apellidos compuestos (formulario editable) | Medir 100 referencias y buscar DOI/ISBN en el iPhone |
| **S12 PDF (pdf-lib / pdf.js)** | ⚠️ viable con condiciones | ≈ 913 KB gzip; unir 3×28 MB en 0,6–1,4 s con pico de 3–8× la entrada; miniaturas perezosas: primera pantalla en 1,3–2,0 s; WebKit bloquea 400–700 ms por página con fotos | ADR-010 ✅ (@cantoo/pdf-lib 2.11.1 + pdf.js 6.5.438; permiso; guardas; tope 8×) | Commit fuente de @cantoo no publicado (plan de reemplazo); @cantoo abre truncados sin error (guarda de entrada); guarda estructural, no visual | Memoria al unir y renderizar (recalibrar 8×); escaneos JBIG2/JPX reales |

## Spikes pendientes (riesgo abierto: se miden antes de su fase, ADR-011)
| Spike | Para | Riesgo principal | Estado |
|---|---|---|---|
| S4 Ortografía | Fase 4, Corrector | Peso y rendimiento de `nspell` con un diccionario grande (56.581 entradas en es_DO) | Licencia y origen aprobados (ADR-012: RLA-ES v2.9, GPL-3.0+, es_DO por defecto, SHA-256 verificado). Sin medir |
| S2 Escáner | Fase 4, Escáner | Peso de OpenCV.js y memoria en iPhone | Sin empezar |
| S9 Gráficos | Fase 6 | Exportación PNG/SVG y peso (Chart.js frente a ECharts) | Sin empezar |
| S7 Diagramas | Fase 6 | `foreignObject` al exportar Mermaid | Sin empezar |
| S8 Ecuaciones | Fase 6 | Pegado de MathML en Word | Sin empezar |
| S6 Presentaciones | Fase 6 | PDF por impresión en Safari iOS | Sin empezar |
| S3 Office→PDF | Fase 7 | Fidelidad y tamaño de LibreOffice WASM (>100 MB en Pages) | Sin empezar |

## Pendientes de dispositivo y del dueño
1. **Modelo del iPhone** (y navegador): fija los presupuestos de memoria (ADR-003 y ADR-010) en lugar de los 3 GB supuestos.
2. **PDFs reales** (en `tests/real/`, solo los toca el dueño): calibrar el compresor; escaneos JBIG2/JPX para pdf.js.
3. **S11, prueba de 8 días hasta el 2-dic-2026.**
4. Mediciones en el iPhone con «Copiar resultados»: S1, S5, S11 y S12 (pasos en `spikes/s10-plataforma/README.md`).
5. **Reglamento de formato de la universidad:** `apa-es` y las portadas siguen provisionales.
6. Merge de los PR #5 y #6. Hasta entonces, la portada `/mi-uni/` da 404 en Pages (las páginas de los spikes sí abren).

## Decisiones vigentes
| ADR | Tema | Estado |
|---|---|---|
| 001 | Alcance y arquitectura | aceptada |
| 002 | Ghostscript WASM | aceptada |
| 003 | Tope de memoria del compresor | aceptada (se recalibra en el iPhone) |
| 004 | CSP en workers | aceptada |
| 005 | Service worker y cachés | aceptada |
| 006 | Almacenamiento y respaldo | aceptada como provisional |
| 007 | Excepción de red DOI/ISBN | aceptada |
| 008 | Motor de citas CSL | aceptada |
| 009 | Red del entorno de desarrollo | aceptada |
| 010 | Motores PDF | aceptada |
| 011 | Orden de la Fase 0 y Fase 1 mínima | aceptada |
| 012 | Diccionario ortográfico | aceptada (se instala en S4) |
