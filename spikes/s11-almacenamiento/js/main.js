// Página de medición S11 (también para el celular del dueño: "Copiar resultados").
import * as S from './store.js';
import { crc32Blob } from './zip.js';
import { backupStatus } from './backup-policy.js';

const $ = (s) => document.querySelector(s);
const MB = 1048576;
const results = { ua: navigator.userAgent, deviceMemory: navigator.deviceMemory || null, runs: [] };
const log = (k, v) => { results.runs.push({ k, ...v }); $('#out').textContent = JSON.stringify(results, null, 1); };
const ms = (t0) => Math.round(performance.now() - t0);
const estimate = async () => { if (!navigator.storage?.estimate) return null; const e = await navigator.storage.estimate(); return { usageMB: +(e.usage / MB).toFixed(1), quotaMB: Math.round(e.quota / MB) }; };

/** Blob de `mb` MB con bytes aleatorios (incompresible, como un PDF o JPEG). */
function randomBlob(mb, type = 'application/pdf') {
  const parts = [];
  for (let i = 0; i < mb; i++) { const c = new Uint8Array(MB); for (let j = 0; j < MB; j += 65536) crypto.getRandomValues(c.subarray(j, j + 65536)); parts.push(c); }
  return new Blob(parts, { type });
}

let db;
// Tamaño de trozo (MB) elegido en la página; 0 = archivo entero en un solo trozo (para comparar memoria).
const chunkBytes = () => { const v = +($('#chunk') ? $('#chunk').value : 8); return v ? v * MB : Number.MAX_SAFE_INTEGER; };
async function ready() { if (!db) { db = await S.openDB(); const n = await S.cleanupIncomplete(db); if (n.proyectos || n.trozosHuerfanos) log('limpieza', n); } return db; }

async function benchBlobs(sizes = [5, 30, 80]) {
  await ready();
  const p = await S.createProject(db, 'bench');
  for (const mb of sizes) {
    const blob = randomBlob(mb);
    let t = performance.now(); const crc = await crc32Blob(blob); const crcMs = ms(t);
    t = performance.now(); const r = await S.saveResource(db, p.id, blob, { nombre: `b${mb}.pdf`, chunk: chunkBytes() }); const putMs = ms(t);
    t = performance.now(); const back = await S.getBlob(db, r.id); const getMs = ms(t);
    t = performance.now(); const buf = await back.arrayBuffer(); const readMs = ms(t);
    const ok = buf.byteLength === blob.size && (await crc32Blob(back)) === crc;
    log('blob', { mb, crcMs, putMsInclCrc: putMs, getMs, readMs, ok, estimate: await estimate() });
  }
  await S.deleteProject(db, p.id);
  return results;
}

async function makeProject(sizes = [80, 80, 30, 5, 5]) {
  await ready();
  const p = await S.createProject(db, 'Proyecto de prueba ñ');
  const t = performance.now();
  for (const [i, mb] of sizes.entries()) await S.saveResource(db, p.id, randomBlob(mb), { nombre: `archivo ${i + 1} (${mb} MB).pdf`, chunk: chunkBytes() });
  log('proyecto creado', { id: p.id, mb: sizes.reduce((a, b) => a + b, 0), ms: ms(t), estimate: await estimate() });
  return p.id;
}

async function exportProject(id, { download = true } = {}) {
  await ready();
  let t = performance.now(); const zip = await S.exportProject(db, id); const buildMs = ms(t);
  if (download) {
    const url = URL.createObjectURL(zip);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'proyecto.zip' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  log('exportar', { zipMB: +(zip.size / MB).toFixed(1), buildMs });
  await inventory();
  return zip.size;
}

async function importFile(file, opts) {
  await ready();
  const t = performance.now();
  try { const r = await S.importProject(db, file, { chunk: chunkBytes(), ...opts }); log('importar', { ...r, chunkMB: +($('#chunk')?.value ?? 8), ms: ms(t), estimate: await estimate() }); await inventory(); return r; }
  catch (e) { log('importar', { error: e.message, code: e.code, ms: ms(t) }); return { error: e.message, code: e.code }; }
}

async function compare(a, b) {
  await ready();
  const ra = await S.listResources(db, a), rb = await S.listResources(db, b);
  const key = (r) => `${r.nombre}|${r.size}|${r.crc32}`;
  const same = ra.map(key).sort().join() === rb.map(key).sort().join();
  // Relee los blobs importados para confirmar que el CRC guardado coincide con los datos reales.
  let real = true; for (const r of rb) if ((await crc32Blob(await S.getBlob(db, r.id))) !== r.crc32) real = false;
  return { same, real, n: rb.length };
}

async function fillUntilError(stepMB = 50, maxMB = 4000) {
  await ready();
  const p = await S.createProject(db, 'cuota'); let total = 0; let err = null;
  const t = performance.now();
  while (total < maxMB) {
    try { await S.saveResource(db, p.id, randomBlob(stepMB), { nombre: `q${total}`, chunk: chunkBytes() }); total += stepMB; }
    catch (e) { err = { name: e && e.name, message: String(e && e.message).slice(0, 200) }; break; }
  }
  const est = await estimate();
  await S.deleteProject(db, p.id);
  log('cuota', { stepMB, storedMB: total, error: err, ms: ms(t), estimateAtStop: est, estimateAfterDelete: await estimate() });
  return results;
}

async function persist() {
  const before = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  const p = navigator.storage?.persist ? navigator.storage.persist() : Promise.resolve(null);
  const r = await Promise.race([p, new Promise((ok) => setTimeout(() => ok('pendiente'), 1500))]);
  log('persist', { before, result: r });
  return r;
}

$('#bench').onclick = () => benchBlobs();
$('#proj').onclick = async () => { const id = await makeProject(); await exportProject(id); };
$('#imp').onchange = (e) => e.target.files[0] && importFile(e.target.files[0]);
$('#persist').onclick = persist;
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(results)); } catch { /* copiar a mano */ } };
$('#wipe').onclick = async () => { db && db.close(); db = null; await new Promise((ok) => { const r = indexedDB.deleteDatabase('mi-uni-s11'); r.onsuccess = r.onerror = r.onblocked = ok; }); log('borrado', { estimate: await estimate() }); };

// Al abrir: qué hay guardado (sirve para la prueba de borrado de Safari tras 8 días sin uso).
async function inventory() {
  await ready();
  const ps = await S.listProjects(db);
  let bytes = 0; const rows = [];
  for (const p of ps) {
    for (const r of await S.listResources(db, p.id)) bytes += r.size;
    const b = backupStatus(p);
    rows.push(`${b.nivel === 'ok' ? '✓' : '⚠'} ${p.nombre}: ${b.texto}`);
  }
  const last = ps.map((p) => p.modificado || p.creado).sort().at(-1) || null;
  $('#saved').textContent = ps.length
    ? `Datos guardados: ${ps.length} proyecto(s), ${(bytes / MB).toFixed(0)} MB; último cambio: ${new Date(last).toLocaleString('es-DO')}`
    : 'No hay datos guardados en este navegador.';
  $('#backup').textContent = rows.join('\n');
  log('inventario', { proyectos: ps.length, mb: Math.round(bytes / MB), ultimo: last, respaldo: ps.map((p) => backupStatus(p).nivel) });
}
inventory().catch((e) => { $('#saved').textContent = 'No se pudo leer IndexedDB: ' + e.message; });

window.__s11 = { inventory, benchBlobs, makeProject, exportProject, importFile, compare, fillUntilError, persist, estimate, results };
