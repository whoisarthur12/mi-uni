# Resultados del banco de pruebas

Fixtures marcados `[SINT]` son sintéticos (generados), no reales. Dispositivo `CI-headless` = Chromium headless en contenedor Linux x86_64, 4 vCPU, 16 GB RAM (no representa un celular).

| Módulo/Spike | Archivo | Parámetros | Resultado | Tiempo | Memoria aprox. | Dispositivo | Observación |
|---|---|---|---|---|---|---|---|
| S1 compresor | sint-texto-30p.pdf [SINT] 0,02 MB | 150 DPI / q60 | 0,021 MB (0,87) ✅ abre, 30 p | 0,38 s | pico RSS Chromium 477 MB | CI-headless | Solo texto: casi no comprime (esperado) |
| S1 compresor | sint-foto-5mb.pdf [SINT] 6,00 MB | 150 / 60 | 0,40 MB (0,067) | 0,74 s | 507 MB | CI-headless | |
| S1 compresor | sint-mixto-10p.pdf [SINT] 24,87 MB | 150 / 60 | 1,02 MB (0,041) | 1,43 s | 557 MB | CI-headless | |
| S1 compresor | sint-foto-30mb.pdf [SINT] 27,89 MB | 150 / 60 | 1,20 MB (0,043) | 1,79 s | 566 MB | CI-headless | |
| S1 compresor | sint-foto-30mb.pdf [SINT] | 600 / 30, PassThroughJPEG=true | 22,31 MB (0,80) | 1,48 s (Node) | — | Node 22 | JPEG copiado sin recomprimir |
| S1 compresor | sint-foto-30mb.pdf [SINT] | 600 / 30, PassThroughJPEG=false | 2,89 MB (0,103) | 2,35 s | 589 MB | CI-headless | Confirma que el flag es imprescindible |
| S1 compresor | sint-foto-80mb.pdf [SINT] 79,62 MB | 150 / 60 | 2,19 MB (0,028) ✅ abre, 11 p | 3,85 s | 700 MB | CI-headless | |
| S1 compresor | sint-foto-80mb.pdf [SINT] | 300 / 85 | 12,60 MB (0,158) | 6,16 s | 705 MB | CI-headless | |
| S1 compresor | sint-foto-80mb.pdf [SINT] | 72 / 40 | 0,74 MB (0,009) | 3,38 s | 829 MB | CI-headless | |
| S1 estimación | sint-foto-80mb.pdf [SINT] | -sPageList=1,6,11 | error 0,2–0,6 % | ~29 % del tiempo completo | — | Node 22 | Fixture homogéneo: error real será mayor |
| S1 memoria | sint-foto-80mb.pdf [SINT] | worker iniciado, 1 trabajo | +192–194 MB pico | 4,4 s | init aparte +70 MB | CI-headless | Delta por trabajo (ADR-003) |
| S1 memoria | sint-foto-80mb.pdf [SINT] ×3 | mismo worker | +395 MB pico | — | — | CI-headless | Acumula: un worker por pasada |
| S1 memoria | sint-foto-30mb.pdf / 5mb [SINT] | 1 trabajo | +83–86 / +40–48 MB | 2,0 / 0,7 s | — | CI-headless | |
| S1 memoria | split pdf-lib 80 MB en 4 | Node | maxRSS 200 MB (gs completo 204) | 0,29 s | — | Node 22 | Trocear no ahorra memoria |
| S10 CSP | worker por URL (control) | CSP meta estricta | 6/6 vías llegan al testigo | — | — | Chromium 158 · Firefox 155 · WebKit 26.6 | La meta no rige workers por URL |
| S10 CSP | (a) worker blob: | igual | 0 peticiones | — | — | los 3 | Hereda la CSP |
| S10 CSP | (b) cabecera CSP inyectada por SW | página controlada | 0 peticiones | — | — | los 3 | Sin SW (1.ª visita) = control |
| S10 CSP | (c) lockdown en worker por URL | igual | 1 petición (import()) | — | — | los 3 | import() no se puede parchear |
| S10 CSP | (a)+(c) | igual | 0 peticiones | — | — | los 3 | Decisión ADR-004 |
| S10 CSP | blob: crea worker por URL | worker-src 'self' blob: | 6 peticiones | — | — | los 3 | Cerrado por lockdown o worker-src sin 'self' |
| S10 CSP | WASM en blob: sin 'wasm-unsafe-eval' | — | compilación bloqueada | — | — | los 3 | Obligatorio |
| S10 CSP | Ghostscript en blob:+lockdown, sint-foto-5mb [SINT] | Module precompilado | ✅ código 0, 401.485 B | compilar 81–379 ms; init 9–15 ms; total ~750 ms | — | los 3 | |
