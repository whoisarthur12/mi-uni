// Tema claro / oscuro / sistema. Se recuerda en este navegador (preferencia de dispositivo, ADR-013).
export const TEMAS = ['sistema', 'claro', 'oscuro'];
export const NOMBRE_TEMA = { sistema: 'Sistema', claro: 'Claro', oscuro: 'Oscuro' };
const CLAVE = 'mi-uni:tema';
const oyentes = new Set();

export function temaActual() {
  try { const t = localStorage.getItem(CLAVE); return TEMAS.includes(t) ? t : 'sistema'; } catch { return 'sistema'; }
}

export function fijarTema(t) {
  if (!TEMAS.includes(t)) return;
  try { localStorage.setItem(CLAVE, t); } catch { /* sin almacenamiento: solo esta sesión */ }
  if (t === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const oscuro = t === 'oscuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', oscuro ? '#1b1915' : '#f7f7f4');
  for (const f of oyentes) f(t);
}

export const siguienteTema = (t) => TEMAS[(TEMAS.indexOf(t) + 1) % TEMAS.length];
export function alCambiarTema(f) { oyentes.add(f); return () => oyentes.delete(f); }
