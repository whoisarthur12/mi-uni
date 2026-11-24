// Única salida de red de la app (CONTEXT §8.8, ADR-004, ADR-007).
// Hoy solo permite peticiones al PROPIO sitio (archivos de la app y de los módulos).
// La excepción DOI/ISBN de ADR-007 se añadirá aquí cuando exista el módulo de Fuentes (Fase 3),
// con las mismas reglas del spike S5 (solo a petición del usuario, solo el identificador).

const ORIGEN = () => self.location.origin;

/** URL absoluta del mismo origen, o error. Nunca resuelve hacia otro host. */
export function urlLocal(url, base = self.location.href) {
  const u = new URL(url, base);
  if (u.origin !== ORIGEN()) throw new Error(`Red bloqueada: ${u.host} no es este sitio.`);
  return u;
}

/** fetch restringido al propio sitio: sin credenciales de terceros ni Referer. */
export function fetchLocal(url, init = {}) {
  const u = urlLocal(url, init.base);
  const { base, ...rest } = init;
  return fetch(u.href, { credentials: 'same-origin', referrerPolicy: 'no-referrer', ...rest });
}
