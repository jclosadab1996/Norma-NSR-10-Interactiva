# Guía de autoría — contenido de los Títulos A y B

Cada capítulo/apéndice es **un archivo MDX** en `src/content/titulo-a/`. El capítulo de referencia es
[`a2.mdx`](src/content/titulo-a/a2.mdx): léelo primero y sigue su estilo y estructura.

## Objetivo editorial
Explicar la NSR-10 en **español claro** para estudiantes y profesionales jóvenes, sin perder rigor: cada afirmación
técnica cita su sección (`<NormaRef s="A.4.2.1" pag="A-64" />`). El texto de la norma se **explica y reorganiza**; solo se
cita literal lo esencial (definiciones, umbrales, ecuaciones, tablas). Nada de inventar: si algo no está claro en el PDF, dilo.

## Fuentes y verificación
- Texto por página: `.cache/texto/pNNN.txt` (página PDF = página impresa "A-n" + 43). Las ecuaciones y tablas salen
  parcialmente rotas: **verifícalas contra la imagen** de la página.
- Imagen de página: `C:/Users/Juan Camilo Losada/AppData/Local/Temp/nsrv/Scripts/python.exe scripts/render-paginas.py <pág> [<pág_fin>] --zoom 2`
  → `.cache/img/pNNN.png` y ábrela con la herramienta Read.
- Figuras de la norma (mapas, esquemas): `... scripts/recortar-figura.py <pág> <nombre> --bbox x0 y0 x1 y1` →
  `public/img/titulo-a/<nombre>.png`; úsalas con `<Figura src="/img/titulo-a/<nombre>.png" ... />`.
- Cálculos: **usa `src/lib/nsr10`** (`sa`, `periodosEspectro`, `coeficienteFa`, `distribuirFuerzas`, `periodoAproximado`,
  `verificarDeriva`, `sad`, …) y los datos de `src/data/tablas.ts`, `src/data/sistemasEstructurales.ts` y
  `src/data/municipios.json` para que los números de los ejemplos nunca diverjan de las calculadoras. Si necesitas una
  función nueva, **no edites `src/lib/nsr10/index.ts`**: crea `src/lib/nsr10/<tema>.ts` con su `<tema>.test.ts` (Vitest) e
  impórtala directamente desde el MDX; avisa en tu reporte.

## Frontmatter (obligatorio, ver `src/content.config.ts`)
```yaml
---
codigo: 'A.4'                 # 'A.x' o 'A-n' para apéndices
tipo: capitulo                # capitulo | apendice
titulo: 'Método de la fuerza horizontal equivalente'
resumen: '1–2 frases para tarjetas y metadescripción.'
objetivos: ['3 a 5 viñetas “el lector podrá …”']
paginasNorma: 'A-63 a A-67'   # páginas impresas
paginaPdf: 106                # página PDF inicial
orden: 4                      # capítulos: 1..13 · apéndices: 14..17 (A-1→14, A-2→15, A-3→16, A-4→17)
calculadoras: ['periodo-fundamental', 'fuerza-horizontal']   # ids de src/data/calculadoras.ts
nivel: 'intermedio'           # basico | intermedio | avanzado
---
```
Nombre de archivo = id de la ruta: `a1.mdx … a13.mdx`, `apendice-a1.mdx … apendice-a4.mdx`.

## Estructura de cada capítulo
1. `## Idea central del capítulo` (qué problema resuelve, 3–6 líneas + callout "importante" si aplica).
2. Un `## A.x.y — Título` por cada sección relevante de la norma, en el mismo orden, con `###` para subsecciones
   cuando haga falta (los `##` y `###` alimentan el índice lateral). Incluye **todas** las secciones del capítulo; las
   administrativas o repetitivas pueden resumirse en pocas líneas, pero deben aparecer.
3. Tablas numéricas y ecuaciones **completas y verificadas** de la norma.
4. **≥ 1 ejemplo resuelto** (`<Ejemplo>`) con números reales y pasos citados; si el capítulo es cualitativo, un caso
   práctico paso a paso (decisiones, verificaciones, qué documento firma quién). Capítulos con cálculo: 2 o más.
5. Calculadora(s) relacionadas con `<CalculadoraEmbed id="…" />` si existen (ver `src/data/calculadoras.ts`).
6. `## Errores comunes` (`<Callout tipo="error">`) y `## Resumen en una línea`.
Longitud orientativa: capítulos densos (A.3, A.4, A.6, A.9, A.10) 350–700 líneas MDX; los cortos (A.7, A.8, A.11) 150–300.

## Componentes MDX disponibles (no hace falta importarlos)
| Componente | Uso |
|---|---|
| `<Callout tipo="nota\|importante\|atencion\|practica\|error" titulo="…">` | Recuadros. Texto en Markdown dentro. |
| `<NormaRef s="A.2.6" pag="A-27" />` | Chip en línea que cita sección/tabla/ecuación y página impresa. |
| `<TablaNorma numero="Tabla A.2.4-3" titulo="…" pag="A-23" nota="…">` + tabla Markdown (con línea en blanco antes y después) | Tabla transcrita. |
| `<Ecuacion num="A.4.3-1" titulo="…">` + `$$ … $$` + lista de variables | Ecuación numerada. |
| `<Ejemplo numero={1} titulo="…">` con `<Paso titulo="…" ref="A.4.2-3">` y `<Resultado>` | Ejemplo resuelto. |
| `<Detalle titulo="…">` | Bloque desplegable (comentarios, casos límite, listas largas). |
| `<Figura src="/img/titulo-a/x.png" alt="…" numero="Figura A.2.3-2" pie="…" pag="A-17" />` | Figura de la norma. |
| `<CalculadoraEmbed id="espectro-diseno" />` | Calculadora interactiva (isla React). |

## Reglas de sintaxis MDX/KaTeX (errores típicos que rompen el build)
- Matemáticas: `$…$` en línea y bloques `$$ … $$` en líneas propias. **No pongas expresiones JS `{…}` dentro de `$…$`/`$$`**:
  calcula en un `export const` al inicio y muestra el valor **fuera** de la fórmula (ver `a2.mdx`, "Resultado: …").
- Cálculos en MDX: tras el frontmatter pon `import { … } from '../../lib/nsr10';` y `export const ej = (() => {…})();`, luego
  `{ej.x.toFixed(3)}` en texto normal.
- En texto plano evita `<` y `{`/`}` sueltos: usa `≤`, `&lt;`, o `\{`. Comillas tipográficas permitidas.
- Los componentes de bloque con Markdown dentro necesitan **línea en blanco** después de la etiqueta de apertura y antes de la de cierre.
- Una tabla Markdown dentro de `<TablaNorma>` también va rodeada de líneas en blanco.
- Unidades del SI como la norma (kN, m, s); decimales con punto (como el PDF).

## Calidad y entrega
- Verifica `pnpm exec astro build` (sin errores) y `pnpm exec vitest run` (si añadiste tests) antes de reportar.
- No edites archivos fuera de tus capítulos/figuras/lib nuevo. No hagas commits.
- En tu reporte: lista de archivos, secciones cubiertas, **dudas/anomalías del PDF** (erratas, valores raros), calculadoras o
  funciones que echaste en falta, y qué verificaste visualmente.


---

# Título B (Cargas) — diferencias respecto al Título A

Gestor de paquetes: **pnpm** (`pnpm exec vitest run`, `pnpm exec astro build`; nunca `npm`/`npx`).

- Colección: `src/content/titulo-b/` (colección `titulo-b`, misma forma de frontmatter). Ids: `b1`, `b2`, `b3`, `b4`, `b5`, `b6a`, `b6b`, `b6c`
  (B.6 es muy largo y se divide en tres archivos: **b6a** = B.6.1–B.6.4, **b6b** = B.6.5.1–B.6.5.10, **b6c** = B.6.5.11 en adelante + B.6.6).
  `codigo` en el frontmatter: `B.1`…`B.5`, `B.6a`, `B.6b`, `B.6c` (la columna del sidebar es angosta). `tipo: capitulo`. `orden`: B.1=1 … B.5=5, b6a=6, b6b=7, b6c=8.
- **Páginas:** página PDF = página impresa "B-n" + **219** (B-1 = PDF 220; B-82 = PDF 301). `paginaPdf` y los `pag="B-n"` de los componentes usan estas reglas.
- **Texto por página:** `.cache/texto-b/pNNN.txt` (PDF 220–301). Regenerable con `python -I scripts/extraer-texto.py --titulo b`.
- **Imágenes de página** (verificación visual de tablas/ecuaciones): `C:/Users/Juan Camilo Losada/AppData/Local/Temp/nsrv/Scripts/python.exe scripts/render-paginas.py <pág> [<pág_fin>] --zoom 2` → `.cache/img/pNNN.png` (ábrelas con Read).
- **Figuras:** `.../python.exe scripts/recortar-figura.py <pág> <nombre> --titulo b --bbox x0 y0 x1 y1` → `public/img/titulo-b/<nombre>.png`; en MDX: `<Figura src="/img/titulo-b/<nombre>.png" … />`.
- **Mapa de páginas de B.6:** texto B.6.1–B.6.6 en PDF 240–257; figuras y tablas de B.6.4 en PDF 258–265; figuras B.6.5-1…19 en PDF ~266–297; Tablas B.6.5-1…4 en PDF 298–301.
- Las constantes/tablas van en `src/data/<tema>.ts` y la lógica pura en `src/lib/nsr10/<tema>.ts` (+ `<tema>.test.ts`). **No edites `src/lib/nsr10/index.ts`.**
- **Calculadoras de B** (ya registradas en `src/data/calculadoras.ts` y en `CalculadoraEmbed.astro`; hay *stubs* en `src/components/calc/`): cada agente **reemplaza el contenido del archivo stub que le corresponde** (mismo nombre, `export default function`), **sin editar** `calculadoras.ts`, `CalculadoraEmbed.astro` ni otros archivos compartidos. Reutiliza `components/calc/ui.tsx` (`useNum`, `Campo`, `Valor`, `Grupo`, `Aviso`, `PieCalc`…) y `components/ui/chart.tsx` + Recharts. Sigue el patrón de `EspectroDiseno.tsx` / `FuerzaHorizontal.tsx`.
- Los ejemplos y las calculadoras deben compartir las mismas funciones de `src/lib/nsr10`.
- No inventes valores: si una tabla o figura no se puede leer con certeza en la imagen, dilo en el reporte y no la incluyas como dato.

---

# Título C (Concreto estructural) — diferencias respecto a A y B

Mismas reglas que el Título B (pnpm; stubs de calculadoras; no editar archivos compartidos). Específico de C:

- **Colección** `src/content/titulo-c/`. Ids: `c1`…`c23` (codigo `C.n`, `tipo: capitulo`, `orden: n`) y apéndices `apendice-ca`…`apendice-cg` (codigo `C-A`…`C-G`, `tipo: apendice`, `orden` 24…30). Nombre de archivo = id (`c10.mdx`, `apendice-cd.mdx`).
- **Páginas:** página PDF = impresa "C-n" + **302** (C-1 = PDF 303). `paginaPdf` y los `pag="C-n"` usan estas reglas. Los apéndices siguen la numeración C-n (p. ej. Apéndice C-A empieza en C-223).
- **Texto por página:** `.cache/texto-c/pNNN.txt` (PDF 303–564). Imágenes: `.../python.exe scripts/render-paginas.py <pág> [<fin>] --zoom 2`. Figuras: `scripts/recortar-figura.py <pág> <nombre> --titulo c --bbox …` → `public/img/titulo-c/` y `<Figura src="/img/titulo-c/….png" …/>`.
- **Mapa de páginas (PDF):** C.1 303–306 · C.2 307–326 · C.3 327–336 · C.4 337–340 · C.5 341–348 · C.6 349–352 · C.7 353–362 · C.8 363–368 · C.9 369–376 · C.10 377–388 · C.11 389–408 · C.12 409–420 · C.13 421–438 · C.14 439–442 · C.15 443–448 · C.16 449–452 · C.17 453–454 · C.18 455–468 · C.19 469–472 · C.20 473–476 · C.21 477–502 · C.22 503–508 · C.23 509–524 · C-A 525–528 · C-B 529–532 · C-C 533–536 · C-D 537–550 · C-E 551–552 · C-F 553–560 · C-G 561–564.
- **Unidades:** el Título C usa SI (MPa, kN, m, mm). `f′c` se escribe `f'_c` en MDX/KaTeX como `f'_c`; los radicales de las ecuaciones **salen perdidos del texto extraído** (p. ej. `0.17λ fc′bwd` es `0.17 λ √f′c · b_w d`): verifica siempre contra la imagen. Los términos con `√f′c` deben respetar los límites del PDF (p. ej. √f′c ≤ 8.3 MPa en C.11.1.2).
- **Base compartida (no editar):** `src/lib/nsr10/concreto.ts` exporta `ES_ACERO_MPA`, `beta1(fc)`, `moduloElasticidad(fc, wc?)`, `moduloRotura(fc, lambda?)`, `lambdaConcreto(tipo)`, `lambdaPorHendimiento(fct, fc)`, `raizFcCortante(fc)`. Impórtalo en vez de reescribir esas ecuaciones. Si necesitas un helper común nuevo, ponlo en tu propio módulo `src/lib/nsr10/<tema>.ts`.
- **Calculadoras de C** (ya registradas en `src/data/calculadoras.ts` y en `CalculadoraEmbed.astro`; *stubs* en `src/components/calc/`; el agente dueño reemplaza el stub): `RecubrimientoDurabilidad` (c4), `ResistenciaPromedio` (c5), `DetallesRefuerzo` (c7), `PropiedadesConcreto` y `EspesorMinimo` (c9), `FlexionViga` y `ColumnaInteraccion` (c10), `CortanteViga` y `Punzonamiento` (c11), `LongitudDesarrollo` (c12), `LosaDosDirecciones` (c13), `ZapataDiseno` (c15), `PreesforzoEsfuerzos` (c18), `ConfinamientoColumna` (c21), `AnclajeConcreto` (apendice-cd). Si el PDF no permite construir una con seguridad, no la inventes: deja el stub y repórtalo.
- **Sidebar:** la columna de código es angosta; los códigos `C.10`, `C-A` caben.
- **Verificación:** `pnpm exec vitest run <tus tests>` y `pnpm exec astro build --outDir .cache/build-<tu-id>` (outDir propio). Errores en archivos de otros: ignóralos o reintenta.

---

# Título D (Mampostería estructural) — diferencias respecto a A, B y C

Mismas reglas que B y C (pnpm; stubs de calculadoras y de glosario; no editar archivos compartidos). Específico de D:

- **Colección** `src/content/titulo-d/`. Ids (nombre de archivo = id): `d1`, `d2`, `d3`, `d4a`, `d4b`, `d5a`, `d5b`, `d6`, `d7`, `d8`, `d9`, `d10a`, `d10b`, `d11`, `d12`, `apendice-d1`.
  `codigo`: `D.1`, `D.2`, `D.3`, `D.4a`, `D.4b`, `D.5a`, `D.5b`, `D.6`…`D.9`, `D.10a`, `D.10b`, `D.11`, `D.12`, `D-1` (apéndice, `tipo: apendice`). `orden`: 1…15 en el orden de la lista; el apéndice 16.
  División: **d4a** = D.4.0–D.4.3 (refuerzo y actividades preliminares), **d4b** = D.4.4–D.4.10 (construcción); **d5a** = D.5.0–D.5.4, **d5b** = D.5.5–D.5.8; **d10a** = D.10.0–D.10.6, **d10b** = D.10.7–D.10.8.
- **Páginas:** página PDF = impresa "D-n" + **565** (D-1 = PDF 566; D-74 = PDF 639). `paginaPdf` y los `pag="D-n"` usan estas reglas. El apéndice D-1 sigue la numeración (D-69 a D-74).
- **Texto por página:** `.cache/texto-d/pNNN.txt` (PDF 566–639; regenerable con `python -I scripts/extraer-texto.py --titulo d`). Imágenes: `C:/Users/Juan Camilo Losada/AppData/Local/Temp/nsrv/Scripts/python.exe scripts/render-paginas.py <pág> [<fin>] --zoom 2`. **Las ecuaciones salen fragmentadas (un símbolo por línea): reconstrúyelas siempre desde la imagen.**
- **Mapa de páginas (PDF):** D.1 566–569 · D.2 570–577 · D.3 578–585 · D.4 586–595 · D.5 596–607 · D.6 608–611 · D.7 612–613 · D.8 614–615 · D.9 616–617 · D.10 618–627 · D.11 628–629 · D.12 630–633 · Apéndice D-1 634–639. Tablas: D.3.4-1, D.3.5-1, D.3.6-1, D.3.7-1, D.4.2-1, D.4.2-2, D.4.6-1, D.5.4-1, D.5.8-1, D.5.8-2, D.5.8-3, D.10.3-1, D.11.1-1, D-1.5-1.
- **Figuras:** el PDF del Título D **no trae figuras** (solo tablas). Los gráficos son diagramas propios (SVG en línea o Recharts), con la leyenda «(esquema del proyecto)»; no uses `recortar-figura.py`. Ideas: tipos de mampostería (D.2.1), sección transformada, ancho efectivo, diagramas de interacción/esfuerzos, muro confinado con columnas y vigas.
- **Unidades:** SI (MPa, kN, m, mm). Símbolos: `f′m` se escribe `f'_m` en KaTeX (sin tildes dentro de `$…$`).
- **Glosario:** `src/data/glosarioD.ts` (+ `glosarioD.test.ts`) con TODAS las definiciones de D.2.5 y la notación de D.2.4; lo escribe el agente de d2 (hoy es un stub vacío). `GlosarioD.tsx` ya está cableado; los enlaces `§ D.n` usan `hrefSeccion` en `GlosarioBase.tsx` (ya mapea D.4/D.5/D.10 a sus dos páginas).
- **Calculadoras de D** (ya registradas en `src/data/calculadoras.ts` y en `CalculadoraEmbed.astro`; *stubs* en `src/components/calc/`; el agente dueño reemplaza el stub y **no edita** archivos compartidos): `FmMamposteria` (d3), `DesarrolloMamposteria` (d4a), `DimensionesEfectivas` (d5a), `AxialMamposteria`, `FlexionMamposteria`, `MuroFueraPlano` y `MuroEnPlano` (d5b), `CuantiasMamposteria` (d7; cubre D.6–D.9), `MuroConfinadoRefuerzo` (d10a), `MuroConfinadoResistencia` (d10b), `MuroDiafragma` (d11), `EsfuerzosAdmisiblesMamposteria` (apendice-d1). Si el PDF no permite construir una con seguridad, no la inventes: deja el stub y repórtalo. Ids de calculadora para el frontmatter `calculadoras`: `fm-mamposteria`, `desarrollo-mamposteria`, `dimensiones-efectivas`, `axial-mamposteria`, `flexion-mamposteria`, `muro-fuera-plano`, `muro-en-plano`, `cuantias-mamposteria`, `muro-confinado-refuerzo`, `muro-confinado-resistencia`, `muro-diafragma`, `esfuerzos-admisibles-mamposteria`.
- **Base compartida de D:** cada agente crea sus módulos `src/lib/nsr10/<tema>.ts` (+ `.test.ts`). `src/lib/nsr10/dimensionesMamposteria.ts` (d5a: espesor, altura y ancho efectivos, módulos E/G) y `src/lib/nsr10/mamposteria.ts` (d5b: φ, Po, Re, flexión, muros en y fuera del plano) los crean sus agentes dueños; los demás los importan **solo si ya existen** y nunca los editan.
- **Verificación:** `pnpm exec vitest run <tus tests>` y `pnpm exec astro build --outDir .cache/build-<tu-id>` (outDir propio). Errores en archivos de otros: ignóralos o reintenta.
