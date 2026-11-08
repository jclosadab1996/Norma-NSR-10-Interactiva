/**
 * Constantes y tabla del Capítulo D.10 (Mampostería de muros confinados), partes D.10.0 a D.10.6, de la NSR-10.
 * SI: mm, mm², m², MPa. PDF = página impresa "D-n" + 565 (D-53 a D-57 = PDF 618 a 622).
 * Verificadas contra la imagen de las páginas D-53 a D-57. Cada constante cita su sección y página.
 *
 * Convenciones del proyecto (no son texto de la norma):
 *  - «N° 3 (3/8") ó 10M (10 mm)» se evalúa con el menor de los dos diámetros: 9.5 mm; «N° 4 (1/2") ó 12M (12 mm)»: 12 mm;
 *    «N° 2 (1/4") ó 6M (6 mm)»: 6 mm (misma convención de `cuantiasMamposteria.ts`).
 *  - Los puntos del Título D que remiten a D.10.7 (resistencia) NO se calculan aquí: los trata la parte b del capítulo.
 */

/* ---------- D.10.3.2.1: Tabla D.10.3-1 — resistencia mínima de las unidades ---------- */

export type TipoUnidadConfinada = 'tolete-arcilla' | 'bloque-horizontal-arcilla' | 'bloque-vertical';

export interface FilaTablaD1031 {
  id: TipoUnidadConfinada;
  /** Texto de la fila tal como lo imprime la norma. */
  tipo: string;
  /** f′cu mínima (MPa). */
  fcuMin: number;
}

/** Tabla D.10.3-1 — Resistencia mínima de las unidades para muros de mampostería confinada (D.10.3.2.1, PDF p.619, D-54). */
export const TABLA_D10_3_1: readonly FilaTablaD1031[] = [
  { id: 'tolete-arcilla', tipo: 'Tolete de arcilla', fcuMin: 15 },
  { id: 'bloque-horizontal-arcilla', tipo: 'Bloque de perforación horizontal de arcilla', fcuMin: 3 },
  { id: 'bloque-vertical', tipo: 'Bloque de perforación vertical de concreto o de arcilla (sobre área neta)', fcuMin: 5 },
];

/* ---------- D.10.3: muros ---------- */

/** D.10.3.2.2 (PDF p.619-620, D-54 y D-55): el bloque de perforación horizontal de arcilla se limita a Pu/Ae ≤ 0.15 f′m. */
export const BLOQUE_HORIZONTAL = {
  /** Factor de f′m en Pu/Ae ≤ 0.15 f′m. */
  factorFm: 0.15,
  /** Número de pisos desde arriba en los que se permite en edificaciones de más de dos pisos («los dos pisos superiores»). */
  pisosSuperiores: 2,
  /** Edificaciones en las que se permite en todos los pisos (uno y dos pisos). */
  pisosEdificioPermitido: 2,
} as const;

/** D.10.3.3 (PDF p.620, D-55): relación máxima entre altura libre y espesor del muro. */
export const ESBELTEZ_MAX_MURO_CONFINADO = 25;
/** D.10.3.3 (PDF p.620, D-55): espesor nominal mínimo del muro (mm). */
export const ESPESOR_MIN_MURO_CONFINADO = 110;

/** D.10.3.4, Ec. D.10.3-1 (PDF p.620, D-55): Am ≥ N·Aa·Ap / 20. Divisor de la ecuación. */
export const DIVISOR_DENSIDAD_MUROS = 20;

/* ---------- D.10.4: elementos de confinamiento (generales) ---------- */

/** D.10.4.1 (PDF p.620, D-55): resistencia mínima del concreto de columnas y vigas de confinamiento a 28 días (MPa). */
export const FC_MIN_CONFINAMIENTO = 17.5;
/** D.10.4.3 (PDF p.620, D-55): resistencia mínima del mortero de inyección en las vigas de remate con unidades tipo U (MPa). */
export const MORTERO_MIN_UNIDAD_U = 14;

/** Diámetros mínimos del refuerzo (mm), según la convención del proyecto para «N° n ó nM». */
export const DIAMETROS_MINIMOS = {
  /** N° 2 (1/4") ó 6M (6 mm): estribos. */
  n2_6M: 6,
  /** N° 3 (3/8") ó 10M (10 mm): barras longitudinales mínimas. */
  n3_10M: 9.5,
  /** N° 4 (1/2") ó 12M (12 mm): viga angosta o con losa maciza. */
  n4_12M: 12,
} as const;

/* ---------- D.10.5: columnas de confinamiento ---------- */

export const COLUMNA_CONFINAMIENTO = {
  /** D.10.5.2.2 (PDF p.620, D-55): área mínima de la sección transversal (mm²). */
  areaMin: 20000,
  /** D.10.5.3(c) (PDF p.620, D-55): separación máxima = 35 veces el espesor efectivo del muro. */
  factorEspesor: 35,
  /** D.10.5.3(c): 1.5 veces la distancia vertical entre elementos horizontales de confinamiento. */
  factorAlturaEntreVigas: 1.5,
  /** D.10.5.3(c): tope absoluto (mm). */
  separacionTope: 4000,
  /** D.10.5.4(a) (PDF p.620, D-55): número mínimo de barras longitudinales. */
  nBarrasMin: 3,
  /** D.10.5.4(a): cuantía longitudinal mínima sobre el área bruta. */
  cuantiaMin: 0.0075,
  /** D.10.5.4(b) (PDF p.621, D-56): separación de estribos = 1.5 veces la menor dimensión... */
  estribosFactorMenorDimension: 1.5,
  /** ... o 200 mm; rige el menor. */
  estribosSeparacionMax: 200,
  /** D.10.5.6 (PDF p.621, D-56): en zonas de amenaza sísmica alta e intermedia, separación de los estribos de confinamiento (mm). */
  zonaConfinada: { separacion: 100, separacionRamasMax: 150, longitudMin: 450, factorMayorDimension: 3, fraccionLuz: 1 / 6 },
} as const;

/* ---------- D.10.6: vigas de confinamiento ---------- */

export const VIGA_CONFINAMIENTO = {
  /** D.10.6.2.2 (PDF p.621, D-56): área mínima de la sección transversal (mm²). */
  areaMin: 20000,
  /** D.10.6.2.2: espesor de losa maciza a partir del cual puede prescindirse de la viga de amarre en esa zona (mm). */
  losaMacizaEspesorMin: 100,
  /** D.10.6.2.2: reducción máxima del ancho en vigas que requieran enchape (mm), manteniendo el área mínima. */
  reduccionAnchoEnchape: 75,
  /** D.10.6.3 (PDF p.621, D-56): distancia libre vertical máxima entre vigas, como múltiplo del espesor del muro. */
  distanciaVerticalMaxFactor: 25,
  /** D.10.6.4(a) (PDF p.621-622, D-56 y D-57): barras longitudinales mínimas. */
  nBarrasMin: 3,
  /** D.10.6.4(a): cuantía longitudinal mínima sobre el área bruta. */
  cuantiaMin: 0.0075,
  /** D.10.6.4(a): ancho por debajo del cual (o con losa maciza) el refuerzo mínimo son 2 barras N° 4 ó 12M (mm). */
  anchoAngosto: 110,
  /** D.10.6.4(a): número de barras N° 4 ó 12M del caso angosto o con losa maciza. */
  nBarrasAngosta: 2,
  /** D.10.6.4(b) (PDF p.622, D-57): separación de estribos ≤ 200 mm y ≤ 1.5 veces la menor dimensión. */
  estribosSeparacionMax: 200,
  estribosFactorMenorDimension: 1.5,
} as const;

/** D.10.6.7 (PDF p.622, D-57): cintas de amarre. */
export const CINTA_AMARRE = {
  /** (a) Elemento de concreto: altura mínima (mm) y número mínimo de barras N° 3 ó 10M. */
  concreto: { alturaMin: 100, nBarrasMin: 2 },
  /** (b) Unidades tipo U inyectadas: 2 barras N° 3 ó 10M, ó 1 barra N° 4 ó 12M; mortero de inyección mínimo (MPa). */
  unidadU: { nBarrasN3: 2, nBarrasN4: 1, morteroMin: MORTERO_MIN_UNIDAD_U },
} as const;
