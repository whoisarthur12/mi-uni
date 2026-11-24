"""Genera PDFs SINTÉTICOS para el spike S1 (no son archivos reales del dueño).

Uso: python3 -I gen_fixtures.py <carpeta_salida>
Requiere: Pillow, numpy, reportlab (solo herramientas de desarrollo; no van a la app).
"""
import io, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

rng = np.random.default_rng(42)
LOREM = ("La fotosíntesis es el proceso mediante el cual las plantas convierten la luz "
         "en energía química, liberando oxígeno como subproducto esencial para la vida. ")

def foto_pagina(w, h, seed):
    """Simula la foto de una hoja: fondo con iluminación irregular, ruido de sensor y renglones de texto."""
    r = np.random.default_rng(seed)
    low = r.random((h // 64 + 2, w // 64 + 2, 3)).astype(np.float32)
    base = np.array(Image.fromarray((low * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32)
    base = 170 + base * 0.3  # papel ligeramente teñido
    base += r.normal(0, 9, (h, w, 3))  # ruido de sensor (lo que hace pesadas las fotos)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    y = h // 12
    while y < h - h // 12:
        x = w // 12
        while x < w - w // 8:
            ww = int(r.integers(w // 60, w // 18))
            d.rectangle([x, y, x + ww, y + h // 90], fill=(40, 40, 50))
            x += ww + w // 80
        y += h // 38
    return img.filter(ImageFilter.GaussianBlur(0.6))

def jpeg_bytes(img, q):
    b = io.BytesIO(); img.save(b, "JPEG", quality=q, subsampling=0); return b.getvalue()

def pdf_fotos(path, paginas, w, h, q):
    c = canvas.Canvas(path, pagesize=letter)
    for i in range(paginas):
        data = jpeg_bytes(foto_pagina(w, h, i), q)
        c.drawImage(ImageReader(io.BytesIO(data)), 0, 0, *letter)
        c.showPage()
    c.save()

def pdf_texto(path, paginas):
    c = canvas.Canvas(path, pagesize=letter)
    for i in range(paginas):
        t = c.beginText(72, 720); t.setFont("Times-Roman", 12)
        for j in range(45):
            t.textLine((LOREM * 2)[j % 50: j % 50 + 85])
        c.drawText(t); c.showPage()
    c.save()

def pdf_mixto(path, paginas):
    """Tipo 'Word exportado con imágenes': texto vectorial + una foto grande por página."""
    c = canvas.Canvas(path, pagesize=letter)
    for i in range(paginas):
        t = c.beginText(72, 720); t.setFont("Helvetica", 11)
        for j in range(18):
            t.textLine((LOREM * 2)[j: j + 90])
        c.drawText(t)
        data = jpeg_bytes(foto_pagina(3000, 2000, 100 + i), 92)
        c.drawImage(ImageReader(io.BytesIO(data)), 72, 90, 468, 312)
        c.showPage()
    c.save()

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    pdf_texto(f"{out}/sint-texto-30p.pdf", 30)
    pdf_mixto(f"{out}/sint-mixto-10p.pdf", 10)
    pdf_fotos(f"{out}/sint-foto-5mb.pdf", 2, 3000, 4000, 85)
    pdf_fotos(f"{out}/sint-foto-30mb.pdf", 6, 3000, 4000, 92)
    pdf_fotos(f"{out}/sint-foto-80mb.pdf", 11, 3000, 4000, 95)
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(f"{out}/{f}"))
