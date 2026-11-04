/**
 * Calidad del concreto, dosificación, aceptación y curado — Capítulo C.5 de la NSR-10, transcrito del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302.
 * Las tablas y ecuaciones se transcribieron contra la imagen de la página.
 *
 *   Tabla C.5.3.1.2   factor de modificación de la desviación estándar (< 30 ensayos) .. PDF p.342 (C-40)
 *   Tabla C.5.3.2.1   f′cr con datos (ecuaciones C.5-1, C.5-2, C.5-3) ................. PDF p.342 (C-40)
 *   Tabla C.5.3.2.2   f′cr sin datos .................................................... PDF p.343 (C-41)
 *   C.5.4.1           f′cr sin experiencia (+8.3 MPa) ................................... PDF p.343 (C-41)
 *   C.5.6.x           frecuencia, aceptación, núcleos, curado en obra, fibras ........... PDF p.344-346 (C-42 a C-44)
 *   C.5.11            curado .............................................................. PDF p.347 (C-45)
 */

// ---------------------------------------------------------------------------------------------
// Tabla C.5.3.1.2 — Factor de modificación para la desviación estándar cuando hay menos de 30 ensayos (C-40)
// ---------------------------------------------------------------------------------------------

export interface FilaFactorModificacion {
  /** Número de ensayos de la fila de la tabla. */
  n: number;
  /** Factor de modificación de la desviación estándar de la muestra. */
  factor: number;
}

/** Para menos de 15 ensayos la tabla no da factor: "Emplee la tabla C.5.3.2.2". Para n intermedios se interpola. */
export const FACTOR_MODIFICACION_DESVIACION: readonly FilaFactorModificacion[] = [
  { n: 15, factor: 1.16 },
  { n: 20, factor: 1.08 },
  { n: 25, factor: 1.03 },
  { n: 30, factor: 1.0 },
];

/** Mínimo de ensayos con el que se acepta una desviación estándar modificada (C.5.3.1.2: 15 a 29 ensayos). */
export const N_MIN_DESVIACION_MODIFICADA = 15;
/** Ensayos para usar la desviación estándar sin modificar (C.5.3.1.1(c)). */
export const N_DESVIACION_COMPLETA = 30;
/** Período mínimo (días calendario) del registro de 15 a 29 ensayos (C.5.3.1.2). */
export const DIAS_MIN_REGISTRO = 45;
/** Antigüedad máxima de los registros (meses) (C.5.3.1.1 y C.5.3.1.2). */
export const MESES_MAX_ANTIGUEDAD_REGISTRO = 12;
/** Los registros deben corresponder a un concreto con f′c dentro de 7 MPa del especificado (C.5.3.1.1(b)). */
export const DIFERENCIA_FC_REGISTRO_MPA = 7;
/** Registros de 10 a 29 ensayos para documentar la resistencia potencial (C.5.3.3.1), en al menos 45 días. */
export const N_MIN_DOCUMENTACION = 10;

// ---------------------------------------------------------------------------------------------
// Tabla C.5.3.2.1 — f′cr cuando hay datos para establecer la desviación estándar (C-40)
// ---------------------------------------------------------------------------------------------

/** Coeficientes de las ecuaciones C.5-1, C.5-2 y C.5-3 (MPa). */
export const COEF_FCR = {
  /** (C.5-1) f′cr = f′c + 1.34·ss */
  c51: { k: 1.34 },
  /** (C.5-2) f′cr = f′c + 2.33·ss − 3.5   (f′c ≤ 35 MPa) */
  c52: { k: 2.33, resta: 3.5 },
  /** (C.5-3) f′cr = 0.90·f′c + 2.33·ss     (f′c > 35 MPa) */
  c53: { factorFc: 0.9, k: 2.33 },
} as const;

/** Límite de f′c entre las ecuaciones C.5-2 y C.5-3 (MPa). */
export const FC_LIMITE_ECUACIONES_MPA = 35;

// ---------------------------------------------------------------------------------------------
// Tabla C.5.3.2.2 — f′cr cuando NO hay datos para establecer la desviación estándar (C-41)
// ---------------------------------------------------------------------------------------------

export interface FilaFcrSinDatos {
  /** Descripción del intervalo de f′c (texto de la tabla). */
  intervalo: string;
  /** Texto de la expresión de f′cr. */
  expresion: string;
}

export const FCR_SIN_DATOS: readonly FilaFcrSinDatos[] = [
  { intervalo: "f′c < 21", expresion: "f′cr = f′c + 7.0" },
  { intervalo: "21 ≤ f′c ≤ 35", expresion: "f′cr = f′c + 8.3" },
  { intervalo: "f′c > 35", expresion: "f′cr = 1.10 f′c + 5.0" },
];

/** Coeficientes numéricos de la Tabla C.5.3.2.2 (MPa). */
export const COEF_FCR_SIN_DATOS = {
  bajo: { suma: 7.0, limite: 21 },
  medio: { suma: 8.3 },
  alto: { factorFc: 1.1, suma: 5.0, limite: 35 },
} as const;

/** C.5.4.1: sin experiencia ni mezclas de prueba, f′cr ≥ f′c + 8.3 MPa; no se usa si f′c > 35 MPa. */
export const SUMA_SIN_EXPERIENCIA_MPA = 8.3;

// ---------------------------------------------------------------------------------------------
// C.5.6 — Evaluación y aceptación
// ---------------------------------------------------------------------------------------------

/** C.5.6.2.1: frecuencia mínima de muestreo por clase de concreto colocado cada día. */
export const FRECUENCIA_MUESTREO = {
  /** al menos una vez al día */
  porDia: 1,
  /** una vez por cada 40 m³ de concreto */
  m3: 40,
  /** una vez por cada 200 m² de superficie de losas o muros */
  m2: 200,
  /** como mínimo una muestra por cada 50 tandas de mezclado */
  tandas: 50,
} as const;
/** C.5.6.2.2: si la frecuencia da menos de 5 ensayos, ensayar al menos 5 tandas al azar (o todas si hay menos de 5). */
export const N_MIN_ENSAYOS_PROYECTO = 5;
/** C.5.6.2.3: por debajo de este volumen (m³) no se exigen ensayos si el Supervisor Técnico aprueba la evidencia. */
export const VOLUMEN_SIN_ENSAYOS_M3 = 10;

/** C.5.6.2.4: probetas por ensayo de resistencia. */
export const PROBETAS_POR_ENSAYO = { cilindro150x300: 2, cilindro100x200: 3 } as const;

/** C.5.6.3.3(b): margen bajo f′c (MPa) para f′c ≤ 35 MPa, y fracción de f′c para f′c > 35 MPa. */
export const MARGEN_RESULTADO_INDIVIDUAL = { mpa: 3.5, fraccion: 0.1, limiteFc: 35 } as const;

/** C.5.6.4.4: curado en obra insuficiente si f_obra < 85 % de la de cilindros de laboratorio (salvo que f_obra > f′c + 3.5 MPa). */
export const CURADO_OBRA = { fraccionLab: 0.85, exencionMpa: 3.5 } as const;

/** C.5.6.5.4: núcleos — promedio de tres ≥ 85 % de f′c y ninguno < 75 % de f′c. */
export const NUCLEOS = { cantidad: 3, fraccionPromedio: 0.85, fraccionMinima: 0.75, horasMin: 48, diasMax: 7 } as const;

/** C.5.6.6.2: concreto con fibras de acero aceptable para cortante (ASTM C1609). */
export const FIBRAS_CORTANTE = {
  masaMinKgM3: 60,
  /** resistencia residual a deflexión L/300 ≥ 90 % de la del primer pico (o de f_r de C.9-10, la mayor) */
  residual300: 0.9,
  /** resistencia residual a deflexión L/150 ≥ 75 % */
  residual150: 0.75,
} as const;

// ---------------------------------------------------------------------------------------------
// C.5.11 — Curado y C.5.8.3 — Mezclado
// ---------------------------------------------------------------------------------------------

export const CURADO = {
  /** temperatura mínima (°C) */
  temperaturaMinC: 10,
  /** días de curado húmedo del concreto normal */
  diasNormal: 7,
  /** días para concreto de alta resistencia inicial */
  diasAltaResistenciaInicial: 3,
} as const;

/** C.5.8.3(c): mezclado en obra, al menos 90 s después de que todos los materiales estén en el tambor. */
export const TIEMPO_MEZCLADO_MIN_S = 90;

/** C.5.1.1: f′c mínimo del concreto diseñado con la NSR-10 (MPa). */
export const FC_MIN_NSR10_MPA = 17;
