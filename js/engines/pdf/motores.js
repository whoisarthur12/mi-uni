// Motor PDF compartido (INSTRUCTIONS Fase 2.1, ADR-010). ÚNICO punto que importa pdf.js y @cantoo/pdf-lib:
// si un día hay que cambiar de motor (plan de reemplazo de ADR-010), solo cambia este archivo.
// pdf.js corre su worker según ADR-004: creado por core/workers.js (blob: + lockdown) y sin red propia
// (useWorkerFetch:false: la página trae el wasm y se lo pasa). isEvalSupported:false.
import { createWorker } from '../../core/workers.js';

const V = new URL('../../vendor/', import.meta.url);
let pdfjs = null, puerto = null, pdfLib = null;

export async function cargarPdfjs() {
  if (pdfjs) return pdfjs;
  const m = await import(new URL('pdfjs-6.5.438/pdf.min.mjs', V).href);
  puerto = createWorker(new URL('pdfjs-6.5.438/pdf.worker.min.mjs', V).href, { name: 'pdfjs' });
  m.GlobalWorkerOptions.workerPort = puerto;
  pdfjs = m;
  return pdfjs;
}

/** Abre un PDF con pdf.js. Devuelve la loadingTask (cerrar con task.destroy(), API de pdf.js 6). */
export async function abrirPdfjs(datos, extra = {}) {
  const m = await cargarPdfjs();
  return m.getDocument({ data: datos, isEvalSupported: false, useWorkerFetch: false, verbosity: 0, wasmUrl: new URL('pdfjs-6.5.438/wasm/', V).href, ...extra });
}

export async function cargarPdfLib() {
  if (!pdfLib) pdfLib = await import(new URL('cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js', V).href);
  return pdfLib;
}

/** Archivos de los motores para la descarga sin conexión (sw-config: MODULES.*.assets). */
export const ARCHIVOS_MOTOR_PDF = [
  'js/vendor/pdfjs-6.5.438/pdf.min.mjs', 'js/vendor/pdfjs-6.5.438/pdf.worker.min.mjs',
  'js/vendor/pdfjs-6.5.438/wasm/jbig2.wasm', 'js/vendor/pdfjs-6.5.438/wasm/openjpeg.wasm', 'js/vendor/pdfjs-6.5.438/wasm/qcms_bg.wasm',
  'js/vendor/cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js',
];

/**
 * Diagnóstico para el Compresor con pdf.js: páginas, contraseña de apertura y restricciones del propietario.
 * Nunca intenta saltar una contraseña (ADR-010).
 * @returns {{estado:'ok'|'contrasena'|'contrasena-incorrecta'|'danado', paginas?, restringido?, permisos?}}
 */
export async function diagnosticarPdf(bytes, password) {
  const task = await abrirPdfjs(bytes.slice(), password ? { password } : {});
  try {
    const doc = await task.promise;
    const permisos = await doc.getPermissions().catch(() => null);
    return { estado: 'ok', paginas: doc.numPages, restringido: Array.isArray(permisos), permisos };
  } catch (e) {
    if (e?.name === 'PasswordException') return { estado: e.code === 2 ? 'contrasena-incorrecta' : 'contrasena' };
    return { estado: 'danado', mensaje: e?.message };
  } finally { await task.destroy().catch(() => {}); }
}

/**
 * ¿Está cifrado con contraseña de propietario? (abre sin contraseña de apertura, pero tiene cifrado).
 * pdf.js no lo dice si el PDF concede todos los permisos; @cantoo/pdf-lib sí (S12, pdf-open.js).
 */
export async function cifradoPorPropietario(bytes) {
  const L = await cargarPdfLib();
  try { await L.PDFDocument.load(bytes, { updateMetadata: false }); return false; }
  catch (e) { return (L.EncryptedPDFError && e instanceof L.EncryptedPDFError) || /encrypted/i.test(String(e?.message)); }
}

/**
 * Pinta una página en un canvas a un ancho CSS dado (para la comparación antes/después).
 * Respeta el tope de canvas de iOS (≤ 16,7 MP, S10).
 */
export async function pintarPagina(bytes, numero, canvas, anchoCss, { password } = {}) {
  const task = await abrirPdfjs(bytes.slice(), password ? { password } : {});
  try {
    const doc = await task.promise;
    const p = await doc.getPage(Math.min(numero, doc.numPages));
    const base = p.getViewport({ scale: 1 });
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    let escala = (anchoCss * dpr) / base.width;
    const mp = (base.width * escala) * (base.height * escala);
    if (mp > 16.7e6) escala *= Math.sqrt(16.7e6 / mp);
    const vp = p.getViewport({ scale: escala });
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    await p.render({ canvas, viewport: vp }).promise;
    p.cleanup();
    return { ancho: canvas.width, alto: canvas.height };
  } finally { await task.destroy().catch(() => {}); }
}
