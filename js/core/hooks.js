// Puntos de enganche (ADR-011): buscador, diagnóstico local y eventos se implementan DESPUÉS del Compresor
// y antes del lanzamiento público. Hoy solo existe la superficie mínima para que el shell y los módulos
// ya llamen a estas funciones; sin red y sin persistencia.

/** Bus de eventos de la app (CONTEXT §8.7). Payload solo con IDs y metadatos. */
const bus = new EventTarget();
export function publicar(tipo, detalle = {}) { bus.dispatchEvent(new CustomEvent(tipo, { detail: detalle })); }
export function suscribir(tipo, fn) { const h = (e) => fn(e.detail); bus.addEventListener(tipo, h); return () => bus.removeEventListener(tipo, h); }

/** Diagnóstico local (CONTEXT §8.8): en memoria, sin envío. La pantalla «Diagnóstico» llegará después. */
const registro = [];
export function diag(tipo, datos = {}) {
  registro.push({ t: new Date().toISOString(), tipo, ...datos });
  if (registro.length > 200) registro.shift();
}
export const diagnostico = () => registro.slice();

/** Buscador: hoy filtra herramientas por nombre y descripción, sin distinguir tildes. */
const sinTildes = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function buscar(consulta, elementos) {
  const q = sinTildes(consulta.trim());
  if (!q) return elementos;
  return elementos.filter((e) => sinTildes(`${e.nombre} ${e.desc} ${(e.claves || []).join(' ')}`).includes(q));
}
