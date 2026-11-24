// Carga de pdf-lib (o su fork @cantoo/pdf-lib) y pdf.js para el spike S12.
// pdf.js corre su worker según ADR-004: worker blob: con lockdown.js primero y sin red propia
// (useWorkerFetch:false → la página trae wasm y fuentes estándar y se los pasa).
const V = new URL('../vendor/', import.meta.url);
const LOCKDOWN = new URL('../../s10-plataforma/csp/lockdown.js', import.meta.url).href;

export async function loadPdfLib(variant = 'pdf-lib') {
  const path = variant === 'cantoo' ? 'cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js' : 'pdf-lib-1.17.1/pdf-lib.esm.min.js';
  return import(new URL(path, V).href);
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
    standardFontDataUrl: new URL('pdfjs-6.5.438/standard_fonts/', V).href,
    wasmUrl: new URL('pdfjs-6.5.438/wasm/', V).href,
    ...extra,
  });
}
