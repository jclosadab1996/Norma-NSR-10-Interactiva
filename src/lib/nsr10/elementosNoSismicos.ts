import { G } from './fuerzaHorizontal';

/**
 * Capítulo A.8 — Elementos estructurales que no hacen parte del sistema de resistencia sísmica.
 * La misma distribución de aceleraciones en altura (A.8.2-1 = A.9.4-2) la usa el Capítulo A.9,
 * por eso se exporta desde aquí.
 */

/** Altura equivalente del sistema de un grado de libertad: heq ≈ 0.75·hn (A.8.2.1.1 / A.9.4.2.1). */
export function alturaEquivalente(hn: number): number {
  return 0.75 * hn;
}

/**
 * As — aceleración máxima en la superficie del suelo, "estimada como la aceleración espectral
 * correspondiente a un período de vibración igual a cero" (A.8.0, A.9.0).
 *
 * El texto no da una fórmula explícita. Evaluando la rama ascendente del espectro (A.2.6-7,
 * Sa = 2.5·Aa·Fa·I·(0.4 + 0.6·T/T0)) en T = 0 resulta As = 0.4·2.5·Aa·Fa·I = Aa·Fa·I.
 * (Interpretación; ver la nota de anomalías del capítulo A.8.)
 */
export function aceleracionSuperficie(aa: number, fa: number, i: number): number {
  return aa * fa * i;
}

export type ParametrosAceleracionNivel = {
  /** As: aceleración en la superficie (fracción de g). */
  as: number;
  /** Sa de diseño (fracción de g) para el período fundamental; el mayor de las dos direcciones. */
  sa: number;
  /** Altura de la cubierta hn (m), medida desde la base. */
  hn: number;
  /** Altura equivalente heq (m). Por defecto 0.75·hn. */
  heq?: number;
};

/**
 * Aceleración horizontal ai (o ax) sobre el elemento, como fracción de g (A.8.2-1 = A.9.4-2):
 *  - hi ≤ heq: ai = As + (Sa − As)·hi/heq
 *  - hi ≥ heq: ai = Sa·hi/heq
 * Ambas ramas coinciden en hi = heq (ai = Sa).
 */
export function aceleracionNivel(h: number, p: ParametrosAceleracionNivel): number {
  const heq = p.heq ?? alturaEquivalente(p.hn);
  if (h <= heq) return p.as + ((p.sa - p.as) * h) / heq;
  return (p.sa * h) / heq;
}

/**
 * Fuerza sísmica horizontal reducida sobre un elemento estructural que no hace parte del sistema
 * de resistencia sísmica (A.8.2-2): Fp = (ax·g/R0)·Mp. `mp` en kg → resultado en N.
 */
export function fuerzaElementoNoSismico(ax: number, mp: number, r0: number): number {
  return (ax * G * mp) / r0;
}

/** Fuerza por unidad de masa expresada como fracción del peso: ax / R0 (Fp = (ax/R0)·Mp·g). */
export function coeficienteFuerzaNoSismico(ax: number, r0: number): number {
  return ax / r0;
}

/**
 * Deformación mínima que debe acomodar el elemento (A.8.3.1): la deriva máxima de diseño del
 * Capítulo A.6 por la altura entre los dos puntos de apoyo. `derivaRazon` es Δ/hpi (p. ej. 0.01 = 1 %).
 * Devuelve el desplazamiento relativo en las mismas unidades de `alturaPiso`.
 */
export function deformacionImpuesta(derivaRazon: number, alturaPiso: number): number {
  return derivaRazon * alturaPiso;
}
