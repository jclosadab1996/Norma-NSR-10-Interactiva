import { sa as espectroSa, type ParametrosEspectro } from './espectro';
import { G } from './fuerzaHorizontal';
import {
  alturaEfectiva,
  amortiguamientoEfectivo,
  masaParticipante,
  periodoEfectivoISE,
  reduccionCortanteISE,
  rigidezEmpotrada,
} from './interaccionSueloEstructura';
import { coeficienteCu } from './periodo';

/**
 * Apéndice A-2 — Recomendaciones para el cálculo de los efectos de interacción dinámica
 * suelo-estructura (PDF 185–190, págs. A-141 a A-146). El apéndice NO es obligatorio: sus
 * recomendaciones se pueden usar con modelos de base empotrada (Capítulo A.7).
 *
 * Unidades del SI: masas en kg, alturas y longitudes en m, períodos en s, rigideces en N/m (Ky) y
 * N·m/rad (Kθ), velocidades en m/s, fuerzas en N. Las ecuaciones A-2-1 a A-2-4, A-2-9 y A-2-11 viven
 * en `interaccionSueloEstructura.ts` (Capítulo A.7); aquí se reutilizan y se completan las demás.
 */

/** Tabla A-2.1-1 — G/Go y vs/vso para deformaciones unitarias apreciables, según Aa. */
export const TABLA_A2_1_1 = [
  { columna: 'Aa ≤ 0.10', aaMax: 0.1, gGo: 0.81, vsVso: 0.9 },
  { columna: 'Aa ≤ 0.15', aaMax: 0.15, gGo: 0.64, vsVso: 0.8 },
  { columna: 'Aa ≤ 0.20', aaMax: 0.2, gGo: 0.49, vsVso: 0.7 },
  { columna: 'Aa ≥ 0.30', aaMax: Infinity, gGo: 0.42, vsVso: 0.65 },
] as const;

/**
 * Lee la Tabla A-2.1-1. Se toma la primera columna cuyo límite superior cubre a `aa`.
 * La tabla del PDF tiene columnas ≤ 0.10, ≤ 0.15, ≤ 0.20 y ≥ 0.30: **no cubre 0.20 < Aa < 0.30**
 * (p. ej. Aa = 0.25), caso en el que se devuelve `null` y debe definirlo el geotecnista.
 */
export function relacionesDeformacionApreciable(aa: number): { gGo: number; vsVso: number } | null {
  if (aa > 0.2 && aa < 0.3) return null;
  const fila = aa >= 0.3 ? TABLA_A2_1_1[3] : TABLA_A2_1_1.find((f) => aa <= f.aaMax)!;
  return { gGo: fila.gGo, vsVso: fila.vsVso };
}

/** A-2.0 — Go = γ·vso²: módulo de cortante para deformaciones pequeñas (γ en kg/m³, vso en m/s → Pa). */
export function moduloCortantePequenasDeformaciones(gamma: number, vso: number): number {
  return gamma * vso * vso;
}

/** A-2-7 — ra = √(Ao/π): radio del círculo de igual área que la cimentación. */
export function radioPorArea(ao: number): number {
  return Math.sqrt(ao / Math.PI);
}

/** A-2-8 — rm = (4·Io/π)^(1/4): radio del círculo de igual momento de inercia. */
export function radioPorInercia(io: number): number {
  return Math.pow((4 * io) / Math.PI, 0.25);
}

/**
 * Longitud característica r para entrar a la Figura A-2.2-1 (A-2.2.1.2):
 * h̄/Lo ≤ 0.5 → r = ra; h̄/Lo ≥ 1.0 → r = rm; valores intermedios, interpolación lineal.
 */
export function longitudCaracteristica(hBarra: number, lo: number, ra: number, rm: number): number {
  const x = hBarra / lo;
  if (x <= 0.5) return ra;
  if (x >= 1.0) return rm;
  return ra + ((x - 0.5) / 0.5) * (rm - ra);
}

/** A-2-6 — α = M̄/(γ·Ao·h̄): densidad relativa de la estructura y el suelo bajo ella. */
export function parametroAlfa(mBarra: number, gamma: number, ao: number, hBarra: number): number {
  return mBarra / (gamma * ao * hBarra);
}

export type EntradaPeriodoLosa = {
  /** T: período con base empotrada (s). */
  t: number;
  alpha: number;
  /** ra de A-2-7 (m). */
  ra: number;
  /** rm de A-2-8 (m). */
  rm: number;
  /** h̄: altura efectiva (m). */
  hBarra: number;
  /** vs: velocidad de onda de cortante en deformaciones apreciables (m/s). */
  vs: number;
  /** αθ: modificador de la rigidez dinámica por balanceo (la norma no lo tabula). */
  alphaTheta: number;
};

/**
 * A-2-5 — período efectivo para losas de fundación superficiales (alternativa a A-2-3):
 * T̄ = T·√[1 + (25·α·ra·h̄)/(vs²·T²)·(1 + 1.12·ra·h̄²/(αθ·rm³))].
 */
export function periodoEfectivoLosaSuperficial(e: EntradaPeriodoLosa): number {
  const { t, alpha, ra, rm, hBarra, vs, alphaTheta } = e;
  const termino = ((25 * alpha * ra * hBarra) / (vs * vs * t * t)) * (1 + (1.12 * ra * hBarra * hBarra) / (alphaTheta * rm ** 3));
  return t * Math.sqrt(1 + termino);
}

/**
 * Rigideces de una cimentación rígida circular sobre un semiespacio elástico (Gazetas), usadas
 * por práctica común para obtener Ky y Kθ con las longitudes ra y rm: Ky = 8·G·ra/(2−ν) y
 * Kθ = 8·G·rm³/(3·(1−ν)). NO son ecuaciones de la NSR-10 (A-2.2.1.1 pide «principios establecidos de
 * mecánica de suelos»); se incluyen para poder resolver ejemplos. G en Pa.
 */
export function rigidecesCimentacionCircular(g: number, nu: number, ra: number, rm: number): { ky: number; ktheta: number } {
  return { ky: (8 * g * ra) / (2 - nu), ktheta: (8 * g * rm ** 3) / (3 * (1 - nu)) };
}

/**
 * A-2-10 — amortiguamiento de la cimentación ajustado para un estrato blando sobre un depósito más
 * rígido: βo′ = βo·(4·Ds/(vs·T̄))². Solo aplica si la expresión entre paréntesis es menor que 1; si no,
 * se conserva βo.
 */
export function beta0EstratoBlando(beta0: number, ds: number, vs: number, tBarra: number): number {
  const razon = (4 * ds) / (vs * tBarra);
  return razon < 1 ? beta0 * razon * razon : beta0;
}

/** A-2-14 — altura efectiva del primer modo: h̄ = Σ(mi·φi1·hi)/Σ(mi·φi1). */
export function alturaEfectivaModo1(masas: readonly number[], formaModo1: readonly number[], alturas: readonly number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < masas.length; i++) {
    num += masas[i] * formaModo1[i] * alturas[i];
    den += masas[i] * formaModo1[i];
  }
  return num / den;
}

/**
 * A-2.2.1 — cortante basal con interacción: V̄s = Vs − ΔVs, pero no menor que 0.7·Vs′ (A-2-1).
 * Si `gobiernaPiso` es `true`, la reducción se limita al piso de 0.7·Vs′.
 */
export function cortanteBaseA2(vs: number, deltaVs: number, vsPrima: number): { vsBarra: number; piso: number; gobiernaPiso: boolean } {
  const piso = 0.7 * vsPrima;
  const directo = vs - deltaVs;
  return { vsBarra: Math.max(directo, piso), piso, gobiernaPiso: directo < piso };
}

/** A-2-11 — deflexión modificada en el nivel x: δ̄x = (V̄s/Vs)·(δx + Mo·hx/Kθ). */
export function deflexionModificada(vsBarra: number, vs: number, deltaX: number, mo: number, hx: number, ktheta: number): number {
  return (vsBarra / vs) * (deltaX + (mo * hx) / ktheta);
}

export type EntradaInteraccionFHE = {
  /** Parámetros del espectro de A.2.6 (Aa, Av, Fa, Fv, I). */
  espectro: ParametrosEspectro;
  /** T con base empotrada (s). */
  t: number;
  /** Ta aproximado de A.4.2.2 (s), para Vs′ con período Cu·Ta. */
  ta: number;
  /** Masa total M (kg). */
  masaTotal: number;
  /** Altura total hn (m). */
  hn: number;
  /** Rigidez lateral de la cimentación Ky (N/m). */
  ky: number;
  /** Rigidez de balanceo Kθ (N·m/rad). */
  ktheta: number;
  /** βo leído de la Figura A-2.2-1 (o ajustado con A-2-10). */
  beta0: number;
};

export type ResultadoInteraccionFHE = {
  mBarra: number;
  hBarra: number;
  /** k̄ de A-2-4 (N/m). */
  kBarra: number;
  /** T̄ de A-2-3 (s). */
  tBarra: number;
  razonPeriodos: number;
  /** β̄ de A-2-9, limitado a 0.05–0.20. */
  betaBarra: number;
  sa: number;
  saBarra: number;
  /** Vs = Sa·g·M sin interacción (N). */
  vs: number;
  /** ΔVs de A-2-2 (N). */
  deltaVs: number;
  /** Vs′ con período Cu·Ta (N). */
  vsPrima: number;
  /** V̄s de A-2-1, con el piso 0.7·Vs′ (N). */
  vsBarra: number;
  piso: number;
  gobiernaPiso: boolean;
  /** Reducción porcentual del cortante basal. */
  reduccionPorcentaje: number;
};

/**
 * Método de la fuerza horizontal equivalente del Apéndice A-2 (A-2.2): de T y las rigideces de la
 * cimentación al cortante basal reducido por interacción suelo-estructura.
 */
export function interaccionFHE(e: EntradaInteraccionFHE): ResultadoInteraccionFHE {
  const mBarra = masaParticipante(e.masaTotal);
  const hBarra = alturaEfectiva(e.hn);
  const kBarra = rigidezEmpotrada(mBarra, e.t);
  const tBarra = periodoEfectivoISE(e.t, kBarra, e.ky, e.ktheta, hBarra);
  const betaBarra = amortiguamientoEfectivo(e.beta0, tBarra, e.t);
  const sa = espectroSa(e.t, e.espectro);
  const saBarra = espectroSa(tBarra, e.espectro);
  const vs = sa * G * e.masaTotal;
  const deltaVs = reduccionCortanteISE(sa, saBarra, betaBarra, mBarra);
  const cu = coeficienteCu(e.espectro.av, e.espectro.fv);
  const vsPrima = espectroSa(cu * e.ta, e.espectro) * G * e.masaTotal;
  const { vsBarra, piso, gobiernaPiso } = cortanteBaseA2(vs, deltaVs, vsPrima);
  return {
    mBarra,
    hBarra,
    kBarra,
    tBarra,
    razonPeriodos: tBarra / e.t,
    betaBarra,
    sa,
    saBarra,
    vs,
    deltaVs,
    vsPrima,
    vsBarra,
    piso,
    gobiernaPiso,
    reduccionPorcentaje: (100 * (vs - vsBarra)) / vs,
  };
}
