/**
 * Constantes y tablas del Capítulo D.5 (Requisitos generales de análisis y diseño), partes D.5.1 a D.5.4, de la NSR-10.
 * SI: MPa, mm. PDF = página impresa "D-n" + 565. Cada constante cita su sección y página.
 * Verificadas contra la imagen de las páginas D-31 a D-37 (PDF 596-602).
 */

/* ---------- D.5.1.5: coeficientes de reducción de resistencia φ ---------- */

/** φ del método de resistencia (D.5.1.5, PDF p.597-598, D-32 y D-33). */
export const PHI_MAMPOSTERIA = {
  /** D.5.1.5.1(a): flexión y flexo-compresión, gravedad y fuerzas perpendiculares al plano. */
  perpendicularFlexion: 0.8,
  /** D.5.1.5.1(b): cortante, gravedad y fuerzas perpendiculares al plano. */
  perpendicularCortante: 0.6,
  /** D.5.1.5.2(a): flexión con fuerzas paralelas al plano. */
  enPlanoFlexion: 0.85,
  /** D.5.1.5.2(b): compresión y flexo-compresión con fuerzas paralelas al plano. */
  enPlanoCompresion: 0.6,
  /** D.5.1.5.2(c): cortante con fuerzas paralelas al plano. */
  enPlanoCortante: 0.6,
  /** D.5.1.5.2(c): cortante, valor máximo cuando Vn excede el cortante asociado a Mn. */
  enPlanoCortanteMaximo: 0.85,
  /** D.5.1.5.3: aplastamiento. */
  aplastamiento: 0.6,
} as const;

/** Tope al que φ puede subir linealmente en muros con refuerzo simétrico y fy ≤ 420 MPa (D.5.1.5.2(b), PDF p.598, D-33). */
export const PHI_ENPLANO_FLEXOCOMPRESION_MAX = 0.85;
/** fy máximo para aplicar el incremento lineal de φ (D.5.1.5.2(b), PDF p.598, D-33). */
export const FY_MAX_INCREMENTO_PHI = 420;
/** Factor de Pb: 0.10 f′m Ae ó 0.25 Pb marcan el inicio del incremento de φ (D.5.1.5.2(b), PDF p.598, D-33). */
export const LIMITES_INCREMENTO_PHI = { factorFmAe: 0.1, factorPb: 0.25 } as const;

/* ---------- D.5.1.6: suposiciones de diseño ---------- */

/** Deformación unitaria máxima de la mampostería εmu (D.5.1.6.5, PDF p.598, D-33). */
export const EPSILON_MU = 0.003;
/** Intensidad del bloque rectangular de esfuerzos: 0.80 f′m (D.5.1.6.6(a), PDF p.598, D-33). */
export const FACTOR_BLOQUE_FM = 0.8;
/** Relación a/c del bloque equivalente: a = 0.85 c (D.5.1.6.6(b), PDF p.598, D-33). */
export const FACTOR_A_SOBRE_C = 0.85;

/* ---------- D.5.2: módulos de elasticidad y de cortante ---------- */

/** Es = 200 000 MPa (Ec. D.5.2-1, PDF p.599, D-34). */
export const ES_ACERO_MPA = 200000;
/** Em = 900 f′m ≤ 20 000 MPa, mampostería de concreto (Ec. D.5.2-2, PDF p.599, D-34). */
export const COEF_EM_CONCRETO = 900;
/** Em = 750 f′m ≤ 20 000 MPa, mampostería de arcilla (Ec. D.5.2-3, PDF p.599, D-34). */
export const COEF_EM_ARCILLA = 750;
/** Tope de Em en las Ec. D.5.2-2 y D.5.2-3 (PDF p.599, D-34). */
export const EM_MAX_MPA = 20000;
/** Er = 2500 √f′cr ≤ 20 000 MPa, mortero de relleno (Ec. D.5.2-4, PDF p.599, D-34). */
export const COEF_ER = 2500;
/** Tope de Er en la Ec. D.5.2-4 (PDF p.599, D-34). */
export const ER_MAX_MPA = 20000;
/** Gm = 0.4 Em (Ec. D.5.2-5, PDF p.599, D-34). */
export const RAZON_GM_EM = 0.4;
/** Gr = 0.5 Er (Ec. D.5.2-6, PDF p.599, D-34). */
export const RAZON_GR_ER = 0.5;
/** Pendiente secante del ensayo de murete: desde 0.05 f′m hasta 0.33 f′m (D.5.2.1.2, PDF p.599, D-34). */
export const SECANTE_EM = { desde: 0.05, hasta: 0.33 } as const;

/* ---------- D.5.3: cargas ---------- */

/** Ancho efectivo de aleta a cada lado (T, I) o a un solo lado (L, Z, C) ≤ 6 veces el espesor del muro intersectado (D.5.3.2.1, PDF p.600, D-35). */
export const FACTOR_ALETA = 6;
/** Aplastamiento en aparejo trabado: longitud ≤ ancho de la pieza soportada + 4 veces el espesor del apoyo (D.5.3.3(a), PDF p.600, D-35). */
export const FACTOR_LONGITUD_APLASTAMIENTO = 4;
/** Esfuerzo de aplastamiento ≤ φ 0.85 f′m (D.5.3.3(b), PDF p.600, D-35). */
export const FACTOR_APLASTAMIENTO_FM = 0.85;
/** Ángulo de dispersión de cargas concentradas respecto a la vertical, en grados (D.5.3.3(c), PDF p.600, D-35). */
export const ANGULO_DISPERSION_GRADOS = { trabado: 45, petaca: 30 } as const;

/* ---------- D.5.4: características dimensionales efectivas ---------- */

/** Tabla D.5.4-1 «Coeficientes para muros arriostrados por machones» (PDF p.601, D-36).
 *  Filas: espaciamiento del machón / espesor del machón (6 ó menos, 8, 10, 15, 20 ó más).
 *  Columnas: espesor del machón / espesor del muro (1.0, 2.0, 3.0). Interpolar linealmente para valores intermedios. */
export const TABLA_D54_1 = {
  relEspaciamiento: [6, 8, 10, 15, 20],
  relEspesor: [1, 2, 3],
  coeficientes: [
    [1.0, 1.4, 2.0],
    [1.0, 1.3, 1.7],
    [1.0, 1.2, 1.4],
    [1.0, 1.1, 1.2],
    [1.0, 1.0, 1.0],
  ],
} as const;

/** Relación máxima h′/t en muros estructurales (D.5.4.3.1, PDF p.601, D-36). */
export const RELACION_ESBELTEZ_MAX = 25;
/** Factor del doble de la dimensión desde el apoyo para elementos no soportados en un extremo (D.5.4.3(b), PDF p.601, D-36). */
export const FACTOR_ALTURA_VOLADIZO = 2;

/** Ancho efectivo b para flexión perpendicular al plano: veces el ancho nominal del muro (D.5.4.4.1, PDF p.601, D-36). */
export const FACTOR_ANCHO_EFECTIVO = { trabado: 6, petaca: 3 } as const;

/** Distancia máxima entre apoyos laterales de vigas y dinteles: 32 veces el ancho efectivo (D.5.4.6, PDF p.602, D-37). */
export const FACTOR_DISTANCIA_APOYOS_VIGA = 32;
/** Flecha elástica máxima de vigas y dinteles: ℓ/500 con las cargas verticales sin mayorar (D.5.4.7, PDF p.602, D-37). */
export const DIVISOR_FLECHA_VIGA = 500;
/** Vigas de sección alta: ℓ/altura menor que 1.25 en luces simples o 2.5 en luces continuas (D.5.4.8, PDF p.602, D-37). */
export const RELACION_VIGA_ALTA = { simple: 1.25, continua: 2.5 } as const;
