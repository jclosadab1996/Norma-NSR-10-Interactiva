/**
 * Capítulo C.8 — Análisis y diseño: consideraciones generales. Lógica pura compartida por el capítulo MDX (ejemplos).
 * Página PDF = página impresa "C-n" + 302 (C.8 ocupa PDF 363–368, C-61 a C-66). El módulo de elasticidad y el factor λ
 * básicos están en `concreto.ts`; aquí van la redistribución de momentos, las luces, las alas de vigas T, las
 * losas nervadas y la rigidez efectiva.
 */
import { ES_ACERO_MPA, moduloElasticidad } from './concreto';

// ---------------------------------------------------------------------------------------------
// C.8.4 — Redistribución de momentos (PDF p.363, C-61)
// ---------------------------------------------------------------------------------------------

/** C.8.4.1: porcentaje máximo de reducción = 1000·εt, con tope de 20 %. */
export const REDISTRIBUCION_MAX_PCT = 20;
/** C.8.4.2: solo se redistribuye si εt ≥ 0.0075 en la sección cuyo momento se reduce. */
export const EPSILON_T_MIN_REDISTRIBUCION = 0.0075;
/** C.10.2.3 (PDF p.377): deformación unitaria máxima utilizable del concreto en compresión. */
export const EPSILON_CU = 0.003;

/** Deformación unitaria neta de tracción en el acero extremo: εt = 0.003 (dt − c) / c (compatibilidad de deformaciones, C.10.2). */
export function epsilonT(c: number, dt: number): number {
  return (EPSILON_CU * (dt - c)) / c;
}

export interface Redistribucion {
  /** false si εt < 0.0075 (C.8.4.2): no se permite redistribuir. */
  permitida: boolean;
  /** Porcentaje máximo de disminución del momento: mín(1000 εt, 20), o 0 si no se permite. */
  porcentaje: number;
}

export function redistribucionMaxima(epsT: number): Redistribucion {
  if (epsT < EPSILON_T_MIN_REDISTRIBUCION) return { permitida: false, porcentaje: 0 };
  return { permitida: true, porcentaje: Math.min(1000 * epsT, REDISTRIBUCION_MAX_PCT) };
}

/** Momento mayorado elástico M reducido en el porcentaje máximo permitido por C.8.4.1. */
export function momentoRedistribuido(M: number, epsT: number): number {
  return M * (1 - redistribucionMaxima(epsT).porcentaje / 100);
}

/**
 * C.8.4.3: el equilibrio estático se mantiene. En un vano con momento isostático M0 (= wu·L²/8 si la carga es uniforme),
 * M⁺ + (M⁻izq + M⁻der)/2 = M0. Devuelve el momento positivo tras redistribuir los negativos de los apoyos.
 */
export function momentoPositivoPorEquilibrio(M0: number, MnegIzq: number, MnegDer: number): number {
  return M0 - (MnegIzq + MnegDer) / 2;
}

// ---------------------------------------------------------------------------------------------
// C.8.5 y C.8.6 — Módulo de elasticidad y concreto liviano (PDF p.364, C-62)
// ---------------------------------------------------------------------------------------------

/** Relación modular n = Es / Ec con Es = 200 000 MPa (C.8.5.2) y Ec de C.8.5.1. */
export function relacionModular(fc: number, wc?: number): number {
  return ES_ACERO_MPA / moduloElasticidad(fc, wc);
}

/**
 * Interpolación de λ de C.8.6.1. `fraccionNormal` en [0, 1] es la fracción volumétrica de agregado de peso normal:
 * - 'fino-liviano': parte del fino liviano se reemplaza por fino de peso normal → entre 0.75 y 0.85.
 * - 'grueso-mixto': fino de peso normal y gruesos normal + liviano → interpolación lineal entre 0.85 y 1.0.
 * La norma dice "con base en fracciones volumétricas" (primer caso) e "interpolación lineal" (segundo); que la variable sea
 * exactamente la fracción volumétrica del agregado de peso normal es criterio propio.
 */
export function lambdaInterpolado(caso: 'fino-liviano' | 'grueso-mixto', fraccionNormal: number): number {
  const f = Math.min(1, Math.max(0, fraccionNormal));
  return caso === 'fino-liviano' ? 0.75 + 0.1 * f : 0.85 + 0.15 * f;
}

// ---------------------------------------------------------------------------------------------
// C.8.8 — Rigidez efectiva para deflexiones laterales (PDF p.364, C-62)
// ---------------------------------------------------------------------------------------------

/**
 * Factor sobre la rigidez de la sección bruta (EIg) para el análisis lineal de deflexiones laterales:
 * - fuerzas mayoradas, opción (b) de C.8.8.2: 0.5 · EIg;
 * - fuerzas de servicio (C.8.8.1): 1.4 veces la rigidez de C.8.8.2, sin superar la de la sección bruta → mín(1.4 · 0.5, 1) = 0.7.
 * La opción (a) de C.8.8.2 usa las propiedades de C.10.10.4(a)–(c), que no están en este capítulo.
 */
export function factorRigidezLateral(caso: 'mayoradas' | 'servicio'): number {
  return caso === 'mayoradas' ? 0.5 : Math.min(1.4 * 0.5, 1);
}

// ---------------------------------------------------------------------------------------------
// C.8.9 — Longitud del vano (PDF p.365, C-63)
// ---------------------------------------------------------------------------------------------

export interface LuzCalculo {
  luz: number;
  criterio: string;
}

/**
 * C.8.9.1: elementos no construidos monolíticamente con sus apoyos: luz libre + altura del elemento, sin exceder la distancia
 * entre centros de apoyos.
 */
export function luzElementoNoMonolitico(luzLibre: number, h: number, centrosApoyos: number): LuzCalculo {
  const suma = luzLibre + h;
  return suma <= centrosApoyos
    ? { luz: suma, criterio: 'C.8.9.1: luz libre + altura del elemento' }
    : { luz: centrosApoyos, criterio: 'C.8.9.1: la luz libre + h excede la distancia entre centros; gobierna la distancia entre centros' };
}

/** C.8.9.4: losas macizas o nervadas monolíticas con luces libres ≤ 3 m: continuas sobre apoyos simples con luz = luz libre. */
export function luzLosaLuzCorta(luzLibre: number): LuzCalculo | null {
  return luzLibre <= 3 ? { luz: luzLibre, criterio: 'C.8.9.4: luz libre de la losa (se desprecia el ancho de las vigas)' } : null;
}

// ---------------------------------------------------------------------------------------------
// C.8.12 — Sistemas de vigas T (PDF p.365–366, C-63 a C-64)
// ---------------------------------------------------------------------------------------------

export type TipoVigaT = 'ambos-lados' | 'un-lado' | 'aislada';

export interface AnchoAla {
  /** Ancho efectivo total del ala (mm o la unidad usada), incluye el alma. */
  be: number;
  /** Ancho sobresaliente efectivo a cada lado (o al único lado). */
  voladizo: number;
  /** Límite que gobierna el voladizo. */
  gobierna: string;
  /** Solo viga aislada: ¿cumple hf ≥ bw/2? (C.8.12.4). */
  cumpleEspesorAislada?: boolean;
}

export interface EntradaVigaT {
  tipo: TipoVigaT;
  /** Luz de la viga. */
  luz: number;
  /** Espesor de la losa (ala). */
  hf: number;
  /** Ancho del alma. */
  bw: number;
  /** Distancia libre a la siguiente alma (no se usa en vigas aisladas). */
  libreAlmas?: number;
}

/**
 * Ancho efectivo del ala de una viga T.
 * - Ambos lados (C.8.12.2): be ≤ L/4 y voladizo a cada lado ≤ mín(8 hf, libre/2).
 * - Un solo lado (C.8.12.3): voladizo ≤ mín(L/12, 6 hf, libre/2).
 * - Viga aislada (C.8.12.4): hf ≥ bw/2 y be ≤ 4 bw.
 */
export function anchoEfectivoAla(e: EntradaVigaT): AnchoAla {
  if (e.tipo === 'aislada') {
    return { be: 4 * e.bw, voladizo: 1.5 * e.bw, gobierna: 'C.8.12.4: be ≤ 4 bw', cumpleEspesorAislada: e.hf >= e.bw / 2 };
  }
  const medio = (e.libreAlmas ?? Infinity) / 2;
  if (e.tipo === 'ambos-lados') {
    const opciones: [number, string][] = [
      [8 * e.hf, '8 hf'],
      [medio, 'la mitad de la distancia libre a la siguiente alma'],
    ];
    const [voladizo, gobiernaVol] = opciones.reduce((a, b) => (b[0] < a[0] ? b : a));
    const beLimite = e.luz / 4;
    const beSuma = e.bw + 2 * voladizo;
    return beSuma <= beLimite
      ? { be: beSuma, voladizo, gobierna: `C.8.12.2: voladizo limitado por ${gobiernaVol}` }
      : { be: beLimite, voladizo: (beLimite - e.bw) / 2, gobierna: 'C.8.12.2: be ≤ L/4' };
  }
  const opciones: [number, string][] = [
    [e.luz / 12, 'L/12'],
    [6 * e.hf, '6 hf'],
    [medio, 'la mitad de la distancia libre a la siguiente alma'],
  ];
  const [voladizo, gobiernaVol] = opciones.reduce((a, b) => (b[0] < a[0] ? b : a));
  return { be: e.bw + voladizo, voladizo, gobierna: `C.8.12.3: voladizo limitado por ${gobiernaVol}` };
}

/** C.8.12.5.2: separación máxima del refuerzo transversal del ala: 5 hf y 450 mm. */
export function separacionMaximaRefuerzoAla(hf: number): number {
  return Math.min(5 * hf, 450);
}

// ---------------------------------------------------------------------------------------------
// C.8.13 — Viguetas en losas nervadas (PDF p.366–367, C-64 a C-65)
// ---------------------------------------------------------------------------------------------

export const LIMITES_NERVADAS = {
  /** C.8.13.2: ancho en la parte superior ≥ 100 mm; ancho promedio ≥ 80 mm; altura ≤ 5 veces el ancho promedio. */
  anchoSuperiorMinMm: 100,
  anchoPromedioMinMm: 80,
  alturaMaxFactorAncho: 5,
  /** C.8.13.3: separación máxima centro a centro. Una dirección: 2.5 h sin exceder 1.20 m; dos direcciones: 3.5 h sin exceder 1.50 m. */
  unaDireccion: { factorH: 2.5, maxMm: 1200 },
  dosDirecciones: { factorH: 3.5, maxMm: 1500 },
  /** C.8.13.3.1: viguetas transversales de repartición: separación libre máxima 10 h sin exceder 4.0 m. */
  transversalFactorH: 10,
  transversalMaxMm: 4000,
  /** C.8.13.5.2: loseta con aligeramientos de arcilla o concreto de resistencia ≥ f'c de las viguetas. */
  losetaMinMm: 45,
  losetaFraccionLibre: 1 / 20,
  losetaAligeramientoPermanenteMm: 40,
  /** C.8.13.6.1: aligeramientos removibles. */
  losetaRemovibleFraccionLibre: 1 / 12,
  losetaRemovibleMinMm: 50,
  /** C.8.13.7: sobre ductos embebidos, espesor ≥ altura del ducto + 25 mm. */
  sobreDuctoMm: 25,
  /** C.8.13.8: Vc puede tomarse 10 % mayor. */
  factorVc: 1.1,
} as const;

/** C.8.13.3: separación máxima centro a centro entre nervios para una losa de espesor total h (mm). */
export function separacionMaximaNervios(h: number, direcciones: 1 | 2): number {
  const l = direcciones === 1 ? LIMITES_NERVADAS.unaDireccion : LIMITES_NERVADAS.dosDirecciones;
  return Math.min(l.factorH * h, l.maxMm);
}

/** C.8.13.3.1: separación libre máxima de viguetas transversales de repartición (losas en una dirección). */
export function separacionMaximaViguetasReparticion(h: number): number {
  return Math.min(LIMITES_NERVADAS.transversalFactorH * h, LIMITES_NERVADAS.transversalMaxMm);
}

/**
 * C.8.13.5.2: espesor mínimo de la loseta vaciada en sitio con aligeramientos de arcilla o concreto:
 * 45 mm y no menos de 1/20 de la distancia libre entre nervios. La norma añade que sobre aligeramientos permanentes
 * (concreto, arcilla, plaquetas) la parte vaciada en sitio "puede reducirse a 40 mm": con `reducida40 = true` se usa
 * 40 mm en lugar de 45 mm (la redacción es ambigua; ver la nota del capítulo).
 */
export function espesorMinimoLoseta(libreEntreNervios: number, reducida40 = false): number {
  const base = reducida40 ? LIMITES_NERVADAS.losetaAligeramientoPermanenteMm : LIMITES_NERVADAS.losetaMinMm;
  return Math.max(base, LIMITES_NERVADAS.losetaFraccionLibre * libreEntreNervios);
}

/** C.8.13.6.1: espesor mínimo de la loseta con encofrados o aligeramientos removibles: 1/12 de la distancia libre y no menos de 50 mm. */
export function espesorMinimoLosetaRemovible(libreEntreNervios: number): number {
  return Math.max(LIMITES_NERVADAS.losetaRemovibleFraccionLibre * libreEntreNervios, LIMITES_NERVADAS.losetaRemovibleMinMm);
}

export interface EntradaNervadas {
  direcciones: 1 | 2;
  /** Espesor total de la losa (mm). */
  h: number;
  /** Separación centro a centro entre nervios (mm). */
  separacion: number;
  /** Ancho de la nervadura en su parte superior y promedio (mm). */
  anchoSuperior: number;
  anchoPromedio: number;
  /** Altura de la nervadura bajo la loseta (mm). */
  alturaNervio: number;
}

export interface VerificacionNervadas {
  separacionMaxima: number;
  cumpleSeparacion: boolean;
  cumpleAnchoSuperior: boolean;
  cumpleAnchoPromedio: boolean;
  alturaMaximaNervio: number;
  cumpleAlturaNervio: boolean;
  cumple: boolean;
}

/** Verificación de los límites geométricos de C.8.13.2 y C.8.13.3. */
export function verificarNervadas(e: EntradaNervadas): VerificacionNervadas {
  const separacionMaxima = separacionMaximaNervios(e.h, e.direcciones);
  const alturaMaximaNervio = LIMITES_NERVADAS.alturaMaxFactorAncho * e.anchoPromedio;
  const r = {
    separacionMaxima,
    cumpleSeparacion: e.separacion <= separacionMaxima,
    cumpleAnchoSuperior: e.anchoSuperior >= LIMITES_NERVADAS.anchoSuperiorMinMm,
    cumpleAnchoPromedio: e.anchoPromedio >= LIMITES_NERVADAS.anchoPromedioMinMm,
    alturaMaximaNervio,
    cumpleAlturaNervio: e.alturaNervio <= alturaMaximaNervio,
  };
  return { ...r, cumple: r.cumpleSeparacion && r.cumpleAnchoSuperior && r.cumpleAnchoPromedio && r.cumpleAlturaNervio };
}

/** C.8.13.7: espesor mínimo de la losa en cualquier punto donde se embeben ductos o tuberías = altura del ducto + 25 mm. */
export function espesorMinimoSobreDucto(alturaDucto: number): number {
  return alturaDucto + LIMITES_NERVADAS.sobreDuctoMm;
}
