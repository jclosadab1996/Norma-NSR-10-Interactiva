/**
 * Detalles del refuerzo (Capítulo C.7 de la NSR-10), transcritos del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302.
 * Cada tabla se verificó contra la imagen de la página (el texto extraído sale desordenado).
 *
 *   Tablas C.3.5.3-1 y C.3.5.3-2  dimensiones de las barras ....... PDF p.329 (C-27)
 *   C.7.1                         ganchos estándar ................ PDF p.353 (C-51)
 *   Tabla C.7.2                  diámetros mínimos de doblado ..... PDF p.353 (C-51)
 *   C.7.5.2.1                     tolerancias de colocación ....... PDF p.354 (C-52)
 *   C.7.6                         separación del refuerzo ......... PDF p.355 (C-53)
 *   C.7.7.1 y C.7.7.2             recubrimientos (sitio) .......... PDF p.356 (C-54)
 *   C.7.7.3                       recubrimientos (prefabricado) ... PDF p.356–357 (C-54 a C-55)
 *   C.7.10                        espirales y estribos de columna . PDF p.359–360 (C-57 a C-58)
 *   C.7.12                        retracción y temperatura ........ PDF p.361 (C-59)
 *
 * Unidades: mm, mm², kg/m, MPa. "No. n" = n octavos de pulgada (diámetro de referencia); "nM" = diámetro nominal de n mm.
 */

// ---------------------------------------------------------------------------------------------
// Dimensiones nominales de las barras — Tablas C.3.5.3-1 y C.3.5.3-2 (PDF p.329, C-27)
// ---------------------------------------------------------------------------------------------

export type SistemaBarra = 'pulgada' | 'metrico';

export interface BarraRefuerzo {
  /** Identificador único: 'No.5' o '16M'. */
  id: string;
  sistema: SistemaBarra;
  /** Designación tal como la escribe la norma. */
  designacion: string;
  /** Diámetro de referencia en pulgadas (solo sistema de pulgada), p. ej. '5/8"'. */
  diametroPulgada?: string;
  /** Diámetro nominal db (mm). */
  db: number;
  /** Área nominal (mm²). */
  area: number;
  /** Perímetro nominal (mm). */
  perimetro: number;
  /** Masa nominal (kg/m). */
  masa: number;
  /**
   * Tamaño equivalente en "número de barra" que usa el Capítulo C.7 para clasificar (los pares No./M los escribe el propio
   * C.7: No.3=10M, No.4=12M, No.5=16M, No.6=20M, No.7=22M, No.8=25M, No.9=30M, No.10=32M, No.11=36M, No.14=45M,
   * No.18=55M, No.2=6M). Para 8M y 18M el capítulo no da equivalente: se usa un valor intermedio (8M → 2.5; 18M → 5.5),
   * criterio PROPIO por diámetro, y `sinEquivalente` queda en true.
   */
  eq: number;
  sinEquivalente?: boolean;
}

/** Tabla C.3.5.3-2 — Barras con diámetros basados en octavos de pulgada (PDF p.329, C-27). */
export const BARRAS_PULGADA: readonly BarraRefuerzo[] = [
  { id: 'No.2', sistema: 'pulgada', designacion: 'No. 2', diametroPulgada: '1/4"', db: 6.4, area: 32, perimetro: 20.0, masa: 0.25, eq: 2 },
  { id: 'No.3', sistema: 'pulgada', designacion: 'No. 3', diametroPulgada: '3/8"', db: 9.5, area: 71, perimetro: 30.0, masa: 0.56, eq: 3 },
  { id: 'No.4', sistema: 'pulgada', designacion: 'No. 4', diametroPulgada: '1/2"', db: 12.7, area: 129, perimetro: 40.0, masa: 0.994, eq: 4 },
  { id: 'No.5', sistema: 'pulgada', designacion: 'No. 5', diametroPulgada: '5/8"', db: 15.9, area: 199, perimetro: 50.0, masa: 1.552, eq: 5 },
  { id: 'No.6', sistema: 'pulgada', designacion: 'No. 6', diametroPulgada: '3/4"', db: 19.1, area: 284, perimetro: 60.0, masa: 2.235, eq: 6 },
  { id: 'No.7', sistema: 'pulgada', designacion: 'No. 7', diametroPulgada: '7/8"', db: 22.2, area: 387, perimetro: 70.0, masa: 3.042, eq: 7 },
  { id: 'No.8', sistema: 'pulgada', designacion: 'No. 8', diametroPulgada: '1"', db: 25.4, area: 510, perimetro: 80.0, masa: 3.973, eq: 8 },
  { id: 'No.9', sistema: 'pulgada', designacion: 'No. 9', diametroPulgada: '1-1/8"', db: 28.7, area: 645, perimetro: 90.0, masa: 5.06, eq: 9 },
  { id: 'No.10', sistema: 'pulgada', designacion: 'No. 10', diametroPulgada: '1-1/4"', db: 32.3, area: 819, perimetro: 101.3, masa: 6.404, eq: 10 },
  { id: 'No.11', sistema: 'pulgada', designacion: 'No. 11', diametroPulgada: '1-3/8"', db: 35.8, area: 1006, perimetro: 112.5, masa: 7.907, eq: 11 },
  { id: 'No.14', sistema: 'pulgada', designacion: 'No. 14', diametroPulgada: '1-3/4"', db: 43.0, area: 1452, perimetro: 135.1, masa: 11.38, eq: 14 },
  { id: 'No.18', sistema: 'pulgada', designacion: 'No. 18', diametroPulgada: '2-1/4"', db: 57.3, area: 2581, perimetro: 180.1, masa: 20.24, eq: 18 },
];

/** Tabla C.3.5.3-1 — Barras con diámetros basados en milímetros (PDF p.329, C-27). */
export const BARRAS_METRICAS: readonly BarraRefuerzo[] = [
  { id: '6M', sistema: 'metrico', designacion: '6M', db: 6.0, area: 28.3, perimetro: 18.85, masa: 0.222, eq: 2 },
  { id: '8M', sistema: 'metrico', designacion: '8M', db: 8.0, area: 50.3, perimetro: 25.14, masa: 0.394, eq: 2.5, sinEquivalente: true },
  { id: '10M', sistema: 'metrico', designacion: '10M', db: 10.0, area: 78.5, perimetro: 31.42, masa: 0.616, eq: 3 },
  { id: '12M', sistema: 'metrico', designacion: '12M', db: 12.0, area: 113.1, perimetro: 37.7, masa: 0.887, eq: 4 },
  { id: '16M', sistema: 'metrico', designacion: '16M', db: 16.0, area: 201.1, perimetro: 50.27, masa: 1.577, eq: 5 },
  { id: '18M', sistema: 'metrico', designacion: '18M', db: 18.0, area: 254.5, perimetro: 56.55, masa: 1.996, eq: 5.5, sinEquivalente: true },
  { id: '20M', sistema: 'metrico', designacion: '20M', db: 20.0, area: 314.2, perimetro: 62.83, masa: 2.465, eq: 6 },
  { id: '22M', sistema: 'metrico', designacion: '22M', db: 22.0, area: 380.1, perimetro: 69.12, masa: 2.982, eq: 7 },
  { id: '25M', sistema: 'metrico', designacion: '25M', db: 25.0, area: 490.9, perimetro: 78.54, masa: 3.851, eq: 8 },
  { id: '30M', sistema: 'metrico', designacion: '30M', db: 30.0, area: 706.9, perimetro: 94.25, masa: 5.544, eq: 9 },
  { id: '32M', sistema: 'metrico', designacion: '32M', db: 32.0, area: 804.2, perimetro: 100.53, masa: 6.309, eq: 10 },
  { id: '36M', sistema: 'metrico', designacion: '36M', db: 36.0, area: 1017.9, perimetro: 113.1, masa: 7.985, eq: 11 },
  { id: '45M', sistema: 'metrico', designacion: '45M', db: 45.0, area: 1590.4, perimetro: 141.37, masa: 12.477, eq: 14 },
  { id: '55M', sistema: 'metrico', designacion: '55M', db: 55.0, area: 2375.8, perimetro: 172.79, masa: 18.638, eq: 18 },
];

export const BARRAS: readonly BarraRefuerzo[] = [...BARRAS_PULGADA, ...BARRAS_METRICAS];

export function buscarBarra(id: string): BarraRefuerzo | undefined {
  return BARRAS.find((b) => b.id === id);
}

// ---------------------------------------------------------------------------------------------
// C.7.1 — Ganchos estándar (PDF p.353, C-51)
// ---------------------------------------------------------------------------------------------

export type TipoGancho =
  | 'estandar-180'
  | 'estandar-90'
  | 'estribo-90'
  | 'estribo-135'
  | 'sismico-135'
  | 'sismico-suplementario-90';

export interface DefinicionGancho {
  id: TipoGancho;
  seccion: string;
  descripcion: string;
  /** Ángulo del doblez (grados). */
  angulo: number;
  /** Extensión en el extremo libre, en múltiplos de db (para estribo-90 depende del tamaño: ver `extensionEstribo90`). */
  extensionDb: number;
  /** Extensión mínima absoluta (mm), si la norma la da. */
  minimoMm?: number;
  /** El diámetro de doblado sigue la regla de estribos (C.7.2.2) y no la Tabla C.7.2 de barras longitudinales. */
  esEstribo: boolean;
}

export const GANCHOS: readonly DefinicionGancho[] = [
  { id: 'estandar-180', seccion: 'C.7.1.1', descripcion: 'Doblez de 180° más una extensión de 4db, no menor de 65 mm', angulo: 180, extensionDb: 4, minimoMm: 65, esEstribo: false },
  { id: 'estandar-90', seccion: 'C.7.1.2', descripcion: 'Doblez de 90° más una extensión de 12db', angulo: 90, extensionDb: 12, esEstribo: false },
  { id: 'estribo-90', seccion: 'C.7.1.3 (a) y (b)', descripcion: 'Estribos y ganchos de estribo, doblez de 90°: extensión de 6db (No. 5/16M y menores) o 12db (No. 6/20M a No. 8/25M)', angulo: 90, extensionDb: 6, esEstribo: true },
  { id: 'estribo-135', seccion: 'C.7.1.3 (c)', descripcion: 'Estribos y ganchos de estribo, doblez de 135° más extensión de 6db (No. 8/25M y menores)', angulo: 135, extensionDb: 6, esEstribo: true },
  { id: 'sismico-135', seccion: 'C.7.1.4', descripcion: 'Gancho sísmico (estribos de confinamiento DMO y DES): doblez de 135° o más, extensión de 6db, no menor de 75 mm', angulo: 135, extensionDb: 6, minimoMm: 75, esEstribo: true },
  { id: 'sismico-suplementario-90', seccion: 'C.7.1.4', descripcion: 'Gancho suplementario: un extremo puede terminar en 90° o más con extensión de 6db', angulo: 90, extensionDb: 6, esEstribo: true },
];

// ---------------------------------------------------------------------------------------------
// Tabla C.7.2 — Diámetros mínimos de doblado (PDF p.353, C-51)
// ---------------------------------------------------------------------------------------------

export interface FilaDobladoMinimo {
  /** Texto del rango de barras tal como aparece en la tabla. */
  barras: string;
  /** Rango en número de barra equivalente (inclusivo). */
  eqMin: number;
  eqMax: number;
  /** Diámetro mínimo de doblado = factor · db. */
  factor: number;
}

export const TABLA_C72_DOBLADO: readonly FilaDobladoMinimo[] = [
  { barras: 'No. 3 (3/8") ó 10M (10 mm) a No. 8 (1") ó 25M (25 mm)', eqMin: 3, eqMax: 8, factor: 6 },
  { barras: 'No. 9 (1-1/8") ó 30M (30 mm), No. 10 (1-1/4") ó 32M (32 mm) y No. 11 (1-3/8") ó 36M (36 mm)', eqMin: 9, eqMax: 11, factor: 8 },
  { barras: 'No. 14 (1-3/4") ó 45M (45 mm) y No. 18 (2-1/4") ó 55M (55 mm)', eqMin: 14, eqMax: 18, factor: 10 },
];

/** C.7.2.2: diámetro interior de doblado de estribos No. 5 (16M) y menores = 4db. */
export const FACTOR_DOBLADO_ESTRIBO_PEQUENO = 4;
/** Número de barra equivalente máximo de los estribos que usan 4db (No. 5 ó 16M). */
export const EQ_MAX_ESTRIBO_4DB = 5;
/** C.7.2.3: refuerzo electrosoldado para estribos: 4db si es corrugado mayor de MD40 (7.1 mm), 2db en los demás casos. */
export const DOBLADO_MALLA = { corrugadoMayorMD40: 4, otros: 2, umbralMD40Mm: 7.1, dobladoSinSoldaduraCercaDb: 8, distanciaASoldaduraDb: 4 } as const;

// ---------------------------------------------------------------------------------------------
// C.7.5.2 — Tolerancias de colocación (PDF p.354, C-52)
// ---------------------------------------------------------------------------------------------

export interface FilaToleranciaD {
  /** Límite superior de d (mm); null = sin límite. */
  dMax: number | null;
  /** Tolerancia en d (± mm). */
  tolD: number;
  /** Tolerancia del recubrimiento especificado (− mm). */
  tolRecubrimiento: number;
}

export const TOLERANCIAS_COLOCACION: readonly FilaToleranciaD[] = [
  { dMax: 200, tolD: 10, tolRecubrimiento: 10 },
  { dMax: null, tolD: 13, tolRecubrimiento: 13 },
];

export const TOLERANCIA_FONDO_CIMBRA_MM = 6;
/** La tolerancia del recubrimiento tampoco excede 1/3 del recubrimiento especificado en planos. */
export const FRACCION_TOL_RECUBRIMIENTO = 1 / 3;
export const TOLERANCIAS_LONGITUDINALES_MM = { general: 50, extremoDiscontinuoMensulas: 13, extremoDiscontinuoOtros: 25 } as const;

// ---------------------------------------------------------------------------------------------
// C.7.6 — Límites de espaciamiento (PDF p.355, C-53)
// ---------------------------------------------------------------------------------------------

export const SEPARACION = {
  /** C.7.6.1: distancia libre mínima entre barras paralelas de una capa = db, no menor de 25 mm. */
  libreMinimaCapaMm: 25,
  /** C.7.6.2: distancia libre mínima entre capas. */
  libreMinimaEntreCapasMm: 25,
  /** C.7.6.3: elementos a compresión con espirales o estribos: 1.5db, no menor de 40 mm. */
  compresionFactorDb: 1.5,
  compresionMinimaMm: 40,
  /** C.7.6.5: muros y losas, refuerzo principal por flexión: 3h y 450 mm. */
  murosLosasFactorH: 3,
  murosLosasMaximaMm: 450,
  /** C.7.6.5: secciones críticas de losas en dos direcciones: 2h. */
  losasDosDireccionesFactorH: 2,
  /** C.7.6.5 / C.7.12.2.2: refuerzo de temperatura en losas: 5h y 450 mm. */
  temperaturaFactorH: 5,
  temperaturaMaximaMm: 450,
  /** C.7.6.6: paquetes. */
  paqueteMaxBarras: 4,
  paqueteNoEnVigasMayorQueEq: 11,
  paqueteTerminacionesDb: 40,
  /** C.7.6.7.1: tendones de pretensado. */
  tendonExtremoCentroTorones: 4,
  tendonExtremoCentroAlambres: 5,
  torones28MPaMm: { menorOIgual12_7: 45, de15_2: 50 },
} as const;

// ---------------------------------------------------------------------------------------------
// C.7.7 — Recubrimientos (PDF p.356–357, C-54 a C-55)
// ---------------------------------------------------------------------------------------------

export type AmbienteRecubrimiento = 'suelo' | 'intemperie' | 'interior';
export type ElementoRecubrimiento = 'losa-muro-vigueta' | 'viga-columna' | 'cascara' | 'panel-muro' | 'otros' | 'cualquiera';

export interface FilaRecubrimiento {
  id: string;
  norma: 'C.7.7.1' | 'C.7.7.2' | 'C.7.7.3';
  ambiente: AmbienteRecubrimiento;
  elemento: string;
  /** Qué refuerzo cubre la fila, tal como lo escribe la norma. */
  detalle: string;
  /** Recubrimiento mínimo (mm); null si la norma da una expresión (ver `formula`). */
  mm: number | null;
  /** Para "db pero no menos de …" o "db pero no menor de 16 mm y no mayor de 40 mm". */
  formula?: { tipo: 'db'; min: number; max?: number };
}

/** C.7.7.1 — Concreto construido en sitio (no preesforzado). */
export const RECUBRIMIENTO_C771: readonly FilaRecubrimiento[] = [
  { id: 'a', norma: 'C.7.7.1', ambiente: 'suelo', elemento: 'Cualquiera', detalle: 'Concreto colocado contra el suelo y expuesto permanentemente a él', mm: 75 },
  { id: 'b1', norma: 'C.7.7.1', ambiente: 'intemperie', elemento: 'Cualquiera', detalle: 'Barras No. 6 (20M) a No. 18 (55M)', mm: 50 },
  { id: 'b2', norma: 'C.7.7.1', ambiente: 'intemperie', elemento: 'Cualquiera', detalle: 'Barras No. 5 (16M), alambre MW200 o MD200 (16 mm) y menores', mm: 40 },
  { id: 'c1', norma: 'C.7.7.1', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Barras No. 14 (45M) y No. 18 (55M)', mm: 40 },
  { id: 'c2', norma: 'C.7.7.1', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Barras No. 11 (36M) y menores', mm: 20 },
  { id: 'c3', norma: 'C.7.7.1', ambiente: 'interior', elemento: 'Vigas, columnas', detalle: 'Armadura principal, estribos, espirales', mm: 40 },
  { id: 'c4', norma: 'C.7.7.1', ambiente: 'interior', elemento: 'Cáscaras y placas plegadas', detalle: 'Barra No. 6 (20M) y mayores', mm: 20 },
  { id: 'c5', norma: 'C.7.7.1', ambiente: 'interior', elemento: 'Cáscaras y placas plegadas', detalle: 'Barras No. 5 (16M), alambres MW200 o MD200 (16 mm) y menores', mm: 13 },
];

/** C.7.7.2 — Concreto construido en sitio (preesforzado): refuerzo preesforzado y no preesforzado, ductos y accesorios de extremos. */
export const RECUBRIMIENTO_C772: readonly FilaRecubrimiento[] = [
  { id: 'a', norma: 'C.7.7.2', ambiente: 'suelo', elemento: 'Cualquiera', detalle: 'Concreto colocado contra el suelo y expuesto permanentemente a él', mm: 75 },
  { id: 'b1', norma: 'C.7.7.2', ambiente: 'intemperie', elemento: 'Paneles de muros, losas, viguetas', detalle: 'Concreto expuesto a suelo o a la intemperie', mm: 25 },
  { id: 'b2', norma: 'C.7.7.2', ambiente: 'intemperie', elemento: 'Otros elementos', detalle: 'Concreto expuesto a suelo o a la intemperie', mm: 40 },
  { id: 'c1', norma: 'C.7.7.2', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Todo el refuerzo', mm: 20 },
  { id: 'c2', norma: 'C.7.7.2', ambiente: 'interior', elemento: 'Vigas, columnas', detalle: 'Refuerzo principal', mm: 40 },
  { id: 'c3', norma: 'C.7.7.2', ambiente: 'interior', elemento: 'Vigas, columnas', detalle: 'Estribos y espirales', mm: 25 },
  { id: 'c4', norma: 'C.7.7.2', ambiente: 'interior', elemento: 'Cáscaras y losas plegadas', detalle: 'Barra No. 5 (16M), alambre MW200 o MD200 (16 mm) y menores', mm: 10 },
  { id: 'c5', norma: 'C.7.7.2', ambiente: 'interior', elemento: 'Cáscaras y losas plegadas', detalle: 'Otros refuerzos: db, pero no menos de 20 mm', mm: null, formula: { tipo: 'db', min: 20 } },
];

/** C.7.7.3 — Concreto prefabricado (fabricado bajo condiciones de control de planta). */
export const RECUBRIMIENTO_C773: readonly FilaRecubrimiento[] = [
  { id: 'a1', norma: 'C.7.7.3', ambiente: 'intemperie', elemento: 'Paneles de muros', detalle: 'Barras No. 14 (45M) y No. 18 (55M), tendones de preesforzado mayores de 40 mm de diámetro', mm: 40 },
  { id: 'a2', norma: 'C.7.7.3', ambiente: 'intemperie', elemento: 'Paneles de muros', detalle: 'Barras No. 11 (36M) y menores, tendones de 40 mm de diámetro y menores, alambres MW200 o MD200 (16 mm) y menores', mm: 20 },
  { id: 'a3', norma: 'C.7.7.3', ambiente: 'intemperie', elemento: 'Otros elementos', detalle: 'Barras No. 14 (45M) y No. 18 (55M), tendones de preesforzado mayores de 40 mm de diámetro', mm: 50 },
  { id: 'a4', norma: 'C.7.7.3', ambiente: 'intemperie', elemento: 'Otros elementos', detalle: 'Barras No. 6 (20M) a No. 11 (36M), tendones mayores de 16 mm hasta 40 mm de diámetro', mm: 40 },
  { id: 'a5', norma: 'C.7.7.3', ambiente: 'intemperie', elemento: 'Otros elementos', detalle: 'Barras No. 5 (16M) y menores, tendones de 16 mm de diámetro y menores, alambre MW200 o MD200 (16 mm) y menores', mm: 30 },
  { id: 'b1', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Barras No. 14 (45M) y No. 18 (55M), tendones de preesforzado mayores a 40 mm de diámetro', mm: 30 },
  { id: 'b2', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Tendones de preesforzado de 40 mm de diámetro y menores', mm: 20 },
  { id: 'b3', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Losas, muros, viguetas', detalle: 'Barras No. 11 (36M) y menores, alambre MW200 o MD200 (16 mm) y menores', mm: 16 },
  { id: 'b4', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Vigas, columnas', detalle: 'Refuerzo principal: db, pero no menor de 16 mm y no mayor de 40 mm', mm: null, formula: { tipo: 'db', min: 16, max: 40 } },
  { id: 'b5', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Vigas, columnas', detalle: 'Estribos, espirales', mm: 10 },
  { id: 'b6', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Cáscaras y losas plegadas', detalle: 'Tendones de preesforzado', mm: 20 },
  { id: 'b7', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Cáscaras y losas plegadas', detalle: 'Barras No. 6 (20M) y mayores', mm: 16 },
  { id: 'b8', norma: 'C.7.7.3', ambiente: 'interior', elemento: 'Cáscaras y losas plegadas', detalle: 'Barras No. 5 (16M) y menores, alambre MW200 o MD200 (16 mm) y menores', mm: 10 },
];

/** C.7.7.4: paquetes de barras: recubrimiento ≥ diámetro equivalente, sin necesidad de exceder 50 mm; 75 mm contra el suelo. */
export const RECUBRIMIENTO_PAQUETE = { maximoExigidoMm: 50, contraSueloMm: 75 } as const;
/** C.7.7.6.1: elementos preesforzados Clase T o C en ambiente corrosivo: 1.5 veces el recubrimiento de C.7.7.2 ó C.7.7.3. */
export const FACTOR_RECUBRIMIENTO_PREESFORZADO_CORROSIVO = 1.5;

// ---------------------------------------------------------------------------------------------
// C.7.8 — Barras dobladas por cambio de sección en columnas (PDF p.358, C-56)
// ---------------------------------------------------------------------------------------------

export const COLUMNA_CAMBIO_SECCION = {
  /** Pendiente máxima de la parte inclinada: 1 en 6 respecto al eje. */
  pendienteMaxima: 1 / 6,
  /** El soporte horizontal resiste 1.5 veces la componente horizontal de la fuerza en la parte inclinada. */
  factorSoporteHorizontal: 1.5,
  /** Estribos o espirales a no más de 150 mm de los puntos de doblado. */
  estribosAMenosDeMm: 150,
  /** Si la cara se desalinea 75 mm o más, no se doblan las barras: se usan espigos (dowels). */
  desalineamientoSinDoblarMm: 75,
} as const;

// ---------------------------------------------------------------------------------------------
// C.7.10 — Refuerzo transversal de elementos a compresión (PDF p.359–360, C-57 a C-58)
// ---------------------------------------------------------------------------------------------

export const ESPIRAL = {
  /** C.7.10.4.2: diámetro mínimo de la barra de la espiral en elementos construidos en obra (mm). */
  diametroMinimoMm: 10,
  /** C.7.10.4.3: espaciamiento libre entre hélices. */
  libreMinimoMm: 25,
  libreMaximoMm: 75,
  /** C.7.10.4.4: vueltas adicionales de anclaje en cada extremo. */
  vueltasAnclaje: 1.5,
  /** C.7.10.4.5(a): traslapo mínimo absoluto (mm). */
  traslapoMinimoMm: 300,
} as const;

export interface FilaTraslapoEspiral {
  id: string;
  caso: string;
  /** Longitud mínima de traslapo = factor · db (y no menos de 300 mm). */
  factorDb: number;
}

/** C.7.10.4.5(a), numerales (1) a (5). */
export const TRASLAPO_ESPIRAL: readonly FilaTraslapoEspiral[] = [
  { id: '1', caso: 'Barra o alambre corrugado sin recubrimiento', factorDb: 48 },
  { id: '2', caso: 'Barra o alambre liso sin recubrimiento', factorDb: 72 },
  { id: '3', caso: 'Barras o alambres corrugados recubiertos con epóxico', factorDb: 72 },
  { id: '4', caso: 'Barras o alambres lisos sin recubrimiento con gancho estándar de estribo (C.7.1.3) en los extremos traslapados, embebidos en el núcleo confinado', factorDb: 48 },
  { id: '5', caso: 'Barras o alambres corrugados recubiertos con epóxico con gancho estándar de estribo (C.7.1.3) en los extremos traslapados, embebidos en el núcleo confinado', factorDb: 48 },
];

export const ESTRIBOS_COLUMNA = {
  /** C.7.10.5.1: diámetro mínimo del estribo según la barra longitudinal (número de barra equivalente). */
  diametroMinimoEq: { longitudinalHastaNo10: 3, longitudinalNo11OMayoresOPaquetes: 4 },
  /** Estribo mínimo permitido en DMI con columnas de uno o dos pisos: No. 2 (6M). */
  estriboMinimoDMIEq: 2,
  /** C.7.10.5.2: separación vertical máxima. */
  separacionMax: { factorDbLongitudinal: 16, factorDbEstribo: 48 },
  /** C.7.10.5.3: ángulo interior máximo del estribo que apoya la barra (grados) y separación libre máxima a una barra apoyada. */
  anguloInteriorMaxGrados: 135,
  libreMaxABarraApoyadaMm: 150,
  /** C.7.10.5.5: último estribo a no más de 75 mm bajo el refuerzo de la viga de menor altura (llegan vigas por 4 lados). */
  ultimoEstriboBajoVigaMm: 75,
  /** C.7.10.5.6: pernos de anclaje: refuerzo lateral dentro de 125 mm del extremo, alrededor de ≥ 4 barras. */
  pernosDistanciaMm: 125,
} as const;

// ---------------------------------------------------------------------------------------------
// C.7.12 — Refuerzo de retracción y temperatura (PDF p.360–361, C-58 a C-59)
// ---------------------------------------------------------------------------------------------

export const RETRACCION_TEMPERATURA = {
  /** C.7.12.2.1: cuantía mínima absoluta. */
  cuantiaMinimaAbsoluta: 0.0014,
  /** (a) barras corrugadas Grado 280 o 350. */
  cuantiaGrado280o350: 0.002,
  /** (b) barras corrugadas Grado 420 o refuerzo electrosoldado de alambre. */
  cuantiaGrado420OMalla: 0.0018,
  /** (c) fy > 420 MPa (a 0.35 % de deformación): 0.0018 × 420 / fy. */
  cuantiaBaseFyMayor: 0.0018,
  fyReferenciaMPa: 420,
  /** C.7.12.3: tendones como refuerzo de retracción y temperatura. */
  tendones: { compresionPromedioMinMPa: 0.7, separacionMaxM: 1.8, separacionAdicionalSiExcedeM: 1.4 },
} as const;

export interface FilaCuantiaRetraccion {
  id: 'a' | 'b' | 'c';
  caso: string;
  cuantia: string;
}

export const TABLA_RETRACCION: readonly FilaCuantiaRetraccion[] = [
  { id: 'a', caso: 'Losas con barras corrugadas Grado 280 o 350', cuantia: '0.0020' },
  { id: 'b', caso: 'Losas con barras corrugadas Grado 420 o refuerzo electrosoldado de alambre', cuantia: '0.0018' },
  { id: 'c', caso: 'Losas con refuerzo de fy mayor que 420 MPa, medida a una deformación unitaria de 0.35 %', cuantia: '0.0018 × 420 / fy (no menos de 0.0014)' },
];

// ---------------------------------------------------------------------------------------------
// C.7.13 — Integridad estructural (PDF p.361–362, C-59 a C-60)
// ---------------------------------------------------------------------------------------------

export const INTEGRIDAD = {
  /** C.7.13.2.2(a): fracción del refuerzo de momento negativo en el apoyo que debe ser continuo (vigas del perímetro). */
  perimetroNegativoFraccion: 1 / 6,
  /** C.7.13.2.2(b): fracción del refuerzo de momento positivo a mitad de vano. */
  perimetroPositivoFraccion: 1 / 4,
  /** Mínimo de barras continuas. */
  minimoBarras: 2,
  /** C.7.13.2.5: vigas distintas a las del perímetro sin estribos cerrados: 1/4 del positivo, mínimo 2 barras. */
  otrasVigasPositivoFraccion: 1 / 4,
} as const;
