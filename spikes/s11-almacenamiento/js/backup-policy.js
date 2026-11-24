// Política de respaldo (lógica pura, probada en Node). ADR-006, condición 3: el respaldo ZIP es requisito de producto.
export const DEFAULT_REMIND_DAYS = 7;
const DAY = 86400000;

/**
 * project: { modificado?: ISO, ultimoRespaldo?: ISO }. Devuelve el estado que la UI muestra junto al proyecto.
 * nivel: 'ok' | 'aviso' (hay cambios sin exportar desde hace ≥ remindDays) | 'nunca' (con datos y jamás exportado).
 */
export function backupStatus(project, now = new Date(), remindDays = DEFAULT_REMIND_DAYS) {
  const t = (s) => (s ? new Date(s).getTime() : null);
  const mod = t(project.modificado), last = t(project.ultimoRespaldo), n = now.getTime();
  const dias = (x) => Math.floor((n - x) / DAY);
  if (mod === null) return { nivel: 'ok', texto: 'Sin archivos todavía.' };
  if (last === null) {
    return dias(mod) >= 1 || remindDays === 0
      ? { nivel: 'nunca', texto: 'Nunca has exportado este proyecto. Exporta un respaldo ZIP.', diasSinRespaldo: dias(mod) }
      : { nivel: 'ok', texto: 'Sin respaldo todavía (proyecto nuevo).', diasSinRespaldo: dias(mod) };
  }
  if (mod <= last) return { nivel: 'ok', texto: `Último respaldo: hace ${dias(last)} día(s). Sin cambios desde entonces.`, diasSinRespaldo: 0 };
  const pend = dias(mod) >= remindDays || dias(last) >= remindDays;
  return { nivel: pend && dias(last) >= remindDays ? 'aviso' : 'ok', texto: `Último respaldo: hace ${dias(last)} día(s), hay cambios sin exportar.`, diasSinRespaldo: dias(last) };
}
