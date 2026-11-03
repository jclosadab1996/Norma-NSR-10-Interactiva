import { TABLA_CT_ALFA, type SistemaPeriodo } from '../../data/tablas';

/** A.4.2.2 — Período aproximado Ta = Ct·hn^α (ecuación A.4.2-3). hn en m. */
export function periodoAproximado(sistema: SistemaPeriodo, hn: number): number {
  const { ct, alpha } = TABLA_CT_ALFA[sistema];
  return ct * Math.pow(hn, alpha);
}

/** Ta = Ct·hn^α con Ct y α arbitrarios (p. ej. los de muros calculados con Cw). */
export function periodoAproximadoCtAlpha(ct: number, alpha: number, hn: number): number {
  return ct * Math.pow(hn, alpha);
}

export type MuroCw = {
  /** Awi: área mínima de cortante del muro i en el primer nivel (m²). */
  awi: number;
  /** hwi: altura del muro i medida desde la base (m). */
  hwi: number;
  /** ℓwi: longitud horizontal del muro i en el primer nivel (m). */
  lwi: number;
};

/**
 * A.4.2-4 — Cw = (100/AB)·Σ[(hn/hwi)²·Awi / (1 + 0.83·(hwi/ℓwi)²)].
 * AB en m² (área de la base), hn en m.
 */
export function coeficienteCw(muros: readonly MuroCw[], ab: number, hn: number): number {
  const suma = muros.reduce(
    (s, m) => s + ((hn / m.hwi) ** 2 * m.awi) / (1 + 0.83 * (m.hwi / m.lwi) ** 2),
    0,
  );
  return (100 / ab) * suma;
}

/** Tabla A.4.2-1 (alternativa para muros): Ct = 0.0062/√Cw, α = 1.00. */
export function ctMuros(cw: number): { ct: number; alpha: number } {
  return { ct: 0.0062 / Math.sqrt(cw), alpha: 1.0 };
}

/** A.4.2-5 — Ta = 0.1·N (pórticos de concreto o acero, ≤ 12 pisos y hp ≤ 3 m). */
export function periodoPorPisos(n: number): number {
  return 0.1 * n;
}

/** A.4.2-2 — Cu = 1.75 − 1.2·Av·Fv, pero no menor de 1.2. */
export function coeficienteCu(av: number, fv: number): number {
  return Math.max(1.2, 1.75 - 1.2 * av * fv);
}

/** A.4.2.1 — Período máximo permisible: T ≤ Cu·Ta. */
export function periodoMaximo(av: number, fv: number, ta: number): number {
  return coeficienteCu(av, fv) * ta;
}

/** A.4.3.2 — Exponente k relacionado con el período fundamental. */
export function exponenteK(t: number): number {
  if (t <= 0.5) return 1.0;
  if (t <= 2.5) return 0.75 + 0.5 * t;
  return 2.0;
}
