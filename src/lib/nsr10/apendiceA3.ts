import { G } from './fuerzaHorizontal';

/**
 * Apéndice A-3 — Procedimiento no lineal estático de plastificación progresiva («push-over»)
 * (PDF 191–196, págs. A-147 a A-152). El apéndice NO es obligatorio (se incluye «para que se estudie
 * preliminarmente»); estas funciones solo reproducen sus ecuaciones para fines didácticos.
 *
 * Unidades del SI: fuerzas en N (o kN si se usa de forma coherente), desplazamientos en m,
 * masas en kg, períodos en s.
 */

/** Punto de la curva de capacidad: desplazamiento del punto de control δ y fuerza lateral total V. */
export type PuntoCurva = { d: number; v: number };

/** A-3.2-1 — Período efectivo: Te = T1·√[(V1/δ1)/(Vy/δy)]. */
export function periodoEfectivoPushover(t1: number, v1: number, d1: number, vy: number, dy: number): number {
  return t1 * Math.sqrt(v1 / d1 / (vy / dy));
}

/** A-3.2-3 — C0 = Σ(mi·φi)/Σ(mi·φi²): relaciona el desplazamiento del punto de control con el del sistema de 1 GDL. */
export function coeficienteC0(masas: readonly number[], formaModo: readonly number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < masas.length; i++) {
    num += masas[i] * formaModo[i];
    den += masas[i] * formaModo[i] ** 2;
  }
  return num / den;
}

/** A-3.2-5 — Rd = Sa·M·g/Vy (Sa como fracción de g; M en kg; Vy en N). */
export function factorRd(sa: number, masaTotalKg: number, vy: number): number {
  return (sa * masaTotalKg * G) / vy;
}

/**
 * A-3.2-4 — C1 = [1 + (Rd − 1)·TC/Te]/Rd si Te ≤ TC; C1 = 1.0 si Te > TC.
 * Corrige por la influencia del comportamiento inelástico en períodos cortos.
 */
export function coeficienteC1(te: number, tc: number, rd: number): number {
  if (te > tc) return 1.0;
  return (1 + ((rd - 1) * tc) / te) / rd;
}

/** A-3.2-2 — Desplazamiento objetivo: δT = C0·C1·Sa·(Te/2π)²·g (Sa como fracción de g). */
export function desplazamientoObjetivo(c0: number, c1: number, sa: number, te: number): number {
  return c0 * c1 * sa * (te / (2 * Math.PI)) ** 2 * G;
}

/** Fuerza de la curva de capacidad en el desplazamiento `d` (interpolación lineal; constante después del último punto). */
export function fuerzaEnDesplazamiento(curva: readonly PuntoCurva[], d: number): number {
  if (d <= curva[0].d) return curva[0].v;
  for (let i = 1; i < curva.length; i++) {
    if (d <= curva[i].d) {
      const a = curva[i - 1];
      const b = curva[i];
      return a.v + ((d - a.d) / (b.d - a.d)) * (b.v - a.v);
    }
  }
  return curva[curva.length - 1].v;
}

/** Primer desplazamiento al que la curva alcanza la fuerza `v` (null si nunca la alcanza). */
export function desplazamientoParaFuerza(curva: readonly PuntoCurva[], v: number): number | null {
  for (let i = 1; i < curva.length; i++) {
    const a = curva[i - 1];
    const b = curva[i];
    if (v >= a.v && v <= b.v && b.v > a.v) return a.d + ((v - a.v) / (b.v - a.v)) * (b.d - a.d);
  }
  return null;
}

/** Área bajo la curva de capacidad entre el origen y el desplazamiento `dMax` (trapecios). */
export function areaBajoCurva(curva: readonly PuntoCurva[], dMax: number): number {
  let area = 0;
  let previo = { d: 0, v: fuerzaEnDesplazamiento(curva, 0) };
  const puntos = curva.filter((p) => p.d > 0 && p.d < dMax);
  for (const p of [...puntos, { d: dMax, v: fuerzaEnDesplazamiento(curva, dMax) }]) {
    area += 0.5 * (previo.v + p.v) * (p.d - previo.d);
    previo = p;
  }
  return area;
}

export type AjusteBilineal = {
  /** Resistencia efectiva a la fluencia Vy. */
  vy: number;
  /** Desplazamiento efectivo de fluencia δy. */
  dy: number;
  /** Rigidez del primer tramo (pasa por el 60 % de Vy). */
  ke: number;
};

/**
 * A-3.2.3 — Ajuste de la curva bilineal a la curva de capacidad hasta el desplazamiento objetivo `dT`:
 *  1. el primer segmento pasa por el origen y por el punto de la curva al 60 % de Vy;
 *  2. el segundo segmento pasa por la curva en δT;
 *  3. el área bajo la bilineal es igual al área bajo la curva entre 0 y δT.
 * Se resuelve Vy por bisección. Devuelve `null` si no hay solución.
 */
export function ajusteBilineal(curva: readonly PuntoCurva[], dT: number): AjusteBilineal | null {
  const vT = fuerzaEnDesplazamiento(curva, dT);
  const areaCurva = areaBajoCurva(curva, dT);
  const vMax = Math.max(...curva.filter((p) => p.d <= dT).map((p) => p.v), vT);
  const diferencia = (vy: number): number => {
    const d60 = desplazamientoParaFuerza(curva, 0.6 * vy);
    if (d60 === null || d60 <= 0) return Number.NaN;
    const dy = d60 / 0.6;
    if (dy > dT) return Number.NaN;
    return 0.5 * vy * dy + 0.5 * (vy + vT) * (dT - dy) - areaCurva;
  };
  let lo = vMax * 0.02;
  let hi = vMax;
  let fLo = diferencia(lo);
  let fHi = diferencia(hi);
  // Si el extremo superior no es evaluable (dy > δT), se retrocede un poco.
  for (let k = 0; Number.isNaN(fHi) && k < 60; k++) {
    hi *= 0.99;
    fHi = diferencia(hi);
  }
  if (Number.isNaN(fLo) || Number.isNaN(fHi)) return null;
  if (Math.abs(fHi) < 1e-9 * areaCurva) return construir(curva, hi);
  if (fLo * fHi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = 0.5 * (lo + hi);
    const f = diferencia(mid);
    if (Number.isNaN(f)) {
      hi = mid;
      continue;
    }
    if (fLo * f <= 0) {
      hi = mid;
      fHi = f;
    } else {
      lo = mid;
      fLo = f;
    }
  }
  return construir(curva, 0.5 * (lo + hi));
}

function construir(curva: readonly PuntoCurva[], vy: number): AjusteBilineal {
  const d60 = desplazamientoParaFuerza(curva, 0.6 * vy)!;
  return { vy, dy: d60 / 0.6, ke: (0.6 * vy) / d60 };
}

export type EntradaPushover = {
  curva: readonly PuntoCurva[];
  /** T1 y primer incremento de carga (V1, δ1), de A-3.2.3. */
  t1: number;
  v1: number;
  d1: number;
  /** Masas por nivel (kg) y vector de forma normalizado a 1 en el punto de control. */
  masas: readonly number[];
  formaModo: readonly number[];
  /** Espectro Sa(T) en fracción de g (A.2.6). */
  sa: (t: number) => number;
  /** TC del espectro (A.2.6.1.1). */
  tc: number;
};

export type ResultadoPushover = {
  iteraciones: number;
  convergio: boolean;
  c0: number;
  vy: number;
  dy: number;
  te: number;
  saTe: number;
  rd: number;
  c1: number;
  dT: number;
  /** Fuerza lateral de la curva en δT (N). */
  vT: number;
  /** Fuerza de la curva al 125 % y 150 % del desplazamiento objetivo (A-3.2.2). */
  v125: number;
  v150: number;
};

/**
 * Procedimiento iterativo A-3.2.3 – A-3.2.5: el desplazamiento objetivo depende de Te, que a su vez
 * depende del ajuste bilineal hasta δT. Se parte de la estimación elástica (C1 = 1, Te = T1).
 */
export function procedimientoPushover(e: EntradaPushover, maxIter = 100, tol = 1e-6): ResultadoPushover | null {
  const masaTotal = e.masas.reduce((a, b) => a + b, 0);
  const c0 = coeficienteC0(e.masas, e.formaModo);
  let dT = desplazamientoObjetivo(c0, 1, e.sa(e.t1), e.t1);
  let r: ResultadoPushover | null = null;
  for (let it = 1; it <= maxIter; it++) {
    const aj = ajusteBilineal(e.curva, dT);
    if (!aj) return null;
    const te = periodoEfectivoPushover(e.t1, e.v1, e.d1, aj.vy, aj.dy);
    const saTe = e.sa(te);
    const rd = factorRd(saTe, masaTotal, aj.vy);
    const c1 = coeficienteC1(te, e.tc, rd);
    const nuevo = desplazamientoObjetivo(c0, c1, saTe, te);
    r = {
      iteraciones: it,
      convergio: Math.abs(nuevo - dT) <= tol * Math.max(1e-9, dT),
      c0,
      vy: aj.vy,
      dy: aj.dy,
      te,
      saTe,
      rd,
      c1,
      dT: nuevo,
      vT: fuerzaEnDesplazamiento(e.curva, nuevo),
      v125: fuerzaEnDesplazamiento(e.curva, 1.25 * nuevo),
      v150: fuerzaEnDesplazamiento(e.curva, 1.5 * nuevo),
    };
    if (r.convergio) return r;
    dT = nuevo;
  }
  return r;
}
