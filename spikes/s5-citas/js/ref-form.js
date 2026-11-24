// Formulario editable de una referencia (CSL-JSON). Se usa tras una búsqueda DOI/ISBN y para la entrada manual.
// Los autores SIEMPRE son editables antes de guardar (Open Library separa mal los apellidos compuestos).
const TYPES = [['book', 'Libro'], ['chapter', 'Capítulo de libro'], ['article-journal', 'Artículo de revista'], ['article-newspaper', 'Artículo de periódico'], ['webpage', 'Página web'], ['thesis', 'Tesis'], ['report', 'Informe']];
const FIELDS = [['title', 'Título'], ['container-title', 'Revista / libro / sitio'], ['publisher', 'Editorial / institución'], ['edition', 'Edición (número)'], ['volume', 'Volumen'], ['issue', 'Número'], ['page', 'Páginas'], ['DOI', 'DOI'], ['URL', 'URL'], ['genre', 'Tipo de tesis (p. ej., Tesis de maestría)']];

function el(tag, props = {}, ...kids) { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; }
function labeled(text, input) { const id = 'f' + Math.random().toString(36).slice(2); input.id = id; return el('div', { className: 'row' }, el('label', { htmlFor: id, textContent: text }), input); }

/** Muestra el formulario en `box`. onSave(item) recibe el CSL-JSON editado. */
export function renderForm(box, { item = { type: 'book', author: [{ family: '', given: '' }] }, fuente = 'Entrada manual', revisar = [], onSave }) {
  box.replaceChildren();
  box.append(el('h2', { textContent: `Revisa la referencia (${fuente})` }));
  if (revisar.length) box.append(el('p', { className: 'muted', textContent: 'Revisa especialmente: ' + revisar.join(', ') + '.' }));
  const type = el('select', {}, ...TYPES.map(([v, t]) => el('option', { value: v, textContent: t, selected: v === item.type })));
  box.append(labeled('Tipo', type));
  const authorsBox = el('fieldset', {}, el('legend', { textContent: 'Autores (apellidos completos, p. ej., "García Márquez")' }));
  const addAuthor = (a = { family: '', given: '' }) => {
    const fam = el('input', { value: a.family || a.literal || '', placeholder: 'Apellido(s)', 'aria-label': 'Apellidos', className: 'fam' });
    const giv = el('input', { value: a.given || '', placeholder: 'Nombre(s)', 'aria-label': 'Nombres', className: 'giv' });
    const del = el('button', { type: 'button', textContent: 'Quitar', 'aria-label': 'Quitar autor' });
    const row = el('div', { className: 'row author' }, fam, giv, del); del.onclick = () => row.remove();
    authorsBox.insertBefore(row, addBtn);
  };
  const addBtn = el('button', { type: 'button', textContent: 'Añadir autor' }); addBtn.onclick = () => addAuthor();
  authorsBox.append(addBtn); (item.author && item.author.length ? item.author : [{}]).forEach(addAuthor);
  box.append(authorsBox);
  const year = el('input', { value: item.issued?.['date-parts']?.[0]?.[0] ?? '', inputMode: 'numeric', placeholder: 'Vacío = s. f.' });
  box.append(labeled('Año', year));
  const inputs = Object.fromEntries(FIELDS.map(([k, t]) => { const i = el('input', { value: item[k] ?? '' }); box.append(labeled(t, i)); return [k, i]; }));
  const accessed = el('input', { type: 'date' }); box.append(labeled('Fecha de consulta (obligatoria en páginas web sin fecha)', accessed));
  const msg = el('p', { role: 'alert', className: 'muted' });
  const save = el('button', { type: 'button', textContent: 'Guardar referencia' });
  box.append(msg, save);
  save.onclick = () => {
    const out = { type: type.value };
    out.author = [...authorsBox.querySelectorAll('.author')].map((r) => ({ family: r.querySelector('.fam').value.trim(), given: r.querySelector('.giv').value.trim() }))
      .filter((a) => a.family || a.given).map((a) => (a.given ? a : { literal: a.family }));
    for (const [k, i] of Object.entries(inputs)) if (i.value.trim()) out[k] = i.value.trim();
    if (/^\d{4}$/.test(year.value.trim())) out.issued = { 'date-parts': [[+year.value.trim()]] };
    if (accessed.value) out.accessed = { 'date-parts': [accessed.value.split('-').map(Number)] };
    const errs = [];
    if (!out.title) errs.push('falta el título');
    if (out.type === 'webpage' && !out.issued && !out.accessed) errs.push('una página web sin fecha necesita la fecha de consulta');
    if (errs.length) { msg.textContent = 'No se puede guardar: ' + errs.join('; ') + '.'; return; }
    msg.textContent = '';
    onSave(out);
  };
  return box;
}
