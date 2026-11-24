// ADR-007: la excepción de red (DOI/ISBN) vive SOLO en el net-guard. Esta prueba recorre el repositorio y falla si:
//  1. Un archivo fuera de la lista permitida menciona uno de los 3 hosts de la excepción.
//  2. Un archivo fuera de la lista permitida importa el net-guard o usa guardedFetch/lookupURL.
//  3. Código de producción (js/core, js/engines, js/modules, js/shell) llama a fetch/XHR/WebSocket/EventSource/sendBeacon
//     con una URL absoluta, o a fetch fuera de net-guard.js.
// Uso: node --test tests/policy/net-guard-scope.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
export const HOSTS = ['api.crossref.org', 'openlibrary.org', 'googleapis.com'];

// Únicos lugares donde puede aparecer la excepción. Al crear core/net-guard.js y el módulo de fuentes (Fase 1/3) se añaden aquí.
export const ALLOW_HOSTS = [
  'spikes/s5-citas/js/net-guard.js',   // la excepción
  'spikes/s5-citas/index.html',        // CSP connect-src
  'spikes/s5-citas/test/',             // pruebas del net-guard
  'spikes/s5-citas/runner/',           // medición
  'js/core/net-guard.js', 'index.html', // futuros (producción)
  'tests/policy/',                     // esta prueba
];
export const ALLOW_IMPORT = ['spikes/s5-citas/js/net-guard.js', 'spikes/s5-citas/js/lookup.js', 'spikes/s5-citas/test/', 'js/core/net-guard.js', 'js/modules/fuentes/', 'tests/policy/'];
const PROD = ['js/core/', 'js/engines/', 'js/modules/', 'js/shell/'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'real', 'fixtures-gen']);
const EXT = /\.(m?js|cjs|html|py|json|webmanifest|css)$/; // los .md (documentación) pueden nombrar los hosts

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name); const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (EXT.test(name) && st.size < 4e6) out.push(relative(ROOT, p).split(sep).join('/'));
  }
  return out;
}
const allowed = (file, list) => list.some((a) => (a.endsWith('/') ? file.startsWith(a) : file === a));

/** Lógica de detección, separada para poder probarla con casos sintéticos. */
export function violations(file, src) {
  const v = [];
  if (file.startsWith('js/vendor/')) return v; // código de terceros: revisado aparte (ADR-008)
  for (const h of HOSTS) if (src.includes(h) && !allowed(file, ALLOW_HOSTS)) v.push(`menciona ${h}`);
  // Importar net-guard para fetchLocal (propio sitio) está permitido; la EXCEPCIÓN externa (guardedFetch/lookupURL) no.
  if (/\bguardedFetch\b|\blookupURL\b|s5-citas\/js\/net-guard/.test(src) && !allowed(file, ALLOW_IMPORT)) v.push('usa el net-guard');
  if (PROD.some((d) => file.startsWith(d)) && file !== 'js/core/net-guard.js') {
    if (/\b(fetch|importScripts|sendBeacon)\s*\(\s*['"`]https?:/.test(src) || /new\s+(WebSocket|EventSource|XMLHttpRequest)\b/.test(src)) v.push('red directa en código de producción');
    if (/\bfetch\s*\(/.test(src)) v.push('fetch fuera del net-guard (usar core/net-guard o rutas propias vía core)');
  }
  return v;
}

test('el detector reconoce violaciones (casos sintéticos)', () => {
  assert.deepEqual(violations('spikes/s9-graficos/js/x.js', 'fetch("https://api.crossref.org/works/1")'), ['menciona api.crossref.org']);
  assert.deepEqual(violations('spikes/s4/js/a.js', "import { guardedFetch } from '../../s5-citas/js/net-guard.js'"), ['usa el net-guard']);
  assert.deepEqual(violations('js/core/offline.js', "import { fetchLocal } from './net-guard.js'; fetchLocal(u)"), []);
  assert.ok(violations('js/modules/compresor/index.js', "fetch('https://evil.example/x')").includes('red directa en código de producción'));
  assert.deepEqual(violations('spikes/s5-citas/js/net-guard.js', "const A = 'https://api.crossref.org'"), []);
  assert.deepEqual(violations('spikes/s5-citas/js/lookup.js', "import { guardedFetch } from './net-guard.js'"), []);
});

test('ningún archivo fuera del net-guard usa la excepción de red', () => {
  const found = [];
  for (const f of walk(ROOT)) { const v = violations(f, readFileSync(join(ROOT, f), 'utf8')); if (v.length) found.push(`${f}: ${v.join(', ')}`); }
  assert.deepEqual(found, [], 'Violaciones de ADR-007:\n' + found.join('\n'));
});
