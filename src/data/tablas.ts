/**
 * Tablas numéricas del Título A de la NSR-10 transcritas del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Cada constante cita su tabla y página.
 * Página de la norma "A-n" = página PDF n + 43.
 */

/** Tipos de perfil de suelo (Tabla A.2.4-1). F exige estudio de sitio (A.2.10). */
export type PerfilSuelo = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type PerfilSueloConCoef = Exclude<PerfilSuelo, 'F'>;

/** Valores de Aa o Av que definen las columnas de las tablas A.2.4-3 y A.2.4-4. */
export const COLUMNAS_INTENSIDAD = [0.1, 0.2, 0.3, 0.4, 0.5] as const;

/**
 * Tabla A.2.4-3 — Coeficiente Fa (zona de períodos cortos). PDF p.66 (A-23).
 * Columnas: Aa ≤ 0.1, 0.2, 0.3, 0.4, ≥ 0.5.
 */
export const TABLA_FA: Record<PerfilSueloConCoef, readonly number[]> = {
  A: [0.8, 0.8, 0.8, 0.8, 0.8],
  B: [1.0, 1.0, 1.0, 1.0, 1.0],
  C: [1.2, 1.2, 1.1, 1.0, 1.0],
  D: [1.6, 1.4, 1.2, 1.1, 1.0],
  E: [2.5, 1.7, 1.2, 0.9, 0.9],
};

/**
 * Tabla A.2.4-4 — Coeficiente Fv (zona de períodos intermedios). PDF p.67 (A-24).
 * Columnas: Av ≤ 0.1, 0.2, 0.3, 0.4, ≥ 0.5.
 */
export const TABLA_FV: Record<PerfilSueloConCoef, readonly number[]> = {
  A: [0.8, 0.8, 0.8, 0.8, 0.8],
  B: [1.0, 1.0, 1.0, 1.0, 1.0],
  C: [1.7, 1.6, 1.5, 1.4, 1.3],
  D: [2.4, 2.0, 1.8, 1.6, 1.5],
  E: [3.5, 3.2, 2.8, 2.4, 2.4],
};

/** Grupos de uso (A.2.5.1). */
export type GrupoUso = 'I' | 'II' | 'III' | 'IV';

/** Tabla A.2.5-1 — Coeficiente de importancia I. PDF p.69 (A-26). */
export const COEFICIENTE_IMPORTANCIA: Record<GrupoUso, number> = {
  IV: 1.5,
  III: 1.25,
  II: 1.1,
  I: 1.0,
};

export const GRUPOS_USO: ReadonlyArray<{ grupo: GrupoUso; nombre: string; ref: string }> = [
  { grupo: 'IV', nombre: 'Edificaciones indispensables', ref: 'A.2.5.1.1' },
  { grupo: 'III', nombre: 'Edificaciones de atención a la comunidad', ref: 'A.2.5.1.2' },
  { grupo: 'II', nombre: 'Estructuras de ocupación especial', ref: 'A.2.5.1.3' },
  { grupo: 'I', nombre: 'Estructuras de ocupación normal', ref: 'A.2.5.1.4' },
];

/** Tabla A.2.2-1 — Valores de Aa y Av según la región de los mapas. PDF p.58 (A-15). */
export const REGIONES_AA_AV: ReadonlyArray<{ region: number; valor: number }> = [
  { region: 10, valor: 0.5 },
  { region: 9, valor: 0.45 },
  { region: 8, valor: 0.4 },
  { region: 7, valor: 0.35 },
  { region: 6, valor: 0.3 },
  { region: 5, valor: 0.25 },
  { region: 4, valor: 0.2 },
  { region: 3, valor: 0.15 },
  { region: 2, valor: 0.1 },
  { region: 1, valor: 0.05 },
];

/** Sistemas con parámetros Ct y α (Tabla A.4.2-1). PDF p.107 (A-64). */
export type SistemaPeriodo =
  | 'porticos-concreto'
  | 'porticos-acero'
  | 'diagonales-excentricas'
  | 'otros-muros';

export const TABLA_CT_ALFA: Record<SistemaPeriodo, { ct: number; alpha: number; descripcion: string }> = {
  'porticos-concreto': {
    ct: 0.047,
    alpha: 0.9,
    descripcion: 'Pórticos resistentes a momentos de concreto reforzado (sin elementos más rígidos que limiten desplazamientos)',
  },
  'porticos-acero': {
    ct: 0.072,
    alpha: 0.8,
    descripcion: 'Pórticos resistentes a momentos de acero estructural (sin elementos más rígidos que limiten desplazamientos)',
  },
  'diagonales-excentricas': {
    ct: 0.073,
    alpha: 0.75,
    descripcion: 'Pórticos arriostrados de acero con diagonales excéntricas restringidas a pandeo',
  },
  'otros-muros': {
    ct: 0.049,
    alpha: 0.75,
    descripcion: 'Todos los otros sistemas basados en muros de rigidez similar o mayor a la de muros de concreto o mampostería',
  },
};

/** Tabla A.6.4-1 — Derivas máximas como fracción de la altura de piso hpi. PDF p.119 (A-76). */
export const DERIVA_LIMITE = {
  general: 0.01, // concreto reforzado, metálicas, madera y mampostería que cumple A.6.4.1.3
  mamposteriaCortante: 0.005, // mampostería poco esbelta / falla por cortante (A.6.4.1.4)
} as const;

/** Tabla A.12.5-1 — Derivas máximas para el umbral de daño. PDF p.166 (A-123). */
export const DERIVA_LIMITE_UMBRAL_DANO = {
  general: 0.004,
  mamposteriaCortante: 0.002,
} as const;

/** Tabla A.6.5-1 — Coeficientes de separación sísmica respecto al paramento. PDF p.122 (A-79). */
export type ColindanciaSeparacion = 'coinciden-losas' | 'no-coinciden-losas' | 'sin-vecino-o-separado';
