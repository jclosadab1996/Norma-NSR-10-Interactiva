/**
 * Constantes y tablas del Capítulo C.13 (Sistemas de losa en una y dos direcciones) de la NSR-10.
 * SI: MPa, kN, m, mm. PDF = página impresa "C-n" + 302. Cada constante cita sección y página
 * ("PDF p.X (C-n)"). Todo valor fue contrastado con la imagen de la página del PDF.
 *
 * Notación: ℓ1 = luz en la dirección de análisis (centro a centro), ℓ2 = luz transversal, ℓn = luz libre,
 * αf1 = αf de las vigas en la dirección ℓ1 (Ec. C.13-3), βt = Ec. C.13-5.
 */

/* ------------------------------------------------------------------ */
/* C.13.2 — Generalidades                                              */
/* ------------------------------------------------------------------ */

/** Ancho de franja de columna a cada lado del eje: 0.25 ℓ2 ó 0.25 ℓ1, el menor (C.13.2.1, PDF p.422, C-120). */
export const FRANJA_COLUMNA_FRACCION = 0.25;

/** Viga monolítica: la parte de losa a cada lado se limita a 4 veces el espesor de la losa (C.13.2.4, PDF p.422, C-120). */
export const ALA_VIGA_MAX_VECES_ESPESOR = 4;

/** Ábaco: proyección mínima bajo la losa = 1/4 del espesor de la losa adyacente (C.13.2.5(a), PDF p.422, C-120). */
export const ABACO_PROYECCION_FRACCION_H = 0.25;
/** Ábaco: extensión mínima desde el eje de apoyo = 1/6 de la luz medida centro a centro (C.13.2.5(b), PDF p.422, C-120). */
export const ABACO_EXTENSION_FRACCION_LUZ = 1 / 6;
/** Capitel/ampliación de losa nervada en dos direcciones sobre columnas: mínimo 1/6 de la luz (C.13.1.5, PDF p.421, C-119). */
export const CAPITEL_NERVADA_FRACCION_LUZ = 1 / 6;

/** Una losa trabaja en una dirección si el panel apoyado en 4 lados tiene luz larga/luz corta mayor que 2 (C.13.1.6.2, PDF p.421, C-119). */
export const RELACION_LUCES_UNA_DIRECCION = 2;

/** El espesor del ábaco bajo la losa, para calcular refuerzo, no se toma mayor que 1/4 de la distancia del extremo del ábaco a la cara de columna (C.13.3.7, PDF p.423, C-121). */
export const ABACO_ESPESOR_EFECTIVO_FRACCION = 0.25;

/* ------------------------------------------------------------------ */
/* C.13.3 — Refuerzo de la losa                                        */
/* ------------------------------------------------------------------ */

/** Separación máxima del refuerzo en secciones críticas: 2 veces el espesor de la losa (C.13.3.2, PDF p.422, C-120). */
export const SEPARACION_MAX_VECES_H = 2;
/** Longitud embebida mínima del refuerzo positivo perpendicular a un borde discontinuo: 150 mm (C.13.3.3, PDF p.422, C-120). */
export const EMBEBIDO_BORDE_DISCONTINUO_MM = 150;
/** El refuerzo de esquina se coloca a una distancia en cada dirección igual a 1/5 de la luz mayor (C.13.3.6.3, PDF p.423, C-121). */
export const ESQUINA_FRACCION_LUZ = 1 / 5;
/** Esquinas exteriores: se requiere refuerzo si alguna viga de borde tiene αf mayor de 1.0 (C.13.3.6, PDF p.423, C-121). */
export const ESQUINA_ALFA_F_UMBRAL = 1.0;

/**
 * Extensiones mínimas del refuerzo en losas sin vigas (Fig. C.13.3.8, PDF p.423, C-121), como fracción de ℓn.
 * `sinAbaco`/`conAbaco`; las barras de la franja de columna superior: 50 % del As del apoyo continúa 0.20 ℓn y
 * el resto 0.30 ℓn (sin ábaco) ó 0.33 ℓn (con ábaco). Franja central superior: 0.22 ℓn. Inferior de franja central:
 * 50 % continúa; el resto termina a máximo 0.15 ℓn del apoyo interior; 150 mm dentro del apoyo exterior.
 */
export const EXTENSIONES_FIG_C1338 = {
  franjaColumnaSuperior: { restante50: 0.2, resto: { sinAbaco: 0.3, conAbaco: 0.33 } },
  franjaColumnaInferior: { porcentajeContinuo: 100, anclajeMm: 150 },
  franjaCentralSuperior: { porcentaje: 100, extension: 0.22 },
  franjaCentralInferior: { porcentajeContinuo: 50, finMaximoDesdeApoyo: 0.15, anclajeMm: 150 },
} as const;

/* ------------------------------------------------------------------ */
/* C.13.4 — Aberturas                                                  */
/* ------------------------------------------------------------------ */

/** Zona común de dos franjas de columna: aberturas de hasta 1/8 del ancho de la franja de columna (C.13.4.2.2, PDF p.424, C-122). */
export const ABERTURA_ZONA_COMUN_COLUMNAS_FRACCION = 1 / 8;
/** Zona común de franja de columna y franja central: se puede interrumpir hasta 1/4 del refuerzo de cada franja (C.13.4.2.3, PDF p.424, C-122). */
export const ABERTURA_COLUMNA_CENTRAL_FRACCION_REFUERZO = 1 / 4;

/* ------------------------------------------------------------------ */
/* C.13.5 — Transferencia de momento y análisis aproximado             */
/* ------------------------------------------------------------------ */

/** Ancho efectivo de losa para la transferencia por flexión: 1.5 h a cada lado de la columna o capitel (C.13.5.3.2, PDF p.425, C-123). */
export const ANCHO_EFECTIVO_TRANSFERENCIA_VECES_H = 1.5;

/** Factor 2/3 de la Ec. C.13-1: γf = 1 / (1 + (2/3) √(b1/b2)) (PDF p.425, C-123). */
export const GAMMA_F_COEF = 2 / 3;

/** Aumentos permitidos de γf en losas no preesforzadas (C.13.5.3.3, PDF p.425, C-123). */
export const GAMMA_F_AUMENTO = {
  /** (a) columnas de borde, momento alrededor de un eje paralelo al borde: γf = 1.0 si Vu ≤ 0.75 φVc en el borde. */
  bordeVuMaxBorde: 0.75,
  /** (a) ó en una esquina de apoyo si Vu ≤ 0.5 φVc. */
  bordeVuMaxEsquina: 0.5,
  /** (b) apoyos interiores y borde con eje perpendicular: hasta 1.25 γf, sin pasar de 1.0, si Vu ≤ 0.4 φVc… */
  interiorFactor: 1.25,
  interiorVuMax: 0.4,
  /** …y εt ≥ 0.010 en el ancho efectivo. */
  interiorEpsilonTMin: 0.01,
} as const;

/** Aproximación de losas en una dirección (C.13.5.5.3(b), PDF p.426, C-124): vano mayor ≤ 1.20 × vano menor adyacente. */
export const UNA_DIRECCION_LIMITES = { vanoMayorSobreMenorMax: 1.2, carga_L_sobre_D_max: 3, minimoVanos: 2 } as const;

/** Coeficientes (divisores de wu ℓn²) de C.13.5.5.3 (PDF p.426, C-124). El momento es wu ℓn² / divisor. */
export const COEF_UNA_DIRECCION = {
  positivoExtremoNoRestringido: 11,
  positivoExtremoMonolitico: 14,
  positivoInterior: 16,
  negativoPrimerApoyoInteriorDosVanos: 9,
  negativoPrimerApoyoInteriorMasDeDosVanos: 10,
  negativoDemasApoyosInteriores: 11,
  /** Losas con luces ≤ 3 m y vigas con ΣEI columnas / EI viga > 8 en cada extremo: en todas las caras. */
  negativoLucesCortasOColumnasRigidas: 12,
  negativoExteriorVigaBorde: 24,
  negativoExteriorColumna: 16,
  /** Cortante en la cara del primer apoyo interior de elementos extremos: 1.15 wu ℓn / 2. */
  cortantePrimerApoyoInterior: 1.15,
  /** Cortante en la cara de los demás apoyos: wu ℓn / 2. */
  cortanteDemasApoyos: 1.0,
} as const;

/* ------------------------------------------------------------------ */
/* C.13.6 — Método de diseño directo                                   */
/* ------------------------------------------------------------------ */

/** Límites del método (C.13.6.1.1 a C.13.6.1.5, PDF p.427, C-125). */
export const LIMITES_DISENO_DIRECTO = {
  /** C.13.6.1.1: mínimo de tres vanos continuos en cada dirección. */
  vanosMinimos: 3,
  /** C.13.6.1.2: luz mayor / luz menor de cada panel ≤ 2 (centro a centro). */
  relacionLucesMax: 2,
  /** C.13.6.1.3: luces contiguas no difieren de la luz mayor en más de 1/3. */
  diferenciaLucesContiguasFraccion: 1 / 3,
  /** C.13.6.1.4: desalineamiento de columnas hasta 10 % de la luz. */
  desalineamientoMaxFraccion: 0.1,
  /** C.13.6.1.5: L no mayorada ≤ 2 D no mayorada. */
  cargaVivaSobreMuertaMax: 2,
  /** Ec. C.13-2 (C.13.6.1.6): 0.2 ≤ αf1 ℓ2² / (αf2 ℓ1²) ≤ 5.0 en paneles con vigas en todos los lados. */
  relacionRigidezVigasMin: 0.2,
  relacionRigidezVigasMax: 5.0,
} as const;

/** ℓn empleado en C.13-4 no debe ser menor que 0.65 ℓ1 (C.13.6.2.5, PDF p.427, C-125). */
export const LN_MIN_FRACCION_L1 = 0.65;

/** Reparto de Mo en un vano interior (C.13.6.3.2, PDF p.428, C-126). */
export const REPARTO_VANO_INTERIOR = { negativo: 0.65, positivo: 0.35 } as const;

export type TipoVanoFinal = 'borde-no-restringido' | 'losa-con-vigas' | 'sin-vigas-sin-borde' | 'sin-vigas-con-borde' | 'borde-restringido';

/**
 * Tabla de C.13.6.3.3 (PDF p.428, C-126): reparto de Mo en un vano final. Columnas (1) a (5) del PDF.
 * `negInterior`, `positivo` y `negExterior` son fracciones de Mo. Para cada columna la suma
 * `positivo + (negInterior + negExterior)/2` vale 1.0, salvo la columna (1) que da 1.005 por el redondeo de la norma
 * (0.63 en lugar de 0.625); comprobación mía, la norma no la enuncia.
 */
export const TABLA_C13633_VANO_FINAL: ReadonlyArray<{
  id: TipoVanoFinal;
  columna: 1 | 2 | 3 | 4 | 5;
  descripcion: string;
  negInterior: number;
  positivo: number;
  negExterior: number;
}> = [
  { id: 'borde-no-restringido', columna: 1, descripcion: 'Borde exterior no restringido', negInterior: 0.75, positivo: 0.63, negExterior: 0 },
  { id: 'losa-con-vigas', columna: 2, descripcion: 'Losa con vigas entre todos los apoyos', negInterior: 0.7, positivo: 0.57, negExterior: 0.16 },
  { id: 'sin-vigas-sin-borde', columna: 3, descripcion: 'Losa sin vigas entre apoyos interiores, sin viga de borde', negInterior: 0.7, positivo: 0.52, negExterior: 0.26 },
  { id: 'sin-vigas-con-borde', columna: 4, descripcion: 'Losa sin vigas entre apoyos interiores, con viga de borde', negInterior: 0.7, positivo: 0.5, negExterior: 0.3 },
  { id: 'borde-restringido', columna: 5, descripcion: 'Borde exterior totalmente restringido', negInterior: 0.65, positivo: 0.35, negExterior: 0.65 },
];

/** Momento de columna de borde por carga gravitacional transmitido a la losa: 0.3 Mo (C.13.6.3.6, PDF p.428, C-126). */
export const MOMENTO_COLUMNA_BORDE_FRACCION_MO = 0.3;

/** Abscisas de las tablas de franja de columna: ℓ2/ℓ1 = 0.5, 1.0, 2.0 (PDF p.428–429, C-126/C-127). */
export const L2_SOBRE_L1_TABLAS = [0.5, 1.0, 2.0] as const;

/**
 * C.13.6.4.1 (PDF p.428, C-126): % del momento negativo interior que toma la franja de columna.
 * Filas: αf1 ℓ2/ℓ1 = 0 y ≥ 1.0. Columnas: ℓ2/ℓ1 = 0.5, 1.0, 2.0. Se interpola linealmente entre valores.
 */
export const TABLA_C13641_NEG_INTERIOR = { alfa0: [75, 75, 75], alfa1: [90, 75, 45] } as const;

/**
 * C.13.6.4.2 (PDF p.429, C-127): % del momento negativo exterior que toma la franja de columna.
 * Por βt = 0 y βt ≥ 2.5; se interpola linealmente entre valores (ℓ2/ℓ1, αf1ℓ2/ℓ1 y βt).
 */
export const TABLA_C13642_NEG_EXTERIOR = {
  alfa0: { bt0: [100, 100, 100], bt25: [75, 75, 75] },
  alfa1: { bt0: [100, 100, 100], bt25: [90, 75, 45] },
} as const;
/** Valor de βt a partir del cual se toma la fila "βt ≥ 2.5" (C.13.6.4.2, PDF p.429, C-127). */
export const BETA_T_LIMITE_TABLA = 2.5;

/** C.13.6.4.4 (PDF p.429, C-127): % del momento positivo que toma la franja de columna. */
export const TABLA_C13644_POSITIVO = { alfa0: [60, 60, 60], alfa1: [90, 75, 45] } as const;

/** Si el apoyo (columna o muro) se extiende ≥ 0.75 ℓ2, el momento negativo se distribuye uniformemente en ℓ2 (C.13.6.4.3, PDF p.429, C-127). */
export const APOYO_LARGO_UNIFORME_FRACCION_L2 = 0.75;

/** Vigas entre apoyos: 85 % del momento de la franja de columna si αf1ℓ2/ℓ1 ≥ 1; interpolación lineal hasta 0 % en αf1ℓ2/ℓ1 = 0 (C.13.6.5.1–2, PDF p.429, C-127). */
export const VIGA_FRACCION_FRANJA_COLUMNA = 0.85;

/** Franja central adyacente a un borde con muro: resiste el doble del momento de su mitad correspondiente al primer eje interior (C.13.6.6.3, PDF p.430, C-128). */
export const FRANJA_CENTRAL_BORDE_MURO_FACTOR = 2;

/** Los momentos mayorados positivos y negativos se pueden modificar hasta 10 % si Mo no baja del requerido (C.13.6.7, PDF p.430, C-128). */
export const MODIFICACION_MOMENTOS_MAX = 0.1;

/** Ec. C.13-7 (C.13.6.9.2, PDF p.430, C-128): coeficiente 0.07 y factor 0.5 de qLu. */
export const COLUMNA_C137 = { coef: 0.07, factorQLu: 0.5 } as const;

/* ------------------------------------------------------------------ */
/* C.13.7 — Pórtico equivalente                                        */
/* ------------------------------------------------------------------ */

/** C.13.7.6.2 (PDF p.432, C-130): si L ≤ 3/4 D se puede cargar toda la carga viva mayorada en todo el sistema. */
export const PORTICO_L_SOBRE_D_MAX_CARGA_TOTAL = 0.75;
/** C.13.7.6.3 (PDF p.432, C-130): para otras condiciones, 3/4 de la carga viva mayorada en paneles alternos o adyacentes. */
export const PORTICO_FRACCION_CARGA_VIVA_ALTERNA = 0.75;
/** Sección crítica de momento negativo en apoyos interiores: borde del apoyo pero a no más de 0.175 ℓ1 del centro de la columna (C.13.7.7.1, PDF p.432, C-130). */
export const PORTICO_SECCION_CRITICA_MAX_FRACCION_L1 = 0.175;

/* ------------------------------------------------------------------ */
/* C.13.8 — Métodos plásticos                                          */
/* ------------------------------------------------------------------ */

/** Líneas de fluencia / franjas: solo si εt neta a tracción < 0.0075 (C.13.8.1.1, PDF p.432, C-130). */
export const PLASTICO_EPSILON_T_MAX = 0.0075;
/** Si los momentos negativos de dos paneles sobre un apoyo difieren menos de 25 %, se puede promediar (C.13.8.3.1, PDF p.433, C-131). */
export const PLASTICO_DIFERENCIA_PROMEDIO_MAX = 0.25;

/* ------------------------------------------------------------------ */
/* C.13.9 — Losas en dos direcciones sobre muros o vigas rígidas       */
/* ------------------------------------------------------------------ */

/** Viga rígida: αf ≥ 2, o en losas macizas altura de viga ≥ 3 veces el espesor de la losa (C.13.9.1.1, PDF p.433, C-131). */
export const VIGA_RIGIDA = { alfaFMin: 2, alturaSobreEspesorMin: 3 } as const;
/** Losas nervadas: mínimo cinco nervaduras en cada dirección (C.13.9.1.2, PDF p.433, C-131). */
export const NERVADAS_MIN_NERVIOS_C139 = 5;
/** Si m < 0.5 la losa se diseña como en una dirección, con refuerzo negativo paralelo a la luz larga correspondiente a m = 0.5 (C.13.9.3, PDF p.433, C-131). */
export const M_MIN_C139 = 0.5;
/** Borde sin rigidez torsional: el momento negativo de diseño en el borde es 1/3 del positivo (C.13.9.4.2, PDF p.433, C-131). */
export const BORDE_SIN_RIGIDEZ_NEGATIVO_FRACCION = 1 / 3;
/** Franja de columna: el momento baja de su valor total en el límite de la franja central a 1/3 en el borde del panel (C.13.9.7, PDF p.434, C-132). */
export const C139_FRANJA_COLUMNA_BORDE_FRACCION = 1 / 3;
/** Si el momento negativo a un lado del apoyo es menor del 80 % del otro lado, la diferencia se reparte según rigidez (C.13.9.8, PDF p.434, C-132). */
export const C139_DIFERENCIA_NEGATIVOS_UMBRAL = 0.8;
/** Carga mínima sobre la viga corta: equivalente uniforme qu ℓna / 3 (C.13.9.10.1, PDF p.434, C-132). */
export const C139_VIGA_CORTA_FACTOR = 1 / 3;

/** Descripción de los 9 casos de las Tablas C.13.9-1 a C.13.9-4 (bordes achurados = continuos; PDF p.435–438, C-133 a C-136). */
export const CASOS_C139: ReadonlyArray<{ caso: number; descripcion: string; bordesContinuos: string }> = [
  { caso: 1, descripcion: 'Panel con los cuatro bordes discontinuos', bordesContinuos: 'ninguno' },
  { caso: 2, descripcion: 'Panel interior: los cuatro bordes continuos', bordesContinuos: 'los cuatro' },
  { caso: 3, descripcion: 'Un par de bordes cortos continuos (dos bordes largos discontinuos)', bordesContinuos: 'los dos bordes cortos' },
  { caso: 4, descripcion: 'Dos bordes adyacentes continuos (esquina)', bordesContinuos: 'un borde corto y un borde largo adyacentes' },
  { caso: 5, descripcion: 'Dos bordes largos continuos (dos bordes cortos discontinuos)', bordesContinuos: 'los dos bordes largos' },
  { caso: 6, descripcion: 'Un solo borde largo continuo', bordesContinuos: 'un borde largo' },
  { caso: 7, descripcion: 'Un solo borde corto continuo', bordesContinuos: 'un borde corto' },
  { caso: 8, descripcion: 'Tres bordes continuos: los dos cortos y un largo', bordesContinuos: 'dos bordes cortos y un borde largo' },
  { caso: 9, descripcion: 'Tres bordes continuos: los dos largos y un corto', bordesContinuos: 'dos bordes largos y un borde corto' },
];

export type FilaCoef = {
  /** m = ℓna / ℓnb (luz libre corta / luz libre larga). */
  m: number;
  /** Coeficientes Ca para los casos 1 a 9 (índice 0 = caso 1); null = celda vacía en el PDF (no hay momento negativo en esa dirección). */
  a: ReadonlyArray<number | null>;
  /** Coeficientes Cb para los casos 1 a 9. */
  b: ReadonlyArray<number | null>;
};

/** Tabla C.13.9-1 (PDF p.435, C-133): coeficientes de momento NEGATIVO; en C.13-8 y C.13-9 se usa qj = qu. */
export const TABLA_C1391_MOMENTO_NEGATIVO: readonly FilaCoef[] = [
  { m: 1.00, a: [null, 0.045, null, 0.050, 0.075, 0.071, null, 0.033, 0.061], b: [null, 0.045, 0.076, 0.050, null, null, 0.071, 0.061, 0.033] },
  { m: 0.95, a: [null, 0.050, null, 0.055, 0.079, 0.075, null, 0.038, 0.065], b: [null, 0.041, 0.072, 0.045, null, null, 0.067, 0.056, 0.029] },
  { m: 0.90, a: [null, 0.055, null, 0.060, 0.080, 0.079, null, 0.043, 0.068], b: [null, 0.037, 0.070, 0.040, null, null, 0.062, 0.052, 0.025] },
  { m: 0.85, a: [null, 0.060, null, 0.066, 0.082, 0.083, null, 0.049, 0.072], b: [null, 0.031, 0.065, 0.034, null, null, 0.057, 0.046, 0.021] },
  { m: 0.80, a: [null, 0.065, null, 0.071, 0.083, 0.086, null, 0.055, 0.075], b: [null, 0.027, 0.061, 0.029, null, null, 0.051, 0.041, 0.017] },
  { m: 0.75, a: [null, 0.069, null, 0.076, 0.085, 0.088, null, 0.061, 0.078], b: [null, 0.022, 0.056, 0.024, null, null, 0.044, 0.036, 0.014] },
  { m: 0.70, a: [null, 0.074, null, 0.081, 0.086, 0.091, null, 0.068, 0.081], b: [null, 0.017, 0.050, 0.019, null, null, 0.038, 0.029, 0.011] },
  { m: 0.65, a: [null, 0.077, null, 0.085, 0.087, 0.093, null, 0.074, 0.083], b: [null, 0.014, 0.043, 0.015, null, null, 0.031, 0.024, 0.008] },
  { m: 0.60, a: [null, 0.081, null, 0.089, 0.088, 0.095, null, 0.080, 0.085], b: [null, 0.010, 0.035, 0.011, null, null, 0.024, 0.018, 0.006] },
  { m: 0.55, a: [null, 0.084, null, 0.092, 0.089, 0.096, null, 0.085, 0.086], b: [null, 0.007, 0.028, 0.008, null, null, 0.019, 0.014, 0.005] },
  { m: 0.50, a: [null, 0.086, null, 0.094, 0.090, 0.097, null, 0.089, 0.088], b: [null, 0.006, 0.022, 0.006, null, null, 0.014, 0.010, 0.003] },
];

/** Tabla C.13.9-2 (PDF p.436, C-134): coeficientes de momento POSITIVO por carga muerta; en C.13-8 y C.13-9 se usa qj = qDu. */
export const TABLA_C1392_POSITIVO_CARGA_MUERTA: readonly FilaCoef[] = [
  { m: 1.00, a: [0.036, 0.018, 0.018, 0.027, 0.027, 0.033, 0.027, 0.020, 0.023], b: [0.036, 0.018, 0.027, 0.027, 0.018, 0.027, 0.033, 0.023, 0.020] },
  { m: 0.95, a: [0.040, 0.020, 0.021, 0.030, 0.028, 0.036, 0.031, 0.022, 0.024], b: [0.033, 0.016, 0.025, 0.024, 0.015, 0.024, 0.031, 0.021, 0.017] },
  { m: 0.90, a: [0.045, 0.022, 0.025, 0.033, 0.029, 0.039, 0.035, 0.025, 0.026], b: [0.029, 0.014, 0.024, 0.022, 0.013, 0.021, 0.028, 0.019, 0.015] },
  { m: 0.85, a: [0.050, 0.024, 0.029, 0.036, 0.031, 0.042, 0.040, 0.029, 0.028], b: [0.026, 0.012, 0.022, 0.019, 0.011, 0.017, 0.025, 0.017, 0.013] },
  { m: 0.80, a: [0.056, 0.026, 0.034, 0.039, 0.032, 0.045, 0.045, 0.032, 0.029], b: [0.023, 0.011, 0.020, 0.016, 0.009, 0.015, 0.022, 0.015, 0.010] },
  { m: 0.75, a: [0.061, 0.028, 0.040, 0.043, 0.033, 0.048, 0.051, 0.036, 0.031], b: [0.019, 0.009, 0.018, 0.013, 0.007, 0.012, 0.020, 0.013, 0.007] },
  { m: 0.70, a: [0.068, 0.030, 0.046, 0.046, 0.035, 0.051, 0.058, 0.040, 0.033], b: [0.016, 0.007, 0.016, 0.011, 0.005, 0.009, 0.017, 0.011, 0.006] },
  { m: 0.65, a: [0.074, 0.032, 0.054, 0.050, 0.036, 0.054, 0.065, 0.044, 0.034], b: [0.013, 0.006, 0.014, 0.009, 0.004, 0.007, 0.014, 0.009, 0.005] },
  { m: 0.60, a: [0.081, 0.034, 0.062, 0.053, 0.037, 0.056, 0.073, 0.048, 0.036], b: [0.010, 0.004, 0.011, 0.007, 0.003, 0.006, 0.012, 0.007, 0.004] },
  { m: 0.55, a: [0.088, 0.035, 0.071, 0.056, 0.038, 0.058, 0.081, 0.052, 0.037], b: [0.008, 0.003, 0.009, 0.005, 0.002, 0.004, 0.009, 0.005, 0.003] },
  { m: 0.50, a: [0.095, 0.037, 0.080, 0.059, 0.039, 0.061, 0.089, 0.056, 0.038], b: [0.006, 0.002, 0.007, 0.004, 0.001, 0.003, 0.007, 0.004, 0.002] },
];

/** Tabla C.13.9-3 (PDF p.437, C-135): coeficientes de momento POSITIVO por carga viva; en C.13-8 y C.13-9 se usa qj = qLu. */
export const TABLA_C1393_POSITIVO_CARGA_VIVA: readonly FilaCoef[] = [
  { m: 1.00, a: [0.036, 0.027, 0.027, 0.032, 0.032, 0.035, 0.032, 0.028, 0.030], b: [0.036, 0.027, 0.032, 0.032, 0.027, 0.032, 0.035, 0.030, 0.028] },
  { m: 0.95, a: [0.040, 0.030, 0.031, 0.035, 0.034, 0.038, 0.036, 0.031, 0.032], b: [0.033, 0.025, 0.029, 0.029, 0.024, 0.029, 0.032, 0.027, 0.025] },
  { m: 0.90, a: [0.045, 0.034, 0.035, 0.039, 0.037, 0.042, 0.040, 0.035, 0.036], b: [0.029, 0.022, 0.027, 0.026, 0.021, 0.025, 0.029, 0.024, 0.022] },
  { m: 0.85, a: [0.050, 0.037, 0.040, 0.043, 0.041, 0.046, 0.045, 0.040, 0.039], b: [0.026, 0.019, 0.024, 0.023, 0.019, 0.022, 0.026, 0.022, 0.020] },
  { m: 0.80, a: [0.056, 0.041, 0.045, 0.048, 0.044, 0.051, 0.051, 0.044, 0.042], b: [0.023, 0.017, 0.022, 0.020, 0.016, 0.019, 0.023, 0.019, 0.017] },
  { m: 0.75, a: [0.061, 0.045, 0.051, 0.052, 0.047, 0.055, 0.056, 0.049, 0.046], b: [0.019, 0.014, 0.019, 0.016, 0.013, 0.016, 0.020, 0.016, 0.013] },
  { m: 0.70, a: [0.068, 0.049, 0.057, 0.057, 0.051, 0.060, 0.063, 0.054, 0.050], b: [0.016, 0.012, 0.016, 0.014, 0.011, 0.013, 0.017, 0.014, 0.011] },
  { m: 0.65, a: [0.074, 0.053, 0.064, 0.062, 0.055, 0.064, 0.070, 0.059, 0.054], b: [0.013, 0.010, 0.014, 0.011, 0.009, 0.010, 0.014, 0.011, 0.009] },
  { m: 0.60, a: [0.081, 0.058, 0.071, 0.067, 0.059, 0.068, 0.077, 0.065, 0.059], b: [0.010, 0.007, 0.011, 0.009, 0.007, 0.008, 0.011, 0.009, 0.007] },
  { m: 0.55, a: [0.088, 0.062, 0.080, 0.072, 0.063, 0.073, 0.085, 0.070, 0.063], b: [0.008, 0.006, 0.009, 0.007, 0.005, 0.006, 0.009, 0.007, 0.006] },
  { m: 0.50, a: [0.095, 0.066, 0.088, 0.077, 0.067, 0.078, 0.092, 0.076, 0.067], b: [0.006, 0.004, 0.007, 0.005, 0.004, 0.005, 0.007, 0.005, 0.004] },
];

/** Tabla C.13.9-4 (PDF p.438, C-136): fracción de qu en las direcciones ℓna (a) y ℓnb (b) para el cortante de la losa en el apoyo y la carga en los apoyos (C.13.9.9–10). */
export const TABLA_C1394_REPARTO_CARGA: readonly FilaCoef[] = [
  { m: 1.00, a: [0.50, 0.50, 0.17, 0.50, 0.83, 0.71, 0.29, 0.33, 0.67], b: [0.50, 0.50, 0.83, 0.50, 0.17, 0.29, 0.71, 0.67, 0.33] },
  { m: 0.95, a: [0.55, 0.55, 0.20, 0.55, 0.86, 0.75, 0.33, 0.38, 0.71], b: [0.45, 0.45, 0.80, 0.45, 0.14, 0.25, 0.67, 0.62, 0.29] },
  { m: 0.90, a: [0.60, 0.60, 0.23, 0.60, 0.88, 0.79, 0.38, 0.43, 0.75], b: [0.40, 0.40, 0.77, 0.40, 0.12, 0.21, 0.62, 0.57, 0.25] },
  { m: 0.85, a: [0.66, 0.66, 0.28, 0.66, 0.90, 0.83, 0.43, 0.49, 0.79], b: [0.34, 0.34, 0.72, 0.34, 0.10, 0.17, 0.57, 0.51, 0.21] },
  { m: 0.80, a: [0.71, 0.71, 0.33, 0.71, 0.92, 0.86, 0.49, 0.55, 0.83], b: [0.29, 0.29, 0.67, 0.29, 0.08, 0.14, 0.51, 0.45, 0.17] },
  { m: 0.75, a: [0.76, 0.76, 0.39, 0.76, 0.94, 0.88, 0.56, 0.61, 0.86], b: [0.24, 0.24, 0.61, 0.24, 0.06, 0.12, 0.44, 0.39, 0.14] },
  { m: 0.70, a: [0.81, 0.81, 0.45, 0.81, 0.95, 0.91, 0.62, 0.68, 0.89], b: [0.19, 0.19, 0.55, 0.19, 0.05, 0.09, 0.38, 0.32, 0.11] },
  { m: 0.65, a: [0.85, 0.85, 0.53, 0.85, 0.96, 0.93, 0.69, 0.74, 0.92], b: [0.15, 0.15, 0.47, 0.15, 0.04, 0.07, 0.31, 0.26, 0.08] },
  { m: 0.60, a: [0.89, 0.89, 0.61, 0.89, 0.97, 0.95, 0.76, 0.80, 0.94], b: [0.11, 0.11, 0.39, 0.11, 0.03, 0.05, 0.24, 0.20, 0.06] },
  { m: 0.55, a: [0.92, 0.92, 0.69, 0.92, 0.98, 0.96, 0.81, 0.85, 0.95], b: [0.08, 0.08, 0.31, 0.08, 0.02, 0.04, 0.19, 0.15, 0.05] },
  { m: 0.50, a: [0.94, 0.94, 0.76, 0.94, 0.99, 0.97, 0.86, 0.89, 0.97], b: [0.06, 0.06, 0.24, 0.06, 0.01, 0.03, 0.14, 0.11, 0.03] },
];

