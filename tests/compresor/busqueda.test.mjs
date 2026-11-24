// Búsqueda del nivel para el tamaño objetivo, estimación por muestra y partes (lógica pura con motores falsos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarNivel, estimarDesdeMuestra, planPartes } from '../../js/modules/compresor/busqueda.js';
import { elegirMuestra, paginasPesadas } from '../../js/engines/pdf/pesos.js';
import { NIVELES, OBJETIVO_POR_DEFECTO } from '../../js/modules/compresor/escala.js';

// Motor falso: tamaño real por nivel (monótono decreciente) y estimación con un error dado.
function motor(tamanos, errorEst = 0) {
  const llamadas = { estimar: 0, completo: 0 };
  return {
    llamadas,
    estimar: async (n) => { llamadas.estimar++; return Math.round(tamanos[n] * (1 + errorEst)); },
    completo: async (n) => { llamadas.completo++; return { bytes: tamanos[n], n }; },
  };
}
const MB = 1e6;
const tamanos = [40, 30, 22, 17, 12, 9.5, 7, 5.6, 4.6, 3.9, 3.2, 2.6].map((x) => x * MB);

test('meta 4,8 MB por defecto y 12 niveles monótonos', () => {
  assert.equal(OBJETIVO_POR_DEFECTO, 4_800_000);
  assert.equal(NIVELES.length, 12);
  for (let i = 1; i < NIVELES.length; i++) assert.ok(NIVELES[i].dpi <= NIVELES[i - 1].dpi && NIVELES[i].calidad < NIVELES[i - 1].calidad);
});

test('elige el nivel MENOS agresivo que cabe, con pocas pasadas completas', async () => {
  const m = motor(tamanos);
  const r = await buscarNivel({ objetivo: 4.8 * MB, niveles: 12, estimar: m.estimar, completo: m.completo });
  assert.equal(r.nivel, 8); assert.equal(r.cumple, true); assert.equal(r.resultado.bytes, 4.6 * MB);
  assert.ok(m.llamadas.estimar <= 5, `estimaciones: ${m.llamadas.estimar}`);
  assert.ok(m.llamadas.completo <= 2, `completas: ${m.llamadas.completo}`);
});

test('si la estimación se queda corta, la pasada completa sube un nivel y nunca entrega algo mayor que la meta', async () => {
  const m = motor(tamanos, -0.2); // estima un 20 % menos de lo real
  const r = await buscarNivel({ objetivo: 4.8 * MB, niveles: 12, estimar: m.estimar, completo: m.completo });
  assert.equal(r.cumple, true); assert.ok(r.resultado.bytes <= 4.8 * MB); assert.equal(r.nivel, 8);
});

test('si queda muy por debajo (< 90 %), prueba un nivel menos agresivo para ganar calidad', async () => {
  const m = motor(tamanos, 0.3); // estima un 30 % más: elegiría un nivel demasiado agresivo
  const r = await buscarNivel({ objetivo: 4.8 * MB, niveles: 12, estimar: m.estimar, completo: m.completo });
  assert.equal(r.nivel, 8); assert.ok(r.resultado.bytes >= 0.9 * 4.8 * MB);
});

test('si ni el nivel más agresivo cabe, lo dice (la escalera decide)', async () => {
  const m = motor(tamanos);
  const r = await buscarNivel({ objetivo: 1 * MB, niveles: 12, estimar: m.estimar, completo: m.completo });
  assert.equal(r.cumple, false); assert.equal(r.nivel, 11);
});

test('detecta una escala no monótona', async () => {
  const raros = [...tamanos]; raros[7] = 15 * MB; // en un nivel que la búsqueda binaria visita
  const m = motor(raros);
  const r = await buscarNivel({ objetivo: 4.8 * MB, niveles: 12, estimar: m.estimar, completo: m.completo });
  assert.equal(r.cumple, true);
  assert.equal(r.noMonotona, true);
});

test('estimación por muestra escalada por el peso de las páginas', () => {
  assert.equal(estimarDesdeMuestra(1_000_000, [10, 10, 10, 10], [1, 3]), 2_000_000);
  assert.equal(estimarDesdeMuestra(1_000_000, [30, 10, 10, 50], [1, 4]), 1_250_000);
});

test('muestra: primera, última y las más pesadas; nada con pocas páginas', () => {
  assert.equal(elegirMuestra([1, 2, 3, 4, 5]), null);
  const m = elegirMuestra([1, 1, 90, 1, 1, 1, 80, 1, 1, 1, 1, 1]);
  assert.ok(m.includes(1) && m.includes(12) && m.includes(3) && m.includes(7), String(m));
  assert.deepEqual(paginasPesadas([1, 1, 90, 1, 80]), [3, 5]);
});

test('partes: cada una ≤ meta; null si una sola página no cabe', () => {
  assert.deepEqual(planPartes([2, 2, 2, 2, 2].map((x) => x * MB), 4.8 * MB), [[1, 2], [3, 4], [5]]);
  assert.equal(planPartes([2 * MB, 6 * MB], 4.8 * MB), null);
});
