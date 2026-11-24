// Arnés S10/CSP. Escenarios: url (control), blob (a), sw-header (b), locked (c), blob+locked (a+c).
const here = new URL('.', import.meta.url).href;
function runWorker(worker, base, tag) {
  return new Promise((res) => {
    const t = setTimeout(() => res({ error: 'timeout' }), 15000);
    worker.onmessage = (e) => { clearTimeout(t); worker.terminate(); res(e.data); };
    worker.onerror = (e) => { clearTimeout(t); worker.terminate(); res({ error: 'worker onerror: ' + (e.message || 'sin mensaje') }); };
    worker.postMessage({ base, tag });
  });
}
function blobWorker(entry) {
  // Un blob: no tiene URL base útil: se importa el código real por URL absoluta del mismo origen.
  const src = `import ${JSON.stringify(here + entry)};`;
  return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
}
const scenarios = {
  url: () => new Worker('./worker-url.js', { type: 'module' }),
  blob: () => blobWorker('worker-url.js'),
  'sw-header': () => new Worker('./worker-sw-csp.js', { type: 'module' }),
  locked: () => new Worker('./worker-locked.js', { type: 'module' }),
  'blob+locked': () => blobWorker('worker-locked.js'),
};
async function pageProbe(base, tag) {
  try { await fetch(`${base}/hit/${tag}-page-fetch`, { mode: 'no-cors' }); return 'intentado'; } catch (e) { return 'error: ' + e.message; }
}
window.__s10 = {
  swReady: async () => { const reg = await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; return { controlled: !!navigator.serviceWorker.controller, scope: reg.scope }; },
  run: async (base, browser, names = Object.keys(scenarios)) => {
    const res = { controlled: !!navigator.serviceWorker?.controller, page: await pageProbe(base, `${browser}-page`) };
    for (const n of names) {
      let w; try { w = scenarios[n](); } catch (e) { res[n] = { error: 'no se pudo crear: ' + e.message }; continue; }
      res[n] = await runWorker(w, base, `${browser}-${n}`);
    }
    document.getElementById('out').textContent = JSON.stringify(res, null, 1);
    return res;
  },
};
