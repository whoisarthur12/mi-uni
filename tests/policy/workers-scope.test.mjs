// ADR-004 y decisión del dueño (Fase 1): todos los workers se crean en js/core/workers.js
// (blob: + lockdown). Falla si `new Worker(` o `new SharedWorker(` aparece en cualquier otro archivo.
// Exentos: código de terceros (js/vendor/, revisado aparte) y los spikes de la Fase 0 (páginas de medición).
// Uso: node --test tests/policy/workers-scope.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PERMITIDO = 'js/core/workers.js';
const EXENTOS = ['js/vendor/', 'spikes/', 'tests/policy/'];
const SKIP = new Set(['.git', 'node_modules', 'real', 'fixtures-gen']);
const RE = /new\s+(Shared)?Worker\s*\(/;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n); const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (/\.(m?js|cjs|html)$/.test(n)) out.push(relative(ROOT, p).split(sep).join('/'));
  }
  return out;
}
export const viola = (file, src) => file !== PERMITIDO && !EXENTOS.some((e) => file.startsWith(e)) && RE.test(src);

test('el detector reconoce un worker creado fuera de core/workers.js', () => {
  assert.equal(viola('js/modules/compresor/index.js', "const w = new Worker('./gs.js', { type: 'module' })"), true);
  assert.equal(viola('js/shell/shell.js', 'new SharedWorker(u)'), true);
  assert.equal(viola('js/core/workers.js', 'new Worker(url)'), false);
  assert.equal(viola('js/vendor/pdfjs-6.5.438/pdf.min.mjs', 'new Worker(x)'), false);
});

test('ningún archivo crea workers fuera de js/core/workers.js', () => {
  const malos = walk(ROOT).filter((f) => viola(f, readFileSync(join(ROOT, f), 'utf8')));
  assert.deepEqual(malos, []);
});
