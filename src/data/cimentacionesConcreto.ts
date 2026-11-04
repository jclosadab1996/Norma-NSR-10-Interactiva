/**
 * Constantes y tablas del Capítulo C.15 (Cimentaciones) de la NSR-10. SI: MPa, kN, m, mm.
 * PDF = página impresa "C-n" + 302. Cada constante cita sección y página ("PDF p.X (C-n)"); lo transcrito se
 * contrastó con la imagen de la página del PDF.
 */

/* ------------------------------------------------------------------ */
/* C.15.4 — Momentos y refuerzo en zapatas                              */
/* ------------------------------------------------------------------ */

/**
 * Sección crítica para el momento máximo mayorado Mu (C.15.4.2, PDF p.443, C-141): en la cara de la columna, pedestal
 * o muro de concreto; a medio camino entre el eje y el borde del muro, para muros de albañilería; a medio camino entre
 * la cara de la columna y el borde de la platina de acero, para columnas con platina.
 */
export const SECCION_MOMENTO_FRACCION_PLATINA = 0.5;

/** Ec. 15-1 (C.15.4.4.2, PDF p.444, C-142): γs = 2/(β + 1), β = lado largo / lado corto de la zapata. */
export const GAMMA_S_NUMERADOR = 2;

/* ------------------------------------------------------------------ */
/* C.15.5 — Cortante                                                    */
/* ------------------------------------------------------------------ */

/** Reacción de un pilote con centro a dpile/2 o más fuera de la sección: produce todo el cortante; a dpile/2 o más dentro: cero; en medio, interpolación lineal (C.15.5.4.1–3, PDF p.444, C-142). */
export const PILOTE_CORTANTE_FRACCION_DPILE = 0.5;
/** Cabezal de pilotes: si la distancia eje pilote–eje columna es mayor que 2× la distancia entre la parte superior del cabezal y la parte superior del pilote se aplica C.11.11 y C.15.5.4 (C.15.5.3, PDF p.444, C-142). */
export const CABEZAL_RELACION_DISTANCIA = 2;

/* ------------------------------------------------------------------ */
/* C.15.7 — Altura mínima                                               */
/* ------------------------------------------------------------------ */

/** Altura mínima de la zapata sobre el refuerzo inferior: 150 mm sobre suelo, 300 mm sobre pilotes (C.15.7, PDF p.445, C-143). */
export const ALTURA_MIN_SOBRE_REFUERZO_MM = { suelo: 150, pilotes: 300 } as const;

/** Recubrimiento mínimo del refuerzo en concreto colocado contra el suelo y expuesto permanentemente a él: 75 mm (C.7.7.1(a), PDF p.355, C-53). */
export const RECUBRIMIENTO_CONTRA_SUELO_MM = 75;

/* ------------------------------------------------------------------ */
/* C.15.8 — Transmisión de fuerzas en la base de la columna            */
/* ------------------------------------------------------------------ */

/** φ del aplastamiento en el concreto: 0.65 (C.9.3.2.4, PDF p.370, C-68). */
export const PHI_APLASTAMIENTO = 0.65;
/** Resistencia al aplastamiento: φ (0.85 f′c A1) (C.10.14.1, PDF p.387, C-85). */
export const APLASTAMIENTO_COEF = 0.85;
/** Factor máximo de √(A2/A1) cuando el soporte es más ancho en todos los lados que el área cargada (C.10.14.1, PDF p.387, C-85). */
export const APLASTAMIENTO_FACTOR_MAX = 2;
/** Pendiente de los lados del tronco que define A2: 1 vertical por 2 horizontal (A2, Notación C.2, PDF p.308, C-6). */
export const A2_PENDIENTE_HORIZONTAL_POR_VERTICAL = 2;

/** Área mínima de refuerzo a través de la interfaz columna–zapata (colocada en obra): 0.005 Ag del elemento soportado (C.15.8.2.1, PDF p.445, C-143). */
export const AS_MIN_INTERFAZ_FRACCION_AG = 0.005;
/** Los pasadores (dowels) no pueden ser mayores que barras No. 36 (C.15.8.2.3, PDF p.445, C-143). */
export const DOWEL_BARRA_MAX = 'No. 36';
/** Barras No. 43 y No. 57 de la columna pueden empalmarse por traslapo con dowels solo en compresión (C.15.8.2.3, PDF p.445, C-143). */
export const BARRAS_EMPALME_CON_DOWELS = ['No. 43', 'No. 57'] as const;

/* ------------------------------------------------------------------ */
/* C.15.10 — Zapatas combinadas y losas de cimentación                 */
/* ------------------------------------------------------------------ */

/** Separación máxima del refuerzo mínimo en losas de cimentación no preesforzadas: 450 mm (C.15.10.4, PDF p.446, C-144). */
export const LOSA_CIMENTACION_SEPARACION_MAX_MM = 450;

/* ------------------------------------------------------------------ */
/* C.15.11 — Pilotes y cajones                                          */
/* ------------------------------------------------------------------ */

/** Coeficientes de los esfuerzos axiales máximos sobre el pilote (C.15.11.3, PDF p.446–447, C-144/C-145). */
export const PILOTE_LIMITES_AXIALES = {
  /** Ec. C.15-2: D + L ≤ 0.25 f′c Ag. */
  c152: { factorD: 1, factorL: 1, limite: 0.25 },
  /** Ec. C.15-3: 1.2 D + 1.6 L ≤ 0.35 f′c Ag. */
  c153: { factorD: 1.2, factorL: 1.6, limite: 0.35 },
  /** Ec. C.15-4: D + L + 0.7 E ≤ 0.33 f′c Ag. */
  c154: { factorD: 1, factorL: 1, factorE: 0.7, limite: 0.33 },
  /** Ec. C.15-5: 1.2 D + 1.0 L + 1.0 E ≤ 0.35 f′c Ag. */
  c155: { factorD: 1.2, factorL: 1, factorE: 1, limite: 0.35 },
  /** Ec. C.15-6: −1.0 D + E ≤ 0.9 fy Ast (tracción por levantamiento). */
  c156: { factorD: -1, factorE: 1, coefAst: 0.9 },
} as const;

export type CapacidadDisipacion = 'DMI' | 'DMO-DES';

/**
 * Tabla C.15.11-1 (PDF p.447, C-145): cuantías mínimas longitudinales y transversales en pilotes y cajones
 * vaciados en sitio. DMI = capacidad mínima; "DMO-DES" = capacidad moderada o especial de disipación de energía.
 */
export const TABLA_C15111: Record<
  CapacidadDisipacion,
  {
    fcMinMPa: number;
    cuantiaLongitudinalMin: number;
    barrasLongitudinalesMin: number;
    longitudRefuerzo: string;
    longitudRefuerzoFraccion: number;
    longitudRefuerzoMinM: number;
    estribos: string;
    estriboSeparacionZonaSuperiorMm: number;
    estriboZonaSuperiorMm: number;
    estriboSeparacionDiametros: number;
  }
> = {
  DMI: {
    fcMinMPa: 17.5,
    cuantiaLongitudinalMin: 0.0025,
    barrasLongitudinalesMin: 4,
    longitudRefuerzo: 'tercio superior de la longitud del pilote, pero no menos de 4 m',
    longitudRefuerzoFraccion: 1 / 3,
    longitudRefuerzoMinM: 4,
    estribos: 'No. 2 (1/4") ó 6M (6 mm) para pilotes hasta de 500 mm de diámetro y No. 3 (3/8") ó 10M (10 mm) para pilotes de más de 500 mm de diámetro',
    estriboSeparacionZonaSuperiorMm: 100,
    estriboZonaSuperiorMm: 600,
    estriboSeparacionDiametros: 16,
  },
  'DMO-DES': {
    fcMinMPa: 17.5,
    cuantiaLongitudinalMin: 0.005,
    barrasLongitudinalesMin: 4,
    longitudRefuerzo: 'mitad superior de la longitud del pilote, pero no menos de 6 m',
    longitudRefuerzoFraccion: 1 / 2,
    longitudRefuerzoMinM: 6,
    estribos: 'No. 3 (3/8") ó 10M (10 mm) para pilotes hasta de 750 mm de diámetro y No. 4 (1/2") ó 12M (12 mm) para pilotes de más de 750 mm de diámetro',
    estriboSeparacionZonaSuperiorMm: 75,
    estriboZonaSuperiorMm: 1200,
    estriboSeparacionDiametros: 16,
  },
};

/** Cuantías y límites de otros tipos de pilote (C.15.11.5.2 a C.15.11.5.6, PDF p.447–448, C-145/C-146). */
export const PILOTES_OTROS = {
  /** Tubería rellena de concreto: ρ longitudinal ≥ 0.01 en la parte superior, por 2 veces la longitud de anclaje (C.15.11.5.3). */
  tuberiaRellena: { cuantiaMin: 0.01, longitudVecesAnclaje: 2 },
  /** Prefabricado reforzado: ρ ≥ 0.01 en toda la longitud; estribos mín. No. 2 (6 mm), 100 mm en los 600 mm superiores y 16 db en el resto; f′c ≥ 21 MPa antes del hincado; en DES, espiral con ρs ≥ 0.006 (C.15.11.5.4). */
  prefabricadoReforzado: { cuantiaMin: 0.01, separacionSuperiorMm: 100, zonaSuperiorMm: 600, separacionDiametros: 16, fcHincadoMinMPa: 21, rhoEspiralDesMin: 0.006 },
  /** Prefabricado preesforzado: estribos mín. No. 3 (10 mm), 100 mm en los 600 mm superiores; f′c ≥ 28 MPa antes del hincado (C.15.11.5.5). */
  prefabricadoPreesforzado: { separacionSuperiorMm: 100, zonaSuperiorMm: 600, fcHincadoMinMPa: 28 },
  /** Perfil laminado de acero en DES: conexión capaz de resistir tracción = 10 % de la capacidad a compresión del pilote (C.15.11.5.6). */
  perfilAceroDesTraccionFraccion: 0.1,
  /** Camisa de acero calibre N° 14 (14 gauge) o mayor, espiral electrosoldada, reemplaza el confinamiento de estribos (C.15.11.5.2). */
  camisaCalibreMin: 14,
} as const;

/* ------------------------------------------------------------------ */
/* C.15.13 — Vigas de amarre                                            */
/* ------------------------------------------------------------------ */

/** Dimensión mayor de la viga de amarre ≥ luz / divisor (C.15.13.3.1, PDF p.448, C-146): DES 20, DMO 30, DMI 40. */
export const VIGA_AMARRE_DIVISOR_LUZ = { DES: 20, DMO: 30, DMI: 40 } as const;
/** Estribos cerrados en toda la longitud con separación ≤ mitad de la menor dimensión de la sección ó 300 mm (C.15.13.4, PDF p.448, C-146). */
export const VIGA_AMARRE_ESTRIBOS = { fraccionMenorDimension: 0.5, maximoMm: 300 } as const;
