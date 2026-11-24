// Sondas de límites de canvas. Script clásico: lo usa la página (<canvas>) y un worker blob: (OffscreenCanvas).
// Un canvas demasiado grande no siempre lanza error: a veces queda en blanco. Por eso se pinta un
// píxel en la esquina inferior derecha y se relee.
(function (root) {
  'use strict';
  const make = (kind, w, h) => (kind === 'offscreen' ? new OffscreenCanvas(w, h) : Object.assign(root.document.createElement('canvas'), { width: w, height: h }));
  const release = (c) => { try { c.width = 0; c.height = 0; } catch (e) { /* nada */ } };

  function works(kind, w, h) {
    let c;
    try {
      c = make(kind, w, h);
      if (c.width !== w || c.height !== h) return false;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      ctx.fillStyle = '#ff0000'; ctx.fillRect(w - 1, h - 1, 1, 1);
      const d = ctx.getImageData(w - 1, h - 1, 1, 1).data;
      return d[0] === 255 && d[3] === 255;
    } catch (e) { return false; } finally { if (c) release(c); }
  }

  // Mayor n en [lo, hi] con ok(n) verdadero (supone monotonía).
  function search(lo, hi, ok) {
    if (!ok(lo)) return 0;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (ok(mid)) lo = mid; else hi = mid - 1; }
    return lo;
  }

  function limits(kind) {
    const t0 = performance.now();
    const maxWidth = search(1, 1 << 17, (n) => works(kind, n, 8));
    const maxHeight = search(1, 1 << 17, (n) => works(kind, 8, n));
    const maxSquare = search(1, 1 << 16, (n) => works(kind, n, n));
    // Área máxima con el lado más largo posible (o 16384): detecta topes de área distintos del cuadrado.
    const w = Math.min(maxWidth, 16384);
    const hAtW = search(1, 1 << 17, (n) => works(kind, w, n));
    return { kind, maxWidth, maxHeight, maxSquare, squareMP: +(maxSquare * maxSquare / 1e6).toFixed(1), areaAtWidth: { w, h: hAtW, mp: +(w * hAtW / 1e6).toFixed(1) }, ms: Math.round(performance.now() - t0) };
  }

  // Cuántos canvas de 4096×4096 (64 MB c/u) se pueden tener vivos a la vez (tope: cap).
  function cumulative(kind, cap) {
    const kept = []; let n = 0;
    try {
      for (; n < cap; n++) {
        const c = make(kind, 4096, 4096); const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) break;
        ctx.fillStyle = '#ff0000'; ctx.fillRect(4095, 4095, 1, 1);
        if (ctx.getImageData(4095, 4095, 1, 1).data[0] !== 255) break;
        kept.push(c);
      }
    } catch (e) { /* tope alcanzado */ }
    kept.forEach(release);
    return { kind, alive4096: n, cap, approxMB: n * 64 };
  }

  async function encode(kind) {
    // Foto típica de celular 4000×3000 → JPEG q0,85.
    const c = make(kind, 4000, 3000); const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4000, 3000); g.addColorStop(0, '#fff'); g.addColorStop(1, '#246');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4000, 3000);
    const t0 = performance.now();
    const blob = kind === 'offscreen' ? await c.convertToBlob({ type: 'image/jpeg', quality: 0.85 }) : await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    const out = { kind, jpeg4000x3000: { ms: Math.round(performance.now() - t0), bytes: blob ? blob.size : null } };
    release(c); return out;
  }

  const api = { works, limits, cumulative, encode };
  root.CanvasProbe = api;
  if (typeof root.document === 'undefined') {
    root.onmessage = async (e) => {
      const { op, cap } = e.data;
      try {
        if (typeof OffscreenCanvas === 'undefined') throw new Error('Sin OffscreenCanvas en workers');
        const r = op === 'limits' ? api.limits('offscreen') : op === 'cumulative' ? api.cumulative('offscreen', cap) : await api.encode('offscreen');
        root.postMessage({ ok: true, r });
      } catch (err) { root.postMessage({ ok: false, error: err.message }); }
    };
  }
})(self);
