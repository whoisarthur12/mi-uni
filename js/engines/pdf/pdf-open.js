// Apertura de PDFs para EDITAR (unir, dividir, rotar…) con @cantoo/pdf-lib — ADR-010, decisión del dueño (24-nov-2026):
//  - Sin cifrado → se abre.
//  - Solo restricciones del propietario (abre sin contraseña) → se AVISA y se pide confirmación
//    («¿Es tuyo o tienes permiso?»). Solo con confirmación se procede; sin ella no se toca y se ofrecen alternativas.
//  - Contraseña de apertura → se pide al usuario. Nunca se intenta saltar.
// Las opciones de carga van por lista blanca: ninguna opción que ignore el cifrado puede llegar a pdf-lib.
// Lógica sin DOM: las preguntas al usuario llegan como funciones (askPermission, askPassword). Probado en Node.

const ALLOWED_LOAD_OPTS = ['password', 'updateMetadata'];

export const ALTERNATIVAS_RESTRINGIDO = [
  'Ver y leer el PDF (las miniaturas y la vista previa no lo modifican).',
  'Pedir a quien lo creó una copia sin restricciones.',
];

/** Llama a PDFDocument.load solo con opciones permitidas. */
export async function safeLoad(PDFDocument, bytes, opts = {}) {
  const clean = {};
  for (const k of Object.keys(opts)) {
    if (!ALLOWED_LOAD_OPTS.includes(k)) throw new Error(`Opción de carga no permitida: ${k}`);
    clean[k] = opts[k];
  }
  return PDFDocument.load(bytes, clean);
}

const isEncryptedErr = (L, e) => (L.EncryptedPDFError && e instanceof L.EncryptedPDFError) || /is encrypted/i.test(String(e?.message));
const needsPassword = (e) => /NEEDS PASSWORD/i.test(String(e?.message));
const wrongPassword = (e) => /Password incorrect/i.test(String(e?.message));

/**
 * @param {object} L módulo @cantoo/pdf-lib
 * @param {Uint8Array} bytes
 * @param {{name?: string, askPermission: (info) => Promise<boolean>, askPassword: (info) => Promise<string|null>, maxTries?: number}} ui
 * @returns {Promise<{estado: 'normal'|'restringido-confirmado'|'con-contrasena', doc}
 *   | {estado: 'rechazado-sin-permiso'|'sin-contrasena'|'contrasena-incorrecta', mensaje: string, alternativas: string[]}>}
 */
export async function openForEdit(L, bytes, ui) {
  const base = { updateMetadata: false };
  try {
    return { estado: 'normal', doc: await safeLoad(L.PDFDocument, bytes, base) };
  } catch (e) {
    if (!isEncryptedErr(L, e)) throw e; // dañado u otro error: el llamador muestra el mensaje
  }
  // Cifrado. ¿Abre sin contraseña de apertura? Entonces solo tiene restricciones del propietario.
  let restringido = null;
  try { restringido = await safeLoad(L.PDFDocument, bytes, { ...base, password: '' }); } catch (e) {
    if (!needsPassword(e) && !wrongPassword(e)) throw e;
  }
  if (restringido) {
    const ok = await ui.askPermission({
      name: ui.name,
      pregunta: 'Este PDF tiene restricciones de su autor (por ejemplo, no permite modificarlo). ¿Es tuyo o tienes permiso para modificarlo?',
      aviso: 'Si continúas, el PDF resultante no conservará esas restricciones. El original no se modifica.',
    });
    if (ok === true) return { estado: 'restringido-confirmado', doc: restringido };
    return { estado: 'rechazado-sin-permiso', mensaje: 'No se ha modificado el PDF.', alternativas: ALTERNATIVAS_RESTRINGIDO };
  }
  // Necesita contraseña de apertura: se pide; nunca se intenta adivinar ni saltar.
  const tries = ui.maxTries ?? 3;
  for (let i = 0; i < tries; i++) {
    const pw = await ui.askPassword({ name: ui.name, intento: i + 1, mensaje: i ? 'Contraseña incorrecta. Inténtalo de nuevo.' : 'Este PDF pide una contraseña para abrirlo.' });
    if (pw == null || pw === '') return { estado: 'sin-contrasena', mensaje: 'Sin la contraseña no se puede abrir este PDF.', alternativas: ['Pedir la contraseña a quien te envió el PDF.'] };
    try { return { estado: 'con-contrasena', doc: await safeLoad(L.PDFDocument, bytes, { ...base, password: pw }) }; } catch (e) {
      if (!wrongPassword(e) && !needsPassword(e)) throw e;
    }
  }
  return { estado: 'contrasena-incorrecta', mensaje: 'Contraseña incorrecta.', alternativas: ['Pedir la contraseña a quien te envió el PDF.'] };
}
