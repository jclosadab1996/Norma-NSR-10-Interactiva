/**
 * Título C — Capítulo C.17: Elementos compuestos concreto-concreto sometidos a flexión (PDF p.453–454, C-151/152).
 *
 * Cortante horizontal en la interfaz (C.17.5), Ec. C.17-1 y límites C.17.5.3.1 a C.17.5.3.4, y estribos de C.17.6.
 * Unidades: N, mm, MPa. Los esfuerzos 0.55, 1.8, 0.6, 3.5 de la norma se aplican con bv, d en mm y resultan en N (1 MPa = 1 N/mm²).
 */
import { raizFc } from './preesforzado';

/** φ del cortante: 0.75 (C.9.3.2.3). La Ec. C.17-1 usa el φ de cortante del Capítulo C.9. */
export const PHI_CORTANTE = 0.75;

/** C.17.5.3.1 y C.17.5.3.2 (C-152): Vnh ≤ 0.55 bv d (N, con MPa y mm). */
export const COEF_VNH_SIMPLE_MPA = 0.55;
/** C.17.5.3.3 (C-152): (1.8 + 0.6 ρv fy) λ bv d. */
export const COEF_VNH_BASE_MPA = 1.8;
export const COEF_VNH_RHO_FY = 0.6;
/** C.17.5.3.3 y C.17.5.3.4 (C-152): tope 3.5 bv d. */
export const COEF_VNH_MAX_MPA = 3.5;
/** C.17.5.2 (C-152): d no menor que 0.8h en elementos preesforzados. */
export const D_MIN_FRACCION_H_PREESFORZADO = 0.8;
/** C.17.6.1 (C-152): separación de estribos ≤ 4 veces la dimensión menor del elemento soportado y ≤ 600 mm. */
export const ESTRIBOS_SEPARACION_FRACCION_DIM = 4;
export const ESTRIBOS_SEPARACION_MAX_MM = 600;
/** C.17.5.3.3 (C-152): amplitud de la rugosidad intencional de la superficie, aproximadamente 6 mm. */
export const RUGOSIDAD_MM = 6;

/** Condición de la superficie de contacto y de los estribos que define el límite de Vnh (C.17.5.3). */
export type CasoInterfaz =
  /** C.17.5.3.1: limpia, libre de lechada, rugosa intencionalmente (estribos no exigidos por este numeral). */
  | 'rugosa'
  /** C.17.5.3.2: estribos mínimos de C.17.6, superficie limpia y libre de lechada, NO rugosa. */
  | 'lisa-con-estribos-minimos'
  /** C.17.5.3.3: estribos mínimos de C.17.6 y superficie limpia, libre de lechada y rugosa con amplitud ≈ 6 mm. */
  | 'rugosa-con-estribos';

/** d efectiva para cortante horizontal (C.17.5.2): distancia de la fibra comprimida de la sección compuesta al centroide del refuerzo de tracción; en preesforzados no menor que 0.8h. */
export function dCortanteHorizontal(d: number, h: number, preesforzado: boolean): number {
  return preesforzado ? Math.max(d, D_MIN_FRACCION_H_PREESFORZADO * h) : d;
}

export type EntradaVnh = {
  caso: CasoInterfaz;
  /** Ancho de la superficie de contacto (mm). */
  bv: number;
  /** d (mm), ya ajustada según C.17.5.2. */
  d: number;
  /** ρv = Av / (bv s); solo para el caso 'rugosa-con-estribos'. */
  rhoV?: number;
  /** fy de los estribos (MPa); solo para 'rugosa-con-estribos'. */
  fy?: number;
  /** λ de concreto liviano (C.11.6.4.3; 1.0 en concreto de peso normal). */
  lambda?: number;
};

export type ResultadoVnh = {
  /** Vnh por la expresión (sin tope) en N. */
  vnhSinTope: number;
  /** Vnh máximo permitido por el caso (N). */
  vnh: number;
  /** Tope 3.5 bv d (N). */
  tope: number;
  /** φVnh (N). */
  phiVnh: number;
  /** ¿Gobernó el tope de 3.5 bv d? */
  gobiernaTope: boolean;
  /** Esfuerzo nominal de cortante horizontal Vnh/(bv d) (MPa). */
  esfuerzoNominal: number;
};

/** Resistencia nominal al cortante horizontal Vnh según C.17.5.3.1 a C.17.5.3.3 (C-152), en N. */
export function resistenciaCortanteHorizontal(e: EntradaVnh): ResultadoVnh {
  if (!(e.bv > 0) || !(e.d > 0)) throw new RangeError('bv y d deben ser positivos');
  const area = e.bv * e.d;
  const tope = COEF_VNH_MAX_MPA * area;
  let sinTope: number;
  if (e.caso === 'rugosa-con-estribos') {
    if (e.rhoV === undefined || e.fy === undefined) throw new RangeError('se requieren ρv y fy en el caso con estribos y rugosidad');
    const lam = e.lambda ?? 1;
    sinTope = (COEF_VNH_BASE_MPA + COEF_VNH_RHO_FY * e.rhoV * e.fy) * lam * area;
  } else {
    sinTope = COEF_VNH_SIMPLE_MPA * area;
  }
  const vnh = Math.min(sinTope, tope);
  return { vnhSinTope: sinTope, vnh, tope, phiVnh: PHI_CORTANTE * vnh, gobiernaTope: sinTope > tope, esfuerzoNominal: vnh / area };
}

export type ResultadoVerificacionVnh = ResultadoVnh & {
  vu: number;
  cumple: boolean;
  /** Relación demanda/capacidad Vu / φVnh. */
  relacion: number;
  /** C.17.5.3.4: Vu > φ(3.5 bv d) obliga a diseñar con cortante por fricción (C.11.6.4). */
  requiereC1164: boolean;
};

/** Ec. C.17-1 (C-152): Vu ≤ φ Vnh (Vu en N). */
export function verificarCortanteHorizontal(e: EntradaVnh & { vu: number }): ResultadoVerificacionVnh {
  const r = resistenciaCortanteHorizontal(e);
  const requiereC1164 = e.vu > PHI_CORTANTE * r.tope;
  return { ...r, vu: e.vu, cumple: e.vu <= r.phiVnh, relacion: e.vu / r.phiVnh, requiereC1164 };
}

/** ρv = Av / (bv s) (C.17.5.3.3). Av en mm², bv y s en mm. */
export const rhoEstribosInterfaz = (av: number, bv: number, s: number): number => av / (bv * s);

/**
 * Av,min por C.11.4.6.3 (C.11-13), a la que remite C.17.6.1: 0.062√f′c bw s / fyt, no menos que 0.35 bw s / fyt (mm²).
 * Aquí bw = bv de la interfaz (el texto de C.17.6.1 solo dice que el área no debe ser menor que la de C.11.4.6.3).
 */
export function avMinimoC11463(fc: number, bw: number, s: number, fyt: number): { porRaiz: number; porMinimo: number; avMin: number } {
  const porRaiz = (0.062 * raizFc(fc) * bw * s) / fyt;
  const porMinimo = (0.35 * bw * s) / fyt;
  return { porRaiz, porMinimo, avMin: Math.max(porRaiz, porMinimo) };
}

/** Separación máxima de estribos de cortante horizontal (C.17.6.1): min(4 × dimensión menor del elemento soportado, 600 mm). */
export function separacionMaximaEstribosInterfaz(dimensionMenorSoportada: number): number {
  return Math.min(ESTRIBOS_SEPARACION_FRACCION_DIM * dimensionMenorSoportada, ESTRIBOS_SEPARACION_MAX_MM);
}

/**
 * Separación necesaria s (mm) de estribos de área Av (mm²) para que φVnh ≥ Vu en el caso 'rugosa-con-estribos' (auxiliar:
 * despeje de C.17.5.3.3 con ρv = Av/(bv s)). Devuelve Infinity si el límite 3.5 bv d no alcanza y null si Vu > φ(3.5 bv d).
 */
export function separacionRequeridaInterfaz(e: { vu: number; bv: number; d: number; av: number; fy: number; lambda?: number }): number | null {
  const area = e.bv * e.d;
  if (e.vu > PHI_CORTANTE * COEF_VNH_MAX_MPA * area) return null;
  const lam = e.lambda ?? 1;
  const vnhNecesario = e.vu / PHI_CORTANTE;
  // (1.8 + 0.6 ρv fy) λ bv d ≥ Vnh  →  ρv ≥ (Vnh/(λ bv d) − 1.8) / (0.6 fy)
  const rhoNecesaria = (vnhNecesario / (lam * area) - COEF_VNH_BASE_MPA) / (COEF_VNH_RHO_FY * e.fy);
  if (rhoNecesaria <= 0) return Infinity;
  return e.av / (e.bv * rhoNecesaria);
}
