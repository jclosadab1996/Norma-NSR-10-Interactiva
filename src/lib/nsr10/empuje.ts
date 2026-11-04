/**
 * Capítulo B.5 — Empuje de tierra y presión hidrostática.
 *
 * La NSR-10 (B.5, PDF p.238, B-19) NO da valores numéricos de los coeficientes de empuje: el coeficiente
 * (activo, en reposo o mayor) lo elige el ingeniero geotecnista (B.5.1.2) y los requisitos de cálculo
 * están en el Título H. Lo que sí exige B.5.1.1 es:
 *  - incluir las cargas vivas y muertas que puedan actuar sobre el suelo adyacente (sobrecarga q), y
 *  - bajo el nivel freático, calcular el empuje con el peso del suelo SUMERGIDO más la TOTALIDAD de la
 *    presión hidrostática.
 * Aquí se aplica ese enunciado con la mecánica de suelos elemental: σh = K·σ'v + u, con σ'v = q + Σ γ·Δz
 * (γ' = γsat − γw bajo el nivel freático). K es un dato de entrada.
 *
 * B.5.2: la presión ascendente en losas de piso de sótano es la presión hidrostática total medida desde
 * el nivel freático: u = γw·h.
 */
import { GAMMA_AGUA_DULCE } from './cargasVivas';

export type ParametrosEmpuje = {
  /** Altura de muro enterrado H (m), desde la superficie del terreno hasta la base. */
  alturaM: number;
  /** Coeficiente de empuje K (activo, en reposo o intermedio) definido por el geotecnista (B.5.1.2). */
  k: number;
  /** Peso unitario del suelo sobre el nivel freático (kN/m³). */
  gamma: number;
  /** Peso unitario saturado del suelo bajo el nivel freático (kN/m³). */
  gammaSat: number;
  /** Profundidad del nivel freático desde la superficie (m); `null` si no hay nivel freático en el muro. */
  nivelFreaticoM: number | null;
  /** Sobrecarga uniforme q en la superficie, viva + muerta (kN/m²). */
  sobrecarga: number;
  /** Peso unitario del agua (kN/m³); por defecto 9.8 (Tabla B.3.2-1: 1 000 kg/m³ · 9.8 m/s²). */
  gammaW?: number;
};

/** Peso unitario sumergido γ' = γsat − γw (kN/m³). */
export function gammaSumergido(gammaSat: number, gammaW = GAMMA_AGUA_DULCE): number {
  return gammaSat - gammaW;
}

/** Profundidad efectiva del nivel freático dentro del muro: 0 ≤ zw ≤ H, o `null` si no hay agua. */
function zwEfectivo(p: ParametrosEmpuje): number | null {
  if (p.nivelFreaticoM === null || !Number.isFinite(p.nivelFreaticoM)) return null;
  if (p.nivelFreaticoM >= p.alturaM) return null;
  return Math.max(0, p.nivelFreaticoM);
}

export type PresionesEnProfundidad = {
  z: number;
  /** Tensión vertical efectiva σ'v (kPa), incluida la sobrecarga. */
  sigmaVEfectiva: number;
  /** Parte del empuje por sobrecarga: K·q (kPa). */
  porSobrecarga: number;
  /** Parte del empuje por el peso del suelo (sumergido bajo el N. F.): K·γ·z (kPa). */
  porSuelo: number;
  /** Presión hidrostática u = γw·(z − zw) (kPa). */
  hidrostatica: number;
  /** Empuje efectivo del suelo (sobrecarga + peso del suelo): K·σ'v. */
  empujeSuelo: number;
  /** Empuje total sobre el muro: K·σ'v + u. */
  total: number;
};

/** Presiones horizontales a la profundidad z (m) desde la superficie. */
export function presionesEnProfundidad(z: number, p: ParametrosEmpuje): PresionesEnProfundidad {
  const gw = p.gammaW ?? GAMMA_AGUA_DULCE;
  const zw = zwEfectivo(p);
  const gSum = gammaSumergido(p.gammaSat, gw);
  const sobreN = zw === null ? z : Math.min(z, zw);
  const bajoN = zw === null ? 0 : Math.max(0, z - zw);
  const pesoSuelo = p.gamma * sobreN + gSum * bajoN;
  const porSobrecarga = p.k * p.sobrecarga;
  const porSuelo = p.k * pesoSuelo;
  const hidrostatica = gw * bajoN;
  return {
    z,
    sigmaVEfectiva: p.sobrecarga + pesoSuelo,
    porSobrecarga,
    porSuelo,
    hidrostatica,
    empujeSuelo: porSobrecarga + porSuelo,
    total: porSobrecarga + porSuelo + hidrostatica,
  };
}

/** Profundidades donde cambia la pendiente del diagrama: 0, el nivel freático (si está en el muro) y H. */
export function puntosCriticos(p: ParametrosEmpuje): number[] {
  const zw = zwEfectivo(p);
  return zw !== null && zw > 0 ? [0, zw, p.alturaM] : [0, p.alturaM];
}

export type Resultante = {
  /** Fuerza por metro de muro (kN/m). */
  fuerza: number;
  /** Altura del punto de aplicación sobre la base del muro (m). */
  alturaDesdeBase: number;
  /** Momento respecto a la base por metro de muro (kN·m/m). */
  momentoBase: number;
};

function integrar(f: (z: number) => number, p: ParametrosEmpuje): Resultante {
  const pts = puntosCriticos(p);
  let fuerza = 0;
  let momento = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const m = (a + b) / 2;
    // Simpson: exacto para integrandos de grado ≤ 3 (presión lineal × brazo lineal).
    fuerza += ((b - a) / 6) * (f(a) + 4 * f(m) + f(b));
    momento += ((b - a) / 6) * (f(a) * (p.alturaM - a) + 4 * f(m) * (p.alturaM - m) + f(b) * (p.alturaM - b));
  }
  return { fuerza, momentoBase: momento, alturaDesdeBase: fuerza > 0 ? momento / fuerza : NaN };
}

export type ResultadoEmpuje = {
  sobrecarga: Resultante;
  suelo: Resultante;
  agua: Resultante;
  /** Suma de las tres componentes. */
  total: Resultante;
  /** Presiones en la base del muro. */
  base: PresionesEnProfundidad;
  /** Presiones en la superficie. */
  superficie: PresionesEnProfundidad;
  /** Peso unitario sumergido γ' usado (kN/m³). */
  gammaSumergido: number;
};

/** Resultantes del empuje lateral sobre un muro de sótano (por metro de longitud de muro). */
export function empujeMuro(p: ParametrosEmpuje): ResultadoEmpuje {
  const gw = p.gammaW ?? GAMMA_AGUA_DULCE;
  const sobrecarga = integrar((z) => presionesEnProfundidad(z, p).porSobrecarga, p);
  const suelo = integrar((z) => presionesEnProfundidad(z, p).porSuelo, p);
  const agua = integrar((z) => presionesEnProfundidad(z, p).hidrostatica, p);
  const fuerza = sobrecarga.fuerza + suelo.fuerza + agua.fuerza;
  const momentoBase = sobrecarga.momentoBase + suelo.momentoBase + agua.momentoBase;
  return {
    sobrecarga,
    suelo,
    agua,
    total: { fuerza, momentoBase, alturaDesdeBase: fuerza > 0 ? momentoBase / fuerza : NaN },
    base: presionesEnProfundidad(p.alturaM, p),
    superficie: presionesEnProfundidad(0, p),
    gammaSumergido: gammaSumergido(p.gammaSat, gw),
  };
}

/**
 * Subpresión u (kPa) en una losa de piso de sótano (B.5.2): γw por la cabeza de presión medida desde el
 * nivel freático. 0 si la losa está sobre el nivel freático.
 * @param profundidadLosaM profundidad de la cara inferior de la losa (m, desde la superficie)
 * @param nivelFreaticoM profundidad del nivel freático (m, desde la superficie)
 */
export function subpresion(profundidadLosaM: number, nivelFreaticoM: number, gammaW = GAMMA_AGUA_DULCE): number {
  return gammaW * Math.max(0, profundidadLosaM - nivelFreaticoM);
}
