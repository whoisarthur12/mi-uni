// Perfil y ajustes (CONTEXT §9.0.a): valores por defecto del dueño, validación, fechas y copia JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POR_DEFECTO, normalizar, aplicarCambio, fmtFecha, zonaValida, exportarJSON, importarJSON } from '../../js/core/ajustes-modelo.js';

test('valores por defecto: Carta, APA 7, 2,54 cm, Santo Domingo, aviso a 7 días', () => {
  const a = normalizar();
  assert.equal(a.formato.papel, 'carta');
  assert.equal(a.formato.estiloCita, 'apa');
  assert.equal(a.formato.margenCm, 2.54);
  assert.equal(a.region.zonaHoraria, 'America/Santo_Domingo');
  assert.equal(a.datos.avisoRespaldoDias, 7);
  assert.deepEqual(Object.values(a.perfil), ['', '', '', '', '', '']);
});

test('lo inválido vuelve al valor por defecto y lo desconocido se descarta', () => {
  const a = normalizar({ formato: { papel: 'oficio', estiloCita: 'inventado', margenCm: 40, tamanoPt: 'x' }, region: { zonaHoraria: 'Marte/Olympus' }, datos: { avisoRespaldoDias: 0 }, extra: 1, perfil: { cedula: '001-0000000-0' } });
  assert.deepEqual(a.formato, POR_DEFECTO.formato);
  assert.equal(a.region.zonaHoraria, 'America/Santo_Domingo');
  assert.equal(a.datos.avisoRespaldoDias, 7);
  assert.equal('extra' in a, false);
  assert.equal('cedula' in a.perfil, false); // nunca documentos de identidad
});

test('textos: espacios recortados y máximo 120 caracteres; márgenes con coma decimal', () => {
  const a = normalizar({ perfil: { nombre: '  María   Suárez  ', universidad: 'U'.repeat(300) }, formato: { margenCm: '3,5' } });
  assert.equal(a.perfil.nombre, 'María Suárez');
  assert.equal(a.perfil.universidad.length, 120);
  assert.equal(a.formato.margenCm, 3.5);
});

test('aplicarCambio mezcla parcial sin perder el resto', () => {
  const a = aplicarCambio(normalizar({ perfil: { nombre: 'Ana' } }), { formato: { papel: 'a4' } });
  assert.equal(a.perfil.nombre, 'Ana'); assert.equal(a.formato.papel, 'a4'); assert.equal(a.formato.estiloCita, 'apa');
});

test('fechas en la zona del perfil', () => {
  const d = new Date('2026-11-25T02:30:00Z'); // 22:30 del 24 en Santo Domingo (UTC−4)
  assert.equal(fmtFecha(d), '24 de noviembre de 2026');
  assert.equal(fmtFecha(d, 'Europe/Madrid'), '25 de noviembre de 2026');
  assert.equal(zonaValida('America/Santo_Domingo'), true);
  assert.equal(zonaValida('nada'), false);
});

test('exportar e importar reproduce los ajustes; rechaza archivos ajenos', () => {
  const a = normalizar({ perfil: { nombre: 'Ana', carrera: 'Derecho' }, formato: { papel: 'a4', margenCm: 3 } });
  assert.deepEqual(importarJSON(exportarJSON(a)), a);
  assert.throws(() => importarJSON('{}'), /no es una copia/);
  assert.throws(() => importarJSON('no json'), /JSON válido/);
});
