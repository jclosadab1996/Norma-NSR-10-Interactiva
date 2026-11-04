/**
 * Capítulo C.12 — Longitudes de desarrollo y empalmes del refuerzo. Lógica pura (sin React) compartida por el capítulo
 * MDX y la calculadora. Datos y constantes transcritos en `src/data/desarrolloRefuerzo.ts`.
 * Unidades: mm, MPa (ℓ en mm; Mn en kN·m y Vu en kN donde se indica). Página PDF = página impresa "C-n" + 302.
 *
 * Todo lo que es texto de la norma lleva su sección; lo que es criterio propio (p. ej. cómo se calcula cb a partir del
 * recubrimiento libre) está marcado como tal.
 */
import {
  ALMA,
  CABEZA,
  CB_KTR_DB_MAX,
  C121_CONSTANTE,
  COMPRESION,
  EMPALMES,
  EMPALME_COLUMNAS,
  EMPALME_COMPRESION,
  FACTOR_CLASE_EMPALME,
  FACTOR_PAQUETE,
  FACTORES_GANCHO,
  FLEXION,
  FRONTERA_TAMANO_DB_MM,
  GANCHO,
  KTR_CONSTANTE,
  LAMBDA_LIVIANO_MAX,
  MALLA,
  MINIMOS,
  PSI_E,
  PSI_S,
  PSI_T,
  RAIZ_FC_MAX_MPA,
  TABLA_C122,
  TORON,
  type ClaseEmpalme,
} from '../../data/desarrolloRefuerzo';
import { lambdaPorHendimiento, type TipoConcreto } from './concreto';

function exigirPositivo(nombre: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${nombre} debe ser un número positivo`);
}

// ---------------------------------------------------------------------------------------------
// Factores comunes (C.12.1.2 y C.12.2.4)
// ---------------------------------------------------------------------------------------------

/** √f′c limitada a 8.3 MPa (C.12.1.2, PDF p.409, C-107). */
export function raizFcDesarrollo(fc: number): number {
  exigirPositivo('f′c', fc);
  return Math.min(Math.sqrt(fc), RAIZ_FC_MAX_MPA);
}

/** True si el f′c dado supera el equivalente a √f′c = 8.3 MPa (68.9 MPa) y por tanto se está limitando √f′c. */
export function fcExcedeLimiteRaiz(fc: number): boolean {
  return Math.sqrt(fc) > RAIZ_FC_MAX_MPA;
}

/**
 * λ para este capítulo (C.12.2.4(d)): 1.0 en concreto de peso normal; en concreto liviano no mayor de 0.75 a menos que se
 * especifique fct (C.8.6.1), caso en que λ = fct/(0.56√f′c) ≤ 1.0.
 */
export function lambdaDesarrollo(tipo: TipoConcreto, fct?: number, fc?: number): number {
  if (tipo === 'normal') return 1;
  if (fct !== undefined && fc !== undefined) return lambdaPorHendimiento(fct, fc);
  return LAMBDA_LIVIANO_MAX;
}

/** ψt (C.12.2.4(a)): 1.3 con más de 300 mm de concreto fresco bajo el refuerzo horizontal; 1.0 en los demás casos. */
export function psiT(concretoFrescoDebajoMm: number): number {
  return concretoFrescoDebajoMm > PSI_T.umbralConcretoFrescoMm ? PSI_T.masDe300mmDebajo : PSI_T.otros;
}

export interface EntradaPsiE {
  epoxico: boolean;
  /** Recubrimiento libre (mm); requerido si es epóxico. */
  recubrimientoLibre?: number;
  /** Separación libre entre barras (mm); requerida si es epóxico. */
  separacionLibre?: number;
  db: number;
}

/**
 * ψe (C.12.2.4(b)): 1.5 para epóxico con recubrimiento < 3db o separación libre < 6db; 1.2 para las demás barras con
 * epóxico; 1.0 sin recubrimiento o galvanizado.
 */
export function psiE(e: EntradaPsiE): number {
  if (!e.epoxico) return PSI_E.sinEpoxico;
  const recSmall = e.recubrimientoLibre !== undefined && e.recubrimientoLibre < PSI_E.recubrimientoLimiteDb * e.db;
  const sepSmall = e.separacionLibre !== undefined && e.separacionLibre < PSI_E.separacionLimiteDb * e.db;
  return recSmall || sepSmall ? PSI_E.epoxicoRecubrimientoOSeparacionPequenos : PSI_E.epoxicoOtros;
}

/** Producto ψt·ψe, que no necesita exceder 1.7 (C.12.2.4(b), PDF p.410, C-108). */
export function psiTPsiE(pT: number, pE: number): number {
  return Math.min(pT * pE, PSI_E.productoMaximoPsiTPsiE);
}

/** ψs (C.12.2.4(c)): 0.8 para No. 6 (20M) y menores y alambres corrugados; 1.0 para No. 7 (22M) y mayores. */
export function psiS(db: number): number {
  return db <= FRONTERA_TAMANO_DB_MM ? PSI_S.pequenas : PSI_S.grandes;
}

/** True si la barra es "No. 6 (20M) y menor" (columna izquierda de la tabla de C.12.2.2). */
export function esBarraPequena(db: number): boolean {
  return db <= FRONTERA_TAMANO_DB_MM;
}

// ---------------------------------------------------------------------------------------------
// Parámetros de confinamiento (C.12.2.3)
// ---------------------------------------------------------------------------------------------

/**
 * cb: la menor de (a) la distancia del centro de la barra a la superficie de concreto más cercana y (b) la mitad de la
 * separación centro a centro de las barras que se desarrollan (notación C.2, PDF p.309, C-7).
 */
export function cbBarra(distanciaCentroASuperficie: number, separacionCentroACentro?: number): number {
  return separacionCentroACentro === undefined ? distanciaCentroASuperficie : Math.min(distanciaCentroASuperficie, separacionCentroACentro / 2);
}

/**
 * cb calculado desde el recubrimiento libre y la separación libre (CRITERIO PROPIO, geometría): distancia al centro
 * = recubrimiento libre + db/2; separación centro a centro = separación libre + db.
 */
export function cbDesdeLibres(recubrimientoLibre: number, separacionLibre: number | undefined, db: number): number {
  return cbBarra(recubrimientoLibre + db / 2, separacionLibre === undefined ? undefined : separacionLibre + db);
}

/** Ecuación C.12-2: Ktr = 40 Atr / (s n) (mm). n = barras que se empalman o desarrollan en el plano de hendimiento. */
export function ktr(atr: number, s: number, n: number): number {
  exigirPositivo('s', s);
  exigirPositivo('n', n);
  return (KTR_CONSTANTE * atr) / (s * n);
}

/** Término (cb + Ktr)/db limitado a 2.5 (C.12.2.3). */
export function terminoConfinamiento(cb: number, ktrMm: number, db: number): number {
  exigirPositivo('db', db);
  return Math.min((cb + ktrMm) / db, CB_KTR_DB_MAX);
}

// ---------------------------------------------------------------------------------------------
// C.12.2 — ℓd en tracción
// ---------------------------------------------------------------------------------------------

export interface EntradaLd {
  /** fy (MPa). */
  fy: number;
  /** f′c (MPa). */
  fc: number;
  /** db (mm). */
  db: number;
  /** λ (por defecto 1.0). */
  lambda?: number;
  /** ψt (por defecto 1.0). */
  psiT?: number;
  /** ψe (por defecto 1.0). */
  psiE?: number;
}

export interface OpcionesLd {
  /**
   * Para calcular el ℓd base de un empalme (C.12.15.1): sin el mínimo de 300 mm de C.12.2.1 ni el factor de refuerzo en
   * exceso de C.12.2.5.
   */
  paraEmpalme?: boolean;
  /** As requerida / As suministrada (C.12.2.5), ≤ 1. Solo aplica si no es para empalme. */
  relacionAs?: number;
}

export interface ResultadoLd {
  /** ℓd antes de aplicar mínimo y reducciones (mm). */
  ldBruto: number;
  /** ℓd final (mm). */
  ld: number;
  /** ℓd/db final. */
  ldSobreDb: number;
  /** True si el mínimo de 300 mm gobernó. */
  minimoAplicado: boolean;
  /** Producto ψtψe usado (limitado a 1.7). */
  psiTE: number;
  /** ψs (solo en la ecuación C.12-1; en la tabla ya está incluido en los divisores). */
  psiS: number | null;
  /** Divisor de la tabla de C.12.2.2 (2.1, 1.7, 1.4 o 1.1) o null si se usó la ecuación C.12-1. */
  divisorTabla: number | null;
  /** (cb + Ktr)/db limitado (solo ecuación C.12-1). */
  terminoConfinamiento: number | null;
  /** True si (cb+Ktr)/db se limitó a 2.5. */
  confinamientoLimitado: boolean;
  /** True si √f′c se limitó a 8.3 MPa. */
  raizLimitada: boolean;
}

function acabarLd(
  ldBruto: number,
  db: number,
  opciones: OpcionesLd | undefined,
  resto: Omit<ResultadoLd, 'ldBruto' | 'ld' | 'ldSobreDb' | 'minimoAplicado'>,
): ResultadoLd {
  const paraEmpalme = opciones?.paraEmpalme ?? false;
  const relacion = paraEmpalme ? 1 : Math.min(opciones?.relacionAs ?? 1, 1);
  const reducido = ldBruto * relacion;
  const ld = paraEmpalme ? reducido : Math.max(reducido, MINIMOS.ldTraccion);
  return { ldBruto, ld, ldSobreDb: ld / db, minimoAplicado: !paraEmpalme && reducido < MINIMOS.ldTraccion, ...resto };
}

/** Divisor de la tabla de C.12.2.2 según el tamaño de la barra y las condiciones de espaciamiento y recubrimiento. */
export function divisorTablaC122(db: number, espaciamientoAdecuado: boolean): number {
  const fila = TABLA_C122.find((f) => f.id === (espaciamientoAdecuado ? 'espaciamiento-adecuado' : 'otros-casos'))!;
  return esBarraPequena(db) ? fila.pequenas : fila.grandes;
}

/**
 * True si se cumple la primera fila de la tabla de C.12.2.2: espaciamiento libre ≥ db, recubrimiento libre ≥ db y estribos
 * ≥ mínimo a lo largo de ℓd, o espaciamiento libre ≥ 2db y recubrimiento libre ≥ db.
 */
export function espaciamientoAdecuadoC122(separacionLibre: number, recubrimientoLibre: number, db: number, estribosMinimos: boolean): boolean {
  const cubreEstribos = separacionLibre >= db && recubrimientoLibre >= db && estribosMinimos;
  const cubreSeparacion = separacionLibre >= 2 * db && recubrimientoLibre >= db;
  return cubreEstribos || cubreSeparacion;
}

/**
 * ℓd con la tabla de C.12.2.2: ℓd = ( fy ψt ψe / (c λ √f′c) ) db, c = 2.1 / 1.7 (espaciamiento adecuado) ó 1.4 / 1.1 (otros casos)
 * para barras No. 6 (20M) y menores / No. 7 (22M) y mayores. Mínimo 300 mm (C.12.2.1).
 * λ solo en el denominador en las cuatro celdas (ver errata de la tabla en el capítulo).
 */
export function ldTablaC122(e: EntradaLd & { espaciamientoAdecuado: boolean }, opciones?: OpcionesLd): ResultadoLd {
  exigirPositivo('fy', e.fy);
  exigirPositivo('db', e.db);
  const lambda = e.lambda ?? 1;
  exigirPositivo('λ', lambda);
  const pTE = psiTPsiE(e.psiT ?? 1, e.psiE ?? 1);
  const divisor = divisorTablaC122(e.db, e.espaciamientoAdecuado);
  const ldBruto = ((e.fy * pTE) / (divisor * lambda * raizFcDesarrollo(e.fc))) * e.db;
  return acabarLd(ldBruto, e.db, opciones, {
    psiTE: pTE,
    psiS: null,
    divisorTabla: divisor,
    terminoConfinamiento: null,
    confinamientoLimitado: false,
    raizLimitada: fcExcedeLimiteRaiz(e.fc),
  });
}

/**
 * ℓd con la Ecuación C.12-1: ℓd = ( fy ψt ψe ψs / ( 1.1 λ √f′c ((cb + Ktr)/db) ) ) db, con (cb + Ktr)/db ≤ 2.5.
 * `cb` y `ktrMm` en mm (Ktr = 0 es una simplificación permitida aunque haya refuerzo transversal).
 */
export function ldEcuacionC121(e: EntradaLd & { cb: number; ktrMm?: number }, opciones?: OpcionesLd): ResultadoLd {
  exigirPositivo('fy', e.fy);
  exigirPositivo('db', e.db);
  exigirPositivo('cb', e.cb);
  const lambda = e.lambda ?? 1;
  exigirPositivo('λ', lambda);
  const pTE = psiTPsiE(e.psiT ?? 1, e.psiE ?? 1);
  const pS = psiS(e.db);
  const bruto = (e.cb + (e.ktrMm ?? 0)) / e.db;
  const termino = Math.min(bruto, CB_KTR_DB_MAX);
  const ldBruto = ((e.fy * pTE * pS) / (C121_CONSTANTE * lambda * raizFcDesarrollo(e.fc) * termino)) * e.db;
  return acabarLd(ldBruto, e.db, opciones, {
    psiTE: pTE,
    psiS: pS,
    divisorTabla: null,
    terminoConfinamiento: termino,
    confinamientoLimitado: bruto > CB_KTR_DB_MAX,
    raizLimitada: fcExcedeLimiteRaiz(e.fc),
  });
}

/** C.12.4.1: factor de ℓd para cada barra de un paquete de 2 (1.00), 3 (1.20) ó 4 (1.33) barras. */
export function factorPaquete(n: number): number {
  const f = FACTOR_PAQUETE[n];
  if (f === undefined) throw new RangeError('Un paquete tiene 2, 3 ó 4 barras (C.7.6.6)');
  return f;
}

/** C.12.4.2: diámetro de la barra única equivalente de un paquete de n barras iguales, db·√n (área total equivalente). */
export function diametroEquivalentePaquete(db: number, n: number): number {
  return db * Math.sqrt(n);
}

// ---------------------------------------------------------------------------------------------
// C.12.3 — ℓdc en compresión
// ---------------------------------------------------------------------------------------------

export interface EntradaLdc {
  fy: number;
  fc: number;
  db: number;
  lambda?: number;
  /** As requerida / As proporcionada (C.12.3.3(a)). */
  relacionAs?: number;
  /** Confinado por espiral o estribos No. 13 a ≤ 100 mm (C.12.3.3(b)): ×0.75. */
  confinado?: boolean;
}

export interface ResultadoLdc {
  /** Primer término 0.24 fy db/(λ√f′c). */
  termino1: number;
  /** Segundo término 0.043 fy db. */
  termino2: number;
  /** El mayor de ambos. */
  base: number;
  factor: number;
  ldc: number;
  ldcSobreDb: number;
  minimoAplicado: boolean;
}

/** ℓdc = mayor de 0.24 fy/(λ√f′c) db y 0.043 fy db, por los factores de C.12.3.3; mínimo 200 mm (C.12.3.1 y C.12.3.2). */
export function ldcCompresion(e: EntradaLdc): ResultadoLdc {
  exigirPositivo('fy', e.fy);
  exigirPositivo('db', e.db);
  const lambda = e.lambda ?? 1;
  const t1 = (COMPRESION.k1 * e.fy * e.db) / (lambda * raizFcDesarrollo(e.fc));
  const t2 = COMPRESION.k2 * e.fy * e.db;
  const base = Math.max(t1, t2);
  const factor = Math.min(e.relacionAs ?? 1, 1) * (e.confinado ? COMPRESION.factorEspiral : 1);
  const reducido = base * factor;
  const ldc = Math.max(reducido, MINIMOS.ldCompresion);
  return { termino1: t1, termino2: t2, base, factor, ldc, ldcSobreDb: ldc / e.db, minimoAplicado: reducido < MINIMOS.ldCompresion };
}

// ---------------------------------------------------------------------------------------------
// C.12.5 — Ganchos estándar en tracción
// ---------------------------------------------------------------------------------------------

export interface EntradaLdh {
  fy: number;
  fc: number;
  db: number;
  /** λ de C.12.2.4(d) (1.0 en peso normal, 0.75 en liviano). */
  lambda?: number;
  /** ψe (por defecto 1.0, "otros casos" de C.12.5.2). Ver erratas de C.12.5.2 en el capítulo. */
  psiE?: number;
  /** Factor 0.7 de C.12.5.3(a) (recubrimiento lateral ≥ 65 mm y, en 90°, ≥ 50 mm sobre la extensión). */
  recubrimientoSuficiente?: boolean;
  /** Factor 0.8 de C.12.5.3(b) (90°) o (c) (180°): estribos a ≤ 3db a lo largo de ℓdh. */
  estribosConfinan?: boolean;
  /** As requerida / As proporcionada (C.12.5.3(d)). */
  relacionAs?: number;
}

export interface ResultadoLdh {
  /** ℓdh básica 0.24 ψe fy db/(λ√f′c). */
  base: number;
  factor: number;
  ldhBruto: number;
  ldh: number;
  ldhSobreDb: number;
  minimo: number;
  minimoAplicado: boolean;
}

/** ℓdh = ( 0.24 ψe fy / (λ√f′c) ) db por los factores de C.12.5.3; no menor del mayor entre 8db y 150 mm (C.12.5.1 y C.12.5.2). */
export function ldhGancho(e: EntradaLdh): ResultadoLdh {
  exigirPositivo('fy', e.fy);
  exigirPositivo('db', e.db);
  const lambda = e.lambda ?? 1;
  const base = (GANCHO.k * (e.psiE ?? 1) * e.fy * e.db) / (lambda * raizFcDesarrollo(e.fc));
  const fRec = FACTORES_GANCHO.find((f) => f.id === 'recubrimiento')!.factor!;
  const fEst = FACTORES_GANCHO.find((f) => f.id === 'estribos-90')!.factor!;
  const factor = (e.recubrimientoSuficiente ? fRec : 1) * (e.estribosConfinan ? fEst : 1) * Math.min(e.relacionAs ?? 1, 1);
  const bruto = base * factor;
  const minimo = Math.max(MINIMOS.ldhFactorDb * e.db, MINIMOS.ldhMm);
  const ldh = Math.max(bruto, minimo);
  return { base, factor, ldhBruto: bruto, ldh, ldhSobreDb: ldh / e.db, minimo, minimoAplicado: bruto < minimo };
}

// ---------------------------------------------------------------------------------------------
// C.12.6 — Barras con cabeza
// ---------------------------------------------------------------------------------------------

export interface EntradaCabeza {
  fy: number;
  fc: number;
  db: number;
  epoxico?: boolean;
  relacionAs?: number;
}

/** ℓdt = ( 0.19 ψe fy/√f′c ) db con f′c ≤ 40 MPa; ψe = 1.2 con epóxico; mínimo el mayor entre 8db y 150 mm (C.12.6.2). */
export function ldtCabeza(e: EntradaCabeza): { ldt: number; ldtSobreDb: number; minimoAplicado: boolean; fcUsado: number } {
  exigirPositivo('fy', e.fy);
  exigirPositivo('db', e.db);
  const fcUsado = Math.min(e.fc, CABEZA.fcMaxMpa);
  const psi = e.epoxico ? CABEZA.psiEEpoxico : 1;
  const bruto = ((CABEZA.k * psi * e.fy) / Math.sqrt(fcUsado)) * e.db * Math.min(e.relacionAs ?? 1, 1);
  const minimo = Math.max(MINIMOS.ldtFactorDb * e.db, MINIMOS.ldtMm);
  const ldt = Math.max(bruto, minimo);
  return { ldt, ldtSobreDb: ldt / e.db, minimoAplicado: bruto < minimo, fcUsado };
}

export interface CondicionesCabeza {
  fy: number;
  db: number;
  concretoNormal: boolean;
  /** Área de apoyo neta de la cabeza (mm²) y área de la barra (mm²). */
  abrg: number;
  ab: number;
  recubrimientoLibre: number;
  separacionLibre: number;
}

/** Condiciones (a) a (f) de C.12.6.1; devuelve los incumplimientos (lista vacía = todas se cumplen). */
export function incumplimientosCabeza(c: CondicionesCabeza): string[] {
  const m: string[] = [];
  if (c.fy > CABEZA.fyMaxMpa) m.push('C.12.6.1(a): fy no debe exceder 420 MPa');
  if (c.db > CABEZA.dbMaxMm) m.push('C.12.6.1(b): la barra no debe ser mayor de No. 11 (36M)');
  if (!c.concretoNormal) m.push('C.12.6.1(c): el concreto debe ser de peso normal');
  if (c.abrg < CABEZA.areaApoyoMinFactor * c.ab) m.push('C.12.6.1(d): Abrg no debe ser menor que 4Ab');
  if (c.recubrimientoLibre < CABEZA.recubrimientoMinDb * c.db) m.push('C.12.6.1(e): el recubrimiento libre no debe ser menor de 2db');
  if (c.separacionLibre < CABEZA.separacionLibreMinDb * c.db) m.push('C.12.6.1(f): la separación libre entre barras no debe ser menor de 4db');
  return m;
}

// ---------------------------------------------------------------------------------------------
// C.12.7 a C.12.9 — Malla electrosoldada y torones
// ---------------------------------------------------------------------------------------------

/**
 * ψw (C.12.7.2 y C.12.7.3): con al menos un alambre transversal dentro de ℓd y a ≥ 50 mm de la sección crítica,
 * ψw = mayor de (fy − 240)/fy y 5db/sw, sin pasar de 1.0; sin alambres transversales válidos, ψw = 1.0.
 */
export function psiW(fy: number, db: number, sw: number | null): number {
  exigirPositivo('fy', fy);
  if (sw === null) return 1;
  exigirPositivo('sw', sw);
  return Math.min(1, Math.max((fy - MALLA.psiWConstanteMpa) / fy, (MALLA.psiWFactorDbSobreS * db) / sw));
}

/** ℓd de malla de alambre corrugado (C.12.7.1) = ℓd base × ψw, no menor de 200 mm (salvo para empalmes, C.12.18). */
export function ldMallaCorrugada(ldBase: number, psiWValor: number, paraEmpalme = false): number {
  const v = ldBase * psiWValor;
  return paraEmpalme ? v : Math.max(v, MINIMOS.ldMallaCorrugada);
}

/** Ecuación C.12-3: ℓd = 3.3 (Ab/s)(fy/(λ√f′c)) para malla de alambre liso, no menor de 150 mm (salvo empalmes, C.12.19). */
export function ldMallaLisa(ab: number, s: number, fy: number, fc: number, lambda = 1, paraEmpalme = false): number {
  exigirPositivo('s', s);
  const v = MALLA.lisaK * (ab / s) * (fy / (lambda * raizFcDesarrollo(fc)));
  return paraEmpalme ? v : Math.max(v, MINIMOS.ldMallaLisa);
}

/** Ecuación C.12-4: ℓd = (fse/21) db + ((fps − fse)/7) db para torones de siete alambres (fse y fps en MPa). */
export function ldToron(fse: number, fps: number, db: number): number {
  return (fse / TORON.divisorFse) * db + ((fps - fse) / TORON.divisorDelta) * db;
}

// ---------------------------------------------------------------------------------------------
// C.12.10 a C.12.13 — Desarrollo del refuerzo de flexión y del alma
// ---------------------------------------------------------------------------------------------

/** C.12.10.3: extensión mínima más allá del punto donde ya no se necesita el refuerzo = mayor de d y 12db (mm). */
export function extensionMasAllaPuntoCorte(d: number, db: number): number {
  return Math.max(d, FLEXION.extensionDb * db);
}

/** C.12.11.3: ℓa en el punto de inflexión se limita al mayor de d y 12db. */
export function laMaximaInflexion(d: number, db: number): number {
  return Math.max(d, FLEXION.extensionDb * db);
}

export interface EntradaC12113 {
  /** ℓd para fy (mm), según C.12.2. */
  ld: number;
  /** Mn con todo el refuerzo de la sección a fy (kN·m). */
  mn: number;
  /** Vu en la sección (kN). */
  vu: number;
  /** ℓa: longitud embebida más allá del centro del apoyo (o ≤ max(d,12db) en inflexión), mm. */
  la: number;
  /** Extremos del refuerzo confinados por una reacción de compresión (Mn/Vu × 1.3). */
  confinadoPorReaccion?: boolean;
}

/** Ecuación C.12-5: ℓd ≤ Mn/Vu + ℓa. Devuelve el límite (mm) y si se cumple. */
export function verificarC125(e: EntradaC12113): { mnSobreVu: number; limite: number; cumple: boolean } {
  exigirPositivo('Vu', e.vu);
  const mnSobreVu = ((e.mn / e.vu) * 1000) * (e.confinadoPorReaccion ? FLEXION.aumentoMnVuConfinado : 1);
  const limite = mnSobreVu + e.la;
  return { mnSobreVu, limite, cumple: e.ld <= limite };
}

/** Diámetro máximo a fy tal que se cumpla C.12-5 con la ℓd/db dada: db ≤ (Mn/Vu + ℓa)/(ℓd/db). */
export function dbMaximoC125(limite: number, ldSobreDb: number): number {
  return limite / ldSobreDb;
}

/** C.12.10.5.2: área adicional de estribos ≥ 0.41 bw s/fyt (mm²) y separación máxima d/(8βb) (mm). */
export function estribosAdicionalesC12105(bw: number, s: number, fyt: number, d: number, betaB: number): { areaMin: number; sMax: number } {
  exigirPositivo('fyt', fyt);
  exigirPositivo('βb', betaB);
  return { areaMin: (FLEXION.estribosExtraK * bw * s) / fyt, sMax: d / (FLEXION.separacionMaxEstribosDivisor * betaB) };
}

/** C.12.12.3: al menos 1/3 del refuerzo negativo se prolonga más allá del punto de inflexión el mayor de d, 12db y ℓn/16 (mm). */
export function extensionNegativoMasAllaInflexion(d: number, db: number, ln: number): number {
  return Math.max(d, FLEXION.extensionDb * db, ln / FLEXION.divisorLnC12123);
}

/** C.12.13.2.2: longitud embebida del estribo en U entre la mitad de la altura y el extremo del gancho: 0.17 db fyt/(λ√f′c). */
export function embebidoEstriboU(db: number, fyt: number, fc: number, lambda = 1): number {
  return (ALMA.kEstriboU * db * fyt) / (lambda * raizFcDesarrollo(fc));
}

// ---------------------------------------------------------------------------------------------
// C.12.14 a C.12.19 — Empalmes
// ---------------------------------------------------------------------------------------------

export interface EntradaClaseEmpalme {
  /** As proporcionada / As requerida a lo largo del empalme. */
  relacionAsProporcionadaRequerida: number;
  /** Fracción del refuerzo total empalmada dentro de la longitud de empalme requerida (0 a 1). */
  fraccionEmpalmada: number;
}

/** C.12.15.2: Clase B, salvo Clase A si As proporcionada ≥ 2 As requerida y se empalma la mitad o menos del refuerzo. */
export function claseEmpalmeTraccion(e: EntradaClaseEmpalme): ClaseEmpalme {
  return e.relacionAsProporcionadaRequerida >= EMPALMES.claseAAreaFactorMin && e.fraccionEmpalmada <= EMPALMES.claseAFraccionMaxEmpalmada ? 'A' : 'B';
}

/**
 * Longitud de empalme por traslapo en tracción (C.12.15.1): Clase A = 1.0 ℓd, Clase B = 1.3 ℓd, no menor de 300 mm,
 * con ℓd calculada para fy SIN el mínimo de 300 mm y SIN el factor de refuerzo en exceso (`paraEmpalme: true`).
 */
export function empalmeTraccion(ldSinMinimoNiExceso: number, clase: ClaseEmpalme): number {
  return Math.max(FACTOR_CLASE_EMPALME[clase] * ldSinMinimoNiExceso, MINIMOS.empalme);
}

/** C.12.15.3: barras de distinto diámetro en tracción: el mayor entre ℓd de la barra mayor y el empalme de la menor. */
export function empalmeTraccionDiametrosDistintos(ldBarraMayor: number, empalmeBarraMenor: number): number {
  return Math.max(ldBarraMayor, empalmeBarraMenor);
}

/**
 * Empalme por traslapo en compresión (C.12.16.1): 0.071 fy db (fy ≤ 420 MPa) ó (0.13 fy − 24) db (fy > 420 MPa),
 * mínimo 300 mm; con f′c < 21 MPa se incrementa en 1/3.
 */
export function empalmeCompresion(fy: number, fc: number, db: number): { base: number; incrementoFcBajo: boolean; longitud: number; minimoAplicado: boolean } {
  exigirPositivo('fy', fy);
  exigirPositivo('db', db);
  const { k1, k2, resta, fyUmbralMpa, fcUmbralMpa, incrementoFcBajo, minimoMm } = EMPALME_COMPRESION;
  const base = (fy <= fyUmbralMpa ? k1 * fy : k2 * fy - resta) * db;
  const incrementa = fc < fcUmbralMpa;
  const bruto = incrementa ? base * (1 + incrementoFcBajo) : base;
  return { base, incrementoFcBajo: incrementa, longitud: Math.max(bruto, minimoMm), minimoAplicado: bruto < minimoMm };
}

/** C.12.16.2: barras de distinto diámetro en compresión: el mayor entre ℓdc de la barra mayor y el empalme de la menor. */
export function empalmeCompresionDiametrosDistintos(ldcBarraMayor: number, empalmeBarraMenor: number): number {
  return Math.max(ldcBarraMayor, empalmeBarraMenor);
}

/** C.12.17.2.4 y C.12.17.2.5: reducción del traslapo en compresión en columnas con estribos (×0.83) o espiral (×0.75); mínimo 300 mm. */
export function empalmeCompresionColumna(longitudBase: number, confinamiento: 'ninguno' | 'estribos' | 'espiral'): number {
  const f = confinamiento === 'estribos' ? EMPALME_COLUMNAS.factorEstribos : confinamiento === 'espiral' ? EMPALME_COLUMNAS.factorEspiral : 1;
  return Math.max(longitudBase * f, MINIMOS.empalme);
}

/** C.12.17.2.4: área efectiva mínima de estribos en cada dirección: 0.0015 h s (mm²). */
export function areaEstribosMinimaEmpalmeColumna(h: number, s: number): number {
  return EMPALME_COLUMNAS.estribosCuantiaMin * h * s;
}

export interface EntradaEmpalmeColumnaTraccion {
  /** Esfuerzo de tracción en las barras por cargas mayoradas, como fracción de fy (0 a 1). */
  fraccionFy: number;
  /** Fracción de las barras empalmadas en la misma sección (0 a 1). */
  fraccionEmpalmada: number;
  /** Empalmes alternados escalonados una distancia ℓd (C.12.17.2.2). */
  escalonados: boolean;
}

/** C.12.17.2.2 y C.12.17.2.3: clase del empalme por traslapo en tracción en una columna. */
export function claseEmpalmeColumnaTraccion(e: EntradaEmpalmeColumnaTraccion): ClaseEmpalme {
  if (e.fraccionFy > EMPALME_COLUMNAS.fraccionFyTraccion) return 'B';
  return e.fraccionEmpalmada <= 0.5 && e.escalonados ? 'A' : 'B';
}

/** C.12.18.1: traslapo de malla de alambre corrugado = mayor de 1.3 ℓd y 200 mm. */
export function empalmeMallaCorrugada(ld: number): number {
  return Math.max(EMPALMES.mallaCorrugadaFactorLd * ld, EMPALMES.mallaCorrugadaMinMm);
}

/** C.12.19: traslapo de malla de alambre liso (entre alambres transversales extremos). */
export function empalmeMallaLisa(ld: number, sTransversal: number, asProporcionadaAlMenosDoble: boolean): number {
  const factor = EMPALMES.mallaLisaFactorLd * ld;
  return asProporcionadaAlMenosDoble
    ? Math.max(factor, EMPALMES.mallaLisaConExcesoMinMm)
    : Math.max(sTransversal + EMPALMES.mallaLisaSeparacionMasMm, factor, EMPALMES.mallaLisaMinMm);
}

/** C.12.14.2.3: separación transversal máxima entre barras traslapadas sin contacto en flexión: la menor de 1/5 del traslapo y 150 mm. */
export function separacionTransversalMaximaTraslapo(longitudTraslapo: number): number {
  return Math.min(longitudTraslapo * EMPALMES.separacionTransversalFraccion, EMPALMES.separacionTransversalMm);
}
