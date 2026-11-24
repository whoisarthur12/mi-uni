const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../sw-config.js');

test('nombres de caché', () => {
  assert.equal(C.shellCache(), `shell-v${C.SHELL_VERSION}`);
  assert.equal(C.modCache('ligero'), 'mod-ligero-v1');
  assert.equal(C.assetsCache('pesado'), 'assets-pesado-v1');
  assert.deepEqual(C.parseName('assets-pesado-v12'), { kind: 'assets', id: 'pesado', version: 12 });
  assert.equal(C.parseName('otra-cosa'), null);
});
test('limpieza: shell y mod viejos se borran; cachés ajenas no', () => {
  const cur = `shell-v${C.SHELL_VERSION}`;
  const del = C.planCleanup(['shell-v0', cur, 'mod-ligero-v0', 'mod-ligero-v1', 'ajena', 'mod-borrado-v3'], []);
  assert.deepEqual(del, ['shell-v0', 'mod-ligero-v0', 'mod-borrado-v3']);
});
test('assets viejos solo se borran cuando la versión actual está completa', () => {
  assert.deepEqual(C.planCleanup(['assets-pesado-v0', 'assets-pesado-v1'], []), []);
  assert.deepEqual(C.planCleanup(['assets-pesado-v0', 'assets-pesado-v1'], ['assets-pesado-v1']), ['assets-pesado-v0']);
});
test('clasificación de URLs bajo /mi-uni/', () => {
  const S = 'https://u.github.io/mi-uni/';
  assert.deepEqual(C.classify(S, S), { kind: 'shell', key: './' });
  assert.deepEqual(C.classify(S + 'js/main.js?v=2', S), { kind: 'shell', key: './js/main.js' });
  assert.deepEqual(C.classify(S + 'modules/ligero/index.js', S), { kind: 'light', id: 'ligero' });
  assert.deepEqual(C.classify(S + 'modules/pesado/assets.json', S), { kind: 'heavy', id: 'pesado' });
  assert.equal(C.classify(S + 'modules/desconocido/x.js', S).kind, 'other');
  assert.equal(C.classify('https://u.github.io/otro/js/main.js', S).kind, 'other');
});
test('precache de módulos livianos', () => {
  assert.deepEqual(C.lightPrecache(), [['mod-ligero-v1', ['./modules/ligero/index.js']]]);
});
