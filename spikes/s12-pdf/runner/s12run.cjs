// S12 en Chromium, Firefox y WebKit. Requiere pages-server.cjs (:8770) y fixtures en spikes/s12-pdf/fixtures-gen.
// Uso: OUTDIR=/tmp/s12 node runner/s12run.cjs [chromium,firefox,webkit]
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s12-pdf/';
const OUT = process.env.OUTDIR || '/tmp/s12'; fs.mkdirSync(OUT, { recursive: true });
const fx = (n) => `./fixtures-gen/${n}`;
const rss = () => execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' }).split('\n').filter((l) => /pw-browsers/.test(l) && !/ps -eo/.test(l)).reduce((a, l) => a + (parseInt(l, 10) || 0), 0) / 1024;
async function peak(fn) { const base = rss(); let max = base; const iv = setInterval(() => { max = Math.max(max, rss()); }, 100); try { return { r: await fn(), picoMB: Math.round(max - base) }; } finally { clearInterval(iv); } }
const pyCheck = (f) => execFileSync('python3', ['-I', '-c', 'import sys,pypdf,pypdfium2 as p;r=pypdf.PdfReader(sys.argv[1]);d=p.PdfDocument(sys.argv[1]);print(len(r.pages), len(d), r.is_encrypted)', f], { encoding: 'utf8' }).trim();

async function fresh(b, name) {
  const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
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
  const step = async (k, fn) => { try { out[k] = await fn(); } catch (e) { out[k] = { error: String(e.message).slice(0, 300) }; } console.log(name, k, JSON.stringify(out[k]).slice(0, 420)); };
  for (const variant of ['pdf-lib', 'cantoo']) {
    await step(`unir 3×28 MB (${variant})`, async () => { const { ctx, p, errs } = await fresh(b, name);
      const m = await peak(() => p.evaluate(([s, v]) => window.__s12.merge(s, { variant: v }), [[fx('sint-30mb-a.pdf'), fx('sint-30mb-b.pdf'), fx('sint-30mb-c.pdf')], variant]));
      const check = await download(p, path.join(OUT, `${name}-${variant}-unido.pdf`)); await ctx.close();
      return { ...m.r, picoMB: m.picoMB, pypdf_pdfium_cifrado: check, errs }; });
  }
  await step('dividir 100 p en 100', async () => { const { ctx, p } = await fresh(b, name); const r = await p.evaluate((s) => window.__s12.split(s), fx('sint-100p.pdf')); await ctx.close(); return r; });
  await step('miniaturas 100 p', async () => { const { ctx, p, errs } = await fresh(b, name);
    const m = await peak(() => p.evaluate((s) => window.__s12.thumbs(s), fx('sint-100p.pdf'))); await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  await step('miniaturas 100 p como <img>', async () => { const { ctx, p, errs } = await fresh(b, name);
    const m = await peak(() => p.evaluate((s) => window.__s12.thumbs(s, { asImg: true }), fx('sint-100p.pdf'))); await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  await step('render nativo ×5 (12 MP)', async () => { const { ctx, p, errs } = await fresh(b, name);
    const m = await peak(() => p.evaluate((s) => window.__s12.renderBig(s, { scale: 5 }), fx('sint-30mb-a.pdf'))); await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  await step('render 3000×4000 ×2', async () => { const { ctx, p, errs } = await fresh(b, name);
    const m = await peak(() => p.evaluate((s) => window.__s12.renderBig(s, { scale: 2 }), fx('sint-30mb-a.pdf'))); await ctx.close(); return { ...m.r, picoMB: m.picoMB, errs }; });
  for (const asImg of [false, true]) {
    await step(`miniaturas 3×28 MB unido (18 p)${asImg ? ' como <img>' : ''}`, async () => { const { ctx, p } = await fresh(b, name);
      const m = await peak(async () => { await p.evaluate((s) => window.__s12.merge(s), [fx('sint-30mb-a.pdf'), fx('sint-30mb-b.pdf'), fx('sint-30mb-c.pdf')]); return p.evaluate((a) => window.__s12.thumbs(window.__lastBlob, { asImg: a }), asImg); });
      await ctx.close(); return { ...m.r, picoMB_unir_y_miniaturas: m.picoMB }; });
  }
  await step('cifrados y formulario', async () => { const { ctx, p, errs } = await fresh(b, name);
    const a = await p.evaluate((s) => window.__s12.encrypted(s, 'clave'), fx('sint-cifrado-usuario.pdf'));
    const salidas = {};
    for (const k of await p.evaluate(() => Object.keys(window.__encOut || {}))) {
      const dl = p.waitForEvent('download'); await p.evaluate((k) => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(window.__encOut[k]), download: k + '.pdf' }); document.body.append(a); a.click(); }, k);
      const f = path.join(OUT, `${name}-cifrado-${k}.pdf`); await (await dl).saveAs(f);
      salidas[k] = execFileSync('python3', ['-I', '-c', 'import sys,pypdf\ntry:\n r=pypdf.PdfReader(sys.argv[1]); t=r.pages[0].extract_text() if not r.is_encrypted else "(cifrado)"; print("cifrado=%s texto=%r" % (r.is_encrypted, (t or "")[:40]))\nexcept Exception as e: print("ERROR", type(e).__name__, str(e)[:80])', f], { encoding: 'utf8' }).trim();
    }
    await p.evaluate(() => { window.__encOut = {}; });
    const c = await p.evaluate((s) => window.__s12.encrypted(s), fx('sint-cifrado-solo-dueno.pdf'));
    const f = await p.evaluate((s) => window.__s12.form(s), fx('sint-formulario.pdf'));
    const fpath = path.join(OUT, `${name}-formulario.pdf`); await download(p, fpath);
    const fields = execFileSync('python3', ['-I', '-c', 'import sys,pypdf;print(pypdf.PdfReader(sys.argv[1]).get_fields()["nombre"].get("/V"), pypdf.PdfReader(sys.argv[1]).get_fields()["acepto"].get("/V"))', fpath], { encoding: 'utf8' }).trim();
    const k = await p.evaluate((s) => window.__s12.corrupt(s), fx('sint-corrupto.pdf'));
    await ctx.close(); return { usuario: a, salidasCifrado: salidas, soloDueno: c, formulario: { ...f, leidoPorPypdf: fields }, corrupto: k, errs }; });
  await b.close(); return out;
}
(async () => { const res = {}; for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) res[n] = await run(n); fs.writeFileSync(path.join(OUT, 's12.json'), JSON.stringify(res, null, 1)); })();
