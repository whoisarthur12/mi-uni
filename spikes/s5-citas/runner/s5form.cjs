// Flujo de interfaz en los 3 motores: ISBN → borrador → corregir apellidos → guardar; y entrada manual con validación.
const pw = require('playwright');
const URL_ = 'http://localhost:8770/mi-uni/spikes/s5-citas/';
(async () => {
  for (const n of (process.argv[2] || 'chromium,firefox,webkit').split(',')) {
    const b = await pw[n].launch(); const p = await b.newPage({ ignoreHTTPSErrors: n === 'firefox' }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL_); await p.waitForFunction(() => window.__s5);
    await p.fill('#id', '978-84-376-0494-7'); await p.click('#isbn');
    await p.waitForSelector('#form .author .fam', { timeout: 20000 });
    const draft = await p.inputValue('#form .author .fam');
    await p.fill('#form .author .fam', 'García Márquez'); await p.fill('#form .author .giv', 'Gabriel');
    await p.click('#form button:has-text("Guardar referencia")');
    await p.waitForFunction(() => window.__s5.results.runs.some((r) => r.k === 'guardada'));
    const saved1 = await p.evaluate(() => window.__s5.results.runs.filter((r) => r.k === 'guardada').at(-1));
    // Manual: página web sin fecha ni fecha de consulta → debe negarse a guardar.
    await p.click('#manual'); await p.selectOption('#form select', 'webpage');
    await p.fill('#form .author .fam', 'Universidad Autónoma de Santo Domingo');
    await p.fill('#form >> text=Título >> xpath=following-sibling::input', 'Calendario académico');
    await p.click('#form button:has-text("Guardar referencia")');
    const refusal = await p.textContent('#form [role=alert]');
    await p.fill('#form input[type=date]', '2026-11-24'); await p.click('#form button:has-text("Guardar referencia")');
    await p.waitForFunction(() => window.__s5.results.runs.filter((r) => r.k === 'guardada').length >= 2);
    const saved2 = await p.evaluate(() => window.__s5.results.runs.filter((r) => r.k === 'guardada').at(-1));
    console.log(n, JSON.stringify({ borradorApellido: draft, tras1: saved1.referencia, cita1: saved1.cita, rechazoManual: refusal, tras2: saved2.referencia, cita2: saved2.cita, errs }));
    await b.close();
  }
})();
