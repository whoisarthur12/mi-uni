// Worker de una sola pasada de Ghostscript (ADR-003: worker nuevo por pasada; ADR-004: lo crea core/workers.js,
// que importa lockdown.js antes que este archivo, así que aquí no hay red).
// Mensaje: { modulo: WebAssembly.Module, entrada: ArrayBuffer, args: string[] }
// Respuestas: {type:'progress', payload:{pagina, total}} · {type:'done', payload:{salida: ArrayBuffer, log}} · {type:'error', payload:{message, log}}
import cargarGs from '../../vendor/ghostpdl-wasm-1.1.0/gs.js';

self.onmessage = async ({ data }) => {
  const log = []; let total = 0, hechas = 0;
  const linea = (l) => {
    log.push(l); if (log.length > 40) log.shift();
    const m = /^Page (\d+)/.exec(l);
    if (m) { hechas++; self.postMessage({ type: 'progress', payload: { pagina: hechas, total } }); }
    const p = /Processing pages (\d+) through (\d+)/.exec(l);
    if (p) total = +p[2] - +p[1] + 1;
    else { const q = /Processing pages ([\d,\s-]+)\./.exec(l); if (q) total = q[1].split(',').length; }
  };
  try {
    const gs = await cargarGs({
      print: linea, printErr: linea,
      instantiateWasm: (imports, recibir) => { WebAssembly.instantiate(data.modulo, imports).then((inst) => recibir(inst, data.modulo)); return {}; },
    });
    gs.FS.writeFile('/in.pdf', new Uint8Array(data.entrada));
    data.entrada = null;
    const codigo = gs.callMain(data.args);
    let salida = null;
    try { salida = gs.FS.readFile('/out.pdf'); } catch { /* sin salida */ }
    if (codigo !== 0 || !salida || !salida.length) throw new Error(`Ghostscript terminó con código ${codigo} y ${salida ? salida.length : 0} bytes.`);
    self.postMessage({ type: 'done', payload: { salida: salida.buffer, paginas: hechas, log: log.slice(-6) } }, [salida.buffer]);
  } catch (e) {
    self.postMessage({ type: 'error', payload: { message: String(e?.message || e), log: log.slice(-10) } });
  }
};
