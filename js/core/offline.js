import { fetchLocal } from './net-guard.js';

// Descarga explícita de un módulo pesado a la Cache API, con progreso, verificación y reanudación
// por archivo. El manifiesto se guarda AL FINAL: su presencia en la caché significa "completo".

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function readManifest(manifestUrl, signal) {
  const res = await fetchLocal(manifestUrl, { cache: 'no-cache', signal });
  if (!res.ok) throw new Error(`No se pudo leer el manifiesto (${res.status}).`);
  const man = await res.json();
  man.files = man.files.map((f) => ({ ...f, url: new URL(f.path, manifestUrl).href }));
  man.totalBytes = man.files.reduce((a, f) => a + f.size, 0);
  return man;
}

async function fetchVerified(file, signal, onBytes) {
  const res = await fetchLocal(file.url, { cache: 'no-store', signal });
  if (!res.ok) throw new Error(`Falló la descarga de ${file.path} (${res.status}).`);
  const buf = new Uint8Array(file.size);
  let off = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (off + value.length > file.size) throw new Error(`${file.path}: más grande de lo esperado.`);
    buf.set(value, off); off += value.length; onBytes(value.length);
  }
  if (off !== file.size) throw new Error(`${file.path}: tamaño ${off} ≠ ${file.size}.`);
  const digest = hex(await crypto.subtle.digest('SHA-256', buf));
  if (digest !== file.sha256) throw new Error(`${file.path}: el hash no coincide; descarga descartada.`);
  const headers = new Headers({ 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Length': String(file.size) });
  return new Response(buf, { headers });
}

/** onProgress({ done, total, file }) se llama a lo sumo cada ~100 ms. */
export async function downloadModule({ manifestUrl, cacheName, onProgress = () => {}, signal }) {
  const man = await readManifest(manifestUrl, signal);
  const cache = await caches.open(cacheName);
  let done = 0, last = 0, reused = 0, copied = 0;
  const tick = (file, force) => {
    const now = performance.now();
    if (force || now - last > 100) { last = now; onProgress({ done, total: man.totalBytes, file: file && file.path }); }
  };
  for (const f of man.files) {
    // Reanudación por archivo: lo que ya está en la caché se guardó solo tras verificarse.
    if (await cache.match(f.url)) { done += f.size; reused++; tick(f, true); continue; }
    // Versión anterior del módulo ya descargada: si el archivo es idéntico (mismo hash), se copia sin red.
    const old = await caches.match(f.url);
    if (old) {
      const buf = await old.clone().arrayBuffer();
      if (buf.byteLength === f.size && hex(await crypto.subtle.digest('SHA-256', buf)) === f.sha256) {
        await cache.put(f.url, new Response(buf, { headers: old.headers }));
        done += f.size; copied++; tick(f, true); continue;
      }
    }
    const res = await fetchVerified(f, signal, (n) => { done += n; tick(f); });
    await cache.put(f.url, res);
  }
  await cache.put(manifestUrl, new Response(JSON.stringify(man), { headers: { 'Content-Type': 'application/json' } }));
  tick(null, true);
  return { files: man.files.length, bytes: man.totalBytes, reused, copied };
}

export async function isComplete(manifestUrl, cacheName) {
  if (!(await caches.has(cacheName))) return false;
  return !!(await (await caches.open(cacheName)).match(manifestUrl));
}

export const removeModule = (cacheName) => caches.delete(cacheName);
