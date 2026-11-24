// Proyectos (CONTEXT §9.0.b, ADR-006), a partir del spike S11.
//  - Los archivos se guardan en TROZOS de 8 MB: la memoria de guardar o importar es un trozo, no el archivo.
//  - Cada trozo se copia (bug de WebKit con File.slice()), se escribe en su propia transacción y se RELEE
//    de IndexedDB comparando tamaño y CRC antes de seguir (regla permanente, ADR-006 condición 1).
//  - El recurso (metadatos) se escribe al final: un archivo solo «existe» cuando todos sus trozos se verificaron.
//  - Exportar/importar un proyecto como ZIP (STORE) con el CRC-32 de cada archivo; importación trozo a trozo
//    con marca `importando` y limpieza al arrancar.
import { abrirDB, prom, fin } from './db.js';
import { crc32, crc32Blob, buildZip, readZip } from './zip.js';
import { publicar } from './hooks.js';

const FORMATO = 'mi-uni-proyecto/1';
export const TROZO = 8 * 1048576;
const uid = () => crypto.randomUUID();
const error = (msg, code) => Object.assign(new Error(msg), { code });
const rango = (rid) => IDBKeyRange.bound([rid, 0], [rid, Infinity]);
const ahoraISO = () => new Date().toISOString();

// WebKit en sesión efímera (como la navegación privada de Safari) rechaza Blobs con error null.
const errorTx = (tx) => tx.error || error('El navegador no permitió guardar el archivo (¿navegación privada?).', 'NO_GUARDA');
const hecho = (tx) => new Promise((ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = () => ko(errorTx(tx)); tx.onabort = () => ko(errorTx(tx)); });

async function retocar(id, campos) {
  const db = await abrirDB();
  const tx = db.transaction('proyectos', 'readwrite'); const st = tx.objectStore('proyectos');
  const p = await prom(st.get(id)); if (p) st.put({ ...p, ...campos }); await hecho(tx);
}

export async function crearProyecto(nombre) {
  const n = String(nombre || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!n) throw error('Ponle un nombre al proyecto.', 'SIN_NOMBRE');
  const p = { id: uid(), nombre: n, creado: ahoraISO() };
  const db = await abrirDB(); const tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(p); await hecho(tx);
  publicar('proyecto:creado', { proyectoId: p.id });
  return p;
}
export async function renombrarProyecto(id, nombre) {
  const n = String(nombre || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!n) throw error('Ponle un nombre al proyecto.', 'SIN_NOMBRE');
  await retocar(id, { nombre: n });
}
export async function obtenerProyecto(id) { const db = await abrirDB(); return prom(db.transaction('proyectos').objectStore('proyectos').get(id)); }
export async function listarProyectos() {
  const db = await abrirDB();
  const ps = (await prom(db.transaction('proyectos').objectStore('proyectos').getAll())).filter((p) => !p.importando);
  return ps.sort((a, b) => (b.modificado || b.creado).localeCompare(a.modificado || a.creado));
}
export async function listarRecursos(proyectoId) {
  const db = await abrirDB();
  const rs = await prom(db.transaction('recursos').objectStore('recursos').index('proyectoId').getAll(proyectoId));
  return rs.sort((a, b) => b.creado.localeCompare(a.creado));
}
/** Tamaño total por proyecto (la cuenta propia: storage.estimate() no sirve en WebKit, S11). */
export async function espacioUsado() {
  const db = await abrirDB();
  const rs = await prom(db.transaction('recursos').objectStore('recursos').getAll());
  const por = {}; let total = 0;
  for (const r of rs) { por[r.proyectoId] = (por[r.proyectoId] || 0) + r.size; total += r.size; }
  return { total, por, archivos: rs.length };
}

/** Blob del recurso armado con sus trozos (sin copiar datos). */
export async function leerRecurso(id) {
  const db = await abrirDB();
  const r = await prom(db.transaction('recursos').objectStore('recursos').get(id));
  if (!r) return null;
  const partes = await prom(db.transaction('trozos').objectStore('trozos').getAll(rango(id)));
  return new Blob(partes.map((p) => p.blob), { type: r.mime });
}

async function borrarTrozos(rid) { const db = await abrirDB(); const tx = db.transaction('trozos', 'readwrite'); tx.objectStore('trozos').delete(rango(rid)); await hecho(tx); }

/** Escribe `blob` en trozos con verificación después de escribir. `esperado` (al importar): { size, crc32 }. */
async function escribirTrozos(rid, blob, { trozo = TROZO, esperado, alAvanzar, signal } = {}) {
  const db = await abrirDB();
  let crc = 0, i = 0, off = 0;
  try {
    do {
      if (signal?.aborted) throw error('Cancelado.', 'CANCELADO');
      const end = Math.min(off + trozo, blob.size);
      const bytes = new Uint8Array(await blob.slice(off, end).arrayBuffer()); // copia: evita el bug de WebKit
      const c = crc32(bytes); crc = crc32(bytes, crc);
      const tx = db.transaction('trozos', 'readwrite');
      tx.objectStore('trozos').put({ rid, i, size: bytes.length, crc32: c, blob: new Blob([bytes]) });
      await hecho(tx);
      const vuelta = await prom(db.transaction('trozos').objectStore('trozos').get([rid, i]));
      if (!vuelta || vuelta.blob.size !== bytes.length || (await crc32Blob(vuelta.blob)) !== c) {
        throw error('El navegador no guardó bien el archivo (la verificación falló). No se confirmó nada.', 'VERIFICACION');
      }
      off = end; i++;
      alAvanzar?.(off, blob.size);
    } while (off < blob.size);
    if (esperado && (blob.size !== esperado.size || crc !== esperado.crc32)) throw error('El archivo está dañado (no coincide con el del respaldo).', 'ZIP_INVALIDO');
    return { size: blob.size, crc32: crc, trozos: i };
  } catch (e) {
    await borrarTrozos(rid).catch(() => {});
    if (e?.name === 'QuotaExceededError') throw error('No queda espacio en el teléfono para guardar este archivo.', 'SIN_ESPACIO');
    throw e;
  }
}

/**
 * Guarda un Blob/File como recurso del proyecto. Solo se confirma si todos los trozos se verificaron.
 * tipo: 'documento' | 'referencia' | 'nota' | … (CONTEXT §8.6). origen: módulo que lo generó (opcional).
 */
export async function guardarRecurso(proyectoId, blob, { nombre, tipo = 'documento', origen, alAvanzar, signal } = {}) {
  if (!(await obtenerProyecto(proyectoId))) throw error('Ese proyecto ya no existe.', 'SIN_PROYECTO');
  const id = uid();
  const w = await escribirTrozos(id, blob, { alAvanzar, signal });
  const ahora = ahoraISO();
  const r = { id, proyectoId, nombre: String(nombre || 'archivo').slice(0, 200), tipo, origen, mime: blob.type || 'application/octet-stream', size: w.size, crc32: w.crc32, trozos: w.trozos, creado: ahora };
  const db = await abrirDB(); const tx = db.transaction('recursos', 'readwrite'); tx.objectStore('recursos').put(r); await hecho(tx);
  await retocar(proyectoId, { modificado: ahora });
  publicar(tipo === 'documento' ? 'documento:generado' : `${tipo}:añadido`, { proyectoId, recursoId: id, origen });
  return r;
}

export async function borrarRecurso(id) {
  const db = await abrirDB();
  const r = await prom(db.transaction('recursos').objectStore('recursos').get(id)); if (!r) return;
  const tx = db.transaction(['recursos', 'trozos'], 'readwrite');
  tx.objectStore('recursos').delete(id); tx.objectStore('trozos').delete(rango(id)); await hecho(tx);
  await retocar(r.proyectoId, { modificado: ahoraISO() });
}

export async function borrarProyecto(id) {
  const db = await abrirDB();
  const rs = await prom(db.transaction('recursos').objectStore('recursos').index('proyectoId').getAll(id));
  const tx = db.transaction(['proyectos', 'recursos', 'trozos'], 'readwrite');
  tx.objectStore('proyectos').delete(id);
  for (const r of rs) { tx.objectStore('recursos').delete(r.id); tx.objectStore('trozos').delete(rango(r.id)); }
  await hecho(tx);
}

/** Borra importaciones a medias y trozos sin recurso confirmado (pestaña cerrada a mitad). Se llama al arrancar. */
export async function limpiarIncompletos() {
  const db = await abrirDB();
  const malos = (await prom(db.transaction('proyectos').objectStore('proyectos').getAll())).filter((p) => p.importando);
  for (const p of malos) await borrarProyecto(p.id);
  const conocidos = new Set(await prom(db.transaction('recursos').objectStore('recursos').getAllKeys()));
  const claves = await prom(db.transaction('trozos').objectStore('trozos').getAllKeys());
  const huerfanos = [...new Set(claves.map((k) => k[0]).filter((rid) => !conocidos.has(rid)))];
  for (const rid of huerfanos) await borrarTrozos(rid);
  return { proyectos: malos.length, trozosHuerfanos: huerfanos.length };
}

const seguro = (s) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);
export const nombreZip = (p, fecha = new Date()) => `${seguro(p.nombre)} - respaldo ${fecha.toISOString().slice(0, 10)}.zip`;

/** Proyecto → Blob ZIP (sin copiar datos). Marca la fecha del respaldo al generarlo (antes de la descarga). */
export async function exportarProyecto(id) {
  const p = await obtenerProyecto(id);
  if (!p) throw error('Ese proyecto ya no existe.', 'SIN_PROYECTO');
  const rs = await listarRecursos(id);
  const archivos = []; const meta = [];
  for (const r of rs) {
    const path = `archivos/${r.id}-${seguro(r.nombre)}`;
    archivos.push({ name: path, blob: await leerRecurso(r.id), crc32: r.crc32 });
    const { trozos, ...m } = r; meta.push({ ...m, path });
  }
  const fecha = ahoraISO();
  const manif = new Blob([JSON.stringify({ formato: FORMATO, exportado: fecha, proyecto: { ...p, ultimoRespaldo: fecha }, recursos: meta }, null, 1)], { type: 'application/json' });
  const zip = buildZip([{ name: 'proyecto.json', blob: manif, crc32: await crc32Blob(manif) }, ...archivos]);
  await retocar(id, { ultimoRespaldo: fecha });
  return { zip, nombre: nombreZip(p, new Date(fecha)), bytes: zip.size };
}

/**
 * ZIP → proyecto nuevo, archivo por archivo y trozo por trozo (memoria: ~1 trozo).
 * Si el mismo proyecto ya existe, se crea una copia con ids nuevos. Si algo falla, se borra todo lo escrito.
 */
export async function importarProyecto(file, { alAvanzar } = {}) {
  let entradas;
  try { entradas = await readZip(file); } catch (e) { throw error(`El archivo no es un ZIP válido (${e.message}).`, 'NO_PROYECTO'); }
  const porNombre = new Map(entradas.map((e) => [e.name, e]));
  const me = porNombre.get('proyecto.json');
  if (!me) throw error('Este ZIP no es un proyecto de Mi Uni (falta proyecto.json).', 'NO_PROYECTO');
  let man; try { man = JSON.parse(await (await me.blob()).text()); } catch { throw error('El proyecto.json del ZIP está dañado.', 'ZIP_INVALIDO'); }
  if (man.formato !== FORMATO) throw error(`Formato de proyecto no reconocido: ${man.formato}`, 'NO_PROYECTO');
  for (const r of man.recursos) if (!porNombre.has(r.path)) throw error(`Falta ${r.path} en el ZIP.`, 'ZIP_INVALIDO');
  const total = man.recursos.reduce((a, r) => a + r.size, 0);
  const existe = !!(await obtenerProyecto(man.proyecto.id));
  const pid = existe ? uid() : man.proyecto.id;
  const ahora = ahoraISO();
  const proyecto = { ...man.proyecto, id: pid, nombre: existe ? `${man.proyecto.nombre} (copia)` : man.proyecto.nombre, importado: ahora, modificado: man.proyecto.modificado || ahora, ultimoRespaldo: man.exportado };
  const db = await abrirDB();
  let tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put({ ...proyecto, importando: true }); await hecho(tx);
  let hechos = 0;
  try {
    for (const src of man.recursos) {
      const e = porNombre.get(src.path);
      if (e.size !== src.size) throw error(`${src.nombre}: tamaño distinto.`, 'ZIP_INVALIDO');
      const r = { ...src, id: existe ? uid() : src.id, proyectoId: pid }; delete r.path;
      const base = hechos;
      const w = await escribirTrozos(r.id, await e.blob(), { esperado: src, alAvanzar: alAvanzar && ((b) => alAvanzar(base + b, total)) })
        .catch((x) => { x.message = `${src.nombre}: ${x.message}`; throw x; });
      hechos += src.size;
      tx = db.transaction('recursos', 'readwrite'); tx.objectStore('recursos').put({ ...r, trozos: w.trozos }); await hecho(tx);
    }
    tx = db.transaction('proyectos', 'readwrite'); tx.objectStore('proyectos').put(proyecto); await hecho(tx);
  } catch (e) {
    await borrarProyecto(pid).catch(() => {});
    throw e;
  }
  return { id: pid, copia: existe, recursos: man.recursos.length, bytes: total };
}
