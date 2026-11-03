# NSR-10 Interactiva

Web educativa para detallar y entender más fácil el **Reglamento Colombiano de Construcción Sismo Resistente NSR-10**.
Por ahora desarrolla a fondo el **Título A** (requisitos generales de diseño y construcción sismo resistente): capítulos A.1 a
A.13, apéndices A-1 a A-4, ejemplos resueltos, tablas, ecuaciones, calculadoras interactivas, buscador de municipios y glosario.
Los Títulos B–K tienen su pestaña y quedan como «próximamente».

> Material didáctico, no oficial. No reemplaza el texto del Reglamento ni el criterio del profesional facultado.

## Stack
Astro 7 · React (islas) · MDX + KaTeX · Tailwind CSS v4 · shadcn/ui · Recharts · Vitest · Pagefind.

## Comandos
| Comando | Acción |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo (`http://localhost:4321`) |
| `npm run build` | Compila a `dist/` e indexa la búsqueda (Pagefind) |
| `npm run preview` | Sirve `dist/` (la búsqueda solo funciona aquí o en producción) |
| `npm run test` | Pruebas de la lógica de cálculo y de los datos transcritos |
| `npm run check` | Verificación de tipos (`astro check`) |

## Estructura
- `Norma/` — PDF oficial (fuera de `public/`, no se publica).
- `src/content/titulo-a/*.mdx` — un archivo por capítulo/apéndice (ver [`CONTENIDO.md`](CONTENIDO.md) para la guía de autoría).
- `src/lib/nsr10/` — lógica de cálculo pura (espectro, Fa/Fv, período, fuerza horizontal, deriva, umbral de daño…) con tests.
- `src/data/` — tablas transcritas del PDF (`tablas.ts`, `sistemasEstructurales.ts`, `municipios.json`, `glosario.ts`).
- `src/components/calc/` — calculadoras (islas React); `src/components/content/` — componentes de MDX.
- `scripts/` — utilidades de extracción del PDF (`extraer-texto.py`, `render-paginas.py`, `recortar-figura.py`,
  `parsear-municipios.py`). Requieren `pdftotext` y PyMuPDF; los resultados intermedios van a `.cache/` (ignorado por git).

## Fidelidad de los datos
Las tablas y ecuaciones se transcribieron del PDF y se verificaron visualmente contra la imagen de cada página; las pruebas de
Vitest fijan valores literales de la norma. Donde el PDF trae erratas o diferencias internas (por ejemplo algunos valores de
capitales entre las tablas de los capítulos y el Apéndice A-4), el sitio lo señala.
