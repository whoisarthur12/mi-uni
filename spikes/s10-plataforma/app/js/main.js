// Shell del spike S10: router por hash, registro del SW, aviso de actualización y descarga offline.
import { startRouter } from './router.js';
import { downloadModule, isComplete, removeModule } from './offline.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');
const status = (t) => { $('#status').textContent = t; };
const routes = [{ pattern: '/', name: 'inicio' }, { pattern: '/m/:id', name: 'modulo' }, { pattern: '/ajustes', name: 'ajustes' }];
const log = [];
let reg = null, current = null, swState = null;

// ---------- Service worker ----------
function askSW(type, target = navigator.serviceWorker.controller || (reg && reg.active)) {
  return new Promise((resolve, reject) => {
    if (!target) return reject(new Error('Sin service worker activo.'));
    const id = Math.random().toString(36).slice(2);
    const on = (e) => { if (e.data && e.data.id === id) { navigator.serviceWorker.removeEventListener('message', on); resolve(e.data.payload); } };
    navigator.serviceWorker.addEventListener('message', on);
    target.postMessage({ type, id });
    setTimeout(() => reject(new Error('El SW no respondió.')), 5000);
  });
}

function watchForUpdate(r) {
  const show = () => { if (r.waiting && navigator.serviceWorker.controller) $('#update').hidden = false; };
  show();
  r.addEventListener('updatefound', () => {
    const w = r.installing;
    w && w.addEventListener('statechange', () => { log.push('nuevo SW: ' + w.state); show(); });
  });
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) { status('Este navegador no tiene service worker: sin modo offline.'); return; }
  // updateViaCache 'none': sw.js y sw-config.js nunca salen de la caché HTTP (Pages manda max-age=600).
  // Sin conexión, register() falla al no poder bajar sw.js: se usa el registro ya instalado.
  reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .catch(async (e) => (await navigator.serviceWorker.getRegistration('./')) || Promise.reject(e));
  watchForUpdate(reg);
  // Recargar solo si ya había un SW controlando (actualización). En la 1.ª visita, clients.claim()
  // también dispara controllerchange y recargar ahí rompe la página recién abierta.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; reloading = true; location.reload();
  });
}

$('#apply-update').addEventListener('click', () => {
  if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
});

async function checkUpdate() {
  if (!reg) return { error: 'sin SW' };
  try { await reg.update(); } catch (e) { return { error: e.message }; }
  // Espera breve a que termine install (o falle) para informar.
  for (let i = 0; i < 50 && reg.installing; i++) await new Promise((r) => setTimeout(r, 100));
  return { waiting: !!reg.waiting, active: reg.active && reg.active.state };
}

// ---------- Vistas ----------
async function loadState() {
  try { swState = await askSW('STATE'); } catch { swState = null; }
  return swState;
}

const fmt = (b) => (b / 1048576).toFixed(1).replace('.', ',') + ' MB';

async function renderModulo(id) {
  const meta = swState && swState.modules[id];
  view.innerHTML = '';
  const h = document.createElement('h1'); h.textContent = 'Módulo: ' + id; view.append(h);
  if (meta && meta.pesado) {
    const scope = reg ? reg.scope : location.href.split('#')[0];
    const manifestUrl = new URL(meta.manifest, scope).href;
    const cacheName = `assets-${id}-v${meta.version}`;
    const box = document.createElement('div'); box.className = 'row';
    const prog = document.createElement('progress'); prog.max = 1; prog.value = 0; prog.hidden = true;
    const msg = document.createElement('span'); msg.className = 'muted';
    const btnD = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Descargar para usar sin conexión' });
    const btnX = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Eliminar descarga' });
    box.append(btnD, btnX, msg); view.append(box, prog);
    const refresh = async () => { msg.textContent = (await isComplete(manifestUrl, cacheName)) ? 'Descargado: funciona sin conexión.' : 'No descargado.'; };
    btnD.onclick = () => downloadUI(id).catch((e) => { msg.textContent = e.message; });
    btnX.onclick = async () => { await removeModule(cacheName); await refresh(); };
    await refresh();
  }
  const out = document.createElement('pre'); view.append(out);
  try {
    const mod = (await import(`../modules/${id}/index.js`)).default;
    current = mod; await mod.montar(out);
    try { sessionStorage.setItem('s10:' + id, out.textContent); } catch { /* sin almacenamiento */ }
  } catch (e) {
    out.textContent = (navigator.onLine ? 'No se pudo cargar el módulo.' : 'Sin conexión y este módulo no está descargado. Descárgalo cuando tengas internet.') + ' (' + e.message + ')';
  }
}

async function downloadUI(id, opts = {}) {
  const meta = swState.modules[id];
  const manifestUrl = new URL(opts.manifest || meta.manifest, reg.scope).href;
  const cacheName = `assets-${id}-v${meta.version}`;
  const prog = view.querySelector('progress');
  if (prog) prog.hidden = false;
  const t0 = performance.now(); const ticks = [];
  // Firefox muestra un permiso y la promesa queda pendiente hasta que el usuario responde:
  // nunca bloquear la descarga esperando a persist().
  const persistP = navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(() => 'error') : Promise.resolve(null);
  const r = await downloadModule({
    manifestUrl, cacheName,
    onProgress: ({ done, total }) => { ticks.push(Math.round(performance.now() - t0)); if (prog) prog.value = done / total; status(`Descargando ${fmt(done)} de ${fmt(total)}`); },
  });
  const deleted = (await askSW('CLEANUP')).deleted;
  const persisted = await Promise.race([persistP, new Promise((r) => setTimeout(() => r('pendiente'), 500))]);
  status(`Descarga completa y verificada (${fmt(r.bytes)}).`);
  return { ...r, ms: Math.round(performance.now() - t0), ticks: ticks.length, persisted, deleted };
}

async function render(route) {
  if (current && current.desmontar) current.desmontar();
  current = null;
  if (!swState) await loadState();
  if (route.name === 'inicio') view.innerHTML = '<h1>Inicio</h1><p>Spike S10: router por hash, service worker, descarga offline por módulo.</p>';
  else if (route.name === 'ajustes') {
    view.innerHTML = '<h1>Ajustes</h1><div class="row"><button id="check" type="button">Buscar actualización</button></div><pre id="info"></pre>';
    $('#check').onclick = async () => { $('#info').textContent = JSON.stringify(await checkUpdate()); };
  } else if (route.name === 'modulo' && swState && swState.modules[route.params.id]) await renderModulo(route.params.id);
  else view.innerHTML = '<h1>No encontrado</h1><p><a href="#/">Volver al inicio</a></p>';
  view.dataset.route = route.path;
  view.focus();
}

// «Copiar resultados»: estado del SW, cachés, modo de visualización y lo que mostraron los módulos.
async function report() {
  const get = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const r = {
    ua: navigator.userAgent, ts: new Date().toISOString(), online: navigator.onLine,
    instalada: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    controlada: !!navigator.serviceWorker?.controller, esperando: !!(reg && reg.waiting),
    sw: await loadState(), ligero: get('s10:ligero'), pesado: get('s10:pesado'), log, estado: $('#status').textContent,
    almacenamiento: navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null,
  };
  const text = JSON.stringify(r);
  try { await navigator.clipboard.writeText(text); status('Resultados copiados.'); }
  catch { $('#copied').hidden = false; $('#copied').textContent = text; status('No se pudo copiar: selecciona el texto de abajo.'); }
  return r;
}
$('#copy').addEventListener('click', () => report());

// Gancho de automatización del spike (no existirá en producción).
window.__s10app = {
  ready: null, log, checkUpdate, loadState, report,
  state: async () => ({ route: view.dataset.route, controlled: !!navigator.serviceWorker.controller, waiting: !!(reg && reg.waiting), sw: await loadState(), banner: !$('#update').hidden, text: view.textContent }),
  download: (id, opts) => downloadUI(id, opts),
  estimate: () => (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : null),
};

window.__s10app.ready = (async () => {
  await registerSW().catch((e) => status('No se pudo registrar el SW: ' + e.message));
  if (reg && !navigator.serviceWorker.controller) await navigator.serviceWorker.ready;
  await loadState();
  let first = true;
  await new Promise((res) => startRouter(window, routes, (r) => { render(r).then(() => { if (first) { first = false; res(); } }); }));
})();
