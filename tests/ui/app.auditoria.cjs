// Pantallas de la app para tools/auditar.cjs. Uso: node tools/auditar.cjs tests/ui/app.auditoria.cjs
module.exports = {
  url: 'http://localhost:8770/mi-uni/',
  pantallas: [
    { nombre: 'inicio', hash: '#/' },
    { nombre: 'buscar-sin-resultados', hash: '#/', preparar: async (p) => { await p.fill('input[type=search]', 'zzz'); } },
    { nombre: 'compresor', hash: '#/m/compresor', preparar: (p) => p.waitForSelector('.descarga', { timeout: 15000 }) },
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
