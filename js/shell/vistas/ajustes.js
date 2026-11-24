import { h } from '../../core/dom.js';
import { TEMAS, NOMBRE_TEMA, temaActual, fijarTema } from '../../core/theme.js';
import { buscarActualizacion } from '../../core/sw-client.js';

export function vistaAjustes(main, ctx) {
  const segs = TEMAS.map((t) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(t === temaActual()), on: { click: () => { fijarTema(t); marcar(); } } }, NOMBRE_TEMA[t]));
  const marcar = () => segs.forEach((b, i) => b.setAttribute('aria-checked', String(TEMAS[i] === temaActual())));
  const estado = h('p.suave', { role: 'status' });
  const bAct = h('button.pildora.pildora-sec', { type: 'button', on: { click: async () => {
    estado.textContent = 'Buscando…';
    const r = await buscarActualizacion();
    estado.textContent = r.error ? `No se pudo comprobar: ${r.error}` : r.hay ? 'Hay una versión nueva. Pulsa «Actualizar» arriba.' : 'Tienes la última versión.';
    if (r.hay) ctx.mostrarActualizacion();
  } } }, 'Buscar actualización');
  main.append(
    h('h1.par', {}, 'Ajustes. ', h('span.suave', {}, 'Se aplican en todas las herramientas.')),
    h('h2.titulo-seccion', {}, 'Tema'),
    h('div.segmentos', { role: 'radiogroup', 'aria-label': 'Tema' }, ...segs),
    ctx.ajustesExtra ? ctx.ajustesExtra() : '',
    h('h2.titulo-seccion', {}, 'App'),
    h('div.grupo', {},
      h('p.dato', {}, h('span', {}, 'Versión'), h('span.suave', {}, `Shell ${ctx.version}`)),
      h('div.campo', {}, bAct, estado),
    ),
    h('p', {}, h('a.enlace', { href: './pruebas/' }, 'Páginas de prueba de la Fase 0')),
  );
}
