// Política de respaldo (ADR-006, condición 3: el respaldo ZIP es requisito de producto). Lógica pura, probada en Node.
// nivel: 'ok' | 'aviso' (cambios sin exportar desde hace ≥ N días) | 'nunca' (con datos y jamás exportado).
import { fmtFecha } from './ajustes-modelo.js';

const DIA = 86400000;

export function estadoRespaldo(proyecto, ahora = new Date(), dias = 7) {
  const t = (s) => (s ? new Date(s).getTime() : null);
  const mod = t(proyecto.modificado), ult = t(proyecto.ultimoRespaldo), n = ahora.getTime();
  const hace = (x) => Math.floor((n - x) / DIA);
  if (mod === null) return { nivel: 'ok', vacio: true };
  if (ult === null) return { nivel: hace(mod) >= 1 ? 'nunca' : 'ok', nuevo: hace(mod) < 1, diasSinRespaldo: hace(mod) };
  if (mod <= ult) return { nivel: 'ok', alDia: true, diasSinRespaldo: 0, ultimo: proyecto.ultimoRespaldo };
  return { nivel: hace(ult) >= dias ? 'aviso' : 'ok', pendiente: true, diasSinRespaldo: hace(ult), ultimo: proyecto.ultimoRespaldo };
}

/** Texto corto para la etiqueta de estado. */
export function etiquetaRespaldo(e) {
  if (e.vacio) return 'Sin archivos';
  if (e.nivel === 'nunca') return 'Nunca respaldado';
  if (e.nuevo) return 'Proyecto nuevo';
  if (e.alDia) return 'Al día';
  return e.nivel === 'aviso' ? `Sin copia hace ${e.diasSinRespaldo} días` : 'Cambios recientes';
}

/** Frase con la fecha del último respaldo en la zona horaria del perfil. */
export function fraseRespaldo(proyecto, zona) {
  return proyecto.ultimoRespaldo ? `Última copia: ${fmtFecha(proyecto.ultimoRespaldo, zona)}` : 'Todavía sin copia';
}

/** El proyecto más urgente de respaldar, o null. */
export function masUrgente(proyectos, ahora = new Date(), dias = 7) {
  const peso = { nunca: 2, aviso: 1, ok: 0 };
  return proyectos.map((p) => ({ p, e: estadoRespaldo(p, ahora, dias) })).filter((x) => x.e.nivel !== 'ok')
    .sort((a, b) => peso[b.e.nivel] - peso[a.e.nivel] || b.e.diasSinRespaldo - a.e.diasSinRespaldo)[0] || null;
}
