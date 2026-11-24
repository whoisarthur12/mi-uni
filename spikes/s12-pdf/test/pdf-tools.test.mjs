// Pruebas de S12 tras las decisiones del dueño: apertura con permiso, guarda de salida y tope de memoria.
// Uso: node --test spikes/s12-pdf/test/pdf-tools.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import * as L from '../../../js/vendor/cantoo-pdf-lib-2.11.1/pdf-lib.esm.min.js';
import { openForEdit, safeLoad } from '../js/pdf-open.js';
import { checkOutput, checkInput, pagesInk, pagesStatus, contentPaints } from '../js/output-guard.js';
import { classifyPdfJob } from '../js/pdf-memory.js';

const { PDFDocument, PDFName } = L;
async function makePdf(n = 2, enc) {
  const d = await PDFDocument.create();
  for (let i = 0; i < n; i++) d.addPage().drawText(`Página ${i + 1}`);
  if (enc) d.encrypt(enc);
  return d.save();
}
const ui = (permiso, claves = []) => {
  const calls = { permiso: 0, clave: 0 };
  return { calls, askPermission: async () => { calls.permiso++; return permiso; }, askPassword: async () => { calls.clave++; return claves.shift() ?? null; } };
};

test('sin cifrado: abre sin preguntar', async () => {
  const u = ui(true); const r = await openForEdit(L, await makePdf(), u);
  assert.equal(r.estado, 'normal'); assert.deepEqual(u.calls, { permiso: 0, clave: 0 });
});

test('restricciones del propietario: pregunta; sin confirmación no se toca', async () => {
  const b = await makePdf(2, { userPassword: '', ownerPassword: 'dueño', permissions: { modifying: false, copying: false } });
  const no = ui(false); const r = await openForEdit(L, b, no);
  assert.equal(r.estado, 'rechazado-sin-permiso'); assert.equal(r.doc, undefined); assert.ok(r.alternativas.length >= 2); assert.equal(no.calls.permiso, 1);
  const cerrar = ui(undefined); assert.equal((await openForEdit(L, b, cerrar)).estado, 'rechazado-sin-permiso'); // cerrar el diálogo = no
  const si = ui(true); const r2 = await openForEdit(L, b, si);
  assert.equal(r2.estado, 'restringido-confirmado'); assert.equal(r2.doc.getPageCount(), 2); assert.equal(si.calls.clave, 0);
});

test('contraseña de apertura: se pide; nunca se salta', async () => {
  const b = await makePdf(3, { userPassword: 'clave', ownerPassword: 'dueño' });
  const sin = ui(true, [null]); const r = await openForEdit(L, b, sin);
  assert.equal(r.estado, 'sin-contrasena'); assert.equal(sin.calls.permiso, 0); assert.equal(r.doc, undefined);
  const mal = ui(true, ['x', 'y', 'z']); assert.equal((await openForEdit(L, b, mal)).estado, 'contrasena-incorrecta'); assert.equal(mal.calls.clave, 3);
  const bien = ui(true, ['mal', 'clave']); const r2 = await openForEdit(L, b, bien);
  assert.equal(r2.estado, 'con-contrasena'); assert.equal(r2.doc.getPageCount(), 3);
});

test('safeLoad rechaza opciones fuera de la lista blanca', async () => {
  const b = await makePdf();
  await assert.rejects(() => safeLoad(PDFDocument, b, { ['ignore' + 'Encryption']: true }), /no permitida/);
  await assert.rejects(() => safeLoad(PDFDocument, b, { capNumbers: true }), /no permitida/);
});

test('guarda: acepta una unión correcta', async () => {
  const a = await PDFDocument.load(await makePdf(2)); const c = await PDFDocument.load(await makePdf(3));
  const out = await PDFDocument.create();
  for (const d of [a, c]) (await out.copyPages(d, d.getPageIndices())).forEach((p) => out.addPage(p));
  const ink = [...pagesInk(L, a), ...pagesInk(L, c)];
  assert.deepEqual(await checkOutput(L, await out.save(), { expectedPages: 5, expectInk: ink }), { ok: true, paginas: 5, vacias: [] });
});

test('guarda: rechaza páginas de menos, contenido ilegible y PDF que no abre', async () => {
  const ok = await makePdf(2);
  assert.equal((await checkOutput(L, ok, { expectedPages: 3, expectInk: [true, true, true] })).ok, false);
  // Simula el fallo de S12: el contenido de la página 2 sigue cifrado (bytes aleatorios), con y sin FlateDecode.
  for (const filter of [true, false]) {
    const d = await PDFDocument.load(ok); const p = d.getPage(1);
    const s = d.context.stream(randomBytes(4096), filter ? { Filter: 'FlateDecode' } : {});
    p.node.set(PDFName.of('Contents'), d.context.register(s));
    const r = await checkOutput(L, await d.save(), { expectedPages: 2, expectInk: [true, true] });
    assert.equal(r.ok, false); assert.deepEqual(r.vacias, [2]);
  }
  assert.equal((await checkOutput(L, ok.slice(0, 200), { expectedPages: 2, expectInk: [true, true] })).ok, false);
});

test('guarda: una página en blanco que ya lo era en el original no es un fallo', async () => {
  const d0 = await PDFDocument.create(); d0.addPage().drawText('x'); d0.addPage(); // la 2 está en blanco a propósito
  const d = await PDFDocument.load(await d0.save()); const ink = pagesInk(L, d); assert.deepEqual(ink, [true, false]);
  assert.equal((await checkOutput(L, await d.save(), { expectedPages: 2, expectInk: ink })).ok, true);
});

test('guarda de entrada: páginas cuyo contenido falta (PDF truncado) abren sin error pero se rechazan', async () => {
  const d0 = await PDFDocument.create();
  for (let i = 0; i < 30; i++) d0.addPage().drawText(`Página ${i + 1}`);
  const b = await d0.save({ useObjectStreams: false });
  // Como sint-corrupto.pdf (truncado a la mitad): las páginas 10–30 apuntan a contenidos que ya no existen.
  const d = await PDFDocument.load(b);
  for (const p of d.getPages().slice(9)) { const c = p.node.get(PDFName.of('Contents')); (c instanceof L.PDFArray ? c.asArray() : [c]).forEach((r) => d.context.delete(r)); }
  const t = await PDFDocument.load(await d.save({ useObjectStreams: false }), { updateMetadata: false });
  assert.equal(t.getPageCount(), 30); // pdf-lib no avisa
  const r = checkInput(L, t);
  assert.equal(r.ok, false); assert.equal(r.ilegibles.length, 21); assert.match(r.motivo, /21 de 30/);
  assert.equal(checkInput(L, await PDFDocument.load(b)).ok, true);
  assert.deepEqual(pagesStatus(L, await PDFDocument.load(b)).filter((s) => s !== 'contenido'), []);
});

test('contentPaints: texto, imagen, imagen en línea, vacío y binario', () => {
  assert.equal(contentPaints('BT /F1 12 Tf 72 712 Td (Hola) Tj ET'), true);
  assert.equal(contentPaints('q 100 0 0 100 0 0 cm /Im1 Do Q'), true);
  assert.equal(contentPaints('q BI /W 2 /H 1 /BPC 8 /CS /G ID ÿ\u0000 EI Q'), true);
  assert.equal(contentPaints('q 1 0 0 1 0 0 cm Q'), false);
  assert.equal(contentPaints(''), false);
  assert.equal(contentPaints(String.fromCharCode(...randomBytes(2000)) + ' f '), false);
});

test('tope de memoria de la Caja PDF (8× provisional)', () => {
  const iphone = { isMobile: true }; // Safari no expone deviceMemory → 3 GB supuestos
  const r = classifyPdfJob(84e6, iphone); // 3×28 MB
  assert.deepEqual([r.level, r.budgetMB, r.okMB, r.maxWarnMB, r.estimatePeakMB], ['warn', 1024, 64, 128, 672]);
  assert.equal(classifyPdfJob(60e6, iphone).level, 'ok');
  assert.equal(classifyPdfJob(130e6, iphone).level, 'block');
  assert.equal(classifyPdfJob(300e6, { isMobile: false, deviceMemoryGB: 8 }).level, 'warn');
  assert.equal(classifyPdfJob(350e6, { isMobile: false, deviceMemoryGB: 8 }).level, 'block');
  assert.equal(classifyPdfJob(84e6, { isMobile: true, learnedFailMB: 90 }).level, 'block'); // 0,8 × 90 = 72 MB
});
