// Service worker de Mi Uni (ADR-005). Clásico (no módulo) para que funcione en todos los motores.
// Solo sirve archivos del propio sitio; no hace peticiones a terceros.
importScripts('./sw-config.js');
const C = self.MiUniSW;
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  // Sin skipWaiting: la versión nueva espera a «Actualizar» o a que se cierren las pestañas.
  // Si una sola petición falla, install falla y la versión anterior sigue intacta.
  event.waitUntil((async () => {
    const req = (f) => new Request(new URL(f, SCOPE), { cache: C.PRECACHE_MODE });
    await (await caches.open(C.shellCache())).addAll(C.SHELL_FILES.map(req));
    for (const [name, files] of C.lightPrecache()) await (await caches.open(name)).addAll(files.map(req));
  })());
});

async function completeAssetCaches() {
  const out = [];
  for (const [id, m] of Object.entries(C.MODULES)) {
    if (!m.assets || !(await caches.has(C.assetsCache(id)))) continue;
    if (await (await caches.open(C.assetsCache(id))).match(new URL(m.assets.manifest, SCOPE))) out.push(C.assetsCache(id));
  }
  return out;
}

async function cleanup() {
  const del = C.planCleanup(await caches.keys(), await completeAssetCaches());
  await Promise.all(del.map((n) => caches.delete(n)));
  return del;
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => { await cleanup(); await self.clients.claim(); })());
});

self.addEventListener('message', (event) => {
  const { type, id } = event.data || {};
  const reply = (payload) => event.source && event.source.postMessage({ type: type + ':ok', id, payload });
  if (type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (type === 'STATE') {
    event.waitUntil((async () => reply({ shellVersion: C.SHELL_VERSION, modules: C.MODULES, caches: await caches.keys(), complete: await completeAssetCaches() }))());
  }
  if (type === 'CLEANUP') event.waitUntil((async () => reply({ deleted: await cleanup() }))());
});

async function cacheFirst(request, cacheName, key) {
  const hit = await caches.open(cacheName).then((c) => c.match(key || request, { ignoreSearch: true }));
  return hit || fetch(request);
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request, { ignoreSearch: true });
  const net = fetch(event.request, { cache: 'no-cache' }).then((res) => { if (res.ok) cache.put(event.request, res.clone()); return res; });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

async function heavy(request, id) {
  const own = await caches.open(C.assetsCache(id)).then((c) => c.match(request, { ignoreSearch: true }));
  return own || (await caches.match(request, { ignoreSearch: true })) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Router por hash: abrir la app es siempre el index.html del shell. Otras páginas del sitio, a la red.
    if (C.isAppNavigation(req.url, SCOPE)) event.respondWith(cacheFirst(req, C.shellCache(), new URL('./index.html', SCOPE)));
    return;
  }
  const k = C.classify(req.url, SCOPE);
  if (k.kind === 'shell') event.respondWith(cacheFirst(req, C.shellCache(), new URL(k.key, SCOPE)));
  else if (k.kind === 'light') event.respondWith(staleWhileRevalidate(event, C.modCache(k.id)));
  else if (k.kind === 'heavy') event.respondWith(heavy(req, k.id));
});
