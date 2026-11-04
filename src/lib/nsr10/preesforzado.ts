/**
 * Título C — Capítulo C.18: Concreto preesforzado (PDF p.455–467, impresas C-153 a C-165).
 *
 * Contiene: clases de flexión (C.18.3.3), esfuerzos admisibles en concreto y acero (C.18.4, C.18.5), fricción en
 * postensado (C.18-1, C.18-2), fps aproximado (C.18-3 a C.18-5), refuerzo mínimo adherido (C.18-6 a C.18-8) y
 * apoyos de prefabricados (C.16.6.2.2).
 *
 * Unidades: MPa, mm, mm², N, kN, kN·m. Lo que NO es texto de la norma está marcado "(auxiliar)": estática y
 * resistencia de materiales usuales (esfuerzos de fibras, bloque rectangular de compresión, momento de fisuración)
 * que la norma da por supuestos en C.18.3.2 y C.10.2.
 */
import { beta1 } from './concreto';
import { phiDetalle } from './resistenciaServicio';
import {
  CLASES_FLEXION,
  CORCHETE_C183_MIN,
  DPRIMA_MAX_FRACCION_DP,
  ESFUERZOS_ACERO,
  ESFUERZOS_SERVICIO,
  ESFUERZOS_TRANSFERENCIA,
  FACTOR_CARGA_FISURACION,
  FRICCION_EXPONENTE_MAX_APROX,
  FSE_MIN_FPU,
  FT_MAX_LOSA_DOS_DIRECCIONES,
  GAMMA_P,
  NO_ADHERIDOS,
  PREFABRICADO,
  REFUERZO_ADHERIDO,
  type TipoApoyoPrefabricado,
} from '../../data/preesforzado';

const EPSILON_CU = 0.003;

/* ─────────────────────────────── C.18.3.3 — Clases de flexión ─────────────────────────────── */

export type ClaseFlexion = 'U' | 'T' | 'C';

/** Raíz cuadrada de f′c (MPa^0.5). */
export const raizFc = (fc: number): number => Math.sqrt(fc);

/**
 * Clase de un elemento a flexión según ft (MPa): U si ft ≤ 0.62√f′c; T si ≤ 1.0√f′c; C si mayor (C.18.3.3, C-153/154).
 * Una losa preesforzada en dos direcciones debe ser Clase U con ft ≤ 0.50√f′c: se devuelve 'C' (no admisible) si lo supera.
 */
export function claseFlexion(ft: number, fc: number, opciones: { losaDosDirecciones?: boolean } = {}): ClaseFlexion {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  const r = raizFc(fc);
  if (opciones.losaDosDirecciones) return ft <= FT_MAX_LOSA_DOS_DIRECCIONES * r ? 'U' : 'C';
  if (ft <= CLASES_FLEXION.U.max * r) return 'U';
  if (ft <= CLASES_FLEXION.T.max * r) return 'T';
  return 'C';
}

/* ─────────────────────────────── C.18.4 — Esfuerzos admisibles en el concreto ─────────────────────────────── */

export type EsfuerzosConcretoPermisibles = {
  transferencia: {
    /** 0.60 f′ci. */
    compresion: number;
    /** 0.70 f′ci (extremos de elementos simplemente apoyados). */
    compresionExtremos: number;
    /** 0.25√f′c: por encima, refuerzo adherido adicional (otras ubicaciones). */
    traccionRefuerzo: number;
    /** 0.5√f′c: por encima, refuerzo adherido adicional (extremos de elementos simplemente apoyados). */
    traccionRefuerzoExtremos: number;
  };
  servicio: {
    /** 0.45 f′c: preesforzado + cargas permanentes en el tiempo. */
    compresionSostenida: number;
    /** 0.60 f′c: preesforzado + todas las cargas. */
    compresionTotal: number;
    /** 0.62√f′c: límite de ft de la Clase U. */
    traccionClaseU: number;
    /** 1.0√f′c: límite de ft de la Clase T. */
    traccionClaseT: number;
  };
};

/** Esfuerzos admisibles en el concreto de C.18.4.1 y C.18.4.2 (C-154), en MPa. `fci` = f′ci al aplicar el preesforzado. */
export function esfuerzosPermisiblesConcreto(fc: number, fci: number): EsfuerzosConcretoPermisibles {
  if (!(fc > 0) || !(fci > 0)) throw new RangeError('f′c y f′ci deben ser positivos');
  const r = raizFc(fc);
  return {
    transferencia: {
      compresion: ESFUERZOS_TRANSFERENCIA.compresion * fci,
      compresionExtremos: ESFUERZOS_TRANSFERENCIA.compresionExtremosSimples * fci,
      traccionRefuerzo: ESFUERZOS_TRANSFERENCIA.traccionOtras * r,
      traccionRefuerzoExtremos: ESFUERZOS_TRANSFERENCIA.traccionExtremosSimples * r,
    },
    servicio: {
      compresionSostenida: ESFUERZOS_SERVICIO.compresionSostenida * fc,
      compresionTotal: ESFUERZOS_SERVICIO.compresionTotal * fc,
      traccionClaseU: CLASES_FLEXION.U.max * r,
      traccionClaseT: CLASES_FLEXION.T.max * r,
    },
  };
}

/* ─────────────────────────────── C.18.5 — Esfuerzos admisibles en el acero ─────────────────────────────── */

export type EsfuerzosAceroPermisibles = {
  /** (a) fuerza del gato: min(0.94 fpy, 0.80 fpu, máximo del fabricante si se indica). */
  gato: number;
  /** Qué valor controla en (a). */
  gatoControla: '0.94fpy' | '0.80fpu' | 'fabricante';
  /** (b) inmediatamente después de la transferencia: min(0.82 fpy, 0.74 fpu). */
  transferencia: number;
  transferenciaControla: '0.82fpy' | '0.74fpu';
  /** (c) tendones de postensado en anclajes y acoples, inmediatamente después de la transferencia: 0.70 fpu. */
  anclajes: number;
};

/**
 * Esfuerzos de tracción máximos en el acero de preesforzado (C.18.5.1, C-155), en MPa.
 * @param maxFabricante máximo valor recomendado por el fabricante del acero o de los anclajes (opcional).
 */
export function esfuerzosPermisiblesAcero(fpy: number, fpu: number, maxFabricante?: number): EsfuerzosAceroPermisibles {
  if (!(fpy > 0) || !(fpu > 0) || fpy > fpu) throw new RangeError('se requiere 0 < fpy ≤ fpu');
  const a1 = ESFUERZOS_ACERO.gatoFpy * fpy;
  const a2 = ESFUERZOS_ACERO.gatoFpuMax * fpu;
  const a3 = maxFabricante !== undefined && maxFabricante > 0 ? maxFabricante : Infinity;
  const gato = Math.min(a1, a2, a3);
  const gatoControla = gato === a1 ? '0.94fpy' : gato === a2 ? '0.80fpu' : 'fabricante';
  const b1 = ESFUERZOS_ACERO.transferenciaFpy * fpy;
  const b2 = ESFUERZOS_ACERO.transferenciaFpuMax * fpu;
  return {
    gato,
    gatoControla,
    transferencia: Math.min(b1, b2),
    transferenciaControla: b1 <= b2 ? '0.82fpy' : '0.74fpu',
    anclajes: ESFUERZOS_ACERO.anclajesFpu * fpu,
  };
}

/* ─────────────────────────────── C.18.6.2 — Pérdidas por fricción ─────────────────────────────── */

export type EntradaFriccion = {
  /** Ppj: fuerza en el extremo del gato (kN o N; las salidas conservan la unidad). */
  ppj: number;
  /** K: coeficiente de fricción por desviación accidental, por metro de tendón (1/m). */
  K: number;
  /** μp: coeficiente de fricción por curvatura. */
  mu: number;
  /** ℓpx: longitud del tendón desde el extremo del gato hasta el punto x (m). */
  lpx: number;
  /** αpx: suma de los valores absolutos de las variaciones angulares del tendón desde el gato hasta x (rad). */
  alpha: number;
};

export type ResultadoFriccion = {
  /** Exponente Kℓpx + μp αpx. */
  exponente: number;
  /** Ec. C.18-1: Ppx = Ppj e^−(Kℓpx + μp αpx). */
  ppxExacta: number;
  /** Ec. C.18-2: Ppx = Ppj (1 + Kℓpx + μp αpx)^−1, válida si el exponente ≤ 0.3. */
  ppxAproximada: number;
  /** ¿Es válida la forma aproximada (exponente ≤ 0.3)? */
  aproximadaValida: boolean;
  /** Pérdida de fuerza (Ppj − Ppx exacta) y su porcentaje. */
  perdida: number;
  perdidaPct: number;
};

/** Fuerza en el tendón a la distancia ℓpx del gato, Ecs. C.18-1 y C.18-2 (C-156). */
export function friccionPostensado(e: EntradaFriccion): ResultadoFriccion {
  if (!(e.ppj > 0)) throw new RangeError('Ppj debe ser positivo');
  if (e.K < 0 || e.mu < 0 || e.lpx < 0 || e.alpha < 0) throw new RangeError('K, μp, ℓpx y αpx no pueden ser negativos');
  const exponente = e.K * e.lpx + e.mu * e.alpha;
  const ppxExacta = e.ppj * Math.exp(-exponente);
  const ppxAproximada = e.ppj / (1 + exponente);
  return {
    exponente,
    ppxExacta,
    ppxAproximada,
    aproximadaValida: exponente <= FRICCION_EXPONENTE_MAX_APROX,
    perdida: e.ppj - ppxExacta,
    perdidaPct: (100 * (e.ppj - ppxExacta)) / e.ppj,
  };
}

/**
 * Variación angular de un tendón parabólico desde el apoyo hasta el centro de la luz (auxiliar): para una parábola con
 * flecha `e` (m) en una luz `L` (m), y = 4 e x (L − x)/L², la pendiente en el apoyo es 4e/L y en el centro es cero, por lo
 * que α = 4e/L (rad, con tan θ ≈ θ).
 */
export function alfaParabolaMitad(flecha: number, luz: number): number {
  if (!(luz > 0)) throw new RangeError('la luz debe ser positiva');
  return (4 * Math.abs(flecha)) / luz;
}

/* ─────────────────────────────── C.18.7.2 — fps aproximado ─────────────────────────────── */

/** γp según fpy/fpu (C.18.7.2(a), C-156): 0.55 (≥ 0.80), 0.40 (≥ 0.85), 0.28 (≥ 0.90). Lanza si fpy/fpu < 0.80. */
export function gammaP(fpy: number, fpu: number): number {
  if (!(fpu > 0) || !(fpy > 0)) throw new RangeError('fpy y fpu deben ser positivos');
  const r = fpy / fpu;
  let gamma: number | null = null;
  for (const fila of GAMMA_P) if (r >= fila.fpyFpuMin - 1e-12) gamma = fila.gamma;
  if (gamma === null) throw new RangeError('C.18.7.2(a) define γp solo para fpy/fpu ≥ 0.80');
  return gamma;
}

export type EntradaFpsAdherido = {
  fpu: number;
  fpy: number;
  fc: number;
  /** ρp = Aps / (b dp). */
  rhoP: number;
  /** Altura efectiva del refuerzo no preesforzado en tracción (mm); necesaria si ω ≠ 0 o ω′ ≠ 0. */
  d?: number;
  /** Altura del acero de preesforzado (mm). */
  dp: number;
  /** ω = ρ fy / f′c (refuerzo no preesforzado en tracción). */
  omega?: number;
  /** ω′ = ρ′ fy / f′c (refuerzo en compresión). */
  omegaPrima?: number;
  /** d′ del refuerzo en compresión (mm), solo para verificar d′ ≤ 0.15 dp. */
  dPrima?: number;
  /** β1; si se omite se toma de C.10.2.7.3 (`beta1(fc)`). */
  beta1?: number;
  /** Si se tiene en cuenta algún refuerzo de compresión, el corchete no se toma menor de 0.17. */
  conRefuerzoCompresion?: boolean;
};

export type ResultadoFpsAdherido = {
  gammaP: number;
  beta1: number;
  /** Corchete [ρp fpu/f′c + (d/dp)(ω − ω′)] tal como resulta de las ecuaciones. */
  corcheteCalculado: number;
  /** Corchete efectivo (≥ 0.17 si hay refuerzo de compresión). */
  corchete: number;
  corcheteLimitado: boolean;
  /** fps de la Ec. C.18-3 (MPa). */
  fps: number;
  /** Aviso si d′ > 0.15 dp. */
  dPrimaExcede: boolean;
};

/** Ec. C.18-3 (C-156): fps = fpu {1 − (γp/β1)[ρp fpu/f′c + (d/dp)(ω − ω′)]}, tendones adheridos. */
export function fpsAdherido(e: EntradaFpsAdherido): ResultadoFpsAdherido {
  const omega = e.omega ?? 0;
  const omegaP = e.omegaPrima ?? 0;
  if ((omega !== 0 || omegaP !== 0) && !(e.d && e.d > 0)) throw new RangeError('se requiere d si ω o ω′ no son cero');
  const gp = gammaP(e.fpy, e.fpu);
  const b1 = e.beta1 ?? beta1(e.fc);
  const dRel = e.d && e.d > 0 ? e.d / e.dp : 0;
  const corcheteCalculado = (e.rhoP * e.fpu) / e.fc + dRel * (omega - omegaP);
  const limitar = !!e.conRefuerzoCompresion || omegaP > 0;
  const corchete = limitar ? Math.max(corcheteCalculado, CORCHETE_C183_MIN) : corcheteCalculado;
  return {
    gammaP: gp,
    beta1: b1,
    corcheteCalculado,
    corchete,
    corcheteLimitado: limitar && corcheteCalculado < CORCHETE_C183_MIN,
    fps: e.fpu * (1 - (gp / b1) * corchete),
    dPrimaExcede: e.dPrima !== undefined && e.dPrima > DPRIMA_MAX_FRACCION_DP * e.dp,
  };
}

export type ResultadoFpsNoAdherido = {
  /** Ec. aplicada: 'C.18-4' (luz/altura ≤ 35) o 'C.18-5' (> 35). */
  ecuacion: 'C.18-4' | 'C.18-5';
  /** fps sin topes: fse + 70 + f′c/(100 ρp) o f′c/(300 ρp). */
  fpsSinTope: number;
  /** Tope: min(fpy, fse + 420) o min(fpy, fse + 210). */
  tope: number;
  fps: number;
  /** ¿Gobernó el tope? */
  gobiernaTope: boolean;
};

/** Ecs. C.18-4 y C.18-5 (C-156/157): fps de tendones no adheridos. Requiere fse ≥ 0.50 fpu (C.18.7.2). */
export function fpsNoAdherido(e: { fse: number; fc: number; rhoP: number; fpy: number; fpu?: number; luzAltura: number }): ResultadoFpsNoAdherido {
  if (!(e.rhoP > 0)) throw new RangeError('ρp debe ser positivo');
  if (e.fpu !== undefined && e.fse < FSE_MIN_FPU * e.fpu) throw new RangeError('C.18.7.2: las ecuaciones aproximadas exigen fse ≥ 0.50 fpu');
  const corto = e.luzAltura <= NO_ADHERIDOS.luzAlturaLimite;
  const par = corto ? NO_ADHERIDOS.corto : NO_ADHERIDOS.largo;
  const fpsSinTope = e.fse + NO_ADHERIDOS.incremento + e.fc / (par.divisor * e.rhoP);
  const tope = Math.min(e.fpy, e.fse + par.topeSobreFse);
  return { ecuacion: corto ? 'C.18-4' : 'C.18-5', fpsSinTope, tope, fps: Math.min(fpsSinTope, tope), gobiernaTope: fpsSinTope > tope };
}

/* ─────────────────────────────── Flexión nominal de una sección rectangular (auxiliar) ─────────────────────────────── */

export type EntradaFlexionPreesforzada = {
  /** Ancho de la zona de compresión (mm). */
  b: number;
  /** Altura efectiva del acero de preesforzado (mm). */
  dp: number;
  /** Área del acero de preesforzado (mm²). */
  aps: number;
  fpu: number;
  fpy: number;
  fc: number;
  /** Refuerzo no preesforzado en tracción (opcional). */
  as?: number;
  fy?: number;
  d?: number;
  /** Refuerzo no preesforzado en compresión (opcional). */
  asPrima?: number;
  dPrima?: number;
  /** Tipo de refuerzo transversal para φ. */
  tipoEstribo?: 'espiral' | 'otro';
};

export type ResultadoFlexionPreesforzada = {
  rhoP: number;
  fps: ResultadoFpsAdherido;
  /** Profundidad del bloque rectangular a = (Aps fps + As fy − A′s fy) / (0.85 f′c b) (mm). */
  a: number;
  /** Profundidad del eje neutro c = a/β1 (mm). */
  c: number;
  /** Deformación unitaria neta de tracción del acero extremo (aprox. (auxiliar): εt = 0.003 (dt − c)/c, sin deformación efectiva de preesforzado). */
  epsilonT: number;
  /** Momento nominal Mn (kN·m). */
  mn: number;
  /** φ de C.9.3.2 con εt (límite de compresión 0.002 para acero preesforzado). */
  phi: number;
  phiMn: number;
  zona: 'compresion' | 'transicion' | 'traccion';
};

/**
 * Momento nominal de una sección rectangular con tendones adheridos usando la Ec. C.18-3 para fps y el bloque
 * rectangular de C.10.2.7 (auxiliar). Si hay As, se incluye con fy (C.18.7.3). εt se estima con el acero de mayor
 * profundidad (dt = max(dp, d)); es una aproximación porque ignora la deformación de preesforzado efectivo.
 */
export function flexionNominalPreesforzada(e: EntradaFlexionPreesforzada): ResultadoFlexionPreesforzada {
  const as = e.as ?? 0;
  const fy = e.fy ?? 0;
  const asP = e.asPrima ?? 0;
  const d = e.d ?? e.dp;
  const rhoP = e.aps / (e.b * e.dp);
  const omega = as > 0 ? (as / (e.b * d)) * (fy / e.fc) : 0;
  const omegaP = asP > 0 ? (asP / (e.b * d)) * (fy / e.fc) : 0;
  const fps = fpsAdherido({
    fpu: e.fpu,
    fpy: e.fpy,
    fc: e.fc,
    rhoP,
    d,
    dp: e.dp,
    omega,
    omegaPrima: omegaP,
    dPrima: e.dPrima,
    conRefuerzoCompresion: asP > 0,
  });
  const b1 = fps.beta1;
  const t = e.aps * fps.fps + as * fy - asP * fy;
  const a = t / (0.85 * e.fc * e.b);
  const c = a / b1;
  const dt = Math.max(e.dp, d);
  const epsilonT = (EPSILON_CU * (dt - c)) / c;
  let mnNmm = e.aps * fps.fps * (e.dp - a / 2) + as * fy * (d - a / 2);
  if (asP > 0 && e.dPrima !== undefined) mnNmm += asP * fy * (a / 2 - e.dPrima);
  const det = phiDetalle(epsilonT, e.tipoEstribo ?? 'otro', 'preesforzado');
  const mn = mnNmm / 1e6;
  return { rhoP, fps, a, c, epsilonT, mn, phi: det.phi, phiMn: det.phi * mn, zona: det.zona };
}

/* ─────────────────────────────── C.18.8.2 — Refuerzo mínimo por carga de fisuración ─────────────────────────────── */

/**
 * Momento externo total que produce tracción fr en la fibra inferior de una sección con preesforzado efectivo P (auxiliar):
 * σinf = P/A + P e/S − M/S = −fr  ⇒  Mcr = fr S + P (e + S/A).
 * @param fr módulo de rotura (MPa), P (kN), excentricidad (mm, bajo el centroide), area (mm²), modulo = S inferior (mm³).
 * @returns Mcr en kN·m (momento total, incluye el peso propio).
 */
export function momentoFisuracionPreesforzado(e: { fr: number; P: number; excentricidad: number; area: number; modulo: number }): number {
  const nmm = e.fr * e.modulo + e.P * 1000 * (e.excentricidad + e.modulo / e.area);
  return nmm / 1e6;
}

/** C.18.8.2 (C-157): φMn debe alcanzar al menos 1.2 Mcr. Devuelve la relación φMn / (1.2 Mcr). */
export function relacionFisuracion(phiMn: number, mcr: number): { relacion: number; cumple: boolean; requerido: number } {
  const requerido = FACTOR_CARGA_FISURACION * mcr;
  return { relacion: phiMn / requerido, cumple: phiMn >= requerido, requerido };
}

/* ─────────────────────────────── C.18.9 — Refuerzo mínimo adherido ─────────────────────────────── */

/** Ec. C.18-6 (C-157): As = 0.004 Act (mm²), tendones no adheridos. */
export const asMinimoNoAdherido = (act: number): number => REFUERZO_ADHERIDO.coefAct * act;

/** Ec. C.18-7 (C-158): As = Nc / (0.5 fy) con fy ≤ 420 MPa; Nc en N, As en mm². */
export function asLosaMomentoPositivo(nc: number, fy: number): number {
  return nc / (0.5 * Math.min(fy, REFUERZO_ADHERIDO.fyMaxC187));
}

/** Ec. C.18-8 (C-158): As = 0.00075 Acf (mm²), momento negativo sobre columnas, losas planas en dos direcciones. */
export const asLosaMomentoNegativo = (acf: number): number => REFUERZO_ADHERIDO.coefAcf * acf;

/** C.18.9.3.1: ¿se exige refuerzo adherido en momento positivo de losas? No, si ft ≤ 0.17√f′c. */
export const losaRequiereAdheridoPositivo = (ft: number, fc: number): boolean => ft > REFUERZO_ADHERIDO.ftSinRefuerzoLosa * raizFc(fc);

/** C.18.9.4 (C-158): longitudes mínimas del refuerzo adherido (mm) dada la luz libre ℓn. */
export function longitudesRefuerzoAdherido(ln: number): { positivo: number; negativoACadaLado: number } {
  return { positivo: REFUERZO_ADHERIDO.longitudPositivoFraccionLn * ln, negativoACadaLado: REFUERZO_ADHERIDO.longitudNegativoFraccionLn * ln };
}

/* ─────────────────────────────── C.18.3.2 / C.18.4 — Esfuerzos de fibras (auxiliar) ─────────────────────────────── */

export type SeccionPreesforzada = {
  /** Área bruta (mm²). */
  A: number;
  /** Momento de inercia (mm⁴). */
  I: number;
  /** Distancia del centroide a la fibra superior (mm). */
  yt: number;
  /** Distancia del centroide a la fibra inferior (mm). */
  yb: number;
};

/** Esfuerzos de fibra en MPa, compresión positiva. */
export type EsfuerzosFibras = { superior: number; inferior: number };

/**
 * Esfuerzos de fibra extrema en la sección no fisurada (teoría elástica, C.18.3.2; auxiliar).
 * σ = P/A ± P e y / I ∓ M y / I, con la excentricidad `e` medida DEBAJO del centroide (positiva si el tendón queda bajo
 * el centroide) y M positivo si tracciona la fibra inferior (flexión positiva). Compresión positiva.
 * @param P fuerza de preesforzado (kN), @param e excentricidad (mm), @param M momento externo (kN·m).
 */
export function esfuerzosFibras(s: SeccionPreesforzada, P: number, e: number, M: number): EsfuerzosFibras {
  const p = P * 1000;
  const m = M * 1e6;
  const sup = p / s.A - (p * e * s.yt) / s.I + (m * s.yt) / s.I;
  const inf = p / s.A + (p * e * s.yb) / s.I - (m * s.yb) / s.I;
  return { superior: sup, inferior: inf };
}

export type VerificacionFibra = {
  id: string;
  descripcion: string;
  /** Esfuerzo actuante, compresión positiva (MPa). */
  valor: number;
  /** Límite (MPa), siempre positivo; para tracción es el valor máximo admisible de tracción. */
  limite: number;
  cumple: boolean;
  ref: string;
};

export type EntradaVerificacionSeccion = {
  fc: number;
  fci: number;
  seccion: SeccionPreesforzada;
  /** Excentricidad del tendón bajo el centroide (mm). */
  e: number;
  /** Fuerza de preesforzado inicial Pi (kN, después de pérdidas inmediatas, C.18.4.1). */
  Pi: number;
  /** Fuerza efectiva Pe (kN, después de todas las pérdidas, C.18.4.2). */
  Pe: number;
  /** Momento por peso propio en la sección (kN·m). */
  Mg: number;
  /** Momento por cargas permanentes en el tiempo, incluido Mg (kN·m). */
  Md: number;
  /** Momento por todas las cargas de servicio (kN·m). */
  Mt: number;
  /** ¿La sección está en el extremo de un elemento simplemente apoyado? */
  extremoSimple?: boolean;
  /** Losa preesforzada en dos direcciones (Clase U con ft ≤ 0.50√f′c). */
  losaDosDirecciones?: boolean;
};

export type ResultadoVerificacionSeccion = {
  permisibles: EsfuerzosConcretoPermisibles;
  transferencia: EsfuerzosFibras;
  servicioSostenido: EsfuerzosFibras;
  servicioTotal: EsfuerzosFibras;
  clase: ClaseFlexion;
  /** ft: tracción en la fibra de la zona precomprimida (MPa, 0 si está comprimida). */
  ft: number;
  verificaciones: VerificacionFibra[];
  /** C.18.4.1(c): ¿hay tracción en transferencia mayor que la que exime de refuerzo adherido adicional? */
  requiereRefuerzoTransferencia: boolean;
  /** ¿Cumplen todas las verificaciones de compresión y la clase (U o T)? */
  cumple: boolean;
};

/**
 * Verificación de una sección a flexión en transferencia y en servicio (C.18.4.1, C.18.4.2, C.18.3.3). Se supone la zona
 * precomprimida en tracción en la fibra inferior (tendón bajo el centroide). La clase se determina con las cargas totales.
 */
export function verificarSeccionPreesforzada(d: EntradaVerificacionSeccion): ResultadoVerificacionSeccion {
  const perm = esfuerzosPermisiblesConcreto(d.fc, d.fci);
  const tr = esfuerzosFibras(d.seccion, d.Pi, d.e, d.Mg);
  const sos = esfuerzosFibras(d.seccion, d.Pe, d.e, d.Md);
  const tot = esfuerzosFibras(d.seccion, d.Pe, d.e, d.Mt);
  const limCompTr = d.extremoSimple ? perm.transferencia.compresionExtremos : perm.transferencia.compresion;
  const limTracTr = d.extremoSimple ? perm.transferencia.traccionRefuerzoExtremos : perm.transferencia.traccionRefuerzo;

  const compTrMax = Math.max(tr.superior, tr.inferior);
  const tracTrMax = Math.max(-tr.superior, -tr.inferior, 0);
  const ft = Math.max(-tot.inferior, 0);
  const clase = claseFlexion(ft, d.fc, { losaDosDirecciones: d.losaDosDirecciones });

  const verificaciones: VerificacionFibra[] = [
    {
      id: 'C.18.4.1(a/b)',
      descripcion: d.extremoSimple ? 'Compresión en transferencia (extremo simplemente apoyado)' : 'Compresión en transferencia',
      valor: compTrMax,
      limite: limCompTr,
      cumple: compTrMax <= limCompTr,
      ref: d.extremoSimple ? 'C.18.4.1(b)' : 'C.18.4.1(a)',
    },
    {
      id: 'C.18.4.2(a)',
      descripcion: 'Compresión en servicio por preesforzado + cargas permanentes',
      valor: Math.max(sos.superior, sos.inferior),
      limite: perm.servicio.compresionSostenida,
      cumple: Math.max(sos.superior, sos.inferior) <= perm.servicio.compresionSostenida,
      ref: 'C.18.4.2(a)',
    },
    {
      id: 'C.18.4.2(b)',
      descripcion: 'Compresión en servicio por preesforzado + todas las cargas',
      valor: Math.max(tot.superior, tot.inferior),
      limite: perm.servicio.compresionTotal,
      cumple: Math.max(tot.superior, tot.inferior) <= perm.servicio.compresionTotal,
      ref: 'C.18.4.2(b)',
    },
    {
      id: 'C.18.3.3',
      descripcion: 'Tracción ft en servicio (Clase U o T)',
      valor: ft,
      limite: d.losaDosDirecciones ? FT_MAX_LOSA_DOS_DIRECCIONES * raizFc(d.fc) : perm.servicio.traccionClaseT,
      cumple: d.losaDosDirecciones ? clase === 'U' : clase !== 'C',
      ref: 'C.18.3.3',
    },
  ];

  return {
    permisibles: perm,
    transferencia: tr,
    servicioSostenido: sos,
    servicioTotal: tot,
    clase,
    ft,
    verificaciones,
    requiereRefuerzoTransferencia: tracTrMax > limTracTr,
    cumple: verificaciones.every((v) => v.cumple),
  };
}

/* ─────────────────────────────── C.16.6.2.2(a) — Longitud de apoyo de prefabricados ─────────────────────────────── */

/**
 * Distancia mínima del borde del apoyo al extremo del elemento prefabricado en la dirección de la luz (mm):
 * max(ℓn/180, 50 mm losas macizas o alveolares | 75 mm vigas o T alargadas) (C.16.6.2.2(a), C-149).
 */
export function distanciaMinimaApoyo(lnMm: number, tipo: TipoApoyoPrefabricado): { ln180: number; minimo: number; requerido: number } {
  const ln180 = lnMm / PREFABRICADO.apoyoDivisorLn;
  const minimo = tipo === 'losa' ? PREFABRICADO.apoyoMinLosaMm : PREFABRICADO.apoyoMinVigaMm;
  return { ln180, minimo, requerido: Math.max(ln180, minimo) };
}

/** C.16.5.1.3(a) (C-148): resistencia nominal a tracción mínima de una columna prefabricada (kN) = 1.4 Ag (N), con Ag en mm² (área efectiva ≥ ½ Ag). */
export function amarreVerticalColumna(agMm2: number, agRequeridoMm2?: number): { agEfectivo: number; tnKn: number } {
  const minimo = PREFABRICADO.columnaAreaEfectivaMinFraccion * agMm2;
  const ef = agRequeridoMm2 !== undefined ? Math.min(agMm2, Math.max(agRequeridoMm2, minimo)) : agMm2;
  return { agEfectivo: ef, tnKn: (PREFABRICADO.columnaCoefAgN * ef) / 1000 };
}

/** C.16.4.2 (C-147/148): refuerzo mínimo de un muro prefabricado no preesforzado, por metro de muro (mm²/m), y separación máxima (mm). */
export function refuerzoMinimoMuroPrefabricado(espesorMm: number, exterior: boolean): { asPorMetro: number; separacionMax: number } {
  const lim = exterior ? PREFABRICADO.separacionMuroExteriorMm : PREFABRICADO.separacionMuroInteriorMm;
  return {
    asPorMetro: PREFABRICADO.cuantiaMinMuro * espesorMm * 1000,
    separacionMax: Math.min(PREFABRICADO.separacionMuroFraccionEspesor * espesorMm, lim),
  };
}
