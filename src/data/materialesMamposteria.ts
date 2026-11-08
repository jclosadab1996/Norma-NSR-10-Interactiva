/**
 * Constantes y tablas del Capítulo D.3 (Calidad de los materiales en la mampostería estructural) de la NSR-10.
 * SI: MPa, mm, kN. PDF = página impresa "D-n" + 565. Cada constante cita su sección y página.
 * Las tablas se transcribieron de la imagen de la página (no del texto extraído).
 */

export type TipoUnidad = 'concreto' | 'arcilla' | 'silicocalcarea';

/** Etiquetas de los tipos de unidad (D.3.6.1). */
export const ETIQUETA_UNIDAD: Record<TipoUnidad, string> = {
  concreto: 'Concreto',
  arcilla: 'Arcilla cocida (cerámica)',
  silicocalcarea: 'Sílico-calcárea',
};

/** kp: factor de corrección por absorción de la unidad (D.3.0, PDF p.578, D-13): 1.4 concreto; 0.8 arcilla o sílico-calcárea. */
export const KP: Record<TipoUnidad, number> = { concreto: 1.4, arcilla: 0.8, silicocalcarea: 0.8 };

/** kr: factor de corrección por absorción en mampostería inyectada (D.3.0, PDF p.578, D-13): 0.9 concreto; 0.75 arcilla o sílico-calcárea. */
export const KR: Record<TipoUnidad, number> = { concreto: 0.9, arcilla: 0.75, silicocalcarea: 0.75 };

/* ---------- Tabla D.3.7-1: factor de corrección por esbeltez del murete (D.3.7.2.5, PDF p.583, D-18) ---------- */

/** Pares (relación altura/espesor del murete, factor de corrección) de la Tabla D.3.7-1. */
export const TABLA_D371: ReadonlyArray<{ relacion: number; factor: number }> = [
  { relacion: 1.5, factor: 0.86 },
  { relacion: 2.0, factor: 1.0 },
  { relacion: 2.5, factor: 1.04 },
  { relacion: 3.0, factor: 1.07 },
  { relacion: 4.0, factor: 1.15 },
  { relacion: 5.0, factor: 1.22 },
];

/** Relación altura/ancho permitida en los muretes: 1.5 ≤ h/t ≤ 5 (D.3.7.2.4, PDF p.583, D-18). */
export const RELACION_MURETE = { min: 1.5, max: 5 } as const;
/** Altura mínima del murete: 300 mm; largo mínimo: una pieza completa (bloque de perforación vertical) u otros tipos 100 mm (D.3.7.2.4). */
export const MURETE_DIMENSIONES = { alturaMinMm: 300, largoMinOtrosMm: 100, nMuretesPorMuestra: 3 } as const;
/** El f′m de una muestra no debe exceder el 125 % del menor valor de los 3 muretes (D.3.7.2.2, PDF p.583, D-18). */
export const FACTOR_MAX_SOBRE_MENOR = 1.25;

/* ---------- D.3.7.3 y D.3.7.4: determinación estadística / experimental ---------- */

/** Coeficiente de variación máximo (30 %) para usar registros históricos (D.3.7.3, PDF p.583, D-18). */
export const CV_MAX_HISTORICO = 0.3;

export type OrigenEstadistico = 'historico' | 'previo';

/**
 * Fracción del promedio que se toma como f′m según el número de ensayos.
 * Históricos (D.3.7.3.1–3): n ≥ 30 → 0.75; 10 ≤ n ≤ 30 → 0.70; n < 10 → no se permite.
 * Previos a la obra (D.3.7.4.1–3): n ≥ 30 → 0.85; 10 < n < 30 → 0.80; 3 ≤ n < 10 → 0.75.
 */
export const FRACCION_ESTADISTICA = {
  historico: { n30: 0.75, n10: 0.7 },
  previo: { n30: 0.85, n10: 0.8, n3: 0.75 },
} as const;
/** Umbrales de número de ensayos usados en D.3.7.3 y D.3.7.4. */
export const UMBRAL_N = { medio: 10, alto: 30, minimoPrevio: 3 } as const;

/* ---------- D.3.7.5 y D.3.7.6: f′m basado en la calidad de los materiales ---------- */

/** Ec. D.3.7-1: Rm = 2h/(75+3h) f′cu + 50 kp/(75+3h) f′cp ≤ 0.8 f′cu (h en mm). */
export const RM = { coefAltura: 2, coefMortero: 50, base: 75, factorAltura: 3, limiteSobreFcu: 0.8 } as const;
/** Ec. D.3.7-2: f′m = 0.75 Rm. */
export const FACTOR_FM_SOBRE_RM = 0.75;
/** Ec. D.3.7-3: f′m = 0.75 [r Rm + 0.9 kr (1 − r) f′cr] ≤ 0.94 Rm. */
export const FM_INYECTADO = { factor: 0.75, coefRelleno: 0.9, limiteSobreRm: 0.94 } as const;

/* ---------- Tabla D.3.4-1: morteros de pega (D.3.4.1, PDF p.579, D-14) ---------- */

export type TipoMortero = 'H' | 'M' | 'S' | 'N';

export type DosificacionPega = {
  /** Partes de cemento portland. */
  portland: number;
  /** Partes de cal hidratada (rango mín–máx; null si no aplica). */
  cal: { min: number; max: number } | null;
  /** Partes de cemento para mampostería (null si no aplica). */
  cementoMamposteria: number | null;
  /** Relación arena / material cementante (la cal no se cuenta como cementante). */
  arena: { min: number; max: number };
};

export type MorteroPega = {
  tipo: TipoMortero;
  /** Resistencia mínima a compresión a 28 días en cubos de 50 mm (MPa), f′cp. */
  fcpMin: number;
  /** Flujo en % (ensayo NTC 4050 / ASTM C91). */
  flujo: { min: number; max: number };
  /** Retención mínima de agua, %. */
  retencionMin: number;
  /** Alternativas de dosificación por proporción. */
  dosificaciones: DosificacionPega[];
};

export const TABLA_D341: readonly MorteroPega[] = [
  {
    tipo: 'H',
    fcpMin: 22.5,
    flujo: { min: 115, max: 125 },
    retencionMin: 75,
    dosificaciones: [{ portland: 1, cal: { min: 0.25, max: 0.25 }, cementoMamposteria: null, arena: { min: 2.0, max: 2.5 } }],
  },
  {
    tipo: 'M',
    fcpMin: 17.5,
    flujo: { min: 115, max: 125 },
    retencionMin: 75,
    dosificaciones: [
      { portland: 1, cal: { min: 0.25, max: 0.25 }, cementoMamposteria: null, arena: { min: 2.25, max: 3.0 } },
      { portland: 1, cal: null, cementoMamposteria: 1, arena: { min: 2.25, max: 2.5 } },
    ],
  },
  {
    tipo: 'S',
    fcpMin: 12.5,
    flujo: { min: 110, max: 120 },
    retencionMin: 75,
    dosificaciones: [
      { portland: 1, cal: { min: 0.25, max: 0.5 }, cementoMamposteria: null, arena: { min: 2.5, max: 3.5 } },
      { portland: 0.5, cal: null, cementoMamposteria: 1, arena: { min: 2.5, max: 3.0 } },
    ],
  },
  {
    tipo: 'N',
    fcpMin: 7.5,
    flujo: { min: 105, max: 115 },
    retencionMin: 75,
    dosificaciones: [
      { portland: 1, cal: { min: 0.5, max: 1.25 }, cementoMamposteria: null, arena: { min: 3.0, max: 4.5 } },
      { portland: 0, cal: null, cementoMamposteria: 1, arena: { min: 3.0, max: 4.0 } },
    ],
  },
];

/** Probeta de referencia del mortero de pega: cubos de 50 mm de lado a 28 días (D.3.4.2). */
export const MORTERO_PEGA_PROBETA = { cuboMm: 50, cilindroMm: { diametro: 75, altura: 150 }, edadDias: 28 } as const;
/** Tiempo máximo de uso del mortero de pega mezclado en seco en obra: 2.5 h (D.3.4.7.1, PDF p.580, D-15). */
export const MORTERO_PEGA_HORAS_MAX = 2.5;

/* ---------- Tabla D.3.5-1: morteros de relleno (D.3.5.2, PDF p.580, D-15) ---------- */

export type MorteroRelleno = {
  tipo: 'Fino' | 'Grueso';
  portland: number;
  /** Agregado fino / cemento (partes por volumen). */
  fino: { min: number; max: number };
  /** Agregado grueso (tamaño < 10 mm) / cemento; null para el mortero fino. */
  grueso: { min: number; max: number } | null;
};

export const TABLA_D351: readonly MorteroRelleno[] = [
  { tipo: 'Fino', portland: 1, fino: { min: 2.25, max: 3.5 }, grueso: null },
  { tipo: 'Grueso', portland: 1, fino: { min: 2.25, max: 3.0 }, grueso: { min: 1.0, max: 2.0 } },
];

/** Límites de f′cr (D.3.5.3, PDF p.580, D-15): entre 1.25 y 1.5 veces f′m, y nunca menor de 12.5 MPa. */
export const RELLENO_LIMITES = { minSobreFm: 1.25, maxSobreFm: 1.5, absolutoMinMpa: 12.5 } as const;
/** Cal en mortero de relleno: máximo 10 % del volumen de cemento (D.3.5.4, PDF p.581, D-16). */
export const RELLENO_CAL_MAX = 0.1;

/* ---------- Tabla D.3.6-1: espesores mínimos de paredes de bloques de perforación vertical (mm) ---------- */

export type EspesoresParedes = {
  /** Espesor externo nominal del bloque. */
  nominal: number;
  /** Pared exterior sin perforaciones verticales secundarias. */
  exteriorSin: number;
  /** Pared exterior con perforaciones verticales secundarias. */
  exteriorCon: number;
  /** Tabique transversal sin perforaciones verticales secundarias. */
  tabique: number;
};

export const TABLA_D361: readonly EspesoresParedes[] = [
  { nominal: 80, exteriorSin: 20, exteriorCon: 30, tabique: 20 },
  { nominal: 100, exteriorSin: 20, exteriorCon: 30, tabique: 20 },
  { nominal: 120, exteriorSin: 22, exteriorCon: 32, tabique: 20 },
  { nominal: 150, exteriorSin: 25, exteriorCon: 35, tabique: 25 },
  { nominal: 200, exteriorSin: 30, exteriorCon: 40, tabique: 25 },
  { nominal: 250, exteriorSin: 35, exteriorCon: 45, tabique: 30 },
  { nominal: 300, exteriorSin: 40, exteriorCon: 50, tabique: 30 },
];
/** Nota (1) de la Tabla D.3.6-1: la unidad de 80 mm solo se permite en muros no estructurales y paredes laterales de mampostería de cavidad. */
export const ESPESOR_NOMINAL_SOLO_NO_ESTRUCTURAL = 80;

/** Límites geométricos de las unidades de perforación vertical (D.3.6.4.1–2, PDF p.582, D-17). */
export const UNIDAD_PERFORACION_VERTICAL = {
  areaCeldasMaxFraccion: 0.65,
  celdaConRefuerzoMinDimMm: 50,
  celdaConRefuerzoMinAreaMm2: 3000,
  perforacionSecundariaMaxMm: 20,
  perforacionSecundariaDistBordeMinMm: 10,
} as const;
/** Una unidad es sólida si sus cavidades ocupan menos del 25 % del volumen de la pieza (D.3.6.1, PDF p.581, D-16). */
export const UNIDAD_SOLIDA_CAVIDADES_MAX = 0.25;

/* ---------- D.3.8: evaluación y aceptación ---------- */

/** Ningún resultado individual puede ser inferior al 80 % de la resistencia especificada (D.3.8.2.1, PDF p.585, D-20). */
export const ACEPTACION = {
  minIndividualFraccion: 0.8,
  nucleosPorLote: 3,
  nucleosPromedioMinFraccion: 0.8,
} as const;

/** Frecuencias mínimas de muestreo (D.3.8.1, PDF p.584–585, D-19/D-20). */
export const FRECUENCIAS_MUESTREO = {
  /** Mortero de pega: 1 ensayo (promedio de 3 probetas) por cada 200 m² de muro o por cada día de pega. */
  morteroPegaM2: 200,
  /** Mortero de relleno: 1 ensayo (promedio de 3 probetas) por cada 10 m³ inyectados o por cada día de inyección. */
  morteroRellenoM3: 10,
  /** Unidades: al menos 5 por lote de hasta 5000 unidades, y no menos de 1 por cada 200 m² de muro. */
  unidadesPorLote: 5,
  unidadesLoteMax: 5000,
  unidadesM2: 200,
  /** Muretes: al menos 3 por cada 500 m² de muro o fracción. */
  muretesPorGrupo: 3,
  muretesM2: 500,
  /** Muretes inyectados: no menos del 50 % del total de especímenes (unidades de perforación vertical). */
  muretesInyectadosMinFraccion: 0.5,
} as const;
