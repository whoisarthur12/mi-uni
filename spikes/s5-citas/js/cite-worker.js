// Worker de citas: el motor CSL tarda ~0,5–1,3 s en crearse; aquí no bloquea la UI. Sin red (ADR-004: lockdown en producción).
import { createEngine, bibliography, cite } from './cite.js';
let engine = null;
self.onmessage = (e) => {
  const { type, id, payload } = e.data;
  try {
    const t0 = performance.now();
    if (type === 'init') engine = createEngine(payload);
    const out = type === 'bib' ? bibliography(engine) : type === 'cite' ? cite(engine, payload.id, payload.opts) : null;
    self.postMessage({ type: type + ':ok', id, payload: out, ms: Math.round(performance.now() - t0), hasDOMParser: typeof DOMParser !== 'undefined' });
  } catch (err) { self.postMessage({ type: type + ':error', id, error: String(err && err.message) }); }
};
