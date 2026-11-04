/**
 * Diagrama de interacción P–M de columnas de concreto reforzado por compatibilidad de deformaciones
 * (C.10.2 y C.10.3 de la NSR-10, PDF p.377–378, C-75/C-76). Unidades: mm, MPa; resultados en kN y kN·m.
 * Se usa el mismo equilibrio de sección que las vigas (`estadoEnC`).
 *
 * PUNTO DE CONTACTO con C.9: la regla de φ (C.9.3.2) está duplicada en `phiPorDeformacion` de flexionConcreto.ts.
 */
import { beta1 } from './concreto';
import {
  FACTOR_PN_MAX_ESPIRAL,
  FACTOR_PN_MAX_ESTRIBOS,
  PHI_COMPRESION_ESPIRAL,
  PHI_COMPRESION_ESTRIBOS,
  EPS_CU,
  EPS_T_CONTROLADA_TRACCION,
  EPS_T_MIN_FLEXION,
} from '../../data/flexionConcreto';
import {
  cParaCarga,
  epsilonLimiteCompresion,
  estadoEnC,
  phiPorDeformacion,
  profundidadExtrema,
  type CapaAcero,
  type SeccionRect,
} from './flexionConcreto';

export interface EntradaColumna {
  b: number;
  h: number;
  fc: number;
  fy: number;
  capas: readonly CapaAcero[];
  /** Refuerzo en espiral que cumple C.10.9.3 (φ = 0.75 y factor 0.80 en C.10-1); si no, estribos (φ = 0.65 y 0.75 en C.10-2). */
  espiral?: boolean;
}

export interface Armadura {
  capas: CapaAcero[];
  Ast: number;
  nBarras: number;
}

/**
 * Refuerzo distribuido en el perímetro de una sección rectangular (hipótesis del proyecto, no de la norma).
 * `nFilas` filas de barras a lo largo de h (≥ 2); las dos filas extremas llevan `nBarrasCaraB` barras cada una
 * (esquinas incluidas) y las intermedias 2 barras. `dPrime` es la distancia del centroide de las barras extremas a la cara.
 */
export function armaduraPerimetral(h: number, dPrime: number, nBarrasCaraB: number, nFilas: number, areaBarra: number): Armadura {
  const filas = Math.max(2, Math.round(nFilas));
  const nb = Math.max(2, Math.round(nBarrasCaraB));
  const capas: CapaAcero[] = [];
  let n = 0;
  for (let i = 0; i < filas; i++) {
    const y = dPrime + (i * (h - 2 * dPrime)) / (filas - 1);
    const barras = i === 0 || i === filas - 1 ? nb : 2;
    capas.push({ area: barras * areaBarra, y });
    n += barras;
  }
  return { capas, Ast: n * areaBarra, nBarras: n };
}

export const areaBruta = (e: Pick<EntradaColumna, 'b' | 'h'>) => e.b * e.h;
export const areaAcero = (e: Pick<EntradaColumna, 'capas'>) => e.capas.reduce((s, c) => s + c.area, 0);

/** Resistencia axial nominal para excentricidad nula, P0 = 0.85 f′c (Ag − Ast) + fy Ast (kN); es el término entre corchetes de C.10-1/C.10-2. */
export function P0(e: EntradaColumna): number {
  return (0.85 * e.fc * (areaBruta(e) - areaAcero(e)) + e.fy * areaAcero(e)) / 1000;
}

/** φ de las secciones controladas por compresión: 0.75 con espiral, 0.65 con estribos (C.9.3.2.2). */
export function phiCompresion(e: Pick<EntradaColumna, 'espiral'>): number {
  return e.espiral ? PHI_COMPRESION_ESPIRAL : PHI_COMPRESION_ESTRIBOS;
}

/** Pn,max nominal = 0.80 P0 (espiral) o 0.75 P0 (estribos), de las Ecs. C.10-1 y C.10-2 sin φ (kN). */
export function PnMax(e: EntradaColumna): number {
  return (e.espiral ? FACTOR_PN_MAX_ESPIRAL : FACTOR_PN_MAX_ESTRIBOS) * P0(e);
}

/** φPn,max de las Ecs. C.10-1 (espiral, 0.80φ[...]) y C.10-2 (estribos, 0.75φ[...]), en kN (C.10.3.6, PDF p.378, C-76). */
export function phiPnMax(e: EntradaColumna): number {
  return phiCompresion(e) * PnMax(e);
}

/** Resistencia a tracción pura, Tn = fy Ast (kN, valor positivo). */
export function traccionPura(e: EntradaColumna): number {
  return (e.fy * areaAcero(e)) / 1000;
}

export interface PuntoInteraccion {
  /** Profundidad del eje neutro (mm); null para P0 y tracción pura. */
  c: number | null;
  Pn: number;
  Mn: number;
  epsT: number;
  phi: number;
  /** φPn sin recortar y φMn. */
  phiPnSinTope: number;
  phiPn: number;
  phiMn: number;
  etiqueta?: 'P0' | 'balanceado' | 'epsT-0.005' | 'flexion-pura' | 'tension-pura' | 'limite-compresion';
}

const seccion = (e: EntradaColumna): SeccionRect => ({ b: e.b, h: e.h, fc: e.fc, fy: e.fy, capas: e.capas });

function puntoEnC(e: EntradaColumna, c: number, etiqueta?: PuntoInteraccion['etiqueta']): PuntoInteraccion {
  const est = estadoEnC(seccion(e), c);
  const phi = phiPorDeformacion(est.epsT, e.fy, e.espiral);
  const tope = phiPnMax(e);
  const phiPnSinTope = phi * est.Pn;
  return {
    c,
    Pn: est.Pn,
    Mn: est.Mn,
    epsT: est.epsT,
    phi,
    phiPnSinTope,
    phiPn: Math.min(phiPnSinTope, tope),
    phiMn: phi * est.Mn,
    etiqueta,
  };
}

/** c para una deformación neta de tracción objetivo εt en el acero extremo: c = εcu dt / (εcu + εt). */
export function cParaEpsT(e: EntradaColumna, epsT: number): number {
  return (EPS_CU * profundidadExtrema(e)) / (EPS_CU + epsT);
}

/** Punto balanceado (εt = fy/Es, C.10.3.2). */
export function puntoBalanceado(e: EntradaColumna): PuntoInteraccion {
  return puntoEnC(e, cParaEpsT(e, e.fy / 200_000), 'balanceado');
}

/** Punto con εt = 0.005 (límite de las secciones controladas por tracción, C.10.3.4). */
export function puntoControladoTraccion(e: EntradaColumna): PuntoInteraccion {
  return puntoEnC(e, cParaEpsT(e, EPS_T_CONTROLADA_TRACCION), 'epsT-0.005');
}

/** Punto de flexión pura (Pn = 0). */
export function puntoFlexionPura(e: EntradaColumna): PuntoInteraccion | null {
  const c = cParaCarga(seccion(e), 0);
  return c === null ? null : puntoEnC(e, c, 'flexion-pura');
}

/** Punto de compresión axial pura (excentricidad nula): Pn = P0, Mn = 0 (sección simétrica). */
export function puntoP0(e: EntradaColumna): PuntoInteraccion {
  const p0 = P0(e);
  const phi = phiCompresion(e);
  return {
    c: null,
    Pn: p0,
    Mn: 0,
    epsT: EPS_CU,
    phi,
    phiPnSinTope: phi * p0,
    phiPn: Math.min(phi * p0, phiPnMax(e)),
    phiMn: 0,
    etiqueta: 'P0',
  };
}

/** Punto de tracción pura: Pn = −fy Ast, Mn = 0. */
export function puntoTraccionPura(e: EntradaColumna): PuntoInteraccion {
  const t = -traccionPura(e);
  return { c: null, Pn: t, Mn: 0, epsT: Infinity, phi: 0.9, phiPnSinTope: 0.9 * t, phiPn: 0.9 * t, phiMn: 0, etiqueta: 'tension-pura' };
}

export interface CurvaInteraccion {
  /** Puntos ordenados de compresión pura (P0) a tracción pura. */
  puntos: PuntoInteraccion[];
  P0: number;
  PnMax: number;
  phiPnMax: number;
  beta1: number;
  balanceado: PuntoInteraccion;
  flexionPura: PuntoInteraccion | null;
  controladoTraccion: PuntoInteraccion;
}

/**
 * Curva nominal (Pn, Mn) y de diseño (φPn recortada en φPn,max, φMn) barriendo la profundidad del eje neutro c
 * desde c → ∞ (P0) hasta c → 0 (tracción pura), con los puntos notables (balanceado, εt = 0.005, flexión pura) incluidos.
 */
export function curvaInteraccion(e: EntradaColumna, nPuntos = 60): CurvaInteraccion {
  const h = e.h;
  const dt = profundidadExtrema(e);
  const cMin = 0.03 * dt;
  const cMax = Math.max(h / beta1(e.fc), dt) * 1.0;
  const bal = puntoBalanceado(e);
  const traccion = puntoControladoTraccion(e);
  const cLimiteComp = cParaEpsT(e, epsilonLimiteCompresion(e.fy));
  const pura = puntoFlexionPura(e);
  const cs = new Set<number>();
  // Tramo de c entre cMin y cMax (progresión geométrica) y puntos notables.
  for (let i = 0; i <= nPuntos; i++) cs.add(cMin * (cMax / cMin) ** (i / nPuntos));
  // Más allá de h/β1 el bloque está limitado a h: P crece hacia P0 y M decrece.
  for (let i = 1; i <= 12; i++) cs.add(cMax * (1 + i * 0.4));
  cs.add(bal.c!);
  cs.add(traccion.c!);
  cs.add(cLimiteComp);
  if (pura) cs.add(pura.c!);
  const cOrden = [...cs].sort((a, b) => b - a);
  const mapaEtiqueta = new Map<number, PuntoInteraccion['etiqueta']>([
    [bal.c!, 'balanceado'],
    [traccion.c!, 'epsT-0.005'],
    [cLimiteComp, 'limite-compresion'],
  ]);
  if (pura) mapaEtiqueta.set(pura.c!, 'flexion-pura');
  const intermedios = cOrden.map((c) => puntoEnC(e, c, mapaEtiqueta.get(c)));
  const puntos = [puntoP0(e), ...intermedios, puntoTraccionPura(e)];
  return {
    puntos: insertarCruceTope(puntos, phiPnMax(e)),
    P0: P0(e),
    PnMax: PnMax(e),
    phiPnMax: phiPnMax(e),
    beta1: beta1(e.fc),
    balanceado: bal,
    flexionPura: pura,
    controladoTraccion: traccion,
  };
}

/** Inserta el punto donde φPn sin recortar cruza φPn,max (para que el tope horizontal de la curva de diseño sea exacto). */
function insertarCruceTope(puntos: PuntoInteraccion[], tope: number): PuntoInteraccion[] {
  const salida: PuntoInteraccion[] = [];
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    if (i > 0) {
      const q = puntos[i - 1];
      if (q.phiPnSinTope > tope && p.phiPnSinTope < tope) {
        const t = (q.phiPnSinTope - tope) / (q.phiPnSinTope - p.phiPnSinTope);
        const Mn = q.Mn + t * (p.Mn - q.Mn);
        const phiMn = q.phiMn + t * (p.phiMn - q.phiMn);
        salida.push({ ...p, c: null, Mn, phiMn, phiPnSinTope: tope, phiPn: tope, Pn: q.Pn + t * (p.Pn - q.Pn), etiqueta: undefined });
      }
    }
    salida.push(p);
  }
  return salida;
}

/** Valor de φMn de la curva de diseño para un φPn = P dado: la mayor φMn de los segmentos que cruzan P. null si P está fuera del rango. */
export function phiMnParaCarga(puntos: readonly PuntoInteraccion[], P: number, usarDiseno = true): number | null {
  const xs = puntos.map((p) => (usarDiseno ? p.phiMn : p.Mn));
  const ys = puntos.map((p) => (usarDiseno ? p.phiPn : p.Pn));
  let mejor: number | null = null;
  for (let i = 1; i < puntos.length; i++) {
    const y0 = ys[i - 1];
    const y1 = ys[i];
    if ((P - y0) * (P - y1) <= 0) {
      const t = y1 === y0 ? 0 : (P - y0) / (y1 - y0);
      const m = xs[i - 1] + t * (xs[i] - xs[i - 1]);
      if (mejor === null || m > mejor) mejor = m;
    }
  }
  return mejor;
}

export interface VerificacionColumna {
  Pu: number;
  Mu: number;
  /** Excentricidad e = Mu/Pu (mm); null si Pu = 0. */
  excentricidad: number | null;
  /** φMn de la curva de diseño con φPn = Pu (kN·m); null si Pu excede φPn,max o la tracción de diseño. */
  phiMnDisponible: number | null;
  /** Mu / φMn: ≤ 1 verifica. */
  razon: number;
  cumple: boolean;
  motivo: 'ok' | 'Pu-excede-tope' | 'Pu-excede-traccion' | 'Mu-excede';
}

/** Verifica una pareja (Pu, Mu) contra la curva de diseño (C.10.3.6 y C.10.3.7). Pu > 0 es compresión. */
export function verificarPunto(curva: CurvaInteraccion, Pu: number, Mu: number): VerificacionColumna {
  const M = Math.abs(Mu);
  const excentricidad = Pu === 0 ? null : (M / Math.abs(Pu)) * 1000;
  const traccionDiseno = Math.min(...curva.puntos.map((p) => p.phiPn));
  if (Pu > curva.phiPnMax + 1e-9) return { Pu, Mu: M, excentricidad, phiMnDisponible: null, razon: Infinity, cumple: false, motivo: 'Pu-excede-tope' };
  if (Pu < traccionDiseno - 1e-9) return { Pu, Mu: M, excentricidad, phiMnDisponible: null, razon: Infinity, cumple: false, motivo: 'Pu-excede-traccion' };
  const cap = phiMnParaCarga(curva.puntos, Pu) ?? 0;
  const razon = cap > 0 ? M / cap : M > 0 ? Infinity : 0;
  return { Pu, Mu: M, excentricidad, phiMnDisponible: cap, razon, cumple: razon <= 1 + 1e-9, motivo: razon <= 1 + 1e-9 ? 'ok' : 'Mu-excede' };
}

/** Aviso de C.10.3.5: εt ≥ 0.004 solo se exige a flexión y a carga axial mayorada menor que 0.10 f′c Ag. */
export function aplicaLimiteEpsT(Pu: number, fc: number, Ag: number): boolean {
  return Pu < (0.1 * fc * Ag) / 1000;
}
export { EPS_T_MIN_FLEXION };
