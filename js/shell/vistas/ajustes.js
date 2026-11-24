import { h } from '../../core/dom.js';
import { TEMAS, NOMBRE_TEMA, temaActual, fijarTema } from '../../core/theme.js';
import { buscarActualizacion } from '../../core/sw-client.js';
import { ajustes, cargarAjustes, guardarAjustes, reemplazarAjustes, sePuedeGuardar } from '../../core/ajustes.js';
import { ESTILOS_CITA, PAPELES, FUENTES, ZONAS, fmtFecha, exportarJSON, importarJSON } from '../../core/ajustes-modelo.js';

const decimal = (n) => String(n).replace('.', ',');

function campoTexto(etiqueta, seccion, clave, attrs = {}) {
  return h('label.campo', {}, h('span', {}, etiqueta),
    h('input', { type: 'text', value: ajustes()[seccion][clave], dataset: { seccion, clave }, maxlength: '120', ...attrs }));
}
function campoLista(etiqueta, seccion, clave, opciones) {
  const valor = String(ajustes()[seccion][clave]);
  return h('label.campo', {}, h('span', {}, etiqueta),
    h('select', { dataset: { seccion, clave } }, ...opciones.map(([v, t]) => h('option', { value: v, selected: v === valor }, t))));
}

export async function vistaAjustes(main, ctx) {
  await cargarAjustes();
  const a = ajustes();
  const estado = h('p.suave.pequeno', { role: 'status' });
  const avisar = (t) => { estado.textContent = t; };

  // Tema (preferencia de este dispositivo)
  const segs = TEMAS.map((t) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(t === temaActual()), on: { click: () => { fijarTema(t); marcar(); } } }, NOMBRE_TEMA[t]));
  const marcar = () => segs.forEach((b, i) => b.setAttribute('aria-checked', String(TEMAS[i] === temaActual())));

  const zonas = ZONAS.includes(a.region.zonaHoraria) ? ZONAS : [a.region.zonaHoraria, ...ZONAS];
  const formulario = h('form', { on: { submit: (e) => e.preventDefault() } },
    h('h2.titulo-seccion', {}, 'Perfil'),
    h('p.suave', {}, 'Se usa para rellenar portadas y documentos. Se guarda solo en este teléfono.'),
    h('div.grupo', {},
      campoTexto('Nombre completo', 'perfil', 'nombre', { autocomplete: 'name' }),
      campoTexto('Universidad', 'perfil', 'universidad', { autocomplete: 'organization' }),
      campoTexto('Facultad o escuela', 'perfil', 'facultad'),
      campoTexto('Carrera', 'perfil', 'carrera'),
      campoTexto('Matrícula (opcional)', 'perfil', 'matricula', { autocomplete: 'off', inputmode: 'text' }),
      campoTexto('Ciudad', 'perfil', 'ciudad', { autocomplete: 'address-level2' }),
    ),
    h('h2.titulo-seccion', {}, 'Formato de trabajos'),
    h('p.suave', {}, 'Valores por defecto. Las reglas propias de tu universidad se añadirán cuando tengamos su reglamento.'),
    h('div.grupo', {},
      campoLista('Estilo de cita', 'formato', 'estiloCita', ESTILOS_CITA.map((x) => [x.id, x.nombre])),
      campoLista('Papel', 'formato', 'papel', PAPELES.map((x) => [x.id, x.nombre])),
      h('label.campo', {}, h('span', {}, 'Márgenes (cm)'), h('input', { type: 'text', inputmode: 'decimal', value: decimal(a.formato.margenCm), dataset: { seccion: 'formato', clave: 'margenCm' } })),
      campoLista('Letra', 'formato', 'fuente', FUENTES.map((f) => [f, f])),
      campoLista('Tamaño de letra', 'formato', 'tamanoPt', [10, 11, 12, 13, 14].map((n) => [String(n), `${n} pt`])),
    ),
    h('h2.titulo-seccion', {}, 'Región'),
    h('div.grupo', {},
      campoLista('Zona horaria', 'region', 'zonaHoraria', zonas.map((z) => [z, z.replace(/_/g, ' ').replace('America/', 'América / ').replace('Europe/', 'Europa / ')])),
      h('p.dato', {}, h('span', {}, 'Hoy es'), h('span.suave', { id: 'hoy' }, fmtFecha(new Date(), a.region.zonaHoraria))),
    ),
    h('h2.titulo-seccion', {}, 'Respaldos'),
    h('div.grupo', {},
      campoLista('Avisar si un proyecto no tiene copia en', 'datos', 'avisoRespaldoDias', [3, 7, 14, 30].map((n) => [String(n), `${n} días`])),
    ),
  );

  formulario.addEventListener('change', async (e) => {
    const el = e.target; const { seccion, clave } = el.dataset;
    if (!seccion) return;
    let v = el.value;
    if (clave === 'tamanoPt' || clave === 'avisoRespaldoDias') v = Number(v);
    try {
      const n = await guardarAjustes({ [seccion]: { [clave]: v } });
      if (el.tagName === 'INPUT') el.value = clave === 'margenCm' ? decimal(n[seccion][clave]) : n[seccion][clave];
      if (clave === 'zonaHoraria') main.querySelector('#hoy').textContent = fmtFecha(new Date(), n.region.zonaHoraria);
      avisar(sePuedeGuardar() ? 'Guardado.' : 'Cambiado solo en esta sesión: este navegador no deja guardar datos.');
    } catch (err) { avisar(`No se pudo guardar: ${err.message}`); }
  });

  // Exportar / importar perfil y ajustes (JSON)
  const archivo = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const exportar = () => {
    const url = URL.createObjectURL(new Blob([exportarJSON(ajustes())], { type: 'application/json' }));
    const enlace = h('a', { href: url, download: 'mi-uni-ajustes.json' }); document.body.append(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    avisar('Copia descargada: mi-uni-ajustes.json');
  };
  archivo.addEventListener('change', async () => {
    const f = archivo.files[0]; if (!f) return;
    try {
      const n = await reemplazarAjustes(importarJSON(await f.text()));
      for (const el of formulario.querySelectorAll('[data-seccion]')) {
        const v = n[el.dataset.seccion][el.dataset.clave];
        el.value = el.dataset.clave === 'margenCm' ? decimal(v) : String(v);
      }
      main.querySelector('#hoy').textContent = fmtFecha(new Date(), n.region.zonaHoraria);
      avisar('Ajustes importados.');
    }
    catch (err) { avisar(err.message); }
    archivo.value = '';
  });

  const bAct = h('button.pildora.pildora-sec', { type: 'button', on: { click: async () => {
    avisar('Buscando…');
    const r = await buscarActualizacion();
    avisar(r.error ? `No se pudo comprobar: ${r.error}` : r.hay ? 'Hay una versión nueva. Pulsa «Actualizar» arriba.' : 'Tienes la última versión.');
    if (r.hay) ctx.mostrarActualizacion();
  } } }, 'Buscar actualización');

  main.append(
    h('h1.par', {}, 'Ajustes. ', h('span.suave', {}, 'Se aplican en todas las herramientas.')),
    sePuedeGuardar() ? '' : h('p.estado-error', {}, 'Este navegador no deja guardar datos (¿ventana privada?). Los cambios se perderán al cerrar.'),
    h('h2.titulo-seccion', {}, 'Tema'),
    h('div.segmentos', { role: 'radiogroup', 'aria-label': 'Tema' }, ...segs),
    formulario,
    h('div.acciones-fila', {},
      h('button.pildora.pildora-sec', { type: 'button', on: { click: exportar } }, 'Exportar ajustes'),
      h('button.pildora.pildora-sec', { type: 'button', on: { click: () => archivo.click() } }, 'Importar ajustes'),
      archivo,
    ),
    h('h2.titulo-seccion', {}, 'App'),
    h('div.grupo', {},
      h('p.dato', {}, h('span', {}, 'Versión'), h('span.suave', {}, `Shell ${ctx.version}`)),
      h('div.campo', {}, bAct),
    ),
    h('p', {}, h('a.enlace', { href: './pruebas/' }, 'Páginas de prueba de la Fase 0')),
    h('div.estado-fijo', {}, estado),
  );
}
