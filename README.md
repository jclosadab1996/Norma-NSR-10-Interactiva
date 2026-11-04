# NSR-10 Interactiva

Web educativa para detallar y entender más fácil el **Reglamento Colombiano de Construcción Sismo Resistente NSR-10**.
Por ahora desarrolla a fondo tres Títulos, cada uno con capítulos explicados, ejemplos resueltos, tablas y ecuaciones
verificadas contra el PDF, calculadoras interactivas y glosario:

- **Título A** — requisitos generales de diseño y construcción sismo resistente (A.1 a A.13, apéndices A-1 a A-4, buscador de municipios).
- **Título B** — cargas (B.1 a B.6: combinaciones, cargas muertas y vivas, empuje de tierra y viento).
- **Título C** — concreto estructural (C.1 a C.23 y apéndices C-A a C-G; C.11, C.21 y B.6 se dividen en varias páginas).

Los Títulos D–K tienen su pestaña y quedan como «próximamente».

> Material didáctico, no oficial. No reemplaza el texto del Reglamento ni el criterio del profesional facultado.

## Stack
Astro 7 · React (islas) · MDX + KaTeX · Tailwind CSS v4 · shadcn/ui · Recharts · Vitest · Pagefind.

## Comandos
| Comando | Acción |
|---|---|
| `pnpm install` | Instala dependencias |
| `pnpm dev` | Servidor de desarrollo (`http://localhost:4321`) |
| `pnpm build` | Compila a `dist/` e indexa la búsqueda (Pagefind) |
| `pnpm preview` | Sirve `dist/` (la búsqueda solo funciona aquí o en producción) |
| `pnpm test` | Pruebas de la lógica de cálculo y de los datos transcritos |
| `pnpm check` | Verificación de tipos (`astro check`) |

## Estructura
- `Norma/` — PDF oficial (fuera de `public/`, no se publica).
- `src/content/titulo-{a,b,c}/*.mdx` — un archivo por capítulo/apéndice (ver [`CONTENIDO.md`](CONTENIDO.md) para la guía de autoría).
- `src/lib/nsr10/` — lógica de cálculo pura (espectro, Fa/Fv, período, fuerza horizontal, deriva, umbral de daño…) con tests.
- `src/data/` — tablas transcritas del PDF (`tablas.ts`, `sistemasEstructurales.ts`, `municipios.json`, `glosario*.ts`, `cargas*.ts`, `viento*.ts`, `durabilidad.ts`, `anclajes.ts`…).
- `src/components/calc/` — calculadoras (islas React); `src/components/content/` — componentes de MDX.
- `scripts/` — utilidades de extracción del PDF (`extraer-texto.py`, `render-paginas.py`, `recortar-figura.py`,
  `parsear-municipios.py`). Requieren `pdftotext` y PyMuPDF; los resultados intermedios van a `.cache/` (ignorado por git).

## Fidelidad de los datos
Las tablas y ecuaciones se transcribieron del PDF y se verificaron visualmente contra la imagen de cada página; las pruebas de
Vitest fijan valores literales de la norma. Donde el PDF trae erratas o diferencias internas (por ejemplo algunos valores de
capitales entre las tablas de los capítulos y el Apéndice A-4), el sitio lo señala.
