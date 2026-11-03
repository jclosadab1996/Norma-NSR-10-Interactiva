/** A.2.6 — Espectro elástico de diseño (5 % de amortiguamiento crítico). */
export type ParametrosEspectro = {
  aa: number;
  av: number;
  fa: number;
  fv: number;
  /** Coeficiente de importancia I (A.2.5). */
  i: number;
};

export type PeriodosEspectro = {
  /** T0 = 0.1·Av·Fv / (Aa·Fa) — ecuación A.2.6-6 */
  t0: number;
  /** TC = 0.48·Av·Fv / (Aa·Fa) — ecuación A.2.6-2 */
  tc: number;
  /** TL = 2.4·Fv — ecuación A.2.6-4 */
  tl: number;
};

export function periodosEspectro(p: Pick<ParametrosEspectro, 'aa' | 'av' | 'fa' | 'fv'>): PeriodosEspectro {
  const razon = (p.av * p.fv) / (p.aa * p.fa);
  return { t0: 0.1 * razon, tc: 0.48 * razon, tl: 2.4 * p.fv };
}

/** Meseta del espectro: Sa = 2.5·Aa·Fa·I (A.2.6-3). */
export function mesetaSa(p: ParametrosEspectro): number {
  return 2.5 * p.aa * p.fa * p.i;
}

export type OpcionesSa = {
  /**
   * Si es `true`, para T < T0 se aplica la rama ascendente A.2.6-7
   * (solo permitida en análisis dinámico para modos diferentes al fundamental, A.2.6.1.3).
   */
  ramaInicialT0?: boolean;
};

/**
 * Sa(T) como fracción de g.
 *  - T ≤ TC: Sa = 2.5·Aa·Fa·I                              (A.2.6-3)
 *  - TC < T ≤ TL: Sa = 1.2·Av·Fv·I / T                      (A.2.6-1)
 *  - T > TL: Sa = 1.2·Av·Fv·TL·I / T²                       (A.2.6-5)
 *  - (opcional) T < T0: Sa = 2.5·Aa·Fa·I·(0.4 + 0.6·T/T0)   (A.2.6-7)
 */
export function sa(t: number, p: ParametrosEspectro, opciones: OpcionesSa = {}): number {
  const { t0, tc, tl } = periodosEspectro(p);
  const meseta = mesetaSa(p);
  if (opciones.ramaInicialT0 && t < t0) {
    return meseta * (0.4 + (0.6 * t) / t0);
  }
  if (t <= tc) return meseta;
  if (t <= tl) return (1.2 * p.av * p.fv * p.i) / t;
  return (1.2 * p.av * p.fv * tl * p.i) / (t * t);
}

/** Sv(T) en m/s (A.2.6-8 a A.2.6-10). */
export function sv(t: number, p: ParametrosEspectro): number {
  const { tc, tl } = periodosEspectro(p);
  if (t <= tc) return 3.9 * p.aa * p.fa * p.i * t;
  if (t <= tl) return 1.87 * p.av * p.fv * p.i;
  return (1.87 * p.av * p.fv * p.i * tl) / t;
}

/** Sd(T) en m (A.2.6-12 a A.2.6-14). */
export function sd(t: number, p: ParametrosEspectro): number {
  const { tc, tl } = periodosEspectro(p);
  if (t <= tc) return 0.62 * p.aa * p.fa * p.i * t * t;
  if (t <= tl) return 0.3 * p.av * p.fv * p.i * t;
  return 0.3 * p.av * p.fv * p.i * tl;
}

/** Genera puntos (T, Sa) para graficar el espectro entre 0 y `tMax` s. */
export function curvaEspectro(
  p: ParametrosEspectro,
  tMax = 4,
  pasos = 200,
  opciones: OpcionesSa = {},
): Array<{ t: number; sa: number }> {
  const { t0, tc, tl } = periodosEspectro(p);
  const ts = new Set<number>();
  for (let k = 0; k <= pasos; k++) ts.add((k / pasos) * tMax);
  // Incluir exactamente los puntos de quiebre para que el gráfico no los "redondee".
  for (const q of [t0, tc, tl]) if (q > 0 && q < tMax) ts.add(q);
  return [...ts]
    .sort((a, b) => a - b)
    .map((t) => ({ t, sa: sa(t, p, opciones) }));
}
