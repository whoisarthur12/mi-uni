import { h } from '../../core/dom.js';
import { icono } from '../../core/icons.js';
import { buscar } from '../../core/hooks.js';
import { HERRAMIENTAS } from '../registry.js';

function tarjeta(t) {
  const cuerpo = [icono(t.icono), h('span.tarjeta-titulo', {}, t.nombre), h('span.tarjeta-desc', {}, t.desc)];
  if (t.estado === 'disponible') {
    return h('li', {}, h('a.tarjeta.tarjeta-activa', { href: `#/m/${t.id}` }, ...cuerpo, h('span.enlace', {}, 'Abrir ', icono('flecha', { tam: 16 }))));
  }
  return h('li', {}, h('div.tarjeta.tarjeta-pronto', {}, ...cuerpo, h('span.pronto', {}, 'Próximamente')));
}

export function vistaInicio(main, ctx) {
  const lista = h('ul.rejilla', { role: 'list' });
  const pintar = (q = '') => {
    const r = buscar(q, HERRAMIENTAS);
    lista.replaceChildren(...(r.length ? r.map(tarjeta) : [h('li.suave', {}, 'No hay herramientas con ese nombre.')]));
  };
  const entrada = h('input', { type: 'search', placeholder: 'Buscar', autocomplete: 'off', enterkeyhint: 'search', on: { input: (e) => pintar(e.target.value) } });
  main.append(
    h('h1.par', {}, 'Hola. ', h('span.suave', {}, 'Tus herramientas de la universidad, en este teléfono.')),
    ctx.avisoRespaldo ? ctx.avisoRespaldo() : '',
    h('label.buscar', {}, h('span.sr', {}, 'Buscar herramienta'), icono('buscar', { tam: 20 }), entrada),
    h('h2.titulo-seccion', {}, 'Herramientas'),
    lista,
  );
  pintar();
}
