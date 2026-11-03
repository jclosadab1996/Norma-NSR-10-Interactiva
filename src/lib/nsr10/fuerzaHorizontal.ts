import { exponenteK } from './periodo';

/** Aceleración de la gravedad usada por el Reglamento (A.4.0): 9.8 m/s². */
export const G = 9.8;

export type NivelEdificio = {
  /** Altura hi desde la base (m). */
  h: number;
  /** Masa mi del nivel (kg). */
  m: number;
};

/** A.4.3-1 — Vs = Sa·g·M. La masa M debe estar en kg; el resultado queda en N. */
export function cortanteBasal(sa: number, masaTotalKg: number): number {
  return sa * G * masaTotalKg;
}

export type ResultadoNivel = NivelEdificio & {
  /** Producto mi·hi^k */
  mhk: number;
  /** Coeficiente Cvx (A.4.3-3) */
  cvx: number;
  /** Fuerza horizontal Fx = Cvx·Vs (A.4.3-2), en N */
  fx: number;
  /** Cortante acumulado de piso (suma de Fx de este nivel hacia arriba), en N */
  cortantePiso: number;
};

/**
 * A.4.3 — Distribución del cortante basal en la altura.
 * `niveles` debe venir ordenado de abajo hacia arriba (piso 1 … piso n).
 */
export function distribuirFuerzas(niveles: readonly NivelEdificio[], vs: number, t: number): ResultadoNivel[] {
  const k = exponenteK(t);
  const mhk = niveles.map((n) => n.m * Math.pow(n.h, k));
  const total = mhk.reduce((a, b) => a + b, 0);
  const base: ResultadoNivel[] = niveles.map((n, i) => {
    const cvx = mhk[i] / total;
    return { ...n, mhk: mhk[i], cvx, fx: cvx * vs, cortantePiso: 0 };
  });
  let acumulado = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    acumulado += base[i].fx;
    base[i].cortantePiso = acumulado;
  }
  return base;
}
