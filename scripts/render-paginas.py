"""Renderiza páginas del PDF a PNG para verificación visual o para recortar figuras.

Uso:  <python-con-pymupdf> scripts/render-paginas.py <pagina_inicio> [<pagina_fin>] [--zoom 2] [--out .cache/img]
Las páginas son las del PDF (1-based). Salida: <out>/pNNN.png
"""
import argparse
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "Norma" / "Norma-Sismo-Resistente-NSR-10.pdf"

ap = argparse.ArgumentParser()
ap.add_argument("inicio", type=int)
ap.add_argument("fin", type=int, nargs="?")
ap.add_argument("--zoom", type=float, default=1.6)
ap.add_argument("--out", default=str(RAIZ / ".cache" / "img"))
a = ap.parse_args()

out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(PDF)
for p in range(a.inicio, (a.fin or a.inicio) + 1):
    pix = doc[p - 1].get_pixmap(matrix=pymupdf.Matrix(a.zoom, a.zoom))
    destino = out / f"p{p:03d}.png"
    pix.save(destino)
    print(destino)
