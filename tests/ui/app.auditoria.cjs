// Pantallas de la app para tools/auditar.cjs. Uso: node tools/auditar.cjs tests/ui/app.auditoria.cjs
const FX = process.env.FX_S12; // PDFs sintéticos de spikes/s12-pdf (opcional: sin ellos no se auditan las pantallas del Compresor con archivo)
// Volver a montar el módulo: ir a #/ y regresar (si la URL no cambia, la página conserva el estado anterior).
const conPdf = (f) => async (p) => { await p.evaluate(() => { location.hash = '#/'; }); await p.waitForSelector('.rejilla'); await p.evaluate(() => { location.hash = '#/m/compresor'; }); await p.waitForSelector('text=Elegir un PDF'); await p.setInputFiles('input[type=file][accept*=pdf]', `${FX}/${f}`); };
module.exports = {
  url: 'http://localhost:8770/mi-uni/',
  pantallas: [
    { nombre: 'inicio', hash: '#/' },
    { nombre: 'buscar-sin-resultados', hash: '#/', preparar: async (p) => { await p.fill('input[type=search]', 'zzz'); } },
    { nombre: 'compresor', hash: '#/m/compresor', preparar: (p) => p.waitForSelector('.descarga', { timeout: 15000 }) },
    ...(FX ? [
      { nombre: 'compresor-opciones', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-30mb-a.pdf')(p); await p.waitForSelector('text=¿Cómo lo quieres?', { timeout: 60000 }); } },
      { nombre: 'compresor-manual', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-30mb-a.pdf')(p); await p.waitForSelector('text=¿Cómo lo quieres?', { timeout: 60000 }); await p.click('text=Manual'); } },
      { nombre: 'compresor-resultado', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-texto-30p.pdf')(p); await p.waitForSelector('text=¿Cómo lo quieres?', { timeout: 60000 }); await p.click('text=Manual'); await p.click('button:has-text("Comprimir")'); await p.waitForSelector('.comp-marco canvas', { timeout: 120000 }); } },
      { nombre: 'compresor-escalera', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-30mb-a.pdf')(p); await p.waitForSelector('text=¿Cómo lo quieres?', { timeout: 60000 }); await p.fill('#objetivo', '0,3'); await p.click('button:has-text("Comprimir")'); await p.waitForSelector('.ventana', { timeout: 300000 }); } },
      { nombre: 'compresor-contrasena', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-cifrado-usuario.pdf')(p); await p.waitForSelector('dialog'); } },
      { nombre: 'compresor-danado', hash: '#/m/compresor', preparar: async (p) => { await conPdf('sint-corrupto.pdf')(p); await p.waitForSelector('.estado-error', { timeout: 30000 }); } },
    ] : []),
    { nombre: 'proyectos-vacio', hash: '#/proyectos', preparar: (p) => p.waitForSelector('.vacio, .tarjeta-proy') },
    { nombre: 'dialogo-nuevo', hash: '#/proyectos', preparar: async (p) => { await p.waitForSelector('.vacio, .tarjeta-proy'); await p.click('button:has-text("proyecto")'); await p.waitForSelector('dialog'); await p.click('dialog button[value=ok]'); await p.waitForSelector('.dialogo-error:not([hidden])'); } },
    { nombre: 'proyecto-con-archivo', hash: '#/proyectos', preparar: async (p) => {
      const id = await p.evaluate(async () => { const P = await import('./js/core/proyectos.js'); const pr = (await P.listarProyectos())[0] || await P.crearProyecto('Tesis, capítulo 2'); if (!(await P.listarRecursos(pr.id)).length) await P.guardarRecurso(pr.id, new Blob([new Uint8Array(200000)], { type: 'application/pdf' }), { nombre: 'informe.pdf', origen: 'Comprimir PDF' }); return pr.id; });
      await p.evaluate((i) => { location.hash = `#/proyectos/${i}`; }, id); await p.waitForSelector('.recurso'); } },
    { nombre: 'proyectos-lista', hash: '#/proyectos', preparar: (p) => p.waitForSelector('.tarjeta-proy') },
    { nombre: 'inicio-con-proyectos', hash: '#/', preparar: (p) => p.waitForSelector('.lista') },
    { nombre: 'ajustes', hash: '#/ajustes', preparar: (p) => p.waitForSelector('[data-clave=papel]') },
    { nombre: 'ajustes-guardado', hash: '#/ajustes', preparar: async (p) => { await p.waitForSelector('[data-clave=papel]'); await p.selectOption('[data-clave=papel]', 'a4'); await p.waitForFunction(() => /Guardado/.test(document.querySelector('.estado-fijo p')?.textContent || '')); } },
    { nombre: 'no-encontrado', hash: '#/nada' },
  ],
};
