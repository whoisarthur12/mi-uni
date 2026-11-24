// Genera el manifiesto de descarga (tamaño + SHA-256) de los archivos pesados de cada módulo (ADR-005).
// Uso: node tools/gen-assets.mjs   (después de cambiar un archivo listado en sw-config.js → MODULES.*.assets)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const C = createRequire(import.meta.url)(join(ROOT, 'sw-config.js'));
for (const [id, m] of Object.entries(C.MODULES)) {
  if (!m.assets) continue;
  const manPath = join(ROOT, m.assets.manifest);
  const files = m.assets.files.map((f) => {
    const buf = readFileSync(join(ROOT, f));
    return { path: relative(dirname(manPath), join(ROOT, f)), size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
  });
  writeFileSync(manPath, JSON.stringify({ module: id, version: m.version, files }, null, 1) + '\n');
  console.log(id, files.map((f) => `${f.path} ${f.size}`).join(', '));
}
