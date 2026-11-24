// Perfil y ajustes en Chromium, Firefox y WebKit (pages-server.cjs en :8770):
// valores por defecto, guardado automático, persistencia tras recargar, exportar e importar JSON.
// Uso: node tests/ui/ajustes.e2e.cjs [chromium,firefox,webkit]
const pw = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const URL_ = 'http://localhost:8770/mi-uni/#/ajustes';

async function caso(n) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aj-${n}-`)); const errs = []; const r = {};
  const ctx = await pw[n].launchPersistentContext(dir, { acceptDownloads: true });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 160)); });
  const val = (sel) => p.$eval(sel, (e) => e.value);
  const guardado = () => p.waitForFunction(() => /Guardado/.test(document.querySelector('.estado-fijo p')?.textContent || ''));
  try {
    await p.goto(URL_); await p.waitForSelector('[data-clave=papel]');
    r.porDefecto = { papel: await val('[data-clave=papel]'), cita: await val('[data-clave=estiloCita]'), zona: await val('[data-clave=zonaHoraria]'), margen: await val('[data-clave=margenCm]'), hoy: await p.textContent('#hoy') };
    await p.fill('[data-clave=nombre]', '  María   Suárez '); await p.press('[data-clave=nombre]', 'Tab'); await guardado();
    await p.selectOption('[data-clave=papel]', 'a4'); await guardado();
    await p.fill('[data-clave=margenCm]', '3,5'); await p.press('[data-clave=margenCm]', 'Tab'); await guardado();
    await p.selectOption('[data-clave=zonaHoraria]', 'Europe/Madrid'); await guardado();
    await p.reload(); await p.waitForSelector('[data-clave=papel]');
    r.trasRecargar = { nombre: await val('[data-clave=nombre]'), papel: await val('[data-clave=papel]'), margen: await val('[data-clave=margenCm]'), zona: await val('[data-clave=zonaHoraria]') };
    const dl = p.waitForEvent('download'); await p.click('text=Exportar ajustes');
    const f = path.join(dir, 'aj.json'); await (await dl).saveAs(f);
    const j = JSON.parse(fs.readFileSync(f, 'utf8')); r.exportado = { app: j.app, nombre: j.ajustes.perfil.nombre, papel: j.ajustes.formato.papel };
    j.ajustes.perfil.nombre = 'Importada'; j.ajustes.formato.papel = 'carta'; fs.writeFileSync(f, JSON.stringify(j));
    await p.setInputFiles('input[type=file]', f);
    await p.waitForFunction(() => /importados/.test(document.querySelector('.estado-fijo p')?.textContent || ''));
    await p.waitForSelector('[data-clave=nombre]');
    r.importado = { nombre: await val('[data-clave=nombre]'), papel: await val('[data-clave=papel]') };
    const malo = path.join(dir, 'malo.json'); fs.writeFileSync(malo, '{"x":1}'); await p.setInputFiles('input[type=file]', malo);
    await p.waitForFunction(() => /no es una copia/.test(document.querySelector('.estado-fijo p')?.textContent || '')); r.archivoAjeno = 'rechazado';
  } catch (e) { r.error = String(e.message).slice(0, 300); }
  await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
  // Ventana efímera (equivale a navegación privada): ¿se puede guardar?
  const b = await pw[n].launch(); const c = await b.newContext(); const q = await c.newPage();
  await q.goto(URL_); await q.waitForSelector('[data-clave=papel]'); await q.selectOption('[data-clave=papel]', 'a4');
  await q.waitForFunction(() => document.querySelector('.estado-fijo p')?.textContent); r.efimera = await q.textContent('.estado-fijo p'); await b.close();
  r.consola = errs; return r;
}
(async () => { for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) console.log(n, JSON.stringify(await caso(n))); })();
