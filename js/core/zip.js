// ZIP propio sin dependencias (ADR-006, S11): escribe STORE; lee STORE y DEFLATE (DecompressionStream). Sin ZIP64.
// - Escritura en modo STORE (sin comprimir: PDFs e imágenes ya vienen comprimidos) a partir de Blobs,
//   con el CRC-32 calculado de antemano: el ZIP se arma componiendo Blobs, sin copiar los datos.
// - Lectura de STORE y DEFLATE (con DecompressionStream, si existe) para ZIPs rehechos con otra herramienta.
// - Sin ZIP64: máximo 65.535 entradas y 4 GiB por archivo y en total. Se valida y se avisa.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

/** CRC-32 incremental: crc32(b2, crc32(b1)). */
export function crc32(bytes, prev = 0) {
  let c = ~prev >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** CRC-32 de un Blob leyéndolo por trozos (no lo carga entero en memoria). */
export async function crc32Blob(blob) {
  let c = 0;
  const reader = blob.stream().getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) return c; c = crc32(value, c); }
}

const MAX32 = 0xffffffff;
const enc = new TextEncoder();

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/**
 * entries: [{ name, blob, crc32, date? }] → Blob del ZIP.
 * Lanza un error con code 'ZIP_LIMIT' si se pasan los límites del formato sin ZIP64.
 */
export function buildZip(entries, { now = new Date() } = {}) {
  if (entries.length > 0xffff) throw Object.assign(new Error('Demasiados archivos para un ZIP (máximo 65.535).'), { code: 'ZIP_LIMIT' });
  const parts = []; const central = []; let offset = 0; const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.name)) throw new Error(`Nombre repetido en el ZIP: ${e.name}`);
    seen.add(e.name);
    const name = enc.encode(e.name); const size = e.blob.size;
    if (size > MAX32 || offset > MAX32) throw Object.assign(new Error('El proyecto supera 4 GiB: exporta por partes.'), { code: 'ZIP_LIMIT' });
    const { time, date } = dosDateTime(e.date || now);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, e.crc32 >>> 0, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, e.blob);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, e.crc32 >>> 0, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((a, p) => a + p.byteLength, 0);
  if (offset + cdSize > MAX32) throw Object.assign(new Error('El proyecto supera 4 GiB: exporta por partes.'), { code: 'ZIP_LIMIT' });
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

const u8 = async (blob) => new Uint8Array(await blob.arrayBuffer());

/** Lee el directorio central. Devuelve [{ name, method, crc32, size, csize, blob() }] sin leer los datos. */
export async function readZip(file) {
  const tailLen = Math.min(file.size, 22 + 0xffff);
  const tail = await u8(file.slice(file.size - tailLen));
  let p = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 5 && tail[i + 3] === 6) { p = i; break; }
  if (p < 0) throw Object.assign(new Error('No es un ZIP válido (falta el directorio central).'), { code: 'ZIP_INVALID' });
  const ev = new DataView(tail.buffer, tail.byteOffset + p);
  const count = ev.getUint16(10, true), cdSize = ev.getUint32(12, true), cdOff = ev.getUint32(16, true);
  if (count === 0xffff || cdOff === MAX32) throw Object.assign(new Error('ZIP64 no soportado.'), { code: 'ZIP_UNSUPPORTED' });
  if (cdOff + cdSize > file.size) throw Object.assign(new Error('ZIP truncado o dañado.'), { code: 'ZIP_INVALID' });
  const cd = await u8(file.slice(cdOff, cdOff + cdSize));
  const dv = new DataView(cd.buffer); const dec = new TextDecoder();
  const out = []; let q = 0;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(q, true) !== 0x02014b50) throw Object.assign(new Error('Directorio central dañado.'), { code: 'ZIP_INVALID' });
    const flags = dv.getUint16(q + 8, true), method = dv.getUint16(q + 10, true), crc = dv.getUint32(q + 16, true);
    const csize = dv.getUint32(q + 20, true), size = dv.getUint32(q + 24, true);
    const nl = dv.getUint16(q + 28, true), xl = dv.getUint16(q + 30, true), cl = dv.getUint16(q + 32, true), lo = dv.getUint32(q + 42, true);
    const name = dec.decode(cd.subarray(q + 46, q + 46 + nl));
    if (flags & 1) throw Object.assign(new Error(`${name}: ZIP cifrado no soportado.`), { code: 'ZIP_UNSUPPORTED' });
    out.push({ name, method, crc32: crc, size, csize, localOffset: lo });
    q += 46 + nl + xl + cl;
  }
  for (const e of out) {
    const lh = new DataView((await u8(file.slice(e.localOffset, e.localOffset + 30))).buffer);
    if (lh.getUint32(0, true) !== 0x04034b50) throw Object.assign(new Error(`${e.name}: cabecera local dañada.`), { code: 'ZIP_INVALID' });
    const start = e.localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    if (start + e.csize > file.size) throw Object.assign(new Error(`${e.name}: datos truncados.`), { code: 'ZIP_INVALID' });
    const raw = file.slice(start, start + e.csize);
    e.blob = async () => {
      if (e.method === 0) return raw;
      if (e.method === 8 && typeof DecompressionStream !== 'undefined') return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      throw Object.assign(new Error(`${e.name}: método de compresión ${e.method} no soportado.`), { code: 'ZIP_UNSUPPORTED' });
    };
  }
  return out;
}
