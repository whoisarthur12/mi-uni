// Se carga sin defer en <head>: aplica el tema guardado antes de pintar (evita el destello claro/oscuro).
(function () {
  try {
    var t = localStorage.getItem('mi-uni:tema');
    if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.theme = t;
  } catch (e) { /* sin almacenamiento: tema del sistema */ }
})();
