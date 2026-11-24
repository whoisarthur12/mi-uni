# Contrastes medidos (WCAG 2.2 AA)

Medidos el 24-nov-2026 con `node tools/auditar.cjs tests/ui/app.auditoria.cjs` (con `FX_S12` para las pantallas del Compresor).
- **Alcance:** 18 pantallas, cada una en claro y oscuro, a 390×844, en Chromium 158, Firefox 155 y WebKit 26.6. Son 698 textos visibles por motor.
- **Método:** cada texto se compara contra su fondo real, mezclando las transparencias.
- **Mínimo exigido:** 4,5:1 para todo el texto. Ningún par queda por debajo.

Los bordes de los campos (3,02:1 en claro y 3,03:1 en oscuro, mínimo 3:1) y los tokens están en [ADR-013](decisions/ADR-013-sistema-visual.md). El texto de ejemplo del campo en claro va sobre `#e6e5e0`; en oscuro, sobre `#33302a`.

| Tema | Texto | Fondo | Mínimo (Chromium / Firefox / WebKit) | Ejemplo (pantalla) |
|---|---|---|---|---|
| oscuro | `#9c9992` | campo `#33302a` (texto de ejemplo) | 4,62 / 4,62 / 4,62 | «placeholder Buscar» (inicio) |
| oscuro | `#f77133` | `#23211c` | 5,64 / 5,64 / 5,64 | «Abrir» (inicio) |
| oscuro | `#9c9992` | `#23211c` | 5,66 / 5,66 / 5,66 | «Para que quepa en el correo » (inicio) |
| oscuro | `#f77133` | `#1b1915` | 6,16 / 6,16 / 6,16 | «Todos los proyectos» (proyecto-con-archivo) |
| oscuro | `#9c9992` | `#1b1915` | 6,17 / 6,17 / 6,17 | «Tus herramientas de la unive» (inicio) |
| oscuro | `#bfd6a3` | `#25301b` | 8,81 / 8,81 / 8,81 | «Proyecto nuevo» (proyecto-con-archivo) |
| oscuro | `#f5c99a` | `#3a2a17` | 9,00 / 9,00 / 9,00 | «Este archivo está dañado o n» (compresor-danado) |
| oscuro | `#f1eee6` | `#33302a` | 11,34 / 11,34 / 11,34 | «Usar un PDF de un proyecto» (compresor) |
| oscuro | `#f1eee6` | `#2b2923` | 12,54 / 12,54 / 12,54 | «Todavía sin copia» (proyecto-con-archivo) |
| oscuro | `#f1eee6` | `#23211c` | 13,87 / 13,87 / 13,87 | «Comprimir PDF» (inicio) |
| oscuro | `#f1eee6` | `#1b1915` | 15,14 / 15,14 / 15,14 | «Mi Uni» (inicio) |
| oscuro | `#1b1915` | `#f1eee6` | 15,14 / 15,14 / 15,14 | «Elegir un PDF» (compresor) |
| claro | `#66655f` | campo `#e6e5e0` (texto de ejemplo) | 4,64 / 4,64 / 4,64 | «placeholder Buscar» (inicio) |
| claro | `#b1400a` | `#f2f1ed` | 5,15 / 5,15 / 5,15 | «Abrir» (inicio) |
| claro | `#66655f` | `#f2f1ed` | 5,17 / 5,17 / 5,17 | «Para que quepa en el correo » (inicio) |
| claro | `#b1400a` | `#f7f7f4` | 5,42 / 5,42 / 5,42 | «Todos los proyectos» (proyecto-con-archivo) |
| claro | `#66655f` | `#f7f7f4` | 5,45 / 5,45 / 5,45 | «Tus herramientas de la unive» (inicio) |
| claro | `#2d5016` | `#e3ead6` | 7,49 / 7,49 / 7,49 | «Proyecto nuevo» (proyecto-con-archivo) |
| claro | `#6b3300` | `#f6e3c8` | 7,98 / 7,98 / 7,98 | «Este archivo está dañado o n» (compresor-danado) |
| claro | `#26251e` | `#e6e5e0` | 12,19 / 12,19 / 12,19 | «Usar un PDF de un proyecto» (compresor) |
| claro | `#26251e` | `#ebeae5` | 12,76 / 12,76 / 12,76 | «Todavía sin copia» (proyecto-con-archivo) |
| claro | `#26251e` | `#f2f1ed` | 13,60 / 13,60 / 13,60 | «Comprimir PDF» (inicio) |
| claro | `#f7f7f4` | `#27261f` | 0,00 / 14,14 / 0,00 | «Descargar» (compresor-escalera) |
| claro | `#26251e` | `#f7f7f4` | 14,33 / 14,33 / 14,33 | «Mi Uni» (inicio) |
| claro | `#f7f7f4` | `#26251e` | 14,33 / 14,33 / 14,33 | «Elegir un PDF» (compresor) |
