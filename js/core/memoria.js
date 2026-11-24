// Tope de memoria en el navegador (ADR-003): datos del dispositivo y aprendizaje de cierres de pestaña.
import { clasificar, aprenderDeCierre, MODELOS } from './memoria-modelo.js';
import { diag } from './hooks.js';

const MARCA = 'mi-uni:trabajo';      // sessionStorage: trabajo pesado en curso
const APRENDIDO = 'mi-uni:fallaMB';  // localStorage: menor tamaño que cerró la pestaña en este dispositivo

const leerJSON = (st, k) => { try { return JSON.parse(st.getItem(k)); } catch { return null; } };
const esMovil = () => /Mobi|iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

let cierreDetectado = null;
/** Se llama una vez al arrancar: si quedó una marca, la pestaña se cerró a mitad de un trabajo. */
export function revisarCierreAnterior() {
  const marca = leerJSON(sessionStorage, MARCA);
  const previa = Number(leerJSON(localStorage, APRENDIDO)) || 0;
  const r = aprenderDeCierre(marca, previa);
  if (r.cierre) {
    cierreDetectado = r.cierre;
    try { localStorage.setItem(APRENDIDO, JSON.stringify(r.fallaAprendidaMB)); sessionStorage.removeItem(MARCA); } catch { /* sin almacenamiento */ }
    diag('memoria:cierre', { mb: r.cierre.mb, modulo: r.cierre.modulo });
  }
  return cierreDetectado;
}
export const cierreAnterior = () => cierreDetectado;

export function dispositivo() {
  return { deviceMemoryGB: navigator.deviceMemory, esMovil: esMovil(), fallaAprendidaMB: Number(leerJSON(localStorage, APRENDIDO)) || 0 };
}
export const clasificarEntrada = (bytes, modelo = MODELOS.compresor) => clasificar(bytes, dispositivo(), modelo);

/** Marca un trabajo pesado en curso; la marca se borra al terminar (bien o mal). */
export function marcarTrabajo(bytes, modulo) {
  try { sessionStorage.setItem(MARCA, JSON.stringify({ mb: Math.round(bytes / 1e6), modulo, t: Date.now() })); } catch { /* sin almacenamiento */ }
  return () => { try { sessionStorage.removeItem(MARCA); } catch { /* sin almacenamiento */ } };
}
