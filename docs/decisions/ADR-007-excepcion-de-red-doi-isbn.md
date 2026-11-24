# ADR-007 — Única excepción de red: consultas de DOI e ISBN

- **Estado:** **aceptada** por el dueño (24-nov-2026) con tres condiciones: (1) solo a petición explícita del usuario, (2) solo se envía el DOI/ISBN, (3) la excepción vive únicamente en el net-guard, con una prueba que falla si otro módulo intenta usarla (`tests/policy/net-guard-scope.test.mjs`).
- **Contexto:** la app no envía nada fuera del dispositivo (CONTEXT §8.8, INSTRUCTIONS §0.8). El gestor de fuentes (§9.6) necesita completar metadatos a partir de un DOI o un ISBN, y eso solo existe en servicios externos. Mediciones en `spikes/s5-citas/README.md`.

## Decisión
1. **Esta es la única excepción del `net-guard`.** Ningún otro módulo puede hacer peticiones fuera del propio sitio. Añadir un host requiere un ADR nuevo y la aprobación del dueño.
2. **Hosts permitidos, en dos capas:**
   - CSP: `connect-src 'self' https://api.crossref.org https://openlibrary.org https://www.googleapis.com`. Medido: cualquier otro host queda bloqueado por la CSP antes de salir, en los 3 motores.
   - `net-guard.js`: lista cerrada de 3 URLs construidas en código (`lookupURL`), no URLs libres.
3. **Solo a petición del usuario.** `guardedFetch` exige `userInitiated: true` y el llamador lo pasa desde un gesto (botón "Buscar DOI/ISBN"). Sin búsquedas automáticas, sin búsqueda mientras se escribe y sin reintentos en segundo plano.
4. **Solo el identificador.** Antes de salir, el DOI se valida (`10.NNNN/…`, ≤ 200 caracteres) y el ISBN pasa el dígito de control y se convierte a ISBN-13. La URL lleva solo ese valor. Nunca títulos, nombres ni texto del usuario.
5. **Sin datos de contexto:** `credentials: 'omit'`, `referrerPolicy: 'no-referrer'` (además de `<meta name="referrer" content="no-referrer">`), `cache: 'no-store'`, `GET` y tiempo límite de 10 s. Medido en los 3 motores: sin `Referer` y sin cookies. Lo que sí sale, inevitablemente: la IP del usuario, el `User-Agent` y la cabecera `Origin` (`https://whoisarthur12.github.io`), que CORS exige.
6. **Aviso de red** visible junto a los botones, que dice qué se envía y a quién. Cada consulta queda en el diagnóstico local (host, tipo, estado, ms; el DOI/ISBN solo en el registro local).
7. **El resultado es un borrador.** Siempre se muestra para revisar y corregir antes de citar (§9.6). El HTML que llega (CrossRef incluye `<i>`, `<sub>`…) pasa por un sanitizador con lista blanca. Medido: `<img onerror>`, `<script>` y `<a href="javascript:">` se eliminan en los 3 motores.
8. **Orden de consulta:** DOI → CrossRef. ISBN → **Open Library** (fuente principal). Google Books solo como respaldo **sin clave** (decisión del dueño: una clave en código público se puede copiar y agotar); la app nunca depende de él.
9. **Sin conexión o con el servicio caído:** mensaje claro y formulario manual. La herramienta funciona igual sin red.
10. **Entrada manual siempre disponible**, y los autores se muestran **editables** antes de guardar (Open Library separa mal los apellidos compuestos).
11. **Prueba de alcance obligatoria:** `node --test tests/policy/net-guard-scope.test.mjs` recorre el repositorio y falla si un archivo fuera de la lista permitida menciona uno de los 3 hosts, importa el net-guard o, en código de producción, hace red directa. Se verificó que falla al introducir una violación.

## Consecuencias
- CORS medido en Chromium, Firefox y WebKit: CrossRef y Open Library responden con `Access-Control-Allow-Origin: *`; Google Books devuelve el origen. Funciona sin servidor propio.
- **Google Books sin clave no es fiable:** desde este contenedor respondió `429` (cuota diaria del proyecto anónimo agotada). **Decisión del dueño: sin clave**; queda como respaldo opcional.
- CrossRef pide identificarse con un correo para su "pool cortés"; **no se envía** (privacidad). Se acepta el límite público (5 peticiones por segundo), de sobra para consultas manuales.
- Open Library devuelve datos de calidad desigual: apellidos compuestos mal separados ("Márquez, G. G.") y registros basura para ISBN de relleno. La revisión obligatoria lo cubre.
