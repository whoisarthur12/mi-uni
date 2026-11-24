// Service worker del spike S10. Clásico (no módulo) para que funcione en todos los motores.
importScripts('./sw-config.js');
const C = self.MiUniSW;
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  // Sin skipWaiting: la versión nueva espera hasta que el usuario pulse "Actualizar"
  // o se cierren todas las pestañas. Si una sola petición falla, install falla y nada cambia.
  event.waitUntil((async () => {
    const req = (f) => new Request(new URL(f, SCOPE), { cache: C.PRECACHE_MODE });
    await (await caches.open(C.shellCache())).addAll(C.SHELL_FILES.map(req));
    for (const [name, files] of C.lightPrecache()) await (await caches.open(name)).addAll(files.map(req));
  })());
});

async function completeAssetCaches() {
  const out = [];
  for (const [id, m] of Object.entries(C.MODULES)) {
    if (!m.pesado || !(await caches.has(C.assetsCache(id)))) continue;
    const c = await caches.open(C.assetsCache(id));
    if (await c.match(new URL(m.manifest, SCOPE))) out.push(C.assetsCache(id));
  }
  return out;
}

async function cleanup() {
  const names = await caches.keys();
  const del = C.planCleanup(names, await completeAssetCaches());
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
    event.waitUntil((async () => reply({
      shellVersion: C.SHELL_VERSION, build: C.BUILD, modules: C.MODULES,
      caches: await caches.keys(), complete: await completeAssetCaches(),
    }))());
  }
  if (type === 'CLEANUP') event.waitUntil((async () => reply({ deleted: await cleanup() }))());
});

async function cacheFirst(request, cacheName, key) {
  const hit = await caches.open(cacheName).then((c) => c.match(key || request, { ignoreSearch: true }));
  return hit || fetch(request);
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  // no-cache: revalida con ETag. Sin esto, la caché HTTP de Pages (max-age=600) devuelve la versión vieja.
  const net = fetch(event.request, { cache: 'no-cache' }).then((res) => {
    if (res.ok) cache.put(event.request, res.clone());
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

async function heavy(request, id) {
  // Las URLs de assets pesados llevan la versión en la ruta (inmutables): cualquier caché sirve.
  const own = await caches.open(C.assetsCache(id)).then((c) => c.match(request));
  return own || (await caches.match(request)) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate' && req.url.startsWith(SCOPE)) {
    // Router por hash: toda navegación dentro del scope es el index.html del shell.
    event.respondWith(cacheFirst(req, C.shellCache(), new URL('./index.html', SCOPE)));
    return;
  }
  const k = C.classify(req.url, SCOPE);
  if (k.kind === 'shell') event.respondWith(cacheFirst(req, C.shellCache(), new URL(k.key, SCOPE)));
  else if (k.kind === 'light') event.respondWith(staleWhileRevalidate(event, C.modCache(k.id)));
  else if (k.kind === 'heavy') event.respondWith(heavy(req, k.id));
  else if (new URL(req.url).origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
