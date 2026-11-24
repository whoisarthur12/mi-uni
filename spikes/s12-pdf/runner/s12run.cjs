// S12 en Chromium, Firefox y WebKit, tras ADR-010: guarda de salida, apertura con permiso y miniaturas perezosas.
// Requiere pages-server.cjs (:8770) y fixtures en spikes/s12-pdf/fixtures-gen.
// Uso: OUTDIR=/tmp/s12 node spikes/s12-pdf/runner/s12run.cjs [chromium,firefox,webkit]
// (Las mediciones de pdf-lib 1.17.1 y del render grande están en el commit 722223f; pdf-lib quedó descartado.)
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s12-pdf/';
const OUT = process.env.OUTDIR || '/tmp/s12'; fs.mkdirSync(OUT, { recursive: true });
const fx = (n) => `./fixtures-gen/${n}`;
const THREE = [fx('sint-30mb-a.pdf'), fx('sint-30mb-b.pdf'), fx('sint-30mb-c.pdf')];
const rss = () => execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' }).split('\n').filter((l) => /pw-browsers/.test(l) && !/ps -eo/.test(l)).reduce((a, l) => a + (parseInt(l, 10) || 0), 0) / 1024;
async function peak(fn) { const base = rss(); let max = base; const iv = setInterval(() => { max = Math.max(max, rss()); }, 100); try { return { r: await fn(), picoMB: Math.round(max - base) }; } finally { clearInterval(iv); } }
const pyCheck = (f) => execFileSync('python3', ['-I', '-c', 'import sys,pypdf,pypdfium2 as p;r=pypdf.PdfReader(sys.argv[1]);d=p.PdfDocument(sys.argv[1]);print(len(r.pages), len(d), r.is_encrypted)', f], { encoding: 'utf8' }).trim();

async function fresh(b) {
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1000, height: 800 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(URL_); await p.waitForFunction(() => window.__s12); return { ctx, p, errs };
}
async function download(p, file) {
  const dl = p.waitForEvent('download', { timeout: 120000 });
  await p.evaluate(() => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(window.__lastBlob), download: 'salida.pdf' }); document.body.append(a); a.click(); });
  await (await dl).saveAs(file); return pyCheck(file);
}

async function run(name) {
  const b = await pw[name].launch(); const out = { version: b.version() };
  const step = async (k, fn) => { try { out[k] = await fn(); } catch (e) { out[k] = { error: String(e.message).slice(0, 300) }; } console.log(name, k, JSON.stringify(out[k]).slice(0, 500)); };
  // Calentamiento descartado: la primera unión en un navegador recién abierto tarda ~5× más (compilación JIT en frío).
  await (async () => { const { ctx, p } = await fresh(b); await p.evaluate((s) => window.__s12.merge(s, { guard: false }), THREE); await ctx.close(); })();
  for (const guard of [false, true]) {
    await step(`unir 3×28 MB ${guard ? 'con' : 'sin'} guarda`, async () => { const { ctx, p, errs } = await fresh(b);
      const m = await peak(() => p.evaluate(([s, g]) => window.__s12.merge(s, { guard: g }), [THREE, guard]));
      const check = guard ? await download(p, path.join(OUT, `${name}-unido.pdf`)) : null; await ctx.close();
      return { ...m.r, picoMB: m.picoMB, pypdf_pdfium_cifrado: check, errs }; });
  }
  await step('dividir 100 p en 100 con guarda', async () => { const { ctx, p } = await fresh(b); const r = await p.evaluate((s) => window.__s12.split(s), fx('sint-100p.pdf')); await ctx.close(); return r; });
  await step('miniaturas 100 p, todas', async () => { const { ctx, p, errs } = await fresh(b);
    const m = await peak(() => p.evaluate((s) => window.__s12.thumbs(s), fx('sint-100p.pdf'))); await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  await step('miniaturas 100 p, perezosas, desplazando hasta el final', async () => { const { ctx, p, errs } = await fresh(b);
    const m = await peak(async () => { const first = await p.evaluate(async (s) => { const c = await window.__s12.thumbsLazy(s); await c.idle(); return c.stats(); }, fx('sint-100p.pdf'));
      const end = await p.evaluate(() => window.__lazy.scrollAll()); return { alAbrir: first, alFinal: end }; });
    await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  for (const lazy of [false, true]) {
    await step(`unir 3×28 MB + miniaturas del unido (18 p), ${lazy ? 'perezosas' : 'todas'}`, async () => { const { ctx, p } = await fresh(b);
      const m = await peak(async () => { await p.evaluate((s) => window.__s12.merge(s, { guard: false }), THREE);
        return lazy ? p.evaluate(async () => { const c = await window.__s12.thumbsLazy(window.__lastBlob); await c.idle(); const a = c.stats(); return { alAbrir: a, alFinal: await c.scrollAll() }; })
          : p.evaluate(() => window.__s12.thumbs(window.__lastBlob)); });
      await ctx.close(); return { ...m.r, picoMB_unir_y_miniaturas: m.picoMB }; });
  }
  await step('cifrados (flujo aprobado), formulario y dañado', async () => { const { ctx, p, errs } = await fresh(b);
    const enc = (f, auto) => p.evaluate(([s, a]) => window.__s12.encrypted(s, a), [fx(f), auto]);
    const r = {
      dueno_sinPermiso: await enc('sint-cifrado-solo-dueno.pdf', { permiso: false }),
      dueno_conPermiso: await enc('sint-cifrado-solo-dueno.pdf', { permiso: true }),
    };
    r.dueno_conPermiso_salida = await download(p, path.join(OUT, `${name}-dueno-permiso.pdf`));
    r.dueno_conPermiso_texto = execFileSync('python3', ['-I', '-c', 'import sys,pypdf;print(repr(pypdf.PdfReader(sys.argv[1]).pages[0].extract_text()[:40]))', path.join(OUT, `${name}-dueno-permiso.pdf`)], { encoding: 'utf8' }).trim();
    r.usuario_sinClave = await enc('sint-cifrado-usuario.pdf', { permiso: true, claves: [] });
    r.usuario_claveMal = await enc('sint-cifrado-usuario.pdf', { permiso: true, claves: ['x', 'y', 'z'] });
    r.usuario_clave = await enc('sint-cifrado-usuario.pdf', { permiso: true, claves: ['clave'] });
    const f = await p.evaluate((s) => window.__s12.form(s), fx('sint-formulario.pdf'));
    const fpath = path.join(OUT, `${name}-formulario.pdf`); await download(p, fpath);
    r.formulario = { ...f, leidoPorPypdf: execFileSync('python3', ['-I', '-c', 'import sys,pypdf;g=pypdf.PdfReader(sys.argv[1]).get_fields();print(g["nombre"].get("/V"), g["acepto"].get("/V"))', fpath], { encoding: 'utf8' }).trim() };
    r.corrupto = await p.evaluate((s) => window.__s12.corrupt(s), fx('sint-corrupto.pdf'));
    await ctx.close(); return { ...r, errs }; });
  await b.close(); return out;
}
(async () => { const res = {}; for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) res[n] = await run(n); fs.writeFileSync(path.join(OUT, 's12.json'), JSON.stringify(res, null, 1)); })();
