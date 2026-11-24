// IndexedDB de la app con esquema versionado (CONTEXT §8, ADR-006). Un solo punto de apertura.
// Cada versión añade almacenes; nunca se borra uno con datos sin una migración explícita.
const NOMBRE = 'mi-uni';
export const VERSION_DB = 2;
const MIGRACIONES = {
  1: (db) => { db.createObjectStore('ajustes'); }, // clave → valor (perfil, formato, región, datos)
  2: (db) => { // proyectos (ADR-006): metadatos, recursos y archivos en trozos de 8 MB
    db.createObjectStore('proyectos', { keyPath: 'id' });
    db.createObjectStore('recursos', { keyPath: 'id' }).createIndex('proyectoId', 'proyectoId');
    db.createObjectStore('trozos', { keyPath: ['rid', 'i'] });
  },
};

let abierta = null;
export function abrirDB() {
  if (!abierta) {
    abierta = new Promise((resolve, reject) => {
      if (!('indexedDB' in self)) return reject(new Error('Este navegador no permite guardar datos.'));
      const req = indexedDB.open(NOMBRE, VERSION_DB);
      req.onupgradeneeded = (e) => { for (let v = e.oldVersion + 1; v <= VERSION_DB; v++) MIGRACIONES[v](req.result, req.transaction); };
      req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); abierta = null; }; resolve(db); };
      req.onerror = () => reject(req.error || new Error('No se pudo abrir la base de datos.'));
      req.onblocked = () => reject(new Error('Cierra las otras pestañas de Mi Uni y vuelve a intentarlo.'));
    }).catch((e) => { abierta = null; throw e; });
  }
  return abierta;
}

export const prom = (req) => new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });
export const fin = (tx) => new Promise((ok, mal) => { tx.oncomplete = () => ok(); tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error || new Error('Operación cancelada.')); });

export async function leer(almacen, clave) {
  const db = await abrirDB();
  return prom(db.transaction(almacen).objectStore(almacen).get(clave));
}

export async function escribir(almacen, clave, valor) {
  const db = await abrirDB();
  const tx = db.transaction(almacen, 'readwrite');
  tx.objectStore(almacen).put(valor, clave);
  return fin(tx);
}
