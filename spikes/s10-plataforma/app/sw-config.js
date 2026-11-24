// Configuración y lógica pura del service worker. Script clásico: lo carga sw.js con
// importScripts() y las pruebas de Node con require(). Sin DOM ni Cache API aquí.
(function (root) {
  'use strict';

  // Subir SHELL_VERSION en cada publicación que cambie un archivo del shell.
  const SHELL_VERSION = 2;
  // Los marcadores __...__ solo existen para que el servidor de pruebas simule una publicación nueva.
  const BUILD = '__BUILD_1__';
  // 'reload' salta la caché HTTP (Pages manda max-age=600). Ver README, sección SW.
  const PRECACHE_MODE = 'reload';

  const SHELL_FILES = [
    './', './index.html', './style.css', './manifest.webmanifest', './sw-config.js',
    './js/main.js', './js/router.js', './js/offline.js',
    './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  ];

  // pesado:false → código pequeño: `files` se precachea en install (mod-<id>-vN) y luego
  //                stale-while-revalidate. Sin el precache, en Firefox el import() de la 1.ª visita
  //                ocurre antes de que el SW controle la página y el módulo no queda offline.
  // pesado:true  → nada se guarda hasta "Descargar para usar sin conexión" (assets-<id>-vN).
  const MODULES = {
    ligero: { version: 1, pesado: false, files: ['index.js'] },
    pesado: { version: 1, pesado: true, manifest: './modules/pesado/assets.json' },
  };

  const shellCache = () => `shell-v${SHELL_VERSION}`;
  const modCache = (id) => `mod-${id}-v${MODULES[id].version}`;
  const assetsCache = (id) => `assets-${id}-v${MODULES[id].version}`;
  const parseName = (name) => {
    let m = /^shell-v(\d+)$/.exec(name);
    if (m) return { kind: 'shell', version: +m[1] };
    m = /^(mod|assets)-([a-z0-9-]+)-v(\d+)$/.exec(name);
    if (m) return { kind: m[1], id: m[2], version: +m[3] };
    return null;
  };

  /**
   * Qué cachés borrar. `complete` = nombres de cachés de assets cuya descarga terminó y verificó.
   * Regla: una versión vieja de assets se borra solo si la versión actual del mismo módulo está completa
   * (o si el módulo ya no existe). El shell viejo se borra en `activate`, que solo ocurre si el
   * precache nuevo terminó (un `install` fallido nunca activa).
   */
  function planCleanup(names, complete) {
    const done = new Set(complete || []);
    return names.filter((name) => {
      const p = parseName(name);
      if (!p) return false; // cachés ajenas: no se tocan
      if (p.kind === 'shell') return p.version !== SHELL_VERSION;
      const mod = MODULES[p.id];
      if (!mod) return true;
      if (p.version === mod.version) return false;
      if (p.kind === 'mod') return true;
      return done.has(assetsCache(p.id));
    });
  }

  /** Clasifica una URL (absoluta) respecto al scope del SW. */
  function classify(url, scope) {
    if (!url.startsWith(scope)) return { kind: 'other' };
    const rel = url.slice(scope.length).split(/[?#]/)[0];
    if (rel === '' || SHELL_FILES.includes('./' + rel)) return { kind: 'shell', key: rel === '' ? './' : './' + rel };
    const m = /^modules\/([a-z0-9-]+)\//.exec(rel);
    if (m && MODULES[m[1]]) return { kind: MODULES[m[1]].pesado ? 'heavy' : 'light', id: m[1] };
    return { kind: 'other' };
  }

  /** [[cacheName, [urls relativas al scope]]] de los módulos livianos, para el install. */
  const lightPrecache = () => Object.entries(MODULES).filter(([, m]) => !m.pesado)
    .map(([id, m]) => [modCache(id), (m.files || []).map((f) => `./modules/${id}/${f}`)]);

  const api = { lightPrecache, SHELL_VERSION, BUILD, PRECACHE_MODE, SHELL_FILES, MODULES, shellCache, modCache, assetsCache, parseName, planCleanup, classify };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiUniSW = api;
})(typeof self !== 'undefined' ? self : globalThis);
