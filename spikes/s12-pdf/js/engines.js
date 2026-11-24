// Carga de @cantoo/pdf-lib y pdf.js para el spike S12 (versiones aprobadas en ADR-010, en js/vendor/).
// pdf.js corre su worker según ADR-004: worker blob: con lockdown.js primero y sin red propia
// (useWorkerFetch:false → la página trae wasm y fuentes estándar y se los pasa).
const V = new URL('../../../js/vendor/', import.meta.url);
const FONTS = new URL('../vendor/pdfjs-6.5.438-standard_fonts/', import.meta.url); // solo evaluación (no aprobadas)
const LOCKDOWN = new URL('../../s10-plataforma/csp/lockdown.js', import.meta.url).href;

export async function loadPdfLib() {
  return import(new URL('cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js', V).href);
}

let pdfjs = null, port = null;
export async function loadPdfjs({ locked = true } = {}) {
  if (pdfjs) return pdfjs;
  pdfjs = await import(new URL('pdfjs-6.5.438/pdf.min.mjs', V).href);
  const workerUrl = new URL('pdfjs-6.5.438/pdf.worker.min.mjs', V).href;
  if (locked) {
    // Arranque blob: guarda los mensajes que lleguen mientras se importan los módulos y los reenvía.
    const boot = `const q=[];self.onmessage=(e)=>q.push(e.data);
await import(${JSON.stringify(LOCKDOWN)});await import(${JSON.stringify(workerUrl)});
self.onmessage=null;for(const d of q)self.dispatchEvent(new MessageEvent('message',{data:d}));`;
    const url = URL.createObjectURL(new Blob([boot], { type: 'text/javascript' }));
    port = new Worker(url, { type: 'module' }); URL.revokeObjectURL(url);
    pdfjs.GlobalWorkerOptions.workerPort = port;
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  return pdfjs;
}

export function openPdf(data, extra = {}) {
  return pdfjs.getDocument({
    data, isEvalSupported: false, useWorkerFetch: false,
    standardFontDataUrl: FONTS.href,
    wasmUrl: new URL('pdfjs-6.5.438/wasm/', V).href,
    ...extra,
  });
}
