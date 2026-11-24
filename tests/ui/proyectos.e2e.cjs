// Proyectos (ADR-006) en Chromium, Firefox y WebKit contra pages-server.cjs (:8770).
// Uso: node tests/ui/proyectos.e2e.cjs [chromium,firefox,webkit] [--grande]
//  --grande: además importa un proyecto de 200 MB en un perfil limpio y mide el pico de memoria (RSS).
const pw = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const BASE = 'http://localhost:8770/mi-uni/';
const GRANDE = process.argv.includes('--grande');
const rss = () => execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' }).split('\n').filter((l) => /pw-browsers/.test(l) && !/ps -eo/.test(l)).reduce((a, l) => a + (parseInt(l, 10) || 0), 0) / 1024;
async function pico(fn) { const base = rss(); let max = base; const iv = setInterval(() => { max = Math.max(max, rss()); }, 100); try { return { r: await fn(), picoMB: Math.round(max - base) }; } finally { clearInterval(iv); } }

// En la página: crea un recurso aleatorio de `mb` MB y devuelve su SHA-256.
const CREAR = async ([pid, mb, nombre]) => {
  const P = await import('./js/core/proyectos.js');
  const partes = []; const t = mb * 1048576; for (let o = 0; o < t; o += 1048576) { const u = new Uint8Array(Math.min(1048576, t - o)); for (let i = 0; i < u.length; i += 65536) crypto.getRandomValues(u.subarray(i, i + 65536)); partes.push(u); }
  const blob = new Blob(partes, { type: 'application/pdf' });
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const r = await P.guardarRecurso(pid, blob, { nombre, origen: 'prueba' });
  return { id: r.id, trozos: r.trozos, size: r.size, sha };
};
const SHA_RECURSO = async (rid) => { const P = await import('./js/core/proyectos.js'); const b = await P.leerRecurso(rid); return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()))].map((x) => x.toString(16).padStart(2, '0')).join(''); };
// Acceso directo a IndexedDB desde la página (la CSP de la app prohíbe evaluar texto: funciones normales).
const FIJAR_FECHAS = async ([id, f]) => { const db = await new Promise((ok, ko) => { const r = indexedDB.open('mi-uni'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  await new Promise((ok) => { const tx = db.transaction('proyectos', 'readwrite'); const st = tx.objectStore('proyectos'); const g = st.get(id); g.onsuccess = () => st.put({ ...g.result, ultimoRespaldo: f, modificado: new Date().toISOString() }); tx.oncomplete = () => { db.close(); ok(); }; }); };
const SEMBRAR_CORTE = async () => { const db = await new Promise((ok, ko) => { const r = indexedDB.open('mi-uni'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  await new Promise((ok) => { const tx = db.transaction(['proyectos', 'trozos'], 'readwrite'); tx.objectStore('proyectos').put({ id: 'cortado', nombre: 'a medias', creado: new Date().toISOString(), importando: true }); tx.objectStore('trozos').put({ rid: 'huerfano', i: 0, size: 3, crc32: 0, blob: new Blob(['abc']) }); tx.oncomplete = () => { db.close(); ok(); }; }); };
const LEER_CORTE = async () => { const db = await new Promise((ok, ko) => { const r = indexedDB.open('mi-uni'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  return new Promise((ok) => { const t = db.transaction(['proyectos', 'trozos']); const a = t.objectStore('proyectos').get('cortado'); const b = t.objectStore('trozos').getAllKeys(); t.oncomplete = () => { db.close(); ok({ cortado: !!a.result, trozosHuerfanos: b.result.filter((k) => k[0] === 'huerfano').length }); }; }); };
const CONTAR = async () => { const db = await new Promise((ok, ko) => { const r = indexedDB.open('mi-uni'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  return new Promise((ok) => { const t = db.transaction(['trozos', 'recursos']); const a = t.objectStore('trozos').count(); const b = t.objectStore('recursos').count(); t.oncomplete = () => { db.close(); ok({ trozos: a.result, recursos: b.result }); }; }); };

async function perfil(n, dir) {
  const ctx = await pw[n].launchPersistentContext(dir, { acceptDownloads: true, viewport: { width: 390, height: 844 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 160)); });
  return { ctx, p, errs };
}
const estadoTxt = (p) => p.textContent('.estado-fijo p');
const esperarEstado = (p, re) => p.waitForFunction((s) => new RegExp(s).test(document.querySelector('.estado-fijo p')?.textContent || ''), re.source, { timeout: 120000 });

async function caso(n) {
  const r = {}; const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `pr-${n}-`));
  const paso = async (k, fn) => { const t = Date.now(); try { r[k] = await fn(); } catch (e) { r[k] = 'ERROR ' + String(e.message).slice(0, 220); } console.error(n, k, Date.now() - t, 'ms', JSON.stringify(r[k]).slice(0, 300)); };
  const A = await perfil(n, path.join(tmp, 'a')); const p = A.p;
  let pid, rec, zip;
  await paso('1 vacío y crear', async () => {
    await p.goto(BASE + '#/proyectos'); await p.waitForSelector('.vacio');
    await p.click('text=Crear proyecto'); await p.waitForSelector('dialog.dialogo');
    await p.click('dialog button[value=ok]'); const vacio = await p.textContent('.dialogo-error'); // sin nombre: no deja
    await p.fill('dialog input', 'Tesis, capítulo 2'); await p.click('dialog button[value=ok]');
    await p.waitForFunction(() => /#\/proyectos\/.+/.test(location.hash)); await p.waitForSelector('h1');
    pid = decodeURIComponent((await p.evaluate(() => location.hash)).split('/').pop());
    return { sinNombre: vacio, titulo: await p.textContent('h1') };
  });
  await paso('2 guardar 20 MB en trozos verificados', async () => {
    rec = await p.evaluate(CREAR, [pid, 20, 'informe.pdf']);
    const vuelta = await p.evaluate(SHA_RECURSO, rec.id);
    return { trozos: rec.trozos, size: rec.size, releidoIgual: vuelta === rec.sha };
  });
  await paso('3 aviso de respaldo en inicio', async () => {
    const hace9 = new Date(Date.now() - 9 * 86400000).toISOString();
    await p.evaluate(FIJAR_FECHAS, [pid, hace9]);
    await p.goto(BASE + '#/'); await p.waitForSelector('.aviso');
    return p.textContent('.aviso .suave');
  });
  await paso('4 respaldar en ZIP', async () => {
    await p.click('.aviso a'); await p.waitForSelector('main .banda button');
    const dl = p.waitForEvent('download'); await p.click('main .banda button');
    const d = await dl; zip = path.join(tmp, 'respaldo.zip'); await d.saveAs(zip);
    await esperarEstado(p, /Copia descargada/);
    const py = execFileSync('python3', ['-I', '-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps([z.testzip(),sorted((i.filename.split("/")[0],i.file_size) for i in z.infolist())]))', zip], { encoding: 'utf8' });
    await p.goto(BASE + '#/'); await p.waitForSelector('.rejilla'); const avisoTras = await p.$('.aviso');
    return { nombre: d.suggestedFilename(), python: JSON.parse(py), avisoTrasRespaldo: !!avisoTras };
  });
  await paso('5 importar en otro perfil', async () => {
    const B = await perfil(n, path.join(tmp, 'b'));
    await B.p.goto(BASE + '#/proyectos'); await B.p.waitForSelector('.vacio');
    await B.p.setInputFiles('input[type=file]', zip); await esperarEstado(B.p, /importado/);
    const t1 = await estadoTxt(B.p);
    const sha = await B.p.evaluate(SHA_RECURSO, rec.id);
    await B.p.setInputFiles('input[type=file]', zip); await esperarEstado(B.p, /copia/);
    const lista = await B.p.$$eval('.tarjeta-proy .tarjeta-titulo', (e) => e.map((x) => x.textContent));
    const frase = await B.p.textContent('.tarjeta-proy .suave');
    await B.ctx.close(); return { estado: t1, mismoSHA: sha === rec.sha, lista, frase, consola: B.errs };
  });
  await paso('6 ZIP dañado se rechaza y no deja nada', async () => {
    const malo = path.join(tmp, 'malo.zip'); const b = fs.readFileSync(zip); b[Math.floor(b.length / 2)] ^= 0xff; fs.writeFileSync(malo, b);
    await p.goto(BASE + '#/proyectos'); await p.waitForSelector('.tarjeta-proy');
    await p.setInputFiles('input[type=file]', malo); await esperarEstado(p, /No se importó/);
    const n2 = await p.$$eval('.tarjeta-proy', (e) => e.length);
    return { mensaje: await estadoTxt(p), proyectos: n2 };
  });
  await paso('7 limpieza tras un corte', async () => {
    await p.evaluate(SEMBRAR_CORTE);
    // La limpieza corre al arrancar la app: hace falta recargar, no basta con cambiar el #.
    await p.goto(BASE + '#/proyectos'); await p.reload();
    await p.waitForSelector('.tarjeta-proy');
    let r2;
    for (let i = 0; i < 25; i++) { r2 = await p.evaluate(LEER_CORTE); if (!r2.cortado && !r2.trozosHuerfanos) break; await p.waitForTimeout(200); }
    return r2;
  });
  await paso('8 quitar archivo y borrar proyecto', async () => {
    await p.goto(BASE + `#/proyectos/${encodeURIComponent(pid)}`); await p.waitForSelector('.recurso');
    await p.click('.recurso button:has-text("Quitar")'); await p.click('dialog button:has-text("Cancelar")');
    const sigue = await p.$$eval('.recurso', (e) => e.length);
    await p.click('.recurso button:has-text("Quitar")'); await p.click('dialog button[value=ok]'); await esperarEstado(p, /quitado/);
    await p.click('text=Borrar proyecto'); await p.click('dialog button[value=ok]');
    await p.waitForFunction(() => location.hash === '#/proyectos');
    const quedan = await p.evaluate(CONTAR);
    return { trasCancelar: sigue, quedan };
  });
  r.consola = A.errs; await A.ctx.close();
  await paso('9 ventana privada (efímera)', async () => {
    const b = await pw[n].launch(); const c = await b.newContext(); const q = await c.newPage();
    await q.goto(BASE + '#/proyectos'); await q.waitForSelector('.vacio');
    const res = await q.evaluate(async () => { const P = await import('./js/core/proyectos.js'); try { const pr = await P.crearProyecto('x'); await P.guardarRecurso(pr.id, new Blob([new Uint8Array(1000)]), { nombre: 'a' }); return 'guardó'; } catch (e) { return 'error: ' + e.message; } });
    await b.close(); return res;
  });
  if (GRANDE) await paso('10 importar 200 MB (perfil limpio)', async () => {
    const C = await perfil(n, path.join(tmp, 'c')); await C.p.goto(BASE + '#/proyectos'); await C.p.waitForSelector('.vacio');
    const id2 = await C.p.evaluate(async () => (await (await import('./js/core/proyectos.js')).crearProyecto('Grande')).id);
    for (const [mb, nm] of [[80, 'a.pdf'], [80, 'b.pdf'], [30, 'c.pdf'], [5, 'd.pdf'], [5, 'e.pdf']]) await C.p.evaluate(CREAR, [id2, mb, nm]);
    await C.p.goto(BASE + `#/proyectos/${id2}`); await C.p.waitForSelector('main .banda button');
    const dl = C.p.waitForEvent('download', { timeout: 120000 }); const t0 = Date.now(); await C.p.click('main .banda button'); const g = path.join(tmp, 'grande.zip'); await (await dl).saveAs(g); const exportMs = Date.now() - t0;
    await C.ctx.close();
    const D = await perfil(n, path.join(tmp, 'd')); await D.p.goto(BASE + '#/proyectos'); await D.p.waitForSelector('.vacio');
    const t1 = Date.now();
    const m = await pico(async () => { await D.p.setInputFiles('input[type=file]', g); await esperarEstado(D.p, /importado/); });
    const res = { zipMB: Math.round(fs.statSync(g).size / 1048576), exportarMs: exportMs, importarMs: Date.now() - t1, picoImportarMB: m.picoMB, estado: await estadoTxt(D.p) };
    await D.ctx.close(); return res;
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  return r;
}
(async () => { for (const n of (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'chromium,firefox,webkit').split(',')) console.log(n, JSON.stringify(await caso(n), null, 1)); })();
