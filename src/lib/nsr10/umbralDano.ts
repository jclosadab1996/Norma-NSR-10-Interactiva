/** A.12.3 — Espectro sísmico del umbral de daño (2 % de amortiguamiento). */
export type ParametrosUmbral = {
  /** Ad: aceleración pico efectiva del umbral de daño (A.12.2). */
  ad: number;
  /** Fv calculado con Av = Ad (A.12.3.1). */
  fv: number;
};

/** S = 1.25·Fv (A.12.3.1). */
export function parametroS(fv: number): number {
  return 1.25 * fv;
}

export function periodosUmbral(fv: number): { tcd: number; tld: number } {
  const s = parametroS(fv);
  return { tcd: 0.5 * s, tld: 2.4 * s };
}

/** Sad(T) como fracción de g (A.12.3-1 a A.12.3-6). */
export function sad(t: number, p: ParametrosUmbral): number {
  const s = parametroS(p.fv);
  const { tcd, tld } = periodosUmbral(p.fv);
  if (t < 0.25) return p.ad * (1 + 8 * t); // A.12.3-2
  if (t <= tcd) return 3.0 * p.ad; // A.12.3-4
  if (t <= tld) return (1.5 * p.ad * s) / t; // A.12.3-1
  return (1.5 * p.ad * s * tld) / (t * t); // A.12.3-6
}
