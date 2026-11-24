// Política de respaldo (ADR-006, condición 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoRespaldo, etiquetaRespaldo, fraseRespaldo, masUrgente } from '../../js/core/respaldo.js';

const ahora = new Date('2026-11-24T16:00:00Z');
const hace = (d) => new Date(ahora.getTime() - d * 86400000).toISOString();

test('sin archivos y proyecto nuevo: sin aviso', () => {
  assert.equal(etiquetaRespaldo(estadoRespaldo({}, ahora)), 'Sin archivos');
  assert.equal(estadoRespaldo({ modificado: hace(0) }, ahora).nivel, 'ok');
});
test('con datos de ayer y jamás exportado: «nunca»', () => {
  const e = estadoRespaldo({ modificado: hace(1) }, ahora);
  assert.equal(e.nivel, 'nunca'); assert.equal(etiquetaRespaldo(e), 'Nunca respaldado');
});
test('copia posterior al último cambio: al día', () => assert.equal(etiquetaRespaldo(estadoRespaldo({ modificado: hace(30), ultimoRespaldo: hace(20) }, ahora)), 'Al día'));
test('cambios sin exportar: avisa a partir del plazo (7 días por defecto, configurable)', () => {
  assert.equal(estadoRespaldo({ modificado: hace(1), ultimoRespaldo: hace(3) }, ahora).nivel, 'ok');
  const e = estadoRespaldo({ modificado: hace(1), ultimoRespaldo: hace(9) }, ahora);
  assert.equal(e.nivel, 'aviso'); assert.equal(etiquetaRespaldo(e), 'Sin copia hace 9 días');
  assert.equal(estadoRespaldo({ modificado: hace(1), ultimoRespaldo: hace(3) }, ahora, 3).nivel, 'aviso');
});
test('fecha del último respaldo en la zona del perfil', () => {
  assert.equal(fraseRespaldo({ ultimoRespaldo: '2026-11-16T02:00:00Z' }, 'America/Santo_Domingo'), 'Última copia: 15 de noviembre de 2026');
  assert.equal(fraseRespaldo({}, 'America/Santo_Domingo'), 'Todavía sin copia');
});
test('el más urgente: primero los nunca respaldados, luego los de más días', () => {
  const ps = [{ id: 'a', modificado: hace(1), ultimoRespaldo: hace(10) }, { id: 'b', modificado: hace(2) }, { id: 'c', modificado: hace(1), ultimoRespaldo: hace(30) }, { id: 'd' }];
  assert.equal(masUrgente(ps, ahora).p.id, 'b');
  assert.equal(masUrgente(ps.filter((p) => p.id !== 'b'), ahora).p.id, 'c');
  assert.equal(masUrgente([{ id: 'd' }], ahora), null);
});
