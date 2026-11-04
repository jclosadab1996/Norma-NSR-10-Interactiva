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
