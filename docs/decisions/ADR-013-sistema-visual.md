# ADR-013 — Sistema visual: dirección B con la paleta cálida de ESTILO.md

- **Estado:** **aceptada** por el dueño (24-nov-2026): maqueta «B (Panel) con el sistema visual de `docs/ESTILO.md`» y este ADR aprobados. Maqueta: `diseno/` (`/mi-uni/diseno/` en Pages). Sus tokens son el ui-kit de la app (`css/ui.css`).
- **Contexto:** la referencia [`docs/ESTILO.md`](../ESTILO.md) describe una web de marketing de terceros. Mi Uni es una app: se toma el sistema (color, forma, ritmo, tipografía) y se descarta lo propio de una web de ventas.

## Se usa
- **Paleta cálida:** lienzo `#f7f7f4`, tarjeta `#f2f1ed`, inset `#ebeae5`, control `#e6e5e0`, tinta `#26251e`.
- **Forma:**
  - tarjetas con radio de 4 px, 10 px de separación y 17,5 px de relleno;
  - acciones en píldora (9999 px).
- **Tipografía:** peso 400 en todo. Recetas: título 26/1,25 con −0,0125 em, sección 20/1,3 y texto 16/1,5 con +0,005 em. La jerarquía va por color, no por negrita, y los títulos van en «par»: misma talla, la continuación en tono secundario.
- **Ritmo:** vertical de 22,4 px (y sus múltiplos 44,8 y 67,2) y paso horizontal de 10 px.
- **Sombra solo en ventanas flotantes:** el panel «Resultado» del Compresor, con radio de 10 px.
- **Naranja solo en enlaces pequeños, foco y marcadores:** la pestaña activa lleva un punto naranja.

## No se usa
Lo propio de una web de ventas:
- el escenario de 1300×720, los cierres de 72 px y el paisaje pintado de la portada;
- logos, citas de clientes, planes y precios, y fotografía de personas;
- nombres, marcas y textos de la fuente.

Todo el texto es propio, en español y en frase corta.

## Adaptaciones obligatorias (decisión del dueño)
1. **AA en claro y oscuro, calculado.** El gris secundario del documento (`#7a7974`) daba 3,46–4,06:1 y el naranja (`#f54e00`) 2,79–3,28:1: no pasan. Se oscurecieron sobre la misma tonalidad hasta pasar en las 4 superficies:

   | Par | Mínimo | Claro | Oscuro |
   |---|---|---|---|
   | Tinta sobre lienzo/tarjeta/inset/control | 4,5:1 | `#26251e` → 12,19:1 | `#f1eee6` → 11,34:1 |
   | Secundario sobre las 4 superficies | 4,5:1 | `#66655f` → 4,64:1 | `#9c9992` → 4,62:1 |
   | Naranja (enlaces, foco) sobre las 4 superficies | 4,5:1 | `#b1400a` → 4,62:1 | `#f77133` → 4,61:1 |
   | Texto del botón principal (normal y hover) | 4,5:1 | `#f7f7f4` → 9,69:1 | `#1b1915` → 10,72:1 |
   | Aviso de respaldo | 4,5:1 | `#6b3300`/`#f6e3c8` → 7,98:1 | `#f5c99a`/`#3a2a17` → 9,00:1 |
   | Estado «al día» | 4,5:1 | `#2d5016`/`#e3ead6` → 7,49:1 | `#bfd6a3`/`#25301b` → 8,81:1 |
   | Borde de campo (componente, no texto) | 3:1 | `#8c8b86` → 3,02:1 | `#6e6b64` → 3,03:1 |

   La descripción de las tarjetas va en el secundario AA, no en el 60 % de tinta del documento: el 60 % daba menos de 4,5:1.
2. **Táctil:** todo lo que se toca mide al menos 44 px. El botón principal mide 48 px, las opciones del Compresor 64 px y las pestañas 60 px. Es móvil primero; en escritorio, columna central de 40 rem y rejilla de 3 columnas desde 640 px.
3. **Iconos:** monocromos de 16–24 px, trazo de 1,6 px en color tinta. Cada tarjeta de la rejilla lleva icono, título y descripción corta.
4. **Tema oscuro cálido** (no lo define el documento): lienzo `#1b1915`, tarjeta `#23211c`, inset `#2b2923`, control `#33302a` y tinta `#f1eee6`. Son marrones oscuros, no negro puro ni gris azulado. Opciones Sistema / Claro / Oscuro, en la cabecera y en Ajustes.
5. **Tipografía Inter local.**
   - Inter 4.001, solo el subconjunto latino: 48 KB, cubre á é í ó ú ñ ü ¿ ¡ « ».
   - Está en `js/vendor/inter-4.001/`, con licencia OFL-1.1 (`VERSIONS.md` y `LICENSES.md`). Sin CDN.
   - **Tamaño de texto del sistema:** `font: -apple-system-body` en la raíz hace que Safari iOS siga el ajuste de Texto grande, con 17 px por defecto. Los demás navegadores usan 16 px y todo va en rem.
   - El título de pantalla mide 1,53 rem: 26 px en iPhone con el tamaño por defecto y 24,5 px en escritorio.
   - El carácter «→» no está en el subconjunto, así que las flechas son SVG.
6. **Peso offline:** ninguna imagen. El único paisaje es un SVG en línea de 3 trazos en el **estado vacío** de Proyectos.

## Medido (24-nov-2026, 390×844, claro y oscuro, 5 pantallas: inicio, compresor con resultado, proyectos, proyectos vacío y ajustes)
| | Chromium 158 | Firefox 155 | WebKit 26.6 |
|---|---|---|---|
| Textos visibles comprobados (color calculado contra su fondo real) | 246 | 246 | 246 |
| Textos por debajo de 4,5:1 | **0** | **0** | **0** |
| Peor par | 4,62:1 (texto de ejemplo del buscador, oscuro) | 4,62:1 | 4,62:1 |
| Áreas táctiles de menos de 44 px | **0** | **0** | **0** |
| Errores o avisos en consola | **0** | **0** | **0** |
| Inter cargada desde el repo | sí | sí | sí |

El hover del botón principal se midió leyendo el píxel en pantalla: 9,7:1 en claro y 10,7:1 en oscuro.

## Pendiente de dispositivo
- Legibilidad al sol.
- Texto grande del sistema (Dynamic Type) a tamaños máximos.
- VoiceOver: orden de lectura, nombres de los controles y anuncio del progreso.
- Cómo se ve Inter frente a la letra del sistema en el iPhone.

## Consecuencias
- Estos tokens pasan a ser el `ui-kit` de la Fase 1 (INSTRUCTIONS, tarea 10).
- Toda pantalla nueva debe pasar la misma auditoría: 0 textos por debajo de 4,5:1, 0 áreas táctiles de menos de 44 px y 0 errores, en los 3 motores.
