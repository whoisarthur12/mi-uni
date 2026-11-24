import { h } from '../../core/dom.js';
import { icono } from '../../core/icons.js';
import { buscar } from '../../core/hooks.js';
import { cargarAjustes } from '../../core/ajustes.js';
import { listarProyectos } from '../../core/proyectos.js';
import { estadoRespaldo, masUrgente } from '../../core/respaldo.js';
import { marcaEstado } from './proyectos.js';
import { HERRAMIENTAS } from '../registry.js';

function tarjeta(t) {
  const cuerpo = [icono(t.icono), h('span.tarjeta-titulo', {}, t.nombre), h('span.tarjeta-desc', {}, t.desc)];
  if (t.estado === 'disponible') {
    return h('li', {}, h('a.tarjeta.tarjeta-activa', { href: `#/m/${t.id}` }, ...cuerpo, h('span.enlace', {}, 'Abrir ', icono('flecha', { tam: 16 }))));
  }
  return h('li', {}, h('div.tarjeta.tarjeta-pronto', {}, ...cuerpo, h('span.pronto', {}, 'Próximamente')));
}

/** Aviso de respaldo (ADR-006): el proyecto más urgente, con enlace para respaldarlo. */
function aviso(urgente) {
  const { p, e } = urgente;
  const texto = e.nivel === 'nunca'
    ? `«${p.nombre}» nunca se ha respaldado. Si el navegador borra sus datos, se perdería.`
    : `«${p.nombre}» lleva ${e.diasSinRespaldo} días sin copia. Si el navegador borra sus datos, se perderían los cambios.`;
  return h('div.aviso', { role: 'status' }, icono('aviso'),
    h('div.aviso-cuerpo', {}, h('p.aviso-titulo', {}, 'Cambios sin respaldar'), h('p.suave', {}, texto),
      h('a.pildora.pildora-sec', { href: `#/proyectos/${encodeURIComponent(p.id)}` }, 'Respaldar ahora')));
}

export async function vistaInicio(main) {
  const lista = h('ul.rejilla', { role: 'list' });
  const pintar = (q = '') => {
    const r = buscar(q, HERRAMIENTAS);
    lista.replaceChildren(...(r.length ? r.map(tarjeta) : [h('li.suave', {}, 'No hay herramientas con ese nombre.')]));
  };
  const entrada = h('input', { type: 'search', placeholder: 'Buscar', autocomplete: 'off', enterkeyhint: 'search', on: { input: (e) => pintar(e.target.value) } });
  let ps = [], a = null;
  try { [a, ps] = await Promise.all([cargarAjustes(), listarProyectos()]); } catch { /* sin almacenamiento: inicio igual */ }
  const urgente = a && masUrgente(ps, new Date(), a.datos.avisoRespaldoDias);
  main.append(
    h('h1.par', {}, 'Hola. ', h('span.suave', {}, 'Tus herramientas de la universidad, en este teléfono.')),
    urgente ? aviso(urgente) : '',
    h('label.buscar', {}, h('span.sr', {}, 'Buscar herramienta'), icono('buscar', { tam: 20 }), entrada),
    h('h2.titulo-seccion', {}, 'Herramientas'),
    lista,
    ...(ps.length ? [h('h2.titulo-seccion', {}, 'Proyectos recientes'),
      h('ul.lista', { role: 'list' }, ...ps.slice(0, 3).map((p) => h('li.fila-proy', {}, h('a', { href: `#/proyectos/${encodeURIComponent(p.id)}` },
        h('span.fila-nombre', {}, p.nombre), marcaEstado(estadoRespaldo(p, new Date(), a.datos.avisoRespaldoDias))))))] : []),
  );
  pintar();
}
