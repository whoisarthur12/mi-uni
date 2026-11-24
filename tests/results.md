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
| S10 SW | 1.ª visita deep link `#/m/ligero` bajo `/mi-uni/` | max-age=600 | ✅ controlada; `shell-v1`, `mod-ligero-v1` | 116 / 615 / 95 ms | — | Chromium 158 · Firefox 155 · WebKit 26.6 | Firefox exige precachear módulos livianos en install |
| S10 SW | módulo pesado (Ghostscript real) 15,57 MB, 3 archivos | SHA-256 por archivo | ✅ descargado y verificado | 397 / 1.254 / 950 ms | — | los 3 | `persist()`: false / pendiente / false |
| S10 SW | WASM desde caché sin conexión | servidor caído | ✅ compilado | 72 / 195 / 119 ms | — | los 3 | WebKit + `setOffline` de Playwright falla (artefacto, ver ADR-005) |
| S10 SW | gs.js corrupto | — | ✅ rechazado; no queda "completo"; reanudación reutiliza 2/3 | 15 / 551 / 46 ms | — | los 3 | |
| S10 SW | publicación nueva con 2 pestañas | "Actualizar" en una | ✅ ambas en v2; cachés viejas borradas | 1,4 / 1,8 / 0,6 s | — | los 3 | |
| S10 SW | precache con modo por defecto | max-age=600 | ❌ `index.html` de la versión anterior en `shell-v3` | — | — | Chromium, Firefox (WebKit no) | Con `cache:'reload'`: correcto en los 3 |
| S10 SW | assets pesados v1→v2 (mismos archivos) | — | ✅ v1 sirve offline hasta completar v2; copia local sin red | 148 / 811 / 109 ms | — | los 3 | |
| S10 canvas | área máxima página = worker | pixel de prueba | 268 / 537 / 268 MP; cuadrado 16.384 / 23.168 / 16.384 | — | ≥ 1,5 GB de canvas vivos | los 3 (escritorio) | iOS sin medir |
| S10 canvas | JPEG 4000×3000 q0,85 | página / worker | 93–96 / 69–103 / 249–402 ms | — | — | los 3 | |
| S10 PWA | instalabilidad bajo `/mi-uni/` | CDP | ✅ 0 errores | — | — | Chromium 158 | |
| S10 shell | peso del shell del spike | gzip -9 | 27,8 KB / 11,9 KB gzip | — | — | — | Presupuesto: ≤ 150 KB |
| S11 IndexedDB | blobs aleatorios 5 / 30 / 80 MB | guardar (con CRC) | ✅ releídos idénticos; 80 MB: 448 / 1.377 / 565 ms | leer 80 MB: 57 / 306 / 352 ms | +374 / +410 / +667 MB | Chromium 158 · Firefox 155 · WebKit 26.6 (perfil en disco) | |
| S11 ZIP | proyecto 200 MB (5 archivos) [SINT] | exportar STORE | ✅ `zipfile.testzip()` OK | 0,84 / 0,98 / 0,50 s | +10 / +4 / +0 MB | los 3 | CRC precalculado: sin copiar datos |
| S11 ZIP | mismo ZIP | importar (CRC antes y después) | ✅ idéntico; también en perfil limpio | 2,5 / 7,8 / 3,1 s | +279 / +372 / +640 MB | los 3 | |
| S11 ZIP | ZIP con un byte alterado | importar | ✅ rechazado, nada escrito | 0,7 / 2,6 / 0,8 s | — | los 3 | |
| S11 ZIP | importación cortada (navegador cerrado) | limpieza al arrancar | ✅ 0 blobs huérfanos | — | — | los 3 | |
| S11 IndexedDB | `File.slice()` guardado tal cual | — | ❌ se relee el File entero | — | — | WebKit 26.6 | Chromium/Firefox OK; copiar con arrayBuffer() lo corrige |
| S11 cuota | llenar de 50 en 50 MB | tope 1.500 MB | sin error a 1.500 MB; `estimate()` usage 0 / quota 1.000 | 22 s | — | WebKit 26.6 | estimate() inútil en WebKit |
| S11 persist | `navigator.storage.persist()` | sin gesto | false / pendiente / false | — | — | los 3 | |
| S11 trozos | importar proyecto 200 MB [SINT] en perfil limpio | archivo entero / 16 MB / 8 MB | ✅ idéntico en todos | 8 MB: 3,0 / 9,6 / 3,5 s | +349/+195/+173 · +432/+215/+157 · +647/+258/+133 MB | Chromium · Firefox · WebKit | 8 MB por defecto (ADR-006) |
| S11 respaldo | política de aviso | 7 días | ✅ 7 pruebas en Node | — | — | Node 22 | |
| S5 CSL | 10 tipos de fuente (items.json) [SINT] | apa-es + es-ES | ✅ coincide con lo esperado (15 pruebas) | — | — | Node 22 | Validar con el reglamento de la universidad |
| S5 CSL | 100 referencias APA | crear motor / bibliografía / 50 citas | ✅ | 745/119/13 · 1.187/176/33 · 923/199/31 ms | — | Chromium 158 · Firefox 155 · WebKit 26.6 | En worker: bloqueo máx. de página 17 / 18 / 26 ms |
| S5 red | DOI CrossRef (2) + inexistente | CORS desde el navegador | ✅ 200 / 404 | 0,1–0,6 s | — | los 3 | Firefox con ignoreHTTPSErrors (CA del proxy del contenedor) |
| S5 red | ISBN Open Library (3) | CORS | ✅ | 0,14–4,3 s | — | los 3 | Apellidos compuestos mal separados |
| S5 red | ISBN Google Books | sin clave | ❌ 429 cuota diaria | — | — | curl | Solo respaldo |
| S5 red | cabeceras enviadas | — | Origin sí; sin Referer ni cookies | — | — | los 3 | |
| S5 CSP | fetch a example.com | connect-src con 3 hosts | ✅ bloqueado | — | — | los 3 | |
| S5 XSS | título con img onerror / script / javascript: | sanitizador | ✅ eliminado | — | — | los 3 | |
| S12 unir | 3 × sint-30mb [SINT] (79,7 MB, 18 p) | @cantoo, sin / con guardas | ✅ 18 p (pypdf + pdfium), guarda ok | 0,61–0,74/0,67–0,83 · 0,83–1,18/0,87–1,06 · 1,13–1,43/1,10–1,36 s | +239…324/+362…657 · +400…567/+452…467 · +584…622/+606…626 MB | Chromium 158 · Firefox 155 · WebKit 26.6 | Pico 3–8 × entrada; guarda 22–90 ms. (pdf-lib 1.17.1, commit 722223f: 0,78 / 0,98 / 1,43 s) |
| S12 dividir | sint-100p [SINT] 30,7 MB en 100 | @cantoo + guarda por parte | ✅ 0 fallos | 0,36–0,60 / 0,50–0,63 / 0,53–0,63 s | — | los 3 | guarda 65–123 ms en total |
| S12 miniaturas | sint-100p [SINT] | todas, escala 0,2 | ✅ mediana 33–34 ms/p | 3,2–3,5 / 3,4–3,8 / 4,2–4,3 s | +517…650 / +179…221 / +285…308 MB | los 3 | Bloqueo máx. 11–36 / 9–16 / **400–415** ms |
| S12 miniaturas | sint-100p [SINT] | perezosas (≤ 120 px CSS, visibles, liberar) | ✅ al abrir 35 de 100; máx. 49 vivas | primera pantalla 1,3–1,4 / 1,4 / 2,0 s | +601…610 / +160…171 / +282…308 MB | los 3 | Ahorra tiempo, no memoria |
| S12 miniaturas | unido 18 p de fotos 3000×4000 | todas / perezosas | ✅ | 4,1–4,9 / 5,9–6,4 / 5,6–6,1 s | +963…1.551/+866 · +485…522/+586 · +694…860/+677 MB (unir + miniaturas) | los 3 | Ruido de ±300 MB en Chromium |
| S12 render | página 3000×4000 a 12 MP (×5) | pdf.js | ✅ pintado | 0,46 / 0,69 / 0,97 s | +145 / +237 / +374 MB | los 3 | WebKit bloquea 409 ms (commit 722223f) |
| S12 cifrado | solo propietario, copiar página sin descifrar | opción prohibida | ❌ página en blanco sin error → la guarda la rechaza | — | — | los 3 (pdf-lib y @cantoo) | Prohibida en todo el repo (prueba de política) |
| S12 cifrado | solo propietario | permiso No / Sí | ✅ No: intacto + alternativas · Sí: texto intacto, guarda ok | — | — | los 3 | |
| S12 cifrado | contraseña de usuario | sin / incorrecta ×3 / correcta | ✅ rechazo claro / rechazo / abre, guarda ok | — | — | los 3 | Nunca se salta |
| S12 formulario | sint-formulario [SINT] | rellenar texto + casilla | ✅ pypdf lee los valores | — | — | los 3 | |
| S12 corrupto | PDF truncado a la mitad | @cantoo + guarda de entrada | ⚠️ @cantoo abre 30 p sin error (21 vacías) → guarda: «21 de 30 ilegibles», no se procesa; pdf.js `InvalidPDFException` | — | — | los 3 | |
