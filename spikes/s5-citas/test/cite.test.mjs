// Salida esperada según la adaptación al español de APA 7 (a validar con el reglamento de la universidad).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine, bibliography, cite } from '../js/cite.js';
import { cslType } from '../js/lookup.js';
import { normalizeDOI, normalizeISBN, lookupURL, guardedFetch } from '../js/net-guard.js';

const r = (f) => readFileSync(new URL('../../../js/vendor/csl/' + f, import.meta.url), 'utf8');
const items = JSON.parse(readFileSync(new URL('./items.json', import.meta.url), 'utf8'));
const locales = { 'es-ES': r('locales-es-ES.xml'), 'en-US': r('locales-en-US.xml') };
const eng = createEngine({ styleXml: r('apa-es.csl'), locales, items, lang: 'es-ES', format: 'text' });
// citeproc usa espacios de no separación (U+00A0) en "s. f.", "et al.", "p. 12": correcto tipográficamente.
const nb = (x) => x.replace(/\u00a0/g, ' ');
const bib = Object.fromEntries(bibliography(eng).map((b) => [b.id, nb(b.html)]));

test('libro con 3 autores, edición, sin coma antes de "y"', () => assert.equal(bib.libro2, 'Hernández Sampieri, R., Fernández Collado, C. y Baptista Lucio, P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill.'));
test('artículo con DOI y raya en páginas', () => assert.equal(bib.art1, 'Kucsko, G. y Maurer, P. C. (2013). Nanometre-scale thermometry in a living cell. Nature, 500(7460), 54–58. https://doi.org/10.1038/nature12373'));
test('capítulo de libro editado', () => assert.equal(bib.cap1, 'Pérez, A. (2010). La educación en el Caribe. En F. Moya Pons (Ed.), Historia social del Caribe (pp. 45–78). Ediciones Unicaribe.'));
test('periódico con día: "15 de marzo"', () => assert.match(bib.art2, /\(2024, 15 de marzo\)/));
test('sin fecha: s. f.', () => assert.match(bib.web1, /\(s\. f\.\)/));
test('tesis', () => assert.match(bib.tesis1, /\[Tesis de maestría\]/));
test('traducción', () => assert.match(bib.trad1, /\(K\. Baggethun, Trad\.\)/));
test('orden alfabético', () => assert.deepEqual(Object.keys(bib).slice(0, 3), ['trad1', 'libro1', 'libro2']));
test('citas en texto', () => {
  assert.equal(nb(cite(eng, 'libro1')), '(García Márquez, 1967)');
  assert.equal(nb(cite(eng, 'art1')), '(Kucsko y Maurer, 2013)');
  assert.equal(nb(cite(eng, 'art3')), '(López et al., 2020)');
  assert.equal(nb(cite(eng, 'libro1', { narrative: true })), 'García Márquez (1967)');
  assert.equal(nb(cite(eng, 'libro1', { locator: '12' })), '(García Márquez, 1967, p. 12)');
});
test('HTML con cursivas', () => {
  const h = createEngine({ styleXml: r('apa-es.csl'), locales, items, lang: 'es-ES', format: 'html' });
  assert.match(bibliography(h).find((b) => b.id === 'art1').html, /<i>Nature<\/i>, <i>500<\/i>\(7460\)/);
});
test('DOI: normalización', () => {
  assert.equal(normalizeDOI('https://doi.org/10.1038/nature12373'), '10.1038/nature12373');
  assert.equal(normalizeDOI('doi: 10.1038/nature12373'), '10.1038/nature12373');
  assert.equal(normalizeDOI('mi trabajo final'), null);
  assert.equal(normalizeDOI('10.1/x'), null);
});
test('ISBN: dígito de control y conversión a 13', () => {
  assert.equal(normalizeISBN('0-14-032872-6'), '9780140328721');
  assert.equal(normalizeISBN('978-84-376-0494-7'), '9788437604947');
  assert.equal(normalizeISBN('978-84-376-0494-8'), null);
  assert.equal(normalizeISBN('0140328722'), null);
});
test('net-guard: solo 3 hosts y solo el identificador en la URL', () => {
  assert.equal(new URL(lookupURL('crossref', '10.1038/nature12373')).host, 'api.crossref.org');
  assert.equal(new URL(lookupURL('openlibrary', '9780140328721')).host, 'openlibrary.org');
  assert.equal(new URL(lookupURL('googlebooks', '9780140328721')).host, 'www.googleapis.com');
  assert.throws(() => lookupURL('otro', 'x'));
});
test('net-guard: rechaza consultas que no vienen del usuario y fija credenciales/Referer', async () => {
  await assert.rejects(guardedFetch('crossref', '10.1038/x', {}), { code: 'NOT_USER_INITIATED' });
  let seen;
  await guardedFetch('crossref', '10.1038/x', { userInitiated: true, fetchImpl: async (u, o) => { seen = o; return new Response('{}', { status: 200 }); } });
  assert.equal(seen.credentials, 'omit'); assert.equal(seen.referrerPolicy, 'no-referrer'); assert.equal(seen.method, 'GET');
});
test('tipos de CrossRef → CSL', () => {
  assert.equal(cslType('journal-article'), 'article-journal');
  assert.equal(cslType('book-chapter'), 'chapter');
  assert.equal(cslType('article-journal'), 'article-journal');
  assert.equal(cslType('desconocido'), 'article');
});
