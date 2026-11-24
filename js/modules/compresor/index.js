// Compresor de PDF: primer módulo utilizable (ADR-011). Interfaz; la lógica está en motor.js.
import { h, fmtMB, descargarBlob } from '../../core/dom.js';
import { icono } from '../../core/icons.js';
import { confirmar, pedirTexto } from '../../core/dialogo.js';
import { clasificarEntrada, marcarTrabajo, cierreAnterior } from '../../core/memoria.js';
import { diag, publicar } from '../../core/hooks.js';
import { listarProyectos, listarRecursos, leerRecurso, guardarRecurso, crearProyecto } from '../../core/proyectos.js';
import { diagnosticarPdf, pintarPagina, cifradoPorPropietario } from '../../engines/pdf/motores.js';
import { analizar, comprimir } from './motor.js';
import { OBJETIVO_POR_DEFECTO, MANUAL } from './escala.js';

const decimal = (n) => String(n).replace('.', ',');
const leerMB = (t) => { const n = Number(String(t).replace(/\s|MB/gi, '').replace(',', '.')); return Number.isFinite(n) && n >= 0.1 && n <= 2000 ? Math.round(n * 1e6) : null; };
const nombreBase = (n) => String(n || 'documento.pdf').replace(/\.pdf$/i, '');

let ctrl = null; // AbortController del trabajo en curso

export default {
  desmontar() { ctrl?.abort(); ctrl = null; },

  async montar(zona) {
    const st = { archivo: null, nombre: '', bytes: null, password: undefined, analisis: null, forzar: false, modo: 'objetivo' };
    const estado = h('p.suave', { role: 'status' });
    const avisar = (t) => { estado.textContent = t; };

    // ---------- Elegir archivo ----------
    const entrada = h('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
    const tarjetaArchivo = h('div.archivo', {});
    const contArchivo = h('div', { hidden: true }, tarjetaArchivo);
    const avisos = h('div.pila', {});
    const elegir = h('div.pila', {},
      h('button.pildora.pildora-prim.ancho', { type: 'button', on: { click: () => entrada.click() } }, icono('pdf', { tam: 20 }), 'Elegir un PDF'),
      h('button.pildora.pildora-sec.ancho', { type: 'button', on: { click: desdeProyecto } }, 'Usar un PDF de un proyecto'),
    );

    // ---------- Opciones ----------
    const inObjetivo = h('input', { type: 'text', inputmode: 'decimal', value: decimal(OBJETIVO_POR_DEFECTO / 1e6), 'aria-describedby': 'ayuda-objetivo', id: 'objetivo' });
    const selDpi = h('select', { id: 'dpi' }, ...MANUAL.dpis.map((d) => h('option', { value: String(d), selected: d === MANUAL.porDefecto.dpi }, `${d} ppp`)));
    const valCalidad = h('output', { for: 'calidad' }, String(MANUAL.porDefecto.calidad));
    const inCalidad = h('input', { type: 'range', id: 'calidad', min: '10', max: '100', step: '5', value: String(MANUAL.porDefecto.calidad), on: { input: (e) => { valCalidad.textContent = e.target.value; } } });
    const inGris = h('input', { type: 'checkbox', id: 'gris' });
    const segObj = h('button', { type: 'button', role: 'radio', 'aria-checked': 'true' }, 'Tamaño máximo');
    const segMan = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false' }, 'Manual');
    const panelObj = h('div.grupo', {},
      h('label.campo', { for: 'objetivo' }, h('span', {}, 'Que pese como máximo (MB)'), inObjetivo),
      h('p.suave.pequeno', { id: 'ayuda-objetivo' }, 'Por defecto 4,8 MB. Busca la mejor calidad que quepa.'));
    const panelMan = h('div.grupo', { hidden: true },
      h('label.campo', { for: 'dpi' }, h('span', {}, 'Resolución de las imágenes'), selDpi),
      h('div.campo', {}, h('label', { for: 'calidad' }, 'Calidad de imagen: ', valCalidad), inCalidad),
      h('label.opcion-check', { for: 'gris' }, inGris, h('span', {}, 'Escala de grises')));
    const elegirModo = (m) => { st.modo = m; segObj.setAttribute('aria-checked', String(m === 'objetivo')); segMan.setAttribute('aria-checked', String(m === 'manual')); panelObj.hidden = m !== 'objetivo'; panelMan.hidden = m !== 'manual'; };
    segObj.addEventListener('click', () => elegirModo('objetivo')); segMan.addEventListener('click', () => elegirModo('manual'));
    const bComprimir = h('button.pildora.pildora-prim.ancho', { type: 'button', on: { click: () => ejecutar() } }, 'Comprimir');
    const opciones = h('div', { hidden: true },
      h('h2.titulo-seccion', {}, '¿Cómo lo quieres?'),
      h('div.segmentos', { role: 'radiogroup', 'aria-label': 'Modo' }, segObj, segMan),
      panelObj, panelMan, bComprimir);

    // ---------- Progreso ----------
    const txtProg = h('p', { 'aria-live': 'polite' });
    const relleno = h('span');
    const pista = h('div.pista', { role: 'progressbar', 'aria-label': 'Progreso de la compresión', 'aria-valuemin': '0', 'aria-valuemax': '100' }, relleno);
    const progreso = h('div.progreso', { hidden: true }, txtProg, pista, h('button.pildora.pildora-sec', { type: 'button', on: { click: () => ctrl?.abort() } }, 'Cancelar'));
    const resultado = h('div', { hidden: true });

    entrada.addEventListener('change', () => { const f = entrada.files[0]; entrada.value = ''; if (f) cargar(f, f.name); });

    async function desdeProyecto() {
      const ps = await listarProyectos().catch(() => []);
      const pdfs = [];
      for (const p of ps) for (const r of await listarRecursos(p.id)) if (/pdf/i.test(r.mime) || /\.pdf$/i.test(r.nombre)) pdfs.push({ p, r });
      if (!pdfs.length) { avisar('No hay PDFs guardados en tus proyectos todavía.'); return; }
      const elegido = await elegirDeLista('Elige un PDF', pdfs.map(({ p, r }) => ({ valor: r.id, texto: r.nombre, detalle: `${p.nombre} · ${fmtMB(r.size)}` })));
      if (!elegido) return;
      const { r } = pdfs.find((x) => x.r.id === elegido);
      cargar(await leerRecurso(r.id), r.nombre);
    }

    async function cargar(blob, nombre) {
      resultado.hidden = true; opciones.hidden = true; avisos.replaceChildren(); avisar('');
      st.forzar = false; st.password = undefined; st.analisis = null; st.nombre = nombre;
      st.bytes = new Uint8Array(await blob.arrayBuffer());
      tarjetaArchivo.replaceChildren(icono('pdf'), h('span.archivo-texto', {}, h('span.archivo-nombre', {}, nombre), h('span.suave.pequeno', { id: 'meta-archivo' }, `${fmtMB(st.bytes.length)} · revisando…`)),
        h('button.pildora.pildora-sec', { type: 'button', on: { click: () => entrada.click() } }, 'Cambiar'));
      elegir.hidden = true; contArchivo.hidden = false;
      // Memoria (ADR-003)
      const mem = clasificarEntrada(st.bytes.length);
      if (mem.nivel === 'aviso') avisos.append(h('div.banda', {}, h('p', {}, `Archivo grande para este teléfono (unos ${mem.picoMB} MB de memoria). Cierra otras apps antes de empezar. Si la pestaña se cierra, tus archivos no se pierden.`)));
      if (mem.nivel === 'bloqueo') {
        const bForzar = h('button.pildora.pildora-sec', { type: 'button', on: { click: async () => {
          if (await confirmar('¿Intentar de todos modos?', 'Es probable que el navegador cierre la pestaña por falta de memoria. Tu archivo original no se modifica.', { aceptar: 'Intentar' })) { st.forzar = true; bloqueo.remove(); opciones.hidden = false; }
        } } }, 'Intentar de todos modos');
        const bloqueo = h('div.estado-error', {}, h('p', {}, `Este PDF (${fmtMB(st.bytes.length)}) es demasiado grande para la memoria de este dispositivo (límite estimado: ${mem.avisoHastaMB} MB). Opciones: usarlo en un computador o quitarle páginas antes.`), bForzar);
        avisos.append(bloqueo);
      }
      // Cifrado y permisos (ADR-010): nunca se salta una contraseña.
      let d = await diagnosticarPdf(st.bytes);
      for (let intento = 0; d.estado === 'contrasena' || d.estado === 'contrasena-incorrecta'; intento++) {
        if (intento >= 3) { return bloquear('Sin la contraseña correcta no se puede abrir este PDF. Pídesela a quien te lo envió.'); }
        const pw = await pedirTexto(intento ? 'Contraseña incorrecta' : 'Este PDF tiene contraseña', { tipo: 'password', etiqueta: 'Contraseña para abrirlo', autocomplete: 'off', mensajeVacio: 'Escribe la contraseña.' }, { aceptar: 'Abrir' });
        if (pw == null) return bloquear('Sin la contraseña no se puede abrir este PDF. Pídesela a quien te lo envió.');
        st.password = pw; d = await diagnosticarPdf(st.bytes, pw);
      }
      if (d.estado === 'danado') return bloquear('Este archivo está dañado o no es un PDF válido.');
      // Restricciones del propietario: pdf.js las informa; si concede todo pero sigue cifrado, el resultado
      // también perdería esa protección, así que se pregunta igual (decisión del dueño: avisar y confirmar).
      if (!d.restringido && st.password === undefined && (await cifradoPorPropietario(st.bytes))) d.restringido = true;
      if (d.restringido) {
        const ok = await confirmar('Este PDF tiene restricciones de su autor', '¿Es tuyo o tienes permiso para modificarlo? Si continúas, el PDF comprimido no conservará esas restricciones. El original no se modifica.', { aceptar: 'Sí, es mío o tengo permiso', cancelar: 'No' });
        if (!ok) return bloquear('No se ha modificado el PDF. Puedes pedir a quien lo creó una copia sin restricciones.');
        if (st.password === undefined) st.password = '';
      }
      try { st.analisis = await analizar(st.bytes, st.password); }
      catch (e) { return bloquear(`No se pudo leer el PDF: ${e.message}`); }
      const il = st.analisis.estados.filter((s) => s === 'ilegible').length;
      if (il) return bloquear(`El PDF está dañado: ${il} de ${st.analisis.paginas} páginas no se pueden leer.`);
      zona.querySelector('#meta-archivo').textContent = `${fmtMB(st.bytes.length)} · ${st.analisis.paginas} ${st.analisis.paginas === 1 ? 'página' : 'páginas'}`;
      opciones.hidden = mem.nivel === 'bloqueo' && !st.forzar;
    }

    function bloquear(texto) { avisos.append(h('p.estado-error', {}, texto)); opciones.hidden = true; return null; }

    async function ejecutar() {
      let modo;
      if (st.modo === 'objetivo') {
        const obj = leerMB(inObjetivo.value);
        if (!obj) { avisar('Escribe un tamaño válido en MB, por ejemplo 4,8.'); inObjetivo.focus(); return; }
        modo = { tipo: 'objetivo', objetivo: obj };
      } else modo = { tipo: 'manual', dpi: Number(selDpi.value), calidad: Number(inCalidad.value), gris: inGris.checked };
      ctrl = new AbortController();
      opciones.hidden = true; resultado.hidden = true; progreso.hidden = false; avisar('');
      const fin = marcarTrabajo(st.bytes.length, 'compresor');
      const t0 = performance.now();
      try {
        const r = await comprimir(st.bytes, modo, { password: st.password, analisis: st.analisis, signal: ctrl.signal, alAvanzar: pintarProgreso });
        diag('compresor:fin', { entrada: st.bytes.length, salida: r.archivos.map((x) => x.bytes), pasadas: r.pasadas, ms: r.ms, escalera: r.escalera || 0 });
        mostrarResultado(r, modo);
      } catch (e) {
        if (e.name === 'AbortError') avisar('Cancelado. Tu archivo no se modificó.');
        else { avisar(`No se pudo comprimir: ${e.message}`); diag('compresor:error', { message: e.message, ms: Math.round(performance.now() - t0) }); }
        opciones.hidden = false;
      } finally { fin(); progreso.hidden = true; ctrl = null; }
    }

    function pintarProgreso(e) {
      const frases = {
        buscar: `Probando el nivel ${e.nivel + 1} de ${e.de} con unas páginas de muestra…`,
        confirmar: `Comprimiendo el documento completo (nivel ${(e.nivel ?? 0) + 1})…`,
        escalera: ['', 'No llega a la meta: convirtiendo en imagen las páginas más pesadas…', 'Convirtiendo todas las páginas en imagen…', 'Dividiendo en partes…'][e.paso],
      };
      if (frases[e.fase]) txtProg.textContent = frases[e.fase];
      if (e.total) {
        const pct = Math.round((e.pagina / e.total) * 100);
        relleno.style.width = pct + '%'; pista.setAttribute('aria-valuenow', String(pct));
        if (e.fase === 'comprimir' || e.fase === 'rasterizar') txtProg.textContent = `Pasada ${e.pasada}: página ${e.pagina} de ${e.total}`;
      }
    }

    function mostrarResultado(r, modo) {
      resultado.replaceChildren(); resultado.hidden = false;
      if (r.yaCumple) { resultado.append(h('div.banda', {}, h('p', {}, `Este PDF ya pesa ${fmtMB(r.original)}, menos que la meta. No hace falta comprimirlo.`))); opciones.hidden = false; return; }
      if (!r.archivos.length) {
        resultado.append(h('p.estado-error', {}, r.sinMejora ? `No se pudo reducir: ${r.fallo}. Tu archivo ya está bien optimizado; se queda como está.` : `No se entrega ningún archivo: ${r.fallo}.`));
        opciones.hidden = false; return;
      }
      const total = r.archivos.reduce((s, x) => s + x.bytes, 0);
      const varias = r.archivos.length > 1;
      const nombres = r.archivos.map((x, i) => varias ? `${nombreBase(st.nombre)} (parte ${i + 1} de ${r.archivos.length}).pdf` : `${nombreBase(st.nombre)} (comprimido).pdf`);
      const blobs = r.archivos.map((x) => new Blob([x.datos], { type: 'application/pdf' }));
      const cumple = modo.tipo !== 'objetivo' || r.archivos.every((x) => x.bytes <= modo.objetivo);
      const acciones = h('div.acciones', {},
        ...blobs.map((b, i) => h('button.pildora.pildora-prim', { type: 'button', on: { click: () => descargarBlob(b, nombres[i]) } }, varias ? `Descargar parte ${i + 1} (${fmtMB(b.size)})` : 'Descargar')),
        navigator.canShare?.({ files: [new File([blobs[0]], nombres[0], { type: 'application/pdf' })] })
          ? h('button.pildora.pildora-sec', { type: 'button', on: { click: () => navigator.share({ files: blobs.map((b, i) => new File([b], nombres[i], { type: 'application/pdf' })), title: nombres[0] }).catch(() => {}) } }, 'Compartir') : '',
        h('button.pildora.pildora-sec', { type: 'button', on: { click: () => guardarEnProyecto(blobs, nombres) } }, 'Guardar en un proyecto'),
      );
      const comparar = h('div.comparar', {});
      resultado.append(h('div.ventana', { tabindex: '-1', 'aria-labelledby': 't-resultado' },
        h('div.ventana-barra', {}, h('span.ventana-puntos', { 'aria-hidden': 'true' }), h('span', { id: 't-resultado' }, 'Resultado')),
        h('div.ventana-cuerpo', {},
          h('p.cifra', {}, h('span.suave.tachado', {}, fmtMB(r.original)), icono('flecha', { tam: 20 }), h('span.sr', {}, 'ahora pesa'), ` ${fmtMB(total)}`),
          h('p.suave', {}, `${Math.round((1 - total / r.original) * 100)} % más liviano. ${varias ? `${r.archivos.length} archivos con` : 'Tiene'} las mismas ${r.paginas} páginas que el original.${modo.tipo === 'objetivo' ? (cumple ? ` Cumple la meta de ${fmtMB(modo.objetivo)}.` : '') : ''}`),
          r.efectos.length ? h('ul.efectos', {}, ...r.efectos.map((t) => h('li', {}, t))) : '',
          acciones,
          h('p.suave.pequeno', {}, `${r.pasadas} ${r.pasadas === 1 ? 'pasada' : 'pasadas'} en ${(r.ms / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} s. Tu archivo original no se modificó.`),
        )), comparar);
      resultado.querySelector('.ventana').focus();
      publicar('compresor:resultado', { bytes: total, partes: r.archivos.length });
      pintarComparacion(comparar, r).catch((e) => { comparar.replaceChildren(h('p.suave.pequeno', {}, `No se pudo mostrar la comparación (${e.message}).`)); });
      opciones.hidden = false; bComprimir.textContent = 'Comprimir otra vez';
    }

    /** Antes/después de la página más pesada, con deslizador y zoom. */
    async function pintarComparacion(caja, r) {
      const pesos = st.analisis.pesos; const pag = pesos.indexOf(Math.max(...pesos)) + 1;
      const parte = r.archivos.find((x) => pag >= x.paginas[0] && pag <= x.paginas[1]) || r.archivos[0];
      const pagParte = pag - parte.paginas[0] + 1;
      const antes = h('canvas.comp-antes', { 'aria-hidden': 'true' }); const despues = h('canvas.comp-despues', { 'aria-hidden': 'true' });
      const marco = h('div.comp-marco', {}, despues, antes);
      const desliz = h('input', { type: 'range', min: '0', max: '100', value: '50', 'aria-label': 'Comparar: a la izquierda el original, a la derecha el comprimido', on: { input: (e) => { antes.style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`; } } });
      let zoom = 1;
      const bZoom = h('button.pildora.pildora-sec', { type: 'button', 'aria-pressed': 'false' }, 'Ampliar');
      const vista = h('div.comp-vista', {}, marco);
      caja.replaceChildren(h('h2.titulo-seccion', {}, 'Antes y después'), h('p.suave', {}, `Página ${pag}, la de más imágenes. Desliza para comparar.`), vista,
        h('div.comp-controles', {}, h('span.pequeno.suave', {}, 'Original'), desliz, h('span.pequeno.suave', {}, 'Comprimido')), bZoom);
      const pintar = async () => {
        const ancho = Math.min(vista.clientWidth || 340, 640) * zoom;
        await pintarPagina(st.bytes, pag, antes, ancho, { password: st.password });
        await pintarPagina(parte.datos, pagParte, despues, ancho);
        for (const c of [antes, despues]) { c.style.width = `${ancho}px`; }
        antes.style.clipPath = `inset(0 ${100 - desliz.value}% 0 0)`;
      };
      bZoom.addEventListener('click', async () => { zoom = zoom === 1 ? 2.5 : 1; bZoom.setAttribute('aria-pressed', String(zoom > 1)); bZoom.textContent = zoom > 1 ? 'Reducir' : 'Ampliar'; await pintar(); });
      await pintar();
    }

    async function guardarEnProyecto(blobs, nombres) {
      const ps = await listarProyectos().catch(() => []);
      const op = [...ps.map((p) => ({ valor: p.id, texto: p.nombre })), { valor: '__nuevo', texto: 'Nuevo proyecto…' }];
      let pid = await elegirDeLista('Guardar en un proyecto', op);
      if (!pid) return;
      try {
        if (pid === '__nuevo') {
          const n = await pedirTexto('Nuevo proyecto', { etiqueta: 'Nombre', mensajeVacio: 'Ponle un nombre al proyecto.' }, { aceptar: 'Crear' });
          if (n == null) return;
          pid = (await crearProyecto(n)).id;
        }
        for (let i = 0; i < blobs.length; i++) await guardarRecurso(pid, blobs[i], { nombre: nombres[i], origen: 'Comprimir PDF' });
        avisar(`Guardado en el proyecto (${blobs.length} ${blobs.length === 1 ? 'archivo' : 'archivos'}). Recuerda respaldarlo.`);
      } catch (e) { avisar(`No se pudo guardar: ${e.message}`); }
    }

    // Cierre de pestaña detectado en un trabajo anterior (ADR-003, aprendizaje de cierres).
    const cierre = cierreAnterior();
    zona.append(
      h('h1.par', {}, 'Comprimir PDF. ', h('span.suave', {}, 'El archivo no sale de este teléfono.')),
      cierre ? h('div.banda', {}, h('p', {}, `La última vez, comprimir un PDF de ${cierre.mb} MB cerró la pestaña. Desde ahora el límite de este dispositivo es menor.`)) : '',
      elegir, contArchivo, avisos, progreso, resultado, opciones, entrada,
      h('div.estado-fijo', {}, estado),
    );
  },
};

/** Diálogo con una lista de opciones (radio). Devuelve el valor elegido o null. */
function elegirDeLista(titulo, opciones) {
  return new Promise((resolve) => {
    const nombre = 'op-' + Math.random().toString(36).slice(2);
    const items = opciones.map((o, i) => h('label.opcion', {}, h('input', { type: 'radio', name: nombre, value: o.valor, checked: i === 0 }),
      h('span', {}, h('span.opcion-titulo', {}, o.texto), o.detalle ? h('span.suave.pequeno', {}, o.detalle) : '')));
    const form = h('form.dialogo-cuerpo', { method: 'dialog' }, h('h2.dialogo-titulo', { id: 'dlg-l' }, titulo), h('div.opciones.lista-dialogo', {}, ...items),
      h('div.acciones', {}, h('button.pildora.pildora-prim', { type: 'submit', value: 'ok' }, 'Elegir'), h('button.pildora.pildora-sec', { type: 'button', on: { click: () => d.close('no') } }, 'Cancelar')));
    const d = h('dialog.dialogo', { 'aria-labelledby': 'dlg-l' }, form);
    d.addEventListener('close', () => { const v = d.returnValue === 'ok' ? form.querySelector('input:checked')?.value : null; d.remove(); resolve(v || null); });
    document.body.append(d); d.showModal();
  });
}
