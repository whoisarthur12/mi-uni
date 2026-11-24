# ADR-012 — Diccionario ortográfico: RLA-ES 2.9, es_DO por defecto

- **Estado:** **aceptada** por el dueño (24-nov-2026) en cuanto a licencia, variante y origen. **No se instala hasta el spike S4** (riesgo abierto según ADR-011); S4 mide peso, carga, memoria y sugerencias con `nspell`.
- **Contexto:** el Corrector (Fase 4) necesita un diccionario Hunspell en español. El proyecto es AGPL-3.0.

## Decisión
1. **Diccionario:** RLA-ES (Recursos Lingüísticos Abiertos del Español, Santiago Bosio y otros), el mismo de LibreOffice.
2. **Licencia elegida: GPL-3.0-or-later.** El diccionario se ofrece a elegir entre GPL-3.0+, LGPL-3.0+ y MPL-1.1+; elegimos la GPL. Es compatible con AGPL-3.0: la GPLv3 (§13) y la AGPLv3 (§13) permiten combinarlas. La MPL-1.1 no es compatible con la GPL y no se usa. El diccionario de sinónimos (LGPL-2.1) y las reglas de separación silábica **no se incluyen**.
3. **Variante:** `es_DO` (República Dominicana) **por defecto**. Las demás variantes de RLA-ES son seleccionables en el perfil y se descargan bajo demanda.
4. **Origen:** versión oficial **v2.9** de https://github.com/sbosio/rla-es, fijada por versión y SHA-256. No se usa el paquete npm `dictionary-es-do` 2.0.0, que trae la versión 2.8.
5. **Corrector:** `nspell` 2.1.5 (MIT). Se evalúa en S4.

## Verificación hecha (24-nov-2026)
- El tag `v2.9` (commit `ea82c1214ead57740798acf66a1e18e5ac874c41`, 31-dic-2024) contiene las **fuentes** de `es_DO`: `ortografia/afijos/l10n/es_DO/afijos.txt` y `ortografia/palabras/RAE/l10n/es_DO/*.txt`. No contiene los `.aff` y `.dic` ya generados.
- Los archivos generados están en el **adjunto oficial de la versión**: `https://github.com/sbosio/rla-es/releases/download/v2.9/es_DO.oxt` (1.417.427 B).

| Archivo | Tamaño | SHA-256 |
|---|---|---|
| `es_DO.oxt` | 1.417.427 B | `98836c4a19430d88dcb78ed8d74061e1f19c28e8d9378e357779bb4f0ee44d5e` |
| `es_DO.aff` (dentro del .oxt) | 162.395 B | `dc8213bb8fb08e51dd5869b348d873de23f89e3315656396ca3031fe1d7ffcea` |
| `es_DO.dic` (dentro del .oxt) | 699.654 B (56.581 entradas) | `62577d5185f85b073cef67c81cab9856c88a4af1e11447fa10d5cc5544ab8173` |

- **Cabeceras de licencia, coinciden:**
  - `README.txt` del .oxt: «Para: es_DO · Versión 2.9 … (es_DO[.aff|.dic]) se distribuye bajo un triple esquema de licencias disjuntas: GNU GPL versión 3 o posterior, GNU LGPL versión 3 o posterior, ó MPL versión 1.1 o posterior».
  - `LICENSE.md` dice lo mismo.
  - La cabecera de `afijos.txt` en el tag dice lo mismo («Copyright 2004-2020, Santiago Bosio y otros»).
  - `description.xml`: versión 2.9.
- El .oxt incluye `GPLv3.txt`, que se copiará junto al diccionario.

## Al instalar (spike S4)
- Volver a descargar el .oxt y comprobar el SHA-256 de esta tabla. Si no coincide, parar y avisar al dueño.
- Copiar a `js/vendor/rla-es-2.9/` solo `es_DO.aff`, `es_DO.dic`, `GPLv3.txt` y `README.txt`. Añadir filas en `VERSIONS.md` y `LICENSES.md`, con el tag como fuente exacta.
- Las demás variantes, con la misma verificación, solo cuando se usen.
