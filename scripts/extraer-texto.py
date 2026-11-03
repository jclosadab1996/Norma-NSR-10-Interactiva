"""Extrae el texto del Título A de la NSR-10 (págs. PDF 43-218) a .cache/texto/pNNN.txt.

Uso (desde la raíz del proyecto):  python -I scripts/extraer-texto.py
Requiere `pdftotext` (xpdf/poppler) en el PATH.
"""
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "Norma" / "Norma-Sismo-Resistente-NSR-10.pdf"
SALIDA = RAIZ / ".cache" / "texto"
PRIMERA, ULTIMA = 43, 218


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for p in range(PRIMERA, ULTIMA + 1):
        r = subprocess.run(
            ["pdftotext", "-enc", "UTF-8", "-layout", "-f", str(p), "-l", str(p), str(PDF), "-"],
            capture_output=True,
            check=True,
        )
        texto = r.stdout.decode("utf-8", "replace").replace("\r", "").replace("\f", "")
        (SALIDA / f"p{p:03d}.txt").write_text(texto, encoding="utf-8")
    print(f"OK: {ULTIMA - PRIMERA + 1} páginas en {SALIDA}")


if __name__ == "__main__":
    main()
