const pw = require('playwright'); const fs = require('fs');
const BASE = 'http://localhost:8765/spikes/s10-plataforma/csp/'; const W = 'http://127.0.0.1:8766'; const LOG = (process.env.WITNESS_LOG || '/tmp/witness.log');
const vectors = ['fetch','xhr','websocket','eventsource','import','importScripts','nested-worker'];
(async () => {
  const summary = {};
  for (const name of ['chromium','firefox','webkit']) {
    fs.writeFileSync(LOG, '');
    const b = await pw[name].launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
    const errs = []; p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,160)); });
    await p.goto(BASE + 'index.html');
    const r1 = await p.evaluate(([w,n]) => window.__s10.run(w, n+'-sinSW', ['url','blob','locked','blob+locked']), [W,name]);
    let sw; try { sw = await p.evaluate(() => window.__s10.swReady()); } catch (e) { sw = { error: e.message }; }
    await p.reload(); await p.waitForTimeout(300);
    const r2 = await p.evaluate(([w,n]) => window.__s10.run(w, n+'-conSW', ['sw-header']), [W,name]);
    await p.goto(BASE + 'sw-doc.html'); await p.waitForTimeout(300);
    const r3 = await p.evaluate(([w,n]) => window.__s10.run(w, n+'-docSW', ['url']), [W,name]);
    await new Promise(r => setTimeout(r, 1500));
    const hits = new Set(fs.readFileSync(LOG,'utf8').split('\n').filter(Boolean).map(s => s.replace(/\.js$/,'').replace(/\?.*$/,'')));
    const row = (prefix, scen) => Object.fromEntries(vectors.map(v => [v, hits.has(`${name}-${prefix}-${scen}-${v}`) ? 'SALE' : 'bloq']));
    summary[name] = {
      version: b.version(), sw, controlledDuringR2: r2.controlled, controlledDuringR3: r3.controlled,
      pagina_meta: hits.has(`${name}-sinSW-page-page-fetch`) ? 'SALE' : 'bloq',
      'url (control)': row('sinSW','url'), 'a) blob': row('sinSW','blob'), 'c) lockdown': row('sinSW','locked'), 'a+c) blob+lockdown': row('sinSW','blob+locked'),
      'b) cabecera SW (worker)': row('conSW','sw-header'),
      'b) doc solo con CSP del SW: página': hits.has(`${name}-docSW-page-page-fetch`) ? 'SALE' : 'bloq', 'b) doc SW: worker url': row('docSW','url'),
      wasm: { url: r1.url.wasm, blob: r1.blob.wasm, swHeader: r2['sw-header'].wasm },
      localErrors: { blob: r1.blob, swHeader: r2['sw-header'], locked: r1.locked },
      consoleErrors: errs.length,
    };
    await b.close();
  }
  fs.writeFileSync('/tmp/s10-csp.json', JSON.stringify(summary, null, 1));
  for (const [n, s] of Object.entries(summary)) {
    console.log(`\n== ${n} ${s.version} | SW: ${JSON.stringify(s.sw)} ctrl=${s.controlledDuringR2}/${s.controlledDuringR3} | página meta: ${s.pagina_meta} | wasm ${JSON.stringify(s.wasm)}`);
    for (const k of ['url (control)','a) blob','c) lockdown','a+c) blob+lockdown','b) cabecera SW (worker)','b) doc SW: worker url']) console.log(k.padEnd(26), vectors.map(v => `${v}:${s[k][v]}`).join('  '));
    console.log('b) doc solo CSP SW: página', s['b) doc solo con CSP del SW: página']);
  }
})();
