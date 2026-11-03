/**
 * A.3.3.3 — Coeficiente de capacidad de disipación de energía para diseño:
 *   R = φa·φp·φr·R0
 * φa = reducción por irregularidad en altura, φp = por irregularidad en planta,
 * φr = por ausencia de redundancia.
 */
export function coeficienteR(r0: number, phiA = 1, phiP = 1, phiR = 1): number {
  return phiA * phiP * phiR * r0;
}

/** Los efectos sísmicos elásticos se dividen por R para obtener los de diseño (A.3.7.1). */
export function fuerzaReducida(elastica: number, r: number): number {
  return elastica / r;
}
