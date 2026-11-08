/**
 * Constantes y tablas de la resistencia de muros de mampostería estructural (Título D de la NSR-10, D.5.1 y D.5.5–D.5.8).
 * Unidades del SI: MPa, mm, N. PDF = página impresa "D-n" + 565.
 * Las usa `src/lib/nsr10/mamposteria.ts`; el capítulo D.5b (d5b.mdx) y las calculadoras de muros importan de aquí.
 */

/** Máxima deformación unitaria utilizable de la mampostería, εmu = 0.003 (D.5.1.6.5, D-33, PDF p.598). */
export const EPS_MU = 0.003;

/** Factor de la intensidad del bloque rectangular: esfuerzo uniforme 0.80 f′m (D.5.1.6.6 a, D-33). */
export const FACTOR_BLOQUE_FM = 0.8;

/** Relación a/c del bloque equivalente: a = 0.85 c (D.5.1.6.6 b, D-33). */
export const RELACION_A_C = 0.85;

/** Fracción de f′m aplicada a (Ae − Ast) en la Ec. D.5.5-1 (D.5.5.1, D-37, PDF p.602). */
export const FACTOR_PO_FM = 0.8;

/** Factor de Pn = 0.80 Po Re (Ec. D.5.5-3, D.5.5.3, D-37). */
export const FACTOR_PN_PO = 0.8;

/** Límite de h′/t de las dos ramas de Re (Ec. D.5.5-2, D-37). */
export const ESBELTEZ_CAMBIO_RE = 30;

/** Constantes de Re: Re = 1 − (h′/(42 t))² y Re = (21 t / h′)² (Ec. D.5.5-2). */
export const RE_DIVISOR_RAMA_BAJA = 42;
export const RE_NUMERADOR_RAMA_ALTA = 21;

/** Máxima relación h′/t en muros estructurales (D.5.4.3.1, D-36, PDF p.601). */
export const ESBELTEZ_MAXIMA_MURO = 25;

/** Coeficientes de reducción de resistencia φ de D.5.1.5 (D-32 y D-33, PDF p.597–598). */
export const PHI = {
  /** D.5.1.5.1: efectos gravitacionales solos o con fuerzas horizontales perpendiculares al plano del muro. */
  perpendicular: { flexionYFlexoCompresion: 0.8, cortante: 0.6 },
  /** D.5.1.5.2: fuerzas paralelas al plano del muro. */
  paralelo: {
    flexion: 0.85,
    compresionYFlexoCompresion: 0.6,
    cortante: 0.6,
    /** Si la resistencia nominal a cortante excede el cortante asociado a Mn (D.5.1.5.2 c). */
    cortanteMayorQueFlexion: 0.85,
    /** Tope de la rampa lineal para refuerzo simétrico con fy ≤ 420 MPa. */
    rampaMaxima: 0.85,
  },
  /** D.5.1.5.3: esfuerzos de aplastamiento. */
  aplastamiento: 0.6,
} as const;

/** Se puede subir φ linealmente a 0.85 solo si fy no excede 420 MPa y el refuerzo es simétrico (D.5.1.5.2 b). */
export const FY_MAX_RAMPA_PHI = 420;

/** Coeficientes de la rampa: umbral = 0.10 f′m Ae ó 0.25 Pb (D.5.1.5.2 b, D-33). */
export const UMBRAL_RAMPA_FM_AE = 0.1;
export const UMBRAL_RAMPA_PB = 0.25;

/** Umbral de carga axial para los muros fuera de su plano: 0.10 f′m Ae (D.5.7.2 y D.5.7.3, D-38/D-39). */
export const UMBRAL_AXIAL_FUERA_PLANO = 0.1;

/** Esbeltez máxima del muro fuera de su plano con Pu > 0.10 f′m Ae (D.5.7.3, D-39). */
export const ESBELTEZ_MAX_CARGA_ALTA = 30;

/** Cuantía máxima de flexión del muro fuera de su plano: ρ ≤ 0.5 ρb (D.5.7.2, D-38). */
export const FRACCION_RHO_B_FUERA_PLANO = 0.5;

/** Fórmula simple de D.5.6.2: válida si ρ < 0.75 ρb (D-38). */
export const FRACCION_RHO_B_FLEXION_SIMPLE = 0.75;

/** Divisor de la Ec. D.5.7-7: Vn = (1/6) Amv √f′m. */
export const DIVISOR_VN_FUERA_PLANO = 6;

/** Coeficiente α de Mn ≥ α Mcr (Ec. D.5.8-1, D-39, PDF p.604). */
export const ALPHA_MCR = {
  'inyectada-total': 1.8,
  'inyectada-solo-refuerzo': 3.0,
  'cavidad-reforzada': 3.0,
} as const;
export type TipoInyeccion = keyof typeof ALPHA_MCR;

/** Factor de eficiencia η del refuerzo horizontal de cortante (D.5.8.4.3, D-41, PDF p.606). */
export const ETA_REFUERZO = { embebido: 0.7, junta: 0.35 } as const;
export type TipoRefuerzoCortante = keyof typeof ETA_REFUERZO;

/** Separación máxima del refuerzo horizontal en la región de articulación plástica: 3 t y 600 mm (D.5.8.4.1, D-41). */
export const SEPARACION_ARTICULACION = { veces_t: 3, maxMm: 600 } as const;

/** Elementos de borde (D.5.8.5, D-42, PDF p.607): umbrales de esfuerzo en la fibra extrema, múltiplos de f′m. */
export const BORDE = {
  reforzada: 0.2,
  'cavidad-reforzada': 0.2,
  'parcialmente-reforzada': 0.3,
  /** Se pueden suspender donde el esfuerzo sea inferior a 0.15 f′m (pero no antes de una altura ℓw). */
  suspension: 0.15,
  estriboMm: 10,
  separacionEstribosMm: 200,
  celdaMinMm: 100,
} as const;
export type TipoMamposteriaBorde = 'reforzada' | 'cavidad-reforzada' | 'parcialmente-reforzada';

// --------------------------------------------------------------------------------------------------------------
// Tabla D.5.8-1 — Módulo de ruptura fr (MPa)  (D-40, PDF p.605)
// --------------------------------------------------------------------------------------------------------------

export type ClaveRuptura =
  | 'horizontal-maciza'
  | 'horizontal-vp-sin-rellenar'
  | 'horizontal-vp-rellena'
  | 'vertical-maciza'
  | 'vertical-vp-sin-rellenar'
  | 'vertical-vp-rellena';

export interface FilaRuptura {
  clave: ClaveRuptura;
  /** Dirección de los esfuerzos de tracción por flexión respecto de las juntas. */
  direccion: 'perpendicular a las juntas horizontales' | 'perpendicular a la junta vertical';
  tipo: string;
  /** Mortero de cemento portland y cal (H, M o S | N) y mortero de cemento para mampostería (H, M o S | N). */
  cementoCal: { HMS: number; N: number };
  cementoMamposteria: { HMS: number; N: number };
}

export const TABLA_D581: readonly FilaRuptura[] = [
  { clave: 'horizontal-maciza', direccion: 'perpendicular a las juntas horizontales', tipo: 'Unidades macizas', cementoCal: { HMS: 0.69, N: 0.52 }, cementoMamposteria: { HMS: 0.41, N: 0.26 } },
  { clave: 'horizontal-vp-sin-rellenar', direccion: 'perpendicular a las juntas horizontales', tipo: 'Unidades de perforación vertical sin rellenar', cementoCal: { HMS: 0.43, N: 0.33 }, cementoMamposteria: { HMS: 0.26, N: 0.16 } },
  { clave: 'horizontal-vp-rellena', direccion: 'perpendicular a las juntas horizontales', tipo: 'Unidades de perforación vertical rellenas con mortero de inyección', cementoCal: { HMS: 1.12, N: 1.09 }, cementoMamposteria: { HMS: 1.06, N: 1.0 } },
  { clave: 'vertical-maciza', direccion: 'perpendicular a la junta vertical', tipo: 'Unidades macizas', cementoCal: { HMS: 1.38, N: 1.03 }, cementoMamposteria: { HMS: 0.83, N: 0.52 } },
  { clave: 'vertical-vp-sin-rellenar', direccion: 'perpendicular a la junta vertical', tipo: 'Unidades de perforación vertical sin rellenar', cementoCal: { HMS: 0.86, N: 0.66 }, cementoMamposteria: { HMS: 0.52, N: 0.33 } },
  { clave: 'vertical-vp-rellena', direccion: 'perpendicular a la junta vertical', tipo: 'Unidades de perforación vertical rellenas y parcialmente rellenas', cementoCal: { HMS: 1.38, N: 1.03 }, cementoMamposteria: { HMS: 0.83, N: 0.52 } },
];

// --------------------------------------------------------------------------------------------------------------
// Tablas D.5.8-2 y D.5.8-3 — coeficientes en función de Mu/(Vu d)   (D-41 y D-42, PDF p.606–607)
// --------------------------------------------------------------------------------------------------------------

/** Límites de las tres bandas de Mu/(Vu d): ≤ 0.25, entre 0.25 y 1.00, ≥ 1.00. */
export const BANDA_MVD = { inferior: 0.25, superior: 1.0 } as const;

/**
 * Tabla D.5.8-2: Vm = [c0 − c1·Mu/(Vud)] Amv √f′m + 0.25 Pu.
 * Banda baja: 0.30; banda intermedia: 0.33 − 0.13 Mu/(Vud); banda alta: 0.20.
 */
export const TABLA_D582 = {
  bajo: 0.3,
  intermedio: { a: 0.33, b: 0.13 },
  alto: 0.2,
  coefPu: 0.25,
} as const;

/**
 * Tabla D.5.8-3: valor máximo de Vn = [c0 − c1·Mu/(Vud)] Amv √f′m.
 * Banda baja: 0.50; banda intermedia: 0.56 − 0.23 Mu/(Vud); banda alta: 0.33.
 */
export const TABLA_D583 = {
  bajo: 0.5,
  intermedio: { a: 0.56, b: 0.23 },
  alto: 0.33,
} as const;

/** Fracción de ℓw que se toma como d en ausencia de un análisis de compatibilidad: d = 0.8 ℓw (D.5.8.4.2, D-41). */
export const D_SOBRE_LW = 0.8;
