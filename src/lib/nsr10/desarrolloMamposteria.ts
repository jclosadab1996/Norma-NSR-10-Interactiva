/**
 * Desarrollo, empalme, doblamiento del refuerzo y altura de inyección en mampostería estructural
 * (Capítulo D.4 de la NSR-10). Lógica pura, sin dependencias de interfaz.
 *
 * Unidades: db, K, dimensiones en mm; fy y f′m en MPa; alturas de inyección en m.
 * Todo lo marcado «(autoría del proyecto)» es una interpretación o un algoritmo del proyecto, no texto de la norma.
 */
import {
  COLOCACION_REFUERZO,
  DESARROLLO,
  DIAMETROS_REFUERZO_CELDA,
  DIAMETROS_REFUERZO_JUNTA,
  EMPALME,
  FACTOR_EMPALME_MECANICO,
  GANCHOS_ESTANDAR,
  RECUBRIMIENTO_CELDAS,
  RECUBRIMIENTO_JUNTA,
  REFUERZO_MAX_AREA_CAVIDAD,
  TABLA_D421_DOBLAMIENTO,
  TABLA_D422_TOLERANCIAS,
  TABLA_D461_INYECCION,
  type FilaInyeccion,
  type TipoMorteroRelleno,
} from '../../data/refuerzoMamposteria';

// ---------------------------------------------------------------------------------------------
// D.4.2.5 — Longitud de desarrollo y empalme
// ---------------------------------------------------------------------------------------------

export interface EntradaDesarrollo {
  /** Diámetro nominal de la barra db (mm). */
  db: number;
  /** Resistencia a la fluencia fy (MPa). */
  fy: number;
  /** Resistencia a la compresión de la mampostería f′m (MPa). */
  fm: number;
  /** Recubrimiento K medido desde el extremo exterior de la unidad (mm). */
  K: number;
  /** Espaciamiento libre entre empalmes de refuerzo adyacentes (mm), si lo hay: limita K. */
  sLibre?: number;
  /** Barra lisa: ℓd es el doble del de una corrugada (D.4.2.5.2). */
  lisa?: boolean;
}

export type LimiteK = 'dato' | '5db' | 'espaciamiento';

export interface ResultadoDesarrollo {
  /** K efectivo usado en la ecuación (mm): el menor entre K dado, 5 db y el espaciamiento libre. */
  K: number;
  /** Qué valor fijó K. */
  limitadoPor: LimiteK;
  /** √f′m (MPa^½). */
  raizFm: number;
  /** ℓd de la Ec. D.4.2-1 sin aplicar el mínimo de 300 mm (mm), barra corrugada. */
  ldEcuacion: number;
  /** ℓd de barra corrugada con el mínimo de 300 mm (mm). */
  ldCorrugada: number;
  /** Longitud de desarrollo de diseño (mm): ldCorrugada, o su doble si la barra es lisa. */
  ld: number;
  /** El mínimo de 300 mm gobernó sobre la ecuación. */
  gobiernaMinimo: boolean;
  /** ℓd/db. */
  relacionDb: number;
}

/** K efectivo: «no debe exceder el espaciamiento libre entre empalmes adyacentes ni 5 db» (D.4.2.5.2, D-23). */
export function kEfectivo(K: number, db: number, sLibre?: number): { K: number; limitadoPor: LimiteK } {
  let k = K;
  let por: LimiteK = 'dato';
  const tope = DESARROLLO.kMaxDb * db;
  if (k > tope) {
    k = tope;
    por = '5db';
  }
  if (sLibre !== undefined && Number.isFinite(sLibre) && sLibre > 0 && k > sLibre) {
    k = sLibre;
    por = 'espaciamiento';
  }
  return { K: k, limitadoPor: por };
}

/**
 * Ec. D.4.2-1:  ℓd = 1.5 db² fy / (K √f′m) ≥ 300 mm, con K limitado a 5 db y al espaciamiento libre.
 * Barra lisa: doble del valor de la corrugada (D.4.2.5.2). El «doble» se aplica al valor ya con el mínimo
 * de 300 mm (interpretación del proyecto: la norma dice «el doble de la obtenida para barras corrugadas»).
 */
export function longitudDesarrollo(e: EntradaDesarrollo): ResultadoDesarrollo {
  const { K, limitadoPor } = kEfectivo(e.K, e.db, e.sLibre);
  const raizFm = Math.sqrt(e.fm);
  const ldEcuacion = (DESARROLLO.coeficiente * e.db * e.db * e.fy) / (K * raizFm);
  const ldCorrugada = Math.max(ldEcuacion, DESARROLLO.minimoMm);
  const ld = e.lisa ? DESARROLLO.factorBarraLisa * ldCorrugada : ldCorrugada;
  return {
    K,
    limitadoPor,
    raizFm,
    ldEcuacion,
    ldCorrugada,
    ld,
    gobiernaMinimo: ldEcuacion < DESARROLLO.minimoMm,
    relacionDb: ld / e.db,
  };
}

/** D.4.2.5.3: la longitud de empalme por traslapo es igual a la longitud de desarrollo. */
export function longitudEmpalme(ld: number): number {
  return EMPALME.factorLd * ld;
}

/** D.4.2.5.3: separación transversal máxima de barras traslapadas sin contacto: menor de ℓ/5 y 200 mm. */
export function separacionMaximaEmpalme(lEmpalme: number): { valor: number; gobierna: 'quinta-parte' | '200mm' } {
  const quinta = EMPALME.fraccionSeparacion * lEmpalme;
  return quinta <= EMPALME.separacionMaximaMm ? { valor: quinta, gobierna: 'quinta-parte' } : { valor: EMPALME.separacionMaximaMm, gobierna: '200mm' };
}

/** D.4.2.5.4: resistencia mínima de un empalme mecánico o soldado, 1.25 fy (MPa). */
export function resistenciaEmpalmeMecanico(fy: number): number {
  return FACTOR_EMPALME_MECANICO * fy;
}

// ---------------------------------------------------------------------------------------------
// D.4.2.7 y D.4.2.8 — Ganchos estándar y diámetro de doblamiento
// ---------------------------------------------------------------------------------------------

export interface ResultadoGancho {
  id: '180' | '90' | '135';
  angulo: number;
  /** Extensión recta mínima en el extremo libre (mm). */
  extension: number;
  /** La extensión mínima absoluta (64 mm) gobierna sobre el múltiplo de db. */
  gobiernaMinimoAbsoluto: boolean;
}

/** D.4.2.7: extensión recta del gancho estándar de 180° (4 db y no menos de 64 mm), 90° (12 db) y 135° (6 db). */
export function ganchoEstandar(db: number, angulo: 180 | 90 | 135): ResultadoGancho {
  const g = GANCHOS_ESTANDAR.find((x) => x.angulo === angulo)!;
  const porDb = g.extensionDb * db;
  const min = g.extensionMinMm ?? 0;
  return { id: g.id, angulo, extension: Math.max(porDb, min), gobiernaMinimoAbsoluto: porDb < min };
}

export interface ResultadoDoblamiento {
  /** Factor del diámetro mínimo de doblamiento (en múltiplos de db), o null si la barra no está cubierta por la tabla. */
  factorDb: number | null;
  /** Diámetro mínimo de doblamiento, medido por el lado interior de la barra (mm), o null. */
  diametro: number | null;
  /** Fila de la Tabla D.4.2-1 aplicada. */
  filaFy: number | null;
  /** Explicación cuando la tabla no cubre el caso o se interpoló/asimiló a una fila. */
  aviso?: string;
}

/**
 * Tabla D.4.2-1. La tabla solo da las filas fy = 240 MPa (5 db, N° 3 a N° 7) y fy = 420 MPa (6 db, N° 3 a N° 8).
 * Criterio del proyecto para valores intermedios: fy ≤ 240 usa la fila de 240; 240 < fy ≤ 420 usa la fila de 420
 * (lado conservador, 6 db); fy > 420 queda fuera de la tabla.
 */
export function diametroDoblamiento(db: number, fy: number): ResultadoDoblamiento {
  if (!(db > 0) || !(fy > 0)) return { factorDb: null, diametro: null, filaFy: null, aviso: 'Datos no válidos.' };
  const fila240 = TABLA_D421_DOBLAMIENTO[0];
  const fila420 = TABLA_D421_DOBLAMIENTO[1];
  if (fy > fila420.fy) return { factorDb: null, diametro: null, filaFy: null, aviso: 'fy mayor de 420 MPa: la Tabla D.4.2-1 no cubre el caso.' };
  const fila = fy <= fila240.fy ? fila240 : fila420;
  if (db < fila.dbMinMm - 0.5 || db > fila.dbMaxMm + 1e-9) {
    return { factorDb: null, diametro: null, filaFy: fila.fy, aviso: `La fila de fy = ${fila.fy} MPa solo cubre ${fila.rango}.` };
  }
  const aviso = fy !== fila.fy ? `fy = ${fy} MPa no es una fila de la tabla: se usa la fila de ${fila.fy} MPa (criterio del proyecto).` : undefined;
  return { factorDb: fila.factorDb, diametro: fila.factorDb * db, filaFy: fila.fy, aviso };
}

// ---------------------------------------------------------------------------------------------
// D.4.2.2 – D.4.2.4 — Diámetros, número de barras, mortero alrededor de la barra y recubrimientos
// ---------------------------------------------------------------------------------------------

export interface EntradaCelda {
  /** Diámetro de la barra db (mm). */
  db: number;
  /** Espesor nominal del muro (mm). */
  espesorMuro: number;
  /** Menor dimensión libre de la celda (mm). */
  celdaMenor: number;
  /** Mortero de relleno. */
  mortero: TipoMorteroRelleno;
}

export interface ResultadoCelda {
  /** Diámetro máximo por espesor de muro (D.4.2.2.1 b o c), mm. */
  dbMaxMuro: number;
  /** Diámetro máximo por 1/3 de la celda (D.4.2.2.1 d), mm. */
  dbMaxCelda: number;
  /** Diámetro máximo gobernante (mm). */
  dbMax: number;
  cumpleMinimo: boolean;
  cumpleMaximoMuro: boolean;
  cumpleMaximoCelda: boolean;
  /** Número máximo de barras verticales por celda (D.4.2.3.1): 1 o 2 si la celda es > 140 mm y db ≤ 16 mm. */
  barrasPorCeldaMax: 1 | 2;
  /** Espesor de mortero entre la barra (centrada en la celda) y la unidad (mm). Autoría del proyecto. */
  morteroAlrededor: number;
  /** Espesor mínimo exigido para el mortero elegido (D.4.2.3.3), mm. */
  morteroMinimo: number;
  cumpleMortero: boolean;
  cumple: boolean;
}

/** Verificación de una barra vertical dentro de una celda inyectada (D.4.2.2.1, D.4.2.3.1 y D.4.2.3.3). */
export function verificarBarraEnCelda(e: EntradaCelda): ResultadoCelda {
  const D = DIAMETROS_REFUERZO_CELDA;
  const dbMaxMuro = e.espesorMuro >= D.espesorUmbralMm ? D.maximoMuroGruesoMm : D.maximoMuroDelgadoMm;
  const dbMaxCelda = D.fraccionCelda * e.celdaMenor;
  const dbMax = Math.min(dbMaxMuro, dbMaxCelda);
  const morteroMinimo = COLOCACION_REFUERZO.morteroEntreBarraYUnidadMm[e.mortero];
  const morteroAlrededor = (e.celdaMenor - e.db) / 2;
  const cumpleMinimo = e.db >= D.minimoMm - 1e-9;
  const cumpleMaximoMuro = e.db <= dbMaxMuro + 1e-9;
  const cumpleMaximoCelda = e.db <= dbMaxCelda + 1e-9;
  const cumpleMortero = morteroAlrededor >= morteroMinimo - 1e-9;
  const dosBarras = e.celdaMenor > COLOCACION_REFUERZO.celdaDosBarrasMm && e.db <= COLOCACION_REFUERZO.dbMaxDosBarrasMm + 1e-9;
  return {
    dbMaxMuro,
    dbMaxCelda,
    dbMax,
    cumpleMinimo,
    cumpleMaximoMuro,
    cumpleMaximoCelda,
    barrasPorCeldaMax: dosBarras ? 2 : 1,
    morteroAlrededor,
    morteroMinimo,
    cumpleMortero,
    cumple: cumpleMinimo && cumpleMaximoMuro && cumpleMaximoCelda && cumpleMortero,
  };
}

/** D.4.2.2.2: intervalo de diámetros del refuerzo de junta para un espesor de mortero de pega dado (mm). */
export function diametroJunta(espesorMortero: number): { minimo: number; maximo: number } {
  return { minimo: DIAMETROS_REFUERZO_JUNTA.minimoMm, maximo: DIAMETROS_REFUERZO_JUNTA.fraccionEspesorMortero * espesorMortero };
}

/** D.4.2.4.1: recubrimiento mínimo de una barra en celda (mm). */
export function recubrimientoMinimoCelda(db: number, expuesta: boolean): number {
  if (!expuesta) return RECUBRIMIENTO_CELDAS.noExpuesta;
  return db > RECUBRIMIENTO_CELDAS.umbralDbMm + 1e-9 ? RECUBRIMIENTO_CELDAS.expuestaBarraGrande : RECUBRIMIENTO_CELDAS.expuestaBarraPequena;
}

/** D.4.2.4.2: recubrimiento mínimo del refuerzo de junta (mm). */
export function recubrimientoMinimoJunta(expuesta: boolean): number {
  return expuesta ? RECUBRIMIENTO_JUNTA.expuesta : RECUBRIMIENTO_JUNTA.noExpuesta;
}

// ---------------------------------------------------------------------------------------------
// D.4.6.3.1 — Altura máxima de inyección (Tabla D.4.6-1)
// ---------------------------------------------------------------------------------------------

function alturaFila(f: FilaInyeccion, mortero: TipoMorteroRelleno): number | null {
  return mortero === 'fino' ? f.fino : f.grueso;
}

/**
 * Altura máxima de inyección (m) para una celda cuyo espacio libre entre rebabas internas es a × b (mm) y un tipo de
 * mortero. La celda cumple una fila si su menor dimensión ≥ la menor requerida y su mayor ≥ la mayor requerida
 * (el orden de a y b no importa). Se toma la fila más exigente que se cumple. Devuelve 0 si la celda no alcanza ni la
 * primera fila admisible para ese mortero (no se debe inyectar por esa vía).
 */
export function alturaMaximaInyeccion(a: number, b: number, mortero: TipoMorteroRelleno): number {
  const menor = Math.min(a, b);
  const mayor = Math.max(a, b);
  let h = 0;
  for (const f of TABLA_D461_INYECCION) {
    const alt = alturaFila(f, mortero);
    if (alt === null) continue;
    if (menor >= f.celda[0] && mayor >= f.celda[1]) h = Math.max(h, alt);
  }
  return h;
}

/** Altura máxima de inyección (m) según la dimensión mínima de la cavidad (mampostería de cavidad reforzada). */
export function alturaMaximaInyeccionCavidad(cavidad: number, mortero: TipoMorteroRelleno): number {
  let h = 0;
  for (const f of TABLA_D461_INYECCION) {
    const alt = alturaFila(f, mortero);
    if (alt === null) continue;
    if (cavidad >= f.cavidad) h = Math.max(h, alt);
  }
  return h;
}

/** Dimensiones mínimas de celda (mm) y de cavidad (mm) exigidas para inyectar una altura dada, o null si la tabla no la admite. */
export function dimensionesMinimasParaAltura(altura: number, mortero: TipoMorteroRelleno): { celda: readonly [number, number]; cavidad: number } | null {
  const candidatas = TABLA_D461_INYECCION.filter((f) => {
    const alt = alturaFila(f, mortero);
    return alt !== null && alt >= altura - 1e-9;
  });
  if (candidatas.length === 0) return null;
  const f = candidatas[0]; // las filas están ordenadas de menor a mayor exigencia
  return { celda: f.celda, cavidad: f.cavidad };
}

/**
 * Número de etapas de inyección para un muro de altura H con una altura máxima por vaciado dada (autoría del proyecto:
 * no es una disposición de la norma; la norma solo fija la altura máxima y el intervalo máximo de 1 hora).
 */
export function etapasInyeccion(alturaMuro: number, alturaMaxima: number): number {
  if (!(alturaMaxima > 0) || !(alturaMuro > 0)) return 0;
  return Math.ceil(alturaMuro / alturaMaxima - 1e-9);
}

/** Nota (3) de la Tabla D.4.6-1: el área del refuerzo no ocupará más del 6 % del área de la cavidad. */
export function cumpleAreaRefuerzoCavidad(areaRefuerzo: number, areaCavidad: number): boolean {
  return areaRefuerzo <= REFUERZO_MAX_AREA_CAVIDAD * areaCavidad + 1e-9;
}

/**
 * Nivel máximo (m) hasta el que puede llegar un vaciado de mortero de relleno de altura máxima `alturaMax` (m), de modo que la
 * junta de vaciado quede al menos 40 mm por debajo de una junta de mortero de pega (D.4.6.3.4). Autoría del proyecto: supone
 * juntas de pega a cada múltiplo de la altura de hilada (hilada = unidad + junta, 200 mm por defecto) medidas desde la base.
 */
export function nivelMaximoVaciado(alturaMax: number, hilada = 200, minimoMm = 40): number {
  const h = alturaMax * 1000;
  const juntaArriba = Math.ceil(h / hilada - 1e-9) * hilada;
  return Math.min(h, juntaArriba - minimoMm) / 1000;
}

/**
 * Tolerancia máxima ± (mm) de las filas 4 a 9 de la Tabla D.4.2-2 para una longitud de muro (m) o un número de pisos:
 * filas 4 a 8: menor entre 2 mm por metro y el máximo de la fila; fila 9: menor entre 6 mm por piso y 20 mm.
 */
export function toleranciaMaxima(fila: number, magnitud: number): number {
  const f = TABLA_D422_TOLERANCIAS.find((x) => x.n === fila);
  if (!f || f.maximoMm === undefined) throw new Error(`La fila ${fila} de la Tabla D.4.2-2 no tiene tolerancia por pendiente`);
  const unidad = fila === 9 ? 6 : f.mmPorMetro ?? 0;
  return Math.min(unidad * magnitud, f.maximoMm);
}
