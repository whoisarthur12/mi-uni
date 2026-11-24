import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash, matchRoute } from '../../js/core/router.js';

const routes = [{ pattern: '/', name: 'inicio' }, { pattern: '/m/:id', name: 'modulo' }, { pattern: '/ajustes', name: 'ajustes' }];

test('hash vacío y variantes llevan al inicio', () => {
  for (const h of ['', '#', '#/', '/', '#//']) assert.equal(matchRoute(routes, parseHash(h).path).name, 'inicio');
});
test('parámetros y query', () => {
  const h = parseHash('#/m/compresor?meta=4800000&x=a%20b');
  assert.deepEqual(h.segments, ['m', 'compresor']);
  assert.deepEqual(h.query, { meta: '4800000', x: 'a b' });
  assert.deepEqual(matchRoute(routes, h.path), { name: 'modulo', params: { id: 'compresor' } });
});
test('sin barra inicial y con barra final', () => {
  assert.equal(parseHash('#m/caja/').path, '/m/caja');
});
test('ruta desconocida', () => {
  assert.equal(matchRoute(routes, parseHash('#/m/a/b').path).name, 'no-encontrado');
});
test('codificación ida y vuelta', () => {
  const h = buildHash(['m', 'año 1/2'], { q: 'ñ&=' });
  const p = parseHash(h);
  assert.deepEqual(p.segments, ['m', 'año 1/2']);
  assert.deepEqual(p.query, { q: 'ñ&=' });
});
test('escape inválido no rompe', () => {
  assert.deepEqual(parseHash('#/m/%E0%A4%A').segments, ['m', '%E0%A4%A']);
});
