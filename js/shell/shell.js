// Shell: cabecera, pestañas, router por hash y montaje de vistas y módulos.
import { h, $, $$ } from '../core/dom.js';
import { startRouter } from '../core/router.js';
import { temaActual, fijarTema, siguienteTema, NOMBRE_TEMA, alCambiarTema } from '../core/theme.js';
import { registrarSW, aplicarActualizacion } from '../core/sw-client.js';
import { diag } from '../core/hooks.js';
import { vistaInicio } from './vistas/inicio.js';
import { vistaProyectos } from './vistas/proyectos.js';
import { vistaAjustes } from './vistas/ajustes.js';
import { vistaModulo } from './vistas/modulo.js';
import { vistaProyecto } from './vistas/proyecto.js';

const RUTAS = [
  { pattern: '/', name: 'inicio' }, { pattern: '/proyectos', name: 'proyectos' },
  { pattern: '/ajustes', name: 'ajustes' }, { pattern: '/m/:id', name: 'modulo' },
  { pattern: '/proyectos/:id', name: 'proyecto' },
];

export function iniciarShell({ version, extras = {} } = {}) {
  const main = $('#contenido');
  const banda = $('#actualizacion');
  let actual = null, primera = true, turno = 0;
  const ctx = { version, mostrarActualizacion: () => { banda.hidden = false; }, ...extras };

  const bTema = $('.tema');
  const pintarTema = (t) => { $('.tema-texto').textContent = NOMBRE_TEMA[t]; bTema.setAttribute('aria-label', `Tema: ${NOMBRE_TEMA[t].toLowerCase()}. Cambiar tema`); };
  bTema.addEventListener('click', () => fijarTema(siguienteTema(temaActual())));
  alCambiarTema(pintarTema); fijarTema(temaActual());

  $('#aplicar-actualizacion').addEventListener('click', aplicarActualizacion);
  registrarSW({ alHaberActualizacion: ctx.mostrarActualizacion }).catch((e) => diag('sw:error', { message: e.message }));

  startRouter(window, RUTAS, async (r) => {
    const mio = ++turno;
    try { actual?.desmontar?.(); } catch (e) { diag('modulo:desmontar', { message: e.message }); }
    actual = null;
    // Cada ruta pinta en su propio contenedor: si el usuario navega mientras una vista carga,
    // la vista vieja escribe en un nodo ya desconectado y no mezcla contenido.
    const zona = h('div');
    main.replaceChildren(zona);
    const enModulo = r.name === 'modulo';
    $('.volver').hidden = !enModulo; $('.marca').hidden = enModulo;
    const pest = enModulo ? 'inicio' : r.name === 'proyecto' ? 'proyectos' : r.name;
    $$('.pestanas a').forEach((a) => (a.dataset.pest === pest ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    if (r.name === 'inicio') await vistaInicio(zona, ctx);
    else if (r.name === 'proyectos') await vistaProyectos(zona, ctx);
    else if (r.name === 'ajustes') await vistaAjustes(zona, ctx);
    else if (r.name === 'proyecto') await vistaProyecto(zona, ctx, r.params.id);
    else if (enModulo) {
      const m = await vistaModulo(zona, ctx, r.params.id);
      if (mio !== turno) { m?.desmontar?.(); return; } // el usuario ya navegó a otra parte
      actual = m;
    } else zona.append(h('h1.par', {}, 'No encontrado. ', h('span.suave', {}, 'Esa página no existe.')), h('a.enlace', { href: '#/' }, 'Volver al inicio'));
    if (mio !== turno) return;
    const h1 = zona.querySelector('h1');
    document.title = `${h1 ? h1.firstChild.textContent.replace(/\.\s*$/, '').trim() : 'Mi Uni'} — Mi Uni`;
    if (!primera) { scrollTo(0, 0); main.focus({ preventScroll: true }); }
    primera = false;
    diag('ruta', { name: r.name });
  });
}
