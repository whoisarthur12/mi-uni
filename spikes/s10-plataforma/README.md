# S10 — Plataforma

Estado: **CSP y workers: ✅ viable** con (a)+(c) ([ADR-004](../../docs/decisions/ADR-004-csp-en-workers.md)). Pendiente: router por hash, service worker con caché versionado, tope de canvas e instalación PWA.

## CSP y workers (`csp/`)
- **Pregunta:** ¿cómo impedir que un worker con datos del usuario se conecte a otro origen si GitHub Pages no permite cabeceras CSP?
- **Método:** servidor testigo en otro origen (`csp/runner/witness.cjs`) que registra cada petición con un token. 7 vías de red × 5 escenarios × 3 motores (Chromium 158, Firefox 155, WebKit 26.6). Runners: `runner/s10run.cjs` (escenarios), `runner/s10var.cjs` (variantes de CSP + Ghostscript de punta a punta), `runner/s10dyn.cjs` (Firefox e importaciones dinámicas).
- **Resultado:** worker por URL → 6 fugas por navegador. Worker `blob:` → 0. Bloqueo de APIs solo → 1 fuga (`import()`). `blob:` + bloqueo → 0. CSP desde el SW → 0 solo con la página controlada. Ghostscript funciona en `blob:` + bloqueo en los tres, con 9–15 ms de inicio por worker (WASM precompilado en la página).
- **Veredicto:** ✅ viable con límites (ver ADR-004: `<meta>` sin `frame-ancestors`, iOS real sin probar).
- **Decisión:** workers siempre desde `blob:` vía `core/workers.js`; `lockdown.js` como primer import; WASM compilado en la página y enviado como `WebAssembly.Module`; `'wasm-unsafe-eval'` obligatorio.

### Reproducir
```bash
python3 -m http.server 8765                                    # raíz del repo
node spikes/s10-plataforma/csp/runner/witness.cjs /tmp/witness.log  # testigo en 127.0.0.1:8766
WITNESS_LOG=/tmp/witness.log node spikes/s10-plataforma/csp/runner/s10run.cjs               # requiere Playwright con chromium/firefox/webkit
```
Para `s10var.cjs` hay que enlazar `csp/fixtures-gen` a los fixtures de S1.
