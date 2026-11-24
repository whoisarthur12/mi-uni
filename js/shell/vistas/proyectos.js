import { h } from '../../core/dom.js';

// El bloque 3 (S11) completará esta vista con proyectos reales. Hoy muestra el estado vacío.
export function vistaProyectos(main) {
  main.append(
    h('h1.par', {}, 'Proyectos. ', h('span.suave', {}, 'Se guardan solo aquí: respáldalos.')),
    h('div.vacio', {},
      paisaje(),
      h('p.vacio-titulo', {}, 'Todavía no hay proyectos.'),
      h('p.suave', {}, 'Un proyecto junta los archivos de un trabajo: borradores, PDFs y fuentes. Llegan en la próxima versión.'),
    ),
  );
}

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
