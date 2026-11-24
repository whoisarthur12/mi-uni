// Servidor estático que imita a GitHub Pages: sitio bajo /mi-uni/, Cache-Control max-age=600, ETag.
// Control de pruebas: GET /__ctl?build=2 reemplaza marcadores para simular una publicación nueva;
// GET /__ctl?down=1 hace que todo responda 503 (servidor caído); /__ctl?corrupt=1 altera gs.js.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const PREFIX = '/mi-uni/';
const PORT = +(process.env.PORT || 8770);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8' };
const state = { build: 1, down: false, corrupt: false, precacheMode: 'reload', shellVersion: 1, pesadoVersion: 1, log: [] };

function transform(rel, buf) {
  if (!/\.(js|html)$/.test(rel)) return buf;
  let s = buf.toString('utf8');
  if (state.build !== 1) s = s.replace(/__BUILD_1__/g, `__BUILD_${state.build}__`).replace(/__LIGERO_1__/g, `__LIGERO_${state.build}__`);
  if (rel.endsWith('sw-config.js')) {
    s = s.replace(/const SHELL_VERSION = \d+;/, `const SHELL_VERSION = ${state.shellVersion};`)
      .replace("const PRECACHE_MODE = 'reload';", `const PRECACHE_MODE = '${state.precacheMode}';`)
      .replace('pesado: { version: 1,', `pesado: { version: ${state.pesadoVersion},`)
      .replace('ligero: { version: 1,', `ligero: { version: ${state.build},`);
  }
  return Buffer.from(s);
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__ctl') {
    for (const [k, v] of u.searchParams) state[k] = k === 'precacheMode' ? v : (v === 'true' ? true : v === 'false' ? false : +v);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ...state, log: state.log.length }));
    return;
  }
  if (u.pathname === '/__log') { res.writeHead(200); res.end(JSON.stringify(state.log)); state.log = []; return; }
  state.log.push(u.pathname.replace(PREFIX, ''));
  if (state.down) { res.writeHead(503); res.end('caído'); return; }
  if (!u.pathname.startsWith(PREFIX)) { res.writeHead(404); res.end('404 (fuera de /mi-uni/)'); return; }
  let rel = decodeURIComponent(u.pathname.slice(PREFIX.length));
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  let st; try { st = fs.statSync(file); } catch { res.writeHead(404); res.end('404'); return; }
  if (st.isDirectory()) {
    if (!u.pathname.endsWith('/')) { res.writeHead(301, { Location: u.pathname + '/' }); res.end(); return; }
    rel = path.join(rel, 'index.html');
  }
  let body; try { body = transform(rel, fs.readFileSync(path.join(ROOT, rel))); } catch { res.writeHead(404); res.end('404'); return; }
  if (state.corrupt && rel.endsWith('gs.js')) { body = Buffer.from(body); body[100] ^= 1; }
  const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
  const headers = { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
  res.writeHead(200, { ...headers, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, '127.0.0.1', () => console.log(`Pages simulado: http://localhost:${PORT}${PREFIX}`));
