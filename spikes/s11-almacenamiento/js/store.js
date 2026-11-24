// Almacén de proyectos del spike S11 sobre IndexedDB: proyectos, recursos (metadatos) y blobs (datos).
// Exportar/importar un proyecto como ZIP (STORE) usando el CRC-32 guardado con cada recurso.
import { crc32Blob, buildZip, readZip } from './zip.js';

const DB = 'mi-uni-s11';
const FORMAT = 'mi-uni-proyecto/1';
const uid = () => crypto.randomUUID();

export function openDB() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('proyectos', { keyPath: 'id' });
      db.createObjectStore('recursos', { keyPath: 'id' }).createIndex('proyectoId', 'proyectoId');
      db.createObjectStore('blobs', { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
    r.onblocked = () => ko(new Error('Otra pestaña tiene abierta una versión vieja de la base de datos.'));
  });
}

// WebKit en sesión efímera (como la navegación privada de Safari) rechaza Blobs con error null.
const txError = (tx) => tx.error || Object.assign(new Error('El navegador no permitió guardar el archivo (¿navegación privada?).'), { code: 'STORE_REFUSED' });
const done = (tx) => new Promise((ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = () => ko(txError(tx)); tx.onabort = () => ko(txError(tx)); });
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

export async function createProject(db, nombre) {
  const p = { id: uid(), nombre, creado: new Date().toISOString() };
  const tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(p); await done(tx);
  return p;
}

/** Guarda un Blob/File como recurso. El CRC se calcula aquí (una lectura) para exportar luego sin releer. */
export async function saveResource(db, proyectoId, blob, { nombre, tipo = 'documento' }) {
  const crc32 = await crc32Blob(blob);
  const r = { id: uid(), proyectoId, nombre, tipo, mime: blob.type || 'application/octet-stream', size: blob.size, crc32, creado: new Date().toISOString() };
  const tx = db.transaction(['recursos', 'blobs'], 'readwrite');
  tx.objectStore('blobs').put({ id: r.id, blob });
  tx.objectStore('recursos').put(r);
  await done(tx);
  return r;
}

export async function listResources(db, proyectoId) {
  return req(db.transaction('recursos').objectStore('recursos').index('proyectoId').getAll(proyectoId));
}
export async function getBlob(db, id) {
  const x = await req(db.transaction('blobs').objectStore('blobs').get(id));
  return x && x.blob;
}
export async function getProject(db, id) { return req(db.transaction('proyectos').objectStore('proyectos').get(id)); }

export async function deleteProject(db, id) {
  const rs = await listResources(db, id);
  const tx = db.transaction(['proyectos', 'recursos', 'blobs'], 'readwrite');
  tx.objectStore('proyectos').delete(id);
  for (const r of rs) { tx.objectStore('recursos').delete(r.id); tx.objectStore('blobs').delete(r.id); }
  await done(tx);
}

const safe = (s) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);

/** Proyecto → Blob ZIP. No copia los datos: compone los Blobs de IndexedDB. */
export async function exportProject(db, id) {
  const p = await getProject(db, id);
  const rs = await listResources(db, id);
  const files = []; const meta = [];
  for (const r of rs) {
    const path = `archivos/${r.id}-${safe(r.nombre)}`;
    files.push({ name: path, blob: await getBlob(db, r.id), crc32: r.crc32 });
    meta.push({ ...r, path });
  }
  const manifest = new Blob([JSON.stringify({ formato: FORMAT, exportado: new Date().toISOString(), proyecto: p, recursos: meta }, null, 1)], { type: 'application/json' });
  return buildZip([{ name: 'proyecto.json', blob: manifest, crc32: await crc32Blob(manifest) }, ...files]);
}

/**
 * Copia los bytes a un Blob nuevo. Necesario en WebKit: un slice() de un File guardado en IndexedDB
 * se relee como el File ENTERO (medido en WebKit 26.6; ver README de S11). Cuesta memoria = tamaño del archivo.
 */
export async function materialize(blob, type) {
  return new Blob([await blob.arrayBuffer()], { type: type || blob.type });
}

async function verifyStored(db, r) {
  const b = await getBlob(db, r.id);
  return !!b && b.size === r.size && (await crc32Blob(b)) === r.crc32;
}

/** Borra proyectos cuya importación quedó a medias (pestaña cerrada, sin espacio...). Llamar al arrancar. */
export async function cleanupIncompleteImports(db) {
  const all = await req(db.transaction('proyectos').objectStore('proyectos').getAll());
  const bad = all.filter((p) => p.importando);
  for (const p of bad) await deleteProject(db, p.id);
  return bad.length;
}

/**
 * ZIP → proyecto nuevo.
 * 1) Lee el manifiesto y verifica tamaño y CRC de cada archivo (lectura en streaming, sin escribir nada).
 * 2) Crea el proyecto marcado `importando` y escribe un archivo por transacción (memoria: un archivo a la vez),
 *    releyendo cada uno desde IndexedDB para comprobar su CRC.
 * 3) Quita la marca. Si algo falla, borra lo escrito. Si el id ya existe, importa como copia con ids nuevos.
 */
export async function importProject(db, file, { verify = true, verifyAfterWrite = true } = {}) {
  const entries = await readZip(file);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const me = byName.get('proyecto.json');
  if (!me) throw Object.assign(new Error('El ZIP no es un proyecto de Mi Uni (falta proyecto.json).'), { code: 'NOT_PROJECT' });
  const man = JSON.parse(await (await me.blob()).text());
  if (man.formato !== FORMAT) throw Object.assign(new Error(`Formato de proyecto no reconocido: ${man.formato}`), { code: 'NOT_PROJECT' });
  const need = man.recursos.reduce((a, r) => a + r.size, 0);
  // Ojo: en WebKit estimate() no cuenta los blobs (usage = 0). Es solo una guía; el error real es QuotaExceededError.
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    if (quota - usage < need * 1.1) throw Object.assign(new Error(`No hay espacio: hacen falta ${(need / 1048576).toFixed(0)} MB.`), { code: 'NO_SPACE' });
  }
  const plan = [];
  for (const r of man.recursos) {
    const e = byName.get(r.path);
    if (!e) throw Object.assign(new Error(`Falta ${r.path} en el ZIP.`), { code: 'ZIP_INVALID' });
    const blob = await e.blob();
    if (blob.size !== r.size) throw Object.assign(new Error(`${r.nombre}: tamaño distinto.`), { code: 'ZIP_INVALID' });
    if (verify && (await crc32Blob(blob)) !== r.crc32) throw Object.assign(new Error(`${r.nombre}: el archivo está dañado (CRC).`), { code: 'ZIP_INVALID' });
    plan.push({ r, blob });
  }
  const exists = !!(await getProject(db, man.proyecto.id));
  const pid = exists ? uid() : man.proyecto.id;
  const proyecto = { ...man.proyecto, id: pid, nombre: exists ? man.proyecto.nombre + ' (copia)' : man.proyecto.nombre, importado: new Date().toISOString() };
  let tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put({ ...proyecto, importando: true }); await done(tx);
  try {
    for (const { r: src, blob } of plan) {
      const r = { ...src, id: exists ? uid() : src.id, proyectoId: pid }; delete r.path;
      const data = await materialize(blob, r.mime);
      tx = db.transaction(['recursos', 'blobs'], 'readwrite');
      tx.objectStore('blobs').put({ id: r.id, blob: data }); tx.objectStore('recursos').put(r);
      await done(tx);
      if (verifyAfterWrite && !(await verifyStored(db, r))) throw Object.assign(new Error(`${r.nombre}: el navegador no lo guardó bien.`), { code: 'WRITE_MISMATCH' });
    }
    tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(proyecto); await done(tx);
  } catch (e) {
    await deleteProject(db, pid).catch(() => {});
    throw e;
  }
  return { id: pid, copia: exists, recursos: plan.length, bytes: need };
}
