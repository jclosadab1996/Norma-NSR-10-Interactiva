/** Registro de calculadoras interactivas de todos los Títulos (se muestran en el hub y en cada capítulo). */
export type Calculadora = {
  id: string;
  /** Título al que pertenece ('a' | 'b'). */
  titulo: 'a' | 'b';
  nombre: string;
  descripcion: string;
  /** Capítulo de la norma donde se origina. */
  capitulo: string;
  /** Secciones principales de la norma en las que se basa. */
  secciones: string;
};

export const CALCULADORAS: readonly Calculadora[] = [
  {
    id: 'zona-amenaza',
    titulo: 'a',
    nombre: 'Zona de amenaza sísmica',
    descripcion: 'Clasifica un sitio en amenaza baja, intermedia o alta a partir de Aa y Av.',
    capitulo: 'a2',
    secciones: 'A.2.3',
  },
  {
    id: 'efectos-locales',
    titulo: 'a',
    nombre: 'Efectos locales: Fa, Fv e I',
    descripcion: 'Perfil de suelo, coeficientes de sitio con interpolación y coeficiente de importancia por grupo de uso.',
    capitulo: 'a2',
    secciones: 'A.2.4 · A.2.5',
  },
  {
    id: 'espectro-diseno',
    titulo: 'a',
    nombre: 'Espectro de diseño',
    descripcion: 'Sa, Sv y Sd en función del período, con T0, TC y TL y la gráfica del espectro.',
    capitulo: 'a2',
    secciones: 'A.2.6',
  },
  {
    id: 'coeficiente-r',
    titulo: 'a',
    nombre: 'Coeficiente de disipación R',
    descripcion: 'R = φa·φp·φr·R0: efecto de las irregularidades y la redundancia sobre las fuerzas de diseño.',
    capitulo: 'a3',
    secciones: 'A.3.3.3 · Tablas A.3-1 a A.3-7',
  },
  {
    id: 'periodo-fundamental',
    titulo: 'a',
    nombre: 'Período fundamental',
    descripcion: 'Ta = Ct·hn^α, límite Cu·Ta, alternativas para muros (Cw) y 0.1·N.',
    capitulo: 'a4',
    secciones: 'A.4.2',
  },
  {
    id: 'fuerza-horizontal',
    titulo: 'a',
    nombre: 'Fuerza horizontal equivalente',
    descripcion: 'Cortante basal Vs, exponente k y fuerzas Fx por piso con cortante acumulado.',
    capitulo: 'a4',
    secciones: 'A.4.3',
  },
  {
    id: 'deriva',
    titulo: 'a',
    nombre: 'Verificación de deriva',
    descripcion: 'Deriva por piso frente a los límites de la Tabla A.6.4-1 (y del umbral de daño).',
    capitulo: 'a6',
    secciones: 'A.6.3 · A.6.4',
  },
  {
    id: 'separacion-sismica',
    titulo: 'a',
    nombre: 'Separación sísmica entre edificaciones',
    descripcion: 'Separación mínima respecto al paramento del lote según la Tabla A.6.5-1.',
    capitulo: 'a6',
    secciones: 'A.6.5',
  },
  {
    id: 'umbral-dano',
    titulo: 'a',
    nombre: 'Espectro del umbral de daño',
    descripcion: 'Sad para edificaciones de los grupos de uso III y IV (2 % de amortiguamiento).',
    capitulo: 'a12',
    secciones: 'A.12.2 · A.12.3',
  },
  {
    id: 'municipios',
    titulo: 'a',
    nombre: 'Buscador de municipios',
    descripcion: 'Aa, Av, Ae, Ad y zona de amenaza sísmica de cada municipio de Colombia.',
    capitulo: 'apendice-a4',
    secciones: 'Apéndice A-4',
  },
  // ── Título B · Cargas ──────────────────────────────────────────────────────
  {
    id: 'combinaciones-carga',
    titulo: 'b',
    nombre: 'Combinaciones de carga',
    descripcion: 'Combinaciones del método de la resistencia y de los esfuerzos de trabajo a partir de D, L, Lr, G, W, E, H, F y T; identifica la gobernante.',
    capitulo: 'b2',
    secciones: 'B.2.3 · B.2.4',
  },
  {
    id: 'carga-muerta',
    titulo: 'b',
    nombre: 'Carga muerta de una placa',
    descripcion: 'Suma de peso propio, acabados, muros divisorios y fachada con los valores de las tablas de B.3, en kN/m².',
    capitulo: 'b3',
    secciones: 'B.3.2 · B.3.4',
  },
  {
    id: 'reduccion-carga-viva',
    titulo: 'b',
    nombre: 'Reducción de la carga viva',
    descripcion: 'Carga viva mínima por ocupación y su reducción por área aferente y por número de pisos, con la curva de reducción.',
    capitulo: 'b4',
    secciones: 'B.4.2 · B.4.5',
  },
  {
    id: 'empozamiento-granizo',
    titulo: 'b',
    nombre: 'Empozamiento de agua y granizo',
    descripcion: 'Carga de cubierta por empozamiento de agua y por granizo según B.4.8.',
    capitulo: 'b4',
    secciones: 'B.4.8',
  },
  {
    id: 'empuje-tierra',
    titulo: 'b',
    nombre: 'Empuje de tierra y presión hidrostática',
    descripcion: 'Diagrama de empuje lateral sobre un muro de sótano con sobrecarga y nivel freático.',
    capitulo: 'b5',
    secciones: 'B.5.1 · B.5.2',
  },
  {
    id: 'viento-simplificado',
    titulo: 'b',
    nombre: 'Viento: procedimiento simplificado',
    descripcion: 'Presiones de viento de diseño con el Método 1 (B.6.4) para edificios de baja altura.',
    capitulo: 'b6a',
    secciones: 'B.6.4',
  },
  {
    id: 'viento-exposicion',
    titulo: 'b',
    nombre: 'Viento: exposición y presión por velocidad',
    descripcion: 'Perfil del coeficiente Kz con la altura y presión por velocidad qz según categoría de exposición, topografía y velocidad básica.',
    capitulo: 'b6b',
    secciones: 'B.6.5.4 – B.6.5.10',
  },
  {
    id: 'viento-presion',
    titulo: 'b',
    nombre: 'Viento: presiones de diseño (Método 2)',
    descripcion: 'Presión de viento de diseño sobre las superficies de un edificio cerrado con el procedimiento analítico.',
    capitulo: 'b6c',
    secciones: 'B.6.5.11 · B.6.5.12',
  },
];

export const calculadoraPorId = (id: string) => CALCULADORAS.find((c) => c.id === id);
export const calculadorasDe = (titulo: 'a' | 'b') => CALCULADORAS.filter((c) => c.titulo === titulo);
