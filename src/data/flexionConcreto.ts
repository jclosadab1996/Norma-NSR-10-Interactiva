/**
 * Constantes y tablas del Capítulo C.10 (Flexión y cargas axiales) de la NSR-10.
 * PDF = página impresa "C-n" + 302. Cada constante cita su sección y página.
 */

/** Deformación unitaria máxima utilizable del concreto en compresión, εcu = 0.003 (C.10.2.3, PDF p.377, C-75). */
export const EPS_CU = 0.003;

/** Una sección es controlada por tracción si εt ≥ 0.005 (C.10.3.4, PDF p.378, C-76). */
export const EPS_T_CONTROLADA_TRACCION = 0.005;

/**
 * Límite de εt en el estado de resistencia nominal para elementos no preesforzados en flexión (y con carga axial
 * mayorada menor que 0.10 f′c Ag): εt no debe ser menor que 0.004 (C.10.3.5, PDF p.378, C-76).
 */
export const EPS_T_MIN_FLEXION = 0.004;

/** Límite de deformación controlada por compresión que se permite para refuerzo Grado 420 (C.10.3.3, PDF p.378, C-76). */
export const EPS_LIMITE_COMPRESION_GRADO_420 = 0.002;

/** Resistencia de fluencia del refuerzo Grado 420, MPa (C.10.3.3). */
export const FY_GRADO_420 = 420;

/**
 * Factores de reducción de resistencia φ de C.9.3.2.1 y C.9.3.2.2 (PDF p.370, C-68).
 * PUNTO DE CONTACTO: el capítulo C.9 expone su propia función φ(εt); esta copia vive aquí para no depender de ella
 * y se verifica con sus propios tests.
 */
export const PHI_TRACCION = 0.9;
export const PHI_COMPRESION_ESPIRAL = 0.75;
export const PHI_COMPRESION_ESTRIBOS = 0.65;
/** φ para aplastamiento en el concreto (C.9.3.2.4, PDF p.370, C-68). */
export const PHI_APLASTAMIENTO = 0.65;

/** Factores de la resistencia axial máxima de diseño de elementos no preesforzados (Ecs. C.10-1 y C.10-2, PDF p.378, C-76). */
export const FACTOR_PN_MAX_ESPIRAL = 0.8;
export const FACTOR_PN_MAX_ESTRIBOS = 0.75;

/** Límites del refuerzo longitudinal de columnas: 0.01 Ag ≤ Ast ≤ 0.04 Ag (C.10.9.1, PDF p.381, C-79). */
export const CUANTIA_MIN_COLUMNA = 0.01;
export const CUANTIA_MAX_COLUMNA = 0.04;

/** Número mínimo de barras longitudinales en columnas (C.10.9.2, PDF p.381, C-79). */
export const BARRAS_MIN_COLUMNA = {
  'estribos-rectangulares-o-circulares': 4,
  'estribos-triangulares': 3,
  espiral: 6,
} as const;
export type TipoConfinamientoColumna = keyof typeof BARRAS_MIN_COLUMNA;

/** fyt máximo a usar en la Ec. C.10-5 del refuerzo en espiral, MPa (C.10.9.3, PDF p.381, C-79). */
export const FYT_MAX_ESPIRAL = 700;

/** Máxima separación entre apoyos laterales de una viga: 50 veces el menor ancho b de la cara de compresión (C.10.4.1, PDF p.378, C-76). */
export const RELACION_APOYOS_LATERALES = 50;

/** Altura h de la viga desde la cual se exige refuerzo superficial longitudinal, mm (C.10.6.7, PDF p.380, C-78). */
export const H_REFUERZO_SUPERFICIAL_MM = 900;

/** Esbeltez: límites de kℓu/r (C.10.10.1, Ecs. C.10-6 y C.10-7, PDF p.381, C-79). */
export const ESBELTEZ_LIMITE_NO_ARRIOSTRADA = 22;
export const ESBELTEZ_LIMITE_ARRIOSTRADA = { base: 34, coeficiente: 12, tope: 40 } as const;

/** Máximo aumento de momentos por segundo orden: 1.4 veces los de primer orden (C.10.10.2.1, PDF p.382, C-80). */
export const AMPLIFICACION_MAX_SEGUNDO_ORDEN = 1.4;

/** Un piso/columna se puede suponer arriostrado si Q ≤ 0.05 (Ec. C.10-10) o si el incremento de momentos es ≤ 5 % (C.10.10.5.1). */
export const Q_LIMITE_ARRIOSTRADO = 0.05;
/** Si δs de la Ec. C.10-20 excede 1.5 se debe usar análisis de segundo orden o la Ec. C.10-21 (C.10.10.7.3, PDF p.384, C-82). */
export const DELTA_S_MAX_C10_20 = 1.5;

/** Una fila de la tabla de propiedades de sección para el análisis elástico de segundo orden (C.10.10.4.1(b)). */
export interface PropiedadAnalisis {
  elemento: string;
  grupo: 'compresion' | 'flexion';
  /** Multiplicador de Ig. */
  factorI: number;
}

/**
 * Momentos de inercia permitidos para análisis elástico de segundo orden (C.10.10.4.1(b), PDF p.382, C-80).
 * El módulo de elasticidad es Ec de C.8.5.1 y el área es 1.0 Ag (C.10.10.4.1(a) y (c)).
 */
export const PROPIEDADES_ANALISIS_SEGUNDO_ORDEN: readonly PropiedadAnalisis[] = [
  { elemento: 'Columnas', grupo: 'compresion', factorI: 0.7 },
  { elemento: 'Muros no agrietados', grupo: 'compresion', factorI: 0.7 },
  { elemento: 'Muros agrietados', grupo: 'compresion', factorI: 0.35 },
  { elemento: 'Vigas', grupo: 'flexion', factorI: 0.35 },
  { elemento: 'Placas planas y losas planas', grupo: 'flexion', factorI: 0.25 },
];

/** Límites de la Ec. C.10-8 (columnas): I ≤ 0.875 Ig y no menor de 0.35 Ig (C.10.10.4.1, PDF p.382, C-80). */
export const I_COLUMNA_C10_8 = { max: 0.875, min: 0.35 } as const;
/** Límites de la Ec. C.10-9 (vigas): I ≤ 0.5 Ig y no menor de 0.25 Ig en vigas continuas (PDF p.382–383, C-80/C-81). */
export const I_VIGA_C10_9 = { max: 0.5, min: 0.25 } as const;

/** Factor de EI de la Ec. C.10-15: EI = 0.4 Ec Ig / (1 + βdns) (PDF p.384, C-82). */
export const FACTOR_EI_C10_15 = 0.4;
/** Factor del término del concreto en la Ec. C.10-14: 0.2 Ec Ig (PDF p.383, C-81). */
export const FACTOR_EI_C10_14 = 0.2;

/** Constantes del momento mínimo M2,min = Pu (15 + 0.03 h), con 15 y h en mm (Ec. C.10-17, PDF p.384, C-82). */
export const M2_MIN = { excentricidadMm: 15, coefH: 0.03 } as const;

/** Cm = 0.6 + 0.4 M1/M2 (Ec. C.10-16, PDF p.384, C-82). */
export const CM_COEF = { base: 0.6, coeficiente: 0.4 } as const;

/** Ec. C.10-4: s ≤ 380(280/fs) − 2.5 cc y no mayor que 300(280/fs), en mm (C.10.6.4, PDF p.379, C-77). */
export const SEPARACION_FISURACION = { coefA: 380, coefB: 2.5, tope: 300, fsReferencia: 280 } as const;

/** Refuerzo mínimo (Ec. C.10-3): 0.25√f′c/fy · bw d, no menor de 1.4 bw d/fy (C.10.5.1, PDF p.379, C-77). */
export const AS_MIN_FLEXION = { coefRaizFc: 0.25, minimoAbsoluto: 1.4 } as const;

/** Tabla de los factores de concentración del nudo columna–losa (C.10.12, PDF p.385, C-83). */
export const RELACION_FC_COLUMNA_LOSA = { interiorOBorde: 1.4, esquinera: 1.2 } as const;
export const COCIENTE_H_C2_MIN = 1 / 3;

/** Núcleo de acero estructural en elementos compuestos: fy de diseño ≤ 350 MPa (C.10.13.7.1 y C.10.13.8.1, PDF p.386–387). */
export const FY_NUCLEO_ACERO_MAX = 350;
/** Cuantía longitudinal en columnas compuestas con espiral o estribos: 0.01 a 0.08 del área neta de concreto (C.10.13.7.3, C.10.13.8.5). */
export const CUANTIA_COMPUESTA = { min: 0.01, max: 0.08 } as const;

/** Resistencia al aplastamiento: tope del factor √(A2/A1) igual a 2 (C.10.14.1, PDF p.387, C-85). */
export const FACTOR_APLASTAMIENTO_MAX = 2;
