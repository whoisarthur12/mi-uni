// Perfil y ajustes guardados en IndexedDB, con API para los módulos (ctx.perfil).
// Si el navegador no deja guardar (p. ej., ciertas ventanas privadas), funciona en memoria y lo avisa.
import { leer, escribir } from './db.js';
import { normalizar, aplicarCambio, POR_DEFECTO } from './ajustes-modelo.js';
import { publicar, diag } from './hooks.js';

let actual = normalizar(POR_DEFECTO);
let persistente = true;
const oyentes = new Set();
let cargado = null;

export function cargarAjustes() {
  if (!cargado) {
    cargado = leer('ajustes', 'principal')
      .then((v) => { actual = normalizar(v || POR_DEFECTO); })
      .catch((e) => { persistente = false; diag('ajustes:sin-almacenamiento', { message: e.message }); });
  }
  return cargado.then(() => actual);
}

export const ajustes = () => actual;
export const sePuedeGuardar = () => persistente;

export async function guardarAjustes(cambio) {
  const nuevo = aplicarCambio(actual, cambio);
  if (persistente) await escribir('ajustes', 'principal', nuevo);
  actual = nuevo;
  for (const f of oyentes) f(actual);
  publicar('perfil:cambiado', {});
  return actual;
}

export async function reemplazarAjustes(todo) {
  const nuevo = normalizar(todo);
  if (persistente) await escribir('ajustes', 'principal', nuevo);
  actual = nuevo;
  for (const f of oyentes) f(actual);
  publicar('perfil:cambiado', {});
  return actual;
}

export function alCambiarAjustes(f) { oyentes.add(f); return () => oyentes.delete(f); }

/** API de solo lectura para los módulos (CONTEXT §9.0.a). */
export const perfilCtx = { get: () => structuredClone(actual), suscribir: alCambiarAjustes };
