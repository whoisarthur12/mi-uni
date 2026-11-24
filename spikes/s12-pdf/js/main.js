// Página de medición S12 (tras ADR-010): unir/dividir con @cantoo/pdf-lib con apertura con permiso, guarda de salida
// y tope de memoria; miniaturas (todas o perezosas) y render con pdf.js.
import { loadPdfLib, loadPdfjs, openPdf } from './engines.js';
import { openForEdit } from './pdf-open.js';
import { checkOutput, checkInput, pagesInk, AVISO_GUARDA } from './output-guard.js';
import { classifyPdfJob } from './pdf-memory.js';

const $ = (s) => document.querySelector(s);
const results = { ua: navigator.userAgent, deviceMemory: navigator.deviceMemory || null, runs: [] };
const log = (k, v) => { results.runs.push({ k, ...v }); $('#out').textContent = JSON.stringify(results, null, 1); return v; };
const ms = (t) => Math.round(performance.now() - t);
const MB = 1048576;
const isMobile = /Mobi|iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const device = () => ({ deviceMemoryGB: navigator.deviceMemory, isMobile, learnedFailMB: Number(localStorage.getItem('s12:learnedFailMB')) || 0 });

/** Mide el bloqueo máximo del hilo principal mientras corre fn (intervalo de 16 ms). */
async function withJank(fn) {
  let max = 0, last = performance.now();
  const iv = setInterval(() => { const n = performance.now(); max = Math.max(max, n - last - 16); last = n; }, 16);
  try { const r = await fn(); return { r, bloqueoMaxMs: Math.round(max) }; } finally { clearInterval(iv); }
}

const bytes = async (src) => (src instanceof Blob ? new Uint8Array(await src.arrayBuffer()) : new Uint8Array(await (await fetch(src)).arrayBuffer()));
const nameOf = (src) => (src instanceof File ? src.name : String(src).split('/').pop());

// Preguntas al usuario. El runner puede fijar window.__auto = {permiso, claves: []} para automatizarlas.
function ask(kind, info) {
  const auto = window.__auto;
  if (auto) return Promise.resolve(kind === 'permiso' ? auto.permiso : (auto.claves || []).shift() ?? null);
  return new Promise((done) => {
    const d = $('#ask'); $('#askText').textContent = kind === 'permiso' ? `${info.name}: ${info.pregunta} ${info.aviso}` : `${info.name}: ${info.mensaje}`;
    $('#askPw').hidden = kind !== 'clave'; $('#askPw').value = '';
    $('#askYes').textContent = kind === 'permiso' ? 'Sí, es mío o tengo permiso' : 'Abrir';
    d.onclose = () => done(d.returnValue === 'si' ? (kind === 'permiso' ? true : $('#askPw').value) : (kind === 'permiso' ? false : null));
    d.showModal();
  });
}
const uiFor = (src) => ({ name: nameOf(src), askPermission: (i) => ask('permiso', i), askPassword: (i) => ask('clave', i) });

async function merge(srcs, { guard = true, objectStreams = true } = {}) {
  const L = await loadPdfLib(); const { PDFDocument } = L;
  const sizes = srcs.map((s) => s.size).filter(Boolean);
  const mem = sizes.length === srcs.length ? classifyPdfJob(sizes.reduce((a, x) => a + x, 0), device()) : null;
  if (mem?.level === 'block' && !window.__auto && !confirm(`Archivo grande para este dispositivo (≈${mem.estimatePeakMB} MB de memoria estimada; presupuesto ${mem.budgetMB} MB). ¿Intentar de todos modos? Los originales no se tocan.`)) return log('unir', { cancelado: 'memoria', mem });
  $('#msg').textContent = '';
  const t0 = performance.now(); let guardMs = 0;
  const { r, bloqueoMaxMs } = await withJank(async () => {
    const out = await PDFDocument.create(); let inBytes = 0; const ink = []; const estados = [];
    for (const s of srcs) {
      const b = await bytes(s); inBytes += b.length;
      const o = await openForEdit(L, b, uiFor(s)); estados.push(o.estado);
      if (!o.doc) return { rechazado: { archivo: nameOf(s), ...o }, estados };
      if (guard) {
        const ci = checkInput(L, o.doc);
        if (!ci.ok) return { rechazado: { archivo: nameOf(s), estado: 'danado', mensaje: ci.motivo, ilegibles: ci.ilegibles.length }, estados };
        ink.push(...ci.status.map((x) => x === 'contenido'));
      }
      (await out.copyPages(o.doc, o.doc.getPageIndices())).forEach((p) => out.addPage(p));
    }
    const expectedPages = out.getPageCount();
    const saved = await out.save({ useObjectStreams: objectStreams });
    let check = null;
    if (guard) { const tg = performance.now(); check = await checkOutput(L, saved, { expectedPages, expectInk: ink }); guardMs = ms(tg); }
    return { blob: check && !check.ok ? null : new Blob([saved], { type: 'application/pdf' }), inBytes, outBytes: saved.length, pages: expectedPages, check, estados };
  });
  if (r.rechazado) { $('#msg').textContent = `${r.rechazado.archivo}: ${r.rechazado.mensaje}${r.rechazado.alternativas ? ' Puedes: ' + r.rechazado.alternativas.join(' ') : ''}`; return log('unir', { rechazado: r.rechazado, estados: r.estados, ms: ms(t0) }); }
  window.__lastBlob = r.blob; // null si la guarda falló: no se entrega
  const memLog = mem || classifyPdfJob(r.inBytes, device()); // con URLs (runner) el tamaño se conoce al leer
  if (r.check && !r.check.ok) $('#msg').textContent = `${AVISO_GUARDA} (${r.check.motivo})`;
  return log('unir', { archivos: srcs.length, estados: r.estados, entradaMB: +(r.inBytes / MB).toFixed(1), salidaMB: +(r.outBytes / MB).toFixed(1), paginas: r.pages, ms: ms(t0), guardaMs: guardMs, guarda: r.check, entregado: !!r.blob, memoria: { level: memLog.level, estimatePeakMB: memLog.estimatePeakMB, budgetMB: memLog.budgetMB, ramAssumed: memLog.ramAssumed }, bloqueoMaxMs });
}

async function split(src, { every = 1, guard = true } = {}) {
  const L = await loadPdfLib(); const { PDFDocument } = L;
  const t0 = performance.now(); const o = await openForEdit(L, await bytes(src), uiFor(src));
  if (!o.doc) return log('dividir', { rechazado: o });
  const doc = o.doc; let ink = null;
  if (guard) { const ci = checkInput(L, doc); if (!ci.ok) return log('dividir', { rechazado: { estado: 'danado', mensaje: ci.motivo } }); ink = ci.status.map((x) => x === 'contenido'); }
  const n = doc.getPageCount(); const parts = []; let fallos = 0, guardMs = 0;
  for (let i = 0; i < n; i += every) {
    const idx = Array.from({ length: Math.min(every, n - i) }, (_, k) => i + k);
    const out = await PDFDocument.create(); (await out.copyPages(doc, idx)).forEach((p) => out.addPage(p));
    const saved = await out.save(); parts.push(saved.length);
    if (guard) { const tg = performance.now(); if (!(await checkOutput(L, saved, { expectedPages: idx.length, expectInk: idx.map((k) => ink[k]) })).ok) fallos++; guardMs += ms(tg); }
  }
  return log('dividir', { partes: parts.length, totalMB: +(parts.reduce((a, x) => a + x, 0) / MB).toFixed(1), ms: ms(t0), guardaMs: guardMs, fallosGuarda: fallos });
}

// Miniaturas de todas las páginas de una vez (medición de referencia de S12).
async function thumbs(src, { scale = 0.2, max = 100 } = {}) {
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
      per.push(performance.now() - t); if (first === null) first = performance.now() - tFirst;
    }
    await task.destroy();
    per.sort((a, b) => a - b);
    return { n, primeraMs: Math.round(first), medianaMs: Math.round(per[per.length >> 1]), p95Ms: Math.round(per[Math.floor(per.length * 0.95)]) };
  });
  return log('miniaturas', { ...r, scale, totalMs: ms(t0), bloqueoMaxMs });
}

/**
 * Miniaturas perezosas (decisión del dueño): solo las visibles (IntersectionObserver), una a la vez,
 * con lado mayor ≤ maxPx CSS (× devicePixelRatio, máx. 2) y liberando las que salen de pantalla.
 */
async function thumbsLazy(src, { maxPx = 120, margin = '150px' } = {}) {
  await loadPdfjs();
  const t0 = performance.now(); const data = await bytes(src);
  const box = $('#thumbs'); box.replaceChildren();
  const task = openPdf(data); const doc = await task.promise; const n = doc.numPages;
  const p1 = await doc.getPage(1); const vp1 = p1.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (maxPx * dpr) / Math.max(vp1.width, vp1.height);
  const cssW = Math.round(vp1.width * scale / dpr), cssH = Math.round(vp1.height * scale / dpr);
  const slots = []; const want = new Set(); const live = new Map();
  const st = { n, renders: 0, liberadas: 0, maxVivas: 0, primeraVisibleMs: null, maxPxCanvas: 0, renderMaxMs: 0 };
  for (let i = 1; i <= n; i++) {
    const s = document.createElement('div'); s.className = 'slot'; s.dataset.i = i; s.style.width = `${cssW}px`; s.style.height = `${cssH}px`;
    s.setAttribute('aria-label', `Página ${i}`); box.append(s); slots.push(s);
  }
  let busy = null, idleResolve = null;
  const release = (i) => { const c = live.get(i); if (!c) return; c.width = c.height = 0; c.remove(); live.delete(i); st.liberadas++; };
  async function pump() {
    if (busy) return busy;
    if (![...want].some((i) => !live.has(i))) return;
    busy = (async () => {
      for (;;) {
        const next = [...want].filter((i) => !live.has(i)).sort((a, b) => a - b)[0];
        if (next === undefined) break;
        const t = performance.now(); const page = await doc.getPage(next); const vp = page.getViewport({ scale });
        const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        await page.render({ canvas: c, viewport: vp }).promise; page.cleanup();
        st.renderMaxMs = Math.max(st.renderMaxMs, Math.round(performance.now() - t));
        st.renders++; st.maxPxCanvas = Math.max(st.maxPxCanvas, c.width, c.height);
        if (st.primeraVisibleMs === null) st.primeraVisibleMs = ms(t0);
        if (!want.has(next)) { c.width = c.height = 0; st.liberadas++; continue; } // salió de pantalla mientras se dibujaba
        slots[next - 1].append(c); live.set(next, c); st.maxVivas = Math.max(st.maxVivas, live.size);
      }
      busy = null; if (idleResolve) { idleResolve(); idleResolve = null; }
    })();
    return busy;
  }
  let ioReady; const firstIO = new Promise((ok) => { ioReady = ok; });
  const io = new IntersectionObserver((entries) => {
    ioReady();
    for (const e of entries) { const i = +e.target.dataset.i; if (e.isIntersecting) want.add(i); else { want.delete(i); release(i); } }
    pump();
  }, { root: box, rootMargin: margin });
  slots.forEach((s) => io.observe(s));
  const idle = () => firstIO.then(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => (busy ? (idleResolve = ok) : ok())))));
  const ctl = {
    stats: () => ({ ...st, vivas: live.size, maxPx, scale: +scale.toFixed(3), totalMs: ms(t0) }),
    idle,
    async scrollAll() { // recorre la lista de arriba abajo como un usuario
      await idle();
      while (box.scrollTop + box.clientHeight < box.scrollHeight - 2) { box.scrollTop += box.clientHeight; await idle(); }
      return ctl.stats();
    },
    async destroy() { io.disconnect(); for (const i of [...live.keys()]) release(i); await task.destroy(); },
  };
  window.__lazy = ctl;
  return ctl;
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

// Cifrados con el flujo aprobado: permiso para restricciones de propietario, contraseña para apertura.
async function encrypted(src, auto) {
  const L = await loadPdfLib(); const data = await bytes(src);
  window.__auto = auto; let o;
  try { o = await openForEdit(L, data, uiFor(src)); } finally { window.__auto = undefined; }
  const out = { src: nameOf(src), auto: { permiso: auto.permiso, claves: auto.claves?.length || 0 }, estado: o.estado };
  if (o.doc) {
    const ink = pagesInk(L, o.doc); const outDoc = await L.PDFDocument.create();
    (await outDoc.copyPages(o.doc, [0])).forEach((p) => outDoc.addPage(p));
    const saved = await outDoc.save(); out.guarda = await checkOutput(L, saved, { expectedPages: 1, expectInk: [ink[0]] });
    window.__lastBlob = new Blob([saved], { type: 'application/pdf' });
  } else { out.mensaje = o.mensaje; out.alternativas = o.alternativas; }
  // Ver no modifica: pdf.js abre los restringidos sin preguntar y pide contraseña si hace falta.
  await loadPdfjs();
  try { const tk = openPdf(data.slice()); const d = await tk.promise; out.pdfjsVer = `abre ${d.numPages} p`; await tk.destroy(); } catch (e) { out.pdfjsVer = e.name; }
  return log('cifrado', out);
}

async function form(src) {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(await bytes(src)); const f = doc.getForm();
  const names = f.getFields().map((x) => x.getName());
  f.getTextField('nombre').setText('María Suárez Peña'); f.getCheckBox('acepto').check();
  const blob = new Blob([await doc.save()], { type: 'application/pdf' }); window.__lastBlob = blob;
  return log('formulario', { campos: names, salidaB: blob.size });
}

async function corrupt(src) {
  const data = await bytes(src); const out = {};
  const L = await loadPdfLib();
  try { const o = await openForEdit(L, data, uiFor(src)); out.cantoo = `abre ${o.doc?.getPageCount()} p sin error`; out.guardaEntrada = checkInput(L, o.doc).motivo || 'ok'; } catch (e) { out.cantoo = `${e.name}: ${String(e.message).slice(0, 80)}`; }
  await loadPdfjs();
  try { const tk = openPdf(data.slice()); const d = await tk.promise; out.pdfjs = `abre ${d.numPages} p`; await tk.destroy(); } catch (e) { out.pdfjs = `${e.name}: ${String(e.message).slice(0, 80)}`; }
  return log('corrupto', out);
}

// Interfaz manual (también para el iPhone): elegir archivos propios.
$('#merge').onclick = () => { const fs = [...$('#files').files]; if (fs.length) merge(fs).catch((e) => log('error', { message: e.message })); };
$('#thumbsBtn').onclick = () => { const f = $('#files').files[0]; if (f) thumbs(f); };
$('#lazyBtn').onclick = async () => { const f = $('#files').files[0]; if (!f) return; await window.__lazy?.destroy(); const c = await thumbsLazy(f); await c.idle(); log('miniaturas perezosas', c.stats()); };
$('#lazyStats').onclick = () => { if (window.__lazy) log('miniaturas perezosas (tras desplazar)', window.__lazy.stats()); };
$('#renderBtn').onclick = () => { const f = $('#files').files[0]; if (f) renderBig(f); };
$('#save').onclick = () => { if (!window.__lastBlob) return; const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(window.__lastBlob), download: 'resultado.pdf' }); a.click(); };
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(results)); $('#copied').hidden = false; } catch { /* copiar a mano desde el recuadro */ } };
window.__s12 = { merge, split, thumbs, thumbsLazy, renderBig, encrypted, form, corrupt, results };
