# ADR-003 — Tope de memoria del compresor por dispositivo

- **Estado:** **aceptada** por el dueño (24-nov-2026). Modelo medido en escritorio; **se recalibra con el iPhone del dueño** antes de dar el Compresor por terminado (ADR-011).
- **Contexto:** el dueño pidió definir qué hace la app en móvil con PDFs grandes. INSTRUCTIONS §2: no superar ~1/3 de la RAM y avisar antes de que el navegador cierre la pestaña.

## Mediciones (S1, Chromium headless, delta de RSS de todos los procesos del navegador)
| Situación | Pico extra |
|---|---|
| Crear worker + instanciar Ghostscript | ~70 MB (3 repeticiones: 69–71) |
| Un trabajo con entrada de 6 / 28 / 80 MB (worker ya iniciado) | +40–48 / +83–86 / +192–194 MB |
| **Tres trabajos de 80 MB en el mismo worker** | **+395 MB** (la memoria WASM crece y no se devuelve) |
| Después de `worker.terminate()` | vuelve por debajo de la base |
| Trocear 80 MB en 4 partes con pdf-lib (Node) | pico ≈ igual a una pasada completa de Ghostscript (200 vs 204 MB RSS) |
| `-sPageList` (3 de 11 páginas) sobre 80 MB (Node) | −10 % (184 vs 204 MB): la entrada entera sigue en MEMFS |
| Pasar el `File` al worker y ceder el búfer a MEMFS (`canOwn`) | sin diferencia medible frente a transferir el `ArrayBuffer` |

La cifra de S1 (+350–480 MB) era **acumulada**: init + varias corridas en el mismo worker. Corregida aquí.

**Modelo:** `pico ≈ 1,5 × (70 + 40 + 1,9 × entrada_MB)`. El 1,5 es un margen de seguridad para lo no medido (Safari iOS, gama baja).

## Opciones evaluadas
1. **Solo aviso.** No evita cierres de la pestaña.
2. **Límite fijo de tamaño.** Simple, pero injusto con equipos potentes e inseguro en los de gama baja.
3. **Procesar por partes para ahorrar memoria.** **Descartado como medida de memoria:** el build no tiene `WORKERFS`, así que Ghostscript siempre copia la entrada completa a MEMFS, y trocear con pdf-lib cuesta lo mismo que una pasada. "Dividir en partes" se mantiene, pero solo como paso de la escalera de **tamaño** (CONTEXT §9.1).
4. **Clasificación por dispositivo + worker nuevo por pasada + aprendizaje de cierres.** ← elegida

## Decisión
- **Un worker nuevo por cada `callMain`** (incluida cada iteración de la búsqueda binaria), terminado al acabar. Cuesta ~110–250 ms de reinicio por iteración, despreciable frente a pasadas de varios segundos; evita la acumulación (+395 MB).
- RAM del dispositivo: `navigator.deviceMemory` (solo Chromium). Si no existe (Safari, Firefox): se asumen **3 GB en móvil y 4 GB en escritorio**. Presupuesto = 1/3 de la RAM.
- `memory-policy.js` (lógica pura con pruebas) clasifica la entrada:
  - **ok:** pico estimado ≤ 50 % del presupuesto → se procesa sin aviso.
  - **warn:** ≤ 100 % del presupuesto → aviso no bloqueante: «Archivo grande para este dispositivo: cierra otras apps; si la pestaña se cierra, tus datos no se pierden». Botón «Continuar».
  - **block:** por encima del presupuesto, o **> 500 MB** en cualquier equipo → no se procesa. Mensaje con alternativas: usarlo en un computador, o reducirlo antes (p. ej., quitar páginas con la Caja PDF). Con **confirmación explícita** se puede «Intentar de todos modos» (el original no se toca).
- **Aprendizaje de cierres:** antes de cada trabajo pesado se guarda en `sessionStorage` una bandera `{tamaño}`. Si al recargar sigue ahí, la pestaña murió: se registra en Diagnóstico local y se guarda `learnedFailMB` en `localStorage`; a partir de entonces el límite de ese dispositivo es el 80 % de ese tamaño.

Límites resultantes (con el modelo actual):

| RAM | Sin aviso hasta | Con aviso hasta | Bloqueado desde |
|---|---|---|---|
| 1 GB | ~1 MB | 61 MB | 61 MB |
| 2 GB | 61 MB | 181 MB | 181 MB |
| Desconocida, móvil (Safari iOS) → 3 GB | 121 MB | 301 MB | 301 MB |
| 4 GB | 181 MB | 421 MB | 421 MB |
| 8 GB (escritorio) | 421 MB | 500 MB | 500 MB |

## Consecuencias y límites residuales
- `deviceMemory` está cuantizado y topado en 8 GB, y Safari no lo expone: en iPhone se decide por la suposición de 3 GB y por el aprendizaje de cierres.
- El modelo viene de PDFs sintéticos en escritorio. **Recalibrar `MODEL` y `safety`** con el celular del dueño y con PDFs reales (página `spikes/s1-ghostscript/`).
- Reducir el pico de verdad requeriría un build propio con `WORKERFS` o lectura por trozos. Se reconsidera solo si los PDFs reales del dueño caen en «block».
