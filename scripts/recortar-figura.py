"""Recorta una figura/tabla de una página del PDF y la guarda como PNG en public/img/titulo-<letra>/ (por defecto titulo-a).

Uso:
  <python-con-pymupdf> scripts/recortar-figura.py <pagina_pdf> <nombre> [--titulo b] [--bbox x0 y0 x1 y1] [--zoom 2]

- <pagina_pdf>: página PDF (1-based).
- <nombre>: nombre de salida sin extensión (p. ej. figura-a2-3-2-mapa-aa).
- --bbox: recuadro como FRACCIONES de la página (0-1): x0 y0 x1 y1. Por defecto toda la página
  sin márgenes de encabezado/pie (0.04 0.06 0.96 0.94).
Primero renderiza la página con scripts/render-paginas.py para decidir el recuadro.
"""
import argparse
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "Norma" / "Norma-Sismo-Resistente-NSR-10.pdf"

ap = argparse.ArgumentParser()
ap.add_argument("pagina", type=int)
ap.add_argument("nombre")
ap.add_argument("--bbox", type=float, nargs=4, default=[0.04, 0.06, 0.96, 0.94])
ap.add_argument("--zoom", type=float, default=2.0)
ap.add_argument("--titulo", default="a", help="letra del Título (a, b, ...): carpeta public/img/titulo-<letra>")
a = ap.parse_args()
SALIDA = RAIZ / "public" / "img" / f"titulo-{a.titulo.lower()}"

SALIDA.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(PDF)
pagina = doc[a.pagina - 1]
r = pagina.rect
x0, y0, x1, y1 = a.bbox
clip = pymupdf.Rect(r.x0 + x0 * r.width, r.y0 + y0 * r.height, r.x0 + x1 * r.width, r.y0 + y1 * r.height)
pix = pagina.get_pixmap(matrix=pymupdf.Matrix(a.zoom, a.zoom), clip=clip)
destino = SALIDA / f"{a.nombre}.png"
pix.save(destino)
print(destino, f"{pix.width}x{pix.height}", f"{destino.stat().st_size // 1024} KB")
