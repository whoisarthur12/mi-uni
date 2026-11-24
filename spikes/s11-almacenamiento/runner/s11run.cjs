// S11 en Chromium, Firefox y WebKit. Requiere spikes/s10-plataforma/runner/pages-server.cjs en :8770.
// Uso: OUTDIR=/tmp/s11 node runner/s11run.cjs [chromium,firefox,webkit]
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s11-almacenamiento/';
const OUT = process.env.OUTDIR || '/tmp/s11'; fs.mkdirSync(OUT, { recursive: true });

// RSS total (MB) de los procesos del navegador de Playwright.
const rss = () => execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' }).split('\n')
  .filter((l) => /pw-browsers/.test(l) && !/ps -eo/.test(l)).reduce((a, l) => a + (parseInt(l, 10) || 0), 0) / 1024;
async function peak(fn) {
  const base = rss(); let max = base; const iv = setInterval(() => { max = Math.max(max, rss()); }, 100);
  try { const r = await fn(); return { r, baseMB: Math.round(base), peakDeltaMB: Math.round(max - base) }; } finally { clearInterval(iv); }
}

async function run(name) {
  // Perfil persistente en disco: un newContext() es tipo incógnito y guarda IndexedDB en memoria.
  const prof = (k) => { const d = path.join(OUT, `perfil-${name}-${k}`); fs.rmSync(d, { recursive: true, force: true }); return d; };
  const ctx = await pw[name].launchPersistentContext(prof('a'), { acceptDownloads: true }); const p = ctx.pages()[0] || await ctx.newPage();
  const b = { version: () => ctx.browser() ? ctx.browser().version() : name, close: () => ctx.close() };
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL_); await p.waitForFunction(() => window.__s11);
  const out = { version: b.version() };
  const step = async (k, fn) => { const t = Date.now(); try { out[k] = { ...(await fn()), ms: Date.now() - t }; } catch (e) { out[k] = { error: String(e.message).slice(0, 400) }; } console.log(name, k, JSON.stringify(out[k]).slice(0, 400)); };

  await step('blobs', async () => { const m = await peak(() => p.evaluate(() => window.__s11.benchBlobs())); return { mem: { base: m.baseMB, delta: m.peakDeltaMB }, runs: m.r.runs.filter((x) => x.k === 'blob') }; });
  await step('persist', async () => ({ r: await p.evaluate(() => window.__s11.persist()) }));
  let pid;
  await step('crear 200 MB', async () => { const m = await peak(async () => (pid = await p.evaluate(() => window.__s11.makeProject()))); return { delta: m.peakDeltaMB, est: await p.evaluate(() => window.__s11.estimate()) }; });
  const zipPath = path.join(OUT, `${name}-proyecto.zip`);
  await step('exportar', async () => {
    const m = await peak(async () => { const dl = p.waitForEvent('download', { timeout: 120000 }); await p.evaluate((id) => window.__s11.exportProject(id), pid); await (await dl).saveAs(zipPath); });
    const v = execFileSync('python3', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip(), len(z.infolist()))', zipPath], { encoding: 'utf8' }).trim();
    return { delta: m.peakDeltaMB, zipMB: +(fs.statSync(zipPath).size / 1048576).toFixed(1), pythonTestzip: v };
  });
  await step('importar', async () => {
    const m = await peak(async () => { await p.setInputFiles('#imp', zipPath); await p.waitForFunction(() => window.__s11.results.runs.filter((x) => x.k === 'importar').length >= 1, null, { timeout: 180000 }); });
    const r = await p.evaluate(() => window.__s11.results.runs.filter((x) => x.k === 'importar').at(-1));
    return { delta: m.peakDeltaMB, r, cmp: r.id ? await p.evaluate(([a, b]) => window.__s11.compare(a, b), [pid, r.id]) : null };
  });
  // Mismo ZIP otra vez en otro "navegador": contexto nuevo (perfil limpio).
  await step('importar en perfil limpio', async () => {
    const c2 = await pw[name].launchPersistentContext(prof('b')); const p2 = c2.pages()[0] || await c2.newPage(); await p2.goto(URL_); await p2.waitForFunction(() => window.__s11);
    await p2.setInputFiles('#imp', zipPath);
    await p2.waitForFunction(() => window.__s11.results.runs.some((x) => x.k === 'importar'), null, { timeout: 180000 });
    const r = await p2.evaluate(() => window.__s11.results.runs.find((x) => x.k === 'importar'));
    await c2.close(); return { r };
  });
  await step('ZIP dañado', async () => {
    const bad = path.join(OUT, `${name}-danado.zip`); const buf = fs.readFileSync(zipPath); buf[buf.length - 30 * 1048576] ^= 0xff; fs.writeFileSync(bad, buf);
    await p.setInputFiles('#imp', bad);
    await p.waitForFunction(() => window.__s11.results.runs.filter((x) => x.k === 'importar').length >= 2, null, { timeout: 180000 });
    return { r: await p.evaluate(() => window.__s11.results.runs.filter((x) => x.k === 'importar').at(-1)) };
  });
  await step('importación interrumpida', async () => {
    const d = prof('c');
    let c = await pw[name].launchPersistentContext(d); let q = c.pages()[0] || await c.newPage();
    await q.goto(URL_); await q.waitForFunction(() => window.__s11);
    await q.setInputFiles('#imp', zipPath); await q.waitForTimeout(name === 'firefox' ? 3500 : 1200);
    const half = await q.evaluate(async () => { const S = await import('./js/store.js'); const db = await S.openDB();
      return new Promise((ok) => { const r = db.transaction('proyectos').objectStore('proyectos').getAll(); r.onsuccess = () => ok(r.result.map((p) => !!p.importando)); }); });
    await c.close(); // "se cierra la pestaña"
    c = await pw[name].launchPersistentContext(d); q = c.pages()[0] || await c.newPage();
    await q.goto(URL_); await q.waitForFunction(() => window.__s11);
    const after = await q.evaluate(async () => { await window.__s11.estimate(); const S = await import('./js/store.js'); const db = await S.openDB();
      const n = await S.cleanupIncompleteImports(db);
      return new Promise((ok) => { const r = db.transaction(['proyectos', 'blobs']).objectStore('blobs').count(); r.onsuccess = () => ok({ limpiadas: n, blobsRestantes: r.result }); }); });
    await c.close(); return { proyectosAlCerrar_importando: half, ...after };
  });
  if (name === 'webkit' || process.env.QUOTA) await step('cuota', async () => ({ r: (await p.evaluate(() => window.__s11.fillUntilError(50, 1500))).runs.at(-1) }));
  out.errs = errs;
  await b.close();
  return out;
}
(async () => {
  const res = {};
  for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) res[n] = await run(n);
  fs.writeFileSync(path.join(OUT, 's11.json'), JSON.stringify(res, null, 1));
})();
