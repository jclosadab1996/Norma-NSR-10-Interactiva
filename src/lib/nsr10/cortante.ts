/**
 * Cortante en vigas y muros, cortante por fricción y ménsulas — Capítulo C.11 de la NSR-10.
 * Unidades: f′c, fy, fyt, esfuerzos en MPa; bw, d, h, s, ℓw en mm; áreas en mm²; fuerzas (Vc, Vs, Vu, Nu) en kN;
 * momentos en kN·m. PDF = página impresa "C-n" + 302.
 */
import { raizFcCortante } from './concreto';
import {
  AV_MIN,
  AV_MIN_PREESFORZADO_DIVISOR,
  COEF_NU_AXIAL,
  COEF_VC_SIMPLE,
  DIVISOR_NU_COMPRESION,
  FRACCION_PHIVC_REFUERZO_MINIMO,
  FYT_MAX_CORTANTE,
  LIMITES_VN_FRICCION,
  LIMITES_VS,
  MENSULAS,
  MUROS,
  PHI_CORTANTE_TORSION,
  SEPARACION_MAX,
  TABLA_MU_FRICCION,
  VC_DETALLADO,
  VC_PREESFORZADO,
  type TipoSuperficieFriccion,
} from '../../data/cortanteTorsion';

/** Conversión N → kN. */
const kN = (newtons: number) => newtons / 1000;

/**
 * √f′c que se usa en las ecuaciones de cortante: limitada a 8.3 MPa (C.11.1.2, C-87) salvo que se indique
 * `sinLimite` (C.11.1.2.1: vigas y losas nervadas con refuerzo mínimo en el alma, C-87).
 */
export function raizFcVc(fc: number, sinLimite = false): number {
  return sinLimite ? Math.sqrt(fc) : raizFcCortante(fc);
}

/* =====================================================================================
 * C.11.2 — Vc en elementos no preesforzados
 * ===================================================================================== */

export type EntradaVcSimple = {
  fc: number;
  bw: number;
  d: number;
  /** Factor de concreto liviano λ (C.8.6.1). */
  lambda?: number;
  /** Fuerza axial mayorada Nu en kN: positiva en compresión, negativa en tracción. Con Nu < 0 se toma Vc = 0 (C.11.2.1.3). */
  Nu?: number;
  /** Área bruta Ag en mm² (necesaria si Nu ≠ 0). */
  Ag?: number;
  /** Permite √f′c > 8.3 MPa (C.11.1.2.1). */
  sinLimiteRaiz?: boolean;
};

/**
 * Vc simplificado en kN (C.11.2.1):
 * - solo cortante y flexión: Vc = 0.17 λ √f′c bw d (Ec. C.11-3, C-88);
 * - con compresión axial: Vc = 0.17 (1 + Nu/14Ag) λ √f′c bw d (Ec. C.11-4);
 * - con tracción axial significativa: Vc = 0 (C.11.2.1.3).
 */
export function vcSimplificado({ fc, bw, d, lambda = 1, Nu = 0, Ag, sinLimiteRaiz }: EntradaVcSimple): number {
  const base = COEF_VC_SIMPLE * lambda * raizFcVc(fc, sinLimiteRaiz) * bw * d;
  if (Nu === 0) return kN(base);
  if (Nu < 0) return 0;
  if (!Ag || Ag <= 0) throw new RangeError('Ag es necesaria cuando hay fuerza axial');
  const nuSobreAg = (Nu * 1000) / Ag; // MPa
  return kN(base * (1 + nuSobreAg / DIVISOR_NU_COMPRESION));
}

export type EntradaVcDetallado = {
  fc: number;
  bw: number;
  d: number;
  /** Cuantía ρw = As/(bw d). */
  rhoW: number;
  /** Cortante mayorado Vu en la sección (kN). */
  Vu: number;
  /** Momento mayorado Mu simultáneo con Vu (kN·m). */
  Mu: number;
  lambda?: number;
  /** Fuerza axial Nu (kN): + compresión, − tracción. */
  Nu?: number;
  Ag?: number;
  /** Altura total h (mm), necesaria con Nu > 0 para Mm (Ec. C.11-6). */
  h?: number;
  sinLimiteRaiz?: boolean;
};

export type ResultadoVcDetallado = {
  /** Vc detallado (kN). */
  Vc: number;
  /** Valor de Vu d / Mu usado (limitado a 1.0 si Nu ≤ 0). */
  vudSobreMu: number;
  /** Máximo permitido en kN. */
  Vcmax: number;
  /** ¿Gobierna el máximo 0.29 λ √f′c bw d? */
  gobiernaMaximo: boolean;
  /** Ecuación aplicada. */
  ecuacion: 'C.11-5' | 'C.11-7' | 'C.11-8';
};

/**
 * Vc detallado en kN (C.11.2.2):
 * - Nu = 0: Ec. C.11-5, Vc = (0.16 λ √f′c + 17 ρw Vu d/Mu) bw d ≤ 0.29 λ √f′c bw d, con Vu d/Mu ≤ 1.0.
 * - Nu > 0 (compresión): Ec. C.11-5 con Mm = Mu − Nu (4h − d)/8 en lugar de Mu y Vu d/Mm sin límite de 1.0
 *   (Ecs. C.11-6); Vc ≤ 0.29 λ √f′c bw d √(1 + 0.29 Nu/Ag) (Ec. C.11-7); si Mm < 0 se usa C.11-7.
 * - Nu < 0 (tracción): Ec. C.11-8, Vc = 0.17 (1 + 0.29 Nu/Ag) λ √f′c bw d ≥ 0.
 */
export function vcDetallado(e: EntradaVcDetallado): ResultadoVcDetallado {
  const { fc, bw, d, rhoW, Vu, Mu, lambda = 1, Nu = 0, Ag, h, sinLimiteRaiz } = e;
  const raiz = raizFcVc(fc, sinLimiteRaiz);
  const bd = bw * d;
  const { coefRaiz, coefRho, maximo } = VC_DETALLADO;

  if (Nu < 0) {
    if (!Ag || Ag <= 0) throw new RangeError('Ag es necesaria cuando hay fuerza axial');
    const nuSobreAg = (Nu * 1000) / Ag;
    const Vc = Math.max(0, kN(COEF_VC_SIMPLE * (1 + (COEF_NU_AXIAL * nuSobreAg)) * lambda * raiz * bd));
    return { Vc, vudSobreMu: NaN, Vcmax: NaN, gobiernaMaximo: false, ecuacion: 'C.11-8' };
  }

  const dm = d / 1000; // m
  if (Nu > 0) {
    if (!Ag || Ag <= 0 || !h) throw new RangeError('Ag y h son necesarias cuando hay compresión axial');
    const nuSobreAg = (Nu * 1000) / Ag;
    const Vcmax = kN(maximo * lambda * raiz * bd * Math.sqrt(1 + (COEF_NU_AXIAL * nuSobreAg)));
    const Mm = Mu - (Nu * (4 * h - d)) / 8 / 1000; // kN·m
    if (Mm <= 0) return { Vc: Vcmax, vudSobreMu: NaN, Vcmax, gobiernaMaximo: true, ecuacion: 'C.11-7' };
    const razon = (Vu * dm) / Mm;
    const Vc = kN((coefRaiz * lambda * raiz + coefRho * rhoW * razon) * bd);
    return { Vc: Math.min(Vc, Vcmax), vudSobreMu: razon, Vcmax, gobiernaMaximo: Vc > Vcmax, ecuacion: 'C.11-7' };
  }

  if (Mu <= 0) throw new RangeError('Mu debe ser positivo (momento simultáneo con Vu)');
  const razon = Math.min(1, (Vu * dm) / Mu);
  const Vcmax = kN(maximo * lambda * raiz * bd);
  const Vc = kN((coefRaiz * lambda * raiz + coefRho * rhoW * razon) * bd);
  return { Vc: Math.min(Vc, Vcmax), vudSobreMu: razon, Vcmax, gobiernaMaximo: Vc > Vcmax, ecuacion: 'C.11-5' };
}

/** Altura efectiva y área de elementos circulares (C.11.2.3, C-89): área = D · d con d = 0.80 D. */
export function dCircular(diametro: number): { d: number; area: number } {
  const d = 0.8 * diametro;
  return { d, area: diametro * d };
}

/* =====================================================================================
 * C.11.3 — Vc en elementos preesforzados
 * ===================================================================================== */

/** dp mínimo: 0.80h (C.11.3.1, C-89). */
export const dpEfectivo = (dp: number, h: number): number => Math.max(dp, VC_PREESFORZADO.dpMinFraccionH * h);

/**
 * Vc de la Ec. C.11-9 en kN (C.11.3.2, C-89): (0.05 λ √f′c + 4.8 Vu dp/Mu) bw d, con Vu dp/Mu ≤ 1.0,
 * entre 0.17 λ √f′c bw d y 0.42 λ √f′c bw d. Los límites de C.11.3.4/C.11.3.5 (Vcw con preesforzado reducido) se
 * pasan en `vcwLimite` (kN) si aplican.
 */
export function vcPreesforzadoC119(p: {
  fc: number;
  bw: number;
  d: number;
  dp: number;
  Vu: number;
  Mu: number;
  lambda?: number;
  vcwLimite?: number;
  sinLimiteRaiz?: boolean;
}): { Vc: number; vudpSobreMu: number; minimo: number; maximo: number } {
  const { fc, bw, d, dp, Vu, Mu, lambda = 1, vcwLimite, sinLimiteRaiz } = p;
  const c = VC_PREESFORZADO.c119;
  const raiz = raizFcVc(fc, sinLimiteRaiz);
  const razon = Math.min(c.ratioMax, (Vu * (dp / 1000)) / Mu);
  const Vc = kN((c.coefRaiz * lambda * raiz + c.coefVudp * razon) * bw * d);
  const minimo = kN(c.minimo * lambda * raiz * bw * d);
  let maximo = kN(c.maximo * lambda * raiz * bw * d);
  if (vcwLimite !== undefined) maximo = Math.min(maximo, vcwLimite);
  return { Vc: Math.min(Math.max(Vc, minimo), maximo), vudpSobreMu: razon, minimo, maximo };
}

/**
 * Momento de fisuración por flexión Mcre en kN·m (Ec. C.11-11, C-89):
 * (I/yt)(0.5 λ √f′c + fpe − fd), con I en mm⁴, yt en mm y esfuerzos en MPa.
 */
export function mcre(p: { I: number; yt: number; fc: number; fpe: number; fd: number; lambda?: number }): number {
  const { I, yt, fc, fpe, fd, lambda = 1 } = p;
  const esfuerzo = VC_PREESFORZADO.mcreCoefRaiz * lambda * Math.sqrt(fc) + fpe - fd;
  return ((I / yt) * esfuerzo) / 1e6;
}

/**
 * Vci en kN (Ec. C.11-10, C-89): 0.05 λ √f′c bw dp + Vd + Vi Mcre/Mmax, no menor que 0.14 λ √f′c bw d.
 * `dp` ≥ 0.80h; Vd, Vi en kN; Mcre y Mmax en kN·m.
 */
export function vci(p: {
  fc: number;
  bw: number;
  d: number;
  dp: number;
  Vd: number;
  Vi: number;
  Mcre: number;
  Mmax: number;
  lambda?: number;
}): number {
  const { fc, bw, d, dp, Vd, Vi, Mcre, Mmax, lambda = 1 } = p;
  const raiz = raizFcVc(fc, true);
  const v = kN(VC_PREESFORZADO.vci.coefRaiz * lambda * raiz * bw * dp) + Vd + (Vi * Mcre) / Mmax;
  return Math.max(v, kN(VC_PREESFORZADO.vci.minimo * lambda * raiz * bw * d));
}

/** Vcw en kN (Ec. C.11-12, C-89): (0.29 λ √f′c + 0.3 fpc) bw dp + Vp. fpc en MPa; Vp en kN. */
export function vcw(p: { fc: number; bw: number; dp: number; fpc: number; Vp?: number; lambda?: number }): number {
  const { fc, bw, dp, fpc, Vp = 0, lambda = 1 } = p;
  const c = VC_PREESFORZADO.vcw;
  return kN((c.coefRaiz * lambda * raizFcVc(fc, true) + c.coefFpc * fpc) * bw * dp) + Vp;
}

/** Vc = menor de Vci y Vcw (C.11.3.3, C-89). */
export const vcPreesforzadoDetallado = (vciKN: number, vcwKN: number): number => Math.min(vciKN, vcwKN);

/* =====================================================================================
 * C.11.4 — Refuerzo de cortante
 * ===================================================================================== */

/** fyt de diseño del refuerzo de cortante: no mayor que 420 MPa (C.11.4.2, C-90). */
export const fytDiseno = (fyt: number): number => Math.min(fyt, FYT_MAX_CORTANTE);

/** Vs en kN con estribos perpendiculares (Ec. C.11-15, C-91): Av fyt d / s. */
export function vsEstribos(p: { Av: number; fyt: number; d: number; s: number }): number {
  return kN((p.Av * p.fyt * p.d) / p.s);
}

/** Vs en kN con estribos inclinados un ángulo α (grados) respecto al eje (Ec. C.11-16, C-92): Av fyt (sen α + cos α) d / s. */
export function vsEstribosInclinados(p: { Av: number; fyt: number; d: number; s: number; alphaGrados: number }): number {
  const a = (p.alphaGrados * Math.PI) / 180;
  return kN((p.Av * p.fyt * (Math.sin(a) + Math.cos(a)) * p.d) / p.s);
}

/** Vs en kN con una barra o grupo de barras dobladas a la misma distancia del apoyo (Ec. C.11-17, C-92): Av fy sen α. */
export function vsBarraDoblada(p: { Av: number; fy: number; alphaGrados: number }): number {
  const a = (p.alphaGrados * Math.PI) / 180;
  return kN(p.Av * p.fy * Math.sin(a));
}

/** Vs máximo en kN: 0.66 √f′c bw d (C.11.4.7.9, C-92). */
export const vsMaximo = (fc: number, bw: number, d: number): number => kN(LIMITES_VS.maximo * raizFcVc(fc) * bw * d);

/** Umbral 0.33 √f′c bw d (kN) sobre el cual las separaciones máximas se reducen a la mitad (C.11.4.5.3, C-91). */
export const vsUmbralReduccion = (fc: number, bw: number, d: number): number => kN(LIMITES_VS.umbralReduccionSeparacion * raizFcVc(fc) * bw * d);

/**
 * Separación máxima de estribos perpendiculares en mm (C.11.4.5, C-90/C-91): menor de d/2 (no preesforzado) o 0.75h
 * (preesforzado) y 600 mm; se reduce a la mitad si Vs > 0.33 √f′c bw d.
 */
export function separacionMaximaEstribos(p: { d: number; h?: number; fc: number; bw: number; Vs: number; preesforzado?: boolean }): { s: number; reducida: boolean } {
  const { d, h, fc, bw, Vs, preesforzado } = p;
  if (preesforzado && !h) throw new RangeError('h es necesaria en elementos preesforzados');
  const base = preesforzado ? SEPARACION_MAX.preesforzadoFraccionH * (h as number) : SEPARACION_MAX.noPreesforzadoFraccionD * d;
  const s0 = Math.min(base, SEPARACION_MAX.absolutaMm);
  const reducida = Vs > vsUmbralReduccion(fc, bw, d);
  return { s: reducida ? s0 / 2 : s0, reducida };
}

/** Av,min en mm² (Ec. C.11-13, C-91): 0.062 √f′c bw s / fyt, no menor que 0.35 bw s / fyt. */
export function avMin(p: { fc: number; bw: number; s: number; fyt: number }): number {
  const { fc, bw, s, fyt } = p;
  return Math.max((AV_MIN.coefRaiz * Math.sqrt(fc) * bw * s) / fyt, (AV_MIN.coefMinimo * bw * s) / fyt);
}

/** Av,min en mm² para preesforzados con preesforzado efectivo ≥ 40 % (Ec. C.11-14, C-91): Aps fpu s / (80 fyt d) √(d/bw). */
export function avMinPreesforzado(p: { Aps: number; fpu: number; s: number; fyt: number; d: number; bw: number }): number {
  const { Aps, fpu, s, fyt, d, bw } = p;
  return ((Aps * fpu * s) / (AV_MIN_PREESFORZADO_DIVISOR * fyt * d)) * Math.sqrt(d / bw);
}

/** ¿Se exige refuerzo mínimo de cortante? Sí donde Vu > 0.5 φ Vc (C.11.4.6.1, C-91), salvo las excepciones de la lista. */
export const requiereAvMin = (Vu: number, phiVc: number): boolean => Vu > FRACCION_PHIVC_REFUERZO_MINIMO * phiVc;

/** Vs requerido (kN) para que φ(Vc + Vs) ≥ Vu: Vs = Vu/φ − Vc, nunca negativo (C.11.4.7.1, C-91). */
export const vsRequerido = (Vu: number, Vc: number, phi = PHI_CORTANTE_TORSION): number => Math.max(0, Vu / phi - Vc);

/** Separación teórica en mm para un Vs dado con estribos perpendiculares (despeje de la Ec. C.11-15): s = Av fyt d / Vs. */
export function separacionRequerida(p: { Vs: number; Av: number; fyt: number; d: number }): number {
  if (p.Vs <= 0) return Infinity;
  return (p.Av * p.fyt * p.d) / (p.Vs * 1000);
}

export type EntradaDisenoViga = {
  fc: number;
  fyt: number;
  bw: number;
  d: number;
  /** Altura total (mm), solo para elementos preesforzados. */
  h?: number;
  /** Área de acero de las ramas de un estribo (mm²), p. ej. 2 × 71 mm² para dos ramas No. 3 (3/8"). */
  Av: number;
  /** Separación provista (mm). */
  s: number;
  Vu: number;
  lambda?: number;
  phi?: number;
  metodo?: 'simplificado' | 'detallado';
  /** Para el método detallado. */
  rhoW?: number;
  Mu?: number;
  Nu?: number;
  Ag?: number;
  /** El elemento está exento de Av,min por C.11.4.6.1(a–f). */
  exentoAvMin?: boolean;
};

export type ResultadoDisenoViga = {
  fyt: number;
  Vc: number;
  Vs: number;
  VsMax: number;
  Vn: number;
  phi: number;
  phiVc: number;
  phiVn: number;
  /** Verificación φVn ≥ Vu (C.11-1). */
  cumpleResistencia: boolean;
  /** Vs ≤ 0.66 √f′c bw d (C.11.4.7.9); si no, hay que aumentar la sección. */
  seccionSuficiente: boolean;
  /** ¿Hace falta refuerzo (Vu > φVc)? */
  requiereEstribos: boolean;
  /** ¿Se exige Av,min (Vu > 0.5 φVc y no exento)? */
  requiereAvMin: boolean;
  AvMin: number;
  /** Av provisto ≥ Av,min. */
  cumpleAvMin: boolean;
  sMax: number;
  sMaxReducida: boolean;
  cumpleSeparacion: boolean;
  /** Vs necesario para Vu y separación teórica con el Av dado (mm). */
  VsRequerido: number;
  sRequerida: number;
  /** Separación a usar = menor entre la requerida, la máxima y la que da Av,min (mm). */
  sAdoptable: number;
  /** Observaciones. */
  avisos: string[];
  Vcdetalle?: ResultadoVcDetallado;
};

/** Verificación completa de una viga a cortante con estribos perpendiculares (C.11.1, C.11.2, C.11.4, C-87 a C-92). */
export function verificarCortanteViga(e: EntradaDisenoViga): ResultadoDisenoViga {
  const { fc, bw, d, Av, s, Vu, lambda = 1, phi = PHI_CORTANTE_TORSION, metodo = 'simplificado', h } = e;
  const fyt = fytDiseno(e.fyt);
  const avisos: string[] = [];
  if (e.fyt > FYT_MAX_CORTANTE) avisos.push(`fyt se limitó a ${FYT_MAX_CORTANTE} MPa (C.11.4.2).`);
  if (Math.sqrt(fc) > 8.3) avisos.push('√f′c supera 8.3 MPa: se usó 8.3 MPa (C.11.1.2); C.11.1.2.1 permite más para Vc solo con refuerzo mínimo en el alma.');

  let Vc: number;
  let Vcdetalle: ResultadoVcDetallado | undefined;
  if (metodo === 'detallado') {
    if (e.rhoW === undefined || e.Mu === undefined) throw new RangeError('El método detallado requiere ρw y Mu');
    Vcdetalle = vcDetallado({ fc, bw, d, rhoW: e.rhoW, Vu, Mu: e.Mu, lambda, Nu: e.Nu, Ag: e.Ag, h });
    Vc = Vcdetalle.Vc;
  } else {
    Vc = vcSimplificado({ fc, bw, d, lambda, Nu: e.Nu, Ag: e.Ag });
  }
  const Vs = vsEstribos({ Av, fyt, d, s });
  const VsMax = vsMaximo(fc, bw, d);
  const Vn = Vc + Vs;
  const phiVc = phi * Vc;
  const phiVn = phi * Vn;
  const reqEstribos = Vu > phiVc;
  const reqAvMin = !e.exentoAvMin && requiereAvMin(Vu, phiVc);
  const AvMinVal = avMin({ fc, bw, s, fyt });
  const VsReq = vsRequerido(Vu, Vc, phi);
  const sReq = separacionRequerida({ Vs: VsReq, Av, fyt, d });
  const sm = separacionMaximaEstribos({ d, h, fc, bw, Vs: Math.max(Vs, VsReq) });
  // Separación que da exactamente Av,min con el Av del estribo: s = Av fyt / (0.062 √f′c bw) y 0.35 bw
  const sPorAvMin = Math.min(
    (Av * fyt) / (AV_MIN.coefRaiz * Math.sqrt(fc) * bw),
    (Av * fyt) / (AV_MIN.coefMinimo * bw),
  );
  const sAdoptable = Math.min(Number.isFinite(sReq) ? sReq : Infinity, sm.s, reqAvMin ? sPorAvMin : Infinity);
  if (Vs > VsMax) avisos.push('Vs excede 0.66 √f′c bw d (C.11.4.7.9): hay que aumentar la sección.');
  if (!reqEstribos) avisos.push('Vu ≤ φVc: el concreto resiste solo; los estribos son opcionales salvo Av,min (si Vu > 0.5 φVc).');
  return {
    fyt,
    Vc,
    Vs,
    VsMax,
    Vn,
    phi,
    phiVc,
    phiVn,
    cumpleResistencia: phiVn >= Vu - 1e-9,
    seccionSuficiente: Vs <= VsMax + 1e-9,
    requiereEstribos: reqEstribos,
    requiereAvMin: reqAvMin,
    AvMin: AvMinVal,
    cumpleAvMin: !reqAvMin || Av >= AvMinVal - 1e-9,
    sMax: sm.s,
    sMaxReducida: sm.reducida,
    cumpleSeparacion: s <= sm.s + 1e-9,
    VsRequerido: VsReq,
    sRequerida: sReq,
    sAdoptable,
    avisos,
    Vcdetalle,
  };
}

/** Vu a una distancia x (m) de la cara del apoyo en una viga con carga uniforme: Vu(x) = Vu,cara · (1 − 2x/ln). */
export const cortanteEnX = (VuCara: number, ln: number, x: number): number => VuCara * (1 - (2 * x) / ln);

/* =====================================================================================
 * C.11.6 — Cortante por fricción
 * ===================================================================================== */

/** μ = factor tabulado × λ (C.11.6.4.3, C-97). */
export function muFriccion(tipo: TipoSuperficieFriccion, lambda = 1): number {
  const fila = TABLA_MU_FRICCION.find((f) => f.id === tipo);
  if (!fila) throw new RangeError(`Tipo de superficie desconocido: ${tipo}`);
  return fila.mu * lambda;
}

/** Vn en kN con refuerzo perpendicular al plano (Ec. C.11-25, C-97): Avf fy μ (fy ≤ 420 MPa, C.11.6.6). */
export function vnFriccion(p: { Avf: number; fy: number; mu: number }): number {
  return kN(p.Avf * Math.min(p.fy, 420) * p.mu);
}

/** Vn en kN con refuerzo inclinado un ángulo α (grados) respecto al plano (Ec. C.11-26, C-97): Avf fy (μ sen α + cos α). */
export function vnFriccionInclinado(p: { Avf: number; fy: number; mu: number; alphaGrados: number }): number {
  const a = (p.alphaGrados * Math.PI) / 180;
  return kN(p.Avf * Math.min(p.fy, 420) * (p.mu * Math.sin(a) + Math.cos(a)));
}

/**
 * Avf requerido en mm² con refuerzo perpendicular: Vu ≤ φ Vn ⇒ Avf = Vu / (φ fy μ). Una compresión neta permanente
 * Nc (kN) se puede sumar a la fuerza del refuerzo (C.11.6.7): Avf = (Vu/(φ μ) − Nc) / fy.
 */
export function avfRequerido(p: { Vu: number; fy: number; mu: number; phi?: number; Nc?: number }): number {
  const { Vu, fy, mu, phi = PHI_CORTANTE_TORSION, Nc = 0 } = p;
  return Math.max(0, ((Vu / (phi * mu) - Nc) * 1000) / Math.min(fy, 420));
}

/**
 * Límite superior de Vn en kN (C.11.6.5, C-97). Con concreto normal monolítico o sobre superficie rugosa:
 * menor de 0.2 f′c Ac, (3.3 + 0.08 f′c) Ac y 11 Ac. En los demás casos: menor de 0.2 f′c Ac y 5.5 Ac. Ac en mm².
 */
export function vnMaxFriccion(p: { fc: number; Ac: number; concretoNormal?: boolean; monoliticoORugoso?: boolean }): number {
  const { fc, Ac, concretoNormal = true, monoliticoORugoso = true } = p;
  const L = LIMITES_VN_FRICCION;
  if (concretoNormal && monoliticoORugoso) {
    return kN(Math.min(L.rugosoNormal.a * fc * Ac, (L.rugosoNormal.b0 + L.rugosoNormal.b1 * fc) * Ac, L.rugosoNormal.c * Ac));
  }
  return kN(Math.min(L.otros.a * fc * Ac, L.otros.c * Ac));
}

/* =====================================================================================
 * C.11.7 y C.11.8 — vigas altas y ménsulas
 * ===================================================================================== */

/** Vn máximo (kN) de vigas altas: 0.83 √f′c bw d (C.11.7.3, C-98). */
export const vnMaxVigaAlta = (fc: number, bw: number, d: number): number => kN(0.83 * raizFcVc(fc) * bw * d);

/** Av y Avh mínimos (mm²) de vigas altas: 0.0025 bw s y 0.0015 bw s2 (C.11.7.4 y C.11.7.5, C-98). */
export const avMinVigaAlta = (bw: number, s: number): number => 0.0025 * bw * s;
export const avhMinVigaAlta = (bw: number, s2: number): number => 0.0015 * bw * s2;
/** Separación máxima de vigas altas: menor entre d/5 y 300 mm (C.11.7.4 y C.11.7.5). */
export const separacionMaxVigaAlta = (d: number): number => Math.min(d / 5, 300);

export type EntradaMensula = {
  Vu: number; // kN
  Nuc?: number; // kN, tracción horizontal (≥ 0.2 Vu salvo medidas especiales)
  av: number; // mm, luz de cortante
  bw: number; // mm
  h: number; // mm
  d: number; // mm, en la cara del apoyo
  fc: number;
  fy: number;
  mu: number; // coeficiente de fricción μ ya con λ (C.11.6.4.3)
  /** Refuerzo de flexión requerido Af (mm²) para Vu av + Nuc (h − d), calculado según C.10.2 y C.10.3. */
  Af: number;
};

/**
 * Refuerzo de una ménsula (C.11.8.3 a C.11.8.5, C-98/C-99), φ = 0.75: Avf = Vu/(φ fy μ), An = Nuc/(φ fy),
 * Asc ≥ mayor de (Af + An) y (2Avf/3 + An), Ah ≥ 0.5 (Asc − An), Asc/(bd) ≥ 0.04 f′c/fy.
 */
export function disenoMensula(e: EntradaMensula) {
  const phi = 0.75;
  const fy = Math.min(e.fy, 420);
  const Nuc = Math.max(e.Nuc ?? 0, MENSULAS.nucMinFraccionVu * e.Vu);
  const Avf = (e.Vu * 1000) / (phi * fy * e.mu);
  const An = (Nuc * 1000) / (phi * fy);
  const AscMin = (MENSULAS.cuantiaMinCoef * e.fc * e.bw * e.d) / fy;
  const Asc = Math.max(e.Af + An, MENSULAS.ascFraccionAvf * Avf + An, AscMin);
  const Ah = MENSULAS.ahFraccionAsc * (Asc - An);
  return {
    phi,
    Nuc,
    Avf,
    An,
    AscMin,
    Asc,
    Ah,
    avSobreD: e.av / e.d,
    aplicaC1183: e.av / e.d <= MENSULAS.avSobreDMax && Nuc <= e.Vu,
  };
}

/* =====================================================================================
 * C.11.9 — muros
 * ===================================================================================== */

/** d de muros para cortante en el plano: 0.8 ℓw (C.11.9.4, C-99). */
export const dMuro = (lw: number): number => MUROS.dFraccionLw * lw;

/** Vc de muro, Ec. C.11-27 (kN): 0.27 λ √f′c h d + Nu d / (4 ℓw). h = espesor, d y ℓw en mm, Nu en kN (+ compresión). */
export function vcMuro27(p: { fc: number; h: number; lw: number; d?: number; Nu?: number; lambda?: number }): number {
  const { fc, h, lw, Nu = 0, lambda = 1 } = p;
  const d = p.d ?? dMuro(lw);
  return kN(MUROS.c1127.coefRaiz * lambda * raizFcVc(fc) * h * d) + (Nu * d) / (MUROS.c1127.divisorLw * lw);
}

/**
 * Vc de muro, Ec. C.11-28 (kN): [0.05 λ √f′c + ℓw (0.1 λ √f′c + 0.2 Nu/(ℓw h)) / (Mu/Vu − ℓw/2)] h d.
 * Mu en kN·m y Vu en kN; no se usa si (Mu/Vu − ℓw/2) ≤ 0 (devuelve NaN).
 */
export function vcMuro28(p: { fc: number; h: number; lw: number; d?: number; Nu?: number; Mu: number; Vu: number; lambda?: number }): number {
  const { fc, h, lw, Nu = 0, Mu, Vu, lambda = 1 } = p;
  const d = p.d ?? dMuro(lw);
  const c = MUROS.c1128;
  const denom = (Mu * 1000) / Vu - lw / 2; // mm
  if (denom <= 0) return NaN;
  const raiz = raizFcVc(fc);
  const termino = (lw * (c.coefRaizAlma * lambda * raiz + (c.coefNu * Nu * 1000) / (lw * h))) / denom;
  return kN((c.coefRaiz * lambda * raiz + termino) * h * d);
}

/** Vc de muro = menor de C.11-27 y C.11-28 (esta última solo si Mu/Vu − ℓw/2 > 0) (C.11.9.6, C-100). */
export function vcMuro(p: { fc: number; h: number; lw: number; Nu?: number; Mu: number; Vu: number; lambda?: number }): { Vc: number; c1127: number; c1128: number } {
  const c1127 = vcMuro27(p);
  const c1128 = vcMuro28(p);
  return { Vc: Number.isFinite(c1128) ? Math.min(c1127, c1128) : c1127, c1127, c1128 };
}

/** Vc simplificado de muros con compresión axial: 0.17 λ √f′c h d (C.11.9.5, C-100), con d = 0.8 ℓw. */
export function vcMuroSimple(p: { fc: number; h: number; lw: number; lambda?: number }): number {
  return kN(0.17 * (p.lambda ?? 1) * raizFcVc(p.fc) * p.h * dMuro(p.lw));
}

/** Cuantía vertical mínima de muros (Ec. C.11-30, C-100): 0.0025 + 0.5 (2.5 − hw/ℓw)(ρt − 0.0025), no menor que 0.0025 ni mayor que ρt. */
export function rhoVerticalMuro(p: { hw: number; lw: number; rhoT: number }): number {
  const c = MUROS.c1130;
  const calc = c.base + c.coef * (c.relacion - p.hw / p.lw) * (p.rhoT - c.base);
  return Math.min(Math.max(calc, MUROS.rhoVerticalMin), Math.max(p.rhoT, MUROS.rhoVerticalMin));
}

/** Separación máxima del refuerzo horizontal (mm): menor de ℓw/5, 3h y 450 (C.11.9.9.3). */
export const sMaxHorizontalMuro = (lw: number, h: number): number => Math.min(lw / 5, 3 * h, 450);
/** Separación máxima del refuerzo vertical (mm): menor de ℓw/3, 3h y 450 (C.11.9.9.5). */
export const sMaxVerticalMuro = (lw: number, h: number): number => Math.min(lw / 3, 3 * h, 450);
