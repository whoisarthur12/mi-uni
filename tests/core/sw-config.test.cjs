// Service worker de la app (ADR-005): lista del shell completa, clasificación de URLs y manifiesto de descarga.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..', '..');
const C = require(path.join(ROOT, 'sw-config.js'));
const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

test('todos los archivos del shell existen', () => {
  for (const f of C.SHELL_FILES) if (f !== './') assert.ok(fs.existsSync(path.join(ROOT, f)), `falta ${f}`);
});

test('todo el código del shell está en el precache (si no, falla sin conexión)', () => {
  const necesarios = [...walk('js/core'), ...walk('js/shell'), ...walk('css'), 'js/app.js', 'js/theme-boot.js', ...walk('icons')].map((f) => './' + f.split(path.sep).join('/'));
  const faltan = necesarios.filter((f) => !C.SHELL_FILES.includes(f));
  assert.deepEqual(faltan, []);
});

test('el código de cada módulo está en su lista de archivos', () => {
  for (const [id, m] of Object.entries(C.MODULES)) {
    const js = walk(`js/modules/${id}`).filter((f) => /\.(m?js|css)$/.test(f)).map((f) => f.split(path.sep).join('/'));
    assert.deepEqual(js.filter((f) => !m.files.includes(f)), [], `módulo ${id}`);
    for (const f of m.files) assert.ok(fs.existsSync(path.join(ROOT, f)), `falta ${f}`);
  }
});

test('el motor PDF compartido está en la lista de algún módulo y su lista de archivos pesados coincide', () => {
  const todos = Object.values(C.MODULES).flatMap((m) => m.files || []);
  const motor = walk('js/engines').filter((f) => /\.m?js$/.test(f)).map((f) => f.split(path.sep).join('/'));
  assert.deepEqual(motor.filter((f) => !todos.includes(f)), []);
  const src = fs.readFileSync(path.join(ROOT, 'js/engines/pdf/motores.js'), 'utf8');
  const lista = JSON.parse(src.match(/ARCHIVOS_MOTOR_PDF = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  for (const f of lista) assert.ok(C.MODULES.compresor.assets.files.includes(f), f);
});

test('el manifiesto de descarga coincide con los archivos (tamaño y SHA-256)', () => {
  for (const [id, m] of Object.entries(C.MODULES)) {
    if (!m.assets) continue;
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, m.assets.manifest), 'utf8'));
    assert.equal(man.version, m.version, `${id}: versión`);
    assert.equal(man.files.length, m.assets.files.length);
    for (const f of man.files) {
      const buf = fs.readFileSync(path.join(path.dirname(path.join(ROOT, m.assets.manifest)), f.path));
      assert.equal(buf.length, f.size, f.path);
      assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), f.sha256, f.path);
    }
  }
});

test('clasificación de URLs', () => {
  const S = 'https://x.github.io/mi-uni/';
  assert.equal(C.classify(S, S).kind, 'shell');
  assert.equal(C.classify(S + 'css/ui.css?v=1', S).kind, 'shell');
  assert.deepEqual(C.classify(S + 'js/modules/compresor/index.js', S), { kind: 'light', id: 'compresor' });
  assert.deepEqual(C.classify(S + 'js/vendor/ghostpdl-wasm-1.1.0/gs.wasm', S), { kind: 'heavy', id: 'compresor' });
  assert.equal(C.classify(S + 'spikes/s1-ghostscript/index.html', S).kind, 'other');
  assert.equal(C.classify('https://otro.example/x.js', S).kind, 'other');
});

test('solo la raíz e index.html abren la app; las demás páginas del sitio no', () => {
  const S = 'https://x.github.io/mi-uni/';
  assert.equal(C.isAppNavigation(S, S), true);
  assert.equal(C.isAppNavigation(S + 'index.html#/ajustes', S), true);
  for (const p of ['pruebas/', 'diseno/', 'spikes/s12-pdf/', 'spikes/s10-plataforma/app/']) assert.equal(C.isAppNavigation(S + p, S), false, p);
});

test('limpieza de cachés', () => {
  const cur = C.shellCache();
  assert.deepEqual(C.planCleanup(['shell-v0', cur, 'mod-compresor-v0', C.modCache('compresor'), 'ajena', 'mod-borrado-v3'], []), ['shell-v0', 'mod-compresor-v0', 'mod-borrado-v3']);
  assert.deepEqual(C.planCleanup(['assets-compresor-v0', C.assetsCache('compresor')], []), []);
  assert.deepEqual(C.planCleanup(['assets-compresor-v0', C.assetsCache('compresor')], [C.assetsCache('compresor')]), ['assets-compresor-v0']);
});
