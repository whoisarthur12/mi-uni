// Página de medición de límites de canvas (para correr también en el iPhone / Android del dueño).
const $ = (s) => document.querySelector(s);
const P = window.CanvasProbe;
const results = { ua: navigator.userAgent, deviceMemory: navigator.deviceMemory || null, dpr: devicePixelRatio, page: {}, worker: {} };

async function inWorker(msg) {
  const src = await (await fetch('./probe.js')).text();
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const w = new Worker(url); URL.revokeObjectURL(url);
  try {
    return await new Promise((ok, ko) => { w.onmessage = (e) => (e.data.ok ? ok(e.data.r) : ko(new Error(e.data.error))); w.onerror = (e) => ko(new Error(e.message || 'error en worker')); w.postMessage(msg); });
  } finally { w.terminate(); }
}

const show = () => { $('#out').textContent = JSON.stringify(results, null, 1); };
const tick = () => new Promise((r) => setTimeout(r, 30));

async function runAll(cap) {
  $('#run').disabled = true;
  const steps = [
    ['page.limits', () => P.limits('canvas')],
    ['worker.limits', () => inWorker({ op: 'limits' })],
    ['page.encode', () => P.encode('canvas')],
    ['worker.encode', () => inWorker({ op: 'encode' })],
    ['page.cumulative', () => P.cumulative('canvas', cap)],
    ['worker.cumulative', () => inWorker({ op: 'cumulative', cap })],
  ];
  for (const [k, fn] of steps) {
    $('#status').textContent = 'Midiendo ' + k + '…'; await tick();
    const [a, b] = k.split('.');
    try { results[a][b] = await fn(); } catch (e) { results[a][b] = { error: e.message }; }
    show();
  }
  $('#status').textContent = 'Listo.'; $('#run').disabled = false;
  return results;
}

$('#run').addEventListener('click', () => runAll(+$('#cap').value));
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(results)); $('#status').textContent = 'Copiado.'; }
  catch { $('#status').textContent = 'No se pudo copiar: selecciona el texto manualmente.'; }
});
window.__canvas = { runAll };
