// Perfil y ajustes: modelo puro (sin DOM ni IndexedDB), probado en Node (CONTEXT §9.0.a).
// Valores por defecto del dueño (Fase 1): papel Carta, APA 7 (provisional), zona horaria de Santo Domingo.
// No se guardan documentos de identidad ni datos financieros. Nada sale del dispositivo.

export const ESTILOS_CITA = [
  { id: 'apa', nombre: 'APA 7 (en español, provisional)' },
  { id: 'ieee', nombre: 'IEEE' },
  { id: 'mla', nombre: 'MLA' },
  { id: 'chicago', nombre: 'Chicago (autor-fecha)' },
  { id: 'harvard', nombre: 'Harvard' },
  { id: 'nlm', nombre: 'Vancouver / NLM' },
];
export const PAPELES = [{ id: 'carta', nombre: 'Carta (21,59 × 27,94 cm)' }, { id: 'a4', nombre: 'A4 (21 × 29,7 cm)' }];
export const FUENTES = ['Times New Roman', 'Arial', 'Calibri', 'Georgia'];
export const ZONAS = [
  'America/Santo_Domingo', 'America/Puerto_Rico', 'America/New_York', 'America/Mexico_City', 'America/Bogota',
  'America/Lima', 'America/Caracas', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Europe/Madrid',
];

export const POR_DEFECTO = Object.freeze({
  version: 1,
  perfil: { nombre: '', universidad: '', facultad: '', carrera: '', matricula: '', ciudad: '' },
  formato: { estiloCita: 'apa', papel: 'carta', margenCm: 2.54, fuente: 'Times New Roman', tamanoPt: 12 },
  region: { zonaHoraria: 'America/Santo_Domingo', idioma: 'es' },
  datos: { avisoRespaldoDias: 7 },
});

const MAX_TEXTO = 120;
const texto = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO) : '');
const enLista = (v, lista, def) => (lista.includes(v) ? v : def);
const numero = (v, min, max, def, paso = 0.01) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Number((Math.round(n / paso) * paso).toFixed(2)) : def;
};

export function zonaValida(z) {
  if (typeof z !== 'string' || !z) return false;
  try { new Intl.DateTimeFormat('es', { timeZone: z }); return true; } catch { return false; }
}

/** Devuelve siempre un objeto completo y válido. Lo desconocido se descarta; lo inválido toma el valor por defecto. */
export function normalizar(entrada = {}) {
  const e = entrada && typeof entrada === 'object' ? entrada : {};
  const P = POR_DEFECTO, p = e.perfil || {}, f = e.formato || {}, r = e.region || {}, d = e.datos || {};
  return {
    version: 1,
    perfil: Object.fromEntries(Object.keys(P.perfil).map((k) => [k, texto(p[k])])),
    formato: {
      estiloCita: enLista(f.estiloCita, ESTILOS_CITA.map((x) => x.id), P.formato.estiloCita),
      papel: enLista(f.papel, PAPELES.map((x) => x.id), P.formato.papel),
      margenCm: numero(f.margenCm, 1, 5, P.formato.margenCm),
      fuente: enLista(f.fuente, FUENTES, P.formato.fuente),
      tamanoPt: numero(f.tamanoPt, 9, 16, P.formato.tamanoPt, 0.5),
    },
    region: { zonaHoraria: zonaValida(r.zonaHoraria) ? r.zonaHoraria : P.region.zonaHoraria, idioma: 'es' },
    datos: { avisoRespaldoDias: numero(d.avisoRespaldoDias, 1, 60, P.datos.avisoRespaldoDias, 1) },
  };
}

/** Mezcla un cambio parcial ({ formato: { papel: 'a4' } }) sobre los ajustes actuales y normaliza. */
export function aplicarCambio(actual, cambio) {
  const a = normalizar(actual);
  const c = cambio || {};
  return normalizar({ ...a, ...Object.fromEntries(['perfil', 'formato', 'region', 'datos'].map((k) => [k, { ...a[k], ...(c[k] || {}) }])) });
}

/** «24 de noviembre de 2026» en la zona horaria del perfil. */
export function fmtFecha(fecha, zonaHoraria = POR_DEFECTO.region.zonaHoraria, conHora = false) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return new Intl.DateTimeFormat('es-DO', { timeZone: zonaValida(zonaHoraria) ? zonaHoraria : POR_DEFECTO.region.zonaHoraria, day: 'numeric', month: 'long', year: 'numeric', ...(conHora ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(d);
}

/** Exportación JSON del perfil y ajustes (para llevarlos a otro navegador). */
export function exportarJSON(ajustes, ahora = new Date()) {
  return JSON.stringify({ app: 'mi-uni', tipo: 'ajustes', exportado: ahora.toISOString(), ajustes: normalizar(ajustes) }, null, 1);
}
export function importarJSON(texto) {
  let o; try { o = JSON.parse(texto); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!o || o.app !== 'mi-uni' || o.tipo !== 'ajustes') throw new Error('Este archivo no es una copia de ajustes de Mi Uni.');
  return normalizar(o.ajustes);
}
