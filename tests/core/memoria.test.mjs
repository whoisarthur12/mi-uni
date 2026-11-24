// Tope de memoria (ADR-003, ADR-010): mismos límites que el spike S1 y aprendizaje de cierres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clasificar, aprenderDeCierre, MODELOS, picoEstimadoMB } from '../../js/core/memoria-modelo.js';

test('modelo del compresor = S1: 1,5 × (70 + 40 + 1,9 × entrada)', () => {
  assert.equal(Math.round(picoEstimadoMB(80, MODELOS.compresor)), 393);
});

test('límites con RAM supuesta (Safari iOS → 3 GB) y con 8 GB', () => {
  const iphone = clasificar(100e6, { esMovil: true });
  assert.deepEqual([iphone.ramGB, iphone.ramSupuesta, iphone.okHastaMB, iphone.avisoHastaMB, iphone.nivel], [3, true, 121, 301, 'ok']);
  assert.equal(clasificar(200e6, { esMovil: true }).nivel, 'aviso');
  assert.equal(clasificar(310e6, { esMovil: true }).nivel, 'bloqueo');
  const pc = clasificar(450e6, { deviceMemoryGB: 8, esMovil: false });
  assert.deepEqual([pc.avisoHastaMB, pc.nivel], [500, 'aviso']);
  assert.equal(clasificar(501e6, { deviceMemoryGB: 8, esMovil: false }).nivel, 'bloqueo'); // tope de wasm32 + MEMFS
});

test('un cierre aprendido baja el límite al 80 % de ese tamaño', () => {
  assert.equal(clasificar(70e6, { esMovil: true, fallaAprendidaMB: 80 }).nivel, 'bloqueo'); // 0,8 × 80 = 64
  assert.deepEqual(aprenderDeCierre({ mb: 90, modulo: 'compresor' }, 120), { fallaAprendidaMB: 90, cierre: { mb: 90, modulo: 'compresor' } });
  assert.deepEqual(aprenderDeCierre(null, 120), { fallaAprendidaMB: 120, cierre: null });
});

test('Caja PDF: 8 × entrada', () => {
  const r = clasificar(84e6, { esMovil: true }, MODELOS.cajaPdf);
  assert.deepEqual([r.nivel, r.okHastaMB, r.avisoHastaMB], ['aviso', 64, 128]);
});
