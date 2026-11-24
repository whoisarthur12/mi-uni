// S5 en Chromium, Firefox y WebKit: rendimiento de citeproc, CORS real de las 3 APIs, CSP y cabeceras enviadas.
// Requiere spikes/s10-plataforma/runner/pages-server.cjs en :8770 y red hacia los 3 hosts.
const pw = require('playwright'); const fs = require('fs');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s5-citas/';
const Q = [['doi', '10.1038/nature12373'], ['doi', 'https://doi.org/10.1016/j.cell.2009.01.042'], ['doi', '10.9999/no-existe-mi-uni'], ['isbn', '978-84-376-0494-7'], ['isbn', '0-14-032872-6'], ['isbn', '9780000000002']];
(async () => {
  const res = {};
  for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) {
    // Firefox no confía en la CA del proxy del contenedor (SEC_ERROR_UNKNOWN_ISSUER): solo para medir CORS se ignora TLS.
    const b = await pw[n].launch(); const p = await b.newPage({ ignoreHTTPSErrors: n === 'firefox' }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const ext = []; p.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== 'localhost') ext.push(r); });
    await p.goto(URL_); await p.waitForFunction(() => window.__s5);
    const out = { version: b.version() };
    out.carga = await p.evaluate(() => window.__s5.load());
    out.bench10 = await p.evaluate(() => window.__s5.bench(10));
    out.bench100 = await p.evaluate(() => window.__s5.bench(100));
    out.worker = await p.evaluate(() => window.__s5.benchWorker(100));
    out.csp = await p.evaluate(() => window.__s5.cspProbe());
    out.sanitizar = await p.evaluate(() => window.__s5.sanitizeProbe());
    out.consultas = [];
    for (const [k, v] of Q) { out.consultas.push(await p.evaluate(([k, v]) => window.__s5.lookup(k, v), [k, v])); await p.waitForTimeout(300); }
    out.cabeceras = await Promise.all(ext.map(async (r) => { const h = await r.allHeaders(); return { url: r.url().slice(0, 110), method: r.method(), origin: h.origin || null, referer: h.referer || null, cookie: !!h.cookie }; }));
    out.errs = errs;
    res[n] = out;
    console.log(`\n== ${n} ${out.version}`, JSON.stringify({ carga: out.carga, bench100: { engineMs: out.bench100.engineMs, bibMs: out.bench100.bibMs, cite50Ms: out.bench100.cite50Ms }, worker: out.worker, csp: out.csp.r, xss: out.sanitizar.peligroso }));
    for (const c of out.consultas) console.log('  ', c.kind, c.input, '→', c.error ? `ERROR ${c.code}: ${c.error}` : c.encontrado === false ? 'no encontrado' : `${c.fuente}: ${c.referencia.slice(0, 140)}`, JSON.stringify(c.netlog));
    console.log('   cabeceras:', JSON.stringify(out.cabeceras));
    await b.close();
  }
  fs.writeFileSync(process.env.OUT || '/tmp/s5.json', JSON.stringify(res, null, 1));
})();
