// Motor del Compresor (INSTRUCTIONS 2.2, ADR-002, ADR-003, ADR-010, decisiones del dueño de la Fase 1).
//  - Cada pasada de Ghostscript corre en un worker NUEVO que se termina al acabar o al cancelar.
//  - Modo objetivo: búsqueda binaria con estimación por páginas de muestra y confirmación completa.
//  - Modo manual: DPI y calidad.
//  - Guarda: nunca se entrega un archivo mayor que el original, con otro número de páginas, que no abra,
//    o con páginas vacías que en el original tenían contenido.
//  - Escalera de emergencia si no llega a la meta: rasterizar páginas pesadas → todas → dividir en partes,
//    siempre informando del efecto.
import { runOnce, compileWasm, abortError } from '../../core/workers.js';
import { cargarPdfLib } from '../../engines/pdf/motores.js';
import { safeLoad } from '../../engines/pdf/pdf-open.js';
import { pagesStatus } from '../../engines/pdf/output-guard.js';
import { pesosPaginas, elegirMuestra, paginasPesadas } from '../../engines/pdf/pesos.js';
import { buildArgs, rasterArgs, conExtras } from './gs-args.js';
import { NIVELES, RASTER, PISO_DPI, ZONA_MIN } from './escala.js';
import { buscarNivel, estimarDesdeMuestra, planPartes } from './busqueda.js';

const WORKER = new URL('./gs-worker.js', import.meta.url).href;
const WASM = new URL('../../vendor/ghostpdl-wasm-1.1.0/gs.wasm', import.meta.url).href;

/** Una pasada de Ghostscript en un worker nuevo. `entrada` no se toca (se envía una copia). */
async function pasada(entrada, args, { signal, alPagina } = {}) {
  const modulo = await compileWasm(WASM);
  const copia = entrada.slice().buffer;
  const t0 = performance.now();
  const r = await runOnce(WORKER, { modulo, entrada: copia, args }, { transfer: [copia], signal, onProgress: alPagina, name: 'ghostscript' });
  return { datos: new Uint8Array(r.salida), bytes: r.salida.byteLength, ms: Math.round(performance.now() - t0) };
}

/** Datos del PDF de entrada con @cantoo/pdf-lib: páginas, pesos y estado de cada página. */
export async function analizar(bytes, password) {
  const L = await cargarPdfLib();
  let doc;
  try { doc = await safeLoad(L.PDFDocument, bytes, { updateMetadata: false, ...(password != null ? { password } : {}) }); }
  catch (e) {
    // Cifrado solo por el propietario y con permisos completos: pdf.js no pidió nada; se abre con contraseña vacía.
    if (password == null && /encrypted/i.test(String(e?.message))) doc = await safeLoad(L.PDFDocument, bytes, { updateMetadata: false, password: '' });
    else throw e;
  }
  return { paginas: doc.getPageCount(), pesos: pesosPaginas(L, doc), estados: pagesStatus(L, doc) };
}

/** Guarda de salida: abre, mismo número de páginas, sin páginas vacías nuevas y más pequeño que el original. */
export async function guarda(salida, original, analisis) {
  const L = await cargarPdfLib();
  let doc;
  try { doc = await L.PDFDocument.load(salida, { updateMetadata: false }); } catch (e) { return { ok: false, motivo: `el resultado no se puede abrir (${e.message.slice(0, 60)})` }; }
  const n = doc.getPageCount();
  if (n !== analisis.paginas) return { ok: false, motivo: `el resultado tiene ${n} páginas y el original ${analisis.paginas}` };
  const est = pagesStatus(L, doc);
  const vacias = est.flatMap((s, i) => (s !== 'contenido' && analisis.estados[i] === 'contenido' ? [i + 1] : []));
  if (vacias.length) return { ok: false, motivo: `quedaron páginas en blanco (${vacias.slice(0, 5).join(', ')})` };
  if (salida.length >= original.length) return { ok: false, mayor: true, motivo: 'el resultado no es más pequeño que el original' };
  return { ok: true };
}

/** Une páginas: `fuentes` = [{datos, paginas:[1-based del doc final que aporta en orden]}]. */
async function ensamblar(total, fuentes) {
  const L = await cargarPdfLib();
  const out = await L.PDFDocument.create();
  const mapa = new Array(total);
  const docs = [];
  for (const f of fuentes) {
    const d = await L.PDFDocument.load(f.datos, { updateMetadata: false });
    docs.push(d);
    f.paginas.forEach((p, k) => { mapa[p - 1] = { d, i: f.indices ? f.indices[k] : k }; });
  }
  for (let p = 0; p < total; p++) { const { d, i } = mapa[p]; const [pg] = await out.copyPages(d, [i]); out.addPage(pg); }
  return out.save({ useObjectStreams: true });
}

/** Extrae un rango de páginas (1-based) como PDF aparte. */
async function extraer(datos, paginas) {
  const L = await cargarPdfLib();
  const d = await L.PDFDocument.load(datos, { updateMetadata: false });
  const out = await L.PDFDocument.create();
  for (const pg of await out.copyPages(d, paginas.map((p) => p - 1))) out.addPage(pg);
  return out.save({ useObjectStreams: true });
}

/**
 * Comprime. modo: { tipo:'objetivo', objetivo } | { tipo:'manual', dpi, calidad, gris }.
 * Devuelve { archivos:[{datos, bytes, paginas:[a,b]}], efectos:[texto], nivel, dpi, calidad, pasadas, ms, original }.
 */
export async function comprimir(original, modo, { password, analisis, signal, alAvanzar = () => {} } = {}) {
  const t0 = performance.now();
  const a = analisis || await analizar(original, password);
  const extras = { password };
  let pasadas = 0; const efectos = [];
  const comprimirCon = async (nivel, { paginas, etiqueta } = {}) => {
    pasadas++;
    const args = conExtras(buildArgs({ dpi: nivel.dpi, quality: nivel.calidad, gray: !!nivel.gris }), { ...extras, paginas });
    return pasada(original, args, { signal, alPagina: (p) => alAvanzar({ fase: etiqueta || 'comprimir', ...p, pasada: pasadas }) });
  };
  const rasterizar = async (r, paginas) => {
    pasadas++;
    return pasada(original, conExtras(rasterArgs({ dpi: r.dpi, quality: r.calidad }), { ...extras, paginas }), { signal, alPagina: (p) => alAvanzar({ fase: 'rasterizar', ...p, pasada: pasadas }) });
  };
  const fin = (archivos, extra = {}) => ({ archivos, efectos, pasadas, ms: Math.round(performance.now() - t0), original: original.length, paginas: a.paginas, ...extra });

  // ---------- Modo manual ----------
  if (modo.tipo === 'manual') {
    const r = await comprimirCon({ dpi: modo.dpi, calidad: modo.calidad, gris: modo.gris });
    const g = await guarda(r.datos, original, a);
    if (!g.ok) return fin([], { fallo: g.motivo, sinMejora: !!g.mayor });
    if (modo.dpi < PISO_DPI) efectos.push(`Imágenes a ${modo.dpi} ppp: el texto escaneado puede verse borroso.`);
    if (modo.gris) efectos.push('Convertido a escala de grises.');
    return fin([{ datos: r.datos, bytes: r.bytes, paginas: [1, a.paginas] }], { dpi: modo.dpi, calidad: modo.calidad });
  }

  // ---------- Modo objetivo ----------
  const objetivo = modo.objetivo;
  if (original.length <= objetivo) return fin([], { yaCumple: true });
  const muestra = elegirMuestra(a.pesos);
  const busq = await buscarNivel({
    objetivo, niveles: NIVELES.length, zonaMin: ZONA_MIN,
    estimar: async (n) => {
      if (!muestra) return (await completoCache(n)).bytes;
      const r = await comprimirCon(NIVELES[n], { paginas: muestra, etiqueta: 'estimar' });
      return estimarDesdeMuestra(r.bytes, a.pesos, muestra);
    },
    completo: (n) => completoCache(n),
    alAvanzar: (e) => alAvanzar({ fase: e.fase === 'estimar' ? 'buscar' : 'confirmar', nivel: e.nivel, de: NIVELES.length }),
  });
  async function completoCache(n) {
    completoCache.c ||= new Map();
    if (!completoCache.c.has(n)) completoCache.c.set(n, await comprimirCon(NIVELES[n]));
    return completoCache.c.get(n);
  }
  const nivel = NIVELES[busq.nivel];
  if (busq.noMonotona) efectos.push('Aviso técnico: este PDF no reduce de forma regular con la escala (se eligió el mejor resultado medido).');
  if (busq.cumple) {
    const g = await guarda(busq.resultado.datos, original, a);
    if (g.ok) {
      if (nivel.dpi < PISO_DPI) efectos.push(`Para llegar a la meta las imágenes bajaron a ${nivel.dpi} ppp: el texto escaneado puede verse borroso.`);
      return fin([{ datos: busq.resultado.datos, bytes: busq.resultado.bytes, paginas: [1, a.paginas] }], { nivel: busq.nivel, dpi: nivel.dpi, calidad: nivel.calidad, busqueda: busq });
    }
    if (!g.mayor) throw new Error(`La comprobación del resultado falló: ${g.motivo}. No se entrega.`);
  }

  // ---------- Escalera de emergencia ----------
  // Mejor base disponible: la pasada completa más pequeña que pasó la guarda.
  const candidatos = [...(completoCache.c || new Map()).values()].sort((x, y) => x.bytes - y.bytes);
  let base = null;
  for (const c of candidatos) if ((await guarda(c.datos, original, a)).ok) { base = c; break; }
  if (!base) { const r = await completoCache(NIVELES.length - 1); if ((await guarda(r.datos, original, a)).ok) base = r; }
  const efectoNivel = `Imágenes a ${NIVELES[NIVELES.length - 1].dpi} ppp como máximo.`;

  // 1) Rasterizar solo las páginas pesadas (se unen con las demás ya comprimidas).
  if (base && a.paginas > 1) {
    alAvanzar({ fase: 'escalera', paso: 1 });
    const pesadas = paginasPesadas(a.pesos, 0.6);
    if (pesadas.length < a.paginas) {
      for (const r of RASTER.slice(0, 2)) {
        const ras = await rasterizar(r, pesadas);
        const ligeras = [...Array(a.paginas).keys()].map((i) => i + 1).filter((p) => !pesadas.includes(p));
        const datos = await ensamblar(a.paginas, [{ datos: ras.datos, paginas: pesadas }, { datos: base.datos, paginas: ligeras, indices: ligeras.map((p) => p - 1) }]);
        if (datos.length <= objetivo && (await guarda(datos, original, a)).ok) {
          efectos.push(efectoNivel, `${pesadas.length} de ${a.paginas} páginas se convirtieron en imagen (${r.dpi} ppp): en ellas el texto ya no se puede seleccionar ni buscar.`);
          return fin([{ datos, bytes: datos.length, paginas: [1, a.paginas] }], { escalera: 1, dpi: r.dpi, calidad: r.calidad });
        }
      }
    }
  }
  // 2) Rasterizar todas las páginas.
  alAvanzar({ fase: 'escalera', paso: 2 });
  let masPequeno = base;
  for (const r of RASTER) {
    const ras = await rasterizar(r);
    if (!(await guarda(ras.datos, original, a)).ok) continue;
    if (!masPequeno || ras.bytes < masPequeno.bytes) masPequeno = ras;
    if (ras.bytes <= objetivo) {
      efectos.push(`Todas las páginas se convirtieron en imagen (${r.dpi} ppp): el texto ya no se puede seleccionar ni buscar.`);
      return fin([{ datos: ras.datos, bytes: ras.bytes, paginas: [1, a.paginas] }], { escalera: 2, dpi: r.dpi, calidad: r.calidad });
    }
  }
  if (!masPequeno) return fin([], { fallo: 'no se pudo reducir este PDF sin dañarlo', sinMejora: true });

  // 3) Dividir en partes de como máximo la meta cada una.
  alAvanzar({ fase: 'escalera', paso: 3 });
  const L = await cargarPdfLib();
  const docMin = await L.PDFDocument.load(masPequeno.datos, { updateMetadata: false });
  const pesosMin = pesosPaginas(L, docMin);
  const escalaBytes = masPequeno.bytes / pesosMin.reduce((x, y) => x + y, 0);
  let plan = planPartes(pesosMin.map((w) => w * escalaBytes), objetivo * 0.92, 20000);
  if (!plan) return fin([], { fallo: 'al menos una página por sí sola pesa más que la meta, incluso como imagen', masPequeno: masPequeno.bytes });
  const partes = [];
  for (let k = 0; k < plan.length; k++) {
    if (signal?.aborted) throw abortError();
    const pags = plan[k];
    const datos = await extraer(masPequeno.datos, pags);
    if (datos.length > objetivo && pags.length > 1) { const mitad = Math.ceil(pags.length / 2); plan.splice(k + 1, 0, pags.slice(mitad)); plan[k] = pags.slice(0, mitad); k--; continue; }
    if (datos.length > objetivo) return fin([], { fallo: `la página ${pags[0]} por sí sola pesa más que la meta`, masPequeno: masPequeno.bytes });
    partes.push({ datos, bytes: datos.length, paginas: [pags[0], pags[pags.length - 1]] });
  }
  efectos.push(masPequeno === base ? efectoNivel : 'Todas las páginas se convirtieron en imagen: el texto ya no se puede seleccionar ni buscar.',
    `No cabía en un solo archivo: se dividió en ${partes.length} partes de menos de la meta cada una.`);
  return fin(partes, { escalera: 3 });
}
