# Compresor de PDF (Fase 1, bloque 4)

Primer módulo utilizable de Mi Uni (ADR-011). Código: `js/modules/compresor/`. Motor PDF compartido: `js/engines/pdf/`.

## Cómo funciona
1. **Elegir el PDF:** desde el teléfono o desde un proyecto. Nada sale del dispositivo.
2. **Revisión previa:**
   - **Memoria (ADR-003):** según el tamaño y la RAM del dispositivo, se procesa sin aviso, se avisa sin bloquear, o se bloquea con alternativas y el botón «Intentar de todos modos» (con confirmación).
   - **Aprendizaje de cierres:** si la pestaña se cerró a mitad de una compresión, al volver se avisa y se baja el límite de ese dispositivo al 80 % de ese tamaño.
   - **Contraseña de apertura:** se pide (3 intentos); **nunca se salta**. Ghostscript sin contraseña termina «bien» pero con una salida vacía (medido); por eso se revisa antes y la guarda cuenta las páginas.
   - **Cifrado de propietario:** se pregunta «¿Es tuyo o tienes permiso para modificarlo?». Se pregunta aunque el PDF conceda todos los permisos, porque el resultado pierde esa protección. Ghostscript lo procesaría sin preguntar (medido).
   - **PDF dañado:** si pdf.js no lo abre o tiene páginas ilegibles (guarda de entrada de ADR-010), no se procesa.
3. **Modos:**
   - **Tamaño máximo**, 4,8 MB por defecto y editable. Primero se hace una **búsqueda binaria** sobre 12 niveles de DPI y calidad usando **estimaciones con páginas de muestra**: con más de 5 páginas se comprimen solo la primera, la última y las más pesadas, y se escala por el peso de cada página. Luego se **confirma con el documento completo**:
     - si se pasa de la meta, se sube un nivel;
     - si queda por debajo del 90 % de la meta, se prueba un nivel menos agresivo para ganar calidad;
     - como máximo 4 pasadas completas.
   - **Manual:** resolución (72–300 ppp), calidad de imagen (10–100) y escala de grises.
4. **Un worker nuevo por pasada** de Ghostscript (ADR-003). Lo crea `core/workers.js` (`blob:` + `lockdown`, ADR-004) y se termina al acabar. **Cancelar** lo termina al instante.
5. **Guarda de salida**, antes de entregar:
   - el resultado abre;
   - tiene **el mismo número de páginas**;
   - **ninguna página quedó en blanco** si en el original tenía contenido;
   - es **más pequeño que el original**.
   Si no se cumple, no se entrega nada y el original se queda como está.
6. **Escalera de emergencia**, si ni el nivel más agresivo llega a la meta. **Siempre se avisa del efecto:**
   1. convertir en imagen (`pdfimage24`, JPEG) **solo las páginas más pesadas** y unirlas con las demás ya comprimidas: en esas páginas el texto deja de ser seleccionable;
   2. convertir en imagen **todas las páginas** (110 → 72 ppp);
   3. **dividir en partes** de como máximo la meta cada una.
7. **Resultado:**
   - tamaño antes y después;
   - efectos aplicados;
   - **comparación antes/después** de la página más pesada, con deslizador y zoom;
   - **Descargar**, **Compartir** (si el navegador lo permite) y **Guardar en un proyecto** (uno existente o nuevo).

La **escala de 12 niveles es provisional**: se calibra con tus PDFs reales (ver abajo). No se cambia hasta tener tus resultados.

## Pruebas en tu iPhone con tus PDFs reales
Antes de empezar:
- mergea los PR en orden: #5 → #6 → #7 → #9 → #10 → #11 → #12 → #13;
- abre `https://whoisarthur12.github.io/mi-uni/` en **Safari**;
- elige 3 o 4 PDFs tuyos (no los subas a ningún sitio):
  - uno escaneado o con fotos, de unos 20–30 MB;
  - uno exportado de Word con imágenes;
  - el más grande que tengas (50–100 MB);
  - si tienes uno, uno con contraseña o protegido.

**A. Instalar y modo sin conexión**
1. Compartir → **Añadir a pantalla de inicio**. Abre Mi Uni desde el icono.
2. Toca **Comprimir PDF** → en «Usar sin conexión» pulsa **Descargar** (unos 18 MB). Espera a «Descargado: funciona sin conexión.».
3. Activa el **modo avión**, cierra la app y vuelve a abrirla. Abre Comprimir PDF: debe cargar.

**B. Tamaño máximo (con cada PDF)**
1. **Elegir un PDF** → elige el archivo. Anota si sale algún aviso de memoria.
2. Deja **4,8** y pulsa **Comprimir**. Anota cuánto tarda (o mira la línea «N pasadas en X s»).
3. En el resultado:
   - anota el tamaño final y los efectos;
   - mueve el deslizador de «Antes y después» y pulsa **Ampliar**: ¿se lee bien?
4. Pulsa **Descargar** → «Guardar en Archivos». Ábrelo en Archivos: ¿tiene todas las páginas y se ve bien?
5. Si la app se cierra sola o se recarga, anótalo con el tamaño del PDF y vuelve a abrir Comprimir PDF: debe aparecer el aviso de cierre.

**C. Manual**
1. Con el PDF escaneado: **Manual**, 150 ppp, calidad 60 → Comprimir. Compara con el resultado de B.

**D. Meta exigente (escalera)**
1. Con el PDF más grande: escribe **1** en «Que pese como máximo (MB)» → Comprimir. Anota qué hizo (imágenes, partes) y si el resultado sirve.

**E. Protegidos (si tienes)**
1. Con contraseña: debe pedírtela. Prueba una incorrecta y luego la correcta.
2. Protegido por su autor: debe preguntar «¿Es tuyo o tienes permiso…?». Prueba «No» (no debe hacer nada) y luego «Sí».

**F. Guardar en un proyecto**
1. En un resultado, **Guardar en un proyecto** → Nuevo proyecto. Ve a **Proyectos**: debe aparecer con el archivo.
2. **Respaldar en ZIP** → «Guardar en Archivos».

**Qué mandarme:**
- el modelo de tu iPhone;
- por cada PDF: tamaño original, tamaño final, segundos, efectos y si se veía bien;
- si hubo cierres o avisos;
- capturas de lo que se vea mal.

Con eso calibro la escala y los topes de memoria. **No los toco antes.**
