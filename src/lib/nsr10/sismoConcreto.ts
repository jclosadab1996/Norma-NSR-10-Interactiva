/**
 * Lógica del Capítulo C.21 (diseño sismo resistente del concreto estructural). Las constantes y límites numéricos viven en
 * `src/data/sismoConcreto.ts`; aquí van solo las ecuaciones y verificaciones. Unidades: mm, mm², MPa, kN, kN·m.
 * PDF = página impresa "C-n" + 302.
 */
import { ES_ACERO_MPA, beta1 } from './concreto';
import { cuantiaEspiralMinima } from './flexionConcreto';
import {
  COEF_CORTANTE_NUDO,
  DES_COLUMNA,
  DES_VIGA,
  DIAFRAGMA,
  DMO_COLUMNA,
  DMO_MURO,
  DMO_VIGA,
  MATERIALES_C211,
  MURO_ESPECIAL,
  NUDO,
  VIGA_ACOPLE,
  type ConfinamientoNudo,
} from '../../data/sismoConcreto';

const EPS_CU = 0.003;

/* ------------------------------------------------------------------------------------------------ */
/* Vigas de pórticos DES (C.21.5) y cortante de diseño Ve                                              */
/* ------------------------------------------------------------------------------------------------ */

export interface EntradaMpr {
  /** Ancho de la cara en compresión (mm). */
  b: number;
  /** Altura útil al refuerzo de tracción (mm). */
  d: number;
  fc: number;
  fy: number;
  /** Área del refuerzo de tracción (mm²). */
  As: number;
  /** Refuerzo de compresión (mm²) y su profundidad d′ (mm); opcionales. */
  Aprime?: number;
  dPrime?: number;
  /** Factor del esfuerzo de tracción, 1.25 por defecto (Notación Mpr, PDF p.313; C.21.7.2.1). */
  alfa?: number;
}

export interface ResultadoMpr {
  /** Profundidad del eje neutro c y del bloque a = β1 c (mm). */
  c: number;
  a: number;
  /** Momento probable en kN·m (φ = 1.0). */
  Mpr: number;
  /** Esfuerzo supuesto en la tracción (MPa) y en el refuerzo de compresión (MPa). */
  fsTraccion: number;
  fsCompresion: number;
}

/**
 * Momento de resistencia probable Mpr de una sección rectangular (Notación C.2, PDF p.313; C.21.5.4.1): se calcula con las
 * propiedades de la sección suponiendo esfuerzo de tracción α·fy en el refuerzo (α = 1.25) y φ = 1.0.
 * Sin refuerzo de compresión: a = α fy As / (0.85 f′c b); Mpr = α fy As (d − a/2).
 * Con refuerzo de compresión se resuelve la compatibilidad de deformaciones (εcu = 0.003; el refuerzo de compresión
 * llega como máximo a fy). Hipótesis del proyecto: bloque rectangular, sin descontar el concreto desplazado por A′s.
 */
export function momentoProbable(e: EntradaMpr): ResultadoMpr {
  const alfa = e.alfa ?? DES_VIGA.alfaMpr;
  const T = alfa * e.fy * e.As;
  const Ap = e.Aprime ?? 0;
  const dp = e.dPrime ?? 0;
  const b1 = beta1(e.fc);
  const fsComp = (c: number) => (Ap > 0 ? Math.min(e.fy, Math.max(0, ES_ACERO_MPA * EPS_CU * (1 - dp / c))) : 0);
  const equilibrio = (c: number) => 0.85 * e.fc * e.b * b1 * c + Ap * fsComp(c) - T;
  let c: number;
  if (Ap <= 0) {
    c = T / (0.85 * e.fc * e.b * b1);
  } else {
    let lo = 1e-6;
    let hi = 5 * e.d;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (equilibrio(mid) > 0) hi = mid;
      else lo = mid;
    }
    c = (lo + hi) / 2;
  }
  const a = b1 * c;
  const fsp = fsComp(c);
  const Mpr = (0.85 * e.fc * e.b * a * (e.d - a / 2) + Ap * fsp * (e.d - dp)) / 1e6;
  return { c, a, Mpr, fsTraccion: alfa * e.fy, fsCompresion: fsp };
}

export interface EntradaVe {
  /** Momentos probables (kN·m) en las caras de apoyo: negativo (refuerzo superior) y positivo (inferior), extremo izquierdo y derecho. */
  mprNegIzq: number;
  mprPosIzq: number;
  mprNegDer: number;
  mprPosDer: number;
  /** Luz libre ℓn (m) y carga gravitacional mayorada uniforme en la luz (kN/m). */
  luzLibre: number;
  wu: number;
}

export interface ResultadoVe {
  /** Parte sísmica (Mpr1 + Mpr2)/ℓn para cada sentido de giro del pórtico (kN). */
  vsismoSentido1: number;
  vsismoSentido2: number;
  /** Parte gravitacional wu ℓn/2 (kN). */
  vgravedad: number;
  /** Cortante de diseño en cada extremo (kN) y el máximo. */
  veIzq: number;
  veDer: number;
  ve: number;
  /** Parte sísmica del cortante que gobierna (kN) y su fracción de Ve. */
  vsismo: number;
  fraccionSismica: number;
}

/**
 * Cortante de diseño de la viga, Ve (C.21.5.4.1, PDF p.486, C-184): estática del tramo entre caras de nudo con momentos de
 * signo opuesto Mpr en los extremos más la carga gravitacional mayorada.
 * Para cada sentido de la fuerza lateral: Vsismo = (Mpr,i + Mpr,j) / ℓn, y Ve = Vsismo + wu ℓn/2 en el extremo cuya
 * reacción de gravedad se suma. (La expresión es estática; la norma solo describe el procedimiento.)
 */
export function cortanteDisenoViga(e: EntradaVe): ResultadoVe {
  const vgravedad = (e.wu * e.luzLibre) / 2;
  // Sentido 1: momento negativo en el extremo izquierdo y positivo en el derecho. Sentido 2: al revés.
  const vsismoSentido1 = (e.mprNegIzq + e.mprPosDer) / e.luzLibre;
  const vsismoSentido2 = (e.mprPosIzq + e.mprNegDer) / e.luzLibre;
  const veIzq = vsismoSentido1 + vgravedad;
  const veDer = vsismoSentido2 + vgravedad;
  const ve = Math.max(veIzq, veDer);
  const vsismo = veIzq >= veDer ? vsismoSentido1 : vsismoSentido2;
  return { vsismoSentido1, vsismoSentido2, vgravedad, veIzq, veDer, ve, vsismo, fraccionSismica: vsismo / ve };
}

/** Longitud de la zona de estribos cerrados de confinamiento en vigas: 2 h desde la cara (C.21.5.3.1; C.21.3.4.6). */
export function longitudConfinamientoViga(h: number): number {
  return DES_VIGA.longitudConfinamientoFactorH * h;
}

export interface LimiteSeparacion {
  etiqueta: string;
  valor: number;
}

export interface ResultadoSeparacion {
  limites: LimiteSeparacion[];
  /** Separación máxima permitida (menor de los límites), mm. */
  s: number;
  /** Etiqueta del límite que gobierna. */
  gobierna: string;
}

function minimoDe(limites: LimiteSeparacion[]): ResultadoSeparacion {
  const g = limites.reduce((m, l) => (l.valor < m.valor ? l : m));
  return { limites, s: g.valor, gobierna: g.etiqueta };
}

/**
 * Separación máxima de los estribos cerrados de confinamiento de una viga (DMO: C.21.3.4.6, PDF p.481, C-179;
 * DES: C.21.5.3.2, PDF p.485, C-183): menor de d/4, 8 db (barra longitudinal confinada más pequeña), 24 dbe y 300 mm.
 * El primer estribo va a no más de 50 mm de la cara del apoyo.
 */
export function separacionEstribosViga(grado: 'DMO' | 'DES', d: number, dbLongMenor: number, dbEstribo: number): ResultadoSeparacion {
  const r = grado === 'DES' ? DES_VIGA.separacion : DMO_VIGA.separacion;
  return minimoDe([
    { etiqueta: `d/${r.dEntre}`, valor: d / r.dEntre },
    { etiqueta: `${r.vecesDbLongitudinal} db longitudinal`, valor: r.vecesDbLongitudinal * dbLongMenor },
    { etiqueta: `${r.vecesDbEstribo} dbe`, valor: r.vecesDbEstribo * dbEstribo },
    { etiqueta: `${r.maximo} mm`, valor: r.maximo },
  ]);
}

/** Separación máxima de los estribos que confinan un traslapo de flexión en vigas DES: menor de d/4 y 100 mm (C.21.5.2.3, C-182). */
export function separacionEstribosTraslapoViga(d: number): number {
  return Math.min(d / DES_VIGA.traslapo.dEntre, DES_VIGA.traslapo.maximo);
}

/** Verifica que Vc = 0 para la zona de confinamiento (C.21.5.4.2, PDF p.486, C-184): (a) Vsismo ≥ ½ Ve y (b) Pu < Ag f′c/20. */
export function vcEsCeroViga(vSismo: number, ve: number, Pu: number, Ag: number, fc: number): boolean {
  return vSismo >= DES_VIGA.vcCeroFraccionCortante * ve && Pu < (DES_VIGA.vcCeroAxial * Ag * fc) / 1000;
}

/** Av/s (mm²/mm) necesaria para resistir Vs = Ve/φ − Vc con estribos de fyt (C.11.4.7.2 con Vs = Av fyt d / s). Ve y Vc en kN. */
export function avSobreS(ve: number, phi: number, vc: number, fyt: number, d: number): number {
  const vs = Math.max(0, ve / phi - vc);
  return (vs * 1000) / (fyt * d);
}

/* ------------------------------------------------------------------------------------------------ */
/* Resistencia de columnas frente a vigas (C.21.3.6.2 y C.21.6.2.2, Ec. C.21-4)                         */
/* ------------------------------------------------------------------------------------------------ */

export interface ResultadoColumnaFuerte {
  /** ΣMnc / ΣMnb. */
  relacion: number;
  /** ΣMnc mínimo exigido, 1.2 ΣMnb. */
  sumMncMinimo: number;
  cumple: boolean;
}

/** Ec. C.21-4: ΣMnc ≥ 1.2 ΣMnb (PDF p.483 y p.486, C-181 y C-184). Momentos nominales en las caras del nudo. */
export function relacionColumnaViga(sumMnc: number, sumMnb: number, factor: number = DES_COLUMNA.relacionColumnaViga): ResultadoColumnaFuerte {
  return { relacion: sumMnc / sumMnb, sumMncMinimo: factor * sumMnb, cumple: sumMnc >= factor * sumMnb - 1e-9 };
}

/* ------------------------------------------------------------------------------------------------ */
/* Refuerzo de confinamiento de columnas                                                               */
/* ------------------------------------------------------------------------------------------------ */

export type GradoColumna = 'DMO' | 'DES';

export interface EntradaAsh {
  /** Separación centro a centro de los estribos (mm). */
  s: number;
  /** Dimensión del núcleo medida entre los bordes externos del refuerzo transversal (mm). */
  bc: number;
  fc: number;
  fyt: number;
  /** Área bruta y área del núcleo confinado medida a los bordes externos del estribo (mm²). */
  Ag: number;
  Ach: number;
}

export interface ResultadoAsh {
  /** Ec. C.21-2 (DMO) o C.21-7 (DES), mm². */
  ashConAg: number;
  /** Ec. C.21-3 (DMO) o C.21-8 (DES), mm². */
  ashMinimo: number;
  /** Mayor de las dos (mm²): área requerida. */
  ash: number;
  gobierna: 'Ag/Ach' | 'mínimo';
  /** fyt realmente usado (≤ 700 MPa, C.21.1.5.4). */
  fytUsado: number;
}

/**
 * Área mínima del refuerzo de confinamiento rectangular Ash (PDF p.482 y p.488, C-180 y C-186):
 *   DES: Ash ≥ 0.3 (s bc f′c/fyt)(Ag/Ach − 1) (C.21-7) y Ash ≥ 0.09 s bc f′c/fyt (C.21-8).
 *   DMO: Ash ≥ 0.2 (s bc f′c/fyt)(Ag/Ach − 1) (C.21-2) y Ash ≥ 0.06 s bc f′c/fyt (C.21-3).
 * Rige el mayor de los dos. fyt se limita a 700 MPa para esta cuantía (C.21.1.5.4, PDF p.478, C-176).
 */
export function ashRequerido(grado: GradoColumna, e: EntradaAsh): ResultadoAsh {
  const k = grado === 'DES' ? DES_COLUMNA.ash : DMO_COLUMNA.ash;
  const fytUsado = Math.min(e.fyt, MATERIALES_C211.fytMax);
  const base = (e.s * e.bc * e.fc) / fytUsado;
  const ashConAg = k.coefConAg * base * (e.Ag / e.Ach - 1);
  const ashMinimo = k.coefMinimo * base;
  return { ashConAg, ashMinimo, ash: Math.max(ashConAg, ashMinimo), gobierna: ashConAg >= ashMinimo ? 'Ag/Ach' : 'mínimo', fytUsado };
}

/** Separación máxima de estribos por unidad: inversa de Ash,req/s. Devuelve la s (mm) a la que Ash,req = ashProvisto, o null si no hay solución. */
export function separacionPorAshProvisto(grado: GradoColumna, ashProvisto: number, e: Omit<EntradaAsh, 's'>): number {
  const unidad = ashRequerido(grado, { ...e, s: 1 }).ash; // Ash,req es lineal en s
  return unidad > 0 ? ashProvisto / unidad : Infinity;
}

export interface ResultadoRhoS {
  /** Cuantía por el coeficiente del grado: 0.08 f′c/fyt (C.21-1) o 0.12 f′c/fyt (C.21-6). */
  rhoGrado: number;
  /** Cuantía mínima de la Ec. C.10-5: 0.45 (Ag/Ach − 1) f′c/fyt. */
  rhoC105: number;
  rhoS: number;
  gobierna: 'Ec. C.21' | 'Ec. C.10-5';
}

/** Cuantía volumétrica de espiral o estribos circulares (C.21-1 DMO, C.21-6 DES) y no menor que la Ec. C.10-5. */
export function cuantiaVolumetricaEspiral(grado: GradoColumna, fc: number, fyt: number, Ag: number, Ach: number): ResultadoRhoS {
  const coef = grado === 'DES' ? DES_COLUMNA.coefEspiral : DMO_COLUMNA.coefEspiral;
  const fytUsado = Math.min(fyt, MATERIALES_C211.fytMax);
  const rhoGrado = (coef * fc) / fytUsado;
  const rhoC105 = cuantiaEspiralMinima(Ag, Ach, fc, fyt);
  return { rhoGrado, rhoC105, rhoS: Math.max(rhoGrado, rhoC105), gobierna: rhoGrado >= rhoC105 ? 'Ec. C.21' : 'Ec. C.10-5' };
}

/** Ec. C.21-5 (C.21.6.4.3, PDF p.487, C-185): so = 100 + (350 − hx)/3, acotado entre 100 y 150 mm. */
export function separacionSoDES(hx: number): number {
  const k = DES_COLUMNA.so;
  const so = k.base + (k.hxReferencia - hx) / k.divisor;
  return Math.min(k.max, Math.max(k.min, so));
}

export interface EntradaSeparacionColumna {
  /** Dimensión menor de la sección (mm). */
  dimensionMenor: number;
  /** Diámetro de la barra longitudinal confinada de menor diámetro (mm). */
  dbLongMenor: number;
  /** Diámetro de la barra del estribo (mm); solo se usa en DMO (16 dbe). */
  dbEstribo?: number;
  /** Separación máxima entre ramas o ganchos suplementarios hx (mm); solo se usa en DES. */
  hx?: number;
}

/**
 * Separación máxima del refuerzo transversal de confinamiento en la longitud ℓo de la columna:
 *   DES (C.21.6.4.3): menor de (a) dimensión mínima/4, (b) 6 db, (c) so (Ec. C.21-5, 100 a 150 mm).
 *   DMO (C.21.3.5.6): so = menor de 8 db, 16 dbe, dimensión menor/3 y 150 mm.
 */
export function separacionMaximaColumna(grado: GradoColumna, e: EntradaSeparacionColumna): ResultadoSeparacion {
  if (grado === 'DES') {
    const k = DES_COLUMNA.separacion;
    return minimoDe([
      { etiqueta: `lado menor/${k.dimensionMinimaEntre}`, valor: e.dimensionMenor / k.dimensionMinimaEntre },
      { etiqueta: `${k.vecesDbLongitudinal} db`, valor: k.vecesDbLongitudinal * e.dbLongMenor },
      { etiqueta: 'so (Ec. C.21-5)', valor: separacionSoDES(e.hx ?? DES_COLUMNA.hxMax) },
    ]);
  }
  const k = DMO_COLUMNA.so;
  return minimoDe([
    { etiqueta: `${k.vecesDbLongitudinal} db`, valor: k.vecesDbLongitudinal * e.dbLongMenor },
    { etiqueta: `${k.vecesDbEstribo} dbe`, valor: k.vecesDbEstribo * (e.dbEstribo ?? Infinity) },
    { etiqueta: `lado menor/${k.dimensionMenorEntre}`, valor: e.dimensionMenor / k.dimensionMenorEntre },
    { etiqueta: `${k.maximo} mm`, valor: k.maximo },
  ]);
}

export interface ResultadoLo {
  limites: LimiteSeparacion[];
  /** Longitud mínima ℓo de la zona de confinamiento medida desde la cara del nudo (mm). */
  lo: number;
  gobierna: string;
}

/**
 * Longitud ℓo (mayor de las tres):
 *   DES (C.21.6.4.1, PDF p.487, C-185): altura del elemento en la cara del nudo, luz libre/6 y 450 mm.
 *   DMO (C.21.3.5.6, PDF p.482, C-180): luz libre/6, mayor dimensión de la sección y 500 mm.
 * `dimensionSeccion` es la altura del elemento en la cara del nudo (DES) o la mayor dimensión (DMO).
 */
export function longitudLoColumna(grado: GradoColumna, dimensionSeccion: number, luzLibre: number): ResultadoLo {
  const k = grado === 'DES' ? DES_COLUMNA.lo : DMO_COLUMNA.lo;
  const limites: LimiteSeparacion[] = [
    { etiqueta: grado === 'DES' ? 'altura de la sección' : 'mayor dimensión', valor: dimensionSeccion },
    { etiqueta: `luz libre/${k.luzLibreEntre}`, valor: luzLibre / k.luzLibreEntre },
    { etiqueta: `${k.minimo} mm`, valor: k.minimo },
  ];
  const g = limites.reduce((m, l) => (l.valor > m.valor ? l : m));
  return { limites, lo: g.valor, gobierna: g.etiqueta };
}

/**
 * Separación del refuerzo transversal fuera de ℓo:
 *   DES (C.21.6.4.5, PDF p.488, C-186): menor de 6 db y 150 mm.
 *   DMO (C.21.3.5.11, PDF p.482, C-180): no mayor que 2 so (so = separación usada en ℓo).
 */
export function separacionFueraDeLo(grado: GradoColumna, dbLongMenor: number, sEnLo: number): number {
  if (grado === 'DES') return Math.min(DES_COLUMNA.fueraDeLo.vecesDb * dbLongMenor, DES_COLUMNA.fueraDeLo.maximo);
  return DMO_COLUMNA.fueraDeLoFactorSo * sEnLo;
}

/** Dimensiones del núcleo de una sección rectangular con estribos (hipótesis geométrica: recubrimiento libre `r` hasta el estribo). */
export function geometriaNucleo(b: number, h: number, recubrimiento: number, dbEstribo: number) {
  const bNucleoExt = b - 2 * recubrimiento; // medido a los bordes externos del estribo
  const hNucleoExt = h - 2 * recubrimiento;
  return {
    /** Ach: área del núcleo medida a los bordes externos del refuerzo transversal. */
    Ach: bNucleoExt * hNucleoExt,
    /** bc en cada dirección: entre bordes externos del refuerzo transversal. */
    bcB: bNucleoExt,
    bcH: hNucleoExt,
    /** Distancia entre ejes de las ramas del estribo (referencia para hx). */
    ejeB: bNucleoExt - dbEstribo,
    ejeH: hNucleoExt - dbEstribo,
  };
}

/* ------------------------------------------------------------------------------------------------ */
/* Nudos (C.21.7)                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** Ancho efectivo del nudo (C.21.7.4.1, PDF p.490, C-188): el ancho de la columna, salvo que la viga llegue a una columna más ancha. */
export function anchoEfectivoNudo(bColumna: number, bViga: number, hColumna: number, xMenor: number): number {
  if (bColumna <= bViga) return bColumna;
  return Math.min(bColumna, bViga + hColumna, 2 * xMenor);
}

/** Aj = profundidad del nudo (altura total h de la columna) × ancho efectivo (mm²). */
export function areaEfectivaNudo(hColumna: number, anchoEfectivo: number): number {
  return hColumna * anchoEfectivo;
}

/** Vn máximo del nudo en kN: coef · √f′c · Aj (concreto normal) o 3/4 de ese valor (liviano, C.21.7.4.2). */
export function vnMaximoNudo(fc: number, Aj: number, confinamiento: ConfinamientoNudo, liviano = false): number {
  const k = COEF_CORTANTE_NUDO[confinamiento] * (liviano ? NUDO.factorLiviano : 1);
  return (k * Math.sqrt(fc) * Aj) / 1000;
}

/** Cortante en el nudo Vu,j = T1 + T2 − Vcol con T = 1.25 fy As (C.21.7.2.1); As en mm², Vcol en kN; resultado en kN. */
export function cortanteNudo(asSuperior: number, asInferior: number, fy: number, vColumna: number): number {
  return (NUDO.alfaFy * fy * (asSuperior + asInferior)) / 1000 - vColumna;
}

/** Dimensión mínima de la columna paralela a la barra de viga que atraviesa el nudo: 20 db (26 db en liviano), C.21.7.2.3. */
export function dimensionColumnaMinimaNudo(dbViga: number, liviano = false): number {
  return (liviano ? NUDO.dimensionColumnaVecesDbLiviano : NUDO.dimensionColumnaVecesDb) * dbViga;
}

/** Ec. C.21-9 (C.21.7.5.1, PDF p.490, C-188): ℓdh = fy db / (5.4 √f′c), no menor que 8 db ni 150 mm (liviano: 10 db, 190 mm, 1.25 ×). */
export function longitudGanchoNudo(fy: number, db: number, fc: number, liviano = false): { requerida: number; ldh: number } {
  const requerida = (fy * db) / (NUDO.ldh.coef * Math.sqrt(fc));
  if (!liviano) return { requerida, ldh: Math.max(NUDO.ldh.vecesDb * db, NUDO.ldh.minimoMm, requerida) };
  return {
    requerida,
    ldh: Math.max(NUDO.ldh.vecesDbLiviano * db, NUDO.ldh.minimoMmLiviano, NUDO.ldh.factorLiviano * requerida),
  };
}

/** Barra recta en el nudo (C.21.7.5.2): ℓd = 2.5 ℓdh (concreto fresco bajo la barra ≤ 300 mm) o 3.25 ℓdh (> 300 mm). */
export function longitudRectaNudo(ldh: number, espesorConcretoBajoBarra: number): number {
  const f = espesorConcretoBajoBarra > NUDO.ldFactor.espesorLimiteMm ? NUDO.ldFactor.masDe300 : NUDO.ldFactor.hasta300;
  return f * ldh;
}

/** Longitud de la barra recta con la parte fuera del núcleo confinado multiplicada por 1.6 (C.21.7.5.3). */
export function longitudRectaConFueraDeNucleo(ld: number, longitudFueraNucleo: number): number {
  return ld + (NUDO.factorFueraNucleo - 1) * longitudFueraNucleo;
}

/* ------------------------------------------------------------------------------------------------ */
/* Muros estructurales especiales (C.21.9)                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** αc (C.21.9.4.1, PDF p.492, C-190): 0.25 si hw/ℓw ≤ 1.5, 0.17 si hw/ℓw ≥ 2.0, lineal entre ambos. */
export function alfaCMuro(hwSobreLw: number): number {
  const k = MURO_ESPECIAL.alfaC;
  if (hwSobreLw <= k.relacionInferior) return k.alto;
  if (hwSobreLw >= k.relacionSuperior) return k.bajo;
  return k.alto + ((k.bajo - k.alto) * (hwSobreLw - k.relacionInferior)) / (k.relacionSuperior - k.relacionInferior);
}

export interface EntradaVnMuro {
  /** Área de cortante Acv = espesor del alma × longitud de la sección (mm²). */
  Acv: number;
  fc: number;
  /** Cuantía del refuerzo horizontal (transversal) ρt, y fy (MPa). */
  rhoT: number;
  fy: number;
  /** Relación hw/ℓw (se toma la mayor entre el muro completo y el segmento, C.21.9.4.2). */
  hwSobreLw: number;
  lambda?: number;
}

export interface ResultadoVnMuro {
  alfaC: number;
  /** Ec. C.21-10: Vn = Acv (αc λ √f′c + ρt fy), kN. */
  vn: number;
  /** Tope 0.66 Acv √f′c para muros o machones con fuerza lateral común (C.21.9.4.4), kN. */
  vnTope: number;
  /** Vn utilizable = menor entre vn y vnTope (kN). */
  vnDiseno: number;
  gobiernaTope: boolean;
}

/**
 * Resistencia nominal a cortante de un muro especial, Ec. C.21-10 (PDF p.492, C-190).
 * √f′c no se limita a 8.3 MPa porque ese límite pertenece al Capítulo C.11 (criterio del autor; el C.21 no lo menciona).
 */
export function cortanteNominalMuro(e: EntradaVnMuro): ResultadoVnMuro {
  const lambda = e.lambda ?? 1;
  const alfaC = alfaCMuro(e.hwSobreLw);
  const vn = (e.Acv * (alfaC * lambda * Math.sqrt(e.fc) + e.rhoT * e.fy)) / 1000;
  const vnTope = (MURO_ESPECIAL.vnMaxMachonesComunes * e.Acv * Math.sqrt(e.fc)) / 1000;
  return { alfaC, vn, vnTope, vnDiseno: Math.min(vn, vnTope), gobiernaTope: vn > vnTope };
}

/** Tope para un machón individual o un segmento horizontal / viga de acople: 0.83 Acw √f′c (C.21.9.4.4 y C.21.9.4.5), kN. */
export function vnMaximoMachon(Acw: number, fc: number): number {
  return (MURO_ESPECIAL.vnMaxMachonIndividual * Acw * Math.sqrt(fc)) / 1000;
}

/** Vu (kN) por debajo del cual ρℓ y ρt pueden reducirse a los de C.14.3: 0.083 Acv λ √f′c (C.21.9.2.1). */
export function vuLimiteReduccionCuantia(Acv: number, fc: number, lambda = 1): number {
  return (MURO_ESPECIAL.vuReduccion * Acv * lambda * Math.sqrt(fc)) / 1000;
}

/** Vu (kN) a partir del cual se exigen al menos dos capas de refuerzo: 0.17 Acv λ √f′c (C.21.9.2.3). */
export function vuLimiteDosCapas(Acv: number, fc: number, lambda = 1): number {
  return (MURO_ESPECIAL.vuDosCapas * Acv * lambda * Math.sqrt(fc)) / 1000;
}

export interface ResultadoBordePorDesplazamiento {
  /** Deriva usada en la ecuación (≥ 0.007 para DES, ≥ 0.0035 para DMO). */
  derivaUsada: number;
  /** Profundidad límite del eje neutro: ℓw / (600 δu/hw), mm. */
  cLimite: number;
  requiere: boolean;
}

/** Ec. C.21-11 (C.21.9.6.2(a), PDF p.493, C-191): hay elementos especiales de borde si c ≥ ℓw / [600 (δu/hw)]. */
export function bordePorDesplazamiento(c: number, lw: number, derivaDiseno: number, grado: 'DES' | 'DMO' = 'DES'): ResultadoBordePorDesplazamiento {
  const min = grado === 'DES' ? MURO_ESPECIAL.bordeDesplazamiento.derivaMin : DMO_MURO.derivaMin;
  const derivaUsada = Math.max(derivaDiseno, min);
  const cLimite = lw / (MURO_ESPECIAL.bordeDesplazamiento.divisor * derivaUsada);
  return { derivaUsada, cLimite, requiere: c >= cLimite };
}

/** Elementos de borde por esfuerzo (C.21.9.6.3; DMO C.21.4.4.2): σ extrema > 0.2 f′c (DES) o 0.3 f′c (DMO); se descontinúan bajo 0.15 f′c (DES) o 0.22 f′c (DMO). */
export function bordePorEsfuerzo(sigmaCompresion: number, fc: number, grado: 'DES' | 'DMO' = 'DES') {
  const inicio = grado === 'DES' ? MURO_ESPECIAL.bordeEsfuerzo : DMO_MURO.bordeEsfuerzo;
  const fin = grado === 'DES' ? MURO_ESPECIAL.bordeEsfuerzoFin : DMO_MURO.bordeEsfuerzoFin;
  return { limiteInicio: inicio * fc, limiteFin: fin * fc, requiere: sigmaCompresion > inicio * fc, puedeDescontinuar: sigmaCompresion < fin * fc };
}

/**
 * Extensión del elemento especial de borde: horizontal desde la fibra extrema = mayor entre c − 0.1 ℓw y c/2 (C.21.9.6.4(a), mm);
 * vertical desde la sección crítica = mayor entre ℓw y Mu/(4 Vu) (C.21.9.6.2(b), mm; Mu en kN·m, Vu en kN).
 */
export function extensionElementoBorde(c: number, lw: number, Mu: number, Vu: number) {
  const k = MURO_ESPECIAL.extensionHorizontal;
  return {
    horizontal: Math.max(c - k.restaFraccionLw * lw, k.fraccionC * c),
    vertical: Math.max(lw, (Mu * 1000) / (MURO_ESPECIAL.extensionVerticalMuVuDivisor * Vu)),
  };
}

/** Cuantía mínima de la Ec. 2.8/fy para exigir confinamiento en bordes sin elemento especial (C.21.9.6.5(a)). */
export function cuantiaBordeSinEspecial(fy: number): number {
  return MURO_ESPECIAL.rhoBordeCoef / fy;
}

export type TratamientoVigaAcople = 'porticoEspecial' | 'diagonalesObligatorias' | 'opcional';

/**
 * Clasificación de las vigas de acople (C.21.9.7.1 a C.21.9.7.3, PDF p.494, C-192):
 * ℓn/h ≥ 4 → requisitos de C.21.5; ℓn/h < 2 con Vu > 0.33 λ √f′c Acw → dos grupos de barras diagonales; en otro caso, a elección
 * (diagonales o C.21.5.2 a C.21.5.4). Vu en kN.
 */
export function clasificarVigaAcople(ln: number, h: number, Vu: number, Acw: number, fc: number, lambda = 1): TratamientoVigaAcople {
  const r = ln / h;
  if (r >= VIGA_ACOPLE.relacionVigaPorticoMin) return 'porticoEspecial';
  const limite = (VIGA_ACOPLE.vuDiagonal * lambda * Math.sqrt(fc) * Acw) / 1000;
  if (r < VIGA_ACOPLE.relacionDiagonalMax && Vu > limite) return 'diagonalesObligatorias';
  return 'opcional';
}

/** Ec. C.21-12: Vn = 2 Avd fy senα ≤ 0.83 √f′c Acw (kN). Avd = área total de las barras de un grupo diagonal (mm²), α en grados. */
export function cortanteNominalAcopleDiagonal(Avd: number, fy: number, alfaGrados: number, Acw: number, fc: number) {
  const vn = (2 * Avd * fy * Math.sin((alfaGrados * Math.PI) / 180)) / 1000;
  const tope = vnMaximoMachon(Acw, fc);
  return { vn, tope, vnDiseno: Math.min(vn, tope), gobiernaTope: vn > tope };
}

/* ------------------------------------------------------------------------------------------------ */
/* Diafragmas (C.21.11)                                                                                */
/* ------------------------------------------------------------------------------------------------ */

/** Ec. C.21-13 con el tope de C.21.11.9.2: Vn = Acv (0.17 λ √f′c + ρt fy) ≤ 0.66 Acv √f′c (kN). */
export function cortanteNominalDiafragma(Acv: number, fc: number, rhoT: number, fy: number, lambda = 1) {
  const vn = (Acv * (DIAFRAGMA.vnCoefConcreto * lambda * Math.sqrt(fc) + rhoT * fy)) / 1000;
  const tope = (DIAFRAGMA.vnMax * Acv * Math.sqrt(fc)) / 1000;
  return { vn, tope, vnDiseno: Math.min(vn, tope), gobiernaTope: vn > tope };
}

/** Ec. C.21-14: Vn = Avf fy μ sobre las juntas entre prefabricados, con μ = 1.0 λ (kN). */
export function cortanteJuntaDiafragma(Avf: number, fy: number, lambda = 1): number {
  return (Avf * fy * DIAFRAGMA.mu * lambda) / 1000;
}

/** Esfuerzo de compresión (MPa) a partir del cual un colector requiere confinamiento, y el que permite descontinuarlo (C.21.11.7.5). */
export function limitesColector(fc: number, sobrerresistencia = false) {
  return sobrerresistencia
    ? { inicio: DIAFRAGMA.colectorEsfuerzoSobrerresistencia * fc, fin: DIAFRAGMA.colectorEsfuerzoFinSobrerresistencia * fc }
    : { inicio: DIAFRAGMA.colectorEsfuerzo * fc, fin: DIAFRAGMA.colectorEsfuerzoFin * fc };
}
