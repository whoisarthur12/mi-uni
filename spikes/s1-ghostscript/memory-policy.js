// Política de memoria del compresor (ADR-003). Lógica pura: sin DOM, probada en Node.
// Modelo medido en S1 (Chromium, worker nuevo por pasada): pico extra ≈ 70 MB (init) + 40 MB + 1,9 × entrada.
// SAFETY cubre lo no medido en móvil (Safari iOS, gama baja). Se recalibra con el celular del dueño.

export const MODEL = { initMB: 70, baseJobMB: 40, perInputMB: 1.9, safety: 1.5 };
export const HARD_CAP_MB = 500;          // por encima, wasm32 + MEMFS no es fiable en ningún dispositivo
export const RAM_SHARE = 1 / 3;          // INSTRUCTIONS §2: no superar ~1/3 de la RAM
export const ASSUMED_RAM_GB = { mobile: 3, desktop: 4 }; // si navigator.deviceMemory no existe (Safari, Firefox)

export function estimatePeakMB(inputMB, model = MODEL) {
  return model.safety * (model.initMB + model.baseJobMB + model.perInputMB * inputMB);
}

/**
 * @param {number} inputBytes
 * @param {{deviceMemoryGB?: number, isMobile: boolean, learnedFailMB?: number}} device
 *   learnedFailMB: menor tamaño de entrada que cerró la pestaña antes en este dispositivo (detección por bandera en sessionStorage).
 * @returns {{level: 'ok'|'warn'|'block', estimatePeakMB: number, budgetMB: number, ramGB: number, ramAssumed: boolean, maxWarnMB: number}}
 */
export function classifyInput(inputBytes, device) {
  const inputMB = inputBytes / 1e6;
  const ramAssumed = !(device.deviceMemoryGB > 0);
  const ramGB = ramAssumed ? ASSUMED_RAM_GB[device.isMobile ? 'mobile' : 'desktop'] : device.deviceMemoryGB;
  const budgetMB = ramGB * 1024 * RAM_SHARE;
  const est = estimatePeakMB(inputMB);
  const maxByBudget = (budgetMB / MODEL.safety - MODEL.initMB - MODEL.baseJobMB) / MODEL.perInputMB;
  let maxWarnMB = Math.max(0, Math.min(HARD_CAP_MB, maxByBudget));
  if (device.learnedFailMB > 0) maxWarnMB = Math.min(maxWarnMB, device.learnedFailMB * 0.8);
  const okMB = Math.min(maxWarnMB, ((budgetMB / 2) / MODEL.safety - MODEL.initMB - MODEL.baseJobMB) / MODEL.perInputMB);
  const level = inputMB > maxWarnMB ? 'block' : inputMB > okMB ? 'warn' : 'ok';
  return { level, estimatePeakMB: Math.round(est), budgetMB: Math.round(budgetMB), ramGB, ramAssumed, maxWarnMB: Math.floor(maxWarnMB), okMB: Math.floor(Math.max(0, okMB)) };
}
