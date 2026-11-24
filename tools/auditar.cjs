// Auditoría de accesibilidad básica en Chromium, Firefox y WebKit (ADR-013), para cada PR:
//  - contraste de CADA texto visible contra su fondo real (incluidos placeholders): mínimo 4,5:1;
//  - áreas táctiles de 44 × 44 px como mínimo (los controles dentro de otro control cuentan como el de fuera);
//  - 0 errores y 0 avisos de consola; 0 errores de página.
// En claro y oscuro, 390×844 (teléfono). Requiere pages-server.cjs (:8770).
// Uso: node tools/auditar.cjs <config.cjs> [salida.json]
//   config.cjs exporta { url, pantallas: [{ nombre, hash, preparar?: async (page) => {} }] }
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const AUDIT = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; if (!stack.length || stack[stack.length - 1].a < 1) base = parse(getComputedStyle(document.body).backgroundColor) || base; for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base); return base; };
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'); };
  const textos = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { const el = n.parentElement; if (!n.textContent.trim() || !vis(el) || el.closest('.sr,.saltar')) continue; const fg = parse(getComputedStyle(el).color); const bg = bgOf(el); const c = blend(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); textos.push({ t: n.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, fg: getComputedStyle(el).color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` }); }
  for (const i of document.querySelectorAll('input[placeholder]')) { if (!vis(i)) continue; const fg = parse(getComputedStyle(i, '::placeholder').color); const bg = bgOf(i); const L1 = lum(blend(fg, bg)), L2 = lum(bg); textos.push({ t: 'placeholder ' + i.placeholder, ratio: Math.round((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) * 100) / 100, fg: getComputedStyle(i, '::placeholder').color, bg: '' }); }
  const toques = []; for (const e of document.querySelectorAll('a[href],button,input,select,label.opcion,label.opcion-check,[role=radio]')) { if (!vis(e)) continue; if (e.parentElement.closest('a[href],button,label.opcion')) continue; if (e.matches('.opcion input, .opcion-check input')) continue; const r = e.getBoundingClientRect(); toques.push({ t: (e.textContent || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }); }
  return { textos, toques, fuente: document.fonts.check('16px Inter'), base: getComputedStyle(document.documentElement).fontSize };
};
async function auditar(cfg, salida) {
  const res = {}; let fallos = 0;
  for (const n of ['chromium', 'firefox', 'webkit']) {
    const errs = [];
    const r = res[n] = { textos: 0, peor: null, bajo45: [], pequenos: [], errs, fuente: null, pares: {} };
    for (const scheme of ['light', 'dark']) {
      // Perfil persistente (como la app real): en WebKit una ventana efímera no deja guardar archivos en IndexedDB.
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aud-${n}-`));
      const ctx = await pw[n].launchPersistentContext(dir, { viewport: { width: 390, height: 844 }, colorScheme: scheme, ...(n !== 'firefox' ? { isMobile: true, hasTouch: true } : {}) });
      const p = ctx.pages()[0] || await ctx.newPage();
      p.on('pageerror', (e) => errs.push(`${scheme}: ${e.message}`));
      p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(`${scheme} ${m.type()}: ${m.text().slice(0, 160)}`); });
      for (const pan of cfg.pantallas) {
        await p.goto(cfg.url + (pan.hash || '')); await p.waitForLoadState('load');
        await p.evaluate(() => document.fonts.ready.then(() => true)); await p.waitForTimeout(250);
        if (pan.preparar) { try { await pan.preparar(p); } catch (e) { errs.push(`${scheme} preparar ${pan.nombre}: ${String(e.message).split('\n')[0]}`); } }
        await p.mouse.move(1, 1); await p.waitForTimeout(120);
        const a = await p.evaluate(AUDIT);
        r.fuente = a.fuente; r.textos += a.textos.length;
        for (const t of a.textos) { const k = `${scheme}|${t.fg}|${t.bg}`; const q = r.pares[k]; if (!q || t.ratio < q.ratio) r.pares[k] = { ratio: t.ratio, ejemplo: t.t, pantalla: pan.nombre, veces: (q?.veces || 0) + 1 }; else q.veces++; if (!r.peor || t.ratio < r.peor.ratio) r.peor = { ...t, pantalla: pan.nombre, scheme }; if (t.ratio < 4.5) r.bajo45.push({ ...t, pantalla: pan.nombre, scheme }); }
        for (const t of a.toques) if (t.h < 44 || t.w < 44) r.pequenos.push(`${pan.nombre}: ${t.t} ${t.w}×${t.h}`);
      }
      await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
    }
    r.pequenos = [...new Set(r.pequenos)];
    const mal = r.bajo45.length + r.pequenos.length + errs.length; fallos += mal;
    console.log(`${n}: ${r.textos} textos · peor ${r.peor && r.peor.ratio}:1 («${r.peor && r.peor.t}», ${r.peor && r.peor.pantalla}, ${r.peor && r.peor.scheme}) · <4,5: ${r.bajo45.length} · toques<44: ${r.pequenos.length} · consola: ${errs.length} · Inter: ${r.fuente}`);
    for (const x of [...r.bajo45.slice(0, 5).map((t) => `  contraste ${t.ratio} «${t.t}» ${t.pantalla} ${t.scheme}`), ...r.pequenos.slice(0, 8).map((t) => '  toque ' + t), ...errs.slice(0, 8).map((e) => '  consola ' + e)]) console.log(x);
  }
  if (salida) fs.writeFileSync(salida, JSON.stringify(res, null, 1));
  return fallos;
}
module.exports = { auditar };
if (require.main === module) {
  const cfg = require(path.resolve(process.argv[2]));
  auditar(cfg, process.argv[3]).then((f) => { console.log(f ? `FALLOS: ${f}` : 'OK: 0 fallos'); process.exit(f ? 1 : 0); });
}
