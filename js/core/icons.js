// Iconos monocromos (trazo 1,6 en color tinta), como SVG creados por DOM (CSP sin estilos en línea).
const D = {
  pdf: 'M6 2.5h8.5L19 7v14.5H6z M14 2.5V7h5',
  comprimir: 'M6 2.5h8.5L19 7v14.5H6z M14 2.5V7h5 M9.5 12.5l3 3 3-3 M12.5 9v6.5',
  unir: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  citas: 'M5 4.5h10.5A3.5 3.5 0 0119 8v12H8.5A3.5 3.5 0 015 16.5z M9 9h6 M9 13h6',
  portada: 'M6 2.5h12v19H6z M9 7.5h6 M9 11.5h6 M9 15.5h3',
  inicio: 'M3.5 10.5L12 3.5l8.5 7V20.5h-5.5v-6h-6v6H3.5z',
  proyectos: 'M3 6h6.5l2 2H21v12H3z',
  ajustes: 'M4 7h10 M18 7h2 M4 17h4 M12 17h8',
  flecha: 'M5 12h13 M13 6l6 6-6 6',
  atras: 'M15 5l-7 7 7 7',
  aviso: 'M12 3l9.5 17h-19z M12 10v4.5 M12 17.5v.01',
  buscar: 'M20 20l-4.2-4.2',
  sol: 'M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  descargar: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  ok: 'M5 12.5l4.5 4.5L19 7.5',
};
const CIRCULOS = { ajustes: [[16, 7, 2], [10, 17, 2]], buscar: [[11, 11, 6.5]], sol: [[12, 12, 4]] };

export function icono(nombre, { tam = 24, clase = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ic${tam === 16 ? ' ic-16' : tam === 20 ? ' ic-20' : ''}${clase ? ' ' + clase : ''}`);
  for (const d of (D[nombre] || '').split(' M').map((p, i) => (i ? 'M' + p : p)).filter(Boolean)) {
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.append(p);
  }
  for (const [cx, cy, r] of CIRCULOS[nombre] || []) {
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); svg.append(c);
  }
  return svg;
}
