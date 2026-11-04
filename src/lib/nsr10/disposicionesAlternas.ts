/**
 * Título C — Apéndice C-B: Disposiciones alternativas de diseño para elementos de concreto reforzado y preesforzado
 * sometidos a flexión y a compresión (PDF p.529–532, impresas C-227 a C-230).
 *
 * Ecuaciones y reglas de la norma implementadas:
 *   C-B-1       ρb = (0.85 β1 f′c / fy) · 600/(600 + fy)
 *   C-B.8.4.1   reducción máxima de momentos = 20 (1 − (ρ − ρ′)/ρb) %        C-B.8.4.2: solo si ρ ó ρ − ρ′ ≤ 0.50 ρb
 *   C-B.10.3.3  ρ ≤ 0.75 ρb cuando φPn < min(0.10 f′c Ag, φPb)
 *   C-B18.8.1   ωp, [ωp + (d/dp)(ω − ω′)] ó [ωpw + (d/dp)(ωw − ω′w)] ≤ 0.36 β1
 *   C-B18.10.4.1 redistribución en preesforzado = 20 [1 − (ωp + (d/dp)(ω − ω′))/(0.36 β1)] %   C-B18.10.4.2: índice ≤ 0.24 β1
 *   C-B18.8.3   resistencia ≥ 1.2 × carga de fisuración
 *
 * Unidades: SI (MPa, mm, kN). ω = ρ fy/f′c y ω′ = ρ′ fy/f′c están definidos en C.18.7.2 (C-B no los repite). Lo que NO es
 * texto de la norma se marca "(auxiliar)": el cálculo de εt de una sección rectangular simplemente armada, que se usa
 * solo para comparar el Apéndice C-B con el cuerpo del Capítulo C.10 / C.8.
 */
import {
  CB_COEF_OMEGA_MAX,
  CB_COEF_OMEGA_REDISTRIBUCION,
  CB_CONDICIONES_PHI_AXIAL,
  CB_FACTOR_DEFORMACION_MPA,
  CB_FACTOR_FISURACION,
  CB_FACTOR_RHO_MAX,
  CB_FACTOR_RHO_REDISTRIBUCION,
  CB_REDISTRIBUCION_BASE_PORCENTAJE,
} from '../../data/apendicesC';
import { ES_ACERO_MPA, beta1 } from './concreto';
import { phiPorCargaAxial, type TipoEstribo } from './resistenciaServicio';

/* ═════════════════════════ Cuantía balanceada y límites de ρ ═════════════════════════ */

/** Ec. C-B-1 (C-227): cuantía balanceada de una sección rectangular sin carga axial, ρb = (0.85 β1 f′c/fy)(600/(600 + fy)). */
export function rhoBalanceada(fc: number, fy: number): number {
  if (!(fc > 0) || !(fy > 0)) throw new RangeError('f′c y fy deben ser positivos');
  return ((0.85 * beta1(fc) * fc) / fy) * (CB_FACTOR_DEFORMACION_MPA / (CB_FACTOR_DEFORMACION_MPA + fy));
}

/** C-B.10.3.3 (C-227): ρ máxima = 0.75 ρb (sin refuerzo de compresión). */
export function rhoMaxima(fc: number, fy: number): number {
  return CB_FACTOR_RHO_MAX * rhoBalanceada(fc, fy);
}

/**
 * C-B.10.3.3 (C-227): con refuerzo de compresión, «la parte de ρb equilibrada por el refuerzo de compresión no necesita
 * reducirse por el factor 0.75». Lectura del autor: ρ máx = 0.75 ρb + ρ′ (supone que el refuerzo de compresión fluye;
 * con otro esfuerzo f′s habría que multiplicar ρ′ por f′s/fy, forma que la norma no escribe).
 */
export function rhoMaximaConCompresion(fc: number, fy: number, rhoPrima: number): number {
  if (!(rhoPrima >= 0)) throw new RangeError('ρ′ no puede ser negativa');
  return rhoMaxima(fc, fy) + rhoPrima;
}

/** Umbral de carga axial (kN) de C-B.10.3.3: la menor entre 0.10 f′c Ag y φPb (si se da). Ag en mm². */
export function umbralCargaAxial(fc: number, ag: number, phiPb?: number): number {
  const u = (0.1 * fc * ag) / 1000;
  return phiPb === undefined ? u : Math.min(u, phiPb);
}

/** C-B.10.3.3: el límite ρ ≤ 0.75 ρb solo rige mientras φPn sea menor que el umbral. */
export function aplicaLimiteRho(phiPn: number, fc: number, ag: number, phiPb?: number): boolean {
  return phiPn < umbralCargaAxial(fc, ag, phiPb) - 1e-9;
}

/* ═════════════════════════ Redistribución de momentos (no preesforzado) ═════════════════════════ */

export interface RedistribucionCB {
  rhoB: number;
  /** (ρ − ρ′) / ρb. */
  relacion: number;
  /** C-B.8.4.2: ρ ó ρ − ρ′ ≤ 0.50 ρb. */
  permitida: boolean;
  /** Reducción máxima 20 (1 − (ρ − ρ′)/ρb) (%). Es 0 cuando no se permite redistribuir. */
  porcentaje: number;
  /** Valor de la fórmula aunque la redistribución no se permita (para mostrar la comparación). */
  porcentajeFormula: number;
}

/**
 * C-B.8.4.1 y C-B.8.4.2 (C-227): reducción máxima permitida de los momentos elásticos y condición para redistribuir.
 * La norma no fija un tope superior de 20 % ni dice qué hacer si ρ′ > ρ; la fórmula se aplica tal cual.
 */
export function redistribucionMaximaCB(rho: number, rhoPrima: number, fc: number, fy: number): RedistribucionCB {
  if (!(rho >= 0) || !(rhoPrima >= 0)) throw new RangeError('ρ y ρ′ no pueden ser negativas');
  const rhoB = rhoBalanceada(fc, fy);
  const relacion = (rho - rhoPrima) / rhoB;
  const formula = CB_REDISTRIBUCION_BASE_PORCENTAJE * (1 - relacion);
  // «ρ ó ρ − ρ′ no sea mayor a 0.50 ρb»: se exige a ρ − ρ′ (el menor de los dos casos).
  const permitida = rho - rhoPrima <= CB_FACTOR_RHO_REDISTRIBUCION * rhoB + 1e-12;
  return { rhoB, relacion, permitida, porcentaje: permitida ? formula : 0, porcentajeFormula: formula };
}

/* ═════════════════════════ Preesforzado: índices ω y límites ═════════════════════════ */

/** ω = ρ fy / f′c, índice de refuerzo no preesforzado (definición de C.18.7.2; el símbolo está en C.2.1). */
export function omegaRefuerzo(rho: number, fy: number, fc: number): number {
  return (rho * fy) / fc;
}

/** C-B18.8.1 (C-228): ωp = ρp fps / f′c. */
export function omegaPreesfuerzo(rhoP: number, fps: number, fc: number): number {
  return (rhoP * fps) / fc;
}

/** Índice combinado de C-B18.8.1 y C-B18.10.4.1: ωp + (d/dp)(ω − ω′). Con ω y ω′ ya calculados (o los del alma, ωw y ω′w). */
export function indiceCombinado(omegaP: number, omega: number, omegaPrima: number, d: number, dp: number): number {
  if (!(d > 0) || !(dp > 0)) throw new RangeError('d y dp deben ser positivos');
  return omegaP + (d / dp) * (omega - omegaPrima);
}

export interface LimiteFlexionPreesforzado {
  beta1: number;
  /** 0.36 β1 (C-B18.8.1). */
  limite: number;
  cumple: boolean;
}

/** C-B18.8.1 (C-228): el índice (ωp, o el combinado, o el del alma) no debe superar 0.36 β1. */
export function verificarLimiteFlexionPreesforzado(indice: number, fc: number): LimiteFlexionPreesforzado {
  const b1 = beta1(fc);
  const limite = CB_COEF_OMEGA_MAX * b1;
  return { beta1: b1, limite, cumple: indice <= limite + 1e-12 };
}

export interface RedistribucionPreesforzado {
  beta1: number;
  /** 0.24 β1 (C-B18.10.4.2): máximo del índice para poder redistribuir. */
  limiteRedistribucion: number;
  permitida: boolean;
  /** Variación máxima (aumentar o disminuir) 20 [1 − índice/(0.36 β1)] (%) (C-B18.10.4.1); 0 si no se permite. */
  porcentaje: number;
  porcentajeFormula: number;
}

/**
 * C-B18.10.4.1 y C-B18.10.4.2 (C-228 y C-229): redistribución de momentos en elementos continuos preesforzados con
 * refuerzo adherido en los apoyos (C.18.9). Los momentos pueden aumentarse o disminuirse en no más de
 * 20 [1 − (ωp + (d/dp)(ω − ω′)) / (0.36 β1)] por ciento, y solo si el índice no excede 0.24 β1.
 */
export function redistribucionPreesforzado(indice: number, fc: number): RedistribucionPreesforzado {
  const b1 = beta1(fc);
  const formula = CB_REDISTRIBUCION_BASE_PORCENTAJE * (1 - indice / (CB_COEF_OMEGA_MAX * b1));
  const lim = CB_COEF_OMEGA_REDISTRIBUCION * b1;
  const permitida = indice <= lim + 1e-12;
  return { beta1: b1, limiteRedistribucion: lim, permitida, porcentaje: permitida ? formula : 0, porcentajeFormula: formula };
}

/** C-B18.8.3 (C-228): resistencia mínima = 1.2 × carga de fisuración (calculada con fr de C.9.5.2.3). Mismas unidades que `cargaFisuracion`. */
export function resistenciaMinimaFisuracion(cargaFisuracion: number): number {
  return CB_FACTOR_FISURACION * cargaFisuracion;
}

/* ═════════════════════════ φ alternativo por carga axial (C-B + C.9.3.2.2) ═════════════════════════ */

export interface EntradaPhiAxialCB {
  /** φPn de diseño (kN). */
  phiPn: number;
  fc: number;
  /** Área bruta (mm²). */
  ag: number;
  tipoEstribo?: TipoEstribo;
  fy: number;
  /** Refuerzo simétrico. */
  simetrico: boolean;
  /** (d − d′)/h (el PDF escribe (ds − d′)/h). */
  relDsMenosDPrimaSobreH: number;
  /** φPb (kN); requerido si el elemento no cumple las tres condiciones. */
  phiPb?: number;
}

export interface ResultadoPhiAxialCB {
  phi: number;
  /** El elemento cumple fy ≤ 420 MPa, refuerzo simétrico y (d − d′)/h ≥ 0.70. */
  cumpleCondiciones: boolean;
  /** Umbral de φPn usado: 0.10 f′c Ag (si cumple) o el menor entre 0.10 f′c Ag y φPb (kN). */
  umbral: number;
}

/**
 * φ con la alternativa por carga axial (C.9.3.2.2 con el Apéndice C-B; PDF p.370, C-68): φ aumenta linealmente hasta
 * 0.90 al decrecer φPn desde el umbral hasta cero. Si fy ≤ 420 MPa, el refuerzo es simétrico y (d − d′)/h ≥ 0.70, el umbral
 * es 0.10 f′c Ag; en otro caso es el menor entre 0.10 f′c Ag y φPb. Usa `phiPorCargaAxial` de resistenciaServicio.ts.
 */
export function phiAlternoPorCargaAxial(e: EntradaPhiAxialCB): ResultadoPhiAxialCB {
  const cumple =
    e.fy <= CB_CONDICIONES_PHI_AXIAL.fyMaxMPa &&
    e.simetrico &&
    e.relDsMenosDPrimaSobreH >= CB_CONDICIONES_PHI_AXIAL.relacionMinimaDsMenosDPrimaSobreH;
  if (!cumple && e.phiPb === undefined) throw new RangeError('el elemento no cumple las condiciones de la regla simplificada: se requiere φPb');
  const phiPb = cumple ? undefined : e.phiPb;
  return {
    phi: phiPorCargaAxial(e.phiPn, e.fc, e.ag, e.tipoEstribo ?? 'otro', phiPb),
    cumpleCondiciones: cumple,
    umbral: umbralCargaAxial(e.fc, e.ag, phiPb),
  };
}

/* ═════════════════════════ Comparación con el cuerpo del Título C (auxiliar) ═════════════════════════ */

/**
 * (auxiliar) Deformación εt (acero extremo en tracción, dt = d) de una sección rectangular simplemente armada con cuantía ρ,
 * con el bloque rectangular de C.10.2.7: a = ρ fy d/(0.85 f′c), c = a/β1, εt = 0.003 (d − c)/c.
 */
export function epsilonTDesdeRho(rho: number, fc: number, fy: number): number {
  const c = (rho * fy) / (0.85 * beta1(fc) * fc); // c/d
  if (!(c > 0)) return Infinity;
  return (0.003 * (1 - c)) / c;
}

/** (auxiliar) Inversa de `epsilonTDesdeRho`: la ρ que produce una εt dada en una sección rectangular simplemente armada. */
export function rhoDesdeEpsilonT(epsT: number, fc: number, fy: number): number {
  if (!(epsT >= 0)) throw new RangeError('εt no puede ser negativa');
  return ((0.85 * beta1(fc) * fc) / fy) * (0.003 / (0.003 + epsT));
}

/** (auxiliar) εt en condición balanceada = fy/Es; con ella `rhoDesdeEpsilonT` reproduce la Ec. C-B-1 (comprobación de la constante 600). */
export const epsilonBalanceada = (fy: number): number => fy / ES_ACERO_MPA;
