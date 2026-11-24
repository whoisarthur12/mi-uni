// Sanitizador mínimo para la salida HTML de citeproc: los metadatos externos (CrossRef trae <i>, <sub>…)
// pueden contener HTML. Solo se conservan etiquetas de formato, sin atributos (salvo class en div/span).
const ALLOWED = new Set(['I', 'B', 'EM', 'STRONG', 'SUP', 'SUB', 'SPAN', 'DIV', 'BR']);
const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'MATH']); // fuera con su contenido

export function sanitizeInto(container, html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (src, dst) => {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { dst.append(n.textContent); continue; }
      if (n.nodeType !== 1 || DROP.has(n.tagName)) continue;
      if (!ALLOWED.has(n.tagName)) { walk(n, dst); continue; } // se queda el texto, se va la etiqueta
      const el = document.createElement(n.tagName.toLowerCase());
      if ((n.tagName === 'DIV' || n.tagName === 'SPAN') && /^csl-[a-z-]+$/.test(n.getAttribute('class') || '')) el.className = n.getAttribute('class');
      walk(n, el); dst.append(el);
    }
  };
  container.replaceChildren();
  walk(doc.body, container);
}
