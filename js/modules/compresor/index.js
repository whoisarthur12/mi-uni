// Compresor de PDF. Bloque 1: solo la página del módulo y la descarga para usar sin conexión.
// El compresor real llega en el bloque 4 de la Fase 1 (ADR-011).
import { h } from '../../core/dom.js';

export default {
  montar(zona) {
    zona.append(
      h('h1.par', {}, 'Comprimir PDF. ', h('span.suave', {}, 'El archivo no sale de este teléfono.')),
      h('div.banda', {}, h('p', {}, 'El compresor se está construyendo. Ya puedes descargar su motor (Ghostscript, 11 MB) para usarlo sin conexión.')),
    );
  },
  desmontar() {},
};
