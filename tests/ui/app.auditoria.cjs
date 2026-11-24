// Pantallas de la app para tools/auditar.cjs. Uso: node tools/auditar.cjs tests/ui/app.auditoria.cjs
module.exports = {
  url: 'http://localhost:8770/mi-uni/',
  pantallas: [
    { nombre: 'inicio', hash: '#/' },
    { nombre: 'buscar-sin-resultados', hash: '#/', preparar: async (p) => { await p.fill('input[type=search]', 'zzz'); } },
    { nombre: 'compresor', hash: '#/m/compresor', preparar: (p) => p.waitForSelector('.descarga', { timeout: 15000 }) },
    { nombre: 'proyectos', hash: '#/proyectos' },
    { nombre: 'ajustes', hash: '#/ajustes' },
    { nombre: 'no-encontrado', hash: '#/nada' },
  ],
};
