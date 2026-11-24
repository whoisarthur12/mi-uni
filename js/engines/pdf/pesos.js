// Peso aproximado de cada página (bytes de sus streams: contenido, imágenes y formularios XObject),
// para elegir páginas de muestra, estimar tamaños y decidir qué páginas rasterizar. Con @cantoo/pdf-lib.
// Una imagen compartida por varias páginas cuenta en cada una (para estimar es aceptable).

function tamStream(L, obj) {
  if (obj instanceof L.PDFRawStream) return obj.contents.length;
  if (obj instanceof L.PDFStream && typeof obj.getContentsSize === 'function') return obj.getContentsSize();
  return 0;
}

function pesoRecursos(L, ctx, recursos, vistos, prof = 0) {
  if (!recursos || prof > 4) return 0;
  const xo = ctx.lookup(recursos.get(L.PDFName.of('XObject')));
  if (!(xo instanceof L.PDFDict)) return 0;
  let total = 0;
  for (const [, ref] of xo.entries()) {
    const clave = String(ref);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const obj = ctx.lookup(ref);
    total += tamStream(L, obj);
    const dict = obj?.dict;
    if (dict && dict.get(L.PDFName.of('Subtype')) === L.PDFName.of('Form')) {
      total += pesoRecursos(L, ctx, ctx.lookup(dict.get(L.PDFName.of('Resources'))), vistos, prof + 1);
    }
  }
  return total;
}

/** Array con el peso (bytes) de cada página. */
export function pesosPaginas(L, doc) {
  const ctx = doc.context;
  return doc.getPages().map((page) => {
    const vistos = new Set();
    let total = 0;
    const c = page.node.get(L.PDFName.of('Contents'));
    const cont = c ? ctx.lookup(c) : null;
    const items = cont instanceof L.PDFArray ? cont.asArray().map((r) => ctx.lookup(r)) : cont ? [cont] : [];
    for (const s of items) total += tamStream(L, s);
    total += pesoRecursos(L, ctx, page.node.Resources?.() || ctx.lookup(page.node.get(L.PDFName.of('Resources'))), vistos);
    return Math.max(total, 1);
  });
}

/** Páginas de muestra repartidas: la primera, la última, las más pesadas y algunas intermedias (1-based). */
export function elegirMuestra(pesos, max = 4) {
  const n = pesos.length;
  if (n <= max + 1) return null; // con pocas páginas se comprime el documento entero
  const elegidas = new Set([1, n]);
  const porPeso = pesos.map((w, i) => [w, i + 1]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of porPeso) { if (elegidas.size >= Math.ceil(max * 0.75) + 1) break; elegidas.add(i); }
  for (let k = 1; elegidas.size < max; k++) elegidas.add(Math.round((k * n) / (max + 1)) || 1);
  return [...elegidas].sort((a, b) => a - b);
}

/** Páginas «pesadas»: las de mayor peso hasta cubrir `fraccion` del total (al menos 1), 1-based y ordenadas. */
export function paginasPesadas(pesos, fraccion = 0.6) {
  const total = pesos.reduce((a, b) => a + b, 0);
  const orden = pesos.map((w, i) => [w, i + 1]).sort((a, b) => b[0] - a[0]);
  const out = []; let acum = 0;
  for (const [w, i] of orden) { out.push(i); acum += w; if (acum >= total * fraccion) break; }
  return out.sort((a, b) => a - b);
}
