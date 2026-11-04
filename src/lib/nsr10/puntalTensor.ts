/**
 * Título C — Apéndice C-A: Modelos puntal-tensor (PDF p.525–528, impresas C-223 a C-226).
 *
 * Ecuaciones de la norma implementadas:
 *   C-A-1  φFn ≥ Fu                         C-A-5  Fns = fce Acs + A′s f′s (puntal con refuerzo longitudinal)
 *   C-A-2  Fns = fce Acs                    C-A-6  Fnt = Ats fy + Atp (fse + Δfp)
 *   C-A-3  fce = 0.85 βs f′c                C-A-7  Fnn = fce Anz  (el PDF la rotula «A-7»)
 *   C-A-4  Σ (Asi / (bs si)) sen αi ≥ 0.003 C-A-8  fce = 0.85 βn f′c
 *
 * Unidades: SI. f en MPa, áreas en mm², fuerzas en kN (MPa × mm² / 1000), longitudes en mm, ángulos en grados.
 * Lo que NO es texto de la norma se marca "(auxiliar)": la estática de la cercha de ejemplo y la geometría de la zona
 * nodal son solo proyecciones y equilibrio elementales (la norma deja la geometría del modelo al diseñador, C-A.2.3).
 */
import {
  ALFA_MIN_UNA_DIRECCION_GRADOS,
  ANGULO_MIN_PUNTAL_TENSOR_GRADOS,
  CUANTIA_MIN_REFUERZO_PUNTAL,
  DELTA_FP_MPA,
  FC_MAX_ECUACION_CA4_MPA,
  PHI_PUNTAL_TENSOR_POR_CONJUNTO,
  TABLA_BETA_N,
  TABLA_BETA_S,
  type TipoPuntal,
  type TipoZonaNodal,
} from '../../data/apendicesC';
import { PHI_PUNTAL_TENSOR } from '../../data/resistenciaServicioC9';

export type { TipoPuntal, TipoZonaNodal };

const aRad = (grados: number) => (grados * Math.PI) / 180;

/* ═════════════════════════ C-A.2 — Procedimiento ═════════════════════════ */

/** Ec. C-A-1 (C-223): φFn ≥ Fu. Devuelve resistencia de diseño, razón demanda/capacidad y si cumple. */
export function verificarResistencia(phi: number, Fn: number, Fu: number): { phiFn: number; razon: number; cumple: boolean } {
  if (!(phi > 0 && phi <= 1)) throw new RangeError('φ debe estar en (0, 1]');
  const phiFn = phi * Fn;
  return { phiFn, razon: phiFn > 0 ? Fu / phiFn : Infinity, cumple: phiFn >= Fu };
}

/** φ de los modelos puntal-tensor según el conjunto de factores usado: C.9.3.2.6 (0.75) o C-C.9.3.2.6 (0.85). */
export function phiPuntalTensor(conjunto: 'capituloC9' | 'apendiceCC' = 'capituloC9'): number {
  return conjunto === 'apendiceCC' ? PHI_PUNTAL_TENSOR_POR_CONJUNTO.apendiceCC : PHI_PUNTAL_TENSOR;
}

/** C-A.2.5 (C-223): ¿el ángulo entre un puntal y un tensor que entran en el mismo nodo es al menos 25°? */
export function anguloPermitido(thetaGrados: number): boolean {
  return thetaGrados >= ANGULO_MIN_PUNTAL_TENSOR_GRADOS;
}

/* ═════════════════════════ C-A.3 — Puntales ═════════════════════════ */

/**
 * βs (C-A.3.2.1 a C-A.3.2.4, C-224). Para 'botella-sin-refuerzo' y 'otros' el valor es 0.60λ (λ de C.8.6.1; 1.0 en
 * concreto de densidad normal).
 */
export function betaS(tipo: TipoPuntal, lambda = 1): number {
  const f = TABLA_BETA_S.find((x) => x.tipo === tipo);
  if (!f) throw new RangeError(`tipo de puntal desconocido: ${tipo}`);
  if (!(lambda > 0 && lambda <= 1)) throw new RangeError('λ debe estar en (0, 1]');
  return f.usaLambda ? f.beta * lambda : f.beta;
}

/** βn (C-A.5.2.1 a C-A.5.2.3, C-226). */
export function betaN(tipo: TipoZonaNodal): number {
  const f = TABLA_BETA_N.find((x) => x.tipo === tipo);
  if (!f) throw new RangeError(`tipo de zona nodal desconocido: ${tipo}`);
  return f.beta;
}

/** Ecs. C-A-3 y C-A-8 (C-224, C-226): fce = 0.85 β f′c (MPa). */
export function fceEfectiva(fc: number, beta: number): number {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  if (!(beta > 0 && beta <= 1)) throw new RangeError('β debe estar en (0, 1]');
  return 0.85 * beta * fc;
}

export interface ExtremoPuntal {
  /** Área de la sección transversal del puntal en este extremo, Acs (mm²). */
  Acs: number;
  /** Tipo de zona nodal que limita este extremo (para el límite C-A.3.1(b)). */
  nodo: TipoZonaNodal;
}

export interface EntradaPuntal {
  fc: number;
  tipo: TipoPuntal;
  lambda?: number;
  extremos: [ExtremoPuntal, ExtremoPuntal];
}

export interface ResultadoPuntal {
  /** fce del puntal (C-A.3.2). */
  fceCuerpo: number;
  /** fce de la zona nodal de cada extremo (C-A.5.2). */
  fceNodos: [number, number];
  /** fce usado en cada extremo = menor entre el del puntal y el del nodo (C-A.3.1). */
  fceExtremos: [number, number];
  /** Resistencia en cada extremo, fce·Acs (kN). */
  FnsExtremos: [number, number];
  /** Fns = menor de los dos extremos (kN) (C-A.3.1, Ec. C-A-2). */
  Fns: number;
  /** Extremo que gobierna (0 ó 1). */
  extremoGobierna: 0 | 1;
  /** true si la zona nodal, y no el cuerpo del puntal, limita fce en el extremo que gobierna. */
  gobiernaNodo: boolean;
}

/**
 * Resistencia nominal de un puntal sin refuerzo longitudinal (C-A.3.1, Ec. C-A-2): Fns = fce·Acs en los dos extremos,
 * tomando el menor valor; fce es el menor entre el del puntal (C-A-3) y el de la zona nodal (C-A-8).
 */
export function resistenciaPuntal(e: EntradaPuntal): ResultadoPuntal {
  const fceCuerpo = fceEfectiva(e.fc, betaS(e.tipo, e.lambda ?? 1));
  const fceNodos: [number, number] = [fceEfectiva(e.fc, betaN(e.extremos[0].nodo)), fceEfectiva(e.fc, betaN(e.extremos[1].nodo))];
  const fceExtremos: [number, number] = [Math.min(fceCuerpo, fceNodos[0]), Math.min(fceCuerpo, fceNodos[1])];
  const Fn0 = (fceExtremos[0] * e.extremos[0].Acs) / 1000;
  const Fn1 = (fceExtremos[1] * e.extremos[1].Acs) / 1000;
  const g: 0 | 1 = Fn1 < Fn0 ? 1 : 0;
  return {
    fceCuerpo,
    fceNodos,
    fceExtremos,
    FnsExtremos: [Fn0, Fn1],
    Fns: Math.min(Fn0, Fn1),
    extremoGobierna: g,
    gobiernaNodo: fceNodos[g] < fceCuerpo,
  };
}

/**
 * Ec. C-A-5 (C-225): Fns = fce Acs + A′s f′s para un puntal con refuerzo de compresión paralelo a su eje.
 * @param fceAcs  parte del concreto, kN · @param AsPrima mm² · @param fsPrima MPa (esfuerzo en el refuerzo; la norma no da su valor).
 */
export function resistenciaPuntalReforzado(fceAcs: number, AsPrima: number, fsPrima: number): number {
  if (!(AsPrima >= 0) || !(fsPrima >= 0)) throw new RangeError('A′s y f′s no pueden ser negativos');
  return fceAcs + (AsPrima * fsPrima) / 1000;
}

export interface CapaRefuerzoPuntal {
  /** Área total del refuerzo de superficie en la capa i (mm²). */
  Asi: number;
  /** Separación si de las barras de la capa i (mm). */
  si: number;
  /** Ángulo αi entre las barras y el eje del puntal (grados). */
  alfa: number;
}

/** Ec. C-A-4 (C-224): Σ (Asi/(bs si)) sen αi, con bs el ancho del puntal (mm). */
export function sumatoriaRefuerzoPuntal(capas: CapaRefuerzoPuntal[], bs: number): number {
  if (!(bs > 0)) throw new RangeError('bs debe ser positivo');
  return capas.reduce((s, c) => {
    if (!(c.si > 0) || !(c.Asi >= 0)) throw new RangeError('Asi ≥ 0 y si > 0');
    return s + (c.Asi / (bs * c.si)) * Math.sin(aRad(c.alfa));
  }, 0);
}

export interface VerificacionCA4 {
  suma: number;
  cumpleSuma: boolean;
  /** La Ec. C-A-4 solo vale con f′c ≤ 40 MPa (C-A.3.3.1). */
  fcDentroDeLimite: boolean;
  /** Si hay una sola capa/dirección, α ≥ 40° (C-A.3.3.2); null si hay más de una dirección. */
  alfaUnaDireccionOk: boolean | null;
  /** Cumple todo lo que exige C-A.3.3.1 y C-A.3.3.2 y, por tanto, se puede usar βs = 0.75. */
  cumple: boolean;
}

/** C-A.3.3.1 y C-A.3.3.2 (C-224): ¿el refuerzo de superficie permite usar βs = 0.75 en un puntal de botella? */
export function verificarRefuerzoPuntal(capas: CapaRefuerzoPuntal[], bs: number, fc: number): VerificacionCA4 {
  const suma = sumatoriaRefuerzoPuntal(capas, bs);
  const cumpleSuma = suma >= CUANTIA_MIN_REFUERZO_PUNTAL;
  const fcDentroDeLimite = fc <= FC_MAX_ECUACION_CA4_MPA;
  const alfaUnaDireccionOk = capas.length === 1 ? capas[0].alfa >= ALFA_MIN_UNA_DIRECCION_GRADOS : null;
  return {
    suma,
    cumpleSuma,
    fcDentroDeLimite,
    alfaUnaDireccionOk,
    cumple: cumpleSuma && fcDentroDeLimite && alfaUnaDireccionOk !== false,
  };
}

/* ═════════════════════════ C-A.4 — Tensores ═════════════════════════ */

/** Δfp permitido (C-A.4.1, C-225): 420 MPa en preesforzado adherido, 70 MPa no adherido. */
export function deltaFpPermitido(adherido: boolean): number {
  return adherido ? DELTA_FP_MPA.adherido : DELTA_FP_MPA.noAdherido;
}

export interface EntradaTensor {
  /** Área del refuerzo no preesforzado Ats (mm²). */
  Ats: number;
  fy: number;
  /** Área del acero de preesforzado Atp (mm²); 0 si no hay. */
  Atp?: number;
  /** Esfuerzo efectivo en el preesfuerzo, fse (MPa). */
  fse?: number;
  /** Incremento de esfuerzo Δfp (MPa). */
  dfp?: number;
  /** Resistencia a la fluencia del acero de preesforzado, fpy (MPa). */
  fpy?: number;
}

/**
 * Ec. C-A-6 (C-225): Fnt = Ats fy + Atp (fse + Δfp), con (fse + Δfp) ≤ fpy y Atp = 0 en elementos no preesforzados. kN.
 */
export function resistenciaTensor(e: EntradaTensor): { Fnt: number; aporteNoPreesforzado: number; aportePreesforzado: number; esfuerzoPreesfuerzo: number } {
  const Atp = e.Atp ?? 0;
  const aporteNo = (e.Ats * e.fy) / 1000;
  if (Atp === 0) return { Fnt: aporteNo, aporteNoPreesforzado: aporteNo, aportePreesforzado: 0, esfuerzoPreesfuerzo: 0 };
  if (e.fse === undefined || e.dfp === undefined || e.fpy === undefined) {
    throw new RangeError('con Atp > 0 se requieren fse, Δfp y fpy');
  }
  const f = Math.min(e.fse + e.dfp, e.fpy);
  const aporteP = (Atp * f) / 1000;
  return { Fnt: aporteNo + aporteP, aporteNoPreesforzado: aporteNo, aportePreesforzado: aporteP, esfuerzoPreesfuerzo: f };
}

/** Área de refuerzo de tensor (mm²) necesaria para φ·Ats·fy ≥ Fu (solo refuerzo no preesforzado). Fu en kN. */
export function areaTensorRequerida(Fu: number, phi: number, fy: number): number {
  if (!(phi > 0) || !(fy > 0)) throw new RangeError('φ y fy deben ser positivos');
  return (Fu * 1000) / (phi * fy);
}

/* ═════════════════════════ C-A.5 — Zonas nodales ═════════════════════════ */

/** Ec. C-A-7 (C-225): Fnn = fce·Anz (kN) con fce de C-A-8 según el tipo de zona nodal; Anz = menor de (a) y (b). */
export function resistenciaZonaNodal(fc: number, tipo: TipoZonaNodal, Anz: number): { fce: number; Fnn: number } {
  if (!(Anz > 0)) throw new RangeError('Anz debe ser positivo');
  const fce = fceEfectiva(fc, betaN(tipo));
  return { fce, Fnn: (fce * Anz) / 1000 };
}

/** Anz (C-A.5.1): menor entre el área de la cara donde actúa Fu (a) y el área de la sección perpendicular a la resultante (b). */
export function areaZonaNodal(caraFu: number, seccionResultante: number): number {
  return Math.min(caraFu, seccionResultante);
}

/* ═════════════════════════ Auxiliares de geometría y estática (no son de la norma) ═════════════════════════ */

/**
 * (auxiliar) Ancho del puntal medido perpendicularmente a su eje, en una zona nodal con apoyo de longitud `lb` y un
 * tensor horizontal de ancho (altura) `wt`, para un puntal inclinado θ respecto de la horizontal:
 * ws = lb·senθ + wt·cosθ. Es la proyección de las dos caras de la zona nodal sobre la normal del puntal.
 */
export function anchoPuntalEnNodo(lb: number, wt: number, thetaGrados: number): number {
  const t = aRad(thetaGrados);
  return lb * Math.sin(t) + wt * Math.cos(t);
}

export interface CerchaVigaAlta {
  /** Reacción en cada apoyo (kN). */
  reaccion: number;
  /** Ángulo del puntal con la horizontal (grados). */
  theta: number;
  /** Compresión en cada puntal diagonal (kN). */
  puntal: number;
  /** Tracción en el tensor inferior (kN). */
  tensor: number;
  /** Cumple C-A.2.5 (θ ≥ 25°). */
  anguloOk: boolean;
}

/**
 * (auxiliar) Estática del modelo más simple de una viga de gran altura simplemente apoyada con una carga central P:
 * dos puntales diagonales que van de la carga a los apoyos y un tensor inferior horizontal.
 * @param P carga mayorada central (kN) · @param luz distancia entre los ejes de las reacciones (mm) · @param z brazo
 * vertical entre el eje del nodo superior y el eje del tensor (mm).
 * θ = atan(z/(L/2)); C = (P/2)/senθ; T = (P/2)/tanθ = P·L/(4z).
 */
export function cerchaVigaAltaCargaCentral(P: number, luz: number, z: number): CerchaVigaAlta {
  if (!(P > 0 && luz > 0 && z > 0)) throw new RangeError('P, luz y z deben ser positivos');
  const R = P / 2;
  const thetaRad = Math.atan2(z, luz / 2);
  const theta = (thetaRad * 180) / Math.PI;
  return {
    reaccion: R,
    theta,
    puntal: R / Math.sin(thetaRad),
    tensor: R / Math.tan(thetaRad),
    anguloOk: anguloPermitido(theta),
  };
}
