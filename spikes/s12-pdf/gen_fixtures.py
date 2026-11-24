"""Fixtures SINTÉTICOS de S12 (no se versionan). Uso: python3 -I spikes/s12-pdf/gen_fixtures.py <carpeta>
Reutiliza el generador de S1. Requiere Pillow, numpy, reportlab y pypdf (solo desarrollo)."""
import io, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 's1-ghostscript'))
import gen_fixtures as g  # noqa: E402  (fotos con ruido de sensor, texto, mixto)
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

def fotos(path, paginas, seed0, q=92):
    c = canvas.Canvas(path, pagesize=letter)
    for i in range(paginas):
        data = g.jpeg_bytes(g.foto_pagina(3000, 4000, seed0 + i), q)
        c.drawImage(ImageReader(io.BytesIO(data)), 0, 0, *letter); c.showPage()
    c.save()

def cien_paginas(path):
    """100 páginas tipo apuntes: texto vectorial + una foto pequeña por página."""
    c = canvas.Canvas(path, pagesize=letter)
    for i in range(100):
        t = c.beginText(72, 720); t.setFont('Helvetica', 11)
        t.textLine(f'Página {i + 1}')
        for j in range(30): t.textLine((g.LOREM * 2)[j: j + 90])
        c.drawText(t)
        data = g.jpeg_bytes(g.foto_pagina(1200, 800, 500 + i), 80)
        c.drawImage(ImageReader(io.BytesIO(data)), 72, 72, 300, 200); c.showPage()
    c.save()

def formulario(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.drawString(72, 720, 'Nombre:'); c.acroForm.textfield(name='nombre', x=140, y=710, width=300, height=20)
    c.drawString(72, 680, 'Acepto:'); c.acroForm.checkbox(name='acepto', x=140, y=675, size=16)
    c.showPage(); c.save()

def cifrado(src, path, user, owner):
    r = PdfReader(src); w = PdfWriter()
    for p in r.pages: w.add_page(p)
    w.encrypt(user_password=user, owner_password=owner, algorithm='AES-256'); w.write(path)

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for k, seed in (('a', 1000), ('b', 2000), ('c', 3000)): fotos(f'{out}/sint-30mb-{k}.pdf', 6, seed)
    cien_paginas(f'{out}/sint-100p.pdf')
    g.pdf_texto(f'{out}/sint-texto-30p.pdf', 30)
    formulario(f'{out}/sint-formulario.pdf')
    cifrado(f'{out}/sint-texto-30p.pdf', f'{out}/sint-cifrado-usuario.pdf', 'clave', 'dueño')
    cifrado(f'{out}/sint-texto-30p.pdf', f'{out}/sint-cifrado-solo-dueno.pdf', '', 'dueño')
    b = open(f'{out}/sint-texto-30p.pdf', 'rb').read(); open(f'{out}/sint-corrupto.pdf', 'wb').write(b[: len(b) // 2])
    for f in sorted(os.listdir(out)): print(f, os.path.getsize(f'{out}/{f}'))
