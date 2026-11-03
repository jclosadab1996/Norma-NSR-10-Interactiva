"""Extrae del Apéndice A-4 de la NSR-10 (PDF págs. 197-218) la tabla de municipios.

Uso:  <python-con-pymupdf> scripts/parsear-municipios.py
Salida: src/data/municipios.json

Método: se usan las coordenadas de las palabras (page.get_text("words")). En el PDF las
columnas de cada fila comparten la misma coordenada Y (centro vertical), aunque
`pdftotext -layout` las desordene. Para cada código DANE (5 dígitos, x≈250) se toman
las palabras de la misma fila: nombre (x < código), Aa, Av, zona, Ae, Ad (x > código).
Los encabezados "Departamento de X" asignan el departamento a las filas siguientes
(en orden de lectura página/Y). Los encabezados de columnas repetidos se ignoran.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "Norma" / "Norma-Sismo-Resistente-NSR-10.pdf"
SALIDA = RAIZ / "src" / "data" / "municipios.json"
PAG_INI, PAG_FIN = 197, 218  # 1-based
TOL_Y = 3.0

doc = pymupdf.open(PDF)
registros = []
depto = None
anomalias = []

for pn in range(PAG_INI, PAG_FIN + 1):
    ws = [w for w in doc[pn - 1].get_text("words") if 50 < w[1] < 750]
    ws = [(w[0], w[1], w[2], w[3], w[4], (w[1] + w[3]) / 2) for w in ws]
    # líneas por Y
    ws.sort(key=lambda w: (w[5], w[0]))
    lineas = []
    for w in ws:
        if lineas and abs(lineas[-1][0] - w[5]) <= TOL_Y:
            lineas[-1][1].append(w)
        else:
            lineas.append([w[5], [w]])
    for y, pals in lineas:
        pals.sort(key=lambda w: w[0])
        texto = " ".join(p[4] for p in pals)
        m = re.match(r"Departamento (?:de la|del|de) (.+)$", texto)
        if m:
            depto = m.group(1).strip()
            depto = "La Guajira" if depto.lower() == "guajira" else depto
            continue
        if texto == "Distrito Capital":
            depto = "Bogotá D.C."
            continue
        if texto.startswith("Archipiélago de San Andrés"):
            depto = "San Andrés, Providencia y Santa Catalina"
            continue
        codigos = [p for p in pals if re.fullmatch(r"\d{5}", p[4]) and 240 < p[0] < 260]
        if not codigos:
            continue
        c = codigos[0]
        nombre = " ".join(p[4] for p in pals if p[2] < c[0] - 2)
        resto = [p[4] for p in pals if p[0] > c[2]]
        if len(resto) != 5 or depto is None:
            anomalias.append((pn, texto))
            continue
        aa, av, zona, ae, ad = resto
        registros.append({
            "departamento": depto, "municipio": nombre, "codigo": c[4],
            "aa": float(aa), "av": float(av), "zona": zona,
            "ae": float(ae), "ad": float(ad),
        })

# Bogotá D.C. aparece dos veces (tabla de Cundinamarca y "Distrito Capital"): se conserva
# el registro bajo "Bogotá D.C." tras verificar que los valores son idénticos.
vistos = {}
unicos = []
for r in registros:
    k = r["codigo"]
    if k in vistos:
        a = vistos[k]
        if {x: a[x] for x in a if x != "departamento"} != {x: r[x] for x in r if x != "departamento"}:
            print("DUPLICADO CON VALORES DISTINTOS", a, r, file=sys.stderr)
        else:
            print(f"Duplicado idéntico descartado: {k} {r['municipio']} ({a['departamento']} / {r['departamento']})")
        if r["departamento"] == "Bogotá D.C.":
            unicos[unicos.index(a)] = r
            vistos[k] = r
        continue
    vistos[k] = r
    unicos.append(r)
registros = unicos

def _clave(texto):
    """Orden alfabético en español: sin tildes y sin distinguir mayúsculas."""
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower()


registros.sort(key=lambda r: (_clave(r["departamento"]), r["codigo"]))
SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(json.dumps(registros, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(registros)} registros -> {SALIDA}")
for a in anomalias:
    print("ANOMALIA", a, file=sys.stderr)
