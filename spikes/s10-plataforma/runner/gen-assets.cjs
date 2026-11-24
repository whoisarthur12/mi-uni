// Regenera app/modules/pesado/assets.json (tamaño + SHA-256 de cada archivo). Uso: node runner/gen-assets.cjs
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = path.join(__dirname, '..', 'app', 'modules', 'pesado');
const files = ['index.js', '../../../../../js/vendor/ghostpdl-wasm-1.1.0/gs.wasm', '../../../../../js/vendor/ghostpdl-wasm-1.1.0/gs.js'];
const out = { module: 'pesado', version: 1, files: files.map((p) => {
  const b = fs.readFileSync(path.join(dir, p));
  return { path: p, size: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') };
}) };
fs.writeFileSync(path.join(dir, 'assets.json'), JSON.stringify(out, null, 2) + '\n');
console.log(out.files.map((f) => `${f.size}\t${f.sha256.slice(0, 12)}\t${f.path}`).join('\n'));
