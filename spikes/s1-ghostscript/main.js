// Arnés del spike S1. Mide carga del worker+WASM, tiempo de compresión y tamaño de salida.
const $ = (id) => document.getElementById(id);
const results = [];
window.__results = results;
$('ua').textContent = navigator.userAgent + ` · deviceMemory=${navigator.deviceMemory ?? '?'} · cores=${navigator.hardwareConcurrency}`;

let worker = null; let seq = 0; const pending = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker('./worker.js', { type: 'module' });
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id); if (!p) return;
    if (data.type === 'progress') { $('status').textContent = `Procesando página ${data.payload.page}/${data.payload.pages || '?'}…`; return; }
    pending.delete(data.id);
    data.type === 'error' ? p.reject(new Error(data.payload.message)) : p.resolve(data.payload);
  };
  worker.onerror = (e) => { for (const p of pending.values()) p.reject(new Error(e.message || 'Error del worker')); pending.clear(); };
  return worker;
}
function call(type, payload, transfer = []) {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); getWorker().postMessage({ type, id, payload }, transfer); });
}
// Cancelar: callMain es síncrono dentro del worker, así que la única cancelación real es terminate().
function cancel() {
  worker?.terminate(); worker = null;
  for (const p of pending.values()) p.reject(new Error('Cancelado por el usuario'));
  pending.clear();
}

async function compress(name, bytes, dpi, quality) {
  const t0 = performance.now();
  const inMB = bytes.byteLength / 1e6;
  const r = await call('compress', { bytes, dpi, quality }, [bytes]);
  const row = { name, inMB: +inMB.toFixed(2), dpi, quality, outMB: +(r.bytes.byteLength / 1e6).toFixed(3),
    ratio: +(r.bytes.byteLength / 1e6 / inMB).toFixed(3), initMs: r.initMs, runMs: r.runMs,
    totalMs: Math.round(performance.now() - t0), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
  results.push(row); render(row);
  return { row, out: r.bytes };
}
function render(r) {
  const tr = document.createElement('tr');
  for (const v of [r.name, r.inMB, `${r.dpi}/${r.quality}`, r.outMB, r.ratio, r.initMs, r.runMs, r.totalMs, r.heapMB ?? '—']) {
    const td = document.createElement('td'); td.textContent = v; tr.append(td);
  }
  $('out').append(tr);
}

$('run').onclick = async () => {
  const f = $('file').files[0]; if (!f) { $('status').textContent = 'Elige un PDF primero.'; return; }
  $('run').disabled = true; $('cancel').disabled = false;
  try { await compress(f.name, await f.arrayBuffer(), +$('dpi').value, +$('q').value); $('status').textContent = 'Listo.'; }
  catch (e) { $('status').textContent = `Error: ${e.message}`; }
  finally { $('run').disabled = false; $('cancel').disabled = true; }
};
$('cancel').onclick = () => { cancel(); $('status').textContent = 'Cancelado.'; };
$('copy').onclick = () => navigator.clipboard.writeText(JSON.stringify({ ua: navigator.userAgent, results }, null, 1));

// API para la automatización (Playwright): no se usa en el teléfono.
window.__spike = {
  init: () => call('init', {}),
  compress: async (url, dpi, quality) => { const b = await (await fetch(url)).arrayBuffer(); const { row } = await compress(url.split('/').pop(), b, dpi, quality); return row; },
  probeWorkerNet: (url) => call('probe-network', { url }),
  probePageNet: async (url) => { try { await fetch(url, { mode: 'no-cors' }); return { reached: true }; } catch (e) { return { reached: false, error: String(e) }; } },
  compressFile: async (url, dpi, quality) => {
    const blob = await (await fetch(url)).blob(); // Blob respaldado en disco/fuera del heap JS
    const file = new File([blob], url.split('/').pop(), { type: 'application/pdf' });
    const t0 = performance.now(); const r = await call('compress-file', { file, dpi, quality });
    return { name: file.name, outMB: +(r.bytes.byteLength / 1e6).toFixed(3), runMs: r.runMs, totalMs: Math.round(performance.now() - t0) };
  },
  terminate: () => { worker?.terminate(); worker = null; },
  cancelDuring: async (url) => {
    const b = await (await fetch(url)).arrayBuffer();
    const p = call('compress', { bytes: b, dpi: 150, quality: 60 }, [b]).then(() => 'terminó', (e) => e.message);
    await new Promise((r) => setTimeout(r, 300)); const t = performance.now(); cancel();
    return { result: await p, cancelMs: Math.round(performance.now() - t) };
  },
};
