// Variante sin import estático (prueba de compatibilidad con Firefox bajo worker-src sin 'self').
await import('./lockdown.js');
const { default: loadGs } = await import('../../../js/vendor/ghostpdl-wasm-1.1.0/gs.js');
const { buildArgs } = await import('../../s1-ghostscript/gs-args.js');
self.onmessage = async ({ data }) => {
  try {
    const gs = await loadGs({ print: () => {}, printErr: () => {}, instantiateWasm: (imports, receive) => { WebAssembly.instantiate(data.module, imports).then((i) => receive(i, data.module)); return {}; } });
    gs.FS.writeFile('/in.pdf', new Uint8Array(data.bytes));
    const code = gs.callMain(buildArgs({ dpi: 150, quality: 60 }));
    self.postMessage({ code, outBytes: gs.FS.stat('/out.pdf').size });
  } catch (e) { self.postMessage({ error: String(e?.message || e) }); }
};
