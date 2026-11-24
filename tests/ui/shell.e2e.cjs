// Prueba de punta a punta del shell (ADR-005) en Chromium, Firefox y WebKit, contra pages-server.cjs (:8770):
// instalación del SW, precache, navegación, módulo descargado para usar sin conexión, modo sin conexión,
// que el SW no secuestre otras páginas del sitio y actualización con «Actualizar».
// Uso: node tests/ui/shell.e2e.cjs [chromium,firefox,webkit]
const pw = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const BASE = 'http://localhost:8770/mi-uni/';
const ctl = (q) => fetch('http://localhost:8770/__ctl?' + q).then((r) => r.json());
// «Sin conexión»: el servidor cae (503) y, salvo en WebKit, también context.setOffline().
// En el WebKit de Playwright setOffline corta incluso lo que responde el service worker (no pasa en Safari):
// medido el 24-nov-2026, hasta la recarga de la app falla. Por eso en WebKit solo cae el servidor.
const sinRed = async (n, ctx, on) => { await ctl('down=' + on); if (n !== 'webkit') await ctx.setOffline(on); };

async function caso(n) {
  const r = {}; const errs = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `miuni-${n}-`));
  const ctx = await pw[n].launchPersistentContext(dir, { viewport: { width: 390, height: 844 } });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 160)); });
  const paso = async (k, fn) => { try { r[k] = await fn(); } catch (e) { r[k] = 'ERROR ' + String(e.message).slice(0, 200); } };
  try {
    await ctl('shellVersion=3&down=false');
    await paso('1 instala y controla', async () => {
      await p.goto(BASE); await p.waitForSelector('.rejilla .tarjeta');
      await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
      return p.evaluate(async () => { const k = await caches.keys(); const s = await caches.open(k.find((x) => x.startsWith('shell-'))); return { caches: k.sort(), shell: (await s.keys()).length }; });
    });
    await paso('2 navegación', async () => {
      const t = [];
      for (const [h, sel] of [['#/proyectos', '.vacio'], ['#/ajustes', '.segmentos'], ['#/m/compresor', '.descarga'], ['#/', '.rejilla']]) { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForSelector(sel); t.push(await p.title()); }
      return t;
    });
    await paso('3 descargar motor', async () => {
      await p.evaluate(() => { location.hash = '#/m/compresor'; }); await p.waitForSelector('.descarga button');
      const t0 = Date.now(); await p.click('.descarga button:not([hidden])');
      await p.waitForFunction(() => /Descargado/.test(document.querySelector('.descarga p[role=status]')?.textContent || ''), null, { timeout: 120000 });
      const c = await p.evaluate(async () => { const c = await caches.open('assets-compresor-v1'); return (await c.keys()).map((x) => x.url.split('/').pop()); });
      return { ms: Date.now() - t0, archivos: c.sort() };
    });
    await paso('4 sin conexión', async () => {
      await sinRed(n, ctx, true);
      await p.goto(BASE + '#/'); await p.waitForSelector('.rejilla .tarjeta');
      await p.evaluate(() => { location.hash = '#/m/compresor'; }); await p.waitForSelector('.descarga');
      const wasm = await p.evaluate(async () => { const r = await fetch('./js/vendor/ghostpdl-wasm-1.1.0/gs.wasm'); return { ok: r.ok, bytes: (await r.arrayBuffer()).byteLength }; });
      const desc = await p.textContent('.descarga p[role=status]');
      const otra = await p.goto(BASE + 'pruebas/').then((x) => x && x.status()).catch((e) => 'error de red');
      await sinRed(n, ctx, false);
      return { wasm, desc, otraPaginaSinRed: otra };
    });
    await paso('5 otras páginas no son la app', async () => {
      await p.goto(BASE + 'pruebas/'); const a = await p.textContent('h1');
      await p.goto(BASE + 'diseno/#inicio'); const b = await p.title();
      return { pruebas: a, diseno: b };
    });
    await paso('6 actualización', async () => {
      await p.goto(BASE + '#/ajustes'); await p.waitForSelector('.segmentos');
      await ctl('shellVersion=4');
      await p.click('text=Buscar actualización');
      await p.waitForSelector('#actualizacion:not([hidden])', { timeout: 30000 });
      await Promise.all([p.waitForEvent('load', { timeout: 30000 }), p.click('#aplicar-actualizacion')]);
      await p.waitForSelector('.segmentos');
      await p.waitForTimeout(500);
      return p.evaluate(async () => (await caches.keys()).sort());
    });
  } finally { await sinRed(n, ctx, false).catch(() => {}); await ctl('shellVersion=3'); await ctx.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  r.consola = errs;
  return r;
}
(async () => { for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) console.log(n, JSON.stringify(await caso(n), null, 1)); })();
