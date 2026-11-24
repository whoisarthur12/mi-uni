// Auditoría de la maqueta (ADR-013) en Chromium, Firefox y WebKit: contraste de cada texto visible contra su fondo real,
// áreas táctiles (≥ 44 px) y errores/avisos de consola, en claro y oscuro y en 5 pantallas.
// Requiere pages-server.cjs (:8770). Uso: node diseno/runner/auditar.cjs /tmp/auditoria.json
const pw = require('playwright'); const fs = require('fs');
const AUDIT = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; if (!stack.length || stack[stack.length - 1].a < 1) base = parse(getComputedStyle(document.body).backgroundColor) || base; for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base); return base; };
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'); };
  const textos = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { const el = n.parentElement; if (!n.textContent.trim() || !vis(el) || el.closest('.sr,.saltar')) continue; const fg = parse(getComputedStyle(el).color); const bg = bgOf(el); const c = blend(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); textos.push({ t: n.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, fg: getComputedStyle(el).color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` }); }
  for (const i of document.querySelectorAll('input[placeholder]')) { if (!vis(i)) continue; const fg = parse(getComputedStyle(i, '::placeholder').color); const bg = bgOf(i); const L1 = lum(blend(fg, bg)), L2 = lum(bg); textos.push({ t: 'placeholder ' + i.placeholder, ratio: Math.round((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) * 100) / 100, fg: getComputedStyle(i, '::placeholder').color, bg: '' }); }
  const toques = []; for (const e of document.querySelectorAll('a[href],button,input,select,label.opcion,[role=radio]')) { if (!vis(e)) continue; if (e.parentElement.closest('a[href],button,label.opcion')) continue; if (e.matches('.opcion input')) continue; const r = e.getBoundingClientRect(); toques.push({ t: (e.textContent || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }); }
  return { textos, toques, fuente: document.fonts.check('16px Inter'), base: getComputedStyle(document.documentElement).fontSize };
};
(async () => { const res = {}; for (const n of ['chromium', 'firefox', 'webkit']) { const b = await pw[n].launch(); const errs = []; res[n] = { errs, peorTexto: [], pequenos: new Set(), fuente: null, n: 0 };
  for (const scheme of ['light', 'dark']) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, ...(n !== 'firefox' ? { isMobile: true, hasTouch: true } : {}) }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text().slice(0, 140)}`); });
    for (const [vista, prep] of [['inicio'], ['comprimir', async () => { await p.click('#comprimir'); await p.waitForSelector('#resultado:not([hidden])', { timeout: 10000 }); }], ['proyectos'], ['proyectos-vacio', async () => { await p.click('#ver-vacio'); }], ['ajustes']]) {
      await p.goto(`http://localhost:8770/mi-uni/diseno/#${vista.split('-')[0]}`); await p.waitForFunction(() => document.fonts.ready.then(() => true)); await p.waitForTimeout(150); if (prep) await prep();
      await p.mouse.move(1, 1); await p.waitForTimeout(100); const a = await p.evaluate(AUDIT); res[n].fuente = a.fuente; res[n].base = a.base; res[n].n += a.textos.length;
      for (const t of a.textos) res[n].peorTexto.push({ ...t, vista, scheme });
      for (const t of a.toques) if (t.h < 44 || t.w < 44) res[n].pequenos.add(`${vista}: ${t.t} ${t.w}×${t.h}`);
    }
    await ctx.close(); }
  await b.close(); const pt = res[n].peorTexto.sort((x, y) => x.ratio - y.ratio); res[n].min = pt[0]; res[n].bajo45 = pt.filter((x) => x.ratio < 4.5); res[n].peorTexto = pt.slice(0, 6); res[n].pequenos = [...res[n].pequenos];
  console.log(n, 'textos', res[n].n, 'fuente Inter', res[n].fuente, 'base', res[n].base, 'min', JSON.stringify(res[n].min), '<4.5:', res[n].bajo45.length, 'toques<44:', JSON.stringify(res[n].pequenos), 'errores:', JSON.stringify(errs)); }
  fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1)); })();
