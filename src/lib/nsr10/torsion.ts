/**
 * Torsión — Sección C.11.5 de la NSR-10 (PDF p.393–398, C-91 a C-96).
 * Unidades: f′c, fy, fyt y esfuerzos en MPa; dimensiones en mm; áreas en mm² (A) o mm²/mm (At/s);
 * fuerzas en kN; momentos torsores Tu y Tn en kN·m. Solo secciones rectangulares macizas para las propiedades
 * geométricas; las ecuaciones de resistencia son generales.
 */
import { raizFcCortante } from './concreto';
import { avMin } from './cortante';
import { PHI_CORTANTE_TORSION, TORSION } from '../../data/cortanteTorsion';

const aRad = (g: number) => (g * Math.PI) / 180;
const cot = (g: number) => 1 / Math.tan(aRad(g));

export type PropiedadesTorsion = {
  /** Área encerrada por el perímetro exterior de la sección de concreto (b·h), mm². */
  Acp: number;
  /** Perímetro exterior de la sección de concreto, mm. */
  pcp: number;
  /** Dimensiones entre ejes del estribo cerrado exterior, mm. */
  x0: number;
  y0: number;
  /** Área encerrada por el eje del estribo cerrado más externo, mm². */
  Aoh: number;
  /** Perímetro del eje del estribo cerrado más externo, mm. */
  ph: number;
  /** Área bruta encerrada por la trayectoria del flujo de cortante; se permite 0.85 Aoh (C.11.5.3.6), mm². */
  Ao: number;
};

/**
 * Propiedades geométricas para torsión de una sección rectangular (definiciones de C.2.2):
 * Acp = b h, pcp = 2(b + h); x0 = b − 2c − db, y0 = h − 2c − db medidos entre ejes del estribo (c = recubrimiento libre
 * al estribo, db = diámetro del estribo), Aoh = x0 y0, ph = 2(x0 + y0), Ao = 0.85 Aoh (C.11.5.3.6).
 */
export function propiedadesRectangular(p: { b: number; h: number; recubrimiento: number; dEstribo: number }): PropiedadesTorsion {
  const { b, h, recubrimiento, dEstribo } = p;
  const x0 = b - 2 * recubrimiento - dEstribo;
  const y0 = h - 2 * recubrimiento - dEstribo;
  if (x0 <= 0 || y0 <= 0) throw new RangeError('Recubrimiento y estribo demasiado grandes para la sección');
  const Aoh = x0 * y0;
  return { Acp: b * h, pcp: 2 * (b + h), x0, y0, Aoh, ph: 2 * (x0 + y0), Ao: TORSION.aoSobreAoh * Aoh };
}

export type TipoUmbral = 'no-preesforzado' | 'preesforzado' | 'axial';

/**
 * Factor de corrección por esfuerzo axial o de preesforzado: √(1 + σ / (0.33 λ √f′c)), con σ en MPa
 * (σ = fpc en preesforzados; σ = Nu/Ag en elementos no preesforzados con fuerza axial; Nu > 0 en compresión).
 */
function factorAxial(sigma: number, fc: number, lambda: number): number {
  const v = 1 + sigma / (0.33 * lambda * Math.sqrt(fc));
  return v > 0 ? Math.sqrt(v) : 0;
}

/**
 * Umbral de torsión en kN·m (C.11.5.1, C-92/C-93): se puede despreciar la torsión si Tu < este valor.
 * (a) no preesforzado: φ 0.083 λ √f′c (Acp²/pcp);
 * (b) preesforzado: × √(1 + fpc / (0.33 λ √f′c));
 * (c) no preesforzado con fuerza axial: × √(1 + Nu / (0.33 Ag λ √f′c)).
 * Para secciones huecas se usa Ag en lugar de Acp en el término Acp²/pcp (C.11.5.1).
 */
export function umbralTorsion(p: {
  fc: number;
  Acp: number;
  pcp: number;
  lambda?: number;
  phi?: number;
  tipo?: TipoUmbral;
  /** Esfuerzo de compresión en el centroide por el preesforzado efectivo (MPa). */
  fpc?: number;
  /** Fuerza axial mayorada (kN, + compresión). */
  Nu?: number;
  Ag?: number;
}): number {
  const { fc, Acp, pcp, lambda = 1, phi = PHI_CORTANTE_TORSION, tipo = 'no-preesforzado' } = p;
  const base = (phi * TORSION.umbral * lambda * raizFcCortante(fc) * (Acp * Acp)) / pcp / 1e6;
  if (tipo === 'preesforzado') return base * factorAxial(p.fpc ?? 0, fc, lambda);
  if (tipo === 'axial') {
    if (!p.Ag) throw new RangeError('Ag es necesaria con fuerza axial');
    return base * factorAxial(((p.Nu ?? 0) * 1000) / p.Ag, fc, lambda);
  }
  return base;
}

/**
 * Máximo Tu en kN·m al que se permite reducir la torsión por redistribución en estructuras indeterminadas
 * (C.11.5.2.2, C-93): φ 0.33 λ √f′c (Acp²/pcp), con las mismas correcciones por preesforzado o fuerza axial.
 */
export function torsionMaximaRedistribuida(p: Parameters<typeof umbralTorsion>[0]): number {
  return (umbralTorsion(p) * TORSION.redistribucion) / TORSION.umbral;
}

export type ResultadoSeccionTorsion = {
  /** Lado izquierdo de la Ec. C.11-18 o C.11-19, MPa. */
  izquierdo: number;
  /** Lado derecho φ (Vc/(bw d) + 0.66 √f′c), MPa. */
  derecho: number;
  cumple: boolean;
};

/**
 * Verificación de las dimensiones de la sección (C.11.5.3.1, C-94):
 * macizas (C.11-18): √[(Vu/(bw d))² + (Tu ph/(1.7 Aoh²))²] ≤ φ (Vc/(bw d) + 0.66 √f′c);
 * huecas (C.11-19): Vu/(bw d) + Tu ph/(1.7 Aoh²) ≤ φ (Vc/(bw d) + 0.66 √f′c).
 * Vu y Vc en kN; Tu en kN·m.
 */
export function verificarSeccionTorsion(p: {
  Vu: number;
  Tu: number;
  bw: number;
  d: number;
  Vc: number;
  fc: number;
  ph: number;
  Aoh: number;
  hueca?: boolean;
  phi?: number;
}): ResultadoSeccionTorsion {
  const { Vu, Tu, bw, d, Vc, fc, ph, Aoh, hueca = false, phi = PHI_CORTANTE_TORSION } = p;
  const tauV = (Vu * 1000) / (bw * d);
  const tauT = (Tu * 1e6 * ph) / (TORSION.divisorAoh * Aoh * Aoh);
  const izquierdo = hueca ? tauV + tauT : Math.hypot(tauV, tauT);
  const derecho = phi * ((Vc * 1000) / (bw * d) + TORSION.limiteSeccion * raizFcCortante(fc));
  return { izquierdo, derecho, cumple: izquierdo <= derecho + 1e-9 };
}

/** θ de diseño por defecto: 45° (no preesforzado) o 37.5° (preesforzado con ≥ 40 %) (C.11.5.3.6, C-94). */
export const thetaPorDefecto = (preesforzado = false): number => (preesforzado ? TORSION.thetaPreesforzado : TORSION.thetaNoPreesforzado);

/** At/s requerido en mm²/mm (una rama del estribo), de φ Tn ≥ Tu con Tn = 2 Ao At fyt cot θ / s (Ecs. C.11-20 y C.11-21, C-94). */
export function atSobreS(p: { Tu: number; Ao: number; fyt: number; thetaGrados?: number; phi?: number }): number {
  const { Tu, Ao, fyt, thetaGrados = 45, phi = PHI_CORTANTE_TORSION } = p;
  if (thetaGrados < TORSION.thetaMinGrados || thetaGrados > TORSION.thetaMaxGrados) throw new RangeError('θ debe estar entre 30° y 60° (C.11.5.3.6)');
  return (Tu * 1e6) / (phi * 2 * Ao * Math.min(fyt, TORSION.fyMax) * cot(thetaGrados));
}

/** Tn en kN·m (Ec. C.11-21): 2 Ao At fyt cot θ / s. */
export function tnTorsion(p: { Ao: number; At: number; s: number; fyt: number; thetaGrados?: number }): number {
  const { Ao, At, s, fyt, thetaGrados = 45 } = p;
  return (2 * Ao * At * Math.min(fyt, TORSION.fyMax) * cot(thetaGrados)) / s / 1e6;
}

/** Refuerzo longitudinal adicional por torsión Aℓ en mm² (Ec. C.11-22, C-95): (At/s) ph (fyt/fy) cot² θ. */
export function alTorsion(p: { atSobreS: number; ph: number; fyt: number; fy: number; thetaGrados?: number }): number {
  const { atSobreS: ats, ph, fyt, fy, thetaGrados = 45 } = p;
  return ats * ph * (fyt / fy) * cot(thetaGrados) ** 2;
}

/** Av + 2At mínimo, mm² (Ec. C.11-23, C-96): 0.062 √f′c bw s / fyt, no menor que 0.35 bw s / fyt. Igual a Av,min de C.11-13. */
export const avMas2AtMin = (p: { fc: number; bw: number; s: number; fyt: number }): number => avMin(p);

/**
 * Aℓ,min en mm² (Ec. C.11-24, C-96): 0.42 √f′c Acp / fy − (At/s) ph fyt/fy, con At/s no menor que 0.175 bw / fyt.
 * `atSobreS` es el At/s calculado por resistencia (C.11-21); si es menor que el límite, se usa el límite.
 */
export function alMin(p: { fc: number; Acp: number; fy: number; fyt: number; ph: number; atSobreS: number; bw: number }): number {
  const { fc, Acp, fy, fyt, ph, bw } = p;
  const ats = Math.max(p.atSobreS, (TORSION.atSobreSMinimo * bw) / fyt);
  return Math.max(0, (TORSION.alMinCoefRaiz * raizFcCortante(fc) * Acp) / fy - ats * ph * (fyt / fy));
}

/** Separación máxima de estribos de torsión en mm: menor de ph/8 y 300 (C.11.5.6.1, C-96). */
export const separacionMaxTorsion = (ph: number): number => Math.min(ph * TORSION.separacionMaxFraccionPh, TORSION.separacionMaxMm);

/** Diámetro mínimo de la barra longitudinal de torsión en mm: 0.042 s, no menos de 10 mm (C.11.5.6.2, C-96). */
export const diametroMinLongitudinalTorsion = (s: number): number => Math.max(TORSION.diametroLongitudinalFraccionS * s, TORSION.diametroLongitudinalMinMm);

export type EntradaDisenoTorsion = {
  b: number;
  h: number;
  d: number;
  recubrimiento: number;
  dEstribo: number;
  fc: number;
  fy: number;
  fyt: number;
  Vu: number;
  Tu: number;
  Vc: number;
  lambda?: number;
  thetaGrados?: number;
  phi?: number;
};

/**
 * Diseño por torsión y cortante combinados de una viga rectangular de concreto no preesforzado (C.11.5.3 a C.11.5.6):
 * umbral → verificación de la sección → At/s y Av/s → (Av + 2At)/s requerido (con el mínimo de C.11-23) → Aℓ (C.11-22)
 * y Aℓ,min (C.11-24).
 */
export function disenoTorsionYCortante(e: EntradaDisenoTorsion) {
  const { b, h, d, fc, fy, fyt, Vu, Tu, Vc, lambda = 1, thetaGrados = 45, phi = PHI_CORTANTE_TORSION } = e;
  const geo = propiedadesRectangular({ b, h, recubrimiento: e.recubrimiento, dEstribo: e.dEstribo });
  const umbral = umbralTorsion({ fc, Acp: geo.Acp, pcp: geo.pcp, lambda, phi });
  const requiereTorsion = Tu > umbral;
  const seccion = verificarSeccionTorsion({ Vu, Tu, bw: b, d, Vc, fc, ph: geo.ph, Aoh: geo.Aoh, phi });
  const AtS = requiereTorsion ? atSobreS({ Tu, Ao: geo.Ao, fyt, thetaGrados, phi }) : 0;
  const VsReq = Math.max(0, Vu / phi - Vc); // kN
  const AvS = (VsReq * 1000) / (Math.min(fyt, 420) * d); // mm²/mm
  const totalPorS = AvS + 2 * AtS; // (Av + 2At)/s requerido por resistencia
  const minimoPorS = avMin({ fc, bw: b, s: 1, fyt });
  const AlReq = requiereTorsion ? alTorsion({ atSobreS: AtS, ph: geo.ph, fyt, fy, thetaGrados }) : 0;
  const AlMin = requiereTorsion ? alMin({ fc, Acp: geo.Acp, fy, fyt, ph: geo.ph, atSobreS: AtS, bw: b }) : 0;
  return {
    geo,
    umbral,
    requiereTorsion,
    seccion,
    AtS,
    AvS,
    totalPorS,
    minimoPorS,
    /** (Av + 2At)/s de diseño = el mayor entre el requerido y el mínimo. */
    disenoPorS: requiereTorsion ? Math.max(totalPorS, minimoPorS) : totalPorS,
    sMax: separacionMaxTorsion(geo.ph),
    Al: Math.max(AlReq, AlMin),
    AlReq,
    AlMin,
  };
}
