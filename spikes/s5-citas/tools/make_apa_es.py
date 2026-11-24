"""Genera vendor/csl/apa-es.csl a partir del apa.csl oficial (CC BY-SA 3.0: la derivada también lo es).

Adaptaciones a la edición en español de APA 7 (ver README de S5; validar con el reglamento de la universidad):
  1. "y" en lugar de "&" entre autores (and="symbol" -> and="text"; el término "and" de es-ES es "y").
  2. Fechas con día: "15 de marzo" en lugar de "marzo 15".
  3. Raya (–) en rangos de páginas aunque el locale es-ES traiga guion.
  4. "Recuperado el ..., de URL", y nada si falta la fecha de consulta (el formulario debe pedirla para páginas sin fecha).
  5. Sin coma antes de "y" (delimiter-precedes-last="never"): "Pérez, A., Gómez, B. y Ruiz, C.".
Uso: python3 -I tools/make_apa_es.py
"""
import re
from pathlib import Path

d = Path(__file__).resolve().parent.parent / 'vendor' / 'csl'
src = (d / 'apa.csl').read_text(encoding='utf-8')
out = src

def sub(pattern, repl, s, count, flags=0):
    new, n = re.subn(pattern, repl, s, flags=flags)
    if n != count:
        raise SystemExit(f'Se esperaban {count} reemplazos para {pattern!r} y hubo {n}: apa.csl cambió, revisar.')
    return new

n_and = len(re.findall(r'and="symbol"', out))
n_dpl = len(re.findall(r'delimiter-precedes-last="always"', out))
out = sub(r'delimiter-precedes-last="always"', 'delimiter-precedes-last="never"', out, n_dpl)
out = sub(r'<text term="retrieved" text-case="capitalize-first"/>\s*<group delimiter=", ">\s*<date form="text" variable="accessed"/>\s*<text term="from"/>\s*</group>',
          '<group delimiter=" "><text term="retrieved" text-case="capitalize-first"/><group delimiter=", "><date form="text" variable="accessed"/><text term="from"/></group></group>', out, 1)
out = sub(r'and="symbol"', 'and="text"', out, n_and)
out = sub(r'(<macro name="date-issued-month-day">\s*<date variable="issued">)\s*<date-part name="month"/>\s*<date-part name="day" prefix=" "/>',
          r'\1\n      <date-part name="day" suffix=" de "/>\n      <date-part name="month"/>', out, 1)
out = sub(r'<locale xml:lang="es">\s*<terms>\s*<term name="from">de</term>',
          '<locale xml:lang="es">\n    <terms>\n      <term name="from">de</term>\n      <term name="page-range-delimiter">–</term>\n      <term name="retrieved">recuperado el</term>', out, 1)
out = sub(r'<title>APA Style 7th edition</title>', '<title>APA 7.ª edición, adaptación al español (Mi Uni)</title>', out, 1)
out = sub(r'<id>http://www.zotero.org/styles/apa</id>', '<id>https://github.com/whoisarthur12/mi-uni/estilos/apa-es</id>', out, 1)
out = sub(r'<link href="http://www.zotero.org/styles/apa" rel="self"/>',
          '<link href="https://github.com/whoisarthur12/mi-uni/estilos/apa-es" rel="self"/>\n    <link href="http://www.zotero.org/styles/apa" rel="template"/>', out, 1)
out = sub(r'(<style [^>]*?)default-locale="[^"]*"', r'\1default-locale="es-ES"', out, 1) if 'default-locale=' in out else out.replace('<style ', '<style default-locale="es-ES" ', 1)
(d / 'apa-es.csl').write_text(out, encoding='utf-8')
print(f'apa-es.csl generado: {n_and} and="symbol" -> "text"')
