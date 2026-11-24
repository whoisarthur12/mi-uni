// Router por hash (#/ruta). Lógica pura separada de la escucha del navegador para probarla en Node.

/** '#/m/compresor?x=1' → { path: '/m/compresor', segments: ['m','compresor'], query: {x:'1'} } */
export function parseHash(hash) {
  let raw = String(hash || '').replace(/^#/, '');
  if (!raw.startsWith('/')) raw = '/' + raw;
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path: '/' + segments.join('/'), segments, query };
}

export function buildHash(segments, query) {
  const q = query && Object.keys(query).length ? '?' + new URLSearchParams(query) : '';
  return '#/' + segments.map(encodeURIComponent).join('/') + q;
}

/** routes: [{ pattern: '/m/:id', name }] → { name, params } | { name: 'no-encontrado' } */
export function matchRoute(routes, path) {
  const segs = path.split('/').filter(Boolean);
  for (const r of routes) {
    const ps = r.pattern.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;
    const params = {};
    if (ps.every((p, i) => (p.startsWith(':') ? ((params[p.slice(1)] = segs[i]), true) : p === segs[i]))) {
      return { name: r.name, params };
    }
  }
  return { name: 'no-encontrado', params: {} };
}

/** Escucha hashchange y llama a onRoute; devuelve una función para desuscribirse. */
export function startRouter(win, routes, onRoute) {
  const fire = () => {
    const h = parseHash(win.location.hash);
    onRoute({ ...matchRoute(routes, h.path), ...h });
  };
  win.addEventListener('hashchange', fire);
  fire();
  return () => win.removeEventListener('hashchange', fire);
}
