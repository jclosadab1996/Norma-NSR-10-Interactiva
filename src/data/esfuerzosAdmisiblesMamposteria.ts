/**
 * Constantes y tablas del Apéndice D-1 de la NSR-10: diseño de mampostería estructural por el método de los esfuerzos de
 * trabajo admisibles (D-1.5, ecuaciones D-1.5-1 a D-1.5-23 y Tabla D-1.5-1).
 * Unidades del SI: MPa, mm, N. PDF = página impresa "D-n" + 565 (D-69 = PDF 634; D-74 = PDF 639).
 * Las usa `src/lib/nsr10/esfuerzosAdmisiblesMamposteria.ts`; el apéndice (apendice-d1.mdx) y la calculadora importan de aquí.
 */

/** Esfuerzo axial admisible: Fa = 0.20 f′m Re (Ec. D-1.5-1 y D-1.5-2, D-70/D-71). */
export const FA_COEF_FM = 0.2;

/** Columna reforzada: Pa = [0.20 f′m (Ae − Ast) + 0.65 Ast Fs] Re (Ec. D-1.5-4, D-71). */
export const PA_COEF_ACERO = 0.65;

/** Compresión por flexión: Fb = 0.33 f′m ≤ 14 MPa (Ec. D-1.5-6, D-71). */
export const FB_COEF_FM = 0.33;
export const FB_MAX_MPA = 14;

/** Ecuación de esfuerzos combinados: fa/Fa + fb/Fb ≤ 1.0 (Ec. D-1.5-7, D-72). */
export const COMBINADO_MAX = 1.0;

/** Brazo de palanca j = 0.8 si no se hace análisis de compatibilidad de deformaciones (D-1.5.6 y D-1.5.7, D-72). */
export const J_POR_DEFECTO = 0.8;

/** Vigas sin refuerzo de cortante: Fv = √f′m / 12 ≤ 0.35 MPa (Ec. D-1.5-9, D-72). */
export const FV_VIGA_SIN_REFUERZO = { divisor: 12, maxMpa: 0.35 } as const;

/** Vigas con refuerzo que toma todo el cortante: Fv = √f′m / 4 ≤ 1.1 MPa (Ec. D-1.5-10, D-72). */
export const FV_VIGA_CON_REFUERZO = { divisor: 4, maxMpa: 1.1 } as const;

/** Muros no reforzados: Fv = √f′m / 40 ≤ 0.56 MPa (Ec. D-1.5-12, D-72); incremento 0.2 fam (fam = esfuerzo por carga muerta). */
export const FV_MURO_NO_REFORZADO = { divisor: 40, maxMpa: 0.56, incrementoFam: 0.2 } as const;

/** Frontera entre las dos ramas de M/(Vd) de las ecuaciones D-1.5-13 a D-1.5-16 (D-73). */
export const MVD_UMBRAL = 1.0;

/**
 * Muros reforzados (D-1.5.7 b, D-73). Rama M/(Vd) < 1: Fv = (4 − M/Vd) √f′m / divisor ≤ (c0 − 0.3 M/Vd);
 * rama M/(Vd) ≥ 1: Fv = √f′m / divisor ≤ maxMpa.
 */
export const FV_MURO_REFORZADO = {
  /** La mampostería toma todo el cortante: Ec. D-1.5-13 y D-1.5-14. */
  mamposteria: {
    bajo: { coefMvd: 4, divisor: 40, c0: 0.6, c1: 0.3 },
    alto: { divisor: 12, maxMpa: 0.25 },
  },
  /** El refuerzo toma todo el cortante: Ec. D-1.5-15 y D-1.5-16. */
  refuerzo: {
    bajo: { coefMvd: 4, divisor: 24, c0: 0.84, c1: 0.3 },
    alto: { divisor: 8, maxMpa: 0.52 },
  },
} as const;

/** Separación máxima del refuerzo de cortante: 1.20 m y d/2 (D-1.5.6, D-1.5.8 y D-1.5.8.1, D-72/D-73). */
export const S_MAX_MM = 1200;
export const S_MAX_FRACCION_D = 0.5;

/** Esfuerzos admisibles en el refuerzo (D-1.5.10, D-73/D-74): Fs = coef · fy ≤ maxMpa. */
export type ClaveFs = 'corrugada-traccion' | 'lisa-traccion' | 'alambre-traccion' | 'columna-compresion' | 'flexion-corrugada-compresion' | 'flexion-lisa-compresion';

export const FS_ADMISIBLE: Record<ClaveFs, { coef: number; maxMpa: number; ecuacion: string; descripcion: string }> = {
  'corrugada-traccion': { coef: 0.5, maxMpa: 170, ecuacion: 'D-1.5-18', descripcion: 'Tracción (flexión o cortante), barras corrugadas' },
  'lisa-traccion': { coef: 0.4, maxMpa: 140, ecuacion: 'D-1.5-19', descripcion: 'Tracción (flexión o cortante), barras lisas' },
  'alambre-traccion': { coef: 0.5, maxMpa: 210, ecuacion: 'D-1.5-20', descripcion: 'Tracción (flexión o cortante), alambres' },
  'columna-compresion': { coef: 0.4, maxMpa: 170, ecuacion: 'D-1.5-21', descripcion: 'Compresión en columnas' },
  'flexion-corrugada-compresion': { coef: 0.5, maxMpa: 170, ecuacion: 'D-1.5-22', descripcion: 'Compresión en elementos a flexión, barras corrugadas (con refuerzo transversal de D.4.2)' },
  'flexion-lisa-compresion': { coef: 0.4, maxMpa: 140, ecuacion: 'D-1.5-23', descripcion: 'Compresión en elementos a flexión, barras lisas (con refuerzo transversal de D.4.2)' },
};

// --------------------------------------------------------------------------------------------------------------
// Tabla D-1.5-1 — Esfuerzos admisibles para tracción por flexión Ft de la mampostería con aparejo trabado (MPa)
// (D-71, PDF p.636). Verificada contra la imagen de la página.
// --------------------------------------------------------------------------------------------------------------

export type DireccionFt = 'perpendicular-junta-horizontal' | 'perpendicular-junta-vertical';
export type UnidadFt = 'maciza' | 'perforacion-vertical-sin-rellenar' | 'perforacion-vertical-rellena';
export type MorteroFt = 'cemento-cal' | 'cemento-mamposteria';
export type ClaseMortero = 'HMS' | 'N';

export interface FilaFt {
  direccion: DireccionFt;
  unidad: UnidadFt;
  /** Texto de la fila tal como aparece en la tabla. */
  etiqueta: string;
  /** Mortero de cemento pórtland y cal: tipos H, M o S | tipo N. */
  cementoCal: { HMS: number; N: number };
  /** Mortero de cemento para mampostería: tipos H, M o S | tipo N. */
  cementoMamposteria: { HMS: number; N: number };
}

export const TABLA_D151: readonly FilaFt[] = [
  { direccion: 'perpendicular-junta-horizontal', unidad: 'maciza', etiqueta: 'Unidades macizas', cementoCal: { HMS: 0.28, N: 0.21 }, cementoMamposteria: { HMS: 0.17, N: 0.1 } },
  { direccion: 'perpendicular-junta-horizontal', unidad: 'perforacion-vertical-sin-rellenar', etiqueta: 'Unidades de perforación vertical, sin rellenar', cementoCal: { HMS: 0.17, N: 0.13 }, cementoMamposteria: { HMS: 0.1, N: 0.06 } },
  { direccion: 'perpendicular-junta-horizontal', unidad: 'perforacion-vertical-rellena', etiqueta: 'Unidades de perforación vertical, rellenas con mortero de inyección', cementoCal: { HMS: 0.45, N: 0.43 }, cementoMamposteria: { HMS: 0.42, N: 0.4 } },
  { direccion: 'perpendicular-junta-vertical', unidad: 'maciza', etiqueta: 'Unidades macizas', cementoCal: { HMS: 0.55, N: 0.41 }, cementoMamposteria: { HMS: 0.33, N: 0.21 } },
  { direccion: 'perpendicular-junta-vertical', unidad: 'perforacion-vertical-sin-rellenar', etiqueta: 'Unidades de perforación vertical, sin rellenar', cementoCal: { HMS: 0.35, N: 0.26 }, cementoMamposteria: { HMS: 0.21, N: 0.13 } },
  { direccion: 'perpendicular-junta-vertical', unidad: 'perforacion-vertical-rellena', etiqueta: 'Unidades de perforación vertical, rellenas y parcialmente rellenas con mortero de inyección', cementoCal: { HMS: 0.55, N: 0.41 }, cementoMamposteria: { HMS: 0.33, N: 0.21 } },
];

/**
 * El texto de D-1.5.4 dice que con cemento de mampostería «dichos valores deben reducirse en un 50%», pero la tabla trae
 * columnas propias para ese mortero que no son exactamente la mitad (p. ej. 0.28 → 0.17; 0.45 → 0.42). Aquí se usan las
 * columnas de la tabla; la fracción se conserva solo para documentar la inconsistencia del original.
 */
export const REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA = 0.5;
