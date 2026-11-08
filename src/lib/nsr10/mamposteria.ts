/**
 * Título D de la NSR-10 — Mampostería estructural, Capítulo D.5 (D.5.1 φ, D.5.5 a D.5.8): lógica pura.
 *
 * UNIDADES (API estable, la usan d5b, d10 y el apéndice D-1):
 *   longitudes y espesores en mm · áreas en mm² · esfuerzos y módulos en MPa · FUERZAS en kN · MOMENTOS en kN·m.
 * Las ecuaciones de la norma están escritas en N y mm; aquí se convierte en la frontera (kN = N / 1000, kN·m = N·mm / 10⁶).
 * PDF = página impresa "D-n" + 565 (D.5.5 empieza en D-37 = PDF 602).
 *
 * CONVENCIÓN DE SIGNOS: carga axial P y Pu positivas en compresión; el momento Mn es el que equilibra la sección
 * respecto de su centro geométrico (h/2). Las capas de refuerzo se ubican con `y` medida desde la fibra más comprimida.
 *
 * ÍNDICE
 *   φ ............ phiMuro, phiEnPlanoFn, phiFueraPlanoFn, phiCortanteEnPlano, cargaBalanceada
 *   D.5.5 ........ esbeltez, factorEsbeltez (Re), resistenciaAxialTeorica (Po), resistenciaAxial (Pn, φPn)
 *   D.5.6 ........ bloqueCompresion, cuantiaBalanceada, flexionSimple, flexionDobleArmadura
 *   sección ...... estadoEnC, cParaCarga, curvaInteraccionMuro, resistenciaFlexoCompresion, verificarFlexoCompresion,
 *                  capasMuroEnPlano (diagrama de interacción por compatibilidad de deformaciones, D.5.1.6)
 *   D.5.7 ........ muroFueraPlano, cortanteFueraPlano
 *   D.5.8 ........ momentoAgrietamiento, alphaMcr, moduloRuptura, relacionMVd, cortanteMamposteria (Tabla D.5.8-2),
 *                  cortanteRefuerzo (D.5.8-7/8), cortanteMaximo (Tabla D.5.8-3), cortanteMuroEnPlano, articulacionPlastica,
 *                  esfuerzoFibraExtrema, requiereElementoBorde
 *
 * Lo que NO es texto de la norma (interpretaciones y complementos, «autoría del proyecto») está rotulado así en el comentario
 * de cada función: ρb (derivado de D.5.1-2), la solución de equilibrio por compatibilidad de deformaciones para el diagrama
 * de interacción, y la rampa de φ expresada en forma cerrada.
 */
import { ES_ACERO_MPA } from './concreto';
import { cargaBalanceada as cargaBalanceadaN } from './dimensionesMamposteria';
import {
  ALPHA_MCR,
  BANDA_MVD,
  BORDE,
  D_SOBRE_LW,
  DIVISOR_VN_FUERA_PLANO,
  EPS_MU,
  ESBELTEZ_CAMBIO_RE,
  ESBELTEZ_MAXIMA_MURO,
  ESBELTEZ_MAX_CARGA_ALTA,
  ETA_REFUERZO,
  FACTOR_BLOQUE_FM,
  FACTOR_PN_PO,
  FACTOR_PO_FM,
  FRACCION_RHO_B_FLEXION_SIMPLE,
  FRACCION_RHO_B_FUERA_PLANO,
  FY_MAX_RAMPA_PHI,
  PHI,
  RELACION_A_C,
  RE_DIVISOR_RAMA_BAJA,
  RE_NUMERADOR_RAMA_ALTA,
  SEPARACION_ARTICULACION,
  TABLA_D581,
  TABLA_D582,
  TABLA_D583,
  UMBRAL_AXIAL_FUERA_PLANO,
  UMBRAL_RAMPA_FM_AE,
  UMBRAL_RAMPA_PB,
  type ClaveRuptura,
  type TipoInyeccion,
  type TipoMamposteriaBorde,
  type TipoRefuerzoCortante,
} from '../../data/muroMamposteria';

const N_A_KN = 1 / 1000;
const NMM_A_KNM = 1 / 1e6;

/* ================================================================== */
/* Coeficientes de reducción de resistencia φ (D.5.1.5)                */
/* ================================================================== */

export type CasoPhi =
  | 'fuera-flexion'
  | 'fuera-cortante'
  | 'en-flexion'
  | 'en-compresion'
  | 'en-cortante'
  | 'aplastamiento';

/** φ de D.5.1.5 (D-32 y D-33, PDF p.597–598) para cada caso de diseño. Los φ de cortante en el plano pueden subir a 0.85: ver `phiCortanteEnPlano`. */
export function phiMuro(caso: CasoPhi): number {
  switch (caso) {
    case 'fuera-flexion':
      return PHI.perpendicular.flexionYFlexoCompresion;
    case 'fuera-cortante':
      return PHI.perpendicular.cortante;
    case 'en-flexion':
      return PHI.paralelo.flexion;
    case 'en-compresion':
      return PHI.paralelo.compresionYFlexoCompresion;
    case 'en-cortante':
      return PHI.paralelo.cortante;
    case 'aplastamiento':
      return PHI.aplastamiento;
  }
}

/** φ del cortante paralelo al plano: 0.60, o 0.85 si Vn excede el cortante asociado a Mn (D.5.1.5.2 c, D-33). */
export function phiCortanteEnPlano(Vn: number, VnAsociadoAMn: number): number {
  return Vn > VnAsociadoAMn ? PHI.paralelo.cortanteMayorQueFlexion : PHI.paralelo.cortante;
}

/**
 * Carga axial nominal balanceada Pb = 0.80 f′m b ab, con ab = 0.85 d εmu / (εmu + fy/Es) (Ec. D.5.1-2, D-33, PDF p.598).
 * Devuelve kN. El texto indica la ecuación para muros con todas sus celdas inyectadas (sección sólida).
 */
export function cargaBalanceada(fm: number, b: number, d: number, fy: number, Es = ES_ACERO_MPA): number {
  // Delegado en dimensionesMamposteria.ts (agente d5a), que devuelve Pb en N: aquí se entrega en kN.
  return cargaBalanceadaN(fm, b, d, fy, Es).Pb * N_A_KN;
}

/** φ constante de la flexión y flexo-compresión perpendicular al plano (0.80, D.5.1.5.1 a), como función de Pn. */
export function phiFueraPlanoFn(): PhiFn {
  return () => PHI.perpendicular.flexionYFlexoCompresion;
}

export type PhiFn = (PnKN: number) => number;

export interface OpcionesPhiEnPlano {
  fm: number;
  /** Área efectiva (mm²). */
  Ae: number;
  fy: number;
  /** Refuerzo simétrico (condición de D.5.1.5.2 b para poder subir φ hasta 0.85). */
  simetrico: boolean;
  /** Pb en kN (opcional, de `cargaBalanceada`); si se da se usa el menor de 0.10 f′m Ae y 0.25 Pb. */
  Pb?: number;
}

/**
 * φ de la flexo-compresión paralela al plano en función de la carga axial nominal Pn (kN) (D.5.1.5.2, D-32/D-33).
 *  - Pn ≤ 0 (flexión pura o con tracción): φ = 0.85 (inciso a).
 *  - Pn > 0: φ = 0.60 (inciso b). Con refuerzo simétrico y fy ≤ 420 MPa, φ sube linealmente hasta 0.85 «en la medida que φPn
 *    disminuye desde 0.10 f′m Ae ó 0.25 Pb hasta cero»: φ = 0.85 − 0.25 φPn / T, que despejada es φ = 0.85 / (1 + 0.25 Pn / T)
 *    (forma cerrada, autoría del proyecto), con T el umbral. El texto escribe «ó»: se toma el MENOR (criterio habitual en MSJC/ACI 530;
 *    interpretación del proyecto). Se acota a [0.60, 0.85].
 */
export function phiEnPlanoFn(o: OpcionesPhiEnPlano): PhiFn {
  const T0 = (UMBRAL_RAMPA_FM_AE * o.fm * o.Ae) * N_A_KN;
  const T = o.Pb !== undefined ? Math.min(T0, UMBRAL_RAMPA_PB * o.Pb) : T0;
  return (Pn) => {
    if (Pn <= 0) return PHI.paralelo.flexion;
    if (!o.simetrico || o.fy > FY_MAX_RAMPA_PHI) return PHI.paralelo.compresionYFlexoCompresion;
    const phi = PHI.paralelo.rampaMaxima / (1 + (0.25 * Pn) / T);
    return Math.min(PHI.paralelo.rampaMaxima, Math.max(PHI.paralelo.compresionYFlexoCompresion, phi));
  };
}

/* ================================================================== */
/* D.5.5 — Resistencia a carga axial de compresión                     */
/* ================================================================== */

/** Relación de esbeltez h′/t (D.5.4.2 y D.5.4.3). */
export function esbeltez(hPrime: number, t: number): number {
  return hPrime / t;
}

/**
 * Re (Ec. D.5.5-2, D-37, PDF p.602): Re = 1 − [h′/(42 t)]² para h′/t ≤ 30; Re = [21 t/h′]² para h′/t > 30.
 * (En h′/t = 30 las dos ramas dan 0.4898 y 0.4900: la norma las deja continuas salvo redondeo.)
 */
export function factorEsbeltez(hPrime: number, t: number): number {
  const r = hPrime / t;
  return r <= ESBELTEZ_CAMBIO_RE ? 1 - (r / RE_DIVISOR_RAMA_BAJA) ** 2 : (RE_NUMERADOR_RAMA_ALTA / r) ** 2;
}

export interface EntradaPo {
  /** f′m, MPa. */
  fm: number;
  /** Área efectiva Ae, mm² (D.5.4.1). */
  Ae: number;
  /** Área total de refuerzo longitudinal Ast, mm². */
  Ast: number;
  /** fy, MPa. */
  fy: number;
}

export interface ResultadoPo {
  /** Po tal como queda (con el tope f′m Ae), kN. */
  Po: number;
  /** 0.80 f′m (Ae − Ast) + Ast fy, kN, antes del tope. */
  PoSinTope: number;
  /** f′m Ae, kN. */
  tope: number;
  /** true si el tope rige. */
  limitada: boolean;
}

/** Po = 0.80 f′m (Ae − Ast) + Ast fy ≤ f′m Ae (Ec. D.5.5-1, D-37, PDF p.602), en kN. */
export function resistenciaAxialTeorica(e: EntradaPo): ResultadoPo {
  const sinTope = (FACTOR_PO_FM * e.fm * (e.Ae - e.Ast) + e.Ast * e.fy) * N_A_KN;
  const tope = e.fm * e.Ae * N_A_KN;
  return { Po: Math.min(sinTope, tope), PoSinTope: sinTope, tope, limitada: sinTope > tope };
}

export interface EntradaAxial extends EntradaPo {
  /** Altura efectiva h′ (D.5.4.3), mm. */
  hPrime: number;
  /** Espesor efectivo t (D.5.4.2), mm. */
  t: number;
  /** Coeficiente φ a usar (p. ej. `phiMuro('fuera-flexion')` = 0.80 para gravedad, o `phiMuro('en-compresion')` = 0.60). */
  phi: number;
  /** Carga axial mayorada Pu (kN), opcional, para verificar Pu ≤ φPn. */
  Pu?: number;
}

export interface ResultadoAxial extends ResultadoPo {
  esbeltez: number;
  Re: number;
  /** Pn = 0.80 Po Re (Ec. D.5.5-3), kN. */
  Pn: number;
  phi: number;
  /** φPn (Ec. D.5.5-4), kN. */
  phiPn: number;
  /** h′/t ≤ 25 (D.5.4.3.1). */
  esbeltezAdmisible: boolean;
  /** Razón Pu/φPn si se dio Pu. */
  razon: number | null;
  cumple: boolean | null;
}

/** Resistencia a compresión axial sin excentricidad de un muro o columna (D.5.5.1–D.5.5.4), kN. */
export function resistenciaAxial(e: EntradaAxial): ResultadoAxial {
  const po = resistenciaAxialTeorica(e);
  const r = esbeltez(e.hPrime, e.t);
  const Re = factorEsbeltez(e.hPrime, e.t);
  const Pn = FACTOR_PN_PO * po.Po * Re;
  const phiPn = e.phi * Pn;
  const razon = e.Pu === undefined ? null : e.Pu / phiPn;
  return {
    ...po,
    esbeltez: r,
    Re,
    Pn,
    phi: e.phi,
    phiPn,
    esbeltezAdmisible: r <= ESBELTEZ_MAXIMA_MURO,
    razon,
    cumple: razon === null ? null : razon <= 1,
  };
}

/* ================================================================== */
/* D.5.6 — Flexión sin carga axial                                     */
/* ================================================================== */

/** a = As fy / (0.80 f′m b) (Ec. D.5.6-3, D-38, PDF p.603), en mm. */
export function bloqueCompresion(As: number, fy: number, fm: number, b: number): number {
  return (As * fy) / (FACTOR_BLOQUE_FM * fm * b);
}

/**
 * Cuantía de flexión balanceada ρb (AUTORÍA DEL PROYECTO, derivada de D.5.1-2: la norma usa ρb en D.5.6.2 y D.5.7.2 pero no la escribe).
 * Con εmu = 0.003, ab = 0.85 d εmu/(εmu + fy/Es) y equilibrio 0.80 f′m b ab = ρb b d fy:
 * ρb = 0.80 f′m · 0.85 εmu / [(εmu + fy/Es) fy]. No depende de b ni de d.
 */
export function cuantiaBalanceada(fm: number, fy: number, Es = ES_ACERO_MPA): number {
  return (FACTOR_BLOQUE_FM * fm * RELACION_A_C * EPS_MU) / ((EPS_MU + fy / Es) * fy);
}

export interface EntradaFlexionSimple {
  fm: number;
  fy: number;
  /** Ancho efectivo b, mm (D.5.4.4). */
  b: number;
  /** Altura útil d, mm. */
  d: number;
  /** Refuerzo de tracción As, mm². */
  As: number;
  /** φ de flexión: 0.80 (perpendicular al plano, D.5.1.5.1 a) o 0.85 (paralela, D.5.1.5.2 a). */
  phi: number;
  /** Momento mayorado Mu (kN·m), opcional. */
  Mu?: number;
}

export interface ResultadoFlexionSimple {
  a: number;
  /** c = a / 0.85, mm. */
  c: number;
  rho: number;
  rhoB: number;
  /** 0.75 ρb: límite de validez de la Ec. D.5.6-2. */
  rhoLimite: number;
  /** ρ < 0.75 ρb (D.5.6.2). */
  cumpleCuantia: boolean;
  /** Deformación del acero en tracción εs = εmu (d − c)/c. */
  epsS: number;
  /** El acero fluye (εs ≥ fy/Es). */
  fluye: boolean;
  /** Mn = As fy (d − a/2) (Ec. D.5.6-2), kN·m. */
  Mn: number;
  phi: number;
  phiMn: number;
  razon: number | null;
  cumple: boolean | null;
}

/** Sección simplemente reforzada (D.5.6.1 y D.5.6.2): Mn = As fy (d − a/2), Mu ≤ φ Mn. Resultados en kN·m. */
export function flexionSimple(e: EntradaFlexionSimple): ResultadoFlexionSimple {
  const a = bloqueCompresion(e.As, e.fy, e.fm, e.b);
  const c = a / RELACION_A_C;
  const rho = e.As / (e.b * e.d);
  const rhoB = cuantiaBalanceada(e.fm, e.fy);
  const Mn = (e.As * e.fy * (e.d - a / 2)) * NMM_A_KNM;
  const epsS = (EPS_MU * (e.d - c)) / c;
  const razon = e.Mu === undefined ? null : e.Mu / (e.phi * Mn);
  return {
    a,
    c,
    rho,
    rhoB,
    rhoLimite: FRACCION_RHO_B_FLEXION_SIMPLE * rhoB,
    cumpleCuantia: rho < FRACCION_RHO_B_FLEXION_SIMPLE * rhoB,
    epsS,
    fluye: epsS >= e.fy / ES_ACERO_MPA,
    Mn,
    phi: e.phi,
    phiMn: e.phi * Mn,
    razon,
    cumple: razon === null ? null : razon <= 1,
  };
}

export interface EntradaDobleArmadura {
  fm: number;
  fy: number;
  b: number;
  d: number;
  /** Distancia de la fibra comprimida al centroide del refuerzo de compresión, mm. */
  dPrime: number;
  /** Refuerzo total de tracción As (= As1 + As2), mm². */
  As: number;
  /** Refuerzo de compresión A′s (= As2 si fluye), mm². */
  AsPrime: number;
  phi: number;
  Mu?: number;
}

export interface ResultadoDobleArmadura {
  As1: number;
  As2: number;
  /** a de la parte equilibrada por la mampostería: As1 fy /(0.80 f′m b), mm. */
  a: number;
  c: number;
  /** Deformación del refuerzo de compresión ε′s = εmu (c − d′)/c (negativa si d′ > c: no trabaja a compresión). */
  epsPrimeS: number;
  /** El refuerzo de compresión está en fluencia (condición para usar D.5.6-4). */
  fluyeCompresion: boolean;
  /** Mn de la Ec. D.5.6-4 (kN·m); solo es válido si `fluyeCompresion`. */
  MnNorma: number;
  /** Mn por equilibrio y compatibilidad de deformaciones sin suponer fluencia de A′s (autoría del proyecto), kN·m. */
  MnCompatibilidad: number;
  /** Esfuerzo en el refuerzo de compresión con el equilibrio completo, MPa. */
  fsPrime: number;
  /** Mn a usar: el de la norma si A′s fluye; si no, el de compatibilidad (menor y más realista). */
  Mn: number;
  phi: number;
  phiMn: number;
  razon: number | null;
  cumple: boolean | null;
}

/**
 * Sección con refuerzo a compresión (D.5.6.3, Ec. D.5.6-4, D-38): As2 = A′s equilibrado por el refuerzo de compresión; As1 = As − A′s
 * equilibrado por la mampostería: a = As1 fy/(0.80 f′m b); Mn = As1 fy (d − a/2) + As2 fy (d − d′). La norma exige «probar que el
 * refuerzo a compresión está en fluencia»: se verifica con ε′s = εmu (c − d′)/c ≥ fy/Es y, si no fluye, se entrega además
 * el Mn por compatibilidad de deformaciones (autoría del proyecto).
 */
export function flexionDobleArmadura(e: EntradaDobleArmadura): ResultadoDobleArmadura {
  const As2 = Math.min(e.AsPrime, e.As);
  const As1 = Math.max(e.As - As2, 0);
  const a = (As1 * e.fy) / (FACTOR_BLOQUE_FM * e.fm * e.b);
  const c = a / RELACION_A_C;
  const epsPrimeS = c > 0 ? (EPS_MU * (c - e.dPrime)) / c : -Infinity;
  const fluyeCompresion = c > 0 && epsPrimeS >= e.fy / ES_ACERO_MPA;
  const MnNorma = (As1 * e.fy * (e.d - a / 2) + As2 * e.fy * (e.d - e.dPrime)) * NMM_A_KNM;
  // Equilibrio completo: sección rectangular b × h con h = d + d' (suficiente para el bloque de compresión; no lo limita).
  const sec: SeccionM = {
    b: e.b,
    h: Math.max(e.d + e.dPrime, e.d * 1.2),
    fm: e.fm,
    fy: e.fy,
    capas: [
      { area: e.AsPrime, y: e.dPrime },
      { area: e.As, y: e.d },
    ],
  };
  const cEq = cParaCarga(sec, 0);
  let MnCompat = MnNorma;
  let fsP = e.fy;
  if (cEq !== null) {
    const est = estadoEnC(sec, cEq);
    // Momento respecto de la capa de tracción: Cm (d − a/2) + F's (d − d′).
    const aEq = est.a;
    const Cm = (FACTOR_BLOQUE_FM * e.fm * e.b * aEq) * N_A_KN;
    fsP = Math.max(-e.fy, Math.min(e.fy, ES_ACERO_MPA * ((EPS_MU * (cEq - e.dPrime)) / cEq)));
    const Fp = (e.AsPrime * fsP) * N_A_KN;
    MnCompat = (Cm * (e.d - aEq / 2) + Fp * (e.d - e.dPrime)) / 1000;
  }
  const Mn = fluyeCompresion ? MnNorma : MnCompat;
  const razon = e.Mu === undefined ? null : e.Mu / (e.phi * Mn);
  return {
    As1,
    As2,
    a,
    c,
    epsPrimeS,
    fluyeCompresion,
    MnNorma,
    MnCompatibilidad: MnCompat,
    fsPrime: fsP,
    Mn,
    phi: e.phi,
    phiMn: e.phi * Mn,
    razon,
    cumple: razon === null ? null : razon <= 1,
  };
}

/* ================================================================== */
/* Sección rectangular con capas de refuerzo: equilibrio y             */
/* compatibilidad de deformaciones (D.5.1.6) — AUTORÍA DEL PROYECTO    */
/* ================================================================== */

/** Capa de refuerzo: área (mm²) y profundidad `y` (mm) desde la fibra más comprimida. */
export interface CapaM {
  area: number;
  y: number;
}

/** Sección rectangular b × h (h en la dirección de flexión), con capas de refuerzo longitudinal. */
export interface SeccionM {
  b: number;
  h: number;
  fm: number;
  fy: number;
  capas: readonly CapaM[];
}

const sumaAs = (s: SeccionM): number => s.capas.reduce((acc, c) => acc + c.area, 0);
const yMax = (s: SeccionM): number => s.capas.reduce((acc, c) => Math.max(acc, c.y), 0);

/** Esfuerzo del acero para una deformación ε (compresión +): elastoplástico perfecto (D.5.1.6.4). */
export function esfuerzoAceroM(eps: number, fy: number, Es = ES_ACERO_MPA): number {
  return Math.max(-fy, Math.min(fy, Es * eps));
}

export interface EstadoSeccion {
  c: number;
  /** Profundidad del bloque, a = 0.85 c limitada a h. */
  a: number;
  /** Fuerza axial nominal (compresión +), kN. */
  Pn: number;
  /** Momento nominal respecto de h/2, kN·m. */
  Mn: number;
  /** Deformación en la capa extrema de tracción: εt = εmu (c − ymax)/c (negativa = tracción). */
  epsT: number;
}

/**
 * Fuerza y momento nominales para una profundidad de eje neutro c: deformación εmu = 0.003 en la fibra extrema, secciones planas,
 * mampostería sin tracción y bloque uniforme 0.80 f′m sobre a = 0.85 c (D.5.1.6.3 a D.5.1.6.6). No se descuenta la mampostería
 * desplazada por el refuerzo comprimido. Resultados en kN y kN·m.
 */
export function estadoEnC(sec: SeccionM, c: number, Es = ES_ACERO_MPA): EstadoSeccion {
  const a = Math.min(RELACION_A_C * c, sec.h);
  const Cm = (FACTOR_BLOQUE_FM * sec.fm * sec.b * a) * N_A_KN;
  let P = Cm;
  let M = (Cm * (sec.h / 2 - a / 2)) / 1000;
  for (const capa of sec.capas) {
    const f = esfuerzoAceroM((EPS_MU * (c - capa.y)) / c, sec.fy, Es);
    const F = (capa.area * f) * N_A_KN;
    P += F;
    M += (F * (sec.h / 2 - capa.y)) / 1000;
  }
  return { c, a, Pn: P, Mn: M, epsT: (EPS_MU * (c - yMax(sec))) / c };
}

/** Pn máxima alcanzable por la sección (c → ∞): 0.80 f′m b h + Σ As fy, kN. */
function PnLimiteSuperior(sec: SeccionM): number {
  return (FACTOR_BLOQUE_FM * sec.fm * sec.b * sec.h + sumaAs(sec) * sec.fy) * N_A_KN;
}

/** Pn mínima (tracción pura), −Σ As fy, kN (valor negativo). */
function PnLimiteInferior(sec: SeccionM): number {
  return -(sumaAs(sec) * sec.fy) * N_A_KN;
}

/** Profundidad del eje neutro c para la que Pn = `Pn` (kN, compresión +); null si la carga está fuera del alcance de la sección. */
export function cParaCarga(sec: SeccionM, Pn: number, Es = ES_ACERO_MPA): number | null {
  if (Pn < PnLimiteInferior(sec) || Pn > PnLimiteSuperior(sec)) return null;
  let lo = 1e-6 * sec.h;
  let hi = 1e4 * sec.h;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (estadoEnC(sec, mid, Es).Pn < Pn) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Capas de refuerzo de un muro en su plano (h = ℓw): refuerzo concentrado en los extremos (área por extremo y distancia d′ del
 * borde al centroide) y `nIntermedias` barras verticales distribuidas con la misma área cada una (`areaIntermedia`), repartidas
 * uniformemente entre ambos extremos.
 */
export function capasMuroEnPlano(lw: number, dPrime: number, areaExtremo: number, areaIntermedia = 0, nIntermedias = 0): CapaM[] {
  const capas: CapaM[] = [
    { area: areaExtremo, y: dPrime },
    { area: areaExtremo, y: lw - dPrime },
  ];
  for (let i = 1; i <= nIntermedias; i++) capas.push({ area: areaIntermedia, y: dPrime + ((lw - 2 * dPrime) * i) / (nIntermedias + 1) });
  return capas;
}

export interface PuntoMuro {
  /** Profundidad del eje neutro, mm; null en los extremos (compresión máxima o tracción pura). */
  c: number | null;
  Pn: number;
  Mn: number;
  phi: number;
  phiPn: number;
  phiMn: number;
  etiqueta?: 'tope' | 'balanceado' | 'flexion-pura' | 'traccion-pura';
}

export interface CurvaMuro {
  /** Puntos de compresión (tope Pn,max) a tracción pura, ordenados por Pn decreciente. */
  puntos: PuntoMuro[];
  Po: number;
  Re: number;
  /** Pn,max = 0.80 Po Re (Ec. D.5.5-3), kN. */
  PnMax: number;
  balanceado: PuntoMuro;
  flexionPura: PuntoMuro | null;
}

/**
 * Diagrama de interacción (Pn, Mn) y de diseño (φPn, φMn) de un muro o columna rectangular (D.5.1.6, D.5.7.3, D.5.8.3):
 * barrido de la profundidad del eje neutro c. La rama de compresión se corta en Pn,max = 0.80 Po Re (D.5.5.3) —por lo que
 * φPn ≤ φ 0.80 Po Re, Ec. D.5.5-4—; si no se da la esbeltez se toma Re = 1.
 * `phiFn` entrega φ en función de Pn (ver `phiFueraPlanoFn`, `phiEnPlanoFn`).
 */
export function curvaInteraccionMuro(sec: SeccionM, phiFn: PhiFn, esb?: { hPrime: number; t: number }, nPuntos = 50): CurvaMuro {
  const Ae = sec.b * sec.h;
  const Ast = sumaAs(sec);
  const { Po } = resistenciaAxialTeorica({ fm: sec.fm, Ae, Ast, fy: sec.fy });
  const Re = esb ? factorEsbeltez(esb.hPrime, esb.t) : 1;
  const PnMax = FACTOR_PN_PO * Po * Re;
  const mk = (e: EstadoSeccion, etiqueta?: PuntoMuro['etiqueta']): PuntoMuro => {
    const phi = phiFn(e.Pn);
    return { c: e.c, Pn: e.Pn, Mn: e.Mn, phi, phiPn: phi * e.Pn, phiMn: phi * e.Mn, etiqueta };
  };
  const dMax = yMax(sec);
  const cBal = (EPS_MU * dMax) / (EPS_MU + sec.fy / ES_ACERO_MPA);
  const cTope = PnMax <= PnLimiteSuperior(sec) ? cParaCarga(sec, PnMax) : null;
  const cMaxBarrido = cTope ?? 20 * sec.h;
  const cMin = 0.03 * dMax;
  const cs = new Set<number>();
  for (let i = 0; i <= nPuntos; i++) cs.add(cMin * (cMaxBarrido / cMin) ** (i / nPuntos));
  cs.add(cBal);
  const lista = [...cs].filter((c) => c <= cMaxBarrido + 1e-9).sort((x, y) => y - x);
  const puntos: PuntoMuro[] = [];
  if (cTope !== null) {
    const eT = estadoEnC(sec, cTope);
    puntos.push(mk({ ...eT, Mn: eT.Mn }, 'tope'));
  }
  for (const c of lista) {
    if (cTope !== null && Math.abs(c - cTope) < 1e-9) continue;
    puntos.push(mk(estadoEnC(sec, c), Math.abs(c - cBal) < 1e-9 ? 'balanceado' : undefined));
  }
  const cPura = cParaCarga(sec, 0);
  let flexionPura: PuntoMuro | null = null;
  if (cPura !== null) {
    flexionPura = mk(estadoEnC(sec, cPura), 'flexion-pura');
    puntos.push(flexionPura);
  }
  const Tn = PnLimiteInferior(sec);
  puntos.push({ c: null, Pn: Tn, Mn: 0, phi: phiFn(Tn), phiPn: phiFn(Tn) * Tn, phiMn: 0, etiqueta: 'traccion-pura' });
  puntos.sort((p, q) => q.Pn - p.Pn);
  const balanceado = mk(estadoEnC(sec, cBal), 'balanceado');
  return { puntos, Po, Re, PnMax, balanceado, flexionPura };
}

export interface ResistenciaFlexoCompresion {
  c: number;
  Pn: number;
  Mn: number;
  phi: number;
  phiPn: number;
  phiMn: number;
}

/**
 * Resistencia de diseño a flexión para una carga axial mayorada Pu (kN): busca el punto del diagrama con φ(Pn)·Pn = Pu
 * y devuelve su Mn y φMn. Devuelve null si Pu está fuera del diagrama (mayor que la resistencia axial o mayor que la tracción).
 * No aplica el tope 0.80 Po Re: úsese `verificarFlexoCompresion`.
 */
export function resistenciaFlexoCompresion(sec: SeccionM, Pu: number, phiFn: PhiFn): ResistenciaFlexoCompresion | null {
  let lo = PnLimiteInferior(sec);
  let hi = PnLimiteSuperior(sec);
  if (phiFn(lo) * lo > Pu || phiFn(hi) * hi < Pu) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (phiFn(mid) * mid < Pu) lo = mid;
    else hi = mid;
  }
  const Pn = (lo + hi) / 2;
  const c = cParaCarga(sec, Pn);
  if (c === null) return null;
  const e = estadoEnC(sec, c);
  const phi = phiFn(e.Pn);
  return { c, Pn: e.Pn, Mn: e.Mn, phi, phiPn: phi * e.Pn, phiMn: phi * e.Mn };
}

export interface VerificacionFlexoCompresion {
  cumple: boolean;
  motivo: 'ok' | 'Pu-excede-tope' | 'Pu-fuera-diagrama' | 'Mu-excede';
  /** Pn,max = 0.80 Po Re (kN) y φPn,max. */
  PnMax: number;
  phiPnMax: number;
  /** φMn disponible con Pu (kN·m), null si Pu queda fuera del diagrama. */
  phiMnDisponible: number | null;
  /** Mu/φMn. */
  razon: number | null;
  detalle: ResistenciaFlexoCompresion | null;
}

/** Verifica el par (Pu, Mu) contra el diagrama de interacción de diseño, incluido el tope φPn ≤ φ 0.80 Po Re (D.5.5.4). */
export function verificarFlexoCompresion(
  sec: SeccionM,
  Pu: number,
  Mu: number,
  phiFn: PhiFn,
  esb?: { hPrime: number; t: number },
  /** Factor adicional sobre Mn: Re en muros fuera del plano (D.5.7-1 y D.5.7-5); 1 en el plano. */
  factorMn = 1,
): VerificacionFlexoCompresion {
  const Ae = sec.b * sec.h;
  const { Po } = resistenciaAxialTeorica({ fm: sec.fm, Ae, Ast: sumaAs(sec), fy: sec.fy });
  const Re = esb ? factorEsbeltez(esb.hPrime, esb.t) : 1;
  const PnMax = FACTOR_PN_PO * Po * Re;
  const phiPnMax = phiFn(PnMax) * PnMax;
  if (Pu > phiPnMax) return { cumple: false, motivo: 'Pu-excede-tope', PnMax, phiPnMax, phiMnDisponible: null, razon: null, detalle: null };
  const det = resistenciaFlexoCompresion(sec, Pu, phiFn);
  if (!det) return { cumple: false, motivo: 'Pu-fuera-diagrama', PnMax, phiPnMax, phiMnDisponible: null, razon: null, detalle: null };
  const disp = det.phiMn * factorMn;
  const razon = Math.abs(Mu) / disp;
  return { cumple: razon <= 1, motivo: razon <= 1 ? 'ok' : 'Mu-excede', PnMax, phiPnMax, phiMnDisponible: disp, razon, detalle: det };
}

/* ================================================================== */
/* D.5.7 — Muros en la dirección perpendicular a su plano              */
/* ================================================================== */

export interface EntradaMuroFuera {
  fm: number;
  fy: number;
  /** Ancho efectivo b de la franja de diseño, mm (D.5.4.4.1). */
  b: number;
  /** Espesor del muro, mm (profundidad de la sección en flexión fuera del plano). */
  t: number;
  /** Altura útil d al refuerzo vertical, mm. */
  d: number;
  /** Refuerzo vertical de la franja b, mm². */
  As: number;
  /** Carga axial mayorada Pu sobre la franja b (kN, compresión +). */
  Pu: number;
  /** Altura efectiva h′, mm. */
  hPrime: number;
  /** Área efectiva Ae de la franja, mm² (para el umbral 0.10 f′m Ae). */
  Ae: number;
  /** Momento mayorado fuera del plano en la franja (kN·m), opcional. */
  Mu?: number;
  /** φ de flexión; por defecto 0.80 (D.5.1.5.1 a). */
  phi?: number;
}

export interface ResultadoMuroFuera {
  esbeltez: number;
  Re: number;
  /** 0.10 f′m Ae, kN. */
  umbralPu: number;
  /** 'menor': D.5.7.2 (Ecs. D.5.7-2 a D.5.7-4); 'mayor': D.5.7.3 (interacción). */
  caso: 'menor' | 'mayor';
  /** h′/t ≤ 25 (D.5.4.3.1) y, si Pu > 0.10 f′m Ae, h′/t ≤ 30 (D.5.7.3). */
  esbeltezAdmisible: boolean;
  /** Solo caso 'menor': Ase, a y cuantías. */
  Ase: number | null;
  a: number | null;
  rho: number;
  rhoB: number;
  /** ρ ≤ 0.5 ρb (solo se exige en D.5.7.2). */
  cumpleCuantia: boolean | null;
  Mn: number;
  phi: number;
  /** φ Re Mn (Ecs. D.5.7-1 y D.5.7-5), kN·m. */
  phiReMn: number;
  razon: number | null;
  cumple: boolean | null;
}

/**
 * Diseño a flexión de un muro fuera de su plano (D.5.7.2 y D.5.7.3, D-38/D-39, PDF p.603–604), por franja de ancho b.
 *  - Pu < 0.10 f′m Ae: Ase = (As fy + Pu)/fy, a = (As fy + Pu)/(0.80 f′m b), Mn = Ase fy (d − a/2); Mu ≤ φ Re Mn; ρ ≤ 0.5 ρb.
 *  - Pu > 0.10 f′m Ae: h′/t ≤ 30 y Mn del diagrama de interacción en Pn = Pu/φ (la norma remite a D.5.1.6; tomar φPn = Pu es
 *    interpretación del proyecto), Mu ≤ φ Re Mn.
 * Recuerda que en las ecuaciones de la norma Pu va en N: aquí está en kN y se convierte.
 */
export function muroFueraPlano(e: EntradaMuroFuera): ResultadoMuroFuera {
  const phi = e.phi ?? PHI.perpendicular.flexionYFlexoCompresion;
  const r = esbeltez(e.hPrime, e.t);
  const Re = factorEsbeltez(e.hPrime, e.t);
  const umbral = (UMBRAL_AXIAL_FUERA_PLANO * e.fm * e.Ae) * N_A_KN;
  const caso = e.Pu < umbral ? 'menor' : 'mayor';
  const rho = e.As / (e.b * e.d);
  const rhoB = cuantiaBalanceada(e.fm, e.fy);
  let Mn: number;
  let Ase: number | null = null;
  let a: number | null = null;
  let cumpleCuantia: boolean | null = null;
  let esbeltezAdmisible = r <= ESBELTEZ_MAXIMA_MURO;
  if (caso === 'menor') {
    const PuN = e.Pu * 1000;
    Ase = (e.As * e.fy + PuN) / e.fy;
    a = (e.As * e.fy + PuN) / (FACTOR_BLOQUE_FM * e.fm * e.b);
    Mn = (Ase * e.fy * (e.d - a / 2)) * NMM_A_KNM;
    cumpleCuantia = rho <= FRACCION_RHO_B_FUERA_PLANO * rhoB;
  } else {
    esbeltezAdmisible = esbeltezAdmisible && r <= ESBELTEZ_MAX_CARGA_ALTA;
    const sec: SeccionM = { b: e.b, h: e.t, fm: e.fm, fy: e.fy, capas: [{ area: e.As, y: e.d }] };
    const res = resistenciaFlexoCompresion(sec, e.Pu, () => phi);
    Mn = res ? res.Mn : NaN;
  }
  const phiReMn = phi * Re * Mn;
  const razon = e.Mu === undefined || !Number.isFinite(phiReMn) ? null : Math.abs(e.Mu) / phiReMn;
  return {
    esbeltez: r,
    Re,
    umbralPu: umbral,
    caso,
    esbeltezAdmisible,
    Ase,
    a,
    rho,
    rhoB,
    cumpleCuantia,
    Mn,
    phi,
    phiReMn,
    razon,
    cumple: razon === null ? null : razon <= 1,
  };
}

/** Vn = (1/6) Amv √f′m (Ec. D.5.7-7, D-39, PDF p.604), en kN, con Amv en mm² y f′m en MPa. */
export function cortanteFueraPlano(Amv: number, fm: number): number {
  return ((Amv * Math.sqrt(fm)) / DIVISOR_VN_FUERA_PLANO) * N_A_KN;
}

/* ================================================================== */
/* D.5.8 — Muros en la dirección paralela a su plano                   */
/* ================================================================== */

/** α de Mn ≥ α Mcr: 1.8 si todas las celdas están inyectadas; 3.0 si solo las celdas con refuerzo o si es de cavidad reforzada (Ec. D.5.8-1). */
export function alphaMcr(tipo: TipoInyeccion): number {
  return ALPHA_MCR[tipo];
}

/** Mcr = b ℓw² fr / 6 (Ec. D.5.8-2, D-39, PDF p.604), en kN·m (b y ℓw en mm, fr en MPa). */
export function momentoAgrietamiento(b: number, lw: number, fr: number): number {
  return ((b * lw * lw * fr) / 6) * NMM_A_KNM;
}

export interface EntradaRuptura {
  /** 'horizontal': esfuerzos de tracción perpendiculares a las juntas horizontales; 'vertical': perpendiculares a la junta vertical. */
  direccion: 'horizontal' | 'vertical';
  unidad: 'maciza' | 'perforacion-vertical';
  /** Fracción de celdas rellenas (0 = sin rellenar, 1 = totalmente rellena) para unidades de perforación vertical. */
  relleno?: number;
  mortero: 'cemento-cal' | 'cemento-mamposteria';
  /** 'HMS' = mortero tipo H, M o S; 'N' = mortero tipo N. */
  tipoMortero: 'HMS' | 'N';
}

function valorTabla(clave: ClaveRuptura, mortero: EntradaRuptura['mortero'], tipo: EntradaRuptura['tipoMortero']): number {
  const f = TABLA_D581.find((x) => x.clave === clave);
  if (!f) throw new RangeError(`Fila inexistente en D.5.8-1: ${clave}`);
  return (mortero === 'cemento-cal' ? f.cementoCal : f.cementoMamposteria)[tipo];
}

/**
 * Módulo de ruptura fr (MPa) de la Tabla D.5.8-1 (D-40, PDF p.605). Para unidades de perforación vertical parcialmente inyectadas
 * con tracción perpendicular a las juntas horizontales se interpola linealmente entre «sin rellenar» y «rellenas» según el
 * porcentaje rellenado (nota (1) de la tabla). Para tracción perpendicular a la junta vertical, la tabla da un único valor para
 * «rellenas y parcialmente rellenas», que se usa para cualquier relleno > 0.
 */
export function moduloRuptura(e: EntradaRuptura): number {
  const dir = e.direccion;
  if (e.unidad === 'maciza') return valorTabla(`${dir}-maciza`, e.mortero, e.tipoMortero);
  const rel = Math.min(1, Math.max(0, e.relleno ?? 0));
  const sin = valorTabla(`${dir}-vp-sin-rellenar`, e.mortero, e.tipoMortero);
  const con = valorTabla(`${dir}-vp-rellena`, e.mortero, e.tipoMortero);
  if (dir === 'vertical') return rel > 0 ? con : sin;
  return sin + (con - sin) * rel;
}

/** Cociente Mu/(Vu d) en valor absoluto y no mayor que 1 (D.5.8.4.2 y D.5.8.4.4). Mu en kN·m, Vu en kN, d en mm. */
export function relacionMVd(Mu: number, Vu: number, d: number): number {
  if (Vu === 0) return 1;
  return Math.min(1, Math.abs((Mu * 1e6) / (Vu * 1000 * d)));
}

/** d = 0.8 ℓw en ausencia de un análisis de compatibilidad de deformaciones (D.5.8.4.2). */
export function alturaUtilMuro(lw: number): number {
  return D_SOBRE_LW * lw;
}

/** Coeficiente de la Tabla D.5.8-2 (sin Pu): 0.30 | 0.33 − 0.13 Mu/(Vud) | 0.20. */
export function coeficienteVm(mvd: number): number {
  if (mvd <= BANDA_MVD.inferior) return TABLA_D582.bajo;
  if (mvd >= BANDA_MVD.superior) return TABLA_D582.alto;
  return TABLA_D582.intermedio.a - TABLA_D582.intermedio.b * mvd;
}

/** Coeficiente de la Tabla D.5.8-3: 0.50 | 0.56 − 0.23 Mu/(Vud) | 0.33. */
export function coeficienteVnMax(mvd: number): number {
  if (mvd <= BANDA_MVD.inferior) return TABLA_D583.bajo;
  if (mvd >= BANDA_MVD.superior) return TABLA_D583.alto;
  return TABLA_D583.intermedio.a - TABLA_D583.intermedio.b * mvd;
}

/**
 * Vm (Tabla D.5.8-2, D-41, PDF p.606), en kN: Vm = coef · Amv √f′m + 0.25 Pu. Amv en mm², f′m en MPa, Pu en kN (compresión +).
 * Pu entra tal como se da: con tracción neta la fórmula daría un aporte negativo; úsese Pu ≥ 0 salvo análisis específico.
 */
export function cortanteMamposteria(o: { Amv: number; fm: number; Pu: number; mvd: number }): number {
  return ((coeficienteVm(o.mvd) * o.Amv * Math.sqrt(o.fm)) + TABLA_D582.coefPu * o.Pu * 1000) * N_A_KN;
}

/** ρn = Av η / (s b) (Ec. D.5.8-8), adimensional; Av en mm², s y b en mm. */
export function cuantiaCortante(Av: number, s: number, b: number, eta: number): number {
  return (Av * eta) / (s * b);
}

/** Vs = ρn fy Amv (Ec. D.5.8-7, D-41), en kN. */
export function cortanteRefuerzo(o: { Av: number; s: number; b: number; eta: number; fy: number; Amv: number }): number {
  return (cuantiaCortante(o.Av, o.s, o.b, o.eta) * o.fy * o.Amv) * N_A_KN;
}

/** Vn máximo de la Tabla D.5.8-3 (D-42, PDF p.607), en kN. */
export function cortanteMaximo(o: { Amv: number; fm: number; mvd: number }): number {
  return (coeficienteVnMax(o.mvd) * o.Amv * Math.sqrt(o.fm)) * N_A_KN;
}

export interface EntradaCortanteEnPlano {
  fm: number;
  /** Longitud horizontal del muro ℓw, mm. */
  lw: number;
  /** Ancho efectivo del alma b, mm (Amv = b ℓw si no se da Amv). */
  b: number;
  /** Área efectiva para cortante, mm² (D.5.4.5.2); por defecto b ℓw. */
  Amv?: number;
  /** Cortante y momento mayorados simultáneos, kN y kN·m, y carga axial mayorada Pu (kN, compresión +). */
  Vu: number;
  Mu: number;
  Pu: number;
  /** d, mm; por defecto 0.8 ℓw. */
  d?: number;
  /** Refuerzo horizontal: área Av (mm²) cada s (mm), fy (MPa) y tipo (η). Opcional. */
  Av?: number;
  s?: number;
  fyCortante?: number;
  refuerzo?: TipoRefuerzoCortante;
  /** Resistencia nominal a flexión del muro, kN·m, para la verificación de articulación plástica (D.5.8.4.1) y φ = 0.85. */
  MnFlexion?: number;
}

export interface ResultadoCortanteEnPlano {
  Amv: number;
  d: number;
  mvd: number;
  Vm: number;
  eta: number;
  rhoN: number;
  Vs: number;
  Vn: number;
  VnMax: number;
  /** Vn a emplear: min(Vn, VnMax). */
  VnUtil: number;
  /** Vn ≤ VnMax (D.5.8.4.4). */
  cumpleMaximo: boolean;
  phi: number;
  phiVn: number;
  /** Vu ≥ φVm: el refuerzo debe tomar el cortante (D.5.8-4/5). */
  requiereRefuerzo: boolean;
  /** Vs necesario: max(0, Vu/φ − Vm), kN; y Av/s necesario (mm²/mm) para ese Vs con el η elegido. */
  VsRequerido: number;
  AvSobreSRequerido: number | null;
  /** Cortante asociado a Mn, V(Mn) = Mn / (Mu/Vu), kN (si se dio MnFlexion). */
  VMn: number | null;
  /** Vn > V(Mn): posible articulación plástica (D.5.8.4.1): en la región ℓw desde la base Vn = Vs y s ≤ min(3 t, 600). */
  articulacionPlastica: boolean | null;
  razon: number;
  cumple: boolean;
}

/**
 * Resistencia a cortante paralela al plano (D.5.8.4): Vu ≤ φ Vn con Vn = Vm + Vs (Ec. D.5.8-5), Vm de la Tabla D.5.8-2,
 * Vs = ρn fy Amv (D.5.8-7/8) y Vn ≤ máximo de la Tabla D.5.8-3. φ = 0.60 (D.5.1.5.2 c), o 0.85 si Vn excede el cortante asociado
 * a Mn. Con esbeltez de articulación plástica, ver `articulacionPlastica`. Todo en kN.
 */
export function cortanteMuroEnPlano(e: EntradaCortanteEnPlano): ResultadoCortanteEnPlano {
  const Amv = e.Amv ?? e.b * e.lw;
  const d = e.d ?? alturaUtilMuro(e.lw);
  const mvd = relacionMVd(e.Mu, e.Vu, d);
  const Vm = cortanteMamposteria({ Amv, fm: e.fm, Pu: e.Pu, mvd });
  const eta = ETA_REFUERZO[e.refuerzo ?? 'embebido'];
  const tieneRef = e.Av !== undefined && e.s !== undefined && e.fyCortante !== undefined && e.s > 0;
  const rhoN = tieneRef ? cuantiaCortante(e.Av!, e.s!, e.b, eta) : 0;
  const Vs = tieneRef ? cortanteRefuerzo({ Av: e.Av!, s: e.s!, b: e.b, eta, fy: e.fyCortante!, Amv }) : 0;
  const Vn = Vm + Vs;
  const VnMax = cortanteMaximo({ Amv, fm: e.fm, mvd });
  const VnUtil = Math.min(Vn, VnMax);
  const VMn = e.MnFlexion !== undefined && e.Mu !== 0 && e.Vu !== 0 ? e.MnFlexion / Math.abs(e.Mu / e.Vu) : null;
  const phi = VMn !== null ? phiCortanteEnPlano(VnUtil, VMn) : PHI.paralelo.cortante;
  const phiVn = phi * VnUtil;
  const VsReq = Math.max(0, Math.abs(e.Vu) / phi - Vm);
  const AvSobreS = e.fyCortante !== undefined ? (VsReq * 1000 * e.b) / (eta * e.fyCortante * Amv) : null;
  const razon = Math.abs(e.Vu) / phiVn;
  return {
    Amv,
    d,
    mvd,
    Vm,
    eta,
    rhoN,
    Vs,
    Vn,
    VnMax,
    VnUtil,
    cumpleMaximo: Vn <= VnMax,
    phi,
    phiVn,
    requiereRefuerzo: Math.abs(e.Vu) >= phi * Vm,
    VsRequerido: VsReq,
    AvSobreSRequerido: AvSobreS,
    VMn,
    articulacionPlastica: VMn === null ? null : VnUtil > VMn,
    razon,
    cumple: razon <= 1,
  };
}

/**
 * Verificación de articulación plástica (D.5.8.4.1, D-40/D-41): si Vn > V(Mn) = Mn / (M/V) hay posibilidad de articulación en la base
 * y, hasta una altura ℓw, Vn = Vs (Ec. D.5.8-6) con separación del refuerzo horizontal s ≤ min(3 t, 600 mm). Devuelve el límite de s.
 */
export function articulacionPlastica(o: { Vn: number; Mn: number; brazoMV: number; t: number }): { VMn: number; riesgo: boolean; sMax: number } {
  const VMn = o.Mn / (o.brazoMV / 1000);
  return { VMn, riesgo: o.Vn > VMn, sMax: Math.min(SEPARACION_ARTICULACION.veces_t * o.t, SEPARACION_ARTICULACION.maxMm) };
}

/**
 * Esfuerzo elástico en la fibra extrema, sección no fisurada (D.5.8.5 b), de un muro rectangular b × ℓw:
 * σ = Pu/(b ℓw) + 6 Mu/(b ℓw²), en MPa (compresión +). Pu en kN, Mu en kN·m.
 */
export function esfuerzoFibraExtrema(o: { Pu: number; Mu: number; b: number; lw: number }): number {
  return (o.Pu * 1000) / (o.b * o.lw) + (6 * Math.abs(o.Mu) * 1e6) / (o.b * o.lw * o.lw);
}

export interface ResultadoBorde {
  /** Límite 0.20 f′m (reforzada, cavidad reforzada) o 0.30 f′m (parcialmente reforzada), MPa. */
  limite: number;
  /** Esfuerzo bajo el cual se pueden suspender (0.15 f′m), MPa. */
  limiteSuspension: number;
  requiere: boolean;
}

/** ¿Se requieren elementos de borde? σ de fibra extrema con cargas mayoradas > 0.20 f′m (o 0.30 f′m si es parcialmente reforzada) (D.5.8.5, D-42). */
export function requiereElementoBorde(sigma: number, fm: number, tipo: TipoMamposteriaBorde): ResultadoBorde {
  const limite = BORDE[tipo] * fm;
  return { limite, limiteSuspension: BORDE.suspension * fm, requiere: sigma > limite };
}
