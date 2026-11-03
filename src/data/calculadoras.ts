/** Registro de calculadoras interactivas del Título A (se muestran en el hub y en cada capítulo). */
export type Calculadora = {
  id: string;
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
    nombre: 'Zona de amenaza sísmica',
    descripcion: 'Clasifica un sitio en amenaza baja, intermedia o alta a partir de Aa y Av.',
    capitulo: 'a2',
    secciones: 'A.2.3',
  },
  {
    id: 'efectos-locales',
    nombre: 'Efectos locales: Fa, Fv e I',
    descripcion: 'Perfil de suelo, coeficientes de sitio con interpolación y coeficiente de importancia por grupo de uso.',
    capitulo: 'a2',
    secciones: 'A.2.4 · A.2.5',
  },
  {
    id: 'espectro-diseno',
    nombre: 'Espectro de diseño',
    descripcion: 'Sa, Sv y Sd en función del período, con T0, TC y TL y la gráfica del espectro.',
    capitulo: 'a2',
    secciones: 'A.2.6',
  },
  {
    id: 'coeficiente-r',
    nombre: 'Coeficiente de disipación R',
    descripcion: 'R = φa·φp·φr·R0: efecto de las irregularidades y la redundancia sobre las fuerzas de diseño.',
    capitulo: 'a3',
    secciones: 'A.3.3.3 · Tablas A.3-1 a A.3-7',
  },
  {
    id: 'periodo-fundamental',
    nombre: 'Período fundamental',
    descripcion: 'Ta = Ct·hn^α, límite Cu·Ta, alternativas para muros (Cw) y 0.1·N.',
    capitulo: 'a4',
    secciones: 'A.4.2',
  },
  {
    id: 'fuerza-horizontal',
    nombre: 'Fuerza horizontal equivalente',
    descripcion: 'Cortante basal Vs, exponente k y fuerzas Fx por piso con cortante acumulado.',
    capitulo: 'a4',
    secciones: 'A.4.3',
  },
  {
    id: 'deriva',
    nombre: 'Verificación de deriva',
    descripcion: 'Deriva por piso frente a los límites de la Tabla A.6.4-1 (y del umbral de daño).',
    capitulo: 'a6',
    secciones: 'A.6.3 · A.6.4',
  },
  {
    id: 'separacion-sismica',
    nombre: 'Separación sísmica entre edificaciones',
    descripcion: 'Separación mínima respecto al paramento del lote según la Tabla A.6.5-1.',
    capitulo: 'a6',
    secciones: 'A.6.5',
  },
  {
    id: 'umbral-dano',
    nombre: 'Espectro del umbral de daño',
    descripcion: 'Sad para edificaciones de los grupos de uso III y IV (2 % de amortiguamiento).',
    capitulo: 'a12',
    secciones: 'A.12.2 · A.12.3',
  },
  {
    id: 'municipios',
    nombre: 'Buscador de municipios',
    descripcion: 'Aa, Av, Ae, Ad y zona de amenaza sísmica de cada municipio de Colombia.',
    capitulo: 'apendice-a4',
    secciones: 'Apéndice A-4',
  },
];

export const calculadoraPorId = (id: string) => CALCULADORAS.find((c) => c.id === id);
