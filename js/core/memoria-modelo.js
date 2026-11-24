// Tope de memoria por dispositivo (ADR-003; ADR-010 para la Caja PDF). Lógica pura, probada en Node.
// Compresor (Ghostscript, worker nuevo por pasada): pico ≈ 1,5 × (70 + 40 + 1,9 × entrada_MB), medido en S1.
// Caja PDF (pdf-lib): pico ≈ 8 × entrada_MB, provisional (S12). Ambos se recalibran con el iPhone del dueño.

export const MODELOS = {
  compresor: { initMB: 70, baseJobMB: 40, perInputMB: 1.9, safety: 1.5, topeMB: 500 },
  cajaPdf: { initMB: 0, baseJobMB: 0, perInputMB: 8, safety: 1, topeMB: 500 },
};
export const FRACCION_RAM = 1 / 3;             // INSTRUCTIONS §2: no superar ~1/3 de la RAM
export const RAM_SUPUESTA_GB = { movil: 3, escritorio: 4 }; // sin navigator.deviceMemory (Safari, Firefox)

export const picoEstimadoMB = (entradaMB, m) => m.safety * (m.initMB + m.baseJobMB + m.perInputMB * entradaMB);
const maxEntrada = (presupuestoMB, m) => (presupuestoMB / m.safety - m.initMB - m.baseJobMB) / m.perInputMB;

/**
 * @param {number} bytes entrada
 * @param {{deviceMemoryGB?: number, esMovil: boolean, fallaAprendidaMB?: number}} disp
 * @returns {{nivel:'ok'|'aviso'|'bloqueo', picoMB, presupuestoMB, ramGB, ramSupuesta, okHastaMB, avisoHastaMB}}
 */
export function clasificar(bytes, disp, modelo = MODELOS.compresor) {
  const mb = bytes / 1e6;
  const ramSupuesta = !(disp.deviceMemoryGB > 0);
  const ramGB = ramSupuesta ? RAM_SUPUESTA_GB[disp.esMovil ? 'movil' : 'escritorio'] : disp.deviceMemoryGB;
  const presupuestoMB = ramGB * 1024 * FRACCION_RAM;
  let avisoHasta = Math.max(0, Math.min(modelo.topeMB, maxEntrada(presupuestoMB, modelo)));
  if (disp.fallaAprendidaMB > 0) avisoHasta = Math.min(avisoHasta, disp.fallaAprendidaMB * 0.8);
  const okHasta = Math.max(0, Math.min(avisoHasta, maxEntrada(presupuestoMB / 2, modelo)));
  const nivel = mb > avisoHasta ? 'bloqueo' : mb > okHasta ? 'aviso' : 'ok';
  return { nivel, picoMB: Math.round(picoEstimadoMB(mb, modelo)), presupuestoMB: Math.round(presupuestoMB), ramGB, ramSupuesta, okHastaMB: Math.floor(okHasta), avisoHastaMB: Math.floor(avisoHasta) };
}

/** Aprendizaje de cierres: si quedó una marca de trabajo en curso al recargar, la pestaña murió con ese tamaño. */
export function aprenderDeCierre(marca, fallaPrevia) {
  if (!marca || !(marca.mb > 0)) return { fallaAprendidaMB: fallaPrevia || 0, cierre: null };
  const nueva = fallaPrevia > 0 ? Math.min(fallaPrevia, marca.mb) : marca.mb;
  return { fallaAprendidaMB: nueva, cierre: marca };
}
