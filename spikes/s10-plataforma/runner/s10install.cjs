// Criterios de instalabilidad de la PWA en Chromium (CDP: Page.getAppManifest / getInstallabilityErrors).
// Firefox y WebKit no exponen esta información. Requiere pages-server.cjs en :8770.
const pw = require('playwright');
const APP = 'http://localhost:8770/mi-uni/spikes/s10-plataforma/app/';
(async () => {
  const b = await pw.chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const check = async (label) => {
    const m = await cdp.send('Page.getAppManifest');
    const i = await cdp.send('Page.getInstallabilityErrors');
    const parsed = m.data ? JSON.parse(m.data) : null;
    console.log(label, JSON.stringify({ url: m.url, manifestErrors: m.errors, installabilityErrors: i.installabilityErrors, parsed: m.parsed }));
  };
  await p.goto(APP + '#/m/ligero'); await p.evaluate(() => window.__s10app.ready);
  await check('con SW:');
  await b.close();
})();
