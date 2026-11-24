// Arnés de variantes de CSP (S10). Cada página variant-*.html solo cambia la meta CSP.
const here = new URL('.', import.meta.url).href;
const blobModule = (code) => new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })), { type: 'module' });
const once = (w, msg, transfer = []) => new Promise((res) => {
  const t = setTimeout(() => res({ error: 'timeout' }), 30000);
  w.onmessage = (e) => { clearTimeout(t); w.terminate(); res(e.data); };
  w.onerror = (e) => { clearTimeout(t); w.terminate(); res({ error: 'onerror: ' + (e.message || '?') }); };
  w.postMessage(msg, transfer);
});
window.__v = {
  swRegister: async () => { try { await navigator.serviceWorker.register('./sw.js'); return 'registrado'; } catch (e) { return 'error: ' + e.message.slice(0, 100); } },
  // 1) blob worker que intenta crear un worker por URL (sin CSP propia) y que este salga a la red
  nestedUrl: (tag) => once(blobModule(`
    let w; try { w = new Worker(${JSON.stringify(here + 'worker-url.js')}, { type: 'module' }); }
    catch (e) { postMessage({ created: false, error: e.message }); }
    if (w) { w.onmessage = (e) => postMessage({ created: true, inner: e.data.fetch }); w.onerror = (e) => postMessage({ created: 'onerror', error: e.message || '?' });
      w.postMessage({ base: 'http://127.0.0.1:8766', tag: ${JSON.stringify(tag)} }); }`), null),
  // 2) WASM dentro de blob worker
  wasmInBlob: () => once(blobModule(`WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])).then(() => postMessage('compila'), (e) => postMessage('bloqueado: ' + e.message.slice(0,80)));`), null),
  // 3) Ghostscript de punta a punta en blob worker + lockdown, con Module compilado en la página
  gsEndToEnd: async (tag) => {
    const t0 = performance.now();
    let module; try { module = await WebAssembly.compileStreaming(fetch('../../../js/vendor/ghostpdl-wasm-1.1.0/gs.wasm')); }
    catch (e) { return { error: 'compilar en página: ' + e.message }; }
    const compileMs = Math.round(performance.now() - t0);
    const bytes = await (await fetch('./fixtures-gen/sint-foto-5mb.pdf')).arrayBuffer();
    const t1 = performance.now();
    // import() dinámico: su grafo usa destino "script" (script-src), no "worker" (worker-src).
    // Los mensajes que lleguen antes de que cargue el módulo se guardan y se reenvían.
    const boot = `const q = []; self.onmessage = (e) => q.push(e);
      await import(${JSON.stringify(here + (window.__dyn ? 'gs-worker-dyn.js' : 'gs-worker.js'))});
      for (const e of q) self.onmessage(e);`;
    const r = await once(blobModule(boot), { module, bytes, tag }, [bytes]);
    return { compileMs, totalWorkerMs: Math.round(performance.now() - t1), ...r };
  },
};
