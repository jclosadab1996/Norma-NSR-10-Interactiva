/** Los once Títulos del Reglamento NSR-10 (Decreto 926 de 2010 y modificaciones). */
export type EstadoTitulo = 'disponible' | 'proximamente';

export type Titulo = {
  /** Letra del Título (A…K). */
  letra: string;
  /** Slug de ruta (`titulo-a`). */
  slug: string;
  nombre: string;
  /** Una línea para tarjetas y metadescripciones. */
  resumen: string;
  /** Prefijo de numeración interna, p. ej. "A-1". */
  paginasNorma: string;
  estado: EstadoTitulo;
  /** Clase tailwind (solo color de acento) para la tarjeta. */
  acento: string;
};

export const TITULOS: readonly Titulo[] = [
  {
    letra: 'A',
    slug: 'titulo-a',
    nombre: 'Requisitos generales de diseño y construcción sismo resistente',
    resumen: 'Amenaza sísmica, espectro de diseño, sistemas estructurales, fuerzas sísmicas, deriva, elementos no estructurales y evaluación de edificaciones existentes.',
    paginasNorma: 'A-1',
    estado: 'disponible',
    acento: 'text-primary',
  },
  {
    letra: 'B',
    slug: 'titulo-b',
    nombre: 'Cargas',
    resumen: 'Cargas muertas, vivas, de viento, empuje de tierra y combinaciones de carga.',
    paginasNorma: 'B-1',
    estado: 'proximamente',
    acento: 'text-chart-2',
  },
  {
    letra: 'C',
    slug: 'titulo-c',
    nombre: 'Concreto estructural',
    resumen: 'Diseño y construcción de estructuras de concreto reforzado, preesforzado y simple.',
    paginasNorma: 'C-1',
    estado: 'proximamente',
    acento: 'text-chart-3',
  },
  {
    letra: 'D',
    slug: 'titulo-d',
    nombre: 'Mampostería estructural',
    resumen: 'Requisitos de diseño y construcción para mampostería estructural.',
    paginasNorma: 'D-1',
    estado: 'proximamente',
    acento: 'text-chart-4',
  },
  {
    letra: 'E',
    slug: 'titulo-e',
    nombre: 'Casas de uno y dos pisos',
    resumen: 'Requisitos simplificados para vivienda de uno y dos pisos.',
    paginasNorma: 'E-1',
    estado: 'proximamente',
    acento: 'text-chart-5',
  },
  {
    letra: 'F',
    slug: 'titulo-f',
    nombre: 'Estructuras metálicas',
    resumen: 'Diseño y construcción de estructuras de acero estructural.',
    paginasNorma: 'F-1',
    estado: 'proximamente',
    acento: 'text-chart-1',
  },
  {
    letra: 'G',
    slug: 'titulo-g',
    nombre: 'Estructuras de madera y estructuras de guadua',
    resumen: 'Diseño y construcción con madera y guadua.',
    paginasNorma: 'G-1',
    estado: 'proximamente',
    acento: 'text-chart-2',
  },
  {
    letra: 'H',
    slug: 'titulo-h',
    nombre: 'Estudios geotécnicos',
    resumen: 'Exploración del subsuelo, cimentaciones y obras de contención.',
    paginasNorma: 'H-1',
    estado: 'proximamente',
    acento: 'text-chart-3',
  },
  {
    letra: 'I',
    slug: 'titulo-i',
    nombre: 'Supervisión técnica',
    resumen: 'Supervisión técnica de la construcción de edificaciones.',
    paginasNorma: 'I-1',
    estado: 'proximamente',
    acento: 'text-chart-4',
  },
  {
    letra: 'J',
    slug: 'titulo-j',
    nombre: 'Requisitos de protección contra incendios en edificaciones',
    resumen: 'Resistencia al fuego y medios de evacuación.',
    paginasNorma: 'J-1',
    estado: 'proximamente',
    acento: 'text-chart-5',
  },
  {
    letra: 'K',
    slug: 'titulo-k',
    nombre: 'Requisitos complementarios',
    resumen: 'Requisitos arquitectónicos y de seguridad complementarios.',
    paginasNorma: 'K-1',
    estado: 'proximamente',
    acento: 'text-chart-1',
  },
];

export const TITULO_A = TITULOS[0];
