// Worker de producción candidato: lockdown primero; Ghostscript recibe el WebAssembly.Module ya compilado
// (el lockdown desactiva fetch, y así además se evita recompilar en cada worker nuevo).
import './lockdown.js';
import loadGs from '../../../js/vendor/ghostpdl-wasm-1.1.0/gs.js';
import { buildArgs } from '../../s1-ghostscript/gs-args.js';
self.onmessage = async ({ data }) => {
  try {
    const t0 = performance.now();
    const gs = await loadGs({
      print: () => {}, printErr: () => {},
      instantiateWasm: (imports, receive) => { WebAssembly.instantiate(data.module, imports).then((inst) => receive(inst, data.module)); return {}; },
    });
    const initMs = Math.round(performance.now() - t0);
    gs.FS.writeFile('/in.pdf', new Uint8Array(data.bytes));
    const code = gs.callMain(buildArgs({ dpi: 150, quality: 60 }));
    let netAfter; try { await fetch('http://127.0.0.1:8766/hit/' + data.tag + '-gsworker-fetch', { mode: 'no-cors' }); netAfter = 'intentado'; } catch (e) { netAfter = 'error: ' + e.message.slice(0, 60); }
    self.postMessage({ code, initMs, outBytes: gs.FS.stat('/out.pdf').size, netAfter });
  } catch (e) { self.postMessage({ error: String(e?.message || e) }); }
};
