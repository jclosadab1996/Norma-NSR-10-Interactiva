/**
 * Título D de la NSR-10 — Capítulo D.12 (Mampostería reforzada externamente): lógica pura. PDF = página impresa "D-n" + 565
 * (D-65 a D-68 = PDF 630 a 633).
 *
 * UNIDADES: longitudes en mm · áreas en mm² (o mm²/m en mallas) · esfuerzos y módulos en MPa · FUERZAS en kN · MOMENTOS en kN·m.
 *
 * Texto de la norma: Ecre = 2000 √f′cre (D.12.4.3), umbrales de módulos 2 y 0.5, espesores (130 / 90 / 20 mm, capas 15–45 mm,
 * sub-capas 10–15 mm), f′m ≥ 8 MPa y f′cre ≥ 12.5 MPa, cuantías mínimas 0.00035 con separación ≤ 300 mm, conectores (9 por m² de
 * clavos o tiros, 4 por m² de barras), recubrimientos 5 y 10 mm, sección transformada (D.12.4.4) y diseño simplificado (D.12.4.6).
 *
 * Autoría del proyecto (no es texto de la norma): el cálculo numérico de la sección transformada por franjas, los esfuerzos en cada capa,
 * el espesor mínimo de revoque que alberga la malla (suma de los recubrimientos y de dos diámetros de alambre), la lectura de las cuantías
 * «en cada lado» como exigencia por malla, y la aplicación del diseño simplificado al cortante en el plano (C.11.9.5).
 */
import { PHI_CORTANTE_TORSION } from '../../data/cortanteTorsion';
import { vcMuroSimple } from './cortante';

/** Constantes de D.12 (D-65 a D-67). */
export const EXTERNA = {
  /** D.12.1.3: espesor real total mínimo, mm. */
  espesorTotalMin: 130,
  /** D.12.1.3: espesor real mínimo de la mampostería, mm. */
  espesorMamposteriaMin: 90,
  /** D.12.1.3: espesor mínimo de revoque en cada cara, mm. */
  espesorRevoqueMinCara: 20,
  /** D.12.1.4: f′m mínima, MPa. */
  fmMin: 8,
  /** D.12.1.4: f′cre mínima, MPa. */
  fcreMin: 12.5,
  /** D.12.5.1: espesor de cada capa de revoque, mm. */
  capaRevoque: { min: 15, max: 45 },
  /** D.12.5.1: espesor de las sub-capas sucesivas cuando el total supera 15 mm, mm. */
  subcapa: { min: 10, max: 15 },
  /** D.12.3.2: cuantías mínimas sobre el área bruta total (incluye el revoque). */
  cuantiaMin: { vertical: 0.00035, horizontal: 0.00035 },
  /** D.12.3.2.1: separación máxima de los alambres de la malla, mm. */
  separacionMaxMalla: 300,
  /** D.12.3.3: clavos o tiros: 9 por m², diámetro ≥ 3 mm, cabeza saliente ≥ 10 mm. */
  clavos: { porM2: 9, diametroMin: 3, sobresaleMin: 10 },
  /** D.12.3.3: conectores de barra o alambre que atraviesan el muro con gancho de 90°: 4 por m², diámetro ≥ 4.5 mm. */
  barras: { porM2: 4, diametroMin: 4.5, ganchoGrados: 90 },
  /** D.12.3.3: alambre galvanizado No. 16 (1.3 mm) para amarrar; prolongación de la malla en los bordes ≥ 200 mm. */
  alambreAmarreMm: 1.3,
  prolongacionBordeMin: 200,
  /** D.12.5.2: recubrimientos mínimos a la malla, mm. */
  recubrimiento: { aMamposteria: 5, externo: 10 },
  /** D.12.5.3: curado húmedo continuo, días. */
  curadoDias: 7,
  /** D.12.4.3: Ecre = 2000 √f′cre. */
  coefEcre: 2000,
  /** D.12.4.3: si la relación entre módulos supera 2 o es menor que 0.5 los módulos se determinan por ensayos. */
  relacionModulosEnsayo: { sup: 2, inf: 0.5 },
  /** D.12.4.3: secante de ensayo entre 0.05 y 0.33 de la resistencia. */
  secante: { inf: 0.05, sup: 0.33 },
} as const;

const N_A_KN = 1 / 1000;

/* ------------------------------------------------------------------ */
/* Materiales y espesores                                              */
/* ------------------------------------------------------------------ */

/** Ecre = 2000 √f′cre, MPa (D.12.4.3, D-67). */
export function moduloElasticidadRevoque(fcre: number): number {
  return EXTERNA.coefEcre * Math.sqrt(fcre);
}

export interface ResultadoMateriales {
  fmCumple: boolean;
  fcreCumple: boolean;
  cumple: boolean;
}

/** D.12.1.4: f′m ≥ 8 MPa y f′cre ≥ 12.5 MPa. */
export function verificarMaterialesExterna(fm: number, fcre: number): ResultadoMateriales {
  const fmCumple = fm >= EXTERNA.fmMin;
  const fcreCumple = fcre >= EXTERNA.fcreMin;
  return { fmCumple, fcreCumple, cumple: fmCumple && fcreCumple };
}

export interface ResultadoRelacionModulos {
  /** Ere/Em. */
  relacion: number;
  /** true si Ere/Em > 2 o < 0.5: los módulos deben determinarse por ensayos (secante 0.05–0.33 de la resistencia). */
  requiereEnsayos: boolean;
}

/** D.12.4.3: relación entre los módulos del revoque y de la mampostería y si obliga a ensayos. */
export function relacionModulosExterna(Em: number, Ere: number): ResultadoRelacionModulos {
  const relacion = Ere / Em;
  return { relacion, requiereEnsayos: relacion > EXTERNA.relacionModulosEnsayo.sup || relacion < EXTERNA.relacionModulosEnsayo.inf };
}

export interface ResultadoEspesores {
  total: number;
  totalCumple: boolean;
  mamposteriaCumple: boolean;
  /** Cada cara ≥ 20 mm (D.12.1.3). */
  revoque1Cumple: boolean;
  revoque2Cumple: boolean;
  /** Cada cara entre 15 y 45 mm (D.12.5.1). */
  capasEnRango: boolean;
  cumple: boolean;
}

/** D.12.1.3 y D.12.5.1: espesor total ≥ 130 mm, mampostería ≥ 90 mm, revoque ≥ 20 mm por cara y entre 15 y 45 mm. */
export function verificarEspesoresExterna(tMamposteria: number, e1: number, e2: number): ResultadoEspesores {
  const total = tMamposteria + e1 + e2;
  const totalCumple = total >= EXTERNA.espesorTotalMin;
  const mamposteriaCumple = tMamposteria >= EXTERNA.espesorMamposteriaMin;
  const revoque1Cumple = e1 >= EXTERNA.espesorRevoqueMinCara;
  const revoque2Cumple = e2 >= EXTERNA.espesorRevoqueMinCara;
  const capasEnRango = [e1, e2].every((e) => e >= EXTERNA.capaRevoque.min && e <= EXTERNA.capaRevoque.max);
  return {
    total,
    totalCumple,
    mamposteriaCumple,
    revoque1Cumple,
    revoque2Cumple,
    capasEnRango,
    cumple: totalCumple && mamposteriaCumple && revoque1Cumple && revoque2Cumple && capasEnRango,
  };
}

export interface ResultadoSubcapas {
  /** Número mínimo de sub-capas (cada una ≤ 15 mm). */
  nMin: number;
  /** Número máximo de sub-capas (cada una ≥ 10 mm). */
  nMax: number;
  /** true si existe un número de sub-capas con todas entre 10 y 15 mm. */
  factible: boolean;
  /** true si el revoque cabe en una sola capa (≤ 15 mm). */
  unaSolaCapa: boolean;
}

/**
 * D.12.5.1: si el revoque supera 15 mm se coloca en sub-capas de 10 a 15 mm. Con un total entre 15 y 20 mm ninguna combinación
 * cumple a la vez (observación del proyecto).
 */
export function subcapasRevoque(espesor: number): ResultadoSubcapas {
  if (espesor <= EXTERNA.subcapa.max) return { nMin: 1, nMax: 1, factible: true, unaSolaCapa: true };
  const nMin = Math.ceil(espesor / EXTERNA.subcapa.max);
  const nMax = Math.floor(espesor / EXTERNA.subcapa.min);
  return { nMin, nMax, factible: nMin <= nMax, unaSolaCapa: false };
}

/* ------------------------------------------------------------------ */
/* Malla electrosoldada                                                */
/* ------------------------------------------------------------------ */

/** Área mínima de la malla por franja (mm²/m si ancho = 1000): cuantía 0.00035 × espesor bruto total × ancho (D.12.3.2). */
export function areaMinimaMalla(espesorTotal: number, ancho = 1000, cuantia: number = EXTERNA.cuantiaMin.vertical): number {
  return cuantia * espesorTotal * ancho;
}

/** Área de alambres de diámetro d (mm) con separación s (mm), por metro de franja (mm²/m). */
export function areaAlambresPorMetro(d: number, s: number): number {
  return ((Math.PI * d * d) / 4) * (1000 / s);
}

export interface ResultadoMalla {
  /** Área aportada, mm²/m. */
  area: number;
  /** Área mínima, mm²/m. */
  areaMin: number;
  areaCumple: boolean;
  separacionCumple: boolean;
  cumple: boolean;
  /** Separación máxima que cumple el área mínima con ese diámetro, mm. */
  separacionPorArea: number;
}

/**
 * Verifica una dirección de la malla (vertical u horizontal) en una cara: As/m ≥ 0.00035 × t_total × 1000 y separación ≤ 300 mm
 * (D.12.3.2 y D.12.3.2.1). Se lee la cuantía como exigencia para la malla de cada cara (autoría del proyecto).
 */
export function verificarMalla(d: number, s: number, espesorTotal: number): ResultadoMalla {
  const area = areaAlambresPorMetro(d, s);
  const areaMin = areaMinimaMalla(espesorTotal);
  const areaCumple = area >= areaMin;
  const separacionCumple = s <= EXTERNA.separacionMaxMalla;
  return {
    area,
    areaMin,
    areaCumple,
    separacionCumple,
    cumple: areaCumple && separacionCumple,
    separacionPorArea: ((Math.PI * d * d) / 4) * (1000 / areaMin),
  };
}

export type TipoConector = 'clavos' | 'barras';

/** D.12.3.3: número mínimo de conectores para un área de muro en m² (9 por m² con clavos o tiros; 4 por m² con barras). */
export function conectoresMinimos(areaM2: number, tipo: TipoConector): number {
  const porM2 = tipo === 'clavos' ? EXTERNA.clavos.porM2 : EXTERNA.barras.porM2;
  return Math.ceil(areaM2 * porM2);
}

/**
 * Espesor mínimo de revoque que alberga la malla: 5 mm a la mampostería + 10 mm externos + el espesor de la malla (dos alambres
 * que se cruzan, dH + dV) (D.12.5.2; la suma es autoría del proyecto).
 */
export function espesorMinimoRevoqueParaMalla(dH: number, dV: number): number {
  return EXTERNA.recubrimiento.aMamposteria + EXTERNA.recubrimiento.externo + dH + dV;
}

/* ------------------------------------------------------------------ */
/* Sección transformada elástica (D.12.4.2 y D.12.4.4)                 */
/* ------------------------------------------------------------------ */

export interface CapaExterna {
  nombre: string;
  /** Espesor de la capa (dimensión en la dirección ortogonal al eje neutro), mm. */
  espesor: number;
  /** Módulo de elasticidad, MPa. */
  E: number;
}

export interface CapaTransformada extends CapaExterna {
  /** Relación modular respecto al material base, n = E/Ebase. */
  n: number;
  /** Ancho transformado (b × n), mm. */
  anchoTransformado: number;
  /** Área transformada, mm². */
  area: number;
  /** Profundidad del centro de la capa desde la cara superior, mm. */
  yCentro: number;
}

export interface SeccionTransformada {
  b: number;
  base: number;
  capas: CapaTransformada[];
  /** Área transformada total, mm². */
  At: number;
  /** Profundidad del centroide desde la cara superior, mm. */
  yBarra: number;
  /** Inercia transformada respecto al eje neutro (centroidal), mm⁴. */
  It: number;
  /** Espesor total (no se altera por la transformación, D.12.4.4), mm. */
  espesorTotal: number;
}

/**
 * Sección transformada para flexión fuera del plano (eje neutro paralelo a la longitud del muro) de una franja de ancho b.
 * D.12.4.4: se toma un material como base (índice `base`); la dimensión paralela al eje neutro (b) se multiplica por la relación modular
 * y no cambian las dimensiones ortogonales (los espesores). Las capas se dan desde la cara superior.
 */
export function seccionTransformada(capas: CapaExterna[], b: number, base: number): SeccionTransformada {
  const Eb = capas[base].E;
  let y = 0;
  const trans: CapaTransformada[] = capas.map((c) => {
    const n = c.E / Eb;
    const anchoTransformado = b * n;
    const area = anchoTransformado * c.espesor;
    const yCentro = y + c.espesor / 2;
    y += c.espesor;
    return { ...c, n, anchoTransformado, area, yCentro };
  });
  const At = trans.reduce((s, c) => s + c.area, 0);
  const yBarra = trans.reduce((s, c) => s + c.area * c.yCentro, 0) / At;
  const It = trans.reduce((s, c) => s + (c.anchoTransformado * c.espesor ** 3) / 12 + c.area * (c.yCentro - yBarra) ** 2, 0);
  return { b, base, capas: trans, At, yBarra, It, espesorTotal: y };
}

export interface EsfuerzosCapa {
  nombre: string;
  /** Esfuerzo en la fibra superior de la capa, MPa (compresión positiva). */
  sigmaSup: number;
  /** Esfuerzo en la fibra inferior de la capa, MPa (compresión positiva). */
  sigmaInf: number;
}

/**
 * Esfuerzos elásticos en cada capa de la sección transformada bajo carga axial P (kN, compresión positiva) y momento M (kN·m, positivo
 * si comprime la cara superior), por franja de ancho b. σ_i(y) = n_i [ P/At + M (ȳ − y)/It ] (autoría del proyecto: aplicación elástica
 * directa de D.12.4.2). Hay un salto de esfuerzo en las interfaces porque cambia el módulo.
 */
export function esfuerzosSeccionTransformada(sec: SeccionTransformada, P: number, M: number): EsfuerzosCapa[] {
  const Pn = P / N_A_KN;
  const Mnmm = M * 1e6;
  const sigmaBase = (y: number) => Pn / sec.At + (Mnmm * (sec.yBarra - y)) / sec.It;
  let y = 0;
  return sec.capas.map((c) => {
    const ySup = y;
    const yInf = y + c.espesor;
    y = yInf;
    return { nombre: c.nombre, sigmaSup: c.n * sigmaBase(ySup), sigmaInf: c.n * sigmaBase(yInf) };
  });
}

/**
 * Espesor transformado a material base para el análisis en el plano (eje neutro perpendicular a la longitud): las capas quedan
 * una junto a la otra y cada espesor se multiplica por su relación modular (D.12.4.4); la longitud del muro no se altera.
 * Equivale a t_eq = Σ nᵢ eᵢ (autoría del proyecto).
 */
export function espesorTransformadoEnPlano(capas: CapaExterna[], base: number): number {
  const Eb = capas[base].E;
  return capas.reduce((s, c) => s + (c.E / Eb) * c.espesor, 0);
}

/* ------------------------------------------------------------------ */
/* Diseño simplificado (D.12.4.6)                                      */
/* ------------------------------------------------------------------ */

export interface ResultadoSimplificado {
  /** Espesor del «muro de concreto» equivalente = e1 + e2, mm. */
  h: number;
  /** f′c = f′cre, MPa. */
  fc: number;
  /** d = 0.8 ℓw (C.11.9.4), mm. */
  d: number;
  /** Vc = 0.17 λ √f′c h d (C.11.9.5), kN. */
  Vc: number;
  phi: number;
  /** φVc, kN. */
  phiVc: number;
}

/**
 * D.12.4.6: se desprecia la mampostería y el muro se trata como un muro de concreto de espesor e1 + e2 con f′c = f′cre. Aplicación del
 * proyecto al cortante en el plano: Vc = 0.17 λ √f′c h d con d = 0.8 ℓw (C.11.9.4 y C.11.9.5) y φ = 0.75 (concreto normal, λ = 1).
 */
export function disenoSimplificadoCortante(e1: number, e2: number, fcre: number, lw: number): ResultadoSimplificado {
  const h = e1 + e2;
  const Vc = vcMuroSimple({ fc: fcre, h, lw });
  return { h, fc: fcre, d: 0.8 * lw, Vc, phi: PHI_CORTANTE_TORSION, phiVc: PHI_CORTANTE_TORSION * Vc };
}
