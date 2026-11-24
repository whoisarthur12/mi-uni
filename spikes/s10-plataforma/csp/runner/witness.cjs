// Servidor testigo (otro origen). Registra cada petición recibida: es la medición real de "salió a la red".
const http = require('http'); const fs = require('fs'); const LOG = process.argv[2];
const srv = http.createServer((req, res) => {
  fs.appendFileSync(LOG, req.url.split('/hit/')[1] + '\n');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url.endsWith('.js')) { res.setHeader('Content-Type', 'text/javascript'); return res.end('export default 1;'); }
  if (req.url.includes('eventsource')) { res.setHeader('Content-Type', 'text/event-stream'); return res.end('data: x\n\n'); }
  res.end('ok');
});
srv.on('upgrade', (req, socket) => { fs.appendFileSync(LOG, req.url.split('/hit/')[1] + '\n'); socket.destroy(); });
srv.listen(8766, '127.0.0.1');
