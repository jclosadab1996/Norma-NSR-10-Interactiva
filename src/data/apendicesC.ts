/**
 * Título C — Apéndices C-A, C-B, C-C y C-E de la NSR-10 (transcritos del PDF y verificados contra la imagen de cada página).
 * Página PDF = página impresa "C-n" + 302.
 *
 *   Apéndice C-A  Modelos puntal-tensor ................................ PDF p.525–528 (C-223 a C-226)
 *   Apéndice C-B  Disposiciones alternativas (flexión y compresión) .... PDF p.529–532 (C-227 a C-230)
 *   Apéndice C-C  Factores de carga y reducción de resistencia alt. .... PDF p.533–536 (C-231 a C-234)
 *   Apéndice C-E  Información acerca del acero de refuerzo ............. PDF p.551–552 (C-249 y C-250)
 *
 * Lo que NO es texto de la norma se marca "(auxiliar)".
 * Las barras de las Tablas C.3.5.3-1 y C.3.5.3-2 (idénticas a las del Capítulo C.3) se reexportan desde
 * `materialesConcreto.ts` para que exista una sola fuente.
 */
import { BARRAS_METRICAS, BARRAS_PULGADA, buscarBarra, type BarraMetrica, type BarraPulgada } from './materialesConcreto';

export { BARRAS_METRICAS, BARRAS_PULGADA, buscarBarra };
export type { BarraMetrica, BarraPulgada };

/* ═════════════════════════════ Apéndice C-A — Modelos puntal-tensor ═════════════════════════════ */

/** PDF p.525 (C-223), C-A.2.5: el ángulo entre los ejes de un puntal y un tensor que entran en un mismo nodo no debe ser menor de 25°. */
export const ANGULO_MIN_PUNTAL_TENSOR_GRADOS = 25;

export type TipoPuntal = 'uniforme' | 'botella-con-refuerzo' | 'botella-sin-refuerzo' | 'traccion' | 'otros';

export type FilaBetaS = {
  tipo: TipoPuntal;
  seccion: string;
  caso: string;
  /** Valor de βs; si `usaLambda`, el valor se multiplica por λ (C.8.6.1). */
  beta: number;
  usaLambda: boolean;
};

/** PDF p.526 (C-224), C-A.3.2.1 a C-A.3.2.4: βs de la Ec. C-A-3 (fce = 0.85 βs f′c). */
export const TABLA_BETA_S: readonly FilaBetaS[] = [
  { tipo: 'uniforme', seccion: 'C-A.3.2.1', caso: 'Puntal de sección transversal uniforme a lo largo de su longitud', beta: 1.0, usaLambda: false },
  { tipo: 'botella-con-refuerzo', seccion: 'C-A.3.2.2(a)', caso: 'Puntal en forma de botella con refuerzo que cumple C-A.3.3', beta: 0.75, usaLambda: false },
  { tipo: 'botella-sin-refuerzo', seccion: 'C-A.3.2.2(b)', caso: 'Puntal en forma de botella sin refuerzo que cumpla C-A.3.3', beta: 0.6, usaLambda: true },
  { tipo: 'traccion', seccion: 'C-A.3.2.3', caso: 'Puntales en elementos sometidos a tracción, o alas en tracción de los elementos', beta: 0.4, usaLambda: false },
  { tipo: 'otros', seccion: 'C-A.3.2.4', caso: 'Todos los demás casos', beta: 0.6, usaLambda: true },
];

export type TipoZonaNodal = 'puntales-apoyos' | 'un-tensor' | 'dos-o-mas-tensores';

export type FilaBetaN = { tipo: TipoZonaNodal; seccion: string; caso: string; beta: number; nombreUsual: string };

/** PDF p.528 (C-226), C-A.5.2.1 a C-A.5.2.3: βn de la Ec. C-A-8 (fce = 0.85 βn f′c). `nombreUsual` es auxiliar (nomenclatura de la literatura). */
export const TABLA_BETA_N: readonly FilaBetaN[] = [
  { tipo: 'puntales-apoyos', seccion: 'C-A.5.2.1', caso: 'Zonas nodales limitadas por puntales o áreas de apoyo, o ambas', beta: 1.0, nombreUsual: 'CCC' },
  { tipo: 'un-tensor', seccion: 'C-A.5.2.2', caso: 'Zonas nodales que anclan un tensor', beta: 0.8, nombreUsual: 'CCT' },
  { tipo: 'dos-o-mas-tensores', seccion: 'C-A.5.2.3', caso: 'Zonas nodales que anclan dos o más tensores', beta: 0.6, nombreUsual: 'CTT / TTT' },
];

/** PDF p.526 (C-224), C-A.3.3.1 (Ec. C-A-4): Σ (Asi/(bs si)) sen αi ≥ 0.003, válida para f′c ≤ 40 MPa. */
export const CUANTIA_MIN_REFUERZO_PUNTAL = 0.003;
/** PDF p.526 (C-224), C-A.3.3.1: límite de f′c (MPa) para usar la Ec. C-A-4. */
export const FC_MAX_ECUACION_CA4_MPA = 40;
/** PDF p.526 (C-224), C-A.3.3.2: si el refuerzo se coloca en una sola dirección, α no debe ser menor de 40°. */
export const ALFA_MIN_UNA_DIRECCION_GRADOS = 40;
/** PDF p.526 (C-224), C-A.3.3: la compresión se expande con pendiente 2 longitudinal : 1 transversal al eje del puntal. */
export const PENDIENTE_EXPANSION_PUNTAL = { longitudinal: 2, transversal: 1 } as const;
/** PDF p.527 (C-225), C-A.4.1: Δfp permitido (MPa) para refuerzo preesforzado adherido y no adherido (Ec. C-A-6). */
export const DELTA_FP_MPA = { adherido: 420, noAdherido: 70 } as const;

/** PDF p.534 (C-232), C-C.9.3.2.6, y PDF p.371 (C-69), C.9.3.2.6: φ de los modelos puntal-tensor con cada conjunto de factores. */
export const PHI_PUNTAL_TENSOR_POR_CONJUNTO = { capituloC9: 0.75, apendiceCC: 0.85 } as const;

/* ═════════════════════════════ Apéndice C-B — Disposiciones alternativas ═════════════════════════════ */

/** PDF p.529 (C-227), Ec. C-B-1: el 600 de ρb = (0.85 β1 f′c / fy)(600/(600 + fy)) es la deformación 0.003 en MPa (0.003 × 200 000). */
export const CB_FACTOR_DEFORMACION_MPA = 600;
/** PDF p.529 (C-227), C-B.10.3.3: ρ no debe exceder 0.75 ρb. */
export const CB_FACTOR_RHO_MAX = 0.75;
/** PDF p.529 (C-227), C-B.8.4.1: reducción máxima de momentos = 20 (1 − (ρ − ρ′)/ρb) por ciento. */
export const CB_REDISTRIBUCION_BASE_PORCENTAJE = 20;
/** PDF p.529 (C-227), C-B.8.4.2: la redistribución solo es válida si ρ ó (ρ − ρ′) ≤ 0.50 ρb. */
export const CB_FACTOR_RHO_REDISTRIBUCION = 0.5;
/** PDF p.530 (C-228), C-B18.8.1: el índice combinado de refuerzo no debe exceder 0.36 β1. */
export const CB_COEF_OMEGA_MAX = 0.36;
/** PDF p.531 (C-229), C-B18.10.4.2: la redistribución en preesforzado exige un índice combinado ≤ 0.24 β1. */
export const CB_COEF_OMEGA_REDISTRIBUCION = 0.24;
/** PDF p.530 (C-228), C-B18.8.3: la resistencia debe ser al menos 1.2 veces la carga de fisuración. */
export const CB_FACTOR_FISURACION = 1.2;
/** PDF p.534 (C-232), C-C.9.3.2.2 (y C.9.3.2.2, PDF p.370, C-68): condiciones de la alternativa de φ por carga axial con el Apéndice C-B: fy ≤ 420 MPa, refuerzo simétrico y (d − d′)/h ≥ 0.70. */
export const CB_CONDICIONES_PHI_AXIAL = { fyMaxMPa: 420, relacionMinimaDsMenosDPrimaSobreH: 0.7 } as const;

/** Numerales que el Apéndice C-B reemplaza en el cuerpo del Título C (PDF p.529, C-227, C-B.1). */
export const CB_NUMERALES_REEMPLAZADOS: readonly { apendice: string; reemplaza: string }[] = [
  { apendice: 'C-B.8.4, C-B.8.4.1, C-B.8.4.2, C-B.8.4.3', reemplaza: 'Los numerales de igual numeración del Capítulo C.8 (redistribución de momentos)' },
  { apendice: 'C-B.10.3.3', reemplaza: 'C.10.3.3, C.10.3.4 y C.10.3.5, excepto C.10.3.5.1, que se mantiene' },
  { apendice: 'C-B.18.1.3, C-B.18.8.1, C-B.18.8.2, C-B.18.8.3', reemplaza: 'Los numerales de igual numeración del Capítulo C.18' },
  { apendice: 'C-B.18.10.4, C-B.18.10.4.1, C-B.18.10.4.2, C-B.18.10.4.3', reemplaza: 'C.18.10.4, C.18.10.4.1 y C.18.10.4.2' },
];

/* ═════════════════════════════ Apéndice C-C — Factores de carga y φ alternativos ═════════════════════════════ */

export type EcuacionCC = { id: string; texto: string; seccion: string; pag: string };

/** PDF p.533 (C-231), C-C.9.2.1 a C-C.9.2.6: Ecuaciones C-C.9-1 a C-C.9-6. */
export const ECUACIONES_CC: readonly EcuacionCC[] = [
  { id: 'C-C.9-1', texto: '1.4D + 1.7L', seccion: 'C-C.9.2.1', pag: 'C-231' },
  { id: 'C-C.9-2', texto: '0.75(1.4D + 1.7L) + (1.6W ó 1.0E)', seccion: 'C-C.9.2.2', pag: 'C-231' },
  { id: 'C-C.9-3', texto: '0.9D + (1.6W ó 1.0E)', seccion: 'C-C.9.2.2', pag: 'C-231' },
  { id: 'C-C.9-4', texto: '1.4D + 1.7L + 1.7H', seccion: 'C-C.9.2.3', pag: 'C-231' },
  { id: 'C-C.9-5', texto: '0.75(1.4D + 1.4T + 1.7L)', seccion: 'C-C.9.2.6', pag: 'C-231' },
  { id: 'C-C.9-6', texto: '1.4(D + T)', seccion: 'C-C.9.2.6', pag: 'C-231' },
];

/** PDF p.533 (C-231), C-C.9.2.4: factor de carga de F (fluidos con densidades bien definidas). */
export const CC_FACTOR_F = 1.4;
/** PDF p.534 (C-232), C-C.9.2.7: factor sobre la fuerza máxima del gato en zonas de anclaje de postensado. */
export const CC_FACTOR_ANCLAJE_POSTENSADO = 1.2;

export type FilaPhiCC = {
  /** Numeral de C-C.9.3. */
  seccion: string;
  caso: string;
  /** φ del Apéndice C-C. */
  phiCC: number;
  /** φ de límite final cuando varía linealmente. */
  phiCCFinal?: number;
  /** Numeral equivalente de C.9.3 del cuerpo. */
  seccionC9: string;
  /** φ del cuerpo del Capítulo C.9 (PDF p.370–371, C-68 y C-69). */
  phiC9: number;
  phiC9Final?: number;
};

/** PDF p.534–535 (C-232, C-233) frente a PDF p.370–371 (C-68, C-69): φ de C-C.9.3.2 a C-C.9.3.5 y su equivalente en C.9.3. */
export const TABLA_PHI_COMPARADA: readonly FilaPhiCC[] = [
  { seccion: 'C-C.9.3.2.1', caso: 'Secciones controladas por tracción', phiCC: 0.9, seccionC9: 'C.9.3.2.1', phiC9: 0.9 },
  { seccion: 'C-C.9.3.2.2(a)', caso: 'Secciones controladas por compresión: refuerzo en espiral (C.10.9.3)', phiCC: 0.75, seccionC9: 'C.9.3.2.2(a)', phiC9: 0.75 },
  { seccion: 'C-C.9.3.2.2(b)', caso: 'Secciones controladas por compresión: otros elementos reforzados', phiCC: 0.7, seccionC9: 'C.9.3.2.2(b)', phiC9: 0.65 },
  { seccion: 'C-C.9.3.2.3', caso: 'Cortante y torsión', phiCC: 0.85, seccionC9: 'C.9.3.2.3', phiC9: 0.75 },
  { seccion: 'C-C.9.3.2.4', caso: 'Aplastamiento en el concreto (excepto anclajes de postensado y modelos puntal-tensor)', phiCC: 0.7, seccionC9: 'C.9.3.2.4', phiC9: 0.65 },
  { seccion: 'C-C.9.3.2.5', caso: 'Zonas de anclaje de postensado', phiCC: 0.85, seccionC9: 'C.9.3.2.5', phiC9: 0.85 },
  { seccion: 'C-C.9.3.2.6', caso: 'Modelos puntal-tensor (Apéndice C-A): puntales, tensores, zonas nodales y áreas de aplastamiento', phiCC: 0.85, seccionC9: 'C.9.3.2.6', phiC9: 0.75 },
  {
    seccion: 'C-C.9.3.2.7',
    caso: 'Flexión sin carga axial en elementos preesforzados donde el embebido del torón es menor que la longitud de desarrollo (C.12.9.1.1)',
    phiCC: 0.85,
    seccionC9: 'C.9.3.2.7',
    phiC9: 0.75,
    phiC9Final: 0.9,
  },
  { seccion: 'C-C.9.3.4(a)', caso: 'DMO o DES: cortante si la resistencia nominal a cortante es menor que el cortante asociado a la resistencia nominal a flexión', phiCC: 0.6, seccionC9: 'C.9.3.4(a)', phiC9: 0.6 },
  { seccion: 'C-C.9.3.4(c)', caso: 'DMO o DES: cortante en nudos y vigas de acople reforzadas en forma diagonal', phiCC: 0.85, seccionC9: 'C.9.3.4(c)', phiC9: 0.85 },
  { seccion: 'C-C.9.3.5', caso: 'Concreto estructural simple (Capítulo C.22): flexión, compresión, cortante y aplastamiento', phiCC: 0.65, seccionC9: 'C.9.3.5', phiC9: 0.6 },
];

/** φ de C-C.9.3.2.1 (tracción), 9.3.2.2(a) y (b) (compresión con espiral / otros) — PDF p.534 (C-232). */
export const PHI_CC = {
  traccion: 0.9,
  compresionEspiral: 0.75,
  compresionOtros: 0.7,
  cortanteTorsion: 0.85,
  aplastamiento: 0.7,
  anclajePostensado: 0.85,
  puntalTensor: 0.85,
  pretensadoSinDesarrollo: 0.85,
  simple: 0.65,
} as const;

/* ═════════════════════════════ Apéndice C-E — Información acerca del acero de refuerzo ═════════════════════════════ */

/** Densidad del acero para el control de las masas tabuladas (auxiliar): kg/m por mm² de área ≈ 7.85×10⁻³. */
export const MASA_POR_AREA_ACERO = 7.85e-3;

export type TipoTendon =
  | 'toron-1725'
  | 'toron-1860'
  | 'alambre-preesforzado'
  | 'barra-preesforzado-lisa'
  | 'barra-preesforzado-corrugada';

export type Tendon = {
  tipo: TipoTendon;
  /** Diámetro nominal (mm). */
  diametro: number;
  /** Área nominal (mm²). */
  area: number;
  /** Masa nominal (kg/m). */
  masa: number;
  /** true si el valor se deduce por faltar el punto decimal en la impresión del PDF. */
  deducido?: boolean;
};

export const NOMBRE_TIPO_TENDON: Record<TipoTendon, string> = {
  'toron-1725': 'Torón de siete alambres (Grado 1725)',
  'toron-1860': 'Torón de siete alambres (Grado 1860)',
  'alambre-preesforzado': 'Alambre de preesforzado',
  'barra-preesforzado-lisa': 'Barras de preesforzado (lisas)',
  'barra-preesforzado-corrugada': 'Barras de preesforzado (corrugadas)',
};

/**
 * PDF p.552 (C-250), "Tendones de preesfuerzo estándar de la ASTM". La disponibilidad de algunos tamaños debe ser
 * investigada con anterioridad (nota de la tabla). En el alambre de 6.35 y 7.01 mm el PDF imprime las áreas como
 * «31 7» y «38 6» (falta el punto decimal): se leen 31.7 y 38.6 mm², coherentes con πd²/4 (31.67 y 38.59).
 */
export const TENDONES: readonly Tendon[] = [
  { tipo: 'toron-1725', diametro: 6.4, area: 23.2, masa: 0.182 },
  { tipo: 'toron-1725', diametro: 7.9, area: 37.4, masa: 0.294 },
  { tipo: 'toron-1725', diametro: 9.5, area: 51.6, masa: 0.405 },
  { tipo: 'toron-1725', diametro: 11.1, area: 69.7, masa: 0.548 },
  { tipo: 'toron-1725', diametro: 12.7, area: 92.9, masa: 0.73 },
  { tipo: 'toron-1725', diametro: 15.2, area: 139.4, masa: 1.094 },
  { tipo: 'toron-1860', diametro: 9.53, area: 54.8, masa: 0.432 },
  { tipo: 'toron-1860', diametro: 11.1, area: 74.2, masa: 0.582 },
  { tipo: 'toron-1860', diametro: 12.7, area: 98.7, masa: 0.775 },
  { tipo: 'toron-1860', diametro: 15.24, area: 140.0, masa: 1.102 },
  { tipo: 'alambre-preesforzado', diametro: 4.88, area: 18.7, masa: 0.146 },
  { tipo: 'alambre-preesforzado', diametro: 4.98, area: 19.5, masa: 0.149 },
  { tipo: 'alambre-preesforzado', diametro: 6.35, area: 31.7, masa: 0.253, deducido: true },
  { tipo: 'alambre-preesforzado', diametro: 7.01, area: 38.6, masa: 0.298, deducido: true },
  { tipo: 'barra-preesforzado-lisa', diametro: 19, area: 284, masa: 2.23 },
  { tipo: 'barra-preesforzado-lisa', diametro: 22, area: 387, masa: 3.04 },
  { tipo: 'barra-preesforzado-lisa', diametro: 25, area: 503, masa: 3.97 },
  { tipo: 'barra-preesforzado-lisa', diametro: 29, area: 639, masa: 5.03 },
  { tipo: 'barra-preesforzado-lisa', diametro: 32, area: 794, masa: 6.21 },
  { tipo: 'barra-preesforzado-lisa', diametro: 35, area: 955, masa: 7.52 },
  { tipo: 'barra-preesforzado-corrugada', diametro: 15, area: 181, masa: 1.46 },
  { tipo: 'barra-preesforzado-corrugada', diametro: 20, area: 271, masa: 2.22 },
  { tipo: 'barra-preesforzado-corrugada', diametro: 26, area: 548, masa: 4.48 },
  { tipo: 'barra-preesforzado-corrugada', diametro: 32, area: 806, masa: 6.54 },
  { tipo: 'barra-preesforzado-corrugada', diametro: 36, area: 1019, masa: 8.28 },
];

/** Espaciamientos centro a centro (mm) de las columnas de la tabla de alambre de refuerzo (PDF p.552, C-250). */
export const ESPACIAMIENTOS_ALAMBRE_MM = [50, 75, 100, 150, 200, 250, 300] as const;

export type AlambreRefuerzo = {
  /** Tamaño del alambre liso, p. ej. "MW 290". */
  liso: string;
  /** Tamaño del alambre corrugado, p. ej. "MD 290"; null para MW 20, MW 15, MW 10 y MW 5 (no tienen corrugado). */
  corrugado: string | null;
  /** Diámetro nominal (mm). */
  diametro: number;
  /** Masa nominal (kg/m). */
  masa: number;
  /** As (mm² por metro) para cada espaciamiento de `ESPACIAMIENTOS_ALAMBRE_MM`, en el mismo orden. */
  asPorMetro: readonly [number, number, number, number, number, number, number];
};

/**
 * PDF p.552 (C-250), "Alambre de refuerzo estándar de la ASTM". El número del tamaño es el área en mm² (MW 290 = 290 mm²).
 * Las áreas por metro están redondeadas en la tabla a 2 o 3 cifras significativas.
 */
export const ALAMBRES_REFUERZO: readonly AlambreRefuerzo[] = [
  { liso: 'MW 290', corrugado: 'MD 290', diametro: 19.22, masa: 2.27, asPorMetro: [5800, 3900, 2900, 1900, 1450, 1160, 970] },
  { liso: 'MW 200', corrugado: 'MD 200', diametro: 15.95, masa: 1.57, asPorMetro: [4000, 2700, 2000, 1300, 1000, 800, 670] },
  { liso: 'MW 130', corrugado: 'MD 130', diametro: 12.9, masa: 1.0204, asPorMetro: [2600, 1700, 1300, 870, 650, 520, 430] },
  { liso: 'MW 120', corrugado: 'MD 120', diametro: 12.4, masa: 0.9419, asPorMetro: [2400, 1600, 1200, 800, 600, 480, 400] },
  { liso: 'MW 100', corrugado: 'MD 100', diametro: 11.3, masa: 0.7849, asPorMetro: [2000, 1300, 1000, 670, 500, 400, 330] },
  { liso: 'MW 90', corrugado: 'MD 90', diametro: 10.7, masa: 0.7064, asPorMetro: [1800, 1200, 900, 600, 450, 360, 300] },
  { liso: 'MW 80', corrugado: 'MD 80', diametro: 10.1, masa: 0.6279, asPorMetro: [1600, 1100, 800, 530, 400, 320, 270] },
  { liso: 'MW 70', corrugado: 'MD 70', diametro: 9.4, masa: 0.5494, asPorMetro: [1400, 930, 700, 470, 350, 280, 230] },
  { liso: 'MW 65', corrugado: 'MD 65', diametro: 9.1, masa: 0.5102, asPorMetro: [1300, 870, 650, 430, 325, 260, 220] },
  { liso: 'MW 60', corrugado: 'MD 60', diametro: 8.7, masa: 0.4709, asPorMetro: [1200, 800, 600, 400, 300, 240, 200] },
  { liso: 'MW 55', corrugado: 'MD 55', diametro: 8.4, masa: 0.4317, asPorMetro: [1100, 730, 550, 370, 275, 220, 180] },
  { liso: 'MW 50', corrugado: 'MD 50', diametro: 8.0, masa: 0.3925, asPorMetro: [1000, 670, 500, 330, 250, 200, 170] },
  { liso: 'MW 45', corrugado: 'MD 45', diametro: 7.6, masa: 0.3532, asPorMetro: [900, 600, 450, 300, 225, 180, 150] },
  { liso: 'MW 40', corrugado: 'MD 40', diametro: 7.1, masa: 0.314, asPorMetro: [800, 530, 400, 270, 200, 160, 130] },
  { liso: 'MW 35', corrugado: 'MD 35', diametro: 6.7, masa: 0.2747, asPorMetro: [700, 470, 350, 230, 175, 140, 120] },
  { liso: 'MW 30', corrugado: 'MD 30', diametro: 6.2, masa: 0.2355, asPorMetro: [600, 400, 300, 200, 150, 120, 100] },
  { liso: 'MW 25', corrugado: 'MD 25', diametro: 5.6, masa: 0.1962, asPorMetro: [500, 330, 250, 170, 125, 100, 83] },
  { liso: 'MW 20', corrugado: null, diametro: 5.0, masa: 0.157, asPorMetro: [400, 270, 200, 130, 100, 80, 67] },
  { liso: 'MW 15', corrugado: null, diametro: 4.4, masa: 0.1177, asPorMetro: [300, 200, 150, 100, 75, 60, 50] },
  { liso: 'MW 10', corrugado: null, diametro: 3.6, masa: 0.0785, asPorMetro: [200, 130, 100, 70, 50, 40, 33] },
  { liso: 'MW 5', corrugado: null, diametro: 2.5, masa: 0.0392, asPorMetro: [100, 67, 50, 33, 25, 20, 17] },
];

/** Busca un alambre de la tabla por su tamaño liso ("MW 130") o corrugado ("MD 130"). */
export function buscarAlambre(tamano: string): AlambreRefuerzo | undefined {
  const t = tamano.trim().toUpperCase().replace(/\s+/g, ' ');
  const norm = (s: string) => s.replace(/\s+/g, '');
  return ALAMBRES_REFUERZO.find((a) => norm(a.liso) === norm(t) || (a.corrugado !== null && norm(a.corrugado) === norm(t)));
}

/** Área nominal de una barra (mm²) por designación ("10M", "No. 5"); undefined si no existe. */
export function areaBarra(designacion: string): number | undefined {
  return buscarBarra(designacion)?.area;
}

/** Área total (mm²) de n barras de la designación dada (auxiliar: n × área nominal de la tabla). */
export function areaNBarras(n: number, designacion: string): number {
  const a = areaBarra(designacion);
  if (a === undefined) throw new RangeError(`designación de barra desconocida: ${designacion}`);
  if (!(n >= 0) || !Number.isInteger(n)) throw new RangeError('n debe ser un entero no negativo');
  return n * a;
}

/** Número mínimo de barras de la designación dada para alcanzar el área requerida (auxiliar). */
export function barrasNecesarias(areaRequerida: number, designacion: string): number {
  const a = areaBarra(designacion);
  if (a === undefined) throw new RangeError(`designación de barra desconocida: ${designacion}`);
  if (!(areaRequerida >= 0)) throw new RangeError('el área requerida no puede ser negativa');
  return Math.ceil(areaRequerida / a - 1e-9);
}

/** As por metro (mm²/m) de un alambre de área `areaAlambre` (mm²) cada `s` mm (auxiliar: area × 1000 / s). */
export function asPorMetroMalla(areaAlambre: number, s: number): number {
  if (!(areaAlambre > 0) || !(s > 0)) throw new RangeError('área y separación deben ser positivas');
  return (areaAlambre * 1000) / s;
}

/** As por metro tabulado (PDF p.552) para un tamaño y un espaciamiento de la tabla; undefined si no existe. */
export function asPorMetroTabla(tamano: string, s: (typeof ESPACIAMIENTOS_ALAMBRE_MM)[number]): number | undefined {
  const a = buscarAlambre(tamano);
  if (!a) return undefined;
  const i = ESPACIAMIENTOS_ALAMBRE_MM.indexOf(s);
  return i < 0 ? undefined : a.asPorMetro[i];
}
