"""Genera los íconos de prueba del spike (herramienta de desarrollo; requiere Pillow)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / 'icons')
out.mkdir(parents=True, exist_ok=True)

def icon(size, maskable):
    img = Image.new('RGB', (size, size), '#1d4ed8')
    d = ImageDraw.Draw(img)
    # La zona segura de un ícono maskable es el círculo central del 80 %.
    m = size * (0.28 if maskable else 0.18)
    d.rounded_rectangle([m, m, size - m, size - m], radius=size * 0.08, fill='#ffffff')
    d.rectangle([size * 0.40, m + size * 0.08, size * 0.60, size - m - size * 0.08], fill='#1d4ed8')
    return img

icon(192, False).save(out / 'icon-192.png', optimize=True)
icon(512, False).save(out / 'icon-512.png', optimize=True)
icon(512, True).save(out / 'icon-maskable-512.png', optimize=True)
