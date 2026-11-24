// Diálogos accesibles con <dialog> (foco atrapado y Esc nativos): confirmar, pedir texto o contraseña.
// Cerrar con Esc o fuera de los botones cuenta como «Cancelar» (nunca como aceptar).
import { h } from './dom.js';

function abrir({ titulo, texto, campo, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolve) => {
    const entrada = campo ? h('input', { type: campo.tipo || 'text', value: campo.valor || '', autocomplete: campo.autocomplete || 'off', 'aria-label': campo.etiqueta || titulo, maxlength: campo.max || '120', required: !!campo.requerido }) : null;
    const error = h('p.dialogo-error', { role: 'alert', hidden: true });
    const bOk = h('button.pildora.pildora-prim', { type: 'submit', value: 'ok' }, aceptar);
    const bNo = h('button.pildora.pildora-sec', { type: 'button', on: { click: () => d.close('no') } }, cancelar);
    if (peligro) bOk.classList.add('pildora-peligro');
    const form = h('form.dialogo-cuerpo', { method: 'dialog', novalidate: true },
      h('h2.dialogo-titulo', { id: 'dlg-t' }, titulo),
      texto ? h('p.suave', { id: 'dlg-d' }, texto) : '',
      entrada ? h('label.campo', {}, h('span', {}, campo.etiqueta || ''), entrada) : '',
      error,
      h('div.acciones', {}, bOk, bNo),
    );
    const d = h('dialog.dialogo', { 'aria-labelledby': 'dlg-t', 'aria-describedby': texto ? 'dlg-d' : null }, form);
    form.addEventListener('submit', (e) => {
      if (entrada && campo.requerido && !entrada.value.trim()) { e.preventDefault(); error.textContent = campo.mensajeVacio || 'Este campo no puede quedar vacío.'; error.hidden = false; entrada.focus(); }
    });
    d.addEventListener('close', () => { const ok = d.returnValue === 'ok'; d.remove(); resolve(entrada ? (ok ? entrada.value : null) : ok); });
    document.body.append(d);
    d.showModal();
    (entrada || bOk).focus();
  });
}

/** true solo si el usuario pulsa el botón de aceptar. */
export const confirmar = (titulo, texto, opciones = {}) => abrir({ titulo, texto, ...opciones });
/** Texto escrito, o null si cancela. */
export const pedirTexto = (titulo, campo, opciones = {}) => abrir({ titulo, campo: { requerido: true, ...campo }, ...opciones });
