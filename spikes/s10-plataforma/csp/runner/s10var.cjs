const pw = require('playwright'); const fs = require('fs'); const LOG=(process.env.WITNESS_LOG || '/tmp/witness.log');
const B = 'http://localhost:8765/spikes/s10-plataforma/csp/';
(async () => { for (const name of ['chromium','firefox','webkit']) {
  fs.writeFileSync(LOG,''); const b = await pw[name].launch(); console.log('\n==', name, b.version());
  for (const v of ['self-blob','blob-sw','sin-wasm']) {
    const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(B + `variant-${v}.html`);
    const tag = `${name}-${v}`;
    const r = { sw: await p.evaluate(() => window.__v.swRegister()), nestedUrl: await p.evaluate(t => window.__v.nestedUrl(t), tag), wasmInBlob: await p.evaluate(() => window.__v.wasmInBlob()) };
    if (v !== 'sin-wasm') r.gs = await p.evaluate(t => window.__v.gsEndToEnd(t), tag);
    else r.gs = await p.evaluate(t => window.__v.gsEndToEnd(t), tag);
    await new Promise(r => setTimeout(r, 1000));
    const hits = fs.readFileSync(LOG,'utf8').split('\n').filter(l => l.startsWith(tag));
    console.log(v.padEnd(10), JSON.stringify(r), '| testigo:', hits.length ? hits.join(',') : 'ninguna petición');
    await ctx.close();
  } await b.close(); } })();
