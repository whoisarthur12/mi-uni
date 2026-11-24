// Página de medición S12: unir/dividir con pdf-lib, miniaturas y render con pdf.js, cifrados, formularios.
import { loadPdfLib, loadPdfjs, openPdf } from './engines.js';

const $ = (s) => document.querySelector(s);
const results = { ua: navigator.userAgent, deviceMemory: navigator.deviceMemory || null, runs: [] };
const log = (k, v) => { results.runs.push({ k, ...v }); $('#out').textContent = JSON.stringify(results, null, 1); return v; };
const ms = (t) => Math.round(performance.now() - t);
const MB = 1048576;

/** Mide el bloqueo máximo del hilo principal mientras corre fn (intervalo de 16 ms). */
async function withJank(fn) {
  let max = 0, last = performance.now();
  const iv = setInterval(() => { const n = performance.now(); max = Math.max(max, n - last - 16); last = n; }, 16);
  try { const r = await fn(); return { r, bloqueoMaxMs: Math.round(max) }; } finally { clearInterval(iv); }
}

const bytes = async (src) => (src instanceof Blob ? new Uint8Array(await src.arrayBuffer()) : new Uint8Array(await (await fetch(src)).arrayBuffer()));

async function libs(variant) {
  const t = performance.now(); const L = await loadPdfLib(variant); const a = ms(t);
  const t2 = performance.now(); await loadPdfjs(); const b = ms(t2);
  return log('carga', { variant, pdfLibMs: a, pdfjsMs: b });
}

async function merge(srcs, { variant = 'pdf-lib', objectStreams = true } = {}) {
  const { PDFDocument } = await loadPdfLib(variant);
  const t0 = performance.now();
  const { r, bloqueoMaxMs } = await withJank(async () => {
    const out = await PDFDocument.create(); let inBytes = 0;
    for (const s of srcs) {
      const b = await bytes(s); inBytes += b.length;
      const doc = await PDFDocument.load(b, { updateMetadata: false });
      const pages = await out.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    const saved = await out.save({ useObjectStreams: objectStreams });
    return { blob: new Blob([saved], { type: 'application/pdf' }), inBytes, pages: out.getPageCount() };
  });
  window.__lastBlob = r.blob;
  return log('unir', { variant, archivos: srcs.length, entradaMB: +(r.inBytes / MB).toFixed(1), salidaMB: +(r.blob.size / MB).toFixed(1), paginas: r.pages, ms: ms(t0), bloqueoMaxMs });
}

async function split(src, { variant = 'pdf-lib', every = 1 } = {}) {
  const { PDFDocument } = await loadPdfLib(variant);
  const t0 = performance.now(); const b = await bytes(src);
  const doc = await PDFDocument.load(b, { updateMetadata: false });
  const n = doc.getPageCount(); const parts = [];
  for (let i = 0; i < n; i += every) {
    const out = await PDFDocument.create();
    (await out.copyPages(doc, Array.from({ length: Math.min(every, n - i) }, (_, k) => i + k))).forEach((p) => out.addPage(p));
    parts.push((await out.save()).length);
  }
  return log('dividir', { variant, partes: parts.length, totalMB: +(parts.reduce((a, x) => a + x, 0) / MB).toFixed(1), ms: ms(t0) });
}

async function thumbs(src, { scale = 0.2, max = 100, asImg = false } = {}) {
  await loadPdfjs();
  const t0 = performance.now(); const data = await bytes(src);
  const box = $('#thumbs'); box.replaceChildren();
  const { r, bloqueoMaxMs } = await withJank(async () => {
    const task = openPdf(data); const doc = await task.promise; const n = Math.min(doc.numPages, max); const per = [];
    const tFirst = performance.now(); let first = null;
    for (let i = 1; i <= n; i++) {
      const t = performance.now(); const page = await doc.getPage(i); const vp = page.getViewport({ scale });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      c.setAttribute('aria-label', `Página ${i}`); box.append(c);
      await page.render({ canvas: c, viewport: vp }).promise; page.cleanup();
      if (asImg) {
        // Miniatura como <img> JPEG pequeño y canvas liberado: la memoria de canvas no se acumula.
        const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.7));
        const img = new Image(); img.alt = `Página ${i}`; img.src = URL.createObjectURL(blob); img.className = 'thumb';
        c.replaceWith(img); c.width = c.height = 0;
      }
      per.push(performance.now() - t); if (first === null) first = performance.now() - tFirst;
    }
    await task.destroy();
    per.sort((a, b) => a - b);
    return { n, primeraMs: Math.round(first), medianaMs: Math.round(per[per.length >> 1]), p95Ms: Math.round(per[Math.floor(per.length * 0.95)]) };
  });
  return log('miniaturas', { ...r, scale, asImg, totalMs: ms(t0), bloqueoMaxMs });
}

async function renderBig(src, { page = 1, scale = 2 } = {}) {
  await loadPdfjs();
  const t0 = performance.now(); const data = await bytes(src);
  const { r, bloqueoMaxMs } = await withJank(async () => {
    const task = openPdf(data); const doc = await task.promise; const p = await doc.getPage(page); const vp = p.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    await p.render({ canvas: c, viewport: vp }).promise;
    const px = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data;
    const out = { w: c.width, h: c.height, mp: +(c.width * c.height / 1e6).toFixed(1), pintado: px[3] === 255 };
    c.width = c.height = 0; await task.destroy(); return out;
  });
  return log('render', { page, scale, ...r, ms: ms(t0), bloqueoMaxMs });
}

async function encrypted(src, password) {
  const data = await bytes(src); const out = {};
  for (const variant of ['pdf-lib', 'cantoo']) {
    const { PDFDocument } = await loadPdfLib(variant);
    try { await PDFDocument.load(data); out[variant] = 'abre'; } catch (e) { out[variant] = `${e.name || 'Error'}: ${String(e.message).slice(0, 80)}`; }
    try { const d = await PDFDocument.load(data, { ignoreEncryption: true }); const s = await d.save(); out[variant + '+ignoreEncryption'] = `guarda ${s.length} B`; (window.__encOut ||= {})[variant + '-ignore'] = new Blob([s], { type: 'application/pdf' }); } catch (e) { out[variant + '+ignoreEncryption'] = `${e.name}: ${String(e.message).slice(0, 80)}`; }
    if (variant === 'cantoo' && password) {
      try { const d = await PDFDocument.load(data, { password }); out['cantoo+password'] = `abre ${d.getPageCount()} p`; (window.__encOut ||= {})['cantoo-password'] = new Blob([await d.save()], { type: 'application/pdf' }); } catch (e) { out['cantoo+password'] = `${e.name}: ${String(e.message).slice(0, 80)}`; }
    }
  }
  await loadPdfjs();
  try { const tk = openPdf(data.slice()); const d = await tk.promise; out.pdfjs = `abre ${d.numPages} p`; await tk.destroy(); } catch (e) { out.pdfjs = `${e.name}: ${String(e.message).slice(0, 80)}`; }
  if (password) { try { const tk = openPdf(data.slice(), { password }); const d = await tk.promise; out['pdfjs+password'] = `abre ${d.numPages} p`; await tk.destroy(); } catch (e) { out['pdfjs+password'] = `${e.name}: ${e.message}`; } }
  return log('cifrado', { src: String(src).split('/').pop(), ...out });
}

async function form(src) {
  const { PDFDocument } = await loadPdfLib('pdf-lib');
  const doc = await PDFDocument.load(await bytes(src)); const f = doc.getForm();
  const names = f.getFields().map((x) => x.getName());
  f.getTextField('nombre').setText('María Suárez Peña'); f.getCheckBox('acepto').check();
  const blob = new Blob([await doc.save()], { type: 'application/pdf' }); window.__lastBlob = blob;
  return log('formulario', { campos: names, salidaB: blob.size });
}

async function corrupt(src) {
  const data = await bytes(src); const out = {};
  const { PDFDocument } = await loadPdfLib('pdf-lib');
  try { const d = await PDFDocument.load(data); out['pdf-lib'] = `abre ${d.getPageCount()} p (¡sin error!)`; } catch (e) { out['pdf-lib'] = `${e.name}: ${String(e.message).slice(0, 80)}`; }
  await loadPdfjs();
  try { const tk = openPdf(data.slice()); const d = await tk.promise; out.pdfjs = `abre ${d.numPages} p`; await tk.destroy(); } catch (e) { out.pdfjs = `${e.name}: ${String(e.message).slice(0, 80)}`; }
  return log('corrupto', out);
}

// Interfaz manual (también para el iPhone): elegir archivos propios.
$('#merge').onclick = () => { const fs = [...$('#files').files]; if (fs.length) merge(fs); };
$('#thumbsBtn').onclick = () => { const f = $('#files').files[0]; if (f) thumbs(f); };
$('#renderBtn').onclick = () => { const f = $('#files').files[0]; if (f) renderBig(f); };
$('#fx').onclick = async () => {
  const fx = (n) => `./fixtures-gen/${n}`;
  try {
    await merge([fx('sint-30mb-a.pdf'), fx('sint-30mb-b.pdf'), fx('sint-30mb-c.pdf')]);
    await thumbs(fx('sint-100p.pdf')); await renderBig(fx('sint-30mb-a.pdf'));
  } catch (e) { log('error', { message: e.message }); }
};
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(results)); } catch { /* copiar a mano */ } };
window.__s12 = { libs, merge, split, thumbs, renderBig, encrypted, form, corrupt, results };
