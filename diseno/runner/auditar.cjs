// Auditoría de la maqueta (ADR-013). Usa tools/auditar.cjs.
// Requiere pages-server.cjs (:8770). Uso: node diseno/runner/auditar.cjs [salida.json]
const { auditar } = require('../../tools/auditar.cjs');
const cfg = {
  url: 'http://localhost:8770/mi-uni/diseno/',
  pantallas: [
    { nombre: 'inicio', hash: '#inicio' },
    { nombre: 'comprimir', hash: '#comprimir', preparar: async (p) => { await p.click('#comprimir'); await p.waitForSelector('#resultado:not([hidden])', { timeout: 10000 }); } },
    { nombre: 'proyectos', hash: '#proyectos' },
    { nombre: 'proyectos-vacio', hash: '#proyectos', preparar: (p) => p.click('#ver-vacio') },
    { nombre: 'ajustes', hash: '#ajustes' },
  ],
};
auditar(cfg, process.argv[2]).then((f) => process.exit(f ? 1 : 0));
