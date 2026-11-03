import { G } from './fuerzaHorizontal';

/**
 * Capítulo A.7 (apoyado en el Apéndice A-2) — Interacción suelo-estructura, método de la fuerza
 * horizontal equivalente. Unidades coherentes del SI: masas en kg, rigideces en N/m y N·m/rad,
 * alturas en m, períodos en s, fuerzas en N.
 *
 * Las ecuaciones provienen del Apéndice A-2 (A-2-1 a A-2-4, A-2-9, A-2-11); el Capítulo A.7 solo
 * fija los criterios (A.7.3.4: piso del cortante, A.7.3.5: valores máximos y mínimos).
 */

/** A-2.0 — masa participante M̄ = 0.7·M (edificio de varios pisos). */
export function masaParticipante(masaTotal: number): number {
  return 0.7 * masaTotal;
}

/** A-2.0 — altura efectiva h̄ = 0.7·hn (edificio de varios pisos). */
export function alturaEfectiva(hn: number): number {
  return 0.7 * hn;
}

/** A-2-4 — rigidez de la estructura empotrada: k̄ = 4π²·M̄/T². */
export function rigidezEmpotrada(masaParticipanteKg: number, t: number): number {
  return (4 * Math.PI * Math.PI * masaParticipanteKg) / (t * t);
}

/** A-2-3 — período efectivo: T̄ = T·√(1 + (k̄/Ky)·(1 + Ky·h̄²/Kθ)). */
export function periodoEfectivoISE(t: number, kBarra: number, ky: number, ktheta: number, hBarra: number): number {
  return t * Math.sqrt(1 + (kBarra / ky) * (1 + (ky * hBarra * hBarra) / ktheta));
}

/** A-2-9 — amortiguamiento efectivo β̄ = βo + 0.05/(T̄/T)³, limitado a 0.05 ≤ β̄ ≤ 0.20. */
export function amortiguamientoEfectivo(beta0: number, tEfectivo: number, t: number): number {
  const beta = beta0 + 0.05 / Math.pow(tEfectivo / t, 3);
  return Math.min(0.2, Math.max(0.05, beta));
}

/**
 * A-2-2 — reducción del cortante basal: ΔVs = [Sa − S̄a·(0.05/β̄)^0.4]·g·M̄ (en N).
 * `saEmpotrado` = Sa(T), `saEfectivo` = Sa(T̄), ambos como fracción de g.
 */
export function reduccionCortanteISE(
  saEmpotrado: number,
  saEfectivo: number,
  betaBarra: number,
  masaParticipanteKg: number,
): number {
  return (saEmpotrado - saEfectivo * Math.pow(0.05 / betaBarra, 0.4)) * G * masaParticipanteKg;
}

export type CortanteConISE = {
  /** Vs sin interacción (base empotrada). */
  vs: number;
  /** ΔVs de A-2-2. */
  deltaVs: number;
  /** V̄s = Vs − ΔVs (A-2-1). */
  vsReducido: number;
  /** Piso de A.7.3.4: Vs′ con período CuTa (el mismo que usa el Apéndice A-2 con el factor 0.7). */
  vsPrima: number;
  /** Cortante de diseño con el criterio de A.7.3.4: máx(V̄s, Vs′). */
  vsDiseno: number;
  /** Piso del Apéndice A-2.2.1: 0.7·Vs′. */
  pisoApendice: number;
  /** `true` si el piso de A.7.3.4 impide parte de la reducción. */
  gobiernaPiso: boolean;
};

/**
 * Cortante basal de diseño con interacción suelo-estructura aplicando el piso de A.7.3.4.
 * Si no hay reducción (ΔVs ≤ 0) se conserva Vs: A.7.3.4 obliga a diseñar para el cortante mayor
 * cuando la interacción lo aumenta.
 */
export function cortanteConISE(vs: number, deltaVs: number, vsPrima: number): CortanteConISE {
  const vsReducido = vs - deltaVs;
  // Aumento (ΔVs ≤ 0): se diseña para el cortante mayor. Disminución: no menos que Vs′ (sin superar Vs).
  const vsDiseno = deltaVs <= 0 ? vsReducido : Math.min(vs, Math.max(vsReducido, vsPrima));
  return {
    vs,
    deltaVs,
    vsReducido,
    vsPrima,
    vsDiseno,
    pisoApendice: 0.7 * vsPrima,
    gobiernaPiso: vsReducido < vsPrima && deltaVs > 0,
  };
}

/**
 * A-2-11 — deriva modificada de un piso: Δ̄ = (V̄s/Vs)·(Δ + Mo·hpi/Kθ), con Mo el momento de vuelco
 * sin reducción por interacción y hpi la altura del piso. Es el incremento por cabeceo de la base
 * (rotación Mo/Kθ por la altura del piso) más la deriva de base empotrada, escalados por V̄s/Vs.
 * Devuelve la deriva modificada en las unidades de `deriva`/`hpi`.
 */
export function derivaConISE(
  deriva: number,
  hpi: number,
  momentoVuelco: number,
  ktheta: number,
  vsReducido: number,
  vs: number,
): { derivaModificada: number; incrementoPorCabeceo: number } {
  const incrementoPorCabeceo = (momentoVuelco * hpi) / ktheta;
  return {
    derivaModificada: (vsReducido / vs) * (deriva + incrementoPorCabeceo),
    incrementoPorCabeceo,
  };
}
