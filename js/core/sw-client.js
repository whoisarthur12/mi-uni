// Registro del service worker, aviso de versión nueva y mensajes al SW (ADR-005).
let reg = null;

export async function registrarSW({ alHaberActualizacion } = {}) {
  if (!('serviceWorker' in navigator)) return null;
  // updateViaCache 'none': sw.js y sw-config.js nunca salen de la caché HTTP (Pages manda max-age=600).
  // Sin conexión, register() falla: se usa el registro ya instalado.
  reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .catch(async (e) => (await navigator.serviceWorker.getRegistration('./')) || Promise.reject(e));
  const avisar = () => { if (reg.waiting && navigator.serviceWorker.controller) alHaberActualizacion?.(); };
  avisar();
  reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', avisar));
  // Recargar solo si ya había un SW controlando (actualización); en la 1.ª visita romperíamos la página.
  const habia = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habia && !recargando) { recargando = true; location.reload(); } });
  return reg;
}

export const registro = () => reg;
export function aplicarActualizacion() { reg?.waiting?.postMessage({ type: 'SKIP_WAITING' }); }

export async function buscarActualizacion() {
  if (!reg) return { error: 'Sin service worker.' };
  try { await reg.update(); } catch (e) { return { error: e.message }; }
  for (let i = 0; i < 50 && reg.installing; i++) await new Promise((r) => setTimeout(r, 100));
  return { hay: !!reg.waiting };
}

export async function preguntarSW(type) {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador no tiene service worker.');
  // En la primera visita el SW aún se está instalando: se espera a que esté activo (máx. 15 s).
  const listo = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 15000))]);
  const target = navigator.serviceWorker.controller || listo?.active || reg?.active;
  return new Promise((resolve, reject) => {
    if (!target) return reject(new Error('Sin service worker activo.'));
    const id = Math.random().toString(36).slice(2);
    const on = (e) => { if (e.data?.id === id) { navigator.serviceWorker.removeEventListener('message', on); resolve(e.data.payload); } };
    navigator.serviceWorker.addEventListener('message', on);
    target.postMessage({ type, id });
    setTimeout(() => reject(new Error('El service worker no respondió.')), 5000);
  });
}
