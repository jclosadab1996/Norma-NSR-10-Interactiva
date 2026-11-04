/**
 * Requisitos de durabilidad del concreto — Capítulo C.4 de la NSR-10, transcrito del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302.
 * Las tablas se transcribieron contra la imagen de la página.
 *
 *   Tabla C.4.2.1   categorías y clases de exposición ........ PDF p.337 (C-35)
 *   Tabla C.4.3.1   requisitos según la clase de exposición .. PDF p.338 (C-36)
 *   Tabla C.4.4.1   contenido total de aire (F1, F2, F3) ...... PDF p.339 (C-37)
 *   Tabla C.4.4.2   límites de puzolanas y escoria (F3) ........ PDF p.339 (C-37)
 *   Tabla C.4.5.1   expansión máxima por sulfatos ............. PDF p.340 (C-38)
 */

export type ClaseExposicion = 'F0' | 'F1' | 'F2' | 'F3' | 'S0' | 'S1' | 'S2' | 'S3' | 'P0' | 'P1' | 'C0' | 'C1' | 'C2';
export type CategoriaExposicion = 'F' | 'S' | 'P' | 'C';

// ---------------------------------------------------------------------------------------------
// Tabla C.4.2.1 — Categorías y clases de exposición. PDF p.337 (C-35)
// ---------------------------------------------------------------------------------------------

export interface DefinicionClase {
  clase: ClaseExposicion;
  categoria: CategoriaExposicion;
  /** Severidad tal como aparece en la tabla. */
  severidad: 'No es aplicable' | 'Moderada' | 'Severa' | 'Muy severa' | 'Requerida';
  /** Condición (texto de la norma). */
  condicion: string;
  /** Solo categoría S: SO4 soluble en agua en el suelo, % en peso (cota inferior, cota superior y si la superior es estricta). */
  sulfatoSuelo?: { min?: number; max?: number; maxIncluido?: boolean; minIncluido?: boolean };
  /** Solo categoría S: SO4 disuelto en agua, ppm. */
  sulfatoAgua?: { min?: number; max?: number; maxIncluido?: boolean; minIncluido?: boolean };
}

export const NOMBRE_CATEGORIA: Record<CategoriaExposicion, string> = {
  F: 'Congelamiento y deshielo',
  S: 'Sulfato',
  P: 'Requiere baja permeabilidad',
  C: 'Protección del refuerzo para la corrosión',
};

export const CLASES_EXPOSICION: readonly DefinicionClase[] = [
  { clase: 'F0', categoria: 'F', severidad: 'No es aplicable', condicion: 'Concreto no expuesto a ciclos de congelamiento y deshielo' },
  { clase: 'F1', categoria: 'F', severidad: 'Moderada', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo y exposición ocasional a la humedad' },
  { clase: 'F2', categoria: 'F', severidad: 'Severa', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo y en contacto continuo con la humedad' },
  { clase: 'F3', categoria: 'F', severidad: 'Muy severa', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo que estará en contacto continuo con la humedad y expuesto a productos químicos descongelantes' },
  // Sulfatos. Las cotas S1 (< 0.20 % / 1500 ppm) y S2 (≤ 2.00 %) están cortadas en el PDF (ver CONTENIDO c4, erratas);
  // se completan con la secuencia de la tabla (S2 empieza en 0.20 %, S3 es > 2.00 %).
  { clase: 'S0', categoria: 'S', severidad: 'No es aplicable', condicion: 'Sulfato soluble en agua en el suelo < 0.10 % en peso; sulfato disuelto en agua < 150 ppm', sulfatoSuelo: { max: 0.1 }, sulfatoAgua: { max: 150 } },
  { clase: 'S1', categoria: 'S', severidad: 'Moderada', condicion: 'Sulfato en el suelo 0.10 % ≤ SO4 < 0.20 %; en agua 150 ≤ SO4 < 1500 ppm (agua marina)', sulfatoSuelo: { min: 0.1, max: 0.2, minIncluido: true }, sulfatoAgua: { min: 150, max: 1500, minIncluido: true } },
  { clase: 'S2', categoria: 'S', severidad: 'Severa', condicion: 'Sulfato en el suelo 0.20 % ≤ SO4 ≤ 2.00 %; en agua 1500 ≤ SO4 ≤ 10 000 ppm', sulfatoSuelo: { min: 0.2, max: 2, minIncluido: true, maxIncluido: true }, sulfatoAgua: { min: 1500, max: 10000, minIncluido: true, maxIncluido: true } },
  { clase: 'S3', categoria: 'S', severidad: 'Muy severa', condicion: 'Sulfato en el suelo SO4 > 2.00 %; en agua SO4 > 10 000 ppm', sulfatoSuelo: { min: 2 }, sulfatoAgua: { min: 10000 } },
  { clase: 'P0', categoria: 'P', severidad: 'No es aplicable', condicion: 'En contacto con el agua donde no se requiere baja permeabilidad' },
  { clase: 'P1', categoria: 'P', severidad: 'Requerida', condicion: 'En contacto con el agua donde se requiera baja permeabilidad' },
  { clase: 'C0', categoria: 'C', severidad: 'No es aplicable', condicion: 'Concreto seco o protegido contra la humedad' },
  { clase: 'C1', categoria: 'C', severidad: 'Moderada', condicion: 'Concreto expuesto a la humedad, pero no a una fuente externa de cloruros' },
  { clase: 'C2', categoria: 'C', severidad: 'Severa', condicion: 'Concreto expuesto a la humedad y a una fuente externa de cloruros provenientes de productos químicos descongelantes, sal, agua salobre, agua de mar o salpicaduras del mismo origen' },
];

export function buscarClase(clase: ClaseExposicion): DefinicionClase {
  const c = CLASES_EXPOSICION.find((x) => x.clase === clase);
  if (!c) throw new RangeError(`Clase de exposición desconocida: ${clase}`);
  return c;
}

// ---------------------------------------------------------------------------------------------
// Tabla C.4.3.1 — Requisitos para el concreto según la clase de exposición. PDF p.338 (C-36)
// ---------------------------------------------------------------------------------------------

/** Tipos de cemento admitidos para sulfatos (texto de la tabla; los marcadores †, ‡ y § remiten a las notas al pie). */
export interface CementosSulfatos {
  /** ASTM C150. */
  c150: string;
  /** ASTM C595. */
  c595: string;
  /** ASTM C1157. */
  c1157: string;
  /** Aditivo cloruro de calcio. */
  cloruroCalcio: 'Sin restricción' | 'No se permite';
}

export interface RequisitoExposicion {
  clase: ClaseExposicion;
  /** Relación a/mc máxima (null = N/A). */
  aMcMax: number | null;
  /** f′c mínimo (MPa). */
  fcMin: number;
  /** Contenido de aire requerido (tabla C.4.4.1): solo F1, F2, F3. */
  aire?: 'C.4.4.1';
  /** Límites en los cementantes (tabla C.4.4.2): solo F3. */
  limitesCementantes?: 'C.4.4.2';
  /** Tipos de material cementante: solo S0 a S3. */
  cementos?: CementosSulfatos;
  /** Contenido máximo de ion cloruro soluble en agua, % por peso de cemento: solo C0 a C2. */
  cloruro?: { reforzado: number; preesforzado: number };
  /** Requisitos relacionados (solo C2). */
  relacionados?: string;
}

export const REQUISITOS_EXPOSICION: readonly RequisitoExposicion[] = [
  { clase: 'F0', aMcMax: null, fcMin: 17 },
  { clase: 'F1', aMcMax: 0.45, fcMin: 31, aire: 'C.4.4.1' },
  { clase: 'F2', aMcMax: 0.45, fcMin: 31, aire: 'C.4.4.1' },
  { clase: 'F3', aMcMax: 0.45, fcMin: 31, aire: 'C.4.4.1', limitesCementantes: 'C.4.4.2' },
  {
    clase: 'S0',
    aMcMax: null,
    fcMin: 17,
    cementos: { c150: 'Sin restricción en el tipo', c595: 'Sin restricción en el tipo', c1157: 'Sin restricción en el tipo', cloruroCalcio: 'Sin restricción' },
  },
  {
    clase: 'S1',
    aMcMax: 0.5,
    fcMin: 28,
    cementos: { c150: 'II †‡', c595: 'IP(MS), IS(<70)(MS)', c1157: 'MS', cloruroCalcio: 'Sin restricción' },
  },
  {
    clase: 'S2',
    aMcMax: 0.45,
    fcMin: 31,
    cementos: { c150: 'V ‡', c595: 'IP(HS), IS(<70)(HS)', c1157: 'HS', cloruroCalcio: 'No se permite' },
  },
  {
    clase: 'S3',
    aMcMax: 0.45,
    fcMin: 31,
    cementos: {
      c150: 'V + puzolanas o escoria §',
      c595: 'IP(HS) + puzolanas o escoria §, o IS(<70)(HS) + puzolanas o escoria §',
      c1157: 'HS + puzolanas o escoria §',
      cloruroCalcio: 'No se permite',
    },
  },
  { clase: 'P0', aMcMax: null, fcMin: 17 },
  { clase: 'P1', aMcMax: 0.5, fcMin: 28 },
  { clase: 'C0', aMcMax: null, fcMin: 17, cloruro: { reforzado: 1.0, preesforzado: 0.06 } },
  { clase: 'C1', aMcMax: 0.5, fcMin: 17, cloruro: { reforzado: 0.3, preesforzado: 0.06 } },
  { clase: 'C2', aMcMax: 0.4, fcMin: 35, cloruro: { reforzado: 0.15, preesforzado: 0.06 }, relacionados: '7.7.6, 18.16 #' },
];

export function requisitoDeClase(clase: ClaseExposicion): RequisitoExposicion {
  const r = REQUISITOS_EXPOSICION.find((x) => x.clase === clase);
  if (!r) throw new RangeError(`Clase de exposición desconocida: ${clase}`);
  return r;
}

/** Notas al pie de la Tabla C.4.3.1 (texto resumido fielmente; PDF p.338, C-36). */
export const NOTAS_TABLA_C431: readonly { marca: string; texto: string }[] = [
  { marca: '*', texto: 'Se pueden permitir combinaciones alternativas de materiales cementantes distintas de las de la tabla siempre que se ensayen para comprobar la resistencia a los sulfatos y cumplan los criterios de C.4.5.1.' },
  { marca: '†', texto: 'Para exposición al agua marina se permiten otros tipos de cemento pórtland con contenidos de hasta 10 % de aluminato tricálcico (C3A) si la relación a/mc no excede 0.40.' },
  { marca: '‡', texto: 'Se permiten otros tipos de cemento, como el tipo III o el tipo I, en exposiciones clase S1 o S2 si el contenido de C3A es menor de 8 % o 5 %, respectivamente.' },
  { marca: '§', texto: 'La cantidad de la fuente específica de puzolana o escoria no debe ser inferior a la determinada por experiencia como mejora de la resistencia a sulfatos en concretos con cemento tipo V; alternativamente, no menor que la ensayada según NTC 3330 (ASTM C1012) cumpliendo C.4.5.1.' },
  { marca: '‼', texto: 'El contenido de iones cloruro solubles en agua proveniente de todos los ingredientes (agua, agregados, materiales cementantes y aditivos) se determina según NTC 4049 (ASTM C1218M), a edades de 28 a 42 días.' },
  { marca: '#', texto: 'Se deben cumplir los requisitos de C.7.7.5; véase C.18.16 para tendones de preesfuerzo no adheridos.' },
  { marca: '±', texto: 'Para concreto liviano véase C.4.1.2 (los límites de a/mc no se aplican).' },
];

// ---------------------------------------------------------------------------------------------
// Tabla C.4.4.1 — Contenido total de aire. PDF p.339 (C-37)
// ---------------------------------------------------------------------------------------------

export interface FilaAire {
  /** Tamaño máximo nominal del agregado (mm). */
  tamanoMm: number;
  /** Exposición clase F1 (% de aire). */
  f1: number;
  /** Exposición clases F2 y F3 (% de aire). */
  f2f3: number;
}

export const AIRE_INCORPORADO: readonly FilaAire[] = [
  { tamanoMm: 9.5, f1: 6, f2f3: 7.5 },
  { tamanoMm: 12.5, f1: 5.5, f2f3: 7 },
  { tamanoMm: 19.0, f1: 5, f2f3: 6 },
  { tamanoMm: 25.0, f1: 4.5, f2f3: 6 },
  { tamanoMm: 37.5, f1: 4.5, f2f3: 5.5 },
  { tamanoMm: 50, f1: 4, f2f3: 5 },
  { tamanoMm: 75, f1: 3.5, f2f3: 4.5 },
];

/** Tolerancia del aire incorporado, ±1.5 % (C.4.4.1). */
export const TOLERANCIA_AIRE = 1.5;
/** Reducción permitida del aire (puntos porcentuales) si f′c > 35 MPa (C.4.4.1). */
export const REDUCCION_AIRE_FC_ALTO = 1;
export const FC_UMBRAL_REDUCCION_AIRE_MPA = 35;

// ---------------------------------------------------------------------------------------------
// Tabla C.4.4.2 — Concreto clase F3: límites de puzolanas y escoria. PDF p.339 (C-37)
// ---------------------------------------------------------------------------------------------

export interface LimiteF3 {
  id: 'ceniza' | 'escoria' | 'humo-silice' | 'total-ceniza-escoria-humo' | 'total-ceniza-humo';
  material: string;
  /** Porcentaje máximo sobre el total de materiales cementantes en peso. */
  maxPct: number;
  /** Tiene la marca † (los totales siguen limitados a 25 % de ceniza y 10 % de humo de sílice). */
  conDagger: boolean;
}

export const LIMITES_F3: readonly LimiteF3[] = [
  { id: 'ceniza', material: 'Cenizas volantes u otras puzolanas que cumplen NTC 3493 (ASTM C618)', maxPct: 25, conDagger: false },
  { id: 'escoria', material: 'Escoria que cumple NTC 4018 (ASTM C989)', maxPct: 50, conDagger: false },
  { id: 'humo-silice', material: 'Humo de sílice que cumple NTC 4637 (ASTM C1240)', maxPct: 10, conDagger: false },
  { id: 'total-ceniza-escoria-humo', material: 'Total de cenizas volantes u otras puzolanas, escoria y humo de sílice', maxPct: 50, conDagger: true },
  { id: 'total-ceniza-humo', material: 'Total de cenizas volantes u otras puzolanas y humo de sílice', maxPct: 35, conDagger: true },
];

// ---------------------------------------------------------------------------------------------
// Tabla C.4.5.1 — Expansión máxima (NTC 3330 / ASTM C1012) de combinaciones alternativas. PDF p.340 (C-38)
// ---------------------------------------------------------------------------------------------

export interface FilaExpansion {
  clase: 'S1' | 'S2' | 'S3';
  /** Expansión máxima a 6 meses (%), si aplica. */
  seis?: number;
  /** Expansión máxima a 12 meses (%), si aplica. */
  doce?: number;
  /** Expansión máxima a 18 meses (%), si aplica. */
  dieciocho?: number;
}

export const EXPANSION_SULFATOS: readonly FilaExpansion[] = [
  { clase: 'S1', seis: 0.1 },
  { clase: 'S2', seis: 0.05, doce: 0.1 },
  { clase: 'S3', dieciocho: 0.1 },
];

// ---------------------------------------------------------------------------------------------
// Constantes de texto
// ---------------------------------------------------------------------------------------------

/** C.5.1.1: f′c no puede ser inferior a 17 MPa en concreto diseñado con la NSR-10 (se cita aquí porque C.4.1.1 la combina con la durabilidad). */
export const FC_MINIMO_NSR10_MPA = 17;
