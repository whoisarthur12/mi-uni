// Compresor de PDF de punta a punta en Chromium, Firefox y WebKit contra pages-server.cjs (:8770).
// Fixtures SINTÉTICOS (nunca PDFs del usuario): FX_S12 = carpeta de spikes/s12-pdf/gen_fixtures.py,
// FX_S1 = carpeta de spikes/s1-ghostscript/gen_fixtures.py (opcional, para 80 MB).
// Uso: FX_S12=/tmp/s12fx [FX_S1=/tmp/s1fx] OUTDIR=/tmp/comp node tests/ui/compresor.e2e.cjs [chromium,firefox,webkit] [casos]
const pw = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const BASE = 'http://localhost:8770/mi-uni/#/m/compresor';
const FX12 = process.env.FX_S12; const FX1 = process.env.FX_S1;
const OUT = process.env.OUTDIR || fs.mkdtempSync(path.join(os.tmpdir(), 'comp-')); fs.mkdirSync(OUT, { recursive: true });
const rss = () => execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' }).split('\n').filter((l) => /pw-browsers/.test(l) && !/ps -eo/.test(l)).reduce((a, l) => a + (parseInt(l, 10) || 0), 0) / 1024;
async function pico(fn) { const base = rss(); let max = base; const iv = setInterval(() => { max = Math.max(max, rss()); }, 100); try { return { r: await fn(), picoMB: Math.round(max - base) }; } finally { clearInterval(iv); } }
const py = (f) => JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys,json,os,pypdf,pypdfium2 as p;r=pypdf.PdfReader(sys.argv[1]);d=p.PdfDocument(sys.argv[1]);print(json.dumps({"pypdf":len(r.pages),"pdfium":len(d),"bytes":os.path.getsize(sys.argv[1]),"cifrado":r.is_encrypted,"texto":(r.pages[0].extract_text() or "")[:30]}))', f], { encoding: 'utf8' }));

async function abrir(n, dir) {
  const ctx = await pw[n].launchPersistentContext(dir, { acceptDownloads: true, viewport: { width: 390, height: 844 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE); await p.waitForSelector('text=Elegir un PDF');
  return { ctx, p, errs };
}
async function elegir(p, f) { await p.setInputFiles('input[type=file][accept*=pdf]', f); }
const listo = (p) => p.waitForSelector('text=¿Cómo lo quieres?', { timeout: 60000 });
async function comprimir(p, { objetivo, manual } = {}) {
  if (manual) { await p.click('text=Manual'); await p.selectOption('#dpi', String(manual.dpi)); await p.fill('#calidad', String(manual.calidad)); }
  else if (objetivo) await p.fill('#objetivo', objetivo);
  const t0 = Date.now();
  await p.click('button:has-text("Comprimir")');
  await p.waitForFunction(() => document.querySelector('.ventana, .estado-error, .banda') && !document.querySelector('.progreso:not([hidden])') || /No se pudo comprimir/.test(document.querySelector('.estado-fijo p')?.textContent || ''), null, { timeout: 600000 });
  return { ms: Date.now() - t0, texto: (await p.textContent('main')).replace(/\s+/g, ' '), estado: await p.textContent('.estado-fijo p') };
}
async function descargar(p, sel, archivo) {
  const dl = p.waitForEvent('download', { timeout: 60000 }); await p.click(sel);
  const f = path.join(OUT, archivo); await (await dl).saveAs(f); return py(f);
}
const extraer = (texto, re) => (texto.match(re) || [])[1];

const CASOS = {
  async objetivo28(n, ctx) { // 6 fotos 3000×4000 (27,9 MB) → meta 4,8 MB
    await elegir(ctx.p, path.join(FX12, 'sint-30mb-a.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p));
    const d = await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-28mb.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)Descargar/), salida: d };
  },
  async objetivo100p(n, ctx) { // 100 páginas (30,7 MB): búsqueda con páginas de muestra
    await elegir(ctx.p, path.join(FX12, 'sint-100p.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p));
    const d = await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-100p.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)Descargar/), salida: d };
  },
  async manual(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-30mb-a.pdf')); await listo(ctx.p);
    const m = await comprimir(ctx.p, { manual: { dpi: 110, calidad: 50 } });
    const d = await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-manual.pdf`);
    return { ms: m.ms, resultado: extraer(m.texto, /Resultado(.*?)Descargar/), salida: d };
  },
  async escalera(n, ctx) { // meta imposible sin la escalera: 0,3 MB
    await elegir(ctx.p, path.join(FX12, 'sint-30mb-a.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p, { objetivo: '0,3' }));
    const botones = await ctx.p.$$eval('.ventana .acciones button', (b) => b.map((x) => x.textContent));
    const d = await descargar(ctx.p, '.ventana .acciones button >> nth=0', `${n}-escalera.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)(Descargar|$)/), botones, primera: d };
  },
  async escaleraPesadas(n, ctx) { // texto + fotos con meta baja: debería bastar con rasterizar solo las páginas pesadas
    if (!FX1) return 'sin FX_S1';
    await elegir(ctx.p, path.join(FX1, 'sint-mixto-10p.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p, { objetivo: '0,2' }));
    const d = await descargar(ctx.p, '.ventana .acciones button >> nth=0', `${n}-pesadas.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)Descargar/), efectos: await ctx.p.$$eval('.efectos li', (l) => l.map((x) => x.textContent)), salida: d };
  },
  async partes(n, ctx) { // meta de 0,15 MB: solo se puede dividiendo en partes
    await elegir(ctx.p, path.join(FX12, 'sint-30mb-a.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p, { objetivo: '0,15' }));
    const botones = await ctx.p.$$eval('.ventana .acciones button', (b) => b.map((x) => x.textContent));
    const ok = !!(await ctx.p.$('.ventana'));
    const partes = [];
    if (ok) for (let i = 0; i < botones.filter((b) => /Descargar/.test(b)).length; i++) partes.push(await descargar(ctx.p, `.ventana .acciones button >> nth=${i}`, `${n}-parte${i + 1}.pdf`));
    return { ms: m.r.ms, resultado: ok ? extraer(m.r.texto, /Resultado(.*?)(Descargar|$)/) : (m.r.texto.match(/No se entrega[^.]*\./)?.[0] || m.r.estado), partes };
  },
  async yaCumple(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-texto-30p.pdf')); await listo(ctx.p);
    return (await comprimir(ctx.p)).texto.match(/Este PDF ya pesa[^.]*\./)?.[0];
  },
  async contrasena(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-cifrado-usuario.pdf'));
    await ctx.p.waitForSelector('dialog'); const t1 = await ctx.p.textContent('dialog h2');
    await ctx.p.fill('dialog input', 'mal'); await ctx.p.click('dialog button[value=ok]');
    await ctx.p.waitForSelector('dialog h2:has-text("incorrecta")'); await ctx.p.fill('dialog input', 'clave'); await ctx.p.click('dialog button[value=ok]');
    await listo(ctx.p); const m = await comprimir(ctx.p, { manual: { dpi: 150, calidad: 60 } });
    const ok = !!(await ctx.p.$('.ventana'));
    const d = ok ? await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-contrasena.pdf`) : m.texto.slice(0, 200);
    return { dialogo: t1, salida: d };
  },
  async sinContrasena(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-cifrado-usuario.pdf'));
    await ctx.p.waitForSelector('dialog'); await ctx.p.click('dialog button:has-text("Cancelar")');
    await ctx.p.waitForSelector('.estado-error'); return ctx.p.textContent('.estado-error');
  },
  async restringidoNo(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-cifrado-solo-dueno.pdf'));
    await ctx.p.waitForSelector('dialog'); const t = await ctx.p.textContent('dialog h2'); await ctx.p.click('dialog button:has-text("No")');
    await ctx.p.waitForSelector('.estado-error'); return { dialogo: t, mensaje: await ctx.p.textContent('.estado-error'), opciones: await ctx.p.isVisible('text=¿Cómo lo quieres?') };
  },
  async restringidoSi(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-cifrado-solo-dueno.pdf'));
    await ctx.p.waitForSelector('dialog'); await ctx.p.click('dialog button[value=ok]');
    await listo(ctx.p); const m = await comprimir(ctx.p, { manual: { dpi: 150, calidad: 60 } });
    const ok = !!(await ctx.p.$('.ventana'));
    return ok ? await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-restringido.pdf`) : m.texto.slice(0, 300);
  },
  async danado(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-corrupto.pdf'));
    await ctx.p.waitForSelector('.estado-error', { timeout: 30000 }); return ctx.p.textContent('.estado-error');
  },
  async cancelar(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-100p.pdf')); await listo(ctx.p);
    await ctx.p.click('button:has-text("Comprimir")'); await ctx.p.waitForSelector('.progreso:not([hidden])'); await ctx.p.waitForTimeout(1500);
    const t0 = Date.now(); await ctx.p.click('.progreso button:has-text("Cancelar")');
    await ctx.p.waitForFunction(() => /Cancelado/.test(document.querySelector('.estado-fijo p')?.textContent || ''), null, { timeout: 10000 });
    return { msHastaCancelado: Date.now() - t0, mensaje: await ctx.p.textContent('.estado-fijo p'), workersVivos: await ctx.p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /gs-worker/.test(r.name)).length) };
  },
  async guardarEnProyecto(n, ctx) {
    await elegir(ctx.p, path.join(FX12, 'sint-30mb-b.pdf')); await listo(ctx.p);
    await comprimir(ctx.p, { manual: { dpi: 96, calidad: 45 } });
    await ctx.p.click('.ventana button:has-text("Guardar en un proyecto")');
    await ctx.p.waitForSelector('dialog'); await ctx.p.click('dialog button[value=ok]'); // «Nuevo proyecto…» es la única opción
    await ctx.p.waitForSelector('dialog input'); await ctx.p.fill('dialog input', 'Entregas'); await ctx.p.click('dialog button[value=ok]');
    await ctx.p.waitForFunction(() => /Guardado en el proyecto/.test(document.querySelector('.estado-fijo p')?.textContent || ''), null, { timeout: 30000 });
    await ctx.p.goto(BASE.replace('#/m/compresor', '#/proyectos')); await ctx.p.waitForSelector('.tarjeta-proy');
    return ctx.p.textContent('.tarjeta-proy');
  },
  async mixto(n, ctx) { // 10 páginas de texto vectorial + una foto grande cada una (24,9 MB), S1
    if (!FX1) return 'sin FX_S1';
    await elegir(ctx.p, path.join(FX1, 'sint-mixto-10p.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p));
    const d = await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-mixto.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)Descargar/), salida: d };
  },
  async grande80(n, ctx) { // 11 fotos (79,6 MB), S1
    if (!FX1) return 'sin FX_S1';
    await elegir(ctx.p, path.join(FX1, 'sint-foto-80mb.pdf')); await listo(ctx.p);
    const m = await pico(() => comprimir(ctx.p));
    const d = await descargar(ctx.p, '.ventana button:has-text("Descargar")', `${n}-80mb.pdf`);
    return { ms: m.r.ms, picoMB: m.picoMB, resultado: extraer(m.r.texto, /Resultado(.*?)Descargar/), salida: d };
  },
};

(async () => {
  const motores = (process.argv[2] || 'chromium,firefox,webkit').split(',');
  const casos = (process.argv[3] || Object.keys(CASOS).join(',')).split(',');
  const res = {};
  for (const n of motores) {
    res[n] = {};
    for (const c of casos) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `c-${n}-`)); let ctx;
      try { ctx = await abrir(n, dir); res[n][c] = await CASOS[c](n, ctx); } catch (e) { res[n][c] = 'ERROR ' + String(e.message).slice(0, 300); }
      if (ctx) { if (ctx.errs.length) res[n][c] = { r: res[n][c], consola: ctx.errs.slice(0, 5) }; await ctx.ctx.close(); }
      fs.rmSync(dir, { recursive: true, force: true });
      console.error(n, c, JSON.stringify(res[n][c]).slice(0, 400));
    }
  }
  fs.writeFileSync(path.join(OUT, 'compresor.json'), JSON.stringify(res, null, 1));
})();
