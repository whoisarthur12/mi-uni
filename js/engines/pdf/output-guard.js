// Guarda de salida de la Caja PDF (ADR-010, decisión del dueño 24-nov-2026).
// Antes de entregar un PDF unido/editado: (1) se reabre, (2) tiene el número de páginas esperado y
// (3) ninguna página quedó vacía si su página de origen tenía contenido. Si falla, no se entrega y se avisa.
// Detecta el fallo silencioso de S12 (páginas copiadas con su contenido aún cifrado → en blanco sin error).
// También guarda de ENTRADA: S12 mostró que @cantoo/pdf-lib abre un PDF truncado sin error (21 de 30 páginas sin contenido).
// Lógica sin DOM con @cantoo/pdf-lib; probada en Node.

// Operadores que pintan algo (PDF 32000-1, tablas 59 y siguientes): imágenes/XObjects, texto, rellenos, trazos, sombreados.
const PAINT = /(?:^|[\s\]\)>])(Do|Tj|TJ|'|"|f\*?|F|B\*?|b\*?|S|s|sh|BI)(?=[\s\[\(<\/]|$)/;

const stripInline = (text) => text.replace(/\bBI\b[\s\S]*?\bID\b[\s\S]*?\bEI\b/g, ' BI '); // imágenes en línea: binario legítimo

/** ¿Más del 10 % de bytes no imprimibles (fuera de imágenes en línea)? Contenido que sigue cifrado o dañado. */
export function isBinaryGarbage(text) {
  const t = stripInline(text); if (!t.trim().length) return false;
  let bad = 0;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); if ((c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12 && c !== 0) || c > 126) bad++; }
  return bad / t.length > 0.1;
}

/** ¿El contenido decodificado parece un content stream legible y pinta algo? */
export function contentPaints(text) {
  if (!text.trim().length || isBinaryGarbage(text)) return false;
  return PAINT.test(stripInline(text));
}

/**
 * Estado de cada página:
 *  'contenido' → su contenido se decodifica y pinta algo;
 *  'vacia'     → no tiene contenido (en blanco a propósito) o solo operadores sin dibujo;
 *  'ilegible'  → declara contenido pero falta, no se decodifica o es basura binaria (PDF dañado o aún cifrado).
 */
export function pagesStatus(L, doc) {
  const { PDFArray, PDFName, PDFRawStream, PDFStream, decodePDFRawStream } = L;
  const ctx = doc.context; const out = [];
  for (const page of doc.getPages()) {
    const ref = page.node.get(PDFName.of('Contents'));
    if (!ref) { out.push('vacia'); continue; }
    const contents = ctx.lookup(ref);
    const items = contents instanceof PDFArray ? contents.asArray().map((r) => ctx.lookup(r)) : [contents];
    let text = ''; let ok = items.length > 0;
    for (const s of items) {
      try {
        if (!s) throw new Error('falta el objeto');
        const bytes = s instanceof PDFRawStream ? decodePDFRawStream(s).decode()
          : typeof s.getUnencodedContents === 'function' ? s.getUnencodedContents()
          : s instanceof PDFStream ? s.getContents() : null;
        if (!bytes) throw new Error('no es un stream');
        text += ' ' + latin1(bytes);
      } catch { ok = false; }
    }
    if (!ok || isBinaryGarbage(text)) out.push('ilegible');
    else out.push(contentPaints(text) ? 'contenido' : 'vacia');
  }
  return out;
}

/** Compatibilidad: true si la página tiene contenido que pinta. */
export const pagesInk = (L, doc) => pagesStatus(L, doc).map((s) => s === 'contenido');

/** Guarda de ENTRADA: un PDF con páginas ilegibles no se procesa (pdf-lib lo abriría sin error y saldrían en blanco). */
export function checkInput(L, doc) {
  const st = pagesStatus(L, doc);
  const ilegibles = st.flatMap((s, i) => (s === 'ilegible' ? [i + 1] : []));
  return ilegibles.length
    ? { ok: false, status: st, ilegibles, motivo: `El PDF está dañado: ${ilegibles.length} de ${st.length} páginas no se pueden leer.` }
    : { ok: true, status: st, ilegibles: [] };
}

function latin1(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return s;
}

/**
 * @param {object} L módulo @cantoo/pdf-lib
 * @param {Uint8Array} outBytes PDF ya guardado
 * @param {{expectedPages: number, expectInk: boolean[]}} exp expectInk[i]: la página de origen i tenía contenido
 * @returns {Promise<{ok: boolean, paginas?: number, vacias?: number[], motivo?: string}>}
 */
export async function checkOutput(L, outBytes, exp) {
  let doc;
  try { doc = await L.PDFDocument.load(outBytes, { updateMetadata: false }); } catch (e) {
    return { ok: false, motivo: `El PDF generado no se puede abrir: ${String(e.message).slice(0, 80)}` };
  }
  const n = doc.getPageCount();
  if (n !== exp.expectedPages) return { ok: false, paginas: n, motivo: `Se esperaban ${exp.expectedPages} páginas y salieron ${n}.` };
  const ink = pagesInk(L, doc);
  const vacias = ink.flatMap((v, i) => (!v && exp.expectInk[i] ? [i + 1] : []));
  if (vacias.length) return { ok: false, paginas: n, vacias, motivo: `Páginas vacías que en el original tenían contenido: ${vacias.join(', ')}.` };
  return { ok: true, paginas: n, vacias: [] };
}

export const AVISO_GUARDA = 'El resultado no pasó la comprobación y no se ha entregado. Tus archivos originales no se han modificado.';
