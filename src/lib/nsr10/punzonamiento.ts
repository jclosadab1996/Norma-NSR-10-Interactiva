/**
 * Cortante en dos direcciones (punzonamiento) de losas y zapatas — Sección C.11.11 de la NSR-10
 * (PDF p.402–407, C-100 a C-105). Unidades: f′c en MPa; c1, c2, d, bo, s en mm; áreas en mm²; fuerzas en kN.
 */
import { raizFcVc } from './cortante';
import {
  ALPHA_S,
  PHI_CORTANTE_TORSION,
  REFUERZO_CORTANTE_LOSAS,
  SECCION_CRITICA_DISTANCIA_FRACCION_D,
  VC_DOS_DIRECCIONES,
  VC_DOS_DIRECCIONES_PREESFORZADO,
  type UbicacionColumna,
} from '../../data/cortanteTorsion';

export type { UbicacionColumna };

const kN = (n: number) => n / 1000;

/**
 * Perímetro bo de la sección crítica en mm (C.11.11.1.2, C-101), a d/2 de las caras de la columna con cuatro lados
 * rectos (C.11.11.1.3). Convención (mía, la norma no la fija): en columnas de borde y de esquina la cara exterior de la
 * columna está al ras del borde de la losa y c1 se mide perpendicular a ese borde (en la esquina, c1 y c2 llegan al
 * borde). Así:
 * - interior: bo = 2(c1 + d) + 2(c2 + d);
 * - borde: bo = 2(c1 + d/2) + (c2 + d);
 * - esquina: bo = (c1 + d/2) + (c2 + d/2).
 */
export function perimetroCritico(p: { c1: number; c2: number; d: number; ubicacion: UbicacionColumna }): number {
  const { c1, c2, d, ubicacion } = p;
  const m = SECCION_CRITICA_DISTANCIA_FRACCION_D * d;
  if (ubicacion === 'interior') return 2 * (c1 + d) + 2 * (c2 + d);
  if (ubicacion === 'borde') return 2 * (c1 + m) + (c2 + d);
  return c1 + m + (c2 + m);
}

/** Área encerrada por la sección crítica (mm²), con la misma convención que `perimetroCritico`. */
export function areaSeccionCritica(p: { c1: number; c2: number; d: number; ubicacion: UbicacionColumna }): number {
  const { c1, c2, d, ubicacion } = p;
  const m = SECCION_CRITICA_DISTANCIA_FRACCION_D * d;
  if (ubicacion === 'interior') return (c1 + d) * (c2 + d);
  if (ubicacion === 'borde') return (c1 + m) * (c2 + d);
  return (c1 + m) * (c2 + m);
}

/** β = lado largo / lado corto de la columna, carga concentrada o área de reacción (C.11.11.2.1(a), C-101). */
export const betaColumna = (c1: number, c2: number): number => Math.max(c1, c2) / Math.min(c1, c2);

export type ResultadoVcDosDirecciones = {
  bo: number;
  beta: number;
  alphaS: number;
  /** Ec. C.11-31: 0.17 (1 + 2/β) λ √f′c bo d. */
  vcA: number;
  /** Ec. C.11-32: 0.083 (αs d/bo + 2) λ √f′c bo d. */
  vcB: number;
  /** Ec. C.11-33: 0.33 λ √f′c bo d. */
  vcC: number;
  /** Vc = menor de las tres (C.11.11.2.1), kN. */
  Vc: number;
  gobierna: 'C.11-31' | 'C.11-32' | 'C.11-33';
};

/** Vc en dos direcciones de losas no preesforzadas y zapatas (Ecs. C.11-31 a C.11-33, C.11.11.2.1, C-101/C-102). */
export function vcDosDirecciones(p: { fc: number; d: number; c1: number; c2: number; ubicacion: UbicacionColumna; lambda?: number; bo?: number }): ResultadoVcDosDirecciones {
  const { fc, d, c1, c2, ubicacion, lambda = 1 } = p;
  const bo = p.bo ?? perimetroCritico({ c1, c2, d, ubicacion });
  const beta = betaColumna(c1, c2);
  const alphaS = ALPHA_S[ubicacion];
  const base = lambda * raizFcVc(fc) * bo * d;
  const vcA = kN(VC_DOS_DIRECCIONES.c1131.coef * (1 + VC_DOS_DIRECCIONES.c1131.dos / beta) * base);
  const vcB = kN(VC_DOS_DIRECCIONES.c1132.coef * ((alphaS * d) / bo + VC_DOS_DIRECCIONES.c1132.dos) * base);
  const vcC = kN(VC_DOS_DIRECCIONES.c1133.coef * base);
  const Vc = Math.min(vcA, vcB, vcC);
  const gobierna = Vc === vcA ? 'C.11-31' : Vc === vcB ? 'C.11-32' : 'C.11-33';
  return { bo, beta, alphaS, vcA, vcB, vcC, Vc, gobierna };
}

/** Vc de losas preesforzadas en dos direcciones y zapatas con C.18.9.3 (Ec. C.11-34, C.11.11.2.2, C-102), kN. */
export function vcDosDireccionesPreesforzado(p: {
  fc: number;
  d: number;
  bo: number;
  ubicacion: UbicacionColumna;
  fpc: number;
  Vp?: number;
  lambda?: number;
}): { Vc: number; betaP: number } {
  const { fc, d, bo, ubicacion, fpc, Vp = 0, lambda = 1 } = p;
  const c = VC_DOS_DIRECCIONES_PREESFORZADO;
  const betaP = Math.min(c.betaPMax, c.betaPCoef * ((ALPHA_S[ubicacion] * d) / bo + c.betaPSuma));
  const Vc = kN((betaP * lambda * raizFcVc(fc) + c.coefFpc * fpc) * bo * d) + Vp;
  return { Vc, betaP };
}

export type TipoRefuerzoPunzonamiento = 'ninguno' | 'estribos' | 'pernos';

export type EntradaPunzonamiento = {
  fc: number;
  d: number;
  c1: number;
  c2: number;
  ubicacion: UbicacionColumna;
  /** Vu en la sección crítica (kN), sin transferencia de momento. */
  Vu: number;
  lambda?: number;
  phi?: number;
  refuerzo?: TipoRefuerzoPunzonamiento;
  /** Área de todas las ramas de una línea periférica (mm²). */
  Av?: number;
  /** Separación entre líneas periféricas (mm). */
  s?: number;
  fyt?: number;
  /** Diámetro de la barra del refuerzo de cortante (mm), para la condición d ≥ 16 db. */
  dbCortante?: number;
};

export type ResultadoPunzonamiento = ResultadoVcDosDirecciones & {
  refuerzo: TipoRefuerzoPunzonamiento;
  /** Vc usado en Vn (kN): el de las tres expresiones, limitado por el refuerzo de cortante si lo hay. */
  VcUsado: number;
  Vs: number;
  /** Límite de Vn con refuerzo (kN); Infinity sin refuerzo. */
  VnMax: number;
  Vn: number;
  phi: number;
  phiVn: number;
  cumple: boolean;
  /** φVc sin refuerzo, para comparar. */
  phiVcSinRefuerzo: number;
  /** Relación Vu/φVn (demanda/capacidad). */
  relacion: number;
  avisos: string[];
  /** Av fy/(bo s) en MPa (pernos) y mínimo 0.17 √f′c. */
  avFySobreBoS?: number;
  avFySobreBoSMin?: number;
};

/**
 * Verificación de cortante en dos direcciones sin momento no balanceado (C.11.11.2 a C.11.11.5): φVn ≥ Vu.
 * Sin refuerzo: Vn = Vc (menor de C.11-31 a C.11-33). Con estribos (C.11.11.3): Vc ≤ 0.17 λ √f′c bo d, Vs = Av fyt d/s,
 * Vn ≤ 0.5 √f′c bo d. Con pernos con cabeza (C.11.11.5): Vc ≤ 0.25 λ √f′c bo d, Vn ≤ 0.66 √f′c bo d y Av fy/(bo s) ≥ 0.17 √f′c.
 */
export function verificarPunzonamiento(e: EntradaPunzonamiento): ResultadoPunzonamiento {
  const { fc, d, Vu, lambda = 1, phi = PHI_CORTANTE_TORSION, refuerzo = 'ninguno' } = e;
  const base = vcDosDirecciones(e);
  const bo = base.bo;
  const raiz = raizFcVc(fc);
  const avisos: string[] = [];
  let VcUsado = base.Vc;
  let Vs = 0;
  let VnMax = Infinity;
  let avFySobreBoS: number | undefined;
  let avFySobreBoSMin: number | undefined;

  if (refuerzo !== 'ninguno') {
    const { Av, s, fyt } = e;
    if (!Av || !s || !fyt) throw new RangeError('Con refuerzo de cortante se requieren Av, s y fyt');
    const cfg = REFUERZO_CORTANTE_LOSAS[refuerzo];
    VcUsado = Math.min(base.Vc, kN(cfg.vcMax * lambda * raiz * bo * d));
    Vs = kN((Av * fyt * d) / s);
    VnMax = kN(cfg.vnMax * raiz * bo * d);
    if (d < REFUERZO_CORTANTE_LOSAS.dMinMm) avisos.push('d < 150 mm: no se permite refuerzo de cortante (C.11.11.3).');
    if (e.dbCortante && d < REFUERZO_CORTANTE_LOSAS.dMinVecesDiametroBarra * e.dbCortante) avisos.push('d < 16 db del refuerzo de cortante (C.11.11.3).');
    if (refuerzo === 'pernos') {
      avFySobreBoS = (Av * fyt) / (bo * s);
      avFySobreBoSMin = REFUERZO_CORTANTE_LOSAS.pernos.avMinCoef * raiz;
      if (avFySobreBoS < avFySobreBoSMin) avisos.push('Av fy/(bo s) < 0.17 √f′c: falta cuantía de pernos (C.11.11.5.1).');
    }
  }
  const VnSinTope = VcUsado + Vs;
  const Vn = Math.min(VnSinTope, VnMax);
  if (VnSinTope > VnMax) avisos.push('Vn está limitado por el máximo del refuerzo de cortante: considera aumentar d o el área de apoyo.');
  const phiVn = phi * Vn;
  return {
    ...base,
    refuerzo,
    VcUsado,
    Vs,
    VnMax,
    Vn,
    phi,
    phiVn,
    cumple: phiVn >= Vu - 1e-9,
    phiVcSinRefuerzo: phi * base.Vc,
    relacion: Vu / phiVn,
    avisos,
    avFySobreBoS,
    avFySobreBoSMin,
  };
}

/**
 * Perímetro exterior mínimo (mm) a partir del cual ya no hace falta refuerzo de cortante: el esfuerzo a d/2 fuera de la
 * línea más externa no debe exceder φ 0.17 λ √f′c (C.11.11.5.4 y C.11.11.7.2(b), C-104/C-105): bo,ext = Vu / (φ 0.17 λ √f′c d).
 */
export function perimetroExteriorMinimo(p: { Vu: number; d: number; fc: number; lambda?: number; phi?: number }): number {
  const { Vu, d, fc, lambda = 1, phi = PHI_CORTANTE_TORSION } = p;
  return (Vu * 1000) / (phi * REFUERZO_CORTANTE_LOSAS.pernos.esfuerzoExteriorCoef * lambda * raizFcVc(fc) * d);
}

/** Separación máxima entre líneas periféricas de pernos con cabeza (mm), C.11.11.5.2: 0.75d si vu ≤ 0.5 φ √f′c; 0.5d si es mayor. */
export function separacionMaxLineasPernos(p: { d: number; fc: number; vuMPa: number; phi?: number }): number {
  const { d, fc, vuMPa, phi = PHI_CORTANTE_TORSION } = p;
  const c = REFUERZO_CORTANTE_LOSAS.pernos;
  return (vuMPa <= c.umbralEsfuerzoCoef * phi * raizFcVc(fc) ? c.separacionLineasFraccionD : c.separacionLineasFraccionDAlta) * d;
}

/** γv = 1 − γf, fracción del momento no balanceado transferida por excentricidad de cortante (Ec. C.11-37, C-104). γf sale de C.13.5.3. */
export const gammaV = (gammaF: number): number => 1 - gammaF;

/**
 * Cortante de punzonamiento de una zapata cuadrada o rectangular con columna interior (estática, no es texto de la norma):
 * Vu = Pu − qu · área encerrada por la sección crítica, con qu = Pu / (B L). Pu en kN, B y L en m; c1, c2, d en mm.
 */
export function cortanteZapata(p: { Pu: number; B: number; L: number; c1: number; c2: number; d: number }): { qu: number; Vu: number; area: number } {
  const { Pu, B, L, c1, c2, d } = p;
  const qu = Pu / (B * L); // kPa
  const area = areaSeccionCritica({ c1, c2, d, ubicacion: 'interior' }) / 1e6; // m²
  return { qu, Vu: Pu - qu * area, area };
}
