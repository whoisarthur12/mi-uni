# ADR-011 — Cierre parcial de la Fase 0 y Fase 1 mínima

- **Estado:** **aceptada** por el dueño (24-nov-2026, «opción B, con condiciones»).
- **Contexto:** los spikes que condicionan el hito MVP ya están hechos: S1, S5, S10, S11 y S12. El dueño probó la app de S10 en su iPhone; carga y funciona sin conexión, pero no permite probar ninguna herramienta real. INSTRUCTIONS (Fase 0, «Prioridad») ya permitía hacer los demás spikes «justo antes de la fase que los necesita, pero antes de construir ese módulo». Resumen de la Fase 0: [`docs/fase0-resumen.md`](../fase0-resumen.md).

## Decisión
1. **Cambio de orden.** S4, S9, S7, S8, S6, S2 y S3 pasan a **riesgo abierto: se miden antes de su fase**. **Ninguna fase empieza sin sus spikes hechos.**

   | Spike | Fase que lo necesita | Bloquea |
   |---|---|---|
   | S4 Ortografía | 4 (Corrector) | Corrector |
   | S2 Escáner | 4 (Escáner) | Escáner |
   | S9 Gráficos · S7 Diagramas · S8 Ecuaciones · S6 Presentaciones | 6 (Visuales) | cada módulo visual |
   | S3 Office→PDF | 7 | Office→PDF |

   La Fase 3 (Contador, Portadas, Fuentes) no depende de ninguno de ellos: usa S5, ya hecho.
2. **Fase 1 mínima** (sustituye el alcance de la Fase 1 de INSTRUCTIONS como primer bloque):
   - **Shell y navegación:** router por hash, registro de módulos con `import()` dinámico, inicio, ajustes, service worker y CSP de S10 (ADR-004, ADR-005).
   - **Perfil** (módulo 0): perfil y cursos; estilo de cita, papel y márgenes (CONTEXT §9.0.a).
   - **Almacenamiento de S11 desde el inicio** (ADR-006):
     - trozos de 8 MB con **verificación después de escribir**;
     - importación trozo por trozo con marca `importando`;
     - exportar e importar a **ZIP**;
     - **aviso de respaldo** (fecha del último respaldo; aviso con ≥ 7 días de cambios sin exportar).
   - **Primer módulo utilizable: el Compresor de PDF** (Fase 2.2 adelantada) dentro del shell, con Ghostscript (ADR-002), el tope de memoria (ADR-003) y su guarda.
   - Quedan para **después del Compresor y antes del hito MVP** (Fase 3): el buscador, la pantalla de diagnóstico, el catálogo completo de eventos y el resto de la Fase 1 de INSTRUCTIONS. Se mantienen como requisitos; solo cambia el orden.
3. **Interfaz: primero direcciones de diseño.** Antes de construir la interfaz se publican **2 o 3 direcciones** como páginas abribles en GitHub Pages (`/mi-uni/diseno/`):
   - móvil primero, en español;
   - tema claro y oscuro;
   - accesibles (WCAG 2.2 AA), con áreas táctiles de al menos 44×44 px.
   El dueño elige una y solo entonces se implementa. **El trabajo se detiene al publicar las direcciones.**
4. Un PR por bloque, ramas `claude/*`, sin tocar `tests/real/`.

## Pendientes de dispositivo (anotados, no bloquean el diseño)
- **S11:** prueba de 8 días en el iPhone hasta el **2-dic-2026** (borrado tras días sin uso; cuota; exención de la app instalada).
- **Límites de memoria en el iPhone:** recalibrar ADR-003 (compresor) y el factor 8× de ADR-010 (Caja PDF). El dueño pasará el **modelo del iPhone** y **PDFs reales**.
- El resto, en la tabla de `docs/fase0-resumen.md`.

## Consecuencias
- Se llega antes a algo usable (Compresor) y con diseño elegido por el dueño.
- Los riesgos de S2, S3, S4 y S6–S9 siguen abiertos. Un resultado ❌ en cualquiera de ellos cambia o elimina su módulo, pero no afecta a la Fase 1 ni al Compresor.
