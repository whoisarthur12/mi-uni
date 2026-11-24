// Maquetas de diseño (ADR-011): navegación por hash, tema claro/oscuro/sistema y una compresión simulada.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const VISTAS = ['inicio', 'comprimir', 'proyectos', 'ajustes'];

function mostrar() {
  const v = VISTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  $$('.vista').forEach((s) => { s.hidden = s.dataset.vista !== v; });
  $$('[data-solo]').forEach((e) => { e.hidden = e.dataset.solo !== v; });
  const pest = v === 'comprimir' ? 'inicio' : v;
  $$('.pestanas a').forEach((a) => { if (a.dataset.pest === pest) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.documentElement.dataset.vista = v;
  const h = $(`#v-${v} h1`); document.title = document.title.replace(/^[^—]*—/, `${h.textContent} —`);
}
addEventListener('hashchange', () => { mostrar(); scrollTo(0, 0); $('#contenido').focus({ preventScroll: true }); });
mostrar();

// Tema: sistema → claro → oscuro. Se recuerda solo en este navegador.
const TEMAS = ['sistema', 'claro', 'oscuro'], NOMBRE = { sistema: 'Sistema', claro: 'Claro', oscuro: 'Oscuro' };
let tema = 'sistema';
try { tema = localStorage.getItem('mi-uni:tema') || 'sistema'; } catch { /* sin almacenamiento */ }
function aplicarTema() {
  if (tema === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = tema;
  $('.tema-texto').textContent = NOMBRE[tema];
  $('.tema').setAttribute('aria-label', `Tema: ${NOMBRE[tema]}. Cambiar tema`);
}
$('.tema').addEventListener('click', () => {
  tema = TEMAS[(TEMAS.indexOf(tema) + 1) % 3];
  try { localStorage.setItem('mi-uni:tema', tema); } catch { /* sin almacenamiento */ }
  aplicarTema();
});
aplicarTema();

// Compresión simulada: 12 páginas.
let timer = null;
const lento = !matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#comprimir').addEventListener('click', () => {
  $('#resultado').hidden = true; $('#progreso').hidden = false; $('#comprimir').hidden = true;
  let p = 0; const barra = $('.barra-progreso');
  const paso = () => {
    p++; $('#pag').textContent = p; barra.setAttribute('aria-valuenow', p); $('#relleno').style.width = `${(p / 12) * 100}%`;
    if (p >= 12) { clearInterval(timer); $('#progreso').hidden = true; $('#resultado').hidden = false; $('#comprimir').hidden = false; $('#comprimir').textContent = 'Comprimir otra vez'; $('#resultado').focus?.(); }
  };
  timer = setInterval(paso, lento ? 220 : 30);
});
$('#cancelar').addEventListener('click', () => { clearInterval(timer); $('#progreso').hidden = true; $('#comprimir').hidden = false; });

// Copiar resultados: qué dirección, tema y pantalla se vieron.
$('#copiar').addEventListener('click', async () => {
  const datos = {
    direccion: document.documentElement.dataset.direccion, tema,
    temaSistema: matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro',
    pantalla: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, textoGrande: getComputedStyle(document.documentElement).fontSize,
    ua: navigator.userAgent,
  };
  try { await navigator.clipboard.writeText(JSON.stringify(datos)); $('#copiado').hidden = false; } catch { /* sin portapapeles */ }
});
