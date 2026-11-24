// DOI / ISBN → CSL-JSON (borrador). El usuario SIEMPRE revisa y corrige antes de citar (CONTEXT §9.6).
import { normalizeDOI, normalizeISBN, guardedFetch } from './net-guard.js';

const KEEP = ['type', 'title', 'container-title', 'author', 'editor', 'translator', 'issued', 'volume', 'issue', 'page', 'DOI', 'URL', 'publisher', 'publisher-place', 'ISBN', 'ISSN', 'edition', 'genre'];
const pick = (o) => Object.fromEntries(KEEP.filter((k) => o[k] != null && o[k] !== '').map((k) => [k, o[k]]));

// El "CSL-JSON" de CrossRef usa los tipos de CrossRef, no los de CSL (medido: "journal-article").
// Sin traducirlos, citeproc formatea un artículo como "En Nature (Vol. 500, Número 7460…)".
export const CROSSREF_TYPES = {
  'journal-article': 'article-journal', 'book-chapter': 'chapter', 'book-section': 'chapter', 'book-part': 'chapter',
  'proceedings-article': 'paper-conference', 'posted-content': 'article', dissertation: 'thesis', 'reference-entry': 'entry-encyclopedia',
  monograph: 'book', 'edited-book': 'book', 'reference-book': 'book', 'book-set': 'book', 'book-series': 'book',
  'report-component': 'report', 'peer-review': 'review', standard: 'standard', dataset: 'dataset', report: 'report', book: 'book',
};
export const CSL_TYPES = new Set(['article', 'article-journal', 'article-magazine', 'article-newspaper', 'book', 'chapter', 'dataset', 'entry-encyclopedia', 'paper-conference', 'report', 'review', 'standard', 'thesis', 'webpage']);
export function cslType(t) { return CSL_TYPES.has(t) ? t : CROSSREF_TYPES[t] || 'article'; }

/** "Gabriel García Márquez" → family = última palabra. Los apellidos compuestos hispanos NO se pueden deducir: se marca para revisar. */
function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { literal: parts[0] };
  return { family: parts.at(-1), given: parts.slice(0, -1).join(' ') };
}

export async function fromDOI(input, opts) {
  const doi = normalizeDOI(input);
  if (!doi) throw Object.assign(new Error('Ese DOI no tiene un formato válido (debe empezar por 10.).'), { code: 'INVALID' });
  const j = await guardedFetch('crossref', doi, opts);
  if (!j) return null;
  const item = pick(j);
  if (Array.isArray(item['container-title'])) item['container-title'] = item['container-title'][0];
  if (Array.isArray(item.title)) item.title = item.title[0];
  item.type = cslType(item.type);
  return { item: { ...item, DOI: doi }, fuente: 'CrossRef', revisar: ['mayúsculas del título (APA: tipo oración)'] };
}

export async function fromISBN(input, opts) {
  const isbn = normalizeISBN(input);
  if (!isbn) throw Object.assign(new Error('Ese ISBN no es válido (revisa el dígito de control).'), { code: 'INVALID' });
  // Fuente principal: Open Library. Google Books solo como respaldo SIN clave (decisión del dueño): puede fallar por cuota.
  const ol = await guardedFetch('openlibrary', isbn, opts).catch((e) => ({ __error: e }));
  const b = ol && !ol.__error && ol[`ISBN:${isbn}`];
  if (b) {
    const year = /\d{4}/.exec(b.publish_date || '');
    return {
      item: { type: 'book', title: b.title + (b.subtitle ? `: ${b.subtitle}` : ''), author: (b.authors || []).map((a) => splitName(a.name)), publisher: b.publishers && b.publishers[0] && b.publishers[0].name, issued: year ? { 'date-parts': [[+year[0]]] } : undefined, ISBN: isbn },
      fuente: 'Open Library', revisar: ['apellidos (compuestos)', 'editorial', 'edición'],
    };
  }
  const g = await guardedFetch('googlebooks', isbn, opts).catch((e) => { if (ol && ol.__error) throw ol.__error; return null; });
  const v = g && g.items && g.items[0] && g.items[0].volumeInfo;
  if (!v) { if (ol && ol.__error) throw ol.__error; return null; }
  const year = /\d{4}/.exec(v.publishedDate || '');
  return {
    item: { type: 'book', title: v.title + (v.subtitle ? `: ${v.subtitle}` : ''), author: (v.authors || []).map(splitName), publisher: v.publisher, issued: year ? { 'date-parts': [[+year[0]]] } : undefined, ISBN: isbn },
    fuente: 'Google Books', revisar: ['apellidos (compuestos)', 'editorial', 'edición'],
  };
}
