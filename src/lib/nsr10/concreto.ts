/**
 * Propiedades básicas del concreto estructural (Título C de la NSR-10). Unidades del SI: MPa, kg/m³.
 * Base compartida por los capítulos y calculadoras del Título C; PDF = página impresa "C-n" + 302.
 */

/** Módulo de elasticidad del acero de refuerzo no preesforzado, Es = 200 000 MPa (C.8.5.2, PDF p.364, C-62). */
export const ES_ACERO_MPA = 200_000;

/** Límite de √f′c en el Capítulo C.11: no debe exceder 8.3 MPa (C.11.1.2, PDF p.389). */
export const RAIZ_FC_MAX_CORTANTE_MPA = 8.3;

/** Intervalo de densidades de la ecuación general de Ec (C.8.5.1), kg/m³. */
export const WC_MIN = 1440;
export const WC_MAX = 2560;

/**
 * Factor β1 del bloque rectangular equivalente (C.10.2.7.3, PDF p.377 / C-75).
 * 0.85 para f′c ≤ 28 MPa; luego disminuye 0.05 por cada 7 MPa sobre 28 MPa, sin bajar de 0.65.
 */
export function beta1(fc: number): number {
  if (fc <= 28) return 0.85;
  return Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
}

/**
 * Módulo de elasticidad del concreto Ec en MPa (C.8.5.1, PDF p.364 / C-62):
 * Ec = wc^1.5 · 0.043 · √f′c para 1440 ≤ wc ≤ 2560 kg/m³; para concreto de densidad normal Ec = 4700 √f′c.
 * Sin `wc` se usa la expresión de densidad normal.
 */
export function moduloElasticidad(fc: number, wc?: number): number {
  if (wc === undefined) return 4700 * Math.sqrt(fc);
  if (wc < WC_MIN || wc > WC_MAX) throw new RangeError(`wc debe estar entre ${WC_MIN} y ${WC_MAX} kg/m³`);
  return wc ** 1.5 * 0.043 * Math.sqrt(fc);
}

/** Módulo de rotura fr = 0.62 λ √f′c, en MPa (Ec. C.9-10, C.9.5.2.3, PDF p.372). */
export function moduloRotura(fc: number, lambda = 1): number {
  return 0.62 * lambda * Math.sqrt(fc);
}

/** Tipos de concreto para el factor λ (C.8.6.1, PDF p.364). */
export type TipoConcreto = 'normal' | 'liviano-arena-normal' | 'liviano-otros';

/** λ = 1.0 (peso normal), 0.85 (liviano con arena de peso normal), 0.75 (otros livianos). */
export function lambdaConcreto(tipo: TipoConcreto): number {
  return tipo === 'normal' ? 1 : tipo === 'liviano-arena-normal' ? 0.85 : 0.75;
}

/** λ = fct / (0.56 √f′c) ≤ 1.0 cuando se especifica la resistencia a tracción por hendimiento fct (C.8.6.1). */
export function lambdaPorHendimiento(fct: number, fc: number): number {
  return Math.min(1, fct / (0.56 * Math.sqrt(fc)));
}

/** √f′c limitada a 8.3 MPa para los cálculos de cortante y torsión (C.11.1.2). */
export function raizFcCortante(fc: number): number {
  return Math.min(Math.sqrt(fc), RAIZ_FC_MAX_CORTANTE_MPA);
}
