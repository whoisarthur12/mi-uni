// net-guard del spike S5: la ÚNICA excepción de red de la app (ADR-007).
// Solo DOI o ISBN validados, solo a 3 hosts, solo por acción explícita del usuario, sin cookies ni Referer.
export const ALLOWED = Object.freeze({
  crossref: 'https://api.crossref.org',
  openlibrary: 'https://openlibrary.org',
  googlebooks: 'https://www.googleapis.com',
});

const DOI_RE = /^10\.\d{4,9}\/[^\s"<>]+$/;

/** Acepta "10.x/y", "doi:10.x/y" o "https://doi.org/10.x/y". Devuelve el DOI limpio o null. */
export function normalizeDOI(input) {
  const s = String(input || '').trim().replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i, '');
  return DOI_RE.test(s) && s.length <= 200 ? s : null;
}

/** ISBN-10 o ISBN-13 con dígito de control válido → ISBN-13 sin guiones, o null. */
export function normalizeISBN(input) {
  const s = String(input || '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((a, c, i) => a + (c === 'X' ? 10 : +c) * (10 - i), 0);
    if (sum % 11) return null;
    const core = '978' + s.slice(0, 9);
    const chk = (10 - ([...core].reduce((a, c, i) => a + +c * (i % 2 ? 3 : 1), 0) % 10)) % 10;
    return core + chk;
  }
  if (/^97[89]\d{10}$/.test(s)) {
    const chk = (10 - ([...s.slice(0, 12)].reduce((a, c, i) => a + +c * (i % 2 ? 3 : 1), 0) % 10)) % 10;
    return chk === +s[12] ? s : null;
  }
  return null;
}

/** URL de consulta: el único dato del usuario que sale es el DOI/ISBN. */
export function lookupURL(kind, id) {
  const e = encodeURIComponent;
  if (kind === 'crossref') return `${ALLOWED.crossref}/works/${e(id)}/transform/application/vnd.citationstyles.csl+json`;
  if (kind === 'openlibrary') return `${ALLOWED.openlibrary}/api/books?bibkeys=ISBN:${e(id)}&format=json&jscmd=data`;
  if (kind === 'googlebooks') return `${ALLOWED.googlebooks}/books/v1/volumes?q=isbn:${e(id)}`;
  throw new Error('Consulta no permitida');
}

/**
 * fetch con las reglas de ADR-007. `log` recibe cada consulta (diagnóstico local).
 * userInitiated debe venir de un gesto del usuario: el llamador lo pasa explícitamente.
 */
export async function guardedFetch(kind, id, { userInitiated, timeoutMs = 10000, log = () => {}, fetchImpl = fetch } = {}) {
  if (userInitiated !== true) throw Object.assign(new Error('Las consultas de red solo se hacen a pedido del usuario.'), { code: 'NOT_USER_INITIATED' });
  const url = lookupURL(kind, id);
  const t0 = Date.now();
  try {
    const res = await fetchImpl(url, { method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    log({ kind, id, status: res.status, ms: Date.now() - t0 });
    if (res.status === 404) return null;
    if (res.status === 429) throw Object.assign(new Error('El servicio está saturado; inténtalo en unos minutos o completa los datos a mano.'), { code: 'RATE_LIMIT' });
    if (!res.ok) throw Object.assign(new Error(`El servicio respondió ${res.status}.`), { code: 'HTTP' });
    return await res.json();
  } catch (e) {
    if (!e.code) { log({ kind, id, error: e.name, ms: Date.now() - t0 }); e.code = e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK'; e.message = 'Sin conexión con el servicio de metadatos. Completa los datos a mano.'; }
    throw e;
  }
}
