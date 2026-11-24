// Pruebas de punta a punta de la mini-PWA (router, SW, offline, actualización) en Chromium, Firefox y WebKit.
// Requiere runner/pages-server.cjs escuchando en :8770. Uso: node runner/s10app.cjs [chromium,firefox,webkit]
const pw = require('playwright'); const http = require('http'); const fs = require('fs');
const APP = 'http://localhost:8770/mi-uni/spikes/s10-plataforma/app/';
const get = (p) => new Promise((ok, ko) => http.get('http://localhost:8770' + p, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => ok(d)); }).on('error', ko));
const ctl = (q) => get('/__ctl?' + q);
const reset = () => ctl('build=1&shellVersion=1&pesadoVersion=1&down=false&corrupt=false&precacheMode=reload');

async function step(out, name, fn) {
  const t0 = Date.now();
  try { out[name] = { ok: true, ...(await fn()), ms: Date.now() - t0 }; }
  catch (e) { out[name] = { ok: false, error: String(e.message || e).slice(0, 2000), ms: Date.now() - t0 }; }
  console.log(`  ${out[name].ok ? '✓' : '✗'} ${name}`, JSON.stringify(out[name]).slice(0, 260));
}
const st = (p) => p.evaluate(() => window.__s10app.state());
const ready = (p) => p.waitForFunction(() => window.__s10app && window.__s10app.ready).then(() => p.evaluate(() => window.__s10app.ready));
const cacheText = (p, cache, rel) => p.evaluate(async ([c, r]) => { const x = await (await caches.open(c)).match(new URL(r, location.href)); return x ? x.text() : null; }, [cache, rel]);
const go = async (p, url) => { await p.goto('about:blank'); await p.goto(url); await ready(p); };
// OFFLINE=server: solo el servidor cae (503). OFFLINE=both (por defecto): además context.setOffline().
const offline = async (ctx, on) => { await ctl('down=' + on); if (process.env.OFFLINE !== 'server') await ctx.setOffline(on); };

async function run(name) {
  await reset();
  const b = await pw[name].launch(); const ctx = await b.newContext(); const out = { version: b.version() };
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  console.log(`\n== ${name} ${b.version()}`);

  await step(out, '1 deep link en 1.ª visita', async () => {
    await get('/__log');
    await p.goto(APP + '#/m/ligero'); await ready(p);
    const s = await st(p); const reqs = JSON.parse(await get('/__log'));
    if (s.route !== '/m/ligero' || !/LIGERO_1/.test(s.text)) throw new Error(JSON.stringify(s));
    return { route: s.route, controlled: s.controlled, caches: s.sw && s.sw.caches, requests: reqs.length };
  });
  await step(out, '2 atrás/adelante/recarga', async () => {
    await p.click('a[href="#/ajustes"]'); await p.waitForFunction(() => document.querySelector('#view').dataset.route === '/ajustes');
    await p.goBack(); await p.waitForFunction(() => document.querySelector('#view').dataset.route === '/m/ligero');
    await p.goForward(); await p.waitForFunction(() => document.querySelector('#view').dataset.route === '/ajustes');
    await p.reload(); await ready(p); const s = await st(p);
    await p.goto(APP + '#/no/existe'); await p.waitForFunction(() => document.querySelector('#view').dataset.route === '/no/existe');
    const nf = (await st(p)).text.includes('No encontrado');
    if (s.route !== '/ajustes' || !nf) throw new Error('ruta ' + s.route + ' nf=' + nf);
    return { afterReload: s.route, controlled: s.controlled, notFound: nf };
  });
  await step(out, '3 sin conexión: shell + ligero', async () => {
    await offline(ctx, true);
    await get('/__log'); await go(p, APP + '#/m/ligero'); const s = await st(p);
    const leaked = JSON.parse(await get('/__log'));
    await go(p, APP + '#/m/pesado'); await p.waitForTimeout(300); const s2 = await st(p);
    await offline(ctx, false);
    if (!/LIGERO_1/.test(s.text)) throw new Error('ligero offline: ' + s.text);
    return { ligero: s.text.slice(-40), pesadoSinDescarga: s2.text.slice(-80), requestsToServerWhileOffline: leaked.length };
  });
  await step(out, '4 descarga pesado (15,5 MB)', async () => {
    await go(p, APP + '#/m/pesado');
    const r = await p.evaluate(() => window.__s10app.download('pesado'));
    const est = await p.evaluate(() => window.__s10app.estimate());
    return { ...r, usageMB: est && +(est.usage / 1048576).toFixed(1), quotaMB: est && Math.round(est.quota / 1048576) };
  });
  await step(out, '5 pesado sin conexión (WASM desde caché)', async () => {
    await offline(ctx, true);
    await go(p, APP + '#/m/pesado');
    await p.waitForFunction(() => /compilado|No se pudo|Sin conexión y/.test(document.querySelector('#view').textContent), null, { timeout: 30000 });
    const s = await st(p); await offline(ctx, false);
    if (!/compilado/.test(s.text)) throw new Error(s.text.slice(-120));
    return { text: s.text.match(/Ghostscript[^.]*\./)[0] };
  });
  await step(out, '5b import fallido en el mismo documento', async () => {
    // ¿El navegador recuerda un import() que falló sin conexión aunque luego el archivo esté en caché?
    await go(p, APP + '#/');
    await offline(ctx, true);
    const u = new URL('modules/ligero/index.js?memo=1', APP).href;
    const r = await p.evaluate(async (u) => {
      const t = async (x) => import(x).then(() => 'ok', (e) => 'falla');
      const a = await t(u);
      return { a, u };
    }, u);
    await offline(ctx, false);
    const r2 = await p.evaluate(async (u) => {
      const t = async (x) => import(x).then(() => 'ok', (e) => 'falla');
      return { mismaURL: await t(u), otraURL: await t(u + '&r=2') };
    }, u);
    return { offline: r.a, ...r2 };
  });
  await step(out, '6 hash incorrecto → se rechaza; reanudación', async () => {
    await p.evaluate(() => caches.delete('assets-pesado-v1'));
    await ctl('corrupt=true');
    const bad = await p.evaluate(() => window.__s10app.download('pesado').then((r) => ({ r }), (e) => ({ e: e.message })));
    const complete = (await p.evaluate(() => window.__s10app.loadState())).complete;
    await ctl('corrupt=false');
    const good = await p.evaluate(() => window.__s10app.download('pesado'));
    if (!bad.e || complete.length) throw new Error('corrupto aceptado');
    return { error: bad.e, completeTrasError: complete, reanudacion: { reused: good.reused, copied: good.copied, ms: good.ms } };
  });
  await step(out, '7 actualización con 2 pestañas', async () => {
    const p2 = await ctx.newPage(); await p2.goto(APP + '#/'); await ready(p2);
    await p.goto(APP + '#/ajustes'); await ready(p);
    await ctl('build=2&shellVersion=2');
    const chk = await p.evaluate(() => window.__s10app.checkUpdate());
    await p.waitForSelector('#update:not([hidden])', { timeout: 10000 });
    await p2.waitForFunction(() => !!navigator.serviceWorker.getRegistration().then((r) => r && r.waiting), null, { timeout: 10000 });
    const before = (await st(p)).sw.build;
    const nav1 = p.waitForEvent('load'), nav2 = p2.waitForEvent('load');
    await p.click('#apply-update');
    await Promise.all([nav1, nav2]); await ready(p); await ready(p2);
    const a = await st(p), c = await st(p2);
    const idx = await cacheText(p, 'shell-v2', './index.html');
    if (a.sw.build !== '__BUILD_2__' || c.sw.build !== '__BUILD_2__') throw new Error('atrapado: ' + a.sw.build + '/' + c.sw.build);
    await p2.close();
    return { check: chk, antes: before, despues: [a.sw.build, c.sw.build], caches: a.sw.caches, shellV2IndexBuild: (idx || '').match(/__BUILD_\d__/)[0] };
  });
  await step(out, '8 ligero tras actualizar (SWR)', async () => {
    await go(p, APP + '#/m/ligero'); const s = await st(p);
    return { text: s.text.match(/__LIGERO_\d__/)[0] };
  });
  await step(out, '9 precache SIN cache:reload (experimento)', async () => {
    await ctl('build=3&shellVersion=3&precacheMode=default');
    await p.evaluate(() => window.__s10app.checkUpdate());
    const idx = await cacheText(p, 'shell-v3', './index.html');
    const cfg = await cacheText(p, 'shell-v3', './sw-config.js');
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); r.waiting && r.waiting.postMessage({ type: 'SKIP_WAITING' }); });
    await p.waitForEvent('load'); await ready(p);
    return { indexEnShellV3: (idx || '').match(/__BUILD_\d__/)?.[0], swConfigEnShellV3: (cfg || '').match(/__BUILD_\d__/)?.[0], swActivo: (await st(p)).sw.build };
  });
  await step(out, '10 nueva versión de assets pesados', async () => {
    await ctl('build=4&shellVersion=4&precacheMode=reload&pesadoVersion=2');
    await p.evaluate(() => window.__s10app.checkUpdate());
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); r.waiting && r.waiting.postMessage({ type: 'SKIP_WAITING' }); });
    await p.waitForEvent('load'); await ready(p);
    const before = (await st(p)).sw.caches.filter((c) => c.startsWith('assets'));
    await offline(ctx, true);
    await go(p, APP + '#/m/pesado');
    await p.waitForFunction(() => /compilado|No se pudo|Sin conexión y/.test(document.querySelector('#view').textContent), null, { timeout: 30000 });
    const offTxt = (await st(p)).text; await offline(ctx, false);
    const r = await p.evaluate(() => window.__s10app.download('pesado'));
    const after = (await st(p)).sw.caches.filter((c) => c.startsWith('assets'));
    return { antes: before, offlineConV1: /compilado/.test(offTxt), descargaV2: { copied: r.copied, reused: r.reused, ms: r.ms, borradas: r.deleted }, despues: after };
  });
  out.pageErrors = errs;
  await b.close();
  return out;
}

(async () => {
  const which = (process.argv[2] || 'chromium,firefox,webkit').split(',');
  const res = {};
  for (const n of which) res[n] = await run(n);
  await reset();
  fs.writeFileSync(process.env.OUT || '/tmp/s10-app.json', JSON.stringify(res, null, 1));
})();
