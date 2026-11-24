import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupStatus } from '../js/backup-policy.js';
const now = new Date('2026-11-24T12:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
test('sin archivos', () => assert.equal(backupStatus({}, now).nivel, 'ok'));
test('proyecto de hoy sin respaldo: sin aviso', () => assert.equal(backupStatus({ modificado: ago(0) }, now).nivel, 'ok'));
test('con datos de ayer y jamás exportado', () => assert.equal(backupStatus({ modificado: ago(1) }, now).nivel, 'nunca'));
test('respaldo posterior al último cambio', () => assert.equal(backupStatus({ modificado: ago(30), ultimoRespaldo: ago(20) }, now).nivel, 'ok'));
test('cambios sin exportar, respaldo de hace 3 días: aún no avisa', () => assert.equal(backupStatus({ modificado: ago(1), ultimoRespaldo: ago(3) }, now).nivel, 'ok'));
test('cambios sin exportar, respaldo de hace 8 días: avisa', () => {
  const s = backupStatus({ modificado: ago(1), ultimoRespaldo: ago(8) }, now);
  assert.equal(s.nivel, 'aviso'); assert.equal(s.diasSinRespaldo, 8);
});
test('plazo configurable', () => assert.equal(backupStatus({ modificado: ago(1), ultimoRespaldo: ago(3) }, now, 2).nivel, 'aviso'));
