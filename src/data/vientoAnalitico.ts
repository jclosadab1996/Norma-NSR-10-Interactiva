/**
 * Tablas del Método 2 (Procedimiento analítico) de viento, NSR-10 B.6.5.1 a B.6.5.10,
 * transcritas del PDF (Norma/Norma-Sismo-Resistente-NSR-10.pdf) y verificadas contra la imagen.
 * Página impresa "B-n" = página PDF n − 219 (B-1 = PDF 220).
 */

export type ExposicionViento = 'B' | 'C' | 'D';
export const EXPOSICIONES_VIENTO: readonly ExposicionViento[] = ['B', 'C', 'D'];

/** Grupos de uso (A.2.5). */
export type GrupoUsoViento = 'I' | 'II' | 'III' | 'IV';

/**
 * Figura B.6.4-1 — Velocidad del viento básico por región del mapa (m/s y km/h).
 * PDF p.258 (B-39). Las zonas sin región numerada ("Véase la Nota") se calculan con 28 m/s.
 */
export const REGIONES_VELOCIDAD_BASICA: readonly { region: 1 | 2 | 3 | 4 | 5; ms: number; kmh: number }[] = [
  { region: 1, ms: 17, kmh: 60 },
  { region: 2, ms: 22, kmh: 80 },
  { region: 3, ms: 28, kmh: 100 },
  { region: 4, ms: 33, kmh: 120 },
  { region: 5, ms: 36, kmh: 130 },
];

/** Velocidad para zonas del mapa no estudiadas (Nota de la Figura B.6.4-1), en m/s. PDF p.258 (B-39). */
export const VELOCIDAD_ZONAS_NO_ESTUDIADAS = 28;

/**
 * Tabla B.6.5-1 — Factor de importancia I (cargas de viento). PDF p.298 (B-79).
 * `noHuracanes`: regiones no propensas a huracanes y regiones con posibilidad de huracanes de V = 40–45 m/s.
 * `huracanes`: regiones con posibilidad de huracanes y V > 45 m/s.
 */
export const TABLA_B651_FACTOR_IMPORTANCIA: Record<GrupoUsoViento, { noHuracanes: number; huracanes: number }> = {
  I: { noHuracanes: 0.87, huracanes: 0.77 },
  II: { noHuracanes: 1.0, huracanes: 1.0 },
  III: { noHuracanes: 1.15, huracanes: 1.15 },
  IV: { noHuracanes: 1.15, huracanes: 1.15 },
};

/**
 * Tabla B.6.5-2 — Constantes de exposición del terreno. PDF p.299 (B-80).
 * - `alfa`, `zg`: usados en la ecuación de Kz (nota 2 de la Tabla B.6.5-3). zg en m.
 * - `aHat`, `bHat`: constantes de la velocidad de ráfaga (columnas â y b̂); no se usan en las ecuaciones de B.6.5.
 * - `alfaBar`, `bBar`: ᾱ y b̄ de la ecuación B.6.5-12 (velocidad media horaria Vz).
 * - `c`: ecuación B.6.5-3 (intensidad de turbulencia).
 * - `ell` (m), `epsBar`: ℓ y ε̄ de la ecuación B.6.5-5 (longitud integral de escala Lz; el texto las llama A y ε).
 * - `zmin` (m): altura mínima para la altura equivalente z̄.
 */
export type ConstantesExposicion = {
  alfa: number;
  zg: number;
  aHat: number;
  bHat: number;
  alfaBar: number;
  bBar: number;
  c: number;
  ell: number;
  epsBar: number;
  zmin: number;
};

export const TABLA_B652_CONSTANTES: Record<ExposicionViento, ConstantesExposicion> = {
  B: { alfa: 7.0, zg: 365.8, aHat: 1 / 7.0, bHat: 0.84, alfaBar: 1 / 4.0, bBar: 0.45, c: 0.3, ell: 97.5, epsBar: 1 / 3, zmin: 9.0 },
  C: { alfa: 9.5, zg: 274.3, aHat: 1 / 9.5, bHat: 1.0, alfaBar: 1 / 6.5, bBar: 0.65, c: 0.2, ell: 152.4, epsBar: 1 / 5, zmin: 4.5 },
  D: { alfa: 11.5, zg: 213.4, aHat: 1 / 11.5, bHat: 1.07, alfaBar: 1 / 9.0, bBar: 0.8, c: 0.15, ell: 198.1, epsBar: 1 / 8, zmin: 2.0 },
};

/**
 * Tabla B.6.5-3 — Coeficientes de exposición Kz y Kh. PDF p.300 (B-81).
 * `z`: altura sobre el terreno en m. B1 = exposición B caso 1; B2 = exposición B caso 2; C y D valen para los casos 1 y 2.
 * Anomalías del PDF (se transcribe lo impreso):
 *  - La primera fila está impresa como "0 - 45"; se lee como "0 – 4.5" m (la ecuación con z = 4.5 m da los mismos valores ±0.004).
 *  - La fila "20.0" (0.89 / 1.17 / 1.34) coincide con la ecuación evaluada en ≈ 21.3 m, no en 20.0 m (diferencia 0.008–0.014).
 *  - La fila "36.5" trae C = 1.36 y D = 1.52 (idénticos a la fila 42.5); la ecuación da 1.31 y 1.48 en 36.5 m.
 */
export type FilaKz = { z: number; B1: number; B2: number; C: number; D: number };

export const TABLA_B653_KZ: readonly FilaKz[] = [
  { z: 4.5, B1: 0.7, B2: 0.57, C: 0.85, D: 1.03 }, // impresa "0 - 45"
  { z: 6.0, B1: 0.7, B2: 0.62, C: 0.9, D: 1.08 },
  { z: 7.5, B1: 0.7, B2: 0.66, C: 0.94, D: 1.12 },
  { z: 9.0, B1: 0.7, B2: 0.7, C: 0.98, D: 1.16 },
  { z: 12.0, B1: 0.76, B2: 0.76, C: 1.04, D: 1.22 },
  { z: 15.0, B1: 0.81, B2: 0.81, C: 1.09, D: 1.27 },
  { z: 18.0, B1: 0.85, B2: 0.85, C: 1.13, D: 1.31 },
  { z: 20.0, B1: 0.89, B2: 0.89, C: 1.17, D: 1.34 },
  { z: 24.5, B1: 0.93, B2: 0.93, C: 1.21, D: 1.38 },
  { z: 27.5, B1: 0.96, B2: 0.96, C: 1.24, D: 1.4 },
  { z: 30.5, B1: 0.99, B2: 0.99, C: 1.26, D: 1.43 },
  { z: 36.5, B1: 1.04, B2: 1.04, C: 1.36, D: 1.52 },
  { z: 42.5, B1: 1.09, B2: 1.09, C: 1.36, D: 1.52 },
  { z: 49.0, B1: 1.13, B2: 1.13, C: 1.39, D: 1.55 },
  { z: 55.0, B1: 1.17, B2: 1.17, C: 1.43, D: 1.58 },
  { z: 60.0, B1: 1.2, B2: 1.2, C: 1.46, D: 1.61 },
  { z: 76.0, B1: 1.28, B2: 1.28, C: 1.53, D: 1.68 },
  { z: 90.0, B1: 1.35, B2: 1.35, C: 1.59, D: 1.73 },
  { z: 107.0, B1: 1.41, B2: 1.41, C: 1.64, D: 1.78 },
  { z: 122.0, B1: 1.47, B2: 1.47, C: 1.69, D: 1.82 },
  { z: 137.0, B1: 1.52, B2: 1.52, C: 1.73, D: 1.86 },
  { z: 152.0, B1: 1.56, B2: 1.56, C: 1.77, D: 1.89 },
];

/** Altura mínima (m) de la ecuación de Kz: para z < 4.0 m se evalúa con z = 4.0 m (nota 2, Tabla B.6.5-3). PDF p.300 (B-81). */
export const Z_MIN_KZ = 4.0;
/** Para el caso 1 en exposición B, z no se toma menor que 9.0 m (nota 2, Tabla B.6.5-3). */
export const Z_MIN_KZ_B_CASO_1 = 9.0;

/**
 * Tabla B.6.5-4 — Factor de direccionalidad del viento Kd. PDF p.301 (B-82).
 * Solo es válido junto con las combinaciones de carga B.2.3 y B.2.4.
 */
export const TABLA_B654_KD: readonly { id: string; tipo: string; kd: number }[] = [
  { id: 'edificio-sprfv', tipo: 'Edificios: Sistema principal de resistencia de cargas de viento', kd: 0.85 },
  { id: 'edificio-componentes', tipo: 'Edificios: Componentes y recubrimientos', kd: 0.85 },
  { id: 'cubierta-abovedada', tipo: 'Cubiertas abovedadas', kd: 0.85 },
  { id: 'chimenea-cuadrada', tipo: 'Chimeneas, tanques y estructuras similares: cuadradas', kd: 0.9 },
  { id: 'chimenea-hexagonal', tipo: 'Chimeneas, tanques y estructuras similares: hexagonales', kd: 0.95 },
  { id: 'chimenea-redonda', tipo: 'Chimeneas, tanques y estructuras similares: redondas', kd: 0.95 },
  { id: 'aviso-solido', tipo: 'Avisos sólidos', kd: 0.85 },
  { id: 'aviso-abierto', tipo: 'Avisos abiertos y estructura rectangular', kd: 0.85 },
  { id: 'torre-triangular-cuadrada', tipo: 'Torres en celosía: triangular, cuadrada y rectangular', kd: 0.85 },
  { id: 'torre-otras', tipo: 'Torres en celosía: todas las otras secciones transversales', kd: 0.95 },
];

/* -------------------------------------------------------------------------------------------------
 * Figura B.6.5-1 — Factor topográfico Kzt (Método 2). PDF p.266 (B-47) y p.267 (B-48).
 * ----------------------------------------------------------------------------------------------- */

export type FormaTopografica = 'loma2D' | 'escarpe2D' | 'colina3D';

export const FORMAS_TOPOGRAFICAS: readonly { id: FormaTopografica; nombre: string }[] = [
  { id: 'loma2D', nombre: 'Loma bidimensional (2D)' },
  { id: 'escarpe2D', nombre: 'Escarpe bidimensional (2D)' },
  { id: 'colina3D', nombre: 'Colina tridimensional axisimétrica (3D)' },
];

/**
 * Parámetros para el aumento de la velocidad sobre colinas y escarpes (PDF p.267, B-48).
 * `k1PorHLh`: cociente K1/(H/Lh) para las exposiciones B, C y D. `gamma`: factor de atenuación en altura.
 * `muBarlovento` / `muSotavento`: factor de atenuación horizontal hacia barlovento o sotavento de la cresta.
 */
export const PARAMETROS_TOPOGRAFIA: Record<
  FormaTopografica,
  { k1PorHLh: Record<ExposicionViento, number>; gamma: number; muBarlovento: number; muSotavento: number }
> = {
  loma2D: { k1PorHLh: { B: 1.3, C: 1.45, D: 1.55 }, gamma: 3, muBarlovento: 1.5, muSotavento: 1.5 },
  escarpe2D: { k1PorHLh: { B: 0.75, C: 0.85, D: 0.95 }, gamma: 2.5, muBarlovento: 1.5, muSotavento: 4 },
  colina3D: { k1PorHLh: { B: 0.95, C: 1.05, D: 1.15 }, gamma: 4, muBarlovento: 1.5, muSotavento: 1.5 },
};

/** Multiplicador K1 para exposición C según H/Lh (PDF p.266, B-47): [H/Lh, loma 2D, escarpe 2D, colina 3D]. */
export const TABLA_K1_EXPOSICION_C: readonly (readonly [number, number, number, number])[] = [
  [0.2, 0.29, 0.17, 0.21],
  [0.25, 0.36, 0.21, 0.26],
  [0.3, 0.43, 0.26, 0.32],
  [0.35, 0.51, 0.3, 0.37],
  [0.4, 0.58, 0.34, 0.42],
  [0.45, 0.65, 0.38, 0.47],
  [0.5, 0.72, 0.43, 0.53],
];

/** Multiplicador K2 según x/Lh (PDF p.266, B-47): [x/Lh, escarpe 2D, todos los otros casos]. */
export const TABLA_K2: readonly (readonly [number, number, number])[] = [
  [0.0, 1.0, 1.0],
  [0.5, 0.88, 0.67],
  [1.0, 0.75, 0.33],
  [1.5, 0.63, 0.0],
  [2.0, 0.5, 0.0],
  [2.5, 0.38, 0.0],
  [3.0, 0.25, 0.0],
  [3.5, 0.13, 0.0],
  [4.0, 0.0, 0.0],
];

/** Multiplicador K3 según z/Lh (PDF p.266, B-47): [z/Lh, loma 2D, escarpe 2D, colina 3D]. */
export const TABLA_K3: readonly (readonly [number, number, number, number])[] = [
  [0.0, 1.0, 1.0, 1.0],
  [0.1, 0.74, 0.78, 0.67],
  [0.2, 0.55, 0.61, 0.45],
  [0.3, 0.41, 0.47, 0.3],
  [0.4, 0.3, 0.37, 0.2],
  [0.5, 0.22, 0.29, 0.14],
  [0.6, 0.17, 0.22, 0.09],
  [0.7, 0.12, 0.17, 0.06],
  [0.8, 0.09, 0.14, 0.04],
  [0.9, 0.07, 0.11, 0.03],
  [1.0, 0.05, 0.08, 0.02],
  [1.5, 0.01, 0.02, 0.0],
  [2.0, 0.0, 0.0, 0.0],
];

/** Alturas mínimas H de la colina o escarpe (B.6.5.7.1 e), en m. PDF p.248 (B-29). */
export const H_MIN_TOPOGRAFIA: Record<ExposicionViento, number> = { B: 18, C: 4.5, D: 4.5 };
