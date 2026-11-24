// Página de medición S5 (también para el celular: "Copiar resultados").
import { fromDOI, fromISBN } from './lookup.js';
import { sanitizeInto } from './sanitize.js';
import { renderForm } from './ref-form.js';

const $ = (s) => document.querySelector(s);
const results = { ua: navigator.userAgent, runs: [] };
const log = (k, v) => { results.runs.push({ k, ...v }); $('#out').textContent = JSON.stringify(results, null, 1); return v; };
const ms = (t) => Math.round(performance.now() - t);
const text = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); });
let cite, style, locales, baseItems;

async function load() {
  let t = performance.now();
  cite = await import('./cite.js');
  const importMs = ms(t);
  t = performance.now();
  [style, locales, baseItems] = await Promise.all([
    text('../../js/vendor/csl/apa-es.csl'),
    Promise.all(['es-ES', 'en-US'].map(async (l) => [l, await text(`../../js/vendor/csl/locales-${l}.xml`)])).then(Object.fromEntries),
    fetch('./test/items.json').then((r) => r.json()),
  ]);
  return log('carga', { importCiteprocMs: importMs, estiloYLocalesMs: ms(t) });
}

async function bench(n = 100) {
  if (!cite) await load();
  const items = Array.from({ length: n }, (_, i) => ({ ...baseItems[i % baseItems.length], id: `x${i}`, title: `${baseItems[i % baseItems.length].title} ${i}` }));
  let t = performance.now(); const eng = cite.createEngine({ styleXml: style, locales, items, lang: 'es-ES' }); const engineMs = ms(t);
  t = performance.now(); const bib = cite.bibliography(eng); const bibMs = ms(t);
  t = performance.now(); for (let i = 0; i < 50; i++) cite.cite(eng, `x${i % n}`); const cite50Ms = ms(t);
  sanitizeInto($('#bib'), bib.slice(0, 10).map((b) => b.html).join(''));
  return log('bench', { n, engineMs, bibMs, cite50Ms, primera: bib[0].html.replace(/<[^>]+>/g, '') });
}

async function lookup(kind, input) {
  if (!cite) await load();
  const netlog = [];
  const t = performance.now();
  try {
    const r = kind === 'doi' ? await fromDOI(input, { userInitiated: true, log: (x) => netlog.push(x) }) : await fromISBN(input, { userInitiated: true, log: (x) => netlog.push(x) });
    if (!r) return log('consulta', { kind, input, encontrado: false, netlog, ms: ms(t) });
    showForm(r);
    return log('consulta', { kind, input, fuente: r.fuente, revisar: r.revisar, borrador: r.item, netlog, ms: ms(t) });
  } catch (e) { return log('consulta', { kind, input, error: e.message, code: e.code, netlog, ms: ms(t) }); }
}

const saved = [];
/** Formulario editable (tras búsqueda o manual). Al guardar, formatea con el estilo y añade a la lista. */
function showForm(r = {}) {
  renderForm($('#form'), { ...r, onSave: (item) => {
    saved.push({ ...item, id: 'r' + saved.length });
    const eng = cite.createEngine({ styleXml: style, locales, items: saved, lang: 'es-ES' });
    sanitizeInto($('#bib'), cite.bibliography(eng).map((b) => b.html).join(''));
    $('#form').replaceChildren();
    log('guardada', { referencia: [...$('#bib').children].map((d) => d.textContent), cita: cite.cite(eng, 'r' + (saved.length - 1)) });
  } });
}

/** La CSP debe bloquear cualquier host fuera de la lista (sin red: el navegador corta antes). */
async function cspProbe() {
  const v = []; const on = (e) => v.push(e.blockedURI); document.addEventListener('securitypolicyviolation', on);
  let r; try { await fetch('https://example.com/?fuga=1', { credentials: 'omit' }); r = 'SALIÓ'; } catch (e) { r = 'bloqueado: ' + e.name; }
  await new Promise((ok) => setTimeout(ok, 200)); document.removeEventListener('securitypolicyviolation', on);
  return log('csp', { r, violaciones: v });
}

function sanitizeProbe() {
  const box = document.createElement('div');
  sanitizeInto(box, '<div class="csl-entry">Título <i>in vivo</i> <img src=x onerror="window.__xss=1"><script>window.__xss=2</script><a href="javascript:alert(1)">enlace</a> H<sub>2</sub>O</div>');
  return log('sanitizar', { html: box.innerHTML, peligroso: !!box.querySelector('img,script,a,[onerror]') });
}

/** Mismo trabajo en un worker de módulo (sin DOMParser): ¿funciona citeproc y cuánto bloquea la página? */
async function benchWorker(n = 100) {
  if (!cite) await load();
  const items = Array.from({ length: n }, (_, i) => ({ ...baseItems[i % baseItems.length], id: `x${i}` }));
  const w = new Worker(new URL('./cite-worker.js', import.meta.url), { type: 'module' });
  const call = (type, payload) => new Promise((ok, ko) => { w.onmessage = (e) => (e.data.type.endsWith(':ok') ? ok(e.data) : ko(new Error(e.data.error))); w.postMessage({ type, id: 1, payload }); });
  let maxGap = 0, last = performance.now(); const iv = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; }, 16);
  try {
    const a = await call('init', { styleXml: style, locales, items, lang: 'es-ES' });
    const b = await call('bib');
    return log('worker', { n, initMs: a.ms, bibMs: b.ms, entradas: b.payload.length, hasDOMParser: a.hasDOMParser, maxBloqueoPaginaMs: Math.round(maxGap) });
  } catch (e) { return log('worker', { error: e.message }); } finally { clearInterval(iv); w.terminate(); }
}

$('#bench').onclick = () => bench();
$('#doi').onclick = () => lookup('doi', $('#id').value);
$('#isbn').onclick = () => lookup('isbn', $('#id').value);
$('#manual').onclick = async () => { if (!cite) await load(); showForm(); };
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(results)); } catch { /* copiar a mano */ } };
window.__s5 = { load, bench, benchWorker, showForm, lookup, cspProbe, sanitizeProbe, results };
