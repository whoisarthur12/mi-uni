// Única fábrica de workers de la app (ADR-004). Ningún otro archivo puede llamar a `new Worker(`:
// lo vigila tests/policy/workers-scope.test.mjs.
//  - El worker nace de un `blob:` y por eso hereda la CSP <meta> del documento.
//  - Lo primero que importa es lockdown.js (congela fetch, XHR, WebSocket, importScripts, Worker…).
//  - Los mensajes que llegan mientras se importan los módulos se guardan y se entregan después.
//  - Los WASM se compilan aquí, en la página, y se pasan al worker como WebAssembly.Module.
import { urlLocal, fetchLocal } from './net-guard.js';

const LOCKDOWN = new URL('./lockdown.js', import.meta.url).href;

/** Crea un worker de módulo aislado. `moduleUrl`: URL absoluta o relativa a `base`, del propio sitio. */
export function createWorker(moduleUrl, { base = import.meta.url, name } = {}) {
  const target = urlLocal(moduleUrl, base).href;
  // Si el módulo asigna self.onmessage, reemplaza a la cola; si usa addEventListener, se quita la cola.
  const boot = `const q=[];const cola=(e)=>q.push(e.data);self.onmessage=cola;
await import(${JSON.stringify(LOCKDOWN)});await import(${JSON.stringify(target)});
if(self.onmessage===cola)self.onmessage=null;
for(const d of q)self.dispatchEvent(new MessageEvent('message',{data:d}));`;
  const url = URL.createObjectURL(new Blob([boot], { type: 'text/javascript' }));
  try { return new Worker(url, { type: 'module', name }); } finally { URL.revokeObjectURL(url); }
}

/**
 * Ejecuta una tarea en un worker NUEVO y lo termina al acabar (ADR-003: sin acumular memoria WASM).
 * Protocolo: el worker responde {type:'progress'|'done'|'error', payload}.
 * Cancelar con `signal` termina el worker al instante.
 */
export function runOnce(moduleUrl, message, { transfer = [], onProgress, signal, base, name } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const w = createWorker(moduleUrl, { base, name });
    const fin = () => { w.terminate(); signal?.removeEventListener('abort', onAbort); };
    const onAbort = () => { fin(); reject(abortError()); };
    signal?.addEventListener('abort', onAbort, { once: true });
    w.onmessage = ({ data }) => {
      if (data?.type === 'progress') { onProgress?.(data.payload); return; }
      fin();
      if (data?.type === 'done') resolve(data.payload);
      else reject(new Error(data?.payload?.message || 'El proceso falló.'));
    };
    w.onerror = (e) => { fin(); reject(new Error(e.message || 'El proceso se detuvo por un error.')); };
    w.postMessage(message, transfer);
  });
}

export function abortError() { return new DOMException('Cancelado por el usuario.', 'AbortError'); }

const wasmCache = new Map();
/** Compila un .wasm del propio sitio una sola vez por sesión. */
export function compileWasm(url, base = import.meta.url) {
  const href = urlLocal(url, base).href;
  if (!wasmCache.has(href)) {
    wasmCache.set(href, (async () => {
      const res = await fetchLocal(href);
      if (!res.ok) throw new Error(`No se pudo cargar ${href.split('/').pop()} (${res.status}).`);
      return WebAssembly.compile(await res.arrayBuffer());
    })().catch((e) => { wasmCache.delete(href); throw e; }));
  }
  return wasmCache.get(href);
}
