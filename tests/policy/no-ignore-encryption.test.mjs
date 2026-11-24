// ADR-010 (decisión del dueño, 24-nov-2026): la opción de pdf-lib que ignora el cifrado está prohibida en todo el repo.
// En S12 producía páginas en blanco sin error. Esta prueba recorre TODOS los archivos (código y documentación) y falla
// si el nombre de la opción aparece. Única excepción: el propio paquete vendorizado que la define, con número de
// apariciones fijo (si cambia al actualizar el paquete, la prueba avisa para revisarlo).
// Uso: node --test tests/policy/no-ignore-encryption.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const TERM = ['ignore', 'Encryption'].join(''); // construido para que este archivo no lo contenga
const RE = new RegExp(TERM, 'gi');
export const VENDOR_DEFINES = { 'js/vendor/cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js': 4 };
const SKIP_DIRS = new Set(['.git', 'node_modules', 'real', 'fixtures-gen']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name); const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (st.isFile() && st.size < 20e6) out.push(relative(ROOT, p).split(sep).join('/'));
  }
  return out;
}

export function count(src) { return (src.match(RE) || []).length; }

test('el detector encuentra la opción (casos sintéticos)', () => {
  assert.equal(count(`PDFDocument.load(b, { ${TERM}: true })`), 1);
  assert.equal(count(`opts["${TERM.toLowerCase()}"]`), 1);
  assert.equal(count('PDFDocument.load(b, { password: "" })'), 0);
});

test('ningún archivo del repo usa ni menciona la opción', () => {
  const bad = [];
  for (const f of walk(ROOT)) {
    const n = count(readFileSync(join(ROOT, f), 'latin1'));
    if (f in VENDOR_DEFINES) { if (n !== VENDOR_DEFINES[f]) bad.push(`${f}: ${n} apariciones (se esperaban ${VENDOR_DEFINES[f]}; revisar el paquete)`); }
    else if (n) bad.push(`${f}: ${n}`);
  }
  assert.deepEqual(bad, [], 'Prohibido (ADR-010). Abrir con password y la apertura con permiso de pdf-open.');
});
