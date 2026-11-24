// Módulo liviano de ejemplo: se cachea con stale-while-revalidate.
export default {
  id: 'ligero', nombre: 'Ligero', pesado: false,
  montar(el) { el.textContent = 'Módulo ligero montado. Marca: __LIGERO_1__'; },
  desmontar() {},
};
