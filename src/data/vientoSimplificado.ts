/**
 * NSR-10, B.6.4 — Procedimiento simplificado de viento (Método 1).
 *
 * Todas las tablas están transcritas de la norma y verificadas contra la imagen de cada página
 * (PDF = página impresa B-n + 219). Unidades: presiones en kN/m², velocidades en m/s, alturas en m.
 *
 * Erratas de impresión corregidas (valores sin punto decimal en el PDF; el contexto de la tabla,
 * monótona en velocidad y en área, no deja duda del valor):
 *   Tabla pnet10 (PDF p.263, B-44): "-020" -> -0.20 (cubierta 0<θ≤7, zona 1, 5 m², 22 m/s);
 *                                   ".011" -> 0.11  (cubierta 7<θ≤27, zona 1, 2 m², 22 m/s).
 *   Tabla de aleros (PDF p.265, B-46): "-017" -> -0.17 (0<θ≤7, zona 2, 2 y 5 m², 17 m/s);
 *                                      ".0.40" -> -0.40 (7<θ≤27, zona 2, 2 m², 22 m/s);
 *                                      "-034" -> -0.34 (7<θ≤27, zona 3, 2 m², 17 m/s);
 *                                      "-020" -> -0.20 (27<θ≤45, zona 3, 2 m², 17 m/s).
 */

/** Categorías de exposición del procedimiento simplificado (B.6.5.6.3). */
export type ExposicionViento = 'B' | 'C' | 'D';

/** Velocidades básicas tabuladas (m/s) — regiones 1 a 5 de la Figura B.6.4-1. PDF p.258 (B-39). */
export const VELOCIDADES_BASICAS = [17, 22, 28, 33, 36] as const;
export type VelocidadBasica = (typeof VELOCIDADES_BASICAS)[number];

/** Figura B.6.4-1 — región del mapa de amenaza eólica -> velocidad básica. PDF p.258 (B-39). */
export const REGIONES_VIENTO: readonly { region: 1 | 2 | 3 | 4 | 5; v: VelocidadBasica; kmh: number }[] = [
  { region: 1, v: 17, kmh: 60 },
  { region: 2, v: 22, kmh: 80 },
  { region: 3, v: 28, kmh: 100 },
  { region: 4, v: 33, kmh: 120 },
  { region: 5, v: 36, kmh: 130 },
];

/** Velocidad (m/s) a usar en zonas del mapa sin estudio ("Véase la Nota", Figura B.6.4-1). PDF p.258 (B-39). */
export const VELOCIDAD_ZONAS_SIN_ESTUDIO = 28;

/** Presión mínima (kN/m²): B.6.1.3.1, B.6.1.3.2, B.6.4.2.1.1 y B.6.4.2.2.1. PDF p.240 (B-21), p.245 (B-26), p.246 (B-27). */
export const PRESION_MINIMA = 0.4;

/** Altura máxima del Método 1 (m): B.6.4.1.1(b) / B.6.4.1.2(a). PDF p.244–245 (B-25, B-26). */
export const ALTURA_MAXIMA_METODO_1 = 18;

/** Ángulos máximos de cubierta (grados), B.6.4.1.1(g) y B.6.4.1.2(d). PDF p.245 (B-26). */
export const ANGULO_MAXIMO_SPRFV = 45;
export const ANGULO_MAXIMO_COMPONENTES_DOS_AGUAS = 45;
export const ANGULO_MAXIMO_COMPONENTES_CUATRO_AGUAS = 27;

/** Categorías de uso A.2.5 (I a IV) para el factor de importancia de viento. */
export type CategoriaUso = 'I' | 'II' | 'III' | 'IV';

/**
 * Tabla B.6.5-1 — Factor de importancia I (cargas de viento). PDF p.298 (B-79).
 * `normal`: regiones no propensas a huracanes y regiones con huracanes de V = 40–45 m/s
 * (todas las velocidades del mapa colombiano, V ≤ 36 m/s). `huracan`: regiones con huracanes y V > 45 m/s.
 */
export const FACTOR_IMPORTANCIA_VIENTO: Record<CategoriaUso, { normal: number; huracan: number }> = {
  I: { normal: 0.87, huracan: 0.77 },
  II: { normal: 1.0, huracan: 1.0 },
  III: { normal: 1.15, huracan: 1.15 },
  IV: { normal: 1.15, huracan: 1.15 },
};

/**
 * Figura B.6.4-2 (continuación) — Factor de ajuste por altura del edificio y exposición, λ.
 * PDF p.261 (B-42). El mismo cuadro se repite en PDF p.265 (B-46) con idéntico contenido.
 */
export const TABLA_LAMBDA: readonly { h: number; B: number; C: number; D: number }[] = [
  { h: 4.5, B: 1.0, C: 1.21, D: 1.47 },
  { h: 6.0, B: 1.0, C: 1.29, D: 1.55 },
  { h: 7.5, B: 1.0, C: 1.35, D: 1.61 },
  { h: 9.0, B: 1.0, C: 1.4, D: 1.66 },
  { h: 10.5, B: 1.05, C: 1.45, D: 1.7 },
  { h: 12.0, B: 1.09, C: 1.49, D: 1.74 },
  { h: 13.5, B: 1.12, C: 1.53, D: 1.78 },
  { h: 15.0, B: 1.16, C: 1.56, D: 1.81 },
  { h: 16.5, B: 1.19, C: 1.59, D: 1.84 },
  { h: 18.0, B: 1.22, C: 1.62, D: 1.87 },
];

/** Zonas de presión del SPRFV (Figura B.6.4-2): A–D horizontales, E–H verticales, EOH/GOH aleros. */
export const ZONAS_SPRFV = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'EOH', 'GOH'] as const;
export type ZonaSprfv = (typeof ZONAS_SPRFV)[number];

/** Descripción de cada zona (Figura B.6.4-2, notas 8 y 9). PDF p.259 (B-40). */
export const DESCRIPCION_ZONAS_SPRFV: Record<ZonaSprfv, string> = {
  A: 'Zona final del muro (presión horizontal)',
  B: 'Zona final de la cubierta (presión horizontal)',
  C: 'Zona interior del muro (presión horizontal)',
  D: 'Zona interior de la cubierta (presión horizontal)',
  E: 'Zona final de cubierta a barlovento (presión vertical)',
  F: 'Zona final de cubierta a sotavento (presión vertical)',
  G: 'Zona interior de cubierta a barlovento (presión vertical)',
  H: 'Zona interior de cubierta a sotavento (presión vertical)',
  EOH: 'Alero a barlovento bajo la zona E (proyección horizontal)',
  GOH: 'Alero a barlovento bajo la zona G (proyección horizontal)',
};

/**
 * Ángulos tabulados de cubierta en la Figura B.6.4-2: `5` representa la fila "0 a 5",
 * `30` representa la fila "30 a 45"; 10, 15, 20 y 25 son valores puntuales.
 */
export type AnguloTabulado = 5 | 10 | 15 | 20 | 25 | 30;
export const ANGULOS_TABULADOS: readonly AnguloTabulado[] = [5, 10, 15, 20, 25, 30];

export type FilaPs10 = {
  v: VelocidadBasica;
  ang: AnguloTabulado;
  /** Caso de carga 1 o 2 (el caso 2 solo existe para 25° y "30 a 45"). */
  caso: 1 | 2;
  /** Presiones en el orden de ZONAS_SPRFV; `null` = "----" en la norma (no aplica). */
  p: (number | null)[];
};

/**
 * Figura B.6.4-2 (continuación) — Presión básica de viento ps10 (kN/m²).
 * Exposición B, h = 10 m, Kzt = 1.0, I = 1.0. PDF p.260 (B-41).
 */
export const PS10: readonly FilaPs10[] = [
  { v: 17, ang: 5, caso: 1, p: [0.11, -0.05, 0.07, -0.03, -0.13, -0.07, -0.09, -0.06, -0.18, -0.14] },
  { v: 17, ang: 10, caso: 1, p: [0.12, -0.05, 0.08, -0.03, -0.13, -0.08, -0.09, -0.06, -0.18, -0.14] },
  { v: 17, ang: 15, caso: 1, p: [0.13, -0.04, 0.09, -0.02, -0.13, -0.08, -0.09, -0.06, -0.18, -0.14] },
  { v: 17, ang: 20, caso: 1, p: [0.15, -0.04, 0.10, -0.02, -0.13, -0.09, -0.09, -0.07, -0.18, -0.14] },
  { v: 17, ang: 25, caso: 1, p: [0.13, 0.02, 0.10, 0.02, -0.06, -0.08, -0.04, -0.06, -0.11, -0.09] },
  { v: 17, ang: 25, caso: 2, p: [null, null, null, null, -0.02, -0.04, -0.01, -0.03, null, null] },
  { v: 17, ang: 30, caso: 1, p: [0.12, 0.08, 0.09, 0.06, 0.01, -0.07, 0.00, -0.06, -0.04, -0.05] },
  { v: 17, ang: 30, caso: 2, p: [0.12, 0.08, 0.09, 0.06, 0.05, -0.04, 0.04, -0.03, -0.04, -0.05] },
  { v: 22, ang: 5, caso: 1, p: [0.19, -0.10, 0.12, -0.06, -0.23, -0.13, -0.16, -0.10, -0.32, -0.25] },
  { v: 22, ang: 10, caso: 1, p: [0.21, -0.09, 0.14, -0.05, -0.23, -0.14, -0.16, -0.11, -0.32, -0.25] },
  { v: 22, ang: 15, caso: 1, p: [0.24, -0.08, 0.16, -0.04, -0.23, -0.15, -0.16, -0.11, -0.32, -0.25] },
  { v: 22, ang: 20, caso: 1, p: [0.26, -0.07, 0.17, -0.04, -0.23, -0.16, -0.16, -0.12, -0.32, -0.25] },
  { v: 22, ang: 25, caso: 1, p: [0.24, 0.04, 0.17, 0.04, -0.10, -0.14, -0.08, -0.11, -0.19, -0.17] },
  { v: 22, ang: 25, caso: 2, p: [null, null, null, null, -0.04, -0.08, -0.01, -0.05, null, null] },
  { v: 22, ang: 30, caso: 1, p: [0.21, 0.14, 0.17, 0.11, 0.02, -0.13, 0.00, -0.11, -0.07, -0.09] },
  { v: 22, ang: 30, caso: 2, p: [0.21, 0.14, 0.17, 0.11, 0.08, -0.06, 0.07, -0.05, -0.07, -0.09] },
  { v: 28, ang: 5, caso: 1, p: [0.29, -0.15, 0.19, -0.09, -0.35, -0.20, -0.25, -0.16, -0.49, -0.39] },
  { v: 28, ang: 10, caso: 1, p: [0.33, -0.14, 0.22, -0.08, -0.35, -0.21, -0.25, -0.17, -0.49, -0.39] },
  { v: 28, ang: 15, caso: 1, p: [0.37, -0.12, 0.25, -0.07, -0.35, -0.23, -0.25, -0.18, -0.49, -0.39] },
  { v: 28, ang: 20, caso: 1, p: [0.41, -0.11, 0.27, -0.06, -0.35, -0.25, -0.25, -0.19, -0.49, -0.39] },
  { v: 28, ang: 25, caso: 1, p: [0.37, 0.06, 0.27, 0.06, -0.16, -0.22, -0.12, -0.18, -0.30, -0.26] },
  { v: 28, ang: 25, caso: 2, p: [null, null, null, null, -0.06, -0.12, -0.02, -0.08, null, null] },
  { v: 28, ang: 30, caso: 1, p: [0.33, 0.23, 0.26, 0.18, 0.03, -0.20, 0.01, -0.17, -0.12, -0.13] },
  { v: 28, ang: 30, caso: 2, p: [0.33, 0.23, 0.26, 0.18, 0.13, -0.10, 0.11, -0.07, -0.12, -0.13] },
  { v: 33, ang: 5, caso: 1, p: [0.42, -0.22, 0.28, -0.13, -0.51, -0.29, -0.35, -0.22, -0.71, -0.56] },
  { v: 33, ang: 10, caso: 1, p: [0.48, -0.20, 0.32, -0.11, -0.51, -0.31, -0.35, -0.24, -0.71, -0.56] },
  { v: 33, ang: 15, caso: 1, p: [0.53, -0.18, 0.35, -0.10, -0.51, -0.33, -0.35, -0.25, -0.71, -0.56] },
  { v: 33, ang: 20, caso: 1, p: [0.59, -0.15, 0.39, -0.08, -0.51, -0.35, -0.35, -0.27, -0.71, -0.56] },
  { v: 33, ang: 25, caso: 1, p: [0.53, 0.08, 0.38, 0.09, -0.24, -0.32, -0.17, -0.26, -0.44, -0.37] },
  { v: 33, ang: 25, caso: 2, p: [null, null, null, null, -0.09, -0.17, -0.03, -0.11, null, null] },
  { v: 33, ang: 30, caso: 1, p: [0.48, 0.32, 0.38, 0.26, 0.04, -0.29, 0.01, -0.25, -0.17, -0.19] },
  { v: 33, ang: 30, caso: 2, p: [0.48, 0.32, 0.38, 0.26, 0.18, -0.14, 0.16, -0.10, -0.17, -0.19] },
  { v: 36, ang: 5, caso: 1, p: [0.50, -0.26, 0.33, -0.15, -0.60, -0.34, -0.41, -0.26, -0.83, -0.65] },
  { v: 36, ang: 10, caso: 1, p: [0.56, -0.23, 0.37, -0.13, -0.60, -0.36, -0.41, -0.28, -0.83, -0.65] },
  { v: 36, ang: 15, caso: 1, p: [0.62, -0.21, 0.41, -0.12, -0.60, -0.39, -0.41, -0.30, -0.83, -0.65] },
  { v: 36, ang: 20, caso: 1, p: [0.69, -0.18, 0.46, -0.10, -0.60, -0.41, -0.41, -0.32, -0.83, -0.65] },
  { v: 36, ang: 25, caso: 1, p: [0.62, 0.10, 0.45, 0.10, -0.28, -0.38, -0.20, -0.30, -0.51, -0.44] },
  { v: 36, ang: 25, caso: 2, p: [null, null, null, null, -0.10, -0.20, -0.03, -0.13, null, null] },
  { v: 36, ang: 30, caso: 1, p: [0.56, 0.38, 0.44, 0.30, 0.04, -0.34, 0.01, -0.29, -0.19, -0.22] },
  { v: 36, ang: 30, caso: 2, p: [0.56, 0.38, 0.44, 0.30, 0.22, -0.17, 0.19, -0.12, -0.19, -0.22] },
];

/** Agrupación de superficies de las tablas de componentes y revestimientos (Figura B.6.4-3). */
export type GrupoSuperficie = 'c0-7' | 'c7-27' | 'c27-45' | 'muro';

/** Áreas efectivas de viento tabuladas (m²). Muros: hasta 50 m²; cubiertas y aleros: hasta 10 m². */
export const AREAS_CUBIERTA = [1, 2, 5, 10] as const;
export const AREAS_MURO = [1, 2, 5, 10, 50] as const;

export type FilaPnet10 = {
  grupo: GrupoSuperficie;
  /** Cubiertas: zonas 1 (interior), 2 (final), 3 (esquinera). Muros: 4 (interior), 5 (final). */
  zona: 1 | 2 | 3 | 4 | 5;
  /** Área efectiva de viento (m²). */
  area: number;
  /** [positiva, negativa] para V = 17, 22, 28, 33 y 36 m/s (en ese orden). */
  p: [number, number][];
};

/**
 * Figura B.6.4-3 (continuación) — Presión neta de diseño pnet10 (kN/m²).
 * Exposición B, h = 10 m, Kzt = 1.0, I = 1.0. PDF p.263 (B-44) y p.264 (B-45).
 * Cubiertas: c0-7 (0<θ≤7°), c7-27 (7<θ≤27°), c27-45 (27<θ≤45°). Muros: zonas 4 y 5.
 */
export const PNET10: readonly FilaPnet10[] = [
  { grupo: 'c0-7', zona: 1, area: 1, p: [[0.05, -0.12], [0.09, -0.21], [0.14, -0.33], [0.20, -0.48], [0.23, -0.56]] },
  { grupo: 'c0-7', zona: 1, area: 2, p: [[0.05, -0.12], [0.08, -0.21], [0.13, -0.32], [0.18, -0.47], [0.22, -0.55]] },
  { grupo: 'c0-7', zona: 1, area: 5, p: [[0.04, -0.11], [0.07, -0.20], [0.12, -0.30], [0.17, -0.45], [0.19, -0.53]] },
  { grupo: 'c0-7', zona: 1, area: 10, p: [[0.04, -0.11], [0.07, -0.19], [0.11, -0.30], [0.15, -0.44], [0.18, -0.51]] },
  { grupo: 'c0-7', zona: 2, area: 1, p: [[0.05, -0.20], [0.09, -0.36], [0.14, -0.56], [0.20, -0.80], [0.23, -0.94]] },
  { grupo: 'c0-7', zona: 2, area: 2, p: [[0.05, -0.18], [0.08, -0.32], [0.13, -0.50], [0.18, -0.72], [0.22, -0.84]] },
  { grupo: 'c0-7', zona: 2, area: 5, p: [[0.04, -0.15], [0.07, -0.27], [0.12, -0.42], [0.17, -0.60], [0.19, -0.71]] },
  { grupo: 'c0-7', zona: 2, area: 10, p: [[0.04, -0.13], [0.07, -0.23], [0.11, -0.36], [0.15, -0.52], [0.18, -0.61]] },
  { grupo: 'c0-7', zona: 3, area: 1, p: [[0.05, -0.30], [0.09, -0.54], [0.14, -0.84], [0.20, -1.21], [0.23, -1.42]] },
  { grupo: 'c0-7', zona: 3, area: 2, p: [[0.05, -0.25], [0.08, -0.45], [0.13, -0.70], [0.18, -1.00], [0.22, -1.18]] },
  { grupo: 'c0-7', zona: 3, area: 5, p: [[0.04, -0.18], [0.07, -0.32], [0.12, -0.50], [0.17, -0.73], [0.19, -0.85]] },
  { grupo: 'c0-7', zona: 3, area: 10, p: [[0.04, -0.13], [0.07, -0.23], [0.11, -0.36], [0.15, -0.52], [0.18, -0.61]] },
  { grupo: 'c7-27', zona: 1, area: 1, p: [[0.07, -0.11], [0.12, -0.19], [0.19, -0.30], [0.28, -0.44], [0.32, -0.51]] },
  { grupo: 'c7-27', zona: 1, area: 2, p: [[0.06, -0.11], [0.11, -0.19], [0.17, -0.30], [0.25, -0.43], [0.29, -0.50]] },
  { grupo: 'c7-27', zona: 1, area: 5, p: [[0.06, -0.10], [0.10, -0.18], [0.15, -0.28], [0.22, -0.41], [0.26, -0.48]] },
  { grupo: 'c7-27', zona: 1, area: 10, p: [[0.05, -0.10], [0.09, -0.18], [0.14, -0.28], [0.20, -0.40], [0.23, -0.47]] },
  { grupo: 'c7-27', zona: 2, area: 1, p: [[0.07, -0.19], [0.12, -0.34], [0.19, -0.53], [0.28, -0.76], [0.32, -0.89]] },
  { grupo: 'c7-27', zona: 2, area: 2, p: [[0.06, -0.17], [0.11, -0.31], [0.17, -0.49], [0.25, -0.70], [0.29, -0.82]] },
  { grupo: 'c7-27', zona: 2, area: 5, p: [[0.06, -0.16], [0.10, -0.28], [0.15, -0.43], [0.22, -0.62], [0.26, -0.73]] },
  { grupo: 'c7-27', zona: 2, area: 10, p: [[0.05, -0.14], [0.09, -0.25], [0.14, -0.39], [0.20, -0.56], [0.23, -0.66]] },
  { grupo: 'c7-27', zona: 3, area: 1, p: [[0.07, -0.28], [0.12, -0.50], [0.19, -0.78], [0.28, -1.13], [0.32, -1.32]] },
  { grupo: 'c7-27', zona: 3, area: 2, p: [[0.06, -0.26], [0.11, -0.47], [0.17, -0.73], [0.25, -1.05], [0.29, -1.24]] },
  { grupo: 'c7-27', zona: 3, area: 5, p: [[0.06, -0.24], [0.10, -0.43], [0.15, -0.67], [0.22, -0.96], [0.26, -1.12]] },
  { grupo: 'c7-27', zona: 3, area: 10, p: [[0.05, -0.22], [0.09, -0.39], [0.14, -0.61], [0.20, -0.88], [0.23, -1.04]] },
  { grupo: 'c27-45', zona: 1, area: 1, p: [[0.11, -0.12], [0.19, -0.21], [0.30, -0.33], [0.44, -0.48], [0.51, -0.56]] },
  { grupo: 'c27-45', zona: 1, area: 2, p: [[0.11, -0.11], [0.19, -0.20], [0.30, -0.31], [0.43, -0.45], [0.50, -0.53]] },
  { grupo: 'c27-45', zona: 1, area: 5, p: [[0.10, -0.11], [0.18, -0.19], [0.28, -0.29], [0.41, -0.42], [0.48, -0.50]] },
  { grupo: 'c27-45', zona: 1, area: 10, p: [[0.10, -0.10], [0.18, -0.18], [0.28, -0.28], [0.40, -0.40], [0.47, -0.47]] },
  { grupo: 'c27-45', zona: 2, area: 1, p: [[0.11, -0.14], [0.19, -0.25], [0.30, -0.39], [0.44, -0.56], [0.51, -0.66]] },
  { grupo: 'c27-45', zona: 2, area: 2, p: [[0.11, -0.13], [0.19, -0.24], [0.30, -0.37], [0.43, -0.53], [0.50, -0.63]] },
  { grupo: 'c27-45', zona: 2, area: 5, p: [[0.10, -0.13], [0.18, -0.22], [0.28, -0.35], [0.41, -0.50], [0.48, -0.59]] },
  { grupo: 'c27-45', zona: 2, area: 10, p: [[0.10, -0.12], [0.18, -0.21], [0.28, -0.33], [0.40, -0.48], [0.47, -0.56]] },
  { grupo: 'c27-45', zona: 3, area: 1, p: [[0.11, -0.14], [0.19, -0.25], [0.30, -0.39], [0.44, -0.56], [0.51, -0.66]] },
  { grupo: 'c27-45', zona: 3, area: 2, p: [[0.11, -0.13], [0.19, -0.24], [0.30, -0.37], [0.43, -0.53], [0.50, -0.63]] },
  { grupo: 'c27-45', zona: 3, area: 5, p: [[0.10, -0.13], [0.18, -0.22], [0.28, -0.35], [0.41, -0.50], [0.48, -0.59]] },
  { grupo: 'c27-45', zona: 3, area: 10, p: [[0.10, -0.12], [0.18, -0.21], [0.28, -0.33], [0.40, -0.48], [0.47, -0.56]] },
  { grupo: 'muro', zona: 4, area: 1, p: [[0.12, -0.13], [0.21, -0.23], [0.33, -0.36], [0.48, -0.52], [0.56, -0.61]] },
  { grupo: 'muro', zona: 4, area: 2, p: [[0.11, -0.12], [0.20, -0.22], [0.32, -0.35], [0.46, -0.50], [0.54, -0.58]] },
  { grupo: 'muro', zona: 4, area: 5, p: [[0.11, -0.12], [0.19, -0.21], [0.30, -0.32], [0.43, -0.47], [0.50, -0.55]] },
  { grupo: 'muro', zona: 4, area: 10, p: [[0.10, -0.11], [0.18, -0.20], [0.28, -0.31], [0.41, -0.45], [0.48, -0.53]] },
  { grupo: 'muro', zona: 4, area: 50, p: [[0.09, -0.10], [0.16, -0.18], [0.25, -0.28], [0.36, -0.40], [0.42, -0.47]] },
  { grupo: 'muro', zona: 5, area: 1, p: [[0.12, -0.16], [0.21, -0.28], [0.33, -0.45], [0.48, -0.64], [0.56, -0.75]] },
  { grupo: 'muro', zona: 5, area: 2, p: [[0.11, -0.15], [0.20, -0.27], [0.32, -0.41], [0.46, -0.60], [0.54, -0.70]] },
  { grupo: 'muro', zona: 5, area: 5, p: [[0.11, -0.14], [0.19, -0.24], [0.30, -0.38], [0.43, -0.54], [0.50, -0.64]] },
  { grupo: 'muro', zona: 5, area: 10, p: [[0.10, -0.12], [0.18, -0.22], [0.28, -0.35], [0.41, -0.50], [0.48, -0.58]] },
  { grupo: 'muro', zona: 5, area: 50, p: [[0.09, -0.10], [0.16, -0.18], [0.25, -0.28], [0.36, -0.40], [0.42, -0.47]] },
];

export type FilaAlero = {
  grupo: Exclude<GrupoSuperficie, 'muro'>;
  zona: 2 | 3;
  area: number;
  /** Presión negativa (succión) para V = 17, 22, 28, 33 y 36 m/s. */
  p: number[];
};

/**
 * Figura B.6.4-3 (continuación) — Presión neta de diseño de alero pnet10 (kN/m²), solo succión.
 * Exposición B, h = 10 m, I = 1.0. PDF p.265 (B-46).
 */
export const PNET10_ALERO: readonly FilaAlero[] = [
  { grupo: 'c0-7', zona: 2, area: 1, p: [-0.17, -0.31, -0.48, -0.69, -0.81] },
  { grupo: 'c0-7', zona: 2, area: 2, p: [-0.17, -0.30, -0.47, -0.68, -0.79] },
  { grupo: 'c0-7', zona: 2, area: 5, p: [-0.17, -0.29, -0.46, -0.66, -0.77] },
  { grupo: 'c0-7', zona: 2, area: 10, p: [-0.16, -0.29, -0.45, -0.65, -0.76] },
  { grupo: 'c0-7', zona: 3, area: 1, p: [-0.28, -0.51, -0.79, -1.14, -1.33] },
  { grupo: 'c0-7', zona: 3, area: 2, p: [-0.22, -0.40, -0.62, -0.89, -1.04] },
  { grupo: 'c0-7', zona: 3, area: 5, p: [-0.14, -0.25, -0.39, -0.57, -0.67] },
  { grupo: 'c0-7', zona: 3, area: 10, p: [-0.08, -0.15, -0.23, -0.33, -0.39] },
  { grupo: 'c7-27', zona: 2, area: 1, p: [-0.22, -0.40, -0.62, -0.89, -1.05] },
  { grupo: 'c7-27', zona: 2, area: 2, p: [-0.22, -0.40, -0.62, -0.89, -1.05] },
  { grupo: 'c7-27', zona: 2, area: 5, p: [-0.22, -0.40, -0.62, -0.89, -1.05] },
  { grupo: 'c7-27', zona: 2, area: 10, p: [-0.22, -0.40, -0.62, -0.89, -1.05] },
  { grupo: 'c7-27', zona: 3, area: 1, p: [-0.38, -0.67, -1.04, -1.50, -1.76] },
  { grupo: 'c7-27', zona: 3, area: 2, p: [-0.34, -0.60, -0.94, -1.35, -1.59] },
  { grupo: 'c7-27', zona: 3, area: 5, p: [-0.29, -0.52, -0.81, -1.16, -1.36] },
  { grupo: 'c7-27', zona: 3, area: 10, p: [-0.25, -0.45, -0.70, -1.02, -1.19] },
  { grupo: 'c27-45', zona: 2, area: 1, p: [-0.20, -0.36, -0.56, -0.81, -0.95] },
  { grupo: 'c27-45', zona: 2, area: 2, p: [-0.20, -0.35, -0.55, -0.79, -0.93] },
  { grupo: 'c27-45', zona: 2, area: 5, p: [-0.19, -0.34, -0.52, -0.76, -0.89] },
  { grupo: 'c27-45', zona: 2, area: 10, p: [-0.18, -0.32, -0.51, -0.73, -0.86] },
  { grupo: 'c27-45', zona: 3, area: 1, p: [-0.20, -0.36, -0.56, -0.81, -0.95] },
  { grupo: 'c27-45', zona: 3, area: 2, p: [-0.20, -0.35, -0.55, -0.79, -0.93] },
  { grupo: 'c27-45', zona: 3, area: 5, p: [-0.19, -0.34, -0.52, -0.76, -0.89] },
  { grupo: 'c27-45', zona: 3, area: 10, p: [-0.18, -0.32, -0.51, -0.73, -0.86] },
];
