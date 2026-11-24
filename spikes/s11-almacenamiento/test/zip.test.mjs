import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, crc32Blob, buildZip, readZip } from '../js/zip.js';

const dir = mkdtempSync(join(tmpdir(), 's11-'));
const py = (code, ...args) => execFileSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8' }).trim();

test('crc32 conocido', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const a = new TextEncoder().encode('1234'), b = new TextEncoder().encode('56789');
  assert.equal(crc32(b, crc32(a)), 0xcbf43926);
});

test('crc32Blob por trozos = crc32 directo', async () => {
  const bytes = new Uint8Array(3_000_000).map((_, i) => (i * 7919) & 255);
  assert.equal(await crc32Blob(new Blob([bytes])), crc32(bytes));
});

test('el ZIP que generamos lo valida Python (zipfile.testzip) y lo releemos', async () => {
  const files = [['proyecto.json', '{"a":1}'], ['archivos/año ñ.pdf', 'x'.repeat(100000)], ['vacío.txt', '']];
  const entries = await Promise.all(files.map(async ([name, s]) => { const blob = new Blob([s]); return { name, blob, crc32: await crc32Blob(blob) }; }));
  const zip = buildZip(entries, { now: new Date(2026, 10, 24, 10, 30) });
  const p = join(dir, 'a.zip'); writeFileSync(p, Buffer.from(await zip.arrayBuffer()));
  const out = JSON.parse(py('import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps([z.testzip(),[(i.filename,i.file_size,i.date_time) for i in z.infolist()]]))', p));
  assert.equal(out[0], null);
  assert.deepEqual(out[1].map((x) => x[0]), files.map((f) => f[0]));
  assert.deepEqual(out[1][0][2], [2026, 11, 24, 10, 30, 0]);
  const back = await readZip(new Blob([readFileSync(p)]));
  for (const [i, e] of back.entries()) assert.equal(await (await e.blob()).text(), files[i][1]);
});

test('lee un ZIP DEFLATE hecho por Python', async () => {
  const p = join(dir, 'd.zip');
  py('import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED);z.writestr("t.txt","hola "*1000);z.writestr("c/ñ.txt","ñ");z.close()', p);
  const e = await readZip(new Blob([readFileSync(p)]));
  assert.equal(e[0].method, 8);
  const t = await (await e[0].blob()).text();
  assert.equal(t, 'hola '.repeat(1000));
  assert.equal(crc32(new TextEncoder().encode(t)), e[0].crc32);
  assert.equal(e[1].name, 'c/ñ.txt');
});

test('errores claros', async () => {
  await assert.rejects(readZip(new Blob(['no soy un zip'])), { code: 'ZIP_INVALID' });
  const blob = new Blob(['abc']); const z = buildZip([{ name: 'a', blob, crc32: await crc32Blob(blob) }]);
  await assert.rejects(readZip(z.slice(0, z.size - 30)), { code: 'ZIP_INVALID' });
  assert.throws(() => buildZip([{ name: 'a', blob, crc32: 0 }, { name: 'a', blob, crc32: 0 }]), /repetido/);
});
