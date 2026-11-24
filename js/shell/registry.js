// Catálogo de herramientas. `cargar` usa import() dinámico: el código de un módulo solo se baja al abrirlo.
// `offline`: el módulo tiene archivos pesados que se descargan aparte (sw-config.js → MODULES).
export const HERRAMIENTAS = [
  { id: 'compresor', nombre: 'Comprimir PDF', desc: 'Para que quepa en el correo o la plataforma.', icono: 'comprimir',
    claves: ['reducir', 'peso', 'tamaño', 'pdf', 'correo'], estado: 'disponible', offline: true,
    cargar: () => import('../modules/compresor/index.js') },
  { id: 'unir', nombre: 'Unir y ordenar PDF', desc: 'Junta archivos y cambia el orden de las páginas.', icono: 'unir', claves: ['juntar', 'dividir', 'páginas'], estado: 'pronto' },
  { id: 'citas', nombre: 'Citas y bibliografía', desc: 'APA 7 a partir de un DOI o un ISBN.', icono: 'citas', claves: ['referencias', 'apa', 'fuentes'], estado: 'pronto' },
  { id: 'portadas', nombre: 'Portadas', desc: 'Con los datos de tu perfil y tu curso.', icono: 'portada', claves: ['carátula', 'trabajo'], estado: 'pronto' },
];
export const herramienta = (id) => HERRAMIENTAS.find((t) => t.id === id);
