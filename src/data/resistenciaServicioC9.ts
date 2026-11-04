/**
 * Título C — Capítulo C.9: Requisitos de resistencia y funcionamiento.
 * Datos transcritos del PDF (páginas PDF 369–375, impresas C-67 a C-73; PDF = impresa + 302),
 * verificados contra la imagen de cada página.
 */

/* ───────────────────────── C.9.2.1 — Resistencia requerida (PDF p.369, C-67) ───────────────────────── */

export type CargaC9 = 'D' | 'L' | 'Lr' | 'G' | 'Le' | 'W' | 'E' | 'F' | 'H' | 'T';

export type EcuacionU = {
  /** Número de ecuación de la norma, p. ej. "C.9-3". */
  id: string;
  /** Texto de la ecuación tal como aparece en la norma. */
  texto: string;
  /** Página impresa. */
  pag: string;
};

/** PDF p.369 (C-67): U = … Ecuaciones C.9-1 a C.9-7 (idénticas a B.2.4-1 a B.2.4-7). */
export const ECUACIONES_U: readonly EcuacionU[] = [
  { id: 'C.9-1', texto: '1.4(D + F)', pag: 'C-67' },
  { id: 'C.9-2', texto: '1.2(D + F + T) + 1.6(L + H) + 0.5(Lr ó G ó Le)', pag: 'C-67' },
  { id: 'C.9-3', texto: '1.2D + 1.6(Lr ó G ó Le) + (1.0L ó 0.8W)', pag: 'C-67' },
  { id: 'C.9-4', texto: '1.2D + 1.6W + 1.0L + 0.5(Lr ó G ó Le)', pag: 'C-67' },
  { id: 'C.9-5', texto: '1.2D + 1.0E + 1.0L', pag: 'C-67' },
  { id: 'C.9-6', texto: '0.9D + 1.6W + 1.6H', pag: 'C-67' },
  { id: 'C.9-7', texto: '0.9D + 1.0E + 1.6H', pag: 'C-67' },
];

/** C.9.2.1(a) (PDF p.369, C-67): no se permite reducir L a 0.5 si L0 supera 4.8 kN/m². */
export const L0_LIMITE_REDUCCION_L = 4.8;

/** C.9.2.4 (PDF p.370, C-68): factor sobre la fuerza máxima del gato en zonas de anclaje de postensado. */
export const FACTOR_ANCLAJE_POSTENSADO = 1.2;

/* ───────────────────────── C.9.3 — Factores de reducción de resistencia φ (PDF p.370–371, C-68/C-69) ───────────────────────── */

export type FilaPhi = {
  /** Numeral de la norma. */
  seccion: string;
  /** Solicitación o caso. */
  caso: string;
  /** Valor de φ; para los casos con variación lineal, el valor inicial. */
  phi: number;
  /** Valor final cuando φ varía linealmente (p. ej. 0.90). */
  phiFinal?: number;
  pag: string;
};

/** PDF p.370–371 (C-68, C-69): coeficientes φ de C.9.3.2 a C.9.3.5. */
export const TABLA_PHI: readonly FilaPhi[] = [
  { seccion: 'C.9.3.2.1', caso: 'Secciones controladas por tracción (C.10.3.4)', phi: 0.9, pag: 'C-68' },
  { seccion: 'C.9.3.2.2(a)', caso: 'Secciones controladas por compresión: elementos con refuerzo en espiral (C.10.9.3)', phi: 0.75, pag: 'C-68' },
  { seccion: 'C.9.3.2.2(b)', caso: 'Secciones controladas por compresión: otros elementos reforzados', phi: 0.65, pag: 'C-68' },
  { seccion: 'C.9.3.2.3', caso: 'Cortante y torsión', phi: 0.75, pag: 'C-68' },
  { seccion: 'C.9.3.2.4', caso: 'Aplastamiento en el concreto (excepto anclajes de postensado y modelos puntal-tensor)', phi: 0.65, pag: 'C-68' },
  { seccion: 'C.9.3.2.5', caso: 'Zonas de anclaje de postensado', phi: 0.85, pag: 'C-68' },
  { seccion: 'C.9.3.2.6', caso: 'Modelos puntal-tensor (Apéndice C-A): puntales, tensores, zonas de nodos y áreas de apoyo', phi: 0.75, pag: 'C-69' },
  { seccion: 'C.9.3.2.7(a)', caso: 'Flexión en elementos pretensados: del extremo del elemento al fin de la longitud de transferencia', phi: 0.75, pag: 'C-69' },
  { seccion: 'C.9.3.2.7(b)', caso: 'Flexión en elementos pretensados: del fin de la longitud de transferencia al fin de la longitud de desarrollo (aumenta linealmente)', phi: 0.75, phiFinal: 0.9, pag: 'C-69' },
  { seccion: 'C.9.3.4(a)', caso: 'DMO o DES con muros o pórticos para E: cortante si la resistencia nominal a cortante es menor que el cortante asociado a la resistencia nominal a flexión', phi: 0.6, pag: 'C-69' },
  { seccion: 'C.9.3.4(c)', caso: 'DMO o DES: cortante en nudos y vigas de acople reforzadas en diagonal', phi: 0.85, pag: 'C-69' },
  { seccion: 'C.9.3.5', caso: 'Concreto estructural simple (C.22): flexión, compresión, cortante y aplastamiento', phi: 0.6, pag: 'C-69' },
];

/** φ de secciones controladas por tracción (C.9.3.2.1, C-68). */
export const PHI_TRACCION = 0.9;
/** φ de secciones controladas por compresión con refuerzo en espiral (C.9.3.2.2(a), C-68). */
export const PHI_COMPRESION_ESPIRAL = 0.75;
/** φ de secciones controladas por compresión, otros elementos reforzados (C.9.3.2.2(b), C-68). */
export const PHI_COMPRESION_OTROS = 0.65;
/** φ de cortante y torsión (C.9.3.2.3, C-68). */
export const PHI_CORTANTE_TORSION = 0.75;
/** φ de aplastamiento en el concreto (C.9.3.2.4, C-68). */
export const PHI_APLASTAMIENTO = 0.65;
/** φ de zonas de anclaje de postensado (C.9.3.2.5, C-68). */
export const PHI_ANCLAJE_POSTENSADO = 0.85;
/** φ de modelos puntal-tensor (C.9.3.2.6, C-69). */
export const PHI_PUNTAL_TENSOR = 0.75;
/** φ de cortante en DMO/DES cuando Vn < Ve asociado a Mn (C.9.3.4(a), C-69). */
export const PHI_CORTANTE_SISMICO_DEFICIENTE = 0.6;
/** φ de cortante en nudos y vigas de acople reforzadas en diagonal, DMO/DES (C.9.3.4(c), C-69). */
export const PHI_NUDOS_Y_ACOPLE = 0.85;
/** φ del concreto estructural simple (C.9.3.5, C-69). */
export const PHI_CONCRETO_SIMPLE = 0.6;

/** εt a partir del cual la sección es controlada por tracción (C.10.3.4, PDF p.378, C-76; remisión de C.9.3.2). */
export const EPSILON_T_TRACCION = 0.005;
/** Límite de deformación controlada por compresión permitido para refuerzo Grado 420 y todo preesforzado (C.10.3.3, PDF p.378, C-76). */
export const EPSILON_LIMITE_COMPRESION_420 = 0.002;
/** Deformación unitaria última supuesta del concreto en compresión (C.10.2, PDF p.377–378). */
export const EPSILON_CU = 0.003;

/** C.9.4 (PDF p.371, C-69): fy y fyt de diseño no deben exceder este valor (MPa), salvo preesforzado y espirales de C.10.9.3 y C.21.1.5.4. */
export const FY_MAX_DISENO_MPA = 550;

/* ───────────────────────── C.9.5.2 — Tabla C.9.5(a) (PDF p.372, C-70) ───────────────────────── */

export type ElementoUnaDireccion = 'losa-maciza' | 'viga-nervada';
export type ApoyoUnaDireccion = 'simple' | 'un-extremo' | 'ambos-extremos' | 'voladizo';

/** Etiquetas de los apoyos de la Tabla C.9.5(a). */
export const APOYOS_C95A: Record<ApoyoUnaDireccion, string> = {
  simple: 'Simplemente apoyados',
  'un-extremo': 'Con un extremo continuo',
  'ambos-extremos': 'Ambos extremos continuos',
  voladizo: 'En voladizo',
};

export const ELEMENTOS_C95A: Record<ElementoUnaDireccion, string> = {
  'losa-maciza': 'Losas macizas en una dirección',
  'viga-nervada': 'Vigas o losas nervadas en una dirección',
};

/**
 * PDF p.372 (C-70): Tabla C.9.5(a). h mínimo = ℓ / divisor, para concreto de peso normal y refuerzo grado 420 MPa,
 * elementos que NO soportan ni están ligados a divisiones u otros elementos susceptibles de dañarse por deflexiones grandes.
 */
export const TABLA_C95A: Record<ElementoUnaDireccion, Record<ApoyoUnaDireccion, number>> = {
  'losa-maciza': { simple: 20, 'un-extremo': 24, 'ambos-extremos': 28, voladizo: 10 },
  'viga-nervada': { simple: 16, 'un-extremo': 18.5, 'ambos-extremos': 21, voladizo: 8 },
};

/** Nota (b) de la Tabla C.9.5(a): fy ≠ 420 MPa multiplica por (0.4 + fy/700). */
export const FY_REF_C95A = 420;
/** Nota (a): concreto liviano estructural 1440 ≤ wc ≤ 1840 kg/m³ multiplica por (1.65 − 0.0003 wc), no menos de 1.09. */
export const WC_LIVIANO_MIN = 1440;
export const WC_LIVIANO_MAX = 1840;
export const FACTOR_LIVIANO_MIN = 1.09;

/* ───────────────────────── C.9.5.2.5 — ξ (PDF p.372, C-70) ───────────────────────── */

export type DuracionCarga = 3 | 6 | 12 | 60;

/** Factor dependiente del tiempo ξ para cargas sostenidas; 60 meses = "5 años o más". */
export const TABLA_XI: readonly { meses: DuracionCarga; etiqueta: string; xi: number }[] = [
  { meses: 3, etiqueta: '3 meses', xi: 1.0 },
  { meses: 6, etiqueta: '6 meses', xi: 1.2 },
  { meses: 12, etiqueta: '12 meses', xi: 1.4 },
  { meses: 60, etiqueta: '5 años o más', xi: 2.0 },
];

/* ───────────────────────── Tabla C.9.5(b) (PDF p.373, C-71) ───────────────────────── */

export type TipoElementoDeflexion = 'cubierta-plana' | 'entrepiso' | 'susceptibles' | 'no-susceptibles';

export type FilaC95b = {
  id: TipoElementoDeflexion;
  elemento: string;
  deflexion: string;
  /** Límite = ℓ / divisor. */
  divisor: number;
  /** Nota a pie de la tabla que aplica a esa fila. */
  notaMarca: '*' | '‡' | '§' | '';
};

/** PDF p.373 (C-71): Tabla C.9.5(b) — Deflexión máxima admisible calculada. */
export const TABLA_C95B: readonly FilaC95b[] = [
  {
    id: 'cubierta-plana',
    elemento: 'Cubiertas planas que no soporten ni estén ligadas a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes',
    deflexion: 'Deflexión inmediata debida a la carga viva, L',
    divisor: 180,
    notaMarca: '*',
  },
  {
    id: 'entrepiso',
    elemento: 'Entrepisos que no soporten ni estén ligados a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes',
    deflexion: 'Deflexión inmediata debida a la carga viva, L',
    divisor: 360,
    notaMarca: '',
  },
  {
    id: 'susceptibles',
    elemento: 'Sistema de entrepiso o cubierta que soporte o esté ligado a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes',
    deflexion:
      'La parte de la deflexión total que ocurre después de la unión de los elementos no estructurales (la suma de la deflexión a largo plazo debida a todas las cargas permanentes, y la deflexión inmediata debida a cualquier carga viva adicional)†',
    divisor: 480,
    notaMarca: '‡',
  },
  {
    id: 'no-susceptibles',
    elemento: 'Sistema de entrepiso o cubierta que soporte o esté ligado a elementos no estructurales no susceptibles de sufrir daños debido a deflexiones grandes',
    deflexion: 'La misma deflexión de la fila anterior (celda combinada en la norma)†',
    divisor: 240,
    notaMarca: '§',
  },
];

/** Notas al pie de la Tabla C.9.5(b), PDF p.373 (C-71). */
export const NOTAS_C95B: Record<string, string> = {
  '*': 'Este límite no tiene por objeto constituirse en un resguardo contra el empozamiento de aguas. Este último se debe verificar mediante cálculos de deflexiones adecuados, incluyendo las deflexiones debidas al agua estancada, y considerando los efectos a largo plazo de todas las cargas permanentes, la contraflecha, las tolerancias de construcción y la confiabilidad en las medidas tomadas para el drenaje.',
  '†': 'Las deflexiones a largo plazo deben determinarse de acuerdo con C.9.5.2.5 ó C.9.5.4.3, pero se pueden reducir en la cantidad de deflexión calculada que ocurra antes de unir los elementos no estructurales. Esta cantidad se determina basándose en datos de ingeniería aceptables correspondiente a las características tiempo-deflexión de elementos similares a los que se están considerando.',
  '‡': 'Este límite se puede exceder si se toman medidas adecuadas para prevenir daños en elementos apoyados o unidos.',
  '§': 'Pero no mayor que la tolerancia establecida para los elementos no estructurales. Este límite se puede exceder si se proporciona una contraflecha de modo que la deflexión total menos la contraflecha no exceda dicho límite.',
};

/* ───────────────────────── C.9.5.3 — losas en dos direcciones (PDF p.373–374, C-71/C-72) ───────────────────────── */

/** C.9.5.3.2(a) y (b) (PDF p.373, C-71): espesores mínimos absolutos de losas sin vigas interiores (mm). */
export const H_MIN_SIN_ABACO_MM = 125;
export const H_MIN_CON_ABACO_MM = 100;
/** C.9.5.3.3(b) (C-71): h ≥ 125 mm con la Ec. C.9-12. C.9.5.3.3(c): h ≥ 90 mm con la Ec. C.9-13. */
export const H_MIN_C912_MM = 125;
export const H_MIN_C913_MM = 90;
/** C.9.5.3.3(d) (PDF p.374, C-72): αf mínimo de la viga de borde, o aumento mínimo de h (10 %) en el panel con borde discontinuo. */
export const ALFA_F_VIGA_BORDE_MIN = 0.8;
export const AUMENTO_BORDE_DISCONTINUO = 0.1;

export type PanelC95c = 'ext-sin-borde' | 'ext-con-borde' | 'interior';
export type ConAbaco = 'sin-abaco' | 'con-abaco';

export type FilaC95c = {
  /** fy en MPa. */
  fy: number;
  /** Divisor de ℓn para cada tipo de panel, sin ábacos / con ábacos. */
  valores: Record<ConAbaco, Record<PanelC95c, number>>;
};

/**
 * PDF p.374 (C-72): Tabla C.9.5(c) — Espesores mínimos de losas sin vigas interiores. h = ℓn / divisor.
 * Para fy intermedio se interpola linealmente (nota † de la tabla).
 */
export const TABLA_C95C: readonly FilaC95c[] = [
  {
    fy: 280,
    valores: {
      'sin-abaco': { 'ext-sin-borde': 33, 'ext-con-borde': 36, interior: 36 },
      'con-abaco': { 'ext-sin-borde': 36, 'ext-con-borde': 40, interior: 40 },
    },
  },
  {
    fy: 420,
    valores: {
      'sin-abaco': { 'ext-sin-borde': 30, 'ext-con-borde': 33, interior: 33 },
      'con-abaco': { 'ext-sin-borde': 33, 'ext-con-borde': 36, interior: 36 },
    },
  },
  {
    fy: 520,
    valores: {
      'sin-abaco': { 'ext-sin-borde': 28, 'ext-con-borde': 31, interior: 31 },
      'con-abaco': { 'ext-sin-borde': 31, 'ext-con-borde': 34, interior: 34 },
    },
  },
];

export const PANELES_C95C: Record<PanelC95c, string> = {
  'ext-sin-borde': 'Panel exterior, sin vigas de borde',
  'ext-con-borde': 'Panel exterior, con vigas de borde',
  interior: 'Panel interior',
};
