import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyInput, estimatePeakMB } from '../memory-policy.js';
const MB = 1e6;

test('el modelo reproduce la medición de S1 sin factor de seguridad', () => {
  const m = { initMB: 70, baseJobMB: 40, perInputMB: 1.9, safety: 1 };
  assert.ok(Math.abs(estimatePeakMB(80, m) - 262) < 10);   // medido 70 + 192
  assert.ok(Math.abs(estimatePeakMB(28, m) - 163) < 15);   // medido 70 + 86
});
test('celular de 4 GB: 80 MB sin aviso, 300 MB con aviso, 450 MB bloqueado', () => {
  const d = { deviceMemoryGB: 4, isMobile: true };
  assert.equal(classifyInput(80 * MB, d).level, 'ok');
  assert.equal(classifyInput(300 * MB, d).level, 'warn');
  assert.equal(classifyInput(450 * MB, d).level, 'block');
});
test('Safari iPhone (sin deviceMemory) asume 3 GB', () => {
  const r = classifyInput(80 * MB, { isMobile: true });
  assert.equal(r.ramAssumed, true); assert.equal(r.ramGB, 3); assert.equal(r.level, 'ok');
  assert.equal(classifyInput(200 * MB, { isMobile: true }).level, 'warn');
});
test('gama baja de 2 GB: 80 MB avisa, 200 MB bloquea', () => {
  assert.equal(classifyInput(80 * MB, { deviceMemoryGB: 2, isMobile: true }).level, 'warn');
  assert.equal(classifyInput(200 * MB, { deviceMemoryGB: 2, isMobile: true }).level, 'block');
});
test('un cierre previo de la pestaña rebaja el límite', () => {
  const d = { deviceMemoryGB: 4, isMobile: true, learnedFailMB: 100 };
  assert.equal(classifyInput(90 * MB, d).level, 'block');
  assert.equal(classifyInput(70 * MB, d).level, 'ok');
});
test('tope absoluto de 500 MB incluso en escritorio con 8 GB', () => {
  assert.equal(classifyInput(600 * MB, { deviceMemoryGB: 8, isMobile: false }).level, 'block');
});
