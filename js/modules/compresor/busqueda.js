// Búsqueda del nivel de compresión para llegar a un tamaño objetivo (INSTRUCTIONS 2.1 target-search, S1).
// Lógica pura: recibe funciones que comprimen y devuelve qué nivel usar. Probada en Node con motores falsos.
//  1. Búsqueda binaria sobre la escala usando ESTIMACIONES baratas (comprimir solo unas páginas de muestra).
//  2. Confirmación con el documento completo; si se pasa, sube un nivel; si queda muy por debajo
//     (< 90 % de la meta), prueba un nivel menos agresivo para ganar calidad.
//  3. Detecta escalas no monótonas y nunca supera `maxIntentos` pasadas completas.

/**
 * @param {object} o
 * @param {number} o.objetivo bytes máximos
 * @param {number} o.niveles cuántos niveles hay (0 = menos agresivo)
 * @param {(nivel:number)=>Promise<number>} o.estimar bytes estimados del documento completo a ese nivel
 * @param {(nivel:number)=>Promise<{bytes:number}>} o.completo comprime el documento entero (se cachea aquí)
 * @param {number} [o.zonaMin=0.9]
 * @param {number} [o.maxIntentos=4] pasadas completas como máximo
 * @param {(evento:object)=>void} [o.alAvanzar]
 * @returns {Promise<{nivel:number, resultado:object|null, cumple:boolean, intentos:number, estimaciones:number, noMonotona:boolean, historial:object[]}>}
 */
export async function buscarNivel({ objetivo, niveles, estimar, completo, zonaMin = 0.9, maxIntentos = 4, alAvanzar = () => {} }) {
  const historial = []; const est = new Map(); const completos = new Map();
  let noMonotona = false;
  const estimarC = async (n) => {
    if (!est.has(n)) { alAvanzar({ fase: 'estimar', nivel: n }); est.set(n, await estimar(n)); historial.push({ tipo: 'estimacion', nivel: n, bytes: est.get(n) }); }
    return est.get(n);
  };
  const completoC = async (n) => {
    if (!completos.has(n)) { alAvanzar({ fase: 'completo', nivel: n, intento: completos.size + 1 }); const r = await completo(n); completos.set(n, r); historial.push({ tipo: 'completo', nivel: n, bytes: r.bytes }); }
    return completos.get(n);
  };

  // 1. Búsqueda binaria con estimaciones: el nivel MENOS agresivo cuya estimación cabe (con 3 % de margen).
  const margen = objetivo * 0.97;
  let lo = 0, hi = niveles - 1;
  if ((await estimarC(hi)) > margen) {
    // Ni el nivel más agresivo cabe según la estimación: se comprueba con el documento completo.
    const r = await completoC(hi);
    return { nivel: hi, resultado: r, cumple: r.bytes <= objetivo, intentos: completos.size, estimaciones: est.size, noMonotona, historial };
  }
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((await estimarC(mid)) <= margen) hi = mid; else lo = mid + 1;
  }
  // Comprobar monotonía básica con las estimaciones conocidas.
  const conocidas = [...est.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < conocidas.length; i++) if (conocidas[i][1] > conocidas[i - 1][1] * 1.05) noMonotona = true;

  // 2. Confirmación con pasadas completas.
  let n = lo;
  let mejor = null;
  while (completos.size < maxIntentos && n < niveles) {
    const r = await completoC(n);
    if (r.bytes <= objetivo) {
      if (!mejor || r.bytes > mejor.r.bytes) mejor = { n, r };
      // Muy por debajo de la meta: probar un nivel menos agresivo (mejor calidad) si no se probó ya.
      if (r.bytes < objetivo * zonaMin && n > 0 && !completos.has(n - 1)) { n -= 1; continue; }
      break;
    }
    if (mejor) break; // el menos agresivo se pasó; quedarse con el que cabía
    if (n > 0 && completos.has(n - 1) && completos.get(n - 1).bytes < r.bytes) noMonotona = true;
    n += 1;
  }
  if (!mejor) {
    // Ninguna pasada completa cupo: devolver la más pequeña obtenida (la escalera decidirá).
    const [k, r] = [...completos.entries()].sort((a, b) => a[1].bytes - b[1].bytes)[0];
    return { nivel: k, resultado: r, cumple: false, intentos: completos.size, estimaciones: est.size, noMonotona, historial };
  }
  return { nivel: mejor.n, resultado: mejor.r, cumple: true, intentos: completos.size, estimaciones: est.size, noMonotona, historial };
}

/** Estimación por muestra: bytes de la muestra comprimida escalados por el peso de sus páginas. */
export function estimarDesdeMuestra(bytesMuestra, pesos, paginasMuestra) {
  const total = pesos.reduce((a, b) => a + b, 0);
  const muestra = paginasMuestra.reduce((a, p) => a + pesos[p - 1], 0);
  return Math.round(bytesMuestra * (total / Math.max(muestra, 1)));
}

/** Dividir en partes ≤ objetivo con los tamaños por página (greedy, en orden). null si una sola página no cabe. */
export function planPartes(tamPaginas, objetivo, sobrecarga = 0) {
  const partes = []; let actual = []; let suma = sobrecarga;
  for (let i = 0; i < tamPaginas.length; i++) {
    const t = tamPaginas[i];
    if (t + sobrecarga > objetivo) return null;
    if (suma + t > objetivo && actual.length) { partes.push(actual); actual = []; suma = sobrecarga; }
    actual.push(i + 1); suma += t;
  }
  if (actual.length) partes.push(actual);
  return partes;
}
