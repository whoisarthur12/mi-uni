import { h, fmtMB } from '../../core/dom.js';
import { icono } from '../../core/icons.js';
import { herramienta } from '../registry.js';
import { preguntarSW, registro } from '../../core/sw-client.js';
import { downloadModule, isComplete, removeModule } from '../../core/offline.js';
import { diag } from '../../core/hooks.js';

/** Tarjeta «Usar sin conexión» para módulos con archivos pesados (ADR-005). */
async function tarjetaOffline(id) {
  const caja = h('div.descarga', {});
  let estado;
  try { estado = await preguntarSW('STATE'); } catch { estado = null; }
  const meta = estado?.modules?.[id];
  if (!meta?.assets) {
    caja.append(h('p.suave', {}, 'La descarga para usar sin conexión estará disponible cuando la app termine de instalarse. Vuelve a abrir esta página en un momento.'));
    return caja;
  }
  const scope = registro()?.scope || new URL('./', location.href).href;
  const manifestUrl = new URL(meta.assets.manifest, scope).href;
  const cacheName = `assets-${id}-v${meta.version}`;
  const texto = h('p', { role: 'status' });
  const relleno = h('span');
  const pista = h('div.pista', { role: 'progressbar', 'aria-label': 'Descarga', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', hidden: true }, relleno);
  const bDesc = h('button.pildora.pildora-sec', { type: 'button' }, icono('descargar', { tam: 20 }), 'Descargar');
  const bQuitar = h('button.pildora.pildora-sec', { type: 'button' }, 'Quitar descarga');
  const refrescar = async () => {
    const ok = await isComplete(manifestUrl, cacheName);
    texto.textContent = ok ? 'Descargado: funciona sin conexión.' : 'Sin descargar: necesita internet la primera vez que lo uses.';
    bDesc.hidden = ok; bQuitar.hidden = !ok;
  };
  bDesc.addEventListener('click', async () => {
    bDesc.disabled = true; pista.hidden = false;
    navigator.storage?.persist?.().catch(() => {}); // Firefox puede pedir permiso: no se espera.
    try {
      const r = await downloadModule({ manifestUrl, cacheName, onProgress: ({ done, total }) => {
        const pct = Math.round((done / total) * 100);
        relleno.style.width = pct + '%'; pista.setAttribute('aria-valuenow', String(pct));
        texto.textContent = `Descargando ${fmtMB(done)} de ${fmtMB(total)}`;
      } });
      await preguntarSW('CLEANUP').catch(() => {});
      diag('offline:descarga', { id, bytes: r.bytes });
      await refrescar();
    } catch (e) {
      texto.textContent = `La descarga no terminó: ${e.message} Puedes reintentar; lo ya verificado no se vuelve a bajar.`;
    } finally { bDesc.disabled = false; pista.hidden = true; }
  });
  bQuitar.addEventListener('click', async () => { await removeModule(cacheName); await refrescar(); });
  caja.append(h('p.tarjeta-titulo', {}, 'Usar sin conexión'), texto, pista, h('div.descarga-fila', {}, bDesc, bQuitar));
  await refrescar();
  return caja;
}

export async function vistaModulo(main, ctx, id) {
  const t = herramienta(id);
  if (!t || t.estado !== 'disponible') {
    main.append(h('h1.par', {}, 'No encontrado. ', h('span.suave', {}, 'Esa herramienta no existe o aún no está lista.')), h('a.enlace', { href: '#/' }, 'Volver al inicio'));
    return null;
  }
  const zona = h('div', {});
  const cargando = h('p.cargando', { role: 'status' }, 'Cargando…');
  main.append(zona, cargando);
  let mod;
  try {
    mod = (await t.cargar()).default;
  } catch (e) {
    cargando.replaceWith(h('p.estado-error', {}, navigator.onLine
      ? `No se pudo cargar la herramienta (${e.message}).`
      : 'Sin conexión y esta herramienta no está guardada en el teléfono. Ábrela una vez con internet.'));
    return null;
  }
  cargando.hidden = true;
  await mod.montar(zona, ctx);
  if (t.offline) main.append(await tarjetaOffline(id));
  return mod;
}
