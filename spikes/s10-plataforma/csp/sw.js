// Opción (b): el service worker añade una cabecera CSP a los scripts de worker (y a sw-doc.html).
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'";
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const inject = url.pathname.endsWith('/worker-sw-csp.js') || url.pathname.endsWith('/sw-doc.html') || url.pathname.endsWith('/probes.js');
  if (!inject || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const r = await fetch(event.request);
    const h = new Headers(r.headers); h.set('Content-Security-Policy', CSP);
    return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: h });
  })());
});
