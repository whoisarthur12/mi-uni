// Worker del spike S1: carga Ghostscript WASM una vez y atiende mensajes { type, id, payload }.
import loadGs from '../../js/vendor/ghostpdl-wasm-1.1.0/gs.js';
import { buildArgs } from './gs-args.js';

let gs = null;
let lastLines = [];

async function ensureGs() {
  if (gs) return { initMs: 0 };
  const t0 = performance.now();
  gs = await loadGs({
    print: (line) => onLine(line),
    printErr: (line) => onLine(line),
  });
  return { initMs: Math.round(performance.now() - t0) };
}

let current = null;
function onLine(line) {
  lastLines.push(line); if (lastLines.length > 20) lastLines.shift();
  const m = /^Page (\d+)/.exec(line);
  if (m && current) self.postMessage({ type: 'progress', id: current.id, payload: { page: +m[1], pages: current.pages } });
  const p = /Processing pages \d+ through (\d+)/.exec(line);
  if (p && current) current.pages = +p[1];
}

self.onmessage = async ({ data }) => {
  const { type, id, payload } = data;
  try {
    if (type === 'init') {
      self.postMessage({ type: 'done', id, payload: await ensureGs() });
    } else if (type === 'compress') {
      const init = await ensureGs();
      gs.FS.writeFile('/in.pdf', new Uint8Array(payload.bytes));
      payload.bytes = null;
      current = { id, pages: 0 }; lastLines = [];
      const t0 = performance.now();
      const code = gs.callMain(buildArgs(payload));
      const runMs = Math.round(performance.now() - t0);
      current = null;
      if (code !== 0) throw new Error(`Ghostscript terminó con código ${code}: ${lastLines.join(' | ')}`);
      const out = gs.FS.readFile('/out.pdf');
      gs.FS.unlink('/out.pdf'); gs.FS.unlink('/in.pdf');
      self.postMessage({ type: 'done', id, payload: { ...init, runMs, bytes: out.buffer } }, [out.buffer]);
    } else if (type === 'probe-network') {
      // ¿Restringe la CSP <meta> del documento las peticiones de un worker? (Pages no envía cabeceras CSP)
      try { const r = await fetch(payload.url, { mode: 'no-cors' }); self.postMessage({ type: 'done', id, payload: { reached: true, status: r.type } }); }
      catch (e) { self.postMessage({ type: 'done', id, payload: { reached: false, error: String(e) } }); }
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, payload: { message: String(err?.message || err) } });
  }
};
