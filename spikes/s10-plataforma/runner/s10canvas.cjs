// Mide límites de canvas en los 3 motores con canvas/index.html. Requiere pages-server.cjs en :8770.
const pw = require('playwright'); const fs = require('fs');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s10-plataforma/canvas/';
(async () => {
  const res = {};
  for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) {
    const b = await pw[n].launch(); const p = await (await b.newContext()).newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL_);
    const t0 = Date.now();
    res[n] = { version: b.version(), ...(await p.evaluate(() => window.__canvas.runAll(24))), totalMs: Date.now() - t0, errs };
    console.log(n, JSON.stringify(res[n], (k, v) => (k === 'ua' ? undefined : v)));
    await b.close();
  }
  fs.writeFileSync(process.env.OUT || '/tmp/s10-canvas.json', JSON.stringify(res, null, 1));
})();
