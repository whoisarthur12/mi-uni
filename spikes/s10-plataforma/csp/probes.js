// Intenta salir a otro origen por cada vía de red disponible en un worker.
// La verdad la da el servidor testigo (registra el token); aquí solo se anota qué lanzó error localmente.
export async function runProbes(base, tag) {
  const out = {};
  const u = (v, ext = '') => `${base}/hit/${tag}-${v}${ext}`;
  const attempt = async (v, fn) => { try { await fn(); out[v] = 'intentado'; } catch (e) { out[v] = 'error: ' + String(e?.message || e).slice(0, 90); } };
  await attempt('fetch', () => fetch(u('fetch'), { mode: 'no-cors' }));
  await attempt('xhr', () => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('GET', u('xhr')); x.onload = res; x.onerror = () => rej(new Error('xhr onerror')); x.send(); }));
  await attempt('websocket', () => new Promise((res, rej) => { const w = new WebSocket(u('websocket').replace('http', 'ws')); w.onopen = res; w.onerror = () => rej(new Error('ws onerror')); setTimeout(res, 800); }));
  await attempt('eventsource', () => new Promise((res, rej) => { if (typeof EventSource === 'undefined') return rej(new Error('EventSource no existe')); const s = new EventSource(u('eventsource')); s.onerror = () => { s.close(); rej(new Error('es onerror')); }; setTimeout(() => { s.close(); res(); }, 800); }));
  await attempt('import', () => import(u('import', '.js')));
  await attempt('importScripts', () => { if (typeof importScripts !== 'function') throw new Error('no disponible en worker module'); importScripts(u('importScripts', '.js')); });
  await attempt('nested-worker', () => new Promise((res, rej) => {
    // Un worker anidado nace en un reino nuevo: los parches del padre no le aplican.
    const code = `fetch(${JSON.stringify(u('nested-worker'))}, {mode:'no-cors'}).then(()=>postMessage('ok'), e=>postMessage('err '+e))`;
    let w; try { w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))); } catch (e) { return rej(e); }
    w.onmessage = (e) => { w.terminate(); String(e.data).startsWith('err') ? rej(new Error(e.data)) : res(); };
    w.onerror = (e) => { rej(new Error('nested onerror ' + (e.message || ''))); };
    setTimeout(res, 1500);
  }));
  // ¿Puede compilar WASM? (mínimo módulo vacío: "\0asm" v1)
  try { await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); out.wasm = 'compila'; } catch (e) { out.wasm = 'bloqueado: ' + String(e.message).slice(0, 80); }
  return out;
}
