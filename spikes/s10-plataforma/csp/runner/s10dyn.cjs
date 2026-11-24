const pw = require('playwright');
(async () => { for (const name of ['chromium','firefox','webkit']) { const b = await pw[name].launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/spikes/s10-plataforma/csp/variant-blob-sw.html');
  const r = await p.evaluate(async () => { window.__dyn = true; return window.__v.gsEndToEnd('dyn'); });
  console.log(name, JSON.stringify(r)); await b.close(); } })();
