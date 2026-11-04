/**
 * Título C — Capítulo C.22: concreto estructural simple (PDF p.503–508, impresas C-201 a C-206).
 * Unidades: f′c en MPa, longitudes en mm, áreas en mm², módulos de sección en mm³;
 * fuerzas en kN y momentos en kN·m salvo que se indique otra cosa. Las secciones rectangulares sólidas
 * (zapatas, muros, pedestales) se resuelven con las ecuaciones C.22-1 a C.22-14; Sm = b h²/6 y la geometría
 * de zapatas son mecánica usual (auxiliar del autor, no texto de la norma).
 */
import { COEF_C22, LIMITES_C22, PHI_CONCRETO_SIMPLE, REDUCCION_H_CONTRA_SUELO_MM } from '../../data/concretoSimpleTanques';

const N_A_KN = 1e-3;
const NMM_A_KNM = 1e-6;

/** C.22.4.7: altura de cálculo; si el concreto se vació contra el suelo, h se toma 50 mm menor que la real. */
export function alturaEfectivaSimple(hMm: number, contraSuelo: boolean): number {
  if (hMm <= 0) throw new RangeError('h debe ser positiva');
  const he = contraSuelo ? hMm - REDUCCION_H_CONTRA_SUELO_MM : hMm;
  if (he <= 0) throw new RangeError('h efectiva no positiva');
  return he;
}

/** Módulo elástico de una sección rectangular, Sm = b h² / 6, mm³ (auxiliar: C.22.5.1 solo dice «módulo elástico de la sección»). */
export function moduloSeccionRectangular(bMm: number, hMm: number): number {
  return (bMm * hMm * hMm) / 6;
}

export type ControlFlexion = 'traccion' | 'compresion';

/** Ec. C.22-2: Mn = 0.42 λ √f′c Sm (controla la tracción), en kN·m. */
export function momentoNominalTraccion(fc: number, smMm3: number, lambda = 1): number {
  return COEF_C22.flexionTraccion * lambda * Math.sqrt(fc) * smMm3 * NMM_A_KNM;
}

/** Ec. C.22-3: Mn = 0.85 f′c Sm (controla la compresión), en kN·m. */
export function momentoNominalCompresion(fc: number, smMm3: number): number {
  return COEF_C22.flexionCompresion * fc * smMm3 * NMM_A_KNM;
}

/** Mn de C.22-2 o C.22-3 según controle la tracción o la compresión (kN·m). */
export function momentoNominalSimple(fc: number, smMm3: number, control: ControlFlexion, lambda = 1): number {
  return control === 'traccion' ? momentoNominalTraccion(fc, smMm3, lambda) : momentoNominalCompresion(fc, smMm3);
}

/** φ Mn (kN·m) con φ = 0.60 (C.9.3.5). Ec. C.22-1: φMn ≥ Mu. */
export function resistenciaFlexionSimple(fc: number, smMm3: number, control: ControlFlexion = 'traccion', lambda = 1): number {
  return PHI_CONCRETO_SIMPLE * momentoNominalSimple(fc, smMm3, control, lambda);
}

/** Factor (1 − (ℓc / 32h)²) de las ecuaciones C.22-5 y C.22-14. ℓc y h en mm. */
export function factorEsbeltezSimple(lcMm: number, hMm: number): number {
  const r = lcMm / (COEF_C22.divisorEsbeltez * hMm);
  return 1 - r * r;
}

/** Ec. C.22-5: Pn = 0.60 f′c [1 − (ℓc/32h)²] A1, en kN. A1 es el área cargada. */
export function cargaNominalCompresion(fc: number, a1Mm2: number, lcMm: number, hMm: number): number {
  return COEF_C22.compresionElemento * fc * factorEsbeltezSimple(lcMm, hMm) * a1Mm2 * N_A_KN;
}

/** Ec. C.22-14 (método empírico de muros): Pn = 0.45 f′c Ag [1 − (ℓc/32h)²], en kN. */
export function cargaNominalMuroEmpirico(fc: number, agMm2: number, lcMm: number, hMm: number): number {
  return COEF_C22.muroEmpirico * fc * agMm2 * factorEsbeltezSimple(lcMm, hMm) * N_A_KN;
}

export type ResultadoFlexoCompresion = {
  /** Cara de compresión, Ec. C.22-6: Pu/φPn + Mu/φMn (debe ser ≤ 1). */
  razonCompresion: number;
  /** Cara de tracción, Ec. C.22-7: Mu/Sm − Pu/Ag, en MPa. */
  esfuerzoTraccion: number;
  /** Límite de C.22-7: φ 0.42 λ √f′c, en MPa. */
  limiteTraccion: number;
  cumpleCompresion: boolean;
  cumpleTraccion: boolean;
  cumple: boolean;
};

/**
 * Ecs. C.22-6 y C.22-7 para una sección rectangular sólida de ancho b (mm) y altura h (mm) ya reducida por C.22.4.7.
 * Pu en kN y Mu en kN·m. Lectura del autor: en la cara de compresión Mn es el de C.22-3 (0.85 f′c Sm) y
 * Pn el de C.22-5 con A1 = Ag; el PDF solo escribe «Mn» y «Pn».
 */
export function verificarFlexoCompresion(p: {
  fc: number;
  bMm: number;
  hMm: number;
  puKn: number;
  muKnm: number;
  lcMm: number;
  lambda?: number;
}): ResultadoFlexoCompresion {
  const lambda = p.lambda ?? 1;
  const ag = p.bMm * p.hMm;
  const sm = moduloSeccionRectangular(p.bMm, p.hMm);
  const phiPn = PHI_CONCRETO_SIMPLE * cargaNominalCompresion(p.fc, ag, p.lcMm, p.hMm);
  const phiMn = resistenciaFlexionSimple(p.fc, sm, 'compresion', lambda);
  const razonCompresion = p.puKn / phiPn + p.muKnm / phiMn;
  const esfuerzoTraccion = (p.muKnm * 1e6) / sm - (p.puKn * 1e3) / ag;
  const limiteTraccion = PHI_CONCRETO_SIMPLE * COEF_C22.traccionCaraTraccion * lambda * Math.sqrt(p.fc);
  const cumpleCompresion = razonCompresion <= 1;
  const cumpleTraccion = esfuerzoTraccion <= limiteTraccion;
  return { razonCompresion, esfuerzoTraccion, limiteTraccion, cumpleCompresion, cumpleTraccion, cumple: cumpleCompresion && cumpleTraccion };
}

/** Ec. C.22-9: Vn = 0.11 λ √f′c bw h (acción como viga), en kN. */
export function cortanteNominalViga(fc: number, bwMm: number, hMm: number, lambda = 1): number {
  return COEF_C22.cortanteViga * lambda * Math.sqrt(fc) * bwMm * hMm * N_A_KN;
}

/**
 * Ec. C.22-10: Vn = 0.11 (1 + 2/β) λ √f′c bo h, sin pasar de 0.22 λ √f′c bo h, en kN.
 * β = relación lado largo / lado corto de la carga concentrada o área de reacción.
 */
export function cortanteNominalDosDirecciones(fc: number, boMm: number, hMm: number, beta: number, lambda = 1): { vn: number; sinTope: number; tope: number; gobiernaTope: boolean } {
  if (beta < 1) throw new RangeError('β es la relación lado largo / lado corto (≥ 1)');
  const base = lambda * Math.sqrt(fc) * boMm * hMm * N_A_KN;
  const sinTope = COEF_C22.cortanteDosDirecciones * (1 + 2 / beta) * base;
  const tope = COEF_C22.cortanteDosDireccionesMax * base;
  return { vn: Math.min(sinTope, tope), sinTope, tope, gobiernaTope: sinTope > tope };
}

/**
 * Ecs. C.22-11 y C.22-12: Bn = 0.85 f′c A1, multiplicada por √(A2/A1) (máximo 2) si la superficie de apoyo es más
 * ancha en todos los lados que el área cargada. Devuelve kN.
 */
export function resistenciaAplastamiento(fc: number, a1Mm2: number, a2Mm2?: number): { bn: number; factor: number } {
  let factor = 1;
  if (a2Mm2 !== undefined && a2Mm2 > a1Mm2) factor = Math.min(Math.sqrt(a2Mm2 / a1Mm2), COEF_C22.factorAplastamientoMax);
  return { bn: COEF_C22.aplastamiento * fc * a1Mm2 * factor * N_A_KN, factor };
}

/* ───────────────────────────── Muros (C.22.6) ───────────────────────────── */

/** C.22.6.3: excentricidad de diseño = máx(Mu/Pu, 0.10 h), en mm. */
export function excentricidadDisenoMuro(muKnm: number, puKn: number, hMm: number): number {
  const e = puKn > 0 ? (muKnm * 1000) / puKn : Infinity;
  return Math.max(e, LIMITES_C22.excentricidadMinimaMuro * hMm);
}

/** C.22.6.3 y C.22.6.5.1: la resultante está en el tercio central si e ≤ h/6. */
export function resultanteEnTercioCentral(eMm: number, hMm: number): boolean {
  return eMm <= hMm / 6;
}

/** C.22.6.6.2 y C.22.6.6.3: espesor mínimo de un muro de carga (mm). `sotano` = muro exterior de sótano o de cimentación (190 mm). */
export function espesorMinimoMuroSimple(longitudONoApoyadaMm: number[], sotano = false): number {
  if (sotano) return LIMITES_C22.espesorMinimoMuroSotanoMm;
  const menor = Math.min(...longitudONoApoyadaMm);
  return Math.max(menor / LIMITES_C22.divisorEspesorMuro, LIMITES_C22.espesorMinimoMuroMm);
}

/** C.22.6.6.1: longitud horizontal efectiva por carga vertical concentrada ≤ mín(distancia entre ejes, apoyo + 4 t), mm. */
export function longitudEfectivaMuro(distanciaEntreEjesMm: number, anchoApoyoMm: number, espesorMm: number): number {
  return Math.min(distanciaEntreEjesMm, anchoApoyoMm + LIMITES_C22.vecesEspesorLongitudEfectiva * espesorMm);
}

export type ResultadoMuroSimple = {
  hEfMm: number;
  excentricidadMm: number;
  tercioCentral: boolean;
  /** Método empírico C.22-13/C.22-14 (solo válido con la resultante en el tercio central). */
  empirico: { aplica: boolean; phiPn: number; cumple: boolean };
  /** Flexo-compresión de C.22.5.3 (por metro de muro). */
  flexoCompresion: ResultadoFlexoCompresion;
  espesorMinimoMm: number;
  cumpleEspesor: boolean;
  cumple: boolean;
};

/**
 * Verificación de un muro rectangular macizo por metro de longitud (b = 1000 mm). Pu en kN/m, Mu en kN·m/m.
 * Sigue C.22.6.3: con e ≤ h/6 vale C.22.5.3 o el método empírico; si no, solo C.22.5.3.
 * `lcMm` = distancia vertical entre apoyos (ℓc; el PDF no define el símbolo, ver erratas del capítulo).
 */
export function verificarMuroSimple(p: {
  fc: number;
  hMm: number;
  contraSuelo?: boolean;
  puKnPorM: number;
  muKnmPorM: number;
  lcMm: number;
  alturaNoApoyadaMm?: number;
  longitudNoApoyadaMm?: number;
  sotano?: boolean;
  lambda?: number;
}): ResultadoMuroSimple {
  const hEf = alturaEfectivaSimple(p.hMm, p.contraSuelo ?? false);
  const b = 1000;
  const e = excentricidadDisenoMuro(p.muKnmPorM, p.puKnPorM, hEf);
  const tercio = resultanteEnTercioCentral(e, hEf);
  const muDiseno = Math.max(p.muKnmPorM, (p.puKnPorM * LIMITES_C22.excentricidadMinimaMuro * hEf) / 1000);
  const flexo = verificarFlexoCompresion({ fc: p.fc, bMm: b, hMm: hEf, puKn: p.puKnPorM, muKnm: muDiseno, lcMm: p.lcMm, lambda: p.lambda });
  const phiPnEmp = PHI_CONCRETO_SIMPLE * cargaNominalMuroEmpirico(p.fc, b * hEf, p.lcMm, hEf);
  const emp = { aplica: tercio, phiPn: phiPnEmp, cumple: tercio && phiPnEmp >= p.puKnPorM };
  const lista = [p.alturaNoApoyadaMm, p.longitudNoApoyadaMm].filter((x): x is number => x !== undefined);
  const espesorMinimoMm = espesorMinimoMuroSimple(lista.length ? lista : [p.lcMm], p.sotano ?? false);
  const cumpleEspesor = p.hMm >= espesorMinimoMm;
  const cumpleResistencia = tercio ? emp.cumple || flexo.cumple : flexo.cumple;
  return { hEfMm: hEf, excentricidadMm: e, tercioCentral: tercio, empirico: emp, flexoCompresion: flexo, espesorMinimoMm, cumpleEspesor, cumple: cumpleResistencia && cumpleEspesor };
}

/* ───────────────────────────── Zapatas (C.22.7) ───────────────────────────── */

export type ResultadoZapata = {
  hEfMm: number;
  espesorCumple: boolean;
  /** Flexión en la cara del apoyo. */
  muKnm: number;
  phiMnKnm: number;
  /** Cortante como viga, sección a hEf de la cara. */
  vuViga: number;
  phiVnViga: number;
  /** Cortante en dos direcciones (solo zapata aislada). */
  vuPunz?: number;
  phiVnPunz?: number;
  cumple: boolean;
};

/**
 * Zapata corrida de concreto simple, por metro de longitud, bajo un muro de espesor t, con presión mayorada uniforme qu
 * (kPa). Momento en la cara del muro (C.22.7.5(a)); cortante como viga con sección crítica a h de la cara (C.22.7.6.2(a)).
 * La altura de cálculo es h − 50 mm si el concreto se vacía contra el suelo (C.22.4.7). Elección del autor: la
 * distancia de la sección crítica se mide con esa misma h efectiva (resultado conservador).
 */
export function verificarZapataCorrida(p: {
  fc: number;
  anchoMm: number;
  espesorMuroMm: number;
  hMm: number;
  quKpa: number;
  contraSuelo?: boolean;
  lambda?: number;
}): ResultadoZapata {
  const lambda = p.lambda ?? 1;
  const hEf = alturaEfectivaSimple(p.hMm, p.contraSuelo ?? true);
  const vuelo = (p.anchoMm - p.espesorMuroMm) / 2 / 1000; // m
  const quLin = p.quKpa * 1; // kN/m por metro de longitud y por m de ancho
  const mu = (quLin * vuelo * vuelo) / 2;
  const sm = moduloSeccionRectangular(1000, hEf);
  const phiMn = resistenciaFlexionSimple(p.fc, sm, 'traccion', lambda);
  const distCritica = Math.max(vuelo - hEf / 1000, 0);
  const vu = quLin * distCritica;
  const phiVn = PHI_CONCRETO_SIMPLE * cortanteNominalViga(p.fc, 1000, hEf, lambda);
  const espesorCumple = p.hMm >= LIMITES_C22.espesorMinimoZapataMm;
  return { hEfMm: hEf, espesorCumple, muKnm: mu, phiMnKnm: phiMn, vuViga: vu, phiVnViga: phiVn, cumple: espesorCumple && mu <= phiMn && vu <= phiVn };
}

/**
 * Zapata aislada cuadrada B × B bajo una columna/pedestal cuadrado c × c, presión mayorada uniforme qu (kPa).
 * Flexión en la cara (C.22.7.5(a)); cortante como viga a h de la cara y en dos direcciones con perímetro bo a h/2 de
 * la cara (C.22.7.6.2(a) y (b)). Columnas circulares se tratan como cuadradas de igual área (C.22.7.7).
 */
export function verificarZapataAislada(p: {
  fc: number;
  ladoMm: number;
  ladoColumnaMm: number;
  hMm: number;
  quKpa: number;
  contraSuelo?: boolean;
  lambda?: number;
}): ResultadoZapata {
  const lambda = p.lambda ?? 1;
  const hEf = alturaEfectivaSimple(p.hMm, p.contraSuelo ?? true);
  const B = p.ladoMm / 1000;
  const c = p.ladoColumnaMm / 1000;
  const vuelo = (B - c) / 2;
  const mu = (p.quKpa * B * vuelo * vuelo) / 2;
  const sm = moduloSeccionRectangular(p.ladoMm, hEf);
  const phiMn = resistenciaFlexionSimple(p.fc, sm, 'traccion', lambda);
  const distCritica = Math.max(vuelo - hEf / 1000, 0);
  const vuViga = p.quKpa * B * distCritica;
  const phiVnViga = PHI_CONCRETO_SIMPLE * cortanteNominalViga(p.fc, p.ladoMm, hEf, lambda);
  const lado = p.ladoColumnaMm + 2 * LIMITES_C22.distanciaCriticaPunzonamiento * hEf;
  const bo = 4 * lado;
  const vuPunz = p.quKpa * (B * B - (lado / 1000) ** 2);
  const phiVnPunz = PHI_CONCRETO_SIMPLE * cortanteNominalDosDirecciones(p.fc, bo, hEf, 1, lambda).vn;
  const espesorCumple = p.hMm >= LIMITES_C22.espesorMinimoZapataMm;
  return {
    hEfMm: hEf,
    espesorCumple,
    muKnm: mu,
    phiMnKnm: phiMn,
    vuViga,
    phiVnViga,
    vuPunz,
    phiVnPunz,
    cumple: espesorCumple && mu <= phiMn && vuViga <= phiVnViga && vuPunz <= phiVnPunz,
  };
}

/* ───────────────────────────── Pedestales (C.22.8) ───────────────────────────── */

/** C.22.8.2: altura no apoyada / promedio de la menor dimensión lateral ≤ 3. */
export function esbeltezPedestal(alturaNoApoyadaMm: number, menorDimensionPromedioMm: number): { relacion: number; cumple: boolean } {
  const relacion = alturaNoApoyadaMm / menorDimensionPromedioMm;
  return { relacion, cumple: relacion <= LIMITES_C22.esbeltezMaximaPedestal };
}

/** C.22.8.3: Pu ≤ φBn (kN). */
export function verificarPedestal(p: { fc: number; a1Mm2: number; a2Mm2?: number; puKn: number }): { phiBn: number; razon: number; cumple: boolean } {
  const { bn } = resistenciaAplastamiento(p.fc, p.a1Mm2, p.a2Mm2);
  const phiBn = PHI_CONCRETO_SIMPLE * bn;
  return { phiBn, razon: p.puKn / phiBn, cumple: p.puKn <= phiBn };
}
