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
