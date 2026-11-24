// Módulo pesado de ejemplo: compila el WASM de Ghostscript (15,5 MB) para probar que la descarga offline sirve.
const WASM = new URL('../../../../../js/vendor/ghostpdl-wasm-1.1.0/gs.wasm', import.meta.url);
export default {
  id: 'pesado', nombre: 'Pesado', pesado: true,
  async montar(el) {
    const t0 = performance.now();
    const mod = await WebAssembly.compileStreaming(fetch(WASM));
    el.textContent = `Ghostscript WASM compilado en ${Math.round(performance.now() - t0)} ms; ${WebAssembly.Module.exports(mod).length} exports.`;
  },
  desmontar() {},
};
