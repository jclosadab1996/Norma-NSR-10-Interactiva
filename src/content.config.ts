import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const esquema = z.object({
    /** Código tal como aparece en la norma: "A.2", "B.6" o "A-4". */
    codigo: z.string(),
    tipo: z.enum(['capitulo', 'apendice']),
    titulo: z.string(),
    /** Resumen en 1–2 frases para tarjetas y metadescripción. */
    resumen: z.string(),
    /** Qué se aprende aquí (3–5 viñetas cortas). */
    objetivos: z.array(z.string()).default([]),
    /** Páginas impresas de la norma (p. ej. "A-1 a A-12"). */
    paginasNorma: z.string(),
    /** Página PDF inicial (PDF = impresa + 43 en el Título A, + 219 en el B, + 302 en el C). */
    paginaPdf: z.number().int(),
    orden: z.number().int(),
    /** Calculadoras relacionadas (ids de src/data/calculadoras.ts). */
    calculadoras: z.array(z.string()).default([]),
    /** Dificultad percibida para la ruta de aprendizaje. */
    nivel: z.enum(['basico', 'intermedio', 'avanzado']).default('intermedio'),
});

/**
 * Un archivo MDX por capítulo o apéndice de cada Título.
 * El `id` de cada entrada es el nombre del archivo sin extensión (a1, a2, … apendice-a1 …, b1, b2 …).
 */
const coleccionTitulo = (slug: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: `./src/content/${slug}` }),
    schema: esquema,
  });

export const collections = {
  'titulo-a': coleccionTitulo('titulo-a'),
  'titulo-b': coleccionTitulo('titulo-b'),
  'titulo-c': coleccionTitulo('titulo-c'),
};
