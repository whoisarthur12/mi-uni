import { h, fmtMB, descargarBlob } from '../../core/dom.js';
import { pedirTexto } from '../../core/dialogo.js';
import { icono } from '../../core/icons.js';
import { cargarAjustes } from '../../core/ajustes.js';
import { listarProyectos, crearProyecto, exportarProyecto, importarProyecto, espacioUsado, listarRecursos } from '../../core/proyectos.js';
import { estadoRespaldo, etiquetaRespaldo, fraseRespaldo } from '../../core/respaldo.js';

/** Paisaje SVG ligero para estados vacíos (ADR-013). */
export function paisaje() {
  const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'paisaje'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '0 0 320 140'); svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  const add = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); svg.append(e); };
  add('rect', { class: 'cielo', width: 320, height: 140 });
  add('path', { class: 'cerro-lejos', d: 'M0 96 C40 70 70 74 104 86 S170 62 210 74 S280 92 320 70 V140 H0z' });
  add('path', { class: 'cerro-cerca', d: 'M0 116 C50 98 90 104 140 112 S230 96 320 108 V140 H0z' });
  return svg;
}

export const marcaEstado = (e) => h(`span.marca-estado.${e.nivel === 'ok' ? 'ok' : 'alerta'}`, {}, etiquetaRespaldo(e));

/** Exporta el ZIP de un proyecto y lo descarga. Devuelve el texto para el estado. */
export async function respaldar(id) {
  const r = await exportarProyecto(id);
  descargarBlob(r.zip, r.nombre);
  return `Copia descargada: ${r.nombre} (${fmtMB(r.bytes)}). Guárdala fuera del teléfono (nube, correo o computador).`;
}

/** Crear proyecto con diálogo. Devuelve el proyecto o null. */
export async function nuevoProyecto() {
  const nombre = await pedirTexto('Nuevo proyecto', { etiqueta: 'Nombre', valor: '', mensajeVacio: 'Ponle un nombre al proyecto.' }, { aceptar: 'Crear' });
  return nombre == null ? null : crearProyecto(nombre);
}

export async function vistaProyectos(main) {
  const a = await cargarAjustes();
  const estado = h('p.suave', { role: 'status' });
  const avisar = (t) => { estado.textContent = t; };
  const archivo = h('input', { type: 'file', accept: '.zip,application/zip', hidden: true });
  const progreso = h('div.progreso-linea', { hidden: true }, h('p', { 'aria-live': 'polite' }), h('div.pista', { role: 'progressbar', 'aria-label': 'Importación', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span')));
  const contenido = h('div');

  const pintar = async () => {
    let ps, esp;
    try { [ps, esp] = await Promise.all([listarProyectos(), espacioUsado()]); }
    catch (e) { contenido.replaceChildren(h('p.estado-error', {}, `No se pueden leer los proyectos: ${e.message}`)); return; }
    if (!ps.length) {
      contenido.replaceChildren(h('div.vacio', {},
        paisaje(),
        h('p.vacio-titulo', {}, 'Todavía no hay proyectos.'),
        h('p.suave', {}, 'Un proyecto junta los archivos de un trabajo: borradores, PDFs y fuentes.'),
        h('button.pildora.pildora-prim.ancho', { type: 'button', on: { click: crear } }, 'Crear proyecto'),
        h('button.pildora.pildora-sec.ancho', { type: 'button', on: { click: () => archivo.click() } }, 'Importar desde ZIP'),
      ));
      return;
    }
    const items = await Promise.all(ps.map(async (p) => {
      const e = estadoRespaldo(p, new Date(), a.datos.avisoRespaldoDias);
      const n = (await listarRecursos(p.id)).length;
      return h('li.tarjeta.tarjeta-proy', {},
        h('a.enlace-titulo', { href: `#/proyectos/${encodeURIComponent(p.id)}` }, h('span.tarjeta-titulo', {}, p.nombre), icono('flecha', { tam: 16 })),
        h('span.suave.pequeno', {}, `${n} ${n === 1 ? 'archivo' : 'archivos'} · ${fmtMB(esp.por[p.id] || 0)} · ${fraseRespaldo(p, a.region.zonaHoraria)}`),
        marcaEstado(e),
        e.nivel !== 'ok' ? h('button.pildora.pildora-prim', { type: 'button', on: { click: async (ev) => { ev.target.disabled = true; try { avisar(await respaldar(p.id)); await pintar(); } catch (x) { avisar(x.message); ev.target.disabled = false; } } } }, 'Respaldar en ZIP') : '',
      );
    }));
    contenido.replaceChildren(
      h('ul.pila', { role: 'list' }, ...items),
      h('div.acciones-fila', {},
        h('button.pildora.pildora-sec', { type: 'button', on: { click: crear } }, 'Nuevo proyecto'),
        h('button.pildora.pildora-sec', { type: 'button', on: { click: () => archivo.click() } }, 'Importar ZIP')),
      h('p.suave.pequeno', {}, `En este teléfono: ${fmtMB(esp.total)} en ${esp.archivos} ${esp.archivos === 1 ? 'archivo' : 'archivos'}.`),
    );
  };

  async function crear() {
    try { const p = await nuevoProyecto(); if (p) { avisar(`Proyecto «${p.nombre}» creado.`); location.hash = `#/proyectos/${encodeURIComponent(p.id)}`; } }
    catch (e) { avisar(e.message); }
  }

  archivo.addEventListener('change', async () => {
    const f = archivo.files[0]; archivo.value = ''; if (!f) return;
    progreso.hidden = false; const [txt, pista] = progreso.children; const relleno = pista.firstChild;
    try {
      const r = await importarProyecto(f, { alAvanzar: (b, t) => { const pct = t ? Math.round((b / t) * 100) : 100; relleno.style.width = pct + '%'; pista.setAttribute('aria-valuenow', String(pct)); txt.textContent = `Importando y verificando ${fmtMB(b)} de ${fmtMB(t)}`; } });
      avisar(`Proyecto importado: ${r.recursos} ${r.recursos === 1 ? 'archivo' : 'archivos'}, ${fmtMB(r.bytes)}${r.copia ? ' (ya existía: se creó una copia)' : ''}.`);
      await pintar();
    } catch (e) { avisar(`No se importó: ${e.message}`); }
    progreso.hidden = true;
  });

  main.append(
    h('h1.par', {}, 'Proyectos. ', h('span.suave', {}, 'Se guardan solo aquí: respáldalos.')),
    progreso, contenido, archivo,
    h('div.estado-fijo', {}, estado),
  );
  await pintar();
}

