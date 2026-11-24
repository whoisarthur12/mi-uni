// Envoltorio mínimo de citeproc-js (CSL). Lógica pura: funciona en Node y en el navegador (sin red).
import CSL from '../../../js/vendor/citeproc-2.4.63/citeproc.mjs';

/**
 * styleXml: texto del .csl · locales: { 'es-ES': xml, 'en-US': xml, ... } · items: CSL-JSON (con id).
 * lang fuerza el idioma de la salida aunque el estilo declare otro.
 */
export function createEngine({ styleXml, locales, items, lang = 'es-ES', format = 'html' }) {
  const byId = new Map(items.map((it) => [String(it.id), it]));
  const sys = {
    retrieveLocale: (l) => locales[l] || locales[l.split('-')[0]] || locales['en-US'],
    retrieveItem: (id) => byId.get(String(id)),
  };
  const engine = new CSL.Engine(sys, styleXml, lang, true);
  engine.setOutputFormat(format);
  engine.updateItems([...byId.keys()]);
  return engine;
}

/** Bibliografía ordenada según el estilo: [{ id, html }]. */
export function bibliography(engine) {
  const [meta, entries] = engine.makeBibliography();
  return entries.map((html, i) => ({ id: meta.entry_ids[i][0], html: html.trim() }));
}

/** Cita en texto. narrative: "García Márquez (1967)"; parentética: "(García Márquez, 1967, p. 12)". */
export function cite(engine, id, { narrative = false, locator, label = 'page' } = {}) {
  const item = { id: String(id), ...(locator ? { locator, label } : {}) };
  if (!narrative) return engine.makeCitationCluster([item]);
  const author = engine.makeCitationCluster([{ ...item, 'author-only': true }]);
  const rest = engine.makeCitationCluster([{ ...item, 'suppress-author': true }]);
  return `${author} ${rest}`;
}
