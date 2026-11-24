// Ayudas mínimas de DOM sin innerHTML con datos: el texto siempre entra como textContent.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** h('a.tarjeta', {href:'#/x', on:{click}}, 'texto', nodo) — clases con punto, atributos, eventos. */
export function h(tag, attrs = {}, ...hijos) {
  const [nombre, ...clases] = tag.split('.');
  const el = document.createElement(nombre || 'div');
  if (clases.length) el.className = clases.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'hidden') el.hidden = !!v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Formatos en español: 28,4 MB · 1.234 */
export const fmtMB = (bytes, dec = bytes < 1e6 ? 2 : 1) => (bytes > 0 && bytes < 100_000
  ? `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('es')} KB`
  : `${(bytes / 1e6).toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec })} MB`);
export const fmtNum = (n) => n.toLocaleString('es');

/** Descarga un Blob con un nombre (en iPhone abre la hoja de «Guardar en Archivos»). */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  // Chromium descarta el nombre entero si lleva rayas tipográficas (— –): medido el 24-nov-2026.
  const a = h('a', { href: url, download: String(nombre).replace(/[\u2013\u2014]/g, '-'), hidden: true });
  document.body.append(a); a.click();
  // Chromium lee el atributo download después del clic: si el enlace se quita al instante, el nombre se pierde.
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60000);
}
