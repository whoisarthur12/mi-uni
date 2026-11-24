# ADR-008 — Motor de citas: citeproc-js + estilo APA 7 adaptado al español

- **Estado:** **aceptada** por el dueño (24-nov-2026). citeproc-js 2.4.63 fijado en `js/vendor/citeproc-2.4.63/` (versión en `VERSIONS.md`; licencia AGPL-3.0-or-later, fuente exacta y SHA-256 en `LICENSES.md`). `apa-es.csl` queda **PROVISIONAL** hasta tener el reglamento de la universidad. iPhone pendiente.
- **Contexto:** el gestor de fuentes (CONTEXT §9.6) debe producir bibliografías APA 7 correctas en español, sin red y sin build. Datos en `spikes/s5-citas/README.md`.

## Opciones
| Opción | Peso | Licencia | Notas |
|---|---|---|---|
| **citeproc-js 2.4.63** | 967 KB / **191 KB gzip** | CPAL-1.0 o **AGPL-3.0-or-later** (según su LICENSE; npm declara "AGPL-1.0" por error) | El procesador CSL de referencia (Zotero, Mendeley). Sin `eval`. Un solo archivo CommonJS. |
| citation-js 0.9.0 (core + plugin-csl) | 1,1 MB sin contar dependencias | MIT | Usa citeproc-js por dentro, así que es más pesado; trae `sync-fetch` y lógica de red. Útil más adelante para importar BibTeX/RIS (Fase 3), a evaluar entonces. |

## Decisión
1. **citeproc-js 2.4.63**, vendorizado como ES module con **un solo cambio**: la última línea `module.exports = CSL` pasa a `export default CSL;`. SHA-256 del original: `55abba1a…b9f1`; del parcheado: `ec98e1e6…7674`. Sin build.
2. **Estilos y locales oficiales de CSL**, fijados por commit: estilos `7fa488bd2f765eb161e93c7963838ee2c9c17fe5` (APA 7, IEEE, MLA, Chicago autor-fecha, Harvard Cite Them Right y NLM/Vancouver) y locales `21a175a1d84cc1792dd73f5a627de004fba5b207` (`es-ES`, `es-MX`, `es-CL`, `en-US`). Licencia CC BY-SA 3.0, con atribución en `LICENSES.md`.
3. **APA en español = estilo derivado `apa-es.csl`**, generado de forma reproducible por `tools/make_apa_es.py` (falla si el original cambia). Hace 5 cambios: "y" en lugar de "&"; sin coma antes de "y"; "15 de marzo"; raya en los rangos de páginas; "Recuperado el …, de", y nada si falta la fecha de consulta. Es derivado de CC BY-SA y se publica igual. **PROVISIONAL:** solo aplica la edición en español de APA 7; no incluye reglas de ninguna universidad. Se revisará con el reglamento del dueño cuando lo envíe. **No se inventan reglas de la universidad.**
4. **Locale `es-ES`.** `es-MX` produce "s/f" y "6a ed.", que no son APA. El locale lo fija el estilo, no el país.
5. **El motor corre en un worker** y se crea **una vez por estilo**: tarda 0,7–1,3 s, casi todo construyendo el motor (parsear el XML: 13 ms; pasarlo ya parseado no ayuda). Una vez creado: 100 referencias en 0,1–0,26 s y 50 citas en 13–33 ms. Medido: la página no se bloquea más de 17–26 ms.
6. **Normalización de datos externos:** traducir los tipos de CrossRef a tipos CSL (`journal-article` → `article-journal`, etc.). Sin esto, los artículos salían como capítulos.
7. **Reglas del formulario** (derivadas de APA 7): las páginas web sin fecha exigen la fecha de consulta; los apellidos compuestos se confirman a mano; los títulos de artículos se revisan a tipo oración (CrossRef los trae en mayúsculas de título).
8. **Configurable en el perfil:** APA 7 es el estilo por defecto; el estilo de cita, el tamaño de papel y los márgenes se eligen en el perfil (CONTEXT §9.0.a).

## Consecuencias
- El módulo Fuentes descarga unos 214 KB gzip (citeproc + APA + locales) **bajo demanda**, nunca en el shell.
- Formato HTML con `<i>` para las cursivas: hay que sanitizar antes de insertarlo (ADR-007, punto 7) y, para Word, copiar como HTML enriquecido (Fase 3).
- citeproc-js no se actualiza desde 2023 (2.4.63). Es estable y el formato CSL 1.0.2 no cambia; si hiciera falta, la alternativa es el mismo motor dentro de citation-js.
