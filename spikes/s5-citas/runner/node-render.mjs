// Renderiza los ítems de prueba con varios estilos/locales en Node. Uso: node runner/node-render.mjs [estilo] [locale]
import { readFileSync } from 'node:fs';
import { createEngine, bibliography, cite } from '../js/cite.js';
const dir = new URL('../vendor/csl/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const locales = Object.fromEntries(['es-ES', 'es-MX', 'es-CL', 'en-US'].map((l) => [l, read(`locales-${l}.xml`)]));
const items = JSON.parse(readFileSync(new URL('../test/items.json', import.meta.url), 'utf8'));
const style = process.argv[2] || 'apa', lang = process.argv[3] || 'es-ES';
const t0 = performance.now();
const eng = createEngine({ styleXml: read(`${style}.csl`), locales, items, lang, format: process.argv[4] || 'text' });
const t1 = performance.now();
const bib = bibliography(eng);
const t2 = performance.now();
console.log(`# ${style} ${lang} — motor ${Math.round(t1 - t0)} ms, bibliografía ${Math.round(t2 - t1)} ms`);
for (const b of bib) console.log(b.html.replace(/\s+/g, ' '));
console.log('-- citas:', ['libro1', 'libro2', 'art3', 'web1'].map((id) => cite(eng, id)).join(' · '), '·', cite(eng, 'libro1', { narrative: true }), '·', cite(eng, 'libro1', { locator: '12' }));
