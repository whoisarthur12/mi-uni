// Panel de un proyecto: archivos, respaldo ZIP, renombrar y borrar (CONTEXT §9.0.b).
import { h, fmtMB, descargarBlob } from '../../core/dom.js';
import { confirmar, pedirTexto } from '../../core/dialogo.js';
import { cargarAjustes } from '../../core/ajustes.js';
import { fmtFecha } from '../../core/ajustes-modelo.js';
import { obtenerProyecto, listarRecursos, leerRecurso, borrarRecurso, borrarProyecto, renombrarProyecto } from '../../core/proyectos.js';
import { estadoRespaldo, fraseRespaldo } from '../../core/respaldo.js';
import { marcaEstado, respaldar } from './proyectos.js';

export async function vistaProyecto(main, ctx, id) {
  const a = await cargarAjustes();
  const estado = h('p.suave', { role: 'status' });
  const avisar = (t) => { estado.textContent = t; };
  const cuerpo = h('div');
  main.append(cuerpo, h('div.estado-fijo', {}, estado));

  const pintar = async () => {
    const p = await obtenerProyecto(id).catch(() => null);
    if (!p || p.importando) {
      cuerpo.replaceChildren(h('h1.par', {}, 'No encontrado. ', h('span.suave', {}, 'Ese proyecto no existe o se borró.')), h('a.enlace', { href: '#/proyectos' }, 'Ver proyectos'));
      return;
    }
    const rs = await listarRecursos(id);
    const e = estadoRespaldo(p, new Date(), a.datos.avisoRespaldoDias);
    const filas = rs.map((r) => h('li.recurso', {},
      h('span.recurso-texto', {}, h('span.recurso-nombre', {}, r.nombre), h('span.suave.pequeno', {}, `${fmtMB(r.size)} · ${fmtFecha(r.creado, a.region.zonaHoraria)}${r.origen ? ` · ${r.origen}` : ''}`)),
      h('button.pildora.pildora-sec', { type: 'button', 'aria-label': `Descargar ${r.nombre}`, on: { click: async () => { const b = await leerRecurso(r.id); descargarBlob(b, r.nombre); } } }, 'Descargar'),
      h('button.pildora.pildora-sec', { type: 'button', 'aria-label': `Quitar ${r.nombre}`, on: { click: async () => {
        if (!(await confirmar('¿Quitar este archivo del proyecto?', `«${r.nombre}» se borrará de este teléfono. Si tienes una copia ZIP, ahí sigue.`, { aceptar: 'Quitar', peligro: true }))) return;
        await borrarRecurso(r.id); avisar('Archivo quitado.'); await pintar();
      } } }, 'Quitar'),
    ));
    cuerpo.replaceChildren(
      h('h1.par', {}, `${p.nombre}. `, h('span.suave', {}, `${rs.length} ${rs.length === 1 ? 'archivo' : 'archivos'}, ${fmtMB(rs.reduce((s, r) => s + r.size, 0))}.`)),
      h('div.banda', {},
        h('p', {}, fraseRespaldo(p, a.region.zonaHoraria), ' ', marcaEstado(e)),
        h('button.pildora.pildora-prim', { type: 'button', on: { click: async (ev) => { ev.target.disabled = true; try { avisar(await respaldar(id)); await pintar(); } catch (x) { avisar(x.message); ev.target.disabled = false; } } } }, 'Respaldar en ZIP'),
      ),
      h('h2.titulo-seccion', {}, 'Archivos'),
      rs.length ? h('ul.lista', { role: 'list' }, ...filas)
        : h('p.suave', {}, 'Sin archivos todavía. Al terminar en una herramienta (por ejemplo, Comprimir PDF), elige «Guardar en un proyecto».'),
      h('h2.titulo-seccion', {}, 'Proyecto'),
      h('div.acciones-fila', {},
        h('button.pildora.pildora-sec', { type: 'button', on: { click: async () => {
          const n = await pedirTexto('Cambiar nombre', { etiqueta: 'Nombre', valor: p.nombre }, { aceptar: 'Guardar' });
          if (n == null) return;
          try { await renombrarProyecto(id, n); avisar('Nombre cambiado.'); await pintar(); } catch (x) { avisar(x.message); }
        } } }, 'Cambiar nombre'),
        h('button.pildora.pildora-sec', { type: 'button', on: { click: async () => {
          const ok = await confirmar('¿Borrar el proyecto?', `Se borrarán «${p.nombre}» y sus ${rs.length} archivos de este teléfono. No se puede deshacer${p.ultimoRespaldo ? '; tu copia ZIP sigue intacta' : ' y no tiene ninguna copia'}.`, { aceptar: 'Borrar', peligro: true });
          if (!ok) return;
          await borrarProyecto(id); location.hash = '#/proyectos';
        } } }, 'Borrar proyecto'),
      ),
      h('p', {}, h('a.enlace', { href: '#/proyectos' }, 'Todos los proyectos')),
    );
  };
  await pintar();
}
