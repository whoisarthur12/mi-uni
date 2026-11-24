// Maqueta de la dirección B con el sistema de docs/ESTILO.md (ADR-013): navegación por hash,
// tema sistema/claro/oscuro, compresión simulada y estado vacío. Sin red ni datos reales.
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const VISTAS = ['inicio', 'comprimir', 'proyectos', 'ajustes'];

function mostrar() {
  const v = VISTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  $$('.vista').forEach((s) => { s.hidden = s.dataset.vista !== v; });
  $$('[data-solo]').forEach((e) => { e.hidden = e.dataset.solo !== v; });
  $$('[data-no]').forEach((e) => { e.hidden = e.dataset.no === v; });
  const pest = v === 'comprimir' ? 'inicio' : v;
  $$('.pestanas a').forEach((a) => (a.dataset.pest === pest ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.title = `${$(`[data-vista="${v}"] h1`).firstChild.textContent.replace(/\.\s*$/, '').trim()} — Mi Uni (diseño)`;
}
addEventListener('hashchange', () => { mostrar(); scrollTo(0, 0); $('#contenido').focus({ preventScroll: true }); });
mostrar();

// Tema: se recuerda solo en este navegador (localStorage puede fallar en navegación privada).
const NOMBRE = { sistema: 'Sistema', claro: 'Claro', oscuro: 'Oscuro' };
const ORDEN = ['sistema', 'claro', 'oscuro'];
let tema = 'sistema';
try { tema = localStorage.getItem('mi-uni:tema') || 'sistema'; } catch { /* sin almacenamiento */ }
function aplicarTema(t) {
  tema = t;
  try { localStorage.setItem('mi-uni:tema', t); } catch { /* sin almacenamiento */ }
  if (t === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  $('.tema-texto').textContent = NOMBRE[t];
  $('.tema').setAttribute('aria-label', `Tema: ${NOMBRE[t].toLowerCase()}. Cambiar tema`);
  $$('.segmentos [data-tema]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tema === t)));
}
$('.tema').addEventListener('click', () => aplicarTema(ORDEN[(ORDEN.indexOf(tema) + 1) % 3]));
$$('.segmentos [data-tema]').forEach((b) => b.addEventListener('click', () => aplicarTema(b.dataset.tema)));
aplicarTema(tema);

// Compresión simulada de 12 páginas.
let timer = null;
const rapido = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#comprimir').addEventListener('click', () => {
  $('#resultado').hidden = true; $('#comprimir').hidden = true; $('#progreso').hidden = false;
  let p = 0; const pista = $('.pista');
  timer = setInterval(() => {
    p++; $('#pag').textContent = p; pista.setAttribute('aria-valuenow', p); $('#relleno').style.width = `${(p / 12) * 100}%`;
    if (p < 12) return;
    clearInterval(timer); $('#progreso').hidden = true; $('#comprimir').hidden = false; $('#comprimir').textContent = 'Comprimir otra vez';
    $('#resultado').hidden = false; $('#resultado').focus();
  }, rapido ? 30 : 200);
});
$('#cancelar').addEventListener('click', () => { clearInterval(timer); $('#progreso').hidden = true; $('#comprimir').hidden = false; });

// Estado vacío de proyectos.
$('#ver-vacio').addEventListener('click', () => { $('#con-proyectos').hidden = true; $('#sin-proyectos').hidden = false; });
$('#ver-lista').addEventListener('click', () => { $('#sin-proyectos').hidden = true; $('#con-proyectos').hidden = false; });

// Copiar resultados: tema, pantalla y tamaño de texto para revisar en el teléfono.
$('#copiar').addEventListener('click', async () => {
  const datos = {
    diseno: 'B + ESTILO.md', tema, temaSistema: matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro',
    pantalla: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, textoBase: getComputedStyle(document.documentElement).fontSize,
    fuenteCargada: document.fonts.check('16px Inter'), ua: navigator.userAgent,
  };
  try { await navigator.clipboard.writeText(JSON.stringify(datos)); $('#copiado').hidden = false; } catch { /* sin portapapeles */ }
});
