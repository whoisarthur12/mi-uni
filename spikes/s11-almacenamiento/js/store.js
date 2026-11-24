// Almacén de proyectos del spike S11 sobre IndexedDB (ADR-006).
// - Los archivos se guardan en TROZOS (por defecto 8 MB): la memoria de guardar/importar es un trozo,
//   no el archivo entero. Cada trozo se copia (bug de WebKit con slice()), se escribe en su propia
//   transacción y se RELEE desde IndexedDB comparando tamaño y CRC antes de seguir.
// - El recurso (metadatos) se escribe al final: un archivo solo "existe" cuando todos sus trozos se verificaron.
// - Exportar/importar un proyecto como ZIP (STORE) con el CRC-32 de cada archivo.
import { crc32, crc32Blob, buildZip, readZip } from './zip.js';

const DB = 'mi-uni-s11';
const FORMAT = 'mi-uni-proyecto/1';
export const DEFAULT_CHUNK = 8 * 1048576;
const uid = () => crypto.randomUUID();
const err = (msg, code) => Object.assign(new Error(msg), { code });

export function openDB() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = (ev) => {
      const db = r.result;
      if (ev.oldVersion < 1) {
        db.createObjectStore('proyectos', { keyPath: 'id' });
        db.createObjectStore('recursos', { keyPath: 'id' }).createIndex('proyectoId', 'proyectoId');
      }
      // v2: blobs por trozo, clave [recursoId, índice]. (El spike no migra datos de v1: los borra.)
      if (db.objectStoreNames.contains('blobs')) db.deleteObjectStore('blobs');
      db.createObjectStore('trozos', { keyPath: ['rid', 'i'] });
      if (ev.oldVersion >= 1) r.transaction.objectStore('recursos').clear();
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
    r.onblocked = () => ko(new Error('Otra pestaña tiene abierta una versión vieja de la base de datos.'));
  });
}

// WebKit en sesión efímera (como la navegación privada de Safari) rechaza Blobs con error null.
const txError = (tx) => tx.error || err('El navegador no permitió guardar el archivo (¿navegación privada?).', 'STORE_REFUSED');
const done = (tx) => new Promise((ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = () => ko(txError(tx)); tx.onabort = () => ko(txError(tx)); });
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const range = (rid) => IDBKeyRange.bound([rid, 0], [rid, Infinity]);

async function touch(db, proyectoId, fields) {
  const tx = db.transaction('proyectos', 'readwrite'); const st = tx.objectStore('proyectos');
  const p = await req(st.get(proyectoId)); if (p) st.put({ ...p, ...fields }); await done(tx);
}

export async function createProject(db, nombre) {
  const p = { id: uid(), nombre, creado: new Date().toISOString() };
  const tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(p); await done(tx);
  return p;
}
export async function getProject(db, id) { return req(db.transaction('proyectos').objectStore('proyectos').get(id)); }
export async function listProjects(db) { return req(db.transaction('proyectos').objectStore('proyectos').getAll()); }
export async function listResources(db, proyectoId) {
  return req(db.transaction('recursos').objectStore('recursos').index('proyectoId').getAll(proyectoId));
}

/** Blob del recurso armado con sus trozos (sin copiar datos: son Blobs respaldados por IndexedDB). */
export async function getBlob(db, id) {
  const r = await req(db.transaction('recursos').objectStore('recursos').get(id));
  if (!r) return null;
  const parts = await req(db.transaction('trozos').objectStore('trozos').getAll(range(id)));
  return new Blob(parts.map((p) => p.blob), { type: r.mime });
}

async function deleteChunks(db, rid) {
  const tx = db.transaction('trozos', 'readwrite'); tx.objectStore('trozos').delete(range(rid)); await done(tx);
}

/**
 * Escribe `blob` en trozos con verificación después de escribir. Devuelve { size, crc32, chunks }.
 * `expected` (opcional, al importar): { size, crc32 } — si no coincide, borra lo escrito y falla.
 * Memoria: ~1 trozo (la copia) a la vez.
 */
async function writeChunks(db, rid, blob, { chunk = DEFAULT_CHUNK, expected, onProgress } = {}) {
  let crc = 0, i = 0, off = 0;
  try {
    do {
      const end = Math.min(off + chunk, blob.size);
      const bytes = new Uint8Array(await blob.slice(off, end).arrayBuffer()); // copia: evita el bug de WebKit
      const ccrc = crc32(bytes);
      crc = crc32(bytes, crc);
      const tx = db.transaction('trozos', 'readwrite');
      tx.objectStore('trozos').put({ rid, i, size: bytes.length, crc32: ccrc, blob: new Blob([bytes]) });
      await done(tx);
      // Verificar después de escribir (regla permanente, ADR-006 condición 1).
      const back = await req(db.transaction('trozos').objectStore('trozos').get([rid, i]));
      if (!back || back.blob.size !== bytes.length || (await crc32Blob(back.blob)) !== ccrc) {
        throw err('El navegador no guardó bien el archivo (la verificación falló). No se confirmó nada.', 'WRITE_MISMATCH');
      }
      off = end; i++;
      if (onProgress) onProgress(off, blob.size);
    } while (off < blob.size);
    if (expected && (blob.size !== expected.size || crc !== expected.crc32)) throw err('El archivo está dañado (CRC distinto al del respaldo).', 'ZIP_INVALID');
    return { size: blob.size, crc32: crc, chunks: i };
  } catch (e) {
    await deleteChunks(db, rid).catch(() => {});
    throw e;
  }
}

/** Guarda un Blob/File como recurso. Solo se confirma (registro en `recursos`) si todos los trozos se verificaron. */
export async function saveResource(db, proyectoId, blob, { nombre, tipo = 'documento', chunk } = {}) {
  const id = uid();
  const w = await writeChunks(db, id, blob, { chunk });
  const now = new Date().toISOString();
  const r = { id, proyectoId, nombre, tipo, mime: blob.type || 'application/octet-stream', size: w.size, crc32: w.crc32, chunks: w.chunks, creado: now };
  const tx = db.transaction('recursos', 'readwrite'); tx.objectStore('recursos').put(r); await done(tx);
  await touch(db, proyectoId, { modificado: now });
  return r;
}

export async function deleteProject(db, id) {
  const rs = await listResources(db, id);
  const tx = db.transaction(['proyectos', 'recursos', 'trozos'], 'readwrite');
  tx.objectStore('proyectos').delete(id);
  for (const r of rs) { tx.objectStore('recursos').delete(r.id); tx.objectStore('trozos').delete(range(r.id)); }
  await done(tx);
}

/** Borra importaciones a medias y trozos sin recurso confirmado (pestaña cerrada a mitad). Llamar al arrancar. */
export async function cleanupIncomplete(db) {
  const bad = (await listProjects(db)).filter((p) => p.importando);
  for (const p of bad) await deleteProject(db, p.id);
  const known = new Set((await req(db.transaction('recursos').objectStore('recursos').getAllKeys())));
  const keys = await req(db.transaction('trozos').objectStore('trozos').getAllKeys());
  const orphans = [...new Set(keys.map((k) => k[0]).filter((rid) => !known.has(rid)))];
  for (const rid of orphans) await deleteChunks(db, rid);
  return { proyectos: bad.length, trozosHuerfanos: orphans.length };
}

const safe = (s) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);

/** Proyecto → Blob ZIP (sin copiar datos) y registra la fecha del respaldo. */
export async function exportProject(db, id) {
  const p = await getProject(db, id);
  const rs = await listResources(db, id);
  const files = []; const meta = [];
  for (const r of rs) {
    const path = `archivos/${r.id}-${safe(r.nombre)}`;
    files.push({ name: path, blob: await getBlob(db, r.id), crc32: r.crc32 });
    const { chunks, ...m } = r; meta.push({ ...m, path });
  }
  const manifest = new Blob([JSON.stringify({ formato: FORMAT, exportado: new Date().toISOString(), proyecto: p, recursos: meta }, null, 1)], { type: 'application/json' });
  const zip = buildZip([{ name: 'proyecto.json', blob: manifest, crc32: await crc32Blob(manifest) }, ...files]);
  // Se marca al generar el ZIP. En producción: al confirmar el guardado (FS Access) o al iniciar la descarga.
  await touch(db, id, { ultimoRespaldo: new Date().toISOString() });
  return zip;
}

/**
 * ZIP → proyecto nuevo, archivo por archivo y trozo por trozo (memoria: ~1 trozo).
 * El CRC se comprueba mientras se escribe (una sola lectura del ZIP); si falla, se borra todo lo escrito.
 * El proyecto queda marcado `importando` hasta el final (cleanupIncomplete lo borra si se corta).
 */
export async function importProject(db, file, { chunk, onProgress } = {}) {
  const entries = await readZip(file);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const me = byName.get('proyecto.json');
  if (!me) throw err('El ZIP no es un proyecto de Mi Uni (falta proyecto.json).', 'NOT_PROJECT');
  const man = JSON.parse(await (await me.blob()).text());
  if (man.formato !== FORMAT) throw err(`Formato de proyecto no reconocido: ${man.formato}`, 'NOT_PROJECT');
  for (const r of man.recursos) if (!byName.has(r.path)) throw err(`Falta ${r.path} en el ZIP.`, 'ZIP_INVALID');
  const need = man.recursos.reduce((a, r) => a + r.size, 0);
  // En WebKit estimate() no cuenta los blobs (usage = 0): solo es una guía; el error real es QuotaExceededError.
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    if (quota - usage < need * 1.1) throw err(`No hay espacio: hacen falta ${(need / 1048576).toFixed(0)} MB.`, 'NO_SPACE');
  }
  const exists = !!(await getProject(db, man.proyecto.id));
  const pid = exists ? uid() : man.proyecto.id;
  const now = new Date().toISOString();
  const proyecto = { ...man.proyecto, id: pid, nombre: exists ? man.proyecto.nombre + ' (copia)' : man.proyecto.nombre, importado: now, modificado: now, ultimoRespaldo: man.exportado };
  let tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put({ ...proyecto, importando: true }); await done(tx);
  let doneBytes = 0;
  try {
    for (const src of man.recursos) {
      const e = byName.get(src.path);
      if (e.size !== src.size) throw err(`${src.nombre}: tamaño distinto.`, 'ZIP_INVALID');
      const r = { ...src, id: exists ? uid() : src.id, proyectoId: pid }; delete r.path;
      const base = doneBytes;
      const w = await writeChunks(db, r.id, await e.blob(), { chunk, expected: src, onProgress: onProgress && ((b) => onProgress(base + b, need)) })
        .catch((x) => { x.message = `${src.nombre}: ${x.message}`; throw x; });
      doneBytes += src.size;
      tx = db.transaction('recursos', 'readwrite'); tx.objectStore('recursos').put({ ...r, chunks: w.chunks }); await done(tx);
    }
    tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(proyecto); await done(tx);
  } catch (e) {
    await deleteProject(db, pid).catch(() => {});
    throw e;
  }
  return { id: pid, copia: exists, recursos: man.recursos.length, bytes: need };
}
