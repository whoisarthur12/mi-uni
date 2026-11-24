// Configuración y lógica pura del service worker de la app (ADR-005). Script clásico: lo carga sw.js con
// importScripts() y las pruebas de Node con require(). Sin DOM ni Cache API aquí.
(function (root) {
  'use strict';

  // Subir SHELL_VERSION en cada publicación que cambie un archivo del shell (si no, los teléfonos
  // con la app instalada seguirían con la versión vieja hasta que se borre la caché).
  const SHELL_VERSION = 1;
  const PRECACHE_MODE = 'reload'; // salta la caché HTTP de Pages (max-age=600)

  const SHELL_FILES = [
    './', './index.html', './manifest.webmanifest', './sw-config.js',
    './css/ui.css', './js/theme-boot.js', './js/app.js',
    './js/core/router.js', './js/core/net-guard.js', './js/core/workers.js', './js/core/lockdown.js',
    './js/core/sw-client.js', './js/core/offline.js', './js/core/theme.js', './js/core/dom.js', './js/core/icons.js',
    './js/core/hooks.js',
    './js/shell/shell.js', './js/shell/registry.js',
    './js/shell/vistas/inicio.js', './js/shell/vistas/proyectos.js', './js/shell/vistas/ajustes.js', './js/shell/vistas/modulo.js',
    './js/vendor/inter-4.001/inter-latin-wght-normal.woff2',
    './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  ];

  // files: código liviano del módulo (se precachea en install; luego stale-while-revalidate).
  // assets: archivos pesados; nada se guarda hasta que el usuario pulsa «Descargar para usar sin conexión».
  //         `manifest` lista tamaño y SHA-256 de cada uno; se guarda al final = descarga completa.
  const MODULES = {
    compresor: {
      version: 1,
      files: ['js/modules/compresor/index.js'],
      assets: {
        manifest: 'js/modules/compresor/assets.json',
        files: ['js/vendor/ghostpdl-wasm-1.1.0/gs.js', 'js/vendor/ghostpdl-wasm-1.1.0/gs.wasm'],
      },
    },
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

  /** Qué cachés borrar (ver ADR-005). `complete`: cachés de assets con la descarga terminada y verificada. */
  function planCleanup(names, complete) {
    const done = new Set(complete || []);
    return names.filter((name) => {
      const p = parseName(name);
      if (!p) return false;
      if (p.kind === 'shell') return p.version !== SHELL_VERSION;
      const mod = MODULES[p.id];
      if (!mod) return true;
      if (p.version === mod.version) return false;
      if (p.kind === 'mod') return true;
      return done.has(assetsCache(p.id));
    });
  }

  /**
   * Clasifica una URL absoluta respecto al scope.
   * Solo la raíz y index.html son el shell: el resto de páginas del sitio (spikes, diseño, pruebas) pasan de largo.
   */
  function classify(url, scope) {
    if (!url.startsWith(scope)) return { kind: 'other' };
    const rel = url.slice(scope.length).split(/[?#]/)[0];
    if (rel === '' || SHELL_FILES.includes('./' + rel)) return { kind: 'shell', key: rel === '' ? './' : './' + rel };
    for (const [id, m] of Object.entries(MODULES)) {
      if ((m.files || []).includes(rel)) return { kind: 'light', id };
      if (m.assets && (m.assets.files.includes(rel) || m.assets.manifest === rel)) return { kind: 'heavy', id };
    }
    return { kind: 'other' };
  }

  /** ¿Esta navegación abre la app? (solo la raíz del scope o index.html) */
  const isAppNavigation = (url, scope) => {
    if (!url.startsWith(scope)) return false;
    const rel = url.slice(scope.length).split(/[?#]/)[0];
    return rel === '' || rel === 'index.html';
  };

  const lightPrecache = () => Object.entries(MODULES).map(([id, m]) => [modCache(id), (m.files || []).map((f) => './' + f)]);

  const api = { SHELL_VERSION, PRECACHE_MODE, SHELL_FILES, MODULES, shellCache, modCache, assetsCache, parseName, planCleanup, classify, isAppNavigation, lightPrecache };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiUniSW = api;
})(typeof self !== 'undefined' ? self : globalThis);
