/**
 * Título C de la NSR-10 — Apéndice C-G: diseño a flexión por esfuerzos admisibles bajo cargas de servicio.
 * Lógica pura, sin React. (El método análogo para mampostería, Apéndice D-1, vive en esfuerzosAdmisiblesMamposteria.ts.)
 *
 * UNIDADES: longitudes en mm · áreas en mm² · esfuerzos en MPa · momentos en kN·m (la conversión N·mm → kN·m se hace aquí).
 * PDF = página impresa "C-n" + 302 (C-259 a C-262 = PDF 561 a 564).
 *
 * Qué es de la norma y qué es «autoría del proyecto»:
 *  - Norma: esfuerzos admisibles de C-G.3 (0.45 f′c; 120 MPa para fy ≤ 240; 170 MPa para fy ≥ 420 y malla), relación modular n de
 *    C-G.4.4 (entero más cercano, no menor de 6) y las ecuaciones C-G-1 a C-G-6.
 *  - Proyecto: E_c = 4700 √f′c para calcular n; leer «0.50 fy o 210 MPa» como el MENOR; usar 120 MPa para 240 < fy < 420 MPa
 *    en seccionServicio (la norma no da valor y fsAdmisible devuelve null); el momento admisible como el menor entre el del
 *    acero y el del concreto.
 *
 * ÍNDICE
 *   relacionModularDesdeFc (C-G.4.4) · fcAdmisible (C-G.3.1) · fsAdmisible (C-G.3.2) · kSimple (C-G-5) · kDoble (C-G-6)
 *   seccionServicio: k, j, esfuerzos fs, f′s y fc (C-G-1 a C-G-4) y momentos admisibles de una sección rectangular.
 */

/** Módulo de elasticidad del acero, MPa (C.8.5.2). */
export const ES_ACERO_MPA = 200000;

/** Módulo de elasticidad del concreto normal, MPa: 4700 √f′c (C.8.5.1; f′c en MPa). */
const moduloConcreto = (fc: number): number => 4700 * Math.sqrt(fc);

/**
 * C-G.4.4 — relación modular n = Es/Ec tomada como el entero más cercano, no menor de 6.
 * Ec = 4700 √f′c (autoría del proyecto: la norma remite a C.8.5.1).
 */
export function relacionModularDesdeFc(fc: number): number {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  return Math.max(6, Math.round(ES_ACERO_MPA / moduloConcreto(fc)));
}

/** C-G.3.1 — esfuerzo admisible en la fibra extrema comprimida del concreto: 0.45 f′c (MPa). */
export function fcAdmisible(fc: number): number {
  return 0.45 * fc;
}

export interface OpcionesFs {
  /** Barras No. 3 (3/8″) o 10M o menores en losas en una dirección de luz menor de 3.50 m (C-G.3.2). */
  losaBarraPequena?: boolean;
}

/**
 * C-G.3.2 — esfuerzo admisible del acero de refuerzo en tracción (MPa).
 *  - fy ≤ 240 MPa → 120 MPa · fy ≥ 420 MPa → 170 MPa.
 *  - Losas en una dirección (luz < 3.50 m) con barras No. 3 o menores: «0.50 fy o 210 MPa», leído como el menor.
 *  - 240 < fy < 420 MPa: la norma no da valor → null.
 */
export function fsAdmisible(fy: number, opciones: OpcionesFs = {}): number | null {
  if (!(fy > 0)) throw new RangeError('fy debe ser positivo');
  if (opciones.losaBarraPequena) return Math.min(0.5 * fy, 210);
  if (fy <= 240) return 120;
  if (fy >= 420) return 170;
  return null;
}

/** C-G-5 — profundidad relativa del eje neutro k = kd/d con solo refuerzo en tracción: √((nρ)² + 2nρ) − nρ. */
export function kSimple(n: number, rho: number): number {
  const nr = n * rho;
  return Math.sqrt(nr * nr + 2 * nr) - nr;
}

/**
 * C-G-6 — k con refuerzo en compresión:
 * √(n²(ρ+ρ′)² + 2n(ρ + ρ′·d′/d)) − n(ρ+ρ′). Con ρ′ = 0 coincide con C-G-5.
 */
export function kDoble(n: number, rho: number, rhoPrima: number, dPrimaSobreD: number): number {
  const s = n * (rho + rhoPrima);
  return Math.sqrt(s * s + 2 * n * (rho + rhoPrima * dPrimaSobreD)) - s;
}

export interface EntradaSeccion {
  /** Ancho de la cara en compresión, mm. */
  b: number;
  /** Peralte efectivo, mm. */
  d: number;
  /** Área del refuerzo en tracción, mm². */
  As: number;
  /** f′c, MPa. */
  fc: number;
  /** fy, MPa. */
  fy: number;
  /** Momento de servicio, kN·m (opcional: sin él no se calculan los esfuerzos actuantes). */
  M?: number;
  /** Área del refuerzo en compresión, mm² (opcional). */
  AsPrima?: number;
  /** Distancia de la fibra comprimida al refuerzo en compresión, mm (requerida si AsPrima > 0). */
  dPrima?: number;
  /** Relación modular; por defecto la de C-G.4.4 con la f′c dada. */
  n?: number;
  /** Losa en una dirección con barras pequeñas (C-G.3.2, último renglón). */
  losaBarraPequena?: boolean;
}

export interface ResultadoSeccion {
  n: number;
  rho: number;
  rhoPrima: number;
  /** Profundidad relativa del eje neutro, k = kd/d. */
  k: number;
  /** Brazo interno relativo, j = 1 − k/3 (C-G-4). */
  j: number;
  /** Esfuerzo admisible del acero, MPa (120 por prudencia si 240 < fy < 420; autoría del proyecto). */
  fsAdm: number;
  /** Esfuerzo admisible del concreto, MPa. */
  fcAdm: number;
  /** Momento admisible por el acero, fs·As·j·d (C-G-1), kN·m. */
  MadmAcero: number;
  /** Momento admisible por el concreto, fc·b·d²·j·k/2 (C-G-3), kN·m. */
  MadmConcreto: number;
  /** Cuál material gobierna el momento admisible. */
  gobierna: 'acero' | 'concreto';
  /** Menor de los dos momentos admisibles, kN·m (autoría del proyecto). */
  Madm: number;
  /** Esfuerzo en el acero en tracción para M (C-G-1), MPa; null si no se dio M. */
  fs: number | null;
  /** Esfuerzo en el concreto para M (C-G-3), MPa; null si no se dio M. */
  fcCalc: number | null;
  /** Esfuerzo en el acero en compresión (C-G-2), MPa; null si no hay A′s o no se dio M. */
  fsPrima: number | null;
}

/** Esfuerzos y momentos admisibles de una sección rectangular fisurada y transformada (C-G.4). */
export function seccionServicio(e: EntradaSeccion): ResultadoSeccion {
  const { b, d, As, fc, fy } = e;
  if (!(b > 0 && d > 0 && As > 0 && fc > 0 && fy > 0)) throw new RangeError('b, d, As, f′c y fy deben ser positivos');
  const n = e.n ?? relacionModularDesdeFc(fc);
  const rho = As / (b * d);
  const AsPrima = e.AsPrima ?? 0;
  const rhoPrima = AsPrima / (b * d);
  let k: number;
  if (AsPrima > 0) {
    if (e.dPrima == null || !(e.dPrima > 0)) throw new RangeError('dPrima es obligatorio si hay refuerzo en compresión');
    k = kDoble(n, rho, rhoPrima, e.dPrima / d);
  } else {
    k = kSimple(n, rho);
  }
  const j = 1 - k / 3;
  const fsAdm = fsAdmisible(fy, { losaBarraPequena: e.losaBarraPequena }) ?? 120;
  const fcAdm = fcAdmisible(fc);
  const MadmAcero = (fsAdm * As * j * d) / 1e6;
  const MadmConcreto = (fcAdm * b * d * d * j * k) / 2 / 1e6;
  const gobierna = MadmAcero <= MadmConcreto ? 'acero' : 'concreto';

  let fs: number | null = null;
  let fcCalc: number | null = null;
  let fsPrima: number | null = null;
  if (e.M != null) {
    const M = e.M * 1e6; // N·mm
    fs = M / (As * j * d);
    fcCalc = (2 * M) / (b * d * d * j * k);
    if (AsPrima > 0) fsPrima = (2 * fs * (k - (e.dPrima as number) / d)) / (1 - k);
  }
  return { n, rho, rhoPrima, k, j, fsAdm, fcAdm, MadmAcero, MadmConcreto, gobierna, Madm: Math.min(MadmAcero, MadmConcreto), fs, fcCalc, fsPrima };
}
