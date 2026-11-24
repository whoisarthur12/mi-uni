// Tope de memoria de la Caja PDF (ADR-003 extendido por ADR-010, decisión del dueño 24-nov-2026).
// Mismo presupuesto que el compresor (1/3 de la RAM, RAM supuesta si no hay deviceMemory, niveles ok/warn/block,
// aprendizaje de cierres). Estimación PROVISIONAL: pico ≈ 8 × entrada (S12: 3,9–7,9×; WebKit ~7×).
// Se recalibra con el iPhone del dueño. Lógica pura, probada en Node.
import { RAM_SHARE, ASSUMED_RAM_GB } from '../../s1-ghostscript/memory-policy.js';

export const PDF_MODEL = { factor: 8 };

export function estimatePdfPeakMB(inputMB, model = PDF_MODEL) { return model.factor * inputMB; }

/**
 * @param {number} inputBytes suma de los archivos de entrada de la operación
 * @param {{deviceMemoryGB?: number, isMobile: boolean, learnedFailMB?: number}} device
 */
export function classifyPdfJob(inputBytes, device, model = PDF_MODEL) {
  const inputMB = inputBytes / 1e6;
  const ramAssumed = !(device.deviceMemoryGB > 0);
  const ramGB = ramAssumed ? ASSUMED_RAM_GB[device.isMobile ? 'mobile' : 'desktop'] : device.deviceMemoryGB;
  const budgetMB = ramGB * 1024 * RAM_SHARE;
  let maxWarnMB = budgetMB / model.factor;
  if (device.learnedFailMB > 0) maxWarnMB = Math.min(maxWarnMB, device.learnedFailMB * 0.8);
  const okMB = Math.min(maxWarnMB, budgetMB / 2 / model.factor);
  const level = inputMB > maxWarnMB ? 'block' : inputMB > okMB ? 'warn' : 'ok';
  return { level, estimatePeakMB: Math.round(estimatePdfPeakMB(inputMB, model)), budgetMB: Math.round(budgetMB), ramGB, ramAssumed, okMB: Math.floor(okMB), maxWarnMB: Math.floor(maxWarnMB) };
}
