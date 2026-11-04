/**
 * Capítulo C.10 de la NSR-10 — Flexión y cargas axiales: lógica pura.
 * Unidades: mm, MPa, N en el interior de las secciones; resultados en kN y kN·m. PDF = página impresa "C-n" + 302.
 *
 * PUNTO DE CONTACTO con C.9: `phiPorDeformacion` repite la regla de φ de C.9.3.2 (PDF p.370, C-68); el capítulo C.9
 * publica su propia φ(εt) en `resistenciaServicio.ts`. Aquí no se depende de ese archivo; ambas deben coincidir.
 */
import { ES_ACERO_MPA, beta1, moduloElasticidad } from './concreto';
import {
  AMPLIFICACION_MAX_SEGUNDO_ORDEN,
  AS_MIN_FLEXION,
  BARRAS_MIN_COLUMNA,
  CM_COEF,
  COCIENTE_H_C2_MIN,
  CUANTIA_MAX_COLUMNA,
  CUANTIA_MIN_COLUMNA,
  DELTA_S_MAX_C10_20,
  EPS_CU,
  EPS_LIMITE_COMPRESION_GRADO_420,
  EPS_T_CONTROLADA_TRACCION,
  EPS_T_MIN_FLEXION,
  ESBELTEZ_LIMITE_ARRIOSTRADA,
  ESBELTEZ_LIMITE_NO_ARRIOSTRADA,
  FACTOR_APLASTAMIENTO_MAX,
  FACTOR_EI_C10_14,
  FACTOR_EI_C10_15,
  FY_GRADO_420,
  FYT_MAX_ESPIRAL,
  H_REFUERZO_SUPERFICIAL_MM,
  I_COLUMNA_C10_8,
  I_VIGA_C10_9,
  M2_MIN,
  PHI_APLASTAMIENTO,
  PHI_COMPRESION_ESPIRAL,
  PHI_COMPRESION_ESTRIBOS,
  PHI_TRACCION,
  RELACION_APOYOS_LATERALES,
  RELACION_FC_COLUMNA_LOSA,
  SEPARACION_FISURACION,
  type TipoConfinamientoColumna,
} from '../../data/flexionConcreto';

/* ------------------------------------------------------------------ */
/* Sección rectangular con capas de refuerzo (C.10.2, C.10.3)          */
/* ------------------------------------------------------------------ */

/** Capa de refuerzo: área (mm²) y profundidad `y` (mm) medida desde la fibra extrema en compresión. */
export interface CapaAcero {
  area: number;
  y: number;
}

/** Sección rectangular de ancho b y altura h (mm), con refuerzo en capas. Se flecta alrededor de un eje paralelo a b. */
export interface SeccionRect {
  b: number;
  h: number;
  fc: number;
  fy: number;
  capas: readonly CapaAcero[];
}

/** Esfuerzo del acero para una deformación ε: elastoplástico perfecto (C.10.2.4, PDF p.377, C-75). */
export function esfuerzoAcero(eps: number, fy: number, Es = ES_ACERO_MPA): number {
  return Math.max(-fy, Math.min(fy, Es * eps));
}

/**
 * Límite de deformación controlada por compresión (C.10.3.3, PDF p.378, C-76): la deformación de fluencia fy/Es
 * (condición balanceada, C.10.3.2); para refuerzo Grado 420 se permite fijarla en 0.002.
 */
export function epsilonLimiteCompresion(fy: number, Es = ES_ACERO_MPA): number {
  return fy === FY_GRADO_420 ? EPS_LIMITE_COMPRESION_GRADO_420 : fy / Es;
}

export type ClaseSeccion = 'compresion' | 'transicion' | 'traccion';

/** Clasifica la sección según εt (C.10.3.3 y C.10.3.4, PDF p.378, C-76). */
export function clasificarSeccion(epsT: number, fy: number): ClaseSeccion {
  if (epsT <= epsilonLimiteCompresion(fy)) return 'compresion';
  if (epsT >= EPS_T_CONTROLADA_TRACCION) return 'traccion';
  return 'transicion';
}

/**
 * Factor de reducción de resistencia φ en función de εt (C.9.3.2.1 y C.9.3.2.2, PDF p.370, C-68):
 * 0.90 si εt ≥ 0.005; 0.65 (0.75 con espiral) si εt ≤ límite de compresión; interpolación lineal entre ambos.
 */
export function phiPorDeformacion(epsT: number, fy: number, espiral = false): number {
  const phiC = espiral ? PHI_COMPRESION_ESPIRAL : PHI_COMPRESION_ESTRIBOS;
  const lim = epsilonLimiteCompresion(fy);
  if (epsT <= lim) return phiC;
  if (epsT >= EPS_T_CONTROLADA_TRACCION) return PHI_TRACCION;
  return phiC + ((PHI_TRACCION - phiC) * (epsT - lim)) / (EPS_T_CONTROLADA_TRACCION - lim);
}

/** Profundidad de la capa de refuerzo más alejada de la fibra en compresión (la de εt). */
export function profundidadExtrema(sec: Pick<SeccionRect, 'capas'>): number {
  return Math.max(...sec.capas.map((c) => c.y));
}

export interface EstadoSeccion {
  /** Profundidad del eje neutro (mm). */
  c: number;
  /** Profundidad del bloque equivalente a = β1 c, limitada a h (mm). */
  a: number;
  /** Fuerza axial nominal, compresión positiva (kN). */
  Pn: number;
  /** Momento nominal respecto al centroide geométrico h/2 (kN·m). */
  Mn: number;
  /** Deformación neta de tracción del acero extremo; negativa si toda la capa está en compresión. */
  epsT: number;
  /** Esfuerzo de cada capa (MPa, compresión positiva), en el mismo orden de `capas`. */
  fs: number[];
}

/**
 * Equilibrio de la sección para una profundidad dada del eje neutro `c` con εcu = 0.003 en la fibra extrema
 * (C.10.2.2–C.10.2.7, PDF p.377, C-75): bloque 0.85 f′c de profundidad a = β1 c; el concreto desplazado por el acero
 * en compresión se descuenta cuando la capa queda dentro del bloque.
 */
export function estadoEnC(sec: SeccionRect, c: number): EstadoSeccion {
  const { b, h, fc, fy } = sec;
  const a = Math.min(beta1(fc) * c, h);
  const cc = 0.85 * fc * b * a;
  let N = cc;
  let M = cc * (h / 2 - a / 2);
  const fs: number[] = [];
  for (const capa of sec.capas) {
    const eps = (EPS_CU * (c - capa.y)) / c;
    const f = esfuerzoAcero(eps, fy);
    fs.push(f);
    const F = capa.area * (f - (capa.y < a ? 0.85 * fc : 0));
    N += F;
    M += F * (h / 2 - capa.y);
  }
  const epsT = (EPS_CU * (profundidadExtrema(sec) - c)) / c;
  return { c, a, Pn: N / 1000, Mn: M / 1e6, epsT, fs };
}

/** Resuelve por bisección la profundidad c con Pn = `Pobjetivo` (kN); Pn crece con c. Devuelve null si no hay solución. */
export function cParaCarga(sec: SeccionRect, Pobjetivo = 0): number | null {
  let lo = 1e-6 * sec.h;
  let hi = 1e3 * sec.h;
  const f = (c: number) => estadoEnC(sec, c).Pn - Pobjetivo;
  if (f(lo) > 0 || f(hi) < 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10 * sec.h) break;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ */
/* Vigas rectangulares                                                  */
/* ------------------------------------------------------------------ */

export interface EntradaViga {
  b: number;
  h: number;
  /** Altura útil al refuerzo de tracción (mm). */
  d: number;
  fc: number;
  fy: number;
  /** Área de refuerzo de tracción (mm²). */
  As: number;
  /** Área de refuerzo de compresión (mm²), opcional. */
  Aprime?: number;
  /** Profundidad del refuerzo de compresión desde la fibra superior (mm). */
  dPrime?: number;
}

export interface ResultadoViga {
  c: number;
  a: number;
  beta1: number;
  epsT: number;
  /** Esfuerzo del refuerzo de compresión (MPa), si existe. */
  fsPrime: number | null;
  clase: ClaseSeccion;
  phi: number;
  /** Mn (kN·m) y φMn (kN·m). */
  Mn: number;
  phiMn: number;
  /** C.10.3.5: εt ≥ 0.004 en el estado de resistencia nominal. */
  cumpleEpsMin: boolean;
}

/** Sección rectangular de una viga como `SeccionRect` con capas en d y d′. */
export function seccionDeViga(e: EntradaViga): SeccionRect {
  const capas: CapaAcero[] = [{ area: e.As, y: e.d }];
  if (e.Aprime && e.Aprime > 0) capas.push({ area: e.Aprime, y: e.dPrime ?? 0 });
  return { b: e.b, h: e.h, fc: e.fc, fy: e.fy, capas };
}

/** Flexión pura de una viga rectangular (equilibrio con Pn = 0), con o sin refuerzo de compresión. */
export function flexionViga(e: EntradaViga): ResultadoViga | null {
  if (!(e.As > 0) || !(e.b > 0) || !(e.d > 0) || !(e.fc > 0) || !(e.fy > 0)) return null;
  const sec = seccionDeViga(e);
  const c = cParaCarga(sec, 0);
  if (c === null) return null;
  const est = estadoEnC(sec, c);
  const phi = phiPorDeformacion(est.epsT, e.fy);
  const tieneComp = sec.capas.length > 1;
  return {
    c,
    a: est.a,
    beta1: beta1(e.fc),
    epsT: est.epsT,
    fsPrime: tieneComp ? est.fs[1] : null,
    clase: clasificarSeccion(est.epsT, e.fy),
    phi,
    Mn: est.Mn,
    phiMn: phi * est.Mn,
    cumpleEpsMin: est.epsT >= EPS_T_MIN_FLEXION - 1e-12,
  };
}

/** Solución cerrada de una viga simplemente armada con As en tracción fluyendo: a = As fy / (0.85 f′c b), Mn = As fy (d − a/2). */
export function vigaSimplementeArmada(b: number, d: number, fc: number, fy: number, As: number) {
  const a = (As * fy) / (0.85 * fc * b);
  const c = a / beta1(fc);
  const epsT = (EPS_CU * (d - c)) / c;
  const Mn = (As * fy * (d - a / 2)) / 1e6;
  return { a, c, epsT, Mn };
}

export interface DisenoFlexion {
  /** Refuerzo de tracción requerido (mm²). */
  As: number;
  /** Refuerzo de compresión requerido (mm²); 0 si no se necesita. */
  Aprime: number;
  doble: boolean;
  a: number;
  c: number;
  epsT: number;
  phi: number;
  /** Momento nominal y de diseño resultantes (kN·m). */
  Mn: number;
  phiMn: number;
  /** As mínimo de C.10.5.1 con bw = b (mm²) y si el As calculado lo cumple. */
  Asmin: number;
  cumpleAsmin: boolean;
}

/**
 * Diseño (autoría del proyecto, no texto de la norma): As para un momento mayorado Mu (kN·m).
 * 1) Simplemente armada: itera φ(εt) hasta que φMn = Mu; si εt ≥ 0.004 (C.10.3.5) se acepta.
 * 2) Si εt < 0.004, se fija c en la condición εt = 0.005 (φ = 0.90) y se agrega A′s para el momento restante.
 * Devuelve null si Mu es mayor que lo que alcanza la sección aun con refuerzo de compresión de fluencia.
 */
export function disenarFlexion(Mu: number, b: number, d: number, fc: number, fy: number, dPrime = 0, h = d * 1.1): DisenoFlexion | null {
  if (!(Mu > 0) || !(b > 0) || !(d > 0)) return null;
  const b1 = beta1(fc);
  const MuNmm = Mu * 1e6;
  let phi = PHI_TRACCION;
  let a = 0;
  let epsT = 0;
  let ok = true;
  for (let i = 0; i < 100; i++) {
    const rad = d * d - (2 * MuNmm) / (phi * 0.85 * fc * b);
    if (rad < 0) {
      ok = false;
      break;
    }
    a = d - Math.sqrt(rad);
    const c = a / b1;
    epsT = (EPS_CU * (d - c)) / c;
    const nuevo = phiPorDeformacion(epsT, fy);
    if (Math.abs(nuevo - phi) < 1e-10) {
      phi = nuevo;
      break;
    }
    phi = nuevo;
  }
  const asmin = asMinimo(fc, fy, b, d);
  if (ok && epsT >= EPS_T_MIN_FLEXION - 1e-12) {
    const As = (0.85 * fc * b * a) / fy;
    const r = flexionViga({ b, h, d, fc, fy, As })!;
    return { As, Aprime: 0, doble: false, a: r.a, c: r.c, epsT: r.epsT, phi: r.phi, Mn: r.Mn, phiMn: r.phiMn, Asmin: asmin, cumpleAsmin: As >= asmin };
  }
  // Doblemente armada con εt = 0.005 (c = 0.375 d).
  const cMax = (d * EPS_CU) / (EPS_CU + EPS_T_CONTROLADA_TRACCION);
  const aMax = b1 * cMax;
  const Mn1 = 0.85 * fc * b * aMax * (d - aMax / 2);
  const resto = MuNmm / PHI_TRACCION - Mn1;
  if (resto <= 0 || dPrime <= 0 || dPrime >= cMax) return null;
  const fsP = esfuerzoAcero((EPS_CU * (cMax - dPrime)) / cMax, fy);
  const netoP = fsP - (dPrime < aMax ? 0.85 * fc : 0);
  if (netoP <= 0) return null;
  const Aprime = resto / (netoP * (d - dPrime));
  const As = (0.85 * fc * b * aMax + Aprime * netoP) / fy;
  const r = flexionViga({ b, h, d, fc, fy, As, Aprime, dPrime })!;
  return { As, Aprime, doble: true, a: r.a, c: r.c, epsT: r.epsT, phi: r.phi, Mn: r.Mn, phiMn: r.phiMn, Asmin: asmin, cumpleAsmin: As >= asmin };
}

/* ------------------------------------------------------------------ */
/* C.10.4 – C.10.7: apoyos laterales, refuerzo mínimo, fisuración        */
/* ------------------------------------------------------------------ */

/** Separación máxima entre apoyos laterales de una viga: 50 b (C.10.4.1, PDF p.378, C-76); b es el menor ancho del ala o cara en compresión. */
export function separacionMaximaApoyosLaterales(b: number): number {
  return RELACION_APOYOS_LATERALES * b;
}

/**
 * Refuerzo mínimo por flexión, Ec. C.10-3 (C.10.5.1, PDF p.379, C-77):
 * As,min = (0.25 √f′c / fy) bw d, no menor que 1.4 bw d / fy. Resultado en mm².
 */
export function asMinimo(fc: number, fy: number, bw: number, d: number): number {
  const a = ((AS_MIN_FLEXION.coefRaizFc * Math.sqrt(fc)) / fy) * bw * d;
  const b = (AS_MIN_FLEXION.minimoAbsoluto * bw * d) / fy;
  return Math.max(a, b);
}

/** f′c a partir del cual gobierna el término 0.25√f′c sobre 1.4 en la Ec. C.10-3: (1.4/0.25)² = 31.36 MPa. */
export const FC_CAMBIO_ASMIN = (AS_MIN_FLEXION.minimoAbsoluto / AS_MIN_FLEXION.coefRaizFc) ** 2;

/** As,min con el ala en tracción de un elemento estáticamente determinado (C.10.5.2): bw se reemplaza por min(2bw, bf). */
export function asMinimoAlaTraccion(fc: number, fy: number, bw: number, bf: number, d: number): number {
  return asMinimo(fc, fy, Math.min(2 * bw, bf), d);
}

/** C.10.5.3: no se exige As,min si el As proporcionado es al menos 4/3 del requerido por análisis. */
export function exentoDeAsMinimo(AsProporcionado: number, AsRequerido: number): boolean {
  return AsProporcionado >= (4 / 3) * AsRequerido - 1e-9;
}

/** Esfuerzo fs permitido en servicio: 2/3 fy (C.10.6.4, PDF p.379, C-77). */
export function fsServicioPermitido(fy: number): number {
  return (2 / 3) * fy;
}

/**
 * Separación máxima del refuerzo más cercano a la cara en tracción, Ec. C.10-4 (C.10.6.4, PDF p.379, C-77):
 * s = 380(280/fs) − 2.5 cc, pero no mayor que 300(280/fs). fs en MPa, cc en mm; resultado en mm.
 */
export function separacionMaximaFisuracion(fs: number, cc: number): number {
  const { coefA, coefB, tope, fsReferencia } = SEPARACION_FISURACION;
  const k = fsReferencia / fs;
  return Math.min(coefA * k - coefB * cc, tope * k);
}

/** C.10.6.7: refuerzo superficial longitudinal en las caras laterales si h > 900 mm, dentro de h/2 cerca de la cara en tracción. */
export function requiereRefuerzoSuperficial(h: number): boolean {
  return h > H_REFUERZO_SUPERFICIAL_MM;
}

/** Límite de s para el refuerzo superficial (C.10.6.7): la misma Ec. C.10-4 con cc medido a la cara lateral. */
export const separacionMaximaSuperficial = separacionMaximaFisuracion;

/** C.10.6.6: ancho sobre el que se distribuye parte del refuerzo en vigas T con el ala en tracción = min(ancho efectivo, luz/10). */
export function anchoDistribucionAlaTraccion(anchoEfectivo: number, luz: number): number {
  return Math.min(anchoEfectivo, luz / 10);
}

/** C.10.7.1: viga de gran altura si luz libre ≤ 4h o si hay cargas concentradas a menos de 2h del apoyo. */
export function esVigaGranAltura(luzLibre: number, h: number, cargaConcentradaAMenosDe2h = false): boolean {
  return luzLibre <= 4 * h || cargaConcentradaAMenosDe2h;
}

/* ------------------------------------------------------------------ */
/* C.10.8 – C.10.9: columnas                                            */
/* ------------------------------------------------------------------ */

/** Límites del refuerzo longitudinal 0.01 Ag ≤ Ast ≤ 0.04 Ag (C.10.9.1, PDF p.381, C-79), en mm². */
export function limitesRefuerzoColumna(Ag: number): { min: number; max: number } {
  return { min: CUANTIA_MIN_COLUMNA * Ag, max: CUANTIA_MAX_COLUMNA * Ag };
}

/** Número mínimo de barras longitudinales (C.10.9.2, PDF p.381, C-79). */
export function barrasMinimasColumna(tipo: TipoConfinamientoColumna): number {
  return BARRAS_MIN_COLUMNA[tipo];
}

/** Cuantía volumétrica mínima del refuerzo en espiral, Ec. C.10-5 (C.10.9.3): ρs = 0.45 (Ag/Ach − 1) f′c / fyt, con fyt ≤ 700 MPa. */
export function cuantiaEspiralMinima(Ag: number, Ach: number, fc: number, fyt: number): number {
  return 0.45 * (Ag / Ach - 1) * (fc / Math.min(fyt, FYT_MAX_ESPIRAL));
}

/** Área bruta efectiva reducida permitida en C.10.8.4: no menor que la mitad del área total (no aplica a DMO/DES del C.21). */
export function areaEfectivaMinima(Atotal: number): number {
  return Atotal / 2;
}

/** C.10.8.3: sección circular equivalente de diámetro igual a la menor dimensión lateral; devuelve el área bruta equivalente (mm²). */
export function areaCircularEquivalente(menorDimension: number): number {
  return (Math.PI * menorDimension ** 2) / 4;
}

/* ------------------------------------------------------------------ */
/* C.10.10: esbeltez                                                    */
/* ------------------------------------------------------------------ */

/** Radio de giro simplificado (C.10.10.1.2, PDF p.381, C-79): 0.3 h rectangulares; 0.25 D circulares. */
export function radioGiro(dimension: number, circular = false): number {
  return (circular ? 0.25 : 0.3) * dimension;
}

/** Radio de giro exacto de una sección rectangular: h/√12 (verificación; la norma permite 0.3 h). */
export function radioGiroRectangularExacto(h: number): number {
  return h / Math.sqrt(12);
}

/**
 * Límite de kℓu/r bajo el cual se pueden ignorar los efectos de esbeltez (C.10.10.1, PDF p.381, C-79):
 * no arriostrado: 22 (Ec. C.10-6); arriostrado: 34 − 12 (M1/M2) ≤ 40 (Ec. C.10-7).
 * M1/M2 es positivo en curvatura simple y negativo en curvatura doble.
 */
export function limiteEsbeltez(arriostrada: boolean, M1M2 = 0): number {
  if (!arriostrada) return ESBELTEZ_LIMITE_NO_ARRIOSTRADA;
  const { base, coeficiente, tope } = ESBELTEZ_LIMITE_ARRIOSTRADA;
  return Math.min(base - coeficiente * M1M2, tope);
}

export function puedeIgnorarEsbeltez(klu_r: number, arriostrada: boolean, M1M2 = 0): boolean {
  return klu_r <= limiteEsbeltez(arriostrada, M1M2);
}

/** Momento de inercia bruto de una sección rectangular (mm⁴). */
export function inerciaBruta(b: number, h: number): number {
  return (b * h ** 3) / 12;
}

/** Factores de Ig del análisis elástico de segundo orden (C.10.10.4.1(b), PDF p.382, C-80). */
export const FACTOR_I = { columnas: 0.7, murosNoAgrietados: 0.7, murosAgrietados: 0.35, vigas: 0.35, placas: 0.25 } as const;

/**
 * Inercia de columnas por la Ec. C.10-8 (PDF p.382, C-80):
 * I = (0.80 + 25 Ast/Ag)(1 − Mu/(Pu h) − 0.5 Pu/Po) Ig ≤ 0.875 Ig, y no menor que 0.35 Ig. Devuelve I/Ig.
 * Po es la resistencia axial nominal para excentricidad nula.
 */
export function relacionInerciaColumnaC108(Ast: number, Ag: number, Mu: number, Pu: number, h: number, Po: number): number {
  // Mu en kN·m, Pu y Po en kN, h en mm  →  Mu/(Pu h) adimensional.
  const r = (0.8 + (25 * Ast) / Ag) * (1 - (Mu * 1000) / (Pu * h) - (0.5 * Pu) / Po);
  return Math.min(I_COLUMNA_C10_8.max, Math.max(I_COLUMNA_C10_8.min, r));
}

/** Inercia de vigas por la Ec. C.10-9 (PDF p.382, C-80): I = (0.10 + 25ρ)(1.2 − 0.2 bw/d) Ig ≤ 0.5 Ig; mínimo 0.25 Ig en continuas. Devuelve I/Ig. */
export function relacionInerciaVigaC109(rho: number, bw: number, d: number): number {
  const r = (0.1 + 25 * rho) * (1.2 - (0.2 * bw) / d);
  return Math.min(I_VIGA_C10_9.max, Math.max(I_VIGA_C10_9.min, r));
}

/** C.10.10.4.2: I (columnas) se divide por 1 + βds si hay cargas laterales sostenidas; βds ≤ 1.0. */
export function reducirInerciaPorCargaSostenida(I: number, betaDs: number): number {
  return I / (1 + Math.min(1, betaDs));
}

/**
 * Rigidez a flexión EI de una columna para el magnificador (C.10.10.6.1, PDF p.383–384, C-81/C-82), en N·mm².
 * Si se dan Es·Ise (acero longitudinal): Ec. C.10-14, (0.2 Ec Ig + Es Ise)/(1 + βdns); si no, Ec. C.10-15, 0.4 Ec Ig/(1 + βdns).
 * βdns ≤ 1.0 (C.10.10.6.2).
 */
export function rigidezEI(Ec: number, Ig: number, betaDns: number, EsIse?: number): number {
  const beta = Math.min(1, betaDns);
  return EsIse === undefined
    ? (FACTOR_EI_C10_15 * Ec * Ig) / (1 + beta)
    : (FACTOR_EI_C10_14 * Ec * Ig + EsIse) / (1 + beta);
}

/** EI a partir de la inercia efectiva I de la Ec. C.10-8 dividida por (1 + βdns) (alternativa de C.10.10.6.1): EI = Ec I /(1 + βdns). */
export function rigidezEIDesdeI(Ec: number, I: number, betaDns: number): number {
  return (Ec * I) / (1 + Math.min(1, betaDns));
}

/** Carga crítica de Euler Pc = π² EI / (k ℓu)², Ec. C.10-13 (PDF p.383, C-81). EI en N·mm², ℓu en mm; devuelve kN. */
export function cargaCritica(EI: number, k: number, lu: number): number {
  return (Math.PI ** 2 * EI) / (k * lu) ** 2 / 1000;
}

/** Cm = 0.6 + 0.4 M1/M2 sin cargas transversales entre apoyos; 1.0 si las hay (Ec. C.10-16, C.10.10.6.4, PDF p.384, C-82). */
export function factorCm(M1M2: number, cargaTransversal = false): number {
  return cargaTransversal ? 1 : CM_COEF.base + CM_COEF.coeficiente * M1M2;
}

/** M2,min = Pu (15 + 0.03 h), Ec. C.10-17 (C.10.10.6.5, PDF p.384, C-82). Pu en kN, h en mm; devuelve kN·m. */
export function momentoMinimoM2(Pu: number, h: number): number {
  return (Pu * (M2_MIN.excentricidadMm + M2_MIN.coefH * h)) / 1000;
}

export interface EntradaMagnificacion {
  /** Carga axial mayorada (kN). */
  Pu: number;
  /** Momento menor y mayor en los extremos (kN·m), con signo: M1/M2 > 0 en curvatura simple. |M2| ≥ |M1|. */
  M1: number;
  M2: number;
  /** Longitud no apoyada (mm), factor k (1.0 por C.10.10.6.3) y dimensión h de la sección en el plano de flexión (mm). */
  lu: number;
  k?: number;
  h: number;
  /** Rigidez a flexión EI (N·mm²), p. ej. de `rigidezEI`. */
  EI: number;
  /** Hay cargas transversales entre los apoyos (Cm = 1.0). */
  cargaTransversal?: boolean;
}

export interface ResultadoMagnificacion {
  M1M2: number;
  Cm: number;
  Pc: number;
  delta: number;
  M2usado: number;
  M2min: number;
  usaM2min: boolean;
  /** Mc = δns M2 (kN·m), Ec. C.10-11. */
  Mc: number;
  /** Mc/M2usado. */
  amplificacion: number;
  /** Pu ≥ 0.75 Pc: la columna es inestable con esta rigidez (el denominador de C.10-12 no es positivo). */
  inestable: boolean;
  /** C.10.10.2.1: los momentos totales no deben exceder 1.4 veces los de primer orden. */
  excede14: boolean;
}

/**
 * Magnificación de momentos en estructuras sin desplazamiento lateral (C.10.10.6, Ecs. C.10-11 a C.10-17,
 * PDF p.383–384, C-81/C-82): Mc = δns M2 con δns = Cm / (1 − Pu/(0.75 Pc)) ≥ 1.0.
 */
export function magnificarSinDesplazamiento(e: EntradaMagnificacion): ResultadoMagnificacion {
  const k = e.k ?? 1;
  const M2abs = Math.abs(e.M2);
  const M2min = momentoMinimoM2(e.Pu, e.h);
  const usaM2min = M2min > M2abs;
  const M2usado = Math.max(M2abs, M2min);
  const M1M2 = M2abs === 0 ? 0 : e.M1 / e.M2;
  // C.10.10.6.5: si M2,min excede a M2, Cm = 1.0 (o basado en la relación de momentos calculados en los extremos).
  const Cm = usaM2min ? 1 : factorCm(M1M2, e.cargaTransversal);
  const Pc = cargaCritica(e.EI, k, e.lu);
  const den = 1 - e.Pu / (0.75 * Pc);
  const inestable = den <= 0;
  const delta = inestable ? Infinity : Math.max(1, Cm / den);
  const Mc = delta * M2usado;
  const amplificacion = Mc / M2usado;
  return { M1M2, Cm, Pc, delta, M2usado, M2min, usaM2min, Mc, amplificacion, inestable, excede14: amplificacion > AMPLIFICACION_MAX_SEGUNDO_ORDEN + 1e-12 };
}

/** Índice de estabilidad del piso Q = ΣPu Δo / (Vus ℓc), Ec. C.10-10 (C.10.10.5.2, PDF p.383, C-81). Cualquier unidad coherente. */
export function indiceEstabilidadQ(sumPu: number, delta0: number, Vus: number, lc: number): number {
  return (sumPu * delta0) / (Vus * lc);
}

/** El piso se puede suponer arriostrado si Q ≤ 0.05 (C.10.10.5.2). */
export function pisoArriostrado(Q: number): boolean {
  return Q <= 0.05;
}

/** δs = 1/(1 − Q) ≥ 1, Ec. C.10-20 (C.10.10.7.3, PDF p.384, C-82). Si supera 1.5 hay que usar C.10.10.7.4 o análisis de segundo orden. */
export function deltaSDesdeQ(Q: number): { delta: number; excede15: boolean } {
  const delta = Q >= 1 ? Infinity : Math.max(1, 1 / (1 - Q));
  return { delta, excede15: delta > DELTA_S_MAX_C10_20 };
}

/** δs = 1 / (1 − ΣPu/(0.75 ΣPc)) ≥ 1, Ec. C.10-21 (C.10.10.7.4, PDF p.385, C-83). */
export function deltaSDesdeCargas(sumPu: number, sumPc: number): number {
  const den = 1 - sumPu / (0.75 * sumPc);
  return den <= 0 ? Infinity : Math.max(1, 1 / den);
}

/** Momentos extremos en estructuras con desplazamiento lateral: M = Mns + δs Ms (Ecs. C.10-18 y C.10-19, PDF p.384, C-82). */
export function momentoConDesplazamiento(Mns: number, Ms: number, deltaS: number): number {
  return Mns + deltaS * Ms;
}

/** Módulo Ec del concreto para el análisis de esbeltez (C.10.10.4.1(a): Ec de C.8.5.1). */
export function ecParaEsbeltez(fc: number, wc?: number): number {
  return moduloElasticidad(fc, wc);
}

/* ------------------------------------------------------------------ */
/* C.10.12 – C.10.14                                                     */
/* ------------------------------------------------------------------ */

export type TipoColumnaLosa = 'interior' | 'borde' | 'esquinera';

/** ¿Hay que aplicar C.10.12.1 o C.10.12.2? f′c de la columna mayor que 1.4 (interior/borde) o 1.2 (esquinera) veces el de la losa (C.10.12, PDF p.385, C-83). */
export function requiereTransmisionEspecial(tipo: TipoColumnaLosa, fcColumna: number, fcLosa: number): boolean {
  const lim = tipo === 'esquinera' ? RELACION_FC_COLUMNA_LOSA.esquinera : RELACION_FC_COLUMNA_LOSA.interiorOBorde;
  return fcColumna > lim * fcLosa;
}

/**
 * Resistencia efectiva del concreto de la columna en el nudo (f′c)e, Ecs. C.10-22 a C.10-24 (C.10.12.1, PDF p.385, C-83):
 * interior: 0.25/(h/c2) (f′c)c + [1.4 − 0.35/(h/c2)] (f′c)s ≤ (f′c)c, con h/c2 ≥ 1/3;
 * borde: 1.4 (f′c)s ≤ (f′c)c; esquinera: 1.2 (f′c)s ≤ (f′c)c.
 * h es el espesor total de la losa y c2 la menor dimensión de la sección de la columna.
 */
export function fcEfectivoNudo(tipo: TipoColumnaLosa, fcColumna: number, fcLosa: number, h = 0, c2 = 1): number {
  let fe: number;
  if (tipo === 'interior') {
    const r = Math.max(COCIENTE_H_C2_MIN, h / c2);
    fe = (0.25 / r) * fcColumna + (1.4 - 0.35 / r) * fcLosa;
  } else if (tipo === 'borde') {
    fe = 1.4 * fcLosa;
  } else {
    fe = 1.2 * fcLosa;
  }
  return Math.min(fe, fcColumna);
}

/** Radio de giro máximo de una sección compuesta, Ec. C.10-25 (C.10.13.5, PDF p.386, C-84). */
export function radioGiroCompuesto(Ec: number, Ig: number, Ag: number, Es: number, Isx: number, Asx: number): number {
  return Math.sqrt((Ec * Ig / 5 + Es * Isx) / (Ec * Ag / 5 + Es * Asx));
}

/** EI de una sección compuesta, Ec. C.10-26 (C.10.13.5): (Ec Ig/5)/(1 + βdns) + Es Isx. */
export function rigidezEICompuesto(Ec: number, Ig: number, Es: number, Isx: number, betaDns: number): number {
  return (Ec * Ig) / 5 / (1 + Math.min(1, betaDns)) + Es * Isx;
}

/** Espesor mínimo del acero de confinamiento de núcleos de concreto (C.10.13.6.1, PDF p.386, C-84): b√(fy/3Es) por cara, h√(fy/8Es) en circulares. */
export function espesorMinimoConfinamiento(dimension: number, fy: number, circular = false, Es = ES_ACERO_MPA): number {
  return dimension * Math.sqrt(fy / ((circular ? 8 : 3) * Es));
}

/**
 * Resistencia de diseño al aplastamiento del concreto (C.10.14.1, PDF p.387, C-85):
 * φ (0.85 f′c A1), con φ = 0.65 (C.9.3.2.4); se multiplica por √(A2/A1) ≤ 2 si el apoyo es más ancho en todos los lados.
 * Áreas en mm²; devuelve kN.
 */
export function resistenciaAplastamiento(fc: number, A1: number, A2?: number): { factor: number; phiBn: number } {
  const factor = A2 !== undefined && A2 > A1 ? Math.min(Math.sqrt(A2 / A1), FACTOR_APLASTAMIENTO_MAX) : 1;
  return { factor, phiBn: (PHI_APLASTAMIENTO * 0.85 * fc * A1 * factor) / 1000 };
}
