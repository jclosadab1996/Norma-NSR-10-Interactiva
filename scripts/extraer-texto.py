"""Extrae el texto de un Título de la NSR-10 a .cache/texto[-<titulo>]/pNNN.txt.

Uso (desde la raíz del proyecto):
  python -I scripts/extraer-texto.py                 # Título A (págs. PDF 43-218) -> .cache/texto
  python -I scripts/extraer-texto.py --titulo b      # Título B (págs. PDF 220-301) -> .cache/texto-b
  python -I scripts/extraer-texto.py --desde 303 --hasta 400 --salida .cache/texto-c

Requiere `pdftotext` (xpdf/poppler) en el PATH.
Equivalencia de páginas: PDF = página impresa "X-n" + desplazamiento (A: +43, B: +219).
"""
import argparse
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "Norma" / "Norma-Sismo-Resistente-NSR-10.pdf"

# Rango de páginas PDF por Título (inclusive) y carpeta de salida.
TITULOS = {
    "a": (43, 218, RAIZ / ".cache" / "texto"),
    "b": (220, 301, RAIZ / ".cache" / "texto-b"),
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--titulo", choices=sorted(TITULOS), default="a")
    ap.add_argument("--desde", type=int)
    ap.add_argument("--hasta", type=int)
    ap.add_argument("--salida")
    a = ap.parse_args()

    primera, ultima, salida = TITULOS[a.titulo]
    primera = a.desde or primera
    ultima = a.hasta or ultima
    salida = Path(a.salida) if a.salida else salida

    salida.mkdir(parents=True, exist_ok=True)
    for p in range(primera, ultima + 1):
        r = subprocess.run(
            ["pdftotext", "-enc", "UTF-8", "-layout", "-f", str(p), "-l", str(p), str(PDF), "-"],
            capture_output=True,
            check=True,
        )
        texto = r.stdout.decode("utf-8", "replace").replace("\r", "").replace("\f", "")
        (salida / f"p{p:03d}.txt").write_text(texto, encoding="utf-8")
    print(f"OK: {ultima - primera + 1} páginas en {salida}")


if __name__ == "__main__":
    main()
