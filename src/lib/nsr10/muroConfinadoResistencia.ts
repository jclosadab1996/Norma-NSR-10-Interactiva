/**
 * Título D de la NSR-10 — Mampostería de muros confinados, D.10.7 (Requisitos de análisis y diseño): lógica pura.
 * Ecuaciones D.10.7-1 a D.10.7-25 (D-58 a D-61; PDF = página impresa + 565, es decir PDF 623 a 626).
 *
 * UNIDADES (API estable): longitudes y espesores en mm · áreas en mm² · esfuerzos en MPa · FUERZAS en kN · MOMENTOS en kN·m.
 * Las ecuaciones de la norma están en N y mm: se convierte en la frontera (kN = N/1000; kN·m = N·mm/10⁶).
 * Convención de signos de la norma: compresión positiva; las fuerzas de tracción (Put, Pnt) son negativas.
 *
 * ÍNDICE
 *   φ ............. phiConfinadoFn (D.10.7.2)
 *   geometría ..... geometriaMuroConfinado (Ae, b, Amv; D.10.7.3 c y D.5.4)
 *   D.10.7.4 ...... resistenciaColumnaConfinamiento (Pnc, Pnt), resistenciaMamposteriaSola (Pnd, Re), resistenciaAxialMuroConfinado
 *   D.10.7.5 ...... cargaColumnaFueraPlano, verificarColumnaFueraPlano
 *   D.10.7.6.1 .... fuerzasColumnasEnPlano (D.10.7-5 a 10), fuerzasDosColumnas (D.10.7-13 a 15), verificarColumnasEnPlano
 *   D.10.7.6.2 .... flexoCompresionConMamposteria (diagrama de interacción)
 *   D.10.7.7 ...... cortanteMuroConfinado
 *   D.10.7.8 ...... verificarAplastamientoBiela
 *   D.10.7.9 ...... cortanteEnElementosConfinamiento, resistenciaCortanteElemento
 *   D.10.7.10 ..... tensionVigaConfinamiento, verificarAceroViga
 *   resumen ....... analizarMuroConfinado (reúne las verificaciones para la calculadora)
 *
 * Qué NO es texto de la norma y se rotula «autoría del proyecto»: la diagonal h′ calculada con ℓc y hp, el ancho efectivo
 * b = Ae/(longitud total), la lectura Put = 0 cuando la ecuación D.10.7-6 da positivo, el φ en Pn = 0 al pasar de compresión a
 * tracción, el brazo de la columna fuera del plano y el uso del φ de cortante del Título C como alternativa.
 */
import {
  DIVISOR_ANCHO_BIELA,
  FACTOR_CARGA_COLUMNA_FUERA_PLANO,
  FRACCION_CORTANTE_ELEMENTO,
  PHI_CONFINADO,
  PNC,
  PND,
  VN_CONFINADO,
} from '../../data/muroConfinadoDiseno';
import { curvaInteraccion, verificarPunto } from './columnaInteraccion';
import { vcSimplificado, vsEstribos } from './cortante';
import {
  capasMuroEnPlano,
  factorEsbeltez,
  resistenciaAxial,
  verificarFlexoCompresion,
  type PhiFn,
  type ResultadoAxial,
  type SeccionM,
  type VerificacionFlexoCompresion,
} from './mamposteria';

const N_A_KN = 1 / 1000;

/* ================================================================== */
/* φ (D.10.7.2)                                                        */
/* ================================================================== */

/**
 * φ de la sección de muro confinado como función de la carga axial nominal Pn (kN): 0.65 si Pn > 0 (compresión, con o sin flexión),
 * 0.85 si Pn ≤ 0 (flexión sin carga axial o tracción) (D.10.7.2, D-57). El salto en Pn = 0 es lectura del proyecto: la norma no
 * da rampa de φ para muros confinados (a diferencia de D.5.1.5.2).
 */
export function phiConfinadoFn(): PhiFn {
  return (Pn) => (Pn > 0 ? PHI_CONFINADO.compresion : PHI_CONFINADO.flexion);
}

/* ================================================================== */
/* Geometría                                                           */
/* ================================================================== */

export interface EntradaGeometria {
  /** Espesor del muro t, mm. */
  t: number;
  /** Longitud ℓw del muro medida centro a centro entre las columnas de borde, mm (nomenclatura D.2.4). */
  lw: number;
  /** Ancho bc de cada columna de confinamiento medido en la dirección del muro, mm (igual en las dos columnas de borde). */
  bc: number;
  /** Fracción de área efectiva de la mampostería entre columnas respecto de su área bruta (1 = maciza o inyectada; D.5.4.1). Por defecto 1. */
  fraccionAe?: number;
}

export interface ResultadoGeometria {
  /** Longitud total (física) del muro, ℓw + bc, mm. */
  Ltotal: number;
  /** Área de cada columna de confinamiento, Aci = bc · t, mm². */
  Aci: number;
  /** Área efectiva de la mampostería entre columnas, mm². */
  Amamposteria: number;
  /** Área efectiva total Ae = 2 Aci + área de mampostería (en mampostería confinada incluye los elementos de confinamiento, D.5.4.1), mm². */
  Ae: number;
  /** Ancho efectivo paralelo al plano b = Ae/L (D.5.4.4.2) con L la longitud total (aclaración del proyecto), mm. */
  b: number;
  /** Área para cortante paralelo al plano Amv = b ℓw (D.5.4.5.2), mm². */
  Amv: number;
}

/**
 * Áreas efectivas de un muro confinado con DOS columnas de borde iguales. D.10.7.3 (c): los elementos de confinamiento se tratan
 * como celdas inyectadas, por lo que Ae incluye sus áreas completas. El ancho efectivo b = Ae/L usa la longitud total física L = ℓw + bc
 * (autoría del proyecto: la norma escribe b = Ae/ℓw con ℓw = longitud del muro; con ℓw centro a centro daría b > t).
 */
export function geometriaMuroConfinado(e: EntradaGeometria): ResultadoGeometria {
  const frac = e.fraccionAe ?? 1;
  const Ltotal = e.lw + e.bc;
  const Aci = e.bc * e.t;
  const Amamposteria = (Ltotal - 2 * e.bc) * e.t * frac;
  const Ae = 2 * Aci + Amamposteria;
  const b = Ae / Ltotal;
  return { Ltotal, Aci, Amamposteria, Ae, b, Amv: b * e.lw };
}

/* ================================================================== */
/* D.10.7.4 — Carga axial de compresión                                */
/* ================================================================== */

export interface EntradaColumna {
  /** f′c del concreto de la columna, MPa. */
  fc: number;
  /** Área de la sección de la columna Aci, mm². */
  Aci: number;
  /** Área de acero longitudinal de la columna Ast, mm². */
  Ast: number;
  fy: number;
}

export interface ResultadoColumna {
  /** Pnc = 0.80 [0.85 f′c (Aci − Ast) + fy Ast] (Ec. D.10.7-1), kN, positiva. */
  Pnc: number;
  /** Pnt = −fy Ast (Ec. D.10.7-2), kN, negativa. */
  Pnt: number;
  /** φ Pnc con φ = 0.65, kN. */
  phiPnc: number;
  /** φ Pnt con φ = 0.85, kN (negativa). */
  phiPnt: number;
}

/** Resistencias nominales y de diseño a compresión y tracción axial de un elemento de confinamiento (Ecs. D.10.7-1 y D.10.7-2, D-58). */
export function resistenciaColumnaConfinamiento(e: EntradaColumna): ResultadoColumna {
  const Pnc = PNC.factorExterno * (PNC.factorFc * e.fc * (e.Aci - e.Ast) + e.fy * e.Ast) * N_A_KN;
  const Pnt = -e.fy * e.Ast * N_A_KN;
  return { Pnc, Pnt, phiPnc: PHI_CONFINADO.compresion * Pnc, phiPnt: PHI_CONFINADO.traccion * Pnt };
}

export interface EntradaMamposteriaSola {
  fm: number;
  /** Área de la sección de mampostería Amd, mm². */
  Amd: number;
  /** Longitud para evaluar el pandeo h′, mm. */
  hPrime: number;
  /** Espesor para evaluar el pandeo t, mm. */
  t: number;
}

export interface ResultadoMamposteriaSola {
  esbeltez: number;
  Re: number;
  /** Pnd = 0.80 (0.80 f′m Amd) Re (Ec. D.10.7-3), kN. */
  Pnd: number;
  /** φ Pnd con φ = 0.65, kN. */
  phiPnd: number;
}

/** Resistencia nominal a compresión de la mampostería sola, sin los elementos de confinamiento (Ec. D.10.7-3, con Re de la Ec. D.10.7-4; D-58). */
export function resistenciaMamposteriaSola(e: EntradaMamposteriaSola): ResultadoMamposteriaSola {
  const Re = factorEsbeltez(e.hPrime, e.t);
  const Pnd = PND.factorExterno * (PND.factorFm * e.fm * e.Amd) * Re * N_A_KN;
  return { esbeltez: e.hPrime / e.t, Re, Pnd, phiPnd: PHI_CONFINADO.compresion * Pnd };
}

export interface EntradaAxialConfinado {
  fm: number;
  /** Área efectiva Ae del muro con los elementos de confinamiento, mm². */
  Ae: number;
  /** Área del acero longitudinal de las columnas de confinamiento, mm². */
  Ast: number;
  fy: number;
  hPrime: number;
  t: number;
  /** Carga axial mayorada Pu (kN), opcional. */
  Pu?: number;
}

/**
 * Verificación global del muro a compresión axial (D.10.7.4 remite a D.5.5: Po, Re, Pn = 0.80 Po Re y φPn) con φ = 0.65 (D.10.7.2 a)
 * y Ast = acero longitudinal de las columnas de confinamiento.
 */
export function resistenciaAxialMuroConfinado(e: EntradaAxialConfinado): ResultadoAxial {
  return resistenciaAxial({ fm: e.fm, Ae: e.Ae, Ast: e.Ast, fy: e.fy, hPrime: e.hPrime, t: e.t, phi: PHI_CONFINADO.compresion, Pu: e.Pu });
}

/* ================================================================== */
/* D.10.7.5 — Dirección perpendicular al plano                         */
/* ================================================================== */

/**
 * Carga axial de diseño de una columna para flexión fuera del plano (D.10.7.5.1 d): el DOBLE de la que resulta
 * proporcionalmente a las áreas, 2 Pu Aci/(Aci + Amamposteria), kN. `Amamposteria` es el área de mampostería que comparte la carga
 * con esa columna (lectura del proyecto: la norma habla de «áreas de mampostería y de columnas de confinamiento»).
 */
export function cargaColumnaFueraPlano(Pu: number, Aci: number, Amamposteria: number, nColumnas = 1): number {
  return (FACTOR_CARGA_COLUMNA_FUERA_PLANO * Pu * Aci) / (nColumnas * Aci + Amamposteria);
}

export interface EntradaColumnaFueraPlano {
  fc: number;
  fy: number;
  /** Ancho efectivo b = el de la columna medido en la dirección del muro (D.10.7.5.1 b), mm. */
  bc: number;
  /** Espesor del muro = profundidad de la columna en flexión fuera del plano, mm. */
  t: number;
  /** Acero longitudinal total de la columna, mm² (se reparte mitad y mitad en las dos caras). */
  Ast: number;
  /** Distancia del centroide del acero de cada cara a la fibra externa, mm. */
  dPrime: number;
  /** Carga axial Pu sobre la columna, kN (compresión +). */
  Pu: number;
  /** Momento mayorado fuera del plano que toma la columna, kN·m. */
  Mu: number;
}

/**
 * Flexo-compresión de una columna de confinamiento fuera del plano del muro: «el diseño se realiza en su totalidad de acuerdo con
 * los requisitos de concreto reforzado del Título C» (D.10.7.5.1 c). Se usa el diagrama de interacción de `columnaInteraccion.ts`
 * (C.10, estribos, φ de C.9.3.2) con acero en las dos caras.
 */
export function verificarColumnaFueraPlano(e: EntradaColumnaFueraPlano) {
  const capas = [
    { area: e.Ast / 2, y: e.dPrime },
    { area: e.Ast / 2, y: e.t - e.dPrime },
  ];
  const curva = curvaInteraccion({ b: e.bc, h: e.t, fc: e.fc, fy: e.fy, capas });
  return { curva, ...verificarPunto(curva, e.Pu, e.Mu) };
}

/* ================================================================== */
/* D.10.7.6.1 — Flexo-compresión en el plano despreciando la mampostería */
/* ================================================================== */

export interface ColumnaPosicion {
  /** Área Aci de la columna i, mm². */
  Aci: number;
  /** Distancia xi de la columna al borde del muro, mm. */
  xi: number;
}

export interface FilaColumnaEnPlano {
  Aci: number;
  xi: number;
  /** ΔPui = |Mu Aci (xi − x̄)/Ict| (Ec. D.10.7-7), kN. */
  deltaPui: number;
  /** Puc = (Aci/Act) Pu + ΔPui (Ec. D.10.7-5), kN. */
  Puc: number;
  /** Put = (Aci/Act) Pu − ΔPui, con tope 0 (Ec. D.10.7-6), kN: negativa o cero. */
  Put: number;
}

export interface ResultadoColumnasEnPlano {
  Act: number;
  /** Centroide x̄ (Ec. D.10.7-9), mm. */
  xBarra: number;
  /** Ict (Ec. D.10.7-10), mm⁴. */
  Ict: number;
  filas: FilaColumnaEnPlano[];
}

/**
 * Fuerzas axiales máximas de compresión Puc y de tracción Put sobre cada columna de confinamiento (Ecs. D.10.7-5 a D.10.7-10, D-59).
 * Pu (kN) y Mu (kN·m) se toman siempre positivos (la norma lo exige: «Pu y ΔPui son siempre positivas»). Si D.10.7-6 da un valor
 * positivo no hay tracción en esa columna y se toma Put = 0 (lectura del proyecto del «≤ 0» de la ecuación).
 */
export function fuerzasColumnasEnPlano(columnas: readonly ColumnaPosicion[], Pu: number, Mu: number): ResultadoColumnasEnPlano {
  const Pua = Math.abs(Pu);
  const Mua = Math.abs(Mu) * 1e6; // N·mm
  const Act = columnas.reduce((s, c) => s + c.Aci, 0);
  const xBarra = columnas.reduce((s, c) => s + c.Aci * c.xi, 0) / Act;
  const Ict = columnas.reduce((s, c) => s + c.Aci * (c.xi - xBarra) ** 2, 0);
  const filas = columnas.map((c) => {
    const deltaPui = Math.abs((Mua * c.Aci * (c.xi - xBarra)) / Ict) * N_A_KN;
    const base = (c.Aci / Act) * Pua;
    return { Aci: c.Aci, xi: c.xi, deltaPui, Puc: base + deltaPui, Put: Math.min(0, base - deltaPui) };
  });
  return { Act, xBarra, Ict, filas };
}

export interface ResultadoDosColumnas {
  /** ΔPu = Mu/ℓw (Ec. D.10.7-15), kN. */
  deltaPu: number;
  /** Puc = Pu/2 + ΔPu (Ec. D.10.7-13), kN. */
  Puc: number;
  /** Put = Pu/2 − ΔPu ≤ 0 (Ec. D.10.7-14), kN (negativa o cero). */
  Put: number;
}

/** Caso de dos columnas iguales en los bordes (Ecs. D.10.7-13 a D.10.7-15, D-59). Pu en kN, Mu en kN·m, ℓw en mm (centro a centro). */
export function fuerzasDosColumnas(Pu: number, Mu: number, lw: number): ResultadoDosColumnas {
  const deltaPu = (Math.abs(Mu) * 1000) / lw;
  const mitad = Math.abs(Pu) / 2;
  return { deltaPu, Puc: mitad + deltaPu, Put: Math.min(0, mitad - deltaPu) };
}

export interface VerificacionColumnasEnPlano {
  cumple: boolean;
  /** Razón máxima Puc/φPnc (Ec. D.10.7-11). */
  razonCompresion: number;
  /** Razón máxima Put/(φPnt) (Ec. D.10.7-12): |Put|/|φPnt|; 0 si no hay tracción. */
  razonTraccion: number;
  cumpleCompresion: boolean;
  cumpleTraccion: boolean;
}

/**
 * Condiciones D.10.7-11 (Puc ≤ φPnc) y D.10.7-12 (Put ≥ φPnt) para todas las columnas, con la resistencia de cada una.
 * `resistencias[i]` corresponde a `fuerzas.filas[i]`.
 */
export function verificarColumnasEnPlano(fuerzas: readonly FilaColumnaEnPlano[], resistencias: readonly ResultadoColumna[]): VerificacionColumnasEnPlano {
  let razonCompresion = 0;
  let razonTraccion = 0;
  fuerzas.forEach((f, i) => {
    razonCompresion = Math.max(razonCompresion, f.Puc / resistencias[i].phiPnc);
    razonTraccion = Math.max(razonTraccion, f.Put / resistencias[i].phiPnt);
  });
  const cumpleCompresion = razonCompresion <= 1;
  const cumpleTraccion = razonTraccion <= 1;
  return { cumple: cumpleCompresion && cumpleTraccion, razonCompresion, razonTraccion, cumpleCompresion, cumpleTraccion };
}

/* ================================================================== */
/* D.10.7.6.2 — Flexo-compresión teniendo en cuenta la mampostería     */
/* ================================================================== */

export interface EntradaFlexoCompresion {
  fm: number;
  fy: number;
  /** Ancho efectivo b del muro, mm. */
  b: number;
  /** Longitud total del muro L (h de la sección en la dirección de flexión), mm. */
  L: number;
  /** Distancia del borde del muro al centroide del acero de cada columna d′, mm. */
  dPrime: number;
  /** Área de acero longitudinal de cada columna de borde, mm². */
  AstColumna: number;
  /** Carga axial mayorada Pu (kN) y momento Mu (kN·m) simultáneos. */
  Pu: number;
  Mu: number;
  /** Para el tope φPn ≤ φ·0.80 Po Re (D.5.5.4): altura efectiva h′ y espesor t, opcionales. */
  esbeltez?: { hPrime: number; t: number };
}

/**
 * Verificación Mu ≤ φMn (Ec. D.10.7-16) con el diagrama de interacción del muro como elemento homogéneo (D.10.7.3 b y c: mampostería y
 * columnas, estas últimas equivalentes a celdas inyectadas), por compatibilidad de deformaciones (D.5.1.6) y con los φ de D.10.7.2
 * (0.65 en compresión, 0.85 en flexión y tracción). Reutiliza `verificarFlexoCompresion` (mamposteria.ts).
 * Devuelve la verificación y la sección para graficar la curva con `curvaInteraccionMuro`.
 */
export function flexoCompresionConMamposteria(e: EntradaFlexoCompresion): { sec: SeccionM; verificacion: VerificacionFlexoCompresion } {
  const sec: SeccionM = { b: e.b, h: e.L, fm: e.fm, fy: e.fy, capas: capasMuroEnPlano(e.L, e.dPrime, e.AstColumna) };
  return { sec, verificacion: verificarFlexoCompresion(sec, e.Pu, e.Mu, phiConfinadoFn(), e.esbeltez) };
}

/* ================================================================== */
/* D.10.7.7 — Cortante paralelo al plano                               */
/* ================================================================== */

export interface EntradaCortanteConfinado {
  fm: number;
  /** Área para cortante Amv, mm². */
  Amv: number;
  /** Área efectiva Ae, mm². */
  Ae: number;
  /** Carga axial mayorada que actúa simultáneamente con Vu, kN (compresión +). */
  Pu: number;
  /** Cortante mayorado Vu, kN (opcional). */
  Vu?: number;
}

export interface ResultadoCortanteConfinado {
  /** (1/12 √f′m + Pu/(3 Ae)) Amv, kN, antes del tope. */
  VnSinTope: number;
  /** (1/6) √f′m Amv, kN. */
  tope: number;
  /** Vn = mín(VnSinTope, tope) (Ec. D.10.7-18), kN. */
  Vn: number;
  topeRige: boolean;
  /** φ Vn con φ = 0.50 (D.10.7.2 d), kN. */
  phiVn: number;
  razon: number | null;
  cumple: boolean | null;
}

/** Resistencia a cortante por tracción diagonal de la mampostería: los elementos de confinamiento no aportan (D.10.7.7, Ecs. D.10.7-17 y D.10.7-18; D-60). */
export function cortanteMuroConfinado(e: EntradaCortanteConfinado): ResultadoCortanteConfinado {
  const raiz = Math.sqrt(e.fm);
  const VnSinTope = (raiz / VN_CONFINADO.divisorRaiz + (e.Pu * 1000) / (VN_CONFINADO.divisorPu * e.Ae)) * e.Amv * N_A_KN;
  const tope = (raiz / VN_CONFINADO.divisorTope) * e.Amv * N_A_KN;
  const Vn = Math.min(VnSinTope, tope);
  const phiVn = PHI_CONFINADO.cortante * Vn;
  const razon = e.Vu === undefined ? null : e.Vu / phiVn;
  return { VnSinTope, tope, Vn, topeRige: VnSinTope > tope, phiVn, razon, cumple: razon === null ? null : razon <= 1 };
}

/* ================================================================== */
/* D.10.7.8 — Aplastamiento de la biela                                */
/* ================================================================== */

export interface EntradaBiela {
  fm: number;
  /** Cortante mayorado Vu, kN. */
  Vu: number;
  /** Longitud ℓw del muro (centro a centro de columnas de borde), mm. */
  lw: number;
  /** Distancia horizontal ℓc entre columnas de confinamiento del paño, centro a centro, mm. */
  lc: number;
  /** Altura hp del paño, centro a centro entre vigas de confinamiento, mm. */
  hp: number;
  /** Espesor t del muro, mm. */
  t: number;
  /** Ancho efectivo b del muro paralelo al plano (D.5.4.4.2), mm. */
  b: number;
  /** Longitud de la diagonal h′, mm; por defecto √(ℓc² + hp²) (autoría del proyecto). */
  hDiagonal?: number;
}

export interface ResultadoBiela {
  /** h′ adoptada (diagonal del paño), mm. */
  hDiagonal: number;
  /** Ancho efectivo de la biela h′/5, mm. */
  anchoBiela: number;
  /** Amd = (h′/5) b, mm². */
  Amd: number;
  /** Pud = (h′/ℓw) Vu (Ec. D.10.7-20), kN. */
  Pud: number;
  esbeltez: number;
  Re: number;
  /** Pnd (Ec. D.10.7-3), kN. */
  Pnd: number;
  phiPnd: number;
  razon: number;
  cumple: boolean;
}

/** Diagonal de un paño ℓc × hp, √(ℓc² + hp²), mm (autoría del proyecto: la norma solo dice «longitud de la diagonal del paño»). */
export function diagonalPano(lc: number, hp: number): number {
  return Math.hypot(lc, hp);
}

/** Pud ≤ φ Pnd (Ecs. D.10.7-19, D.10.7-20 y D.10.7-3; D-60): biela de ancho h′/5, longitud de pandeo h′ y espesor t. */
export function verificarAplastamientoBiela(e: EntradaBiela): ResultadoBiela {
  const hDiagonal = e.hDiagonal ?? diagonalPano(e.lc, e.hp);
  const anchoBiela = hDiagonal / DIVISOR_ANCHO_BIELA;
  const Amd = anchoBiela * e.b;
  const Pud = (hDiagonal / e.lw) * e.Vu;
  const s = resistenciaMamposteriaSola({ fm: e.fm, Amd, hPrime: hDiagonal, t: e.t });
  const razon = Pud / s.phiPnd;
  return { hDiagonal, anchoBiela, Amd, Pud, esbeltez: s.esbeltez, Re: s.Re, Pnd: s.Pnd, phiPnd: s.phiPnd, razon, cumple: razon <= 1 };
}

/* ================================================================== */
/* D.10.7.9 — Cortante en los elementos de confinamiento               */
/* ================================================================== */

/**
 * Cortante transversal que llega a los elementos de confinamiento por la biela (Ecs. D.10.7-21 y D.10.7-22; D-60), kN:
 * columna Vuc = (ℓc/2ℓw) Vu y viga Vuc = (hp/2ℓw) Vu (la mitad de la componente de la biela).
 */
export function cortanteEnElementosConfinamiento(p: { Vu: number; lw: number; lc: number; hp: number }): { columna: number; viga: number } {
  return {
    columna: (FRACCION_CORTANTE_ELEMENTO * p.lc * p.Vu) / p.lw,
    viga: (FRACCION_CORTANTE_ELEMENTO * p.hp * p.Vu) / p.lw,
  };
}

export interface EntradaCortanteElemento {
  fc: number;
  /** Ancho del alma (perpendicular al cortante), mm. */
  bw: number;
  /** Altura útil d en la dirección del cortante, mm. */
  d: number;
  /** Área de refuerzo transversal Av (todas las ramas), mm²; 0 si no hay. */
  Av?: number;
  /** Separación s de los estribos, mm. */
  s?: number;
  /** fyt de los estribos, MPa. */
  fyt?: number;
  lambda?: number;
  /** φ de cortante: 0.50 (D.10.7.2 d, lectura literal) por defecto. */
  phi?: number;
  /** Cortante actuante Vuc, kN (opcional). */
  Vuc?: number;
}

export interface ResultadoCortanteElemento {
  /** Vc = 0.17 λ √f′c bw d (Ec. C.11-3), kN. */
  Vc: number;
  /** Vs = Av fyt d/s (Ec. C.11-15), kN. */
  Vs: number;
  Vnc: number;
  phi: number;
  phiVnc: number;
  razon: number | null;
  cumple: boolean | null;
}

/**
 * Vnc de un elemento de confinamiento «de acuerdo con el Capítulo C.11» (D.10.7.9): Vc + Vs con las ecuaciones del Título C
 * (reutiliza `vcSimplificado` y `vsEstribos`). φ = 0.50 según D.10.7.2 (d); la norma no aclara si en estos elementos rige en su lugar
 * el φ de C.9.3.2.3 (0.75): se deja como parámetro (autoría del proyecto).
 */
export function resistenciaCortanteElemento(e: EntradaCortanteElemento): ResultadoCortanteElemento {
  const phi = e.phi ?? PHI_CONFINADO.cortante;
  const Vc = vcSimplificado({ fc: e.fc, bw: e.bw, d: e.d, lambda: e.lambda ?? 1 });
  const Vs = e.Av && e.s && e.fyt ? vsEstribos({ Av: e.Av, fyt: e.fyt, d: e.d, s: e.s }) : 0;
  const Vnc = Vc + Vs;
  const phiVnc = phi * Vnc;
  const razon = e.Vuc === undefined ? null : e.Vuc / phiVnc;
  return { Vc, Vs, Vnc, phi, phiVnc, razon, cumple: razon === null ? null : razon <= 1 };
}

/* ================================================================== */
/* D.10.7.10 — Acero longitudinal de la viga de confinamiento          */
/* ================================================================== */

/** Put = −(ℓc/ℓw) Vu (Ec. D.10.7-24, D-61): tracción en la viga igual al cortante que lleva el paño, kN (negativa). */
export function tensionVigaConfinamiento(p: { Vu: number; lc: number; lw: number }): number {
  return -(p.lc / p.lw) * p.Vu;
}

export interface ResultadoAceroViga {
  /** Put (kN, negativa). */
  Put: number;
  /** Área de acero longitudinal requerida |Put|/(φ fy), mm². */
  AsRequerida: number;
  /** Pnt = −fy Ast (Ec. D.10.7-2), kN; null si no se dio Ast. */
  Pnt: number | null;
  /** φ Pnt con φ = 0.85, kN; null si no se dio Ast. */
  phiPnt: number | null;
  /** |Put|/|φ Pnt|. */
  razon: number | null;
  cumple: boolean | null;
}

/** −Put ≤ −φ Pnt (Ec. D.10.7-25): el acero longitudinal de la viga debe tomar toda la tracción (φ = 0.85, D.10.7.2 b). */
export function verificarAceroViga(p: { Vu: number; lc: number; lw: number; fy: number; Ast?: number }): ResultadoAceroViga {
  const Put = tensionVigaConfinamiento(p);
  const AsRequerida = (Math.abs(Put) * 1000) / (PHI_CONFINADO.traccion * p.fy);
  if (p.Ast === undefined) return { Put, AsRequerida, Pnt: null, phiPnt: null, razon: null, cumple: null };
  const Pnt = -p.fy * p.Ast * N_A_KN;
  const phiPnt = PHI_CONFINADO.traccion * Pnt;
  const razon = Math.abs(Put) / Math.abs(phiPnt);
  return { Put, AsRequerida, Pnt, phiPnt, razon, cumple: -Put <= -phiPnt };
}

/* ================================================================== */
/* Resumen para la calculadora                                         */
/* ================================================================== */

export interface EntradaMuroConfinado {
  fm: number;
  fc: number;
  fy: number;
  t: number;
  lw: number;
  bc: number;
  hp: number;
  /** ℓc: por defecto igual a ℓw (muro con dos columnas de borde y un solo paño). */
  lc?: number;
  /** Altura efectiva h′ para pandeo del muro (D.5.4.3), mm. */
  hPrime: number;
  fraccionAe?: number;
  /** Acero longitudinal de CADA columna de borde, mm². */
  AstColumna: number;
  /** Carga axial para D.10.7.4 (kN) y carga axial simultánea con Mu y Vu (kN). */
  Pu: number;
  PuSimultanea: number;
  Mu: number;
  Vu: number;
  /** Cortante transversal en columna y viga (D.10.7.9): d, Av, s, fyt, φ. */
  columnaCortante: { d: number; Av: number; s: number; fyt: number };
  vigaCortante: { bw: number; d: number; Av: number; s: number; fyt: number };
  /** Acero longitudinal de la viga, mm². */
  AstViga: number;
  phiCortanteElementos?: number;
}

export interface FilaVerificacion {
  id: string;
  seccion: string;
  titulo: string;
  demanda: number;
  capacidad: number;
  unidad: string;
  razon: number;
  cumple: boolean;
}

/** Reúne las verificaciones de D.10.7.4, D.10.7.6.1, D.10.7.6.2, D.10.7.7, D.10.7.8, D.10.7.9 y D.10.7.10 para un muro de dos columnas de borde. */
export function analizarMuroConfinado(e: EntradaMuroConfinado) {
  const lc = e.lc ?? e.lw;
  const g = geometriaMuroConfinado({ t: e.t, lw: e.lw, bc: e.bc, fraccionAe: e.fraccionAe });
  const AstTotal = 2 * e.AstColumna;
  const axial = resistenciaAxialMuroConfinado({ fm: e.fm, Ae: g.Ae, Ast: AstTotal, fy: e.fy, hPrime: e.hPrime, t: e.t, Pu: e.Pu });
  const col = resistenciaColumnaConfinamiento({ fc: e.fc, Aci: g.Aci, Ast: e.AstColumna, fy: e.fy });
  const dos = fuerzasDosColumnas(e.PuSimultanea, e.Mu, e.lw);
  const flexo = flexoCompresionConMamposteria({
    fm: e.fm,
    fy: e.fy,
    b: g.b,
    L: g.Ltotal,
    dPrime: e.bc / 2,
    AstColumna: e.AstColumna,
    Pu: e.PuSimultanea,
    Mu: e.Mu,
    esbeltez: { hPrime: e.hPrime, t: e.t },
  });
  const cort = cortanteMuroConfinado({ fm: e.fm, Amv: g.Amv, Ae: g.Ae, Pu: e.PuSimultanea, Vu: e.Vu });
  const biela = verificarAplastamientoBiela({ fm: e.fm, Vu: e.Vu, lw: e.lw, lc, hp: e.hp, t: e.t, b: g.b });
  const vuc = cortanteEnElementosConfinamiento({ Vu: e.Vu, lw: e.lw, lc, hp: e.hp });
  const phiC = e.phiCortanteElementos;
  const cCol = resistenciaCortanteElemento({ fc: e.fc, bw: e.t, d: e.columnaCortante.d, Av: e.columnaCortante.Av, s: e.columnaCortante.s, fyt: e.columnaCortante.fyt, phi: phiC, Vuc: vuc.columna });
  const cViga = resistenciaCortanteElemento({ fc: e.fc, bw: e.vigaCortante.bw, d: e.vigaCortante.d, Av: e.vigaCortante.Av, s: e.vigaCortante.s, fyt: e.vigaCortante.fyt, phi: phiC, Vuc: vuc.viga });
  const viga = verificarAceroViga({ Vu: e.Vu, lc, lw: e.lw, fy: e.fy, Ast: e.AstViga });

  const filas: FilaVerificacion[] = [
    { id: 'axial', seccion: 'D.10.7.4', titulo: 'Compresión axial del muro: Pu ≤ φPn', demanda: e.Pu, capacidad: axial.phiPn, unidad: 'kN', razon: e.Pu / axial.phiPn, cumple: e.Pu <= axial.phiPn && axial.esbeltezAdmisible },
    { id: 'colComp', seccion: 'D.10.7.6.1', titulo: 'Compresión en la columna: Puc ≤ φPnc', demanda: dos.Puc, capacidad: col.phiPnc, unidad: 'kN', razon: dos.Puc / col.phiPnc, cumple: dos.Puc <= col.phiPnc },
    { id: 'colTrac', seccion: 'D.10.7.6.1', titulo: 'Tracción en la columna: |Put| ≤ |φPnt|', demanda: Math.abs(dos.Put), capacidad: Math.abs(col.phiPnt), unidad: 'kN', razon: Math.abs(dos.Put) / Math.abs(col.phiPnt), cumple: dos.Put >= col.phiPnt },
    { id: 'flexo', seccion: 'D.10.7.6.2', titulo: 'Flexo-compresión con mampostería: Mu ≤ φMn', demanda: Math.abs(e.Mu), capacidad: flexo.verificacion.phiMnDisponible ?? 0, unidad: 'kN·m', razon: flexo.verificacion.razon ?? Infinity, cumple: flexo.verificacion.cumple },
    { id: 'cortante', seccion: 'D.10.7.7', titulo: 'Cortante del muro: Vu ≤ φVn', demanda: e.Vu, capacidad: cort.phiVn, unidad: 'kN', razon: e.Vu / cort.phiVn, cumple: e.Vu <= cort.phiVn },
    { id: 'biela', seccion: 'D.10.7.8', titulo: 'Aplastamiento de la biela: Pud ≤ φPnd', demanda: biela.Pud, capacidad: biela.phiPnd, unidad: 'kN', razon: biela.razon, cumple: biela.cumple },
    { id: 'vucCol', seccion: 'D.10.7.9', titulo: 'Cortante en la columna: Vuc ≤ φVnc', demanda: vuc.columna, capacidad: cCol.phiVnc, unidad: 'kN', razon: cCol.razon ?? Infinity, cumple: cCol.cumple === true },
    { id: 'vucViga', seccion: 'D.10.7.9', titulo: 'Cortante en la viga: Vuc ≤ φVnc', demanda: vuc.viga, capacidad: cViga.phiVnc, unidad: 'kN', razon: cViga.razon ?? Infinity, cumple: cViga.cumple === true },
    { id: 'vigaAs', seccion: 'D.10.7.10', titulo: 'Acero longitudinal de la viga: |Put| ≤ |φPnt|', demanda: Math.abs(viga.Put), capacidad: Math.abs(viga.phiPnt ?? 0), unidad: 'kN', razon: viga.razon ?? Infinity, cumple: viga.cumple === true },
  ];
  return { lc, geometria: g, axial, columna: col, dosColumnas: dos, flexo, cortante: cort, biela, cortanteElementos: vuc, cortanteColumna: cCol, cortanteViga: cViga, viga, filas, cumpleTodo: filas.every((f) => f.cumple) };
}
