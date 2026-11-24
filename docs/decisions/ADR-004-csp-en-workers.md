# ADR-004 — Aislar de la red a los Web Workers (CSP en GitHub Pages)

- **Estado:** propuesta (medida en Chromium 158, Firefox 155 y WebKit 26.6 sobre Linux; **iOS Safari real pendiente**)
- **Contexto:** S1 descubrió que la CSP `<meta>` del documento **no se aplica a un worker cargado por URL**, y GitHub Pages no permite cabeceras. Los workers procesan los archivos del usuario: si una librería vendorizada fuera vulnerable o maliciosa, podría exfiltrarlos. El dueño pidió evaluar (a) worker `blob:`, (b) CSP por cabecera desde el service worker y (c) bloqueo de APIs de red dentro del worker, en 3 navegadores y con medición real.

## Método
- **Servidor testigo** en otro origen (`127.0.0.1:8766`). Registra cada petición recibida con un token único `navegador-escenario-vía`. **Una fuga cuenta solo si el testigo la recibe**, no por lo que diga el navegador.
- Vías probadas desde el worker: `fetch`, `XMLHttpRequest`, `WebSocket` (se registra el *upgrade*), `EventSource`, `import()` dinámico, `importScripts`, worker anidado. Más la compilación de WASM.
- Se verificó en cada caso que el worker **sí se ejecutó** (errores locales por vía), para no confundir "bloqueado" con "no arrancó".
- Código: `spikes/s10-plataforma/csp/` (runners en `runner/`).

## Resultados (idénticos en Chromium, Firefox y WebKit salvo donde se indica)

CSP del documento: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; …`

| Escenario | fetch | XHR | WebSocket | EventSource | import() | worker anidado | Peticiones al testigo |
|---|---|---|---|---|---|---|---|
| Página (control de la `<meta>`) | bloq | — | — | — | — | — | 0 |
| Worker por URL (control) | **SALE** | **SALE** | **SALE** | **SALE** | **SALE** | **SALE** | 6 por navegador |
| (a) Worker `blob:` | bloq | bloq | bloq | bloq | bloq | bloq | 0 |
| (b) Worker con CSP inyectada por el SW (página controlada) | bloq | bloq | bloq | bloq | bloq | bloq | 0 |
| (b) Página con CSP solo del SW → worker por URL | **SALE** | **SALE** | **SALE** | **SALE** | **SALE** | **SALE** | 6 |
| (c) Bloqueo de APIs (`lockdown.js`) en worker por URL | bloq | bloq | bloq | bloq | **SALE** | bloq | 1 (`import()`) |
| (a)+(c) | bloq | bloq | bloq | bloq | bloq | bloq | 0 |

`importScripts` no existe en workers de tipo módulo (los tres navegadores lanzan error), así que no es una vía.

**Pruebas complementarias:**
- **Worker `blob:` que crea un worker por URL**, con `worker-src 'self' blob:`: se crea y **sale** (6 peticiones). Con `worker-src blob: <URL exacta de sw.js>`: se bloquea (0) y el SW se sigue registrando.
- **WASM en worker `blob:`**: hereda la CSP. Sin `'wasm-unsafe-eval'` la compilación se bloquea en los tres → **`'wasm-unsafe-eval'` es obligatorio**.
- **Ghostscript de punta a punta** en worker `blob:` + `lockdown.js`, con el `WebAssembly.Module` compilado en la página y enviado por `postMessage`: funciona en los tres (código 0, salida de 401.485 B igual a S1). El `fetch` posterior queda bloqueado. Compilar en la página tarda 81–379 ms; **instanciar en cada worker nuevo, 9–15 ms** (antes 110–250 ms). Esto abarata el "un worker por pasada" de ADR-003.
- **Importaciones estáticas con `worker-src` sin `'self'`**: en un worker módulo, las importaciones estáticas usan el destino *worker* y fallan en los tres. Con `import()` dinámico funcionan en Chromium y WebKit; **Firefox además exige que los módulos importados dinámicamente no tengan importaciones estáticas** (confirmado con `gs-worker-dyn.js`).

## Decisión
**Capas (a) + (c), con `worker-src 'self' blob:`. No depender de (b).**
1. **Todo worker que toque datos del usuario se crea desde `blob:`** con un arranque mínimo que importa el módulo real por URL absoluta. Así hereda la CSP `<meta>`. Lo encapsula `core/workers.js` (los módulos nunca hacen `new Worker(url)`).
2. **El primer import de cada worker es `lockdown.js`**: congela `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker`, `SharedWorker`, `WebTransport` y `sendBeacon`. Es defensa en profundidad: además cierra el hueco del worker anidado por URL que deja `worker-src 'self'`.
3. **Los WASM se compilan una vez en la página** (`WebAssembly.compileStreaming`, sujeto a `connect-src 'self'`) y se pasan como `WebAssembly.Module`. Los workers no necesitan red en absoluto.
4. CSP base: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'`. La lista blanca de DOI/ISBN se añade a `connect-src` cuando se apruebe (S5); afecta igual a página y workers `blob:`.
5. **(b) se descarta como control principal**: no protege la primera visita, una recarga forzada que salta el SW, ni un SW que falla o se desregistra. En todos esos casos se aplica la fila "worker por URL" (fuga total). Además añadiría lógica crítica de seguridad al SW.

**Endurecimiento opcional (posterior):** `worker-src blob: https://<usuario>.github.io/<repo>/sw.js` cierra en la CSP el worker anidado por URL, sin depender de `lockdown.js`. Coste: atar la CSP a la URL final (aún sin decidir) y escribir el código de workers **sin importaciones estáticas** (por Firefox). Se reevalúa al fijar el nombre del repo.

## Límites residuales (lo que esto NO garantiza)
- **La CSP `<meta>` en sí:** no admite `frame-ancestors` ni `report-uri`, y solo rige desde que se parsea. Debe ir primera en `<head>`, antes de cualquier script.
- **`lockdown.js` actúa solo en su reino:** código que se ejecute antes de él, o un worker anidado (reino nuevo), no queda parcheado. En (a)+(c) los anidados heredan la CSP si son `blob:`, y `Worker` está congelado.
- **Navegadores no probados:** Safari iOS real, Chrome Android y Samsung Internet. WebKit 26.6 en Linux usa el mismo motor que Safari, pero no es iOS. **Verificar en el celular del dueño** con la página del spike.
- **La página principal no lleva lockdown:** la protege la CSP `<meta>` (medido: bloquea `fetch` a otro origen). `net-guard.js` sigue siendo la única vía autorizada para peticiones explícitas.
- **No protege contra extensiones del navegador** ni contra un SW comprometido del propio origen.
