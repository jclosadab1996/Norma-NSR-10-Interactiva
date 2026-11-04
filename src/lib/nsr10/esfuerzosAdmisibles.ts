/**
 * Apéndice C-G (Procedimiento alterno de diseño a flexión por el método de esfuerzos admisibles).
 * PDF p.561–563 (C-259 a C-261). PDF = impresa + 302. Unidades: mm, MPa, N·mm (momentos en kN·m en las salidas de alto nivel).
 */
import { ES_ACERO_MPA, moduloElasticidad } from './concreto';

/** Concreto: fc ≤ 0.45 f′c (C-G.3.1, PDF p.562, C-260). */
export const FACTOR_FC_ADMISIBLE = 0.45;

/** Esfuerzo admisible del acero en tracción (C-G.3.2, PDF p.562, C-260), MPa. */
export const FS_ADMISIBLE_FY_240 = 120;
export const FS_ADMISIBLE_FY_420 = 170;
export const FS_ADMISIBLE_LOSA_MAX = 210;
/** Losas en una dirección de luz < 3.50 m con barras No. 3 (10M) o menores: 0.50 fy o 210 MPa. */
export const LUZ_LOSA_ESPECIAL_M = 3.5;

/** Relación modular n = Es/Ec, entero más cercano pero no menor de 6 (C-G.4.4). */
export function relacionModular(Ec: number, Es = ES_ACERO_MPA): number {
  return Math.max(6, Math.round(Es / Ec));
}

/** n con Ec = 4700 √f′c (concreto de peso normal). */
export const relacionModularDesdeFc = (fc: number) => relacionModular(moduloElasticidad(fc));

/** Relación modular efectiva para el acero de compresión: 2 Es/Ec (C-G.4.5). */
export const relacionModularCompresion = (Ec: number, Es = ES_ACERO_MPA) => (2 * Es) / Ec;

/**
 * fs admisible (C-G.3.2). Para fy entre 240 y 420 MPa sin malla la norma no da valor (devuelve null).
 * Para losas en una dirección de luz < 3.50 m con barras No. 3 o menores: el menor entre 0.50 fy y 210 MPa
 * (lectura del proyecto del «0.50fy o 210 MPa»).
 */
export function fsAdmisible(fy: number, opciones: { losaUnaDireccionCorta?: boolean; mallaSoldada?: boolean } = {}): number | null {
  if (opciones.losaUnaDireccionCorta) return Math.min(0.5 * fy, FS_ADMISIBLE_LOSA_MAX);
  if (opciones.mallaSoldada || fy >= 420) return FS_ADMISIBLE_FY_420;
  if (fy <= 240) return FS_ADMISIBLE_FY_240;
  return null;
}

/** fc admisible = 0.45 f′c. */
export const fcAdmisible = (fc: number) => FACTOR_FC_ADMISIBLE * fc;

/** Ec. C-G-5: k = √((nρ)² + 2nρ) − nρ (solo refuerzo en tracción). */
export function kSimple(n: number, rho: number): number {
  const nr = n * rho;
  return Math.sqrt(nr * nr + 2 * nr) - nr;
}

/** Ec. C-G-6: k = √(n²(ρ+ρ′)² + 2n(ρ + ρ′ d′/d)) − n(ρ+ρ′). */
export function kDoble(n: number, rho: number, rhoP: number, dPrimaSobreD: number): number {
  const s = rho + rhoP;
  return Math.sqrt(n * n * s * s + 2 * n * (rho + rhoP * dPrimaSobreD)) - n * s;
}

/** Ec. C-G-4: j = 1 − k/3. */
export const jBrazo = (k: number) => 1 - k / 3;

/** Ec. C-G-1: fs = M/(As j d) (M en N·mm, resultado en MPa). */
export const fsTraccion = (M: number, As: number, j: number, d: number) => M / (As * j * d);

/** Ec. C-G-2: f′s = 2 fs (k − d′/d)/(1 − k) (MPa). */
export const fsCompresion = (fs: number, k: number, dPrimaSobreD: number) => (2 * fs * (k - dPrimaSobreD)) / (1 - k);

/** Ec. C-G-3: fc = 2M/(b d² j k) (MPa, M en N·mm). */
export const fcConcreto = (M: number, b: number, d: number, j: number, k: number) => (2 * M) / (b * d * d * j * k);

export interface EntradaServicio {
  b: number;
  d: number;
  As: number;
  fc: number;
  fy: number;
  /** Acero de compresión opcional. */
  AsPrima?: number;
  dPrima?: number;
  /** Momento de servicio, kN·m (opcional). */
  M?: number;
  n?: number;
  fsAdm?: number;
}

export interface ResultadoServicio {
  n: number;
  rho: number;
  rhoPrima: number;
  k: number;
  j: number;
  fsAdm: number;
  fcAdm: number;
  /** Momentos admisibles (kN·m): por acero en tracción, por concreto y, con A′s, por acero en compresión. */
  MadmAcero: number;
  MadmConcreto: number;
  MadmCompresion: number | null;
  Madm: number;
  gobierna: 'acero' | 'concreto' | 'acero-compresion';
  /** Esfuerzos para M (si se dio). */
  fs?: number;
  fcCalc?: number;
  fsPrima?: number;
}

/**
 * Esfuerzos y momento admisible de una sección rectangular con las Ecs. C-G-1 a C-G-6. El momento admisible es el menor que
 * lleva algún material a su esfuerzo admisible (combinación del proyecto; la norma da las ecuaciones y los límites).
 */
export function seccionServicio(e: EntradaServicio): ResultadoServicio {
  const n = e.n ?? relacionModularDesdeFc(e.fc);
  const rho = e.As / (e.b * e.d);
  const rhoP = e.AsPrima ? e.AsPrima / (e.b * e.d) : 0;
  const dpd = e.dPrima ? e.dPrima / e.d : 0;
  const k = rhoP > 0 ? kDoble(n, rho, rhoP, dpd) : kSimple(n, rho);
  const j = jBrazo(k);
  const fsAdm = e.fsAdm ?? fsAdmisible(e.fy) ?? FS_ADMISIBLE_FY_240;
  const fcAdm = fcAdmisible(e.fc);
  const MadmAcero = (fsAdm * e.As * j * e.d) / 1e6;
  const MadmConcreto = (fcAdm * e.b * e.d * e.d * j * k) / 2 / 1e6;
  let MadmCompresion: number | null = null;
  if (rhoP > 0 && k > dpd) {
    // f′s = 2 fs (k − d′/d)/(1 − k) ≤ fs,adm  →  fs ≤ fsAdm (1 − k)/(2 (k − d′/d))
    const fsMax = (fsAdm * (1 - k)) / (2 * (k - dpd));
    MadmCompresion = (fsMax * e.As * j * e.d) / 1e6;
  }
  const candidatos: [number, ResultadoServicio['gobierna']][] = [
    [MadmAcero, 'acero'],
    [MadmConcreto, 'concreto'],
  ];
  if (MadmCompresion !== null) candidatos.push([MadmCompresion, 'acero-compresion']);
  const [Madm, gobierna] = candidatos.reduce((a, c) => (c[0] < a[0] ? c : a));
  const r: ResultadoServicio = { n, rho, rhoPrima: rhoP, k, j, fsAdm, fcAdm, MadmAcero, MadmConcreto, MadmCompresion, Madm, gobierna };
  if (e.M !== undefined) {
    const Mnmm = e.M * 1e6;
    r.fs = fsTraccion(Mnmm, e.As, j, e.d);
    r.fcCalc = fcConcreto(Mnmm, e.b, e.d, j, k);
    if (rhoP > 0) r.fsPrima = fsCompresion(r.fs, k, dpd);
  }
  return r;
}
