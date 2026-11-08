/**
 * Capítulo D.10, partes D.10.3 a D.10.6 — Muros confinados: densidad mínima de muros por nivel, unidades de mampostería,
 * esbeltez del muro y requisitos de columnas y vigas de confinamiento (dimensiones, refuerzo mínimo, estribos y ubicación).
 * Lógica pura (sin React) compartida por el capítulo MDX `d10a` y la calculadora `MuroConfinadoRefuerzo`.
 *
 * Constantes en `src/data/muroConfinado.ts` (páginas D-53 a D-57 del PDF, verificadas contra la imagen).
 * Unidades SI: mm, mm², m² (densidad de muros, como la norma), MPa, N (Pu).
 *
 * Marcado «(autoría del proyecto)»: la lista de verificaciones, el criterio del menor diámetro para «N° n ó nM», la
 * lectura «a 100 mm» como «≤ 100 mm», la convención opcional de N que cuenta el propio nivel y la regla de que la
 * cuantía 0.0075 se mantiene en la viga angosta. Los requisitos de resistencia de D.10.7 NO se verifican aquí.
 */
import {
  BLOQUE_HORIZONTAL,
  CINTA_AMARRE,
  COLUMNA_CONFINAMIENTO,
  DIAMETROS_MINIMOS,
  DIVISOR_DENSIDAD_MUROS,
  ESBELTEZ_MAX_MURO_CONFINADO,
  ESPESOR_MIN_MURO_CONFINADO,
  FC_MIN_CONFINAMIENTO,
  TABLA_D10_3_1,
  VIGA_CONFINAMIENTO,
  type TipoUnidadConfinada,
} from '../../data/muroConfinado';
import { buscarBarra } from '../../data/refuerzoDetalles';

/* =============================================================================================
 * Verificación genérica
 * ========================================================================================== */

/** Resultado de una verificación individual (cumple = null si no aplica o no hay dato). */
export interface Verif {
  id: string;
  /** Sección de la norma. */
  norma: string;
  descripcion: string;
  /** Texto del valor exigido (con unidades). */
  requerido: string;
  /** Texto del valor provisto (con unidades). */
  provisto: string;
  cumple: boolean | null;
}

const num = (x: number, d = 0) => x.toFixed(d);

function verif(id: string, norma: string, descripcion: string, requerido: string, provisto: string, cumple: boolean | null): Verif {
  return { id, norma, descripcion, requerido, provisto, cumple };
}

/** Todas las verificaciones aplicables cumplen (las no aplicables, cumple = null, se ignoran). */
export function todasCumplen(v: readonly Verif[]): boolean {
  return v.every((x) => x.cumple !== false);
}

/* =============================================================================================
 * D.10.3.4 — Densidad mínima de muros por nivel (Ec. D.10.3-1)
 * ========================================================================================== */

/**
 * Convención para N en la Ec. D.10.3-1.
 * - `literal`: N = número de niveles por encima del nivel considerado (D.10.0, D-53). En el último nivel N = 0 y la
 *   ecuación da Am = 0.
 * - `incluye-nivel`: N = niveles por encima + 1 (cuenta también el nivel considerado). Es una lectura alternativa
 *   **(autoría del proyecto)**, no texto de la norma.
 */
export type ConvencionN = 'literal' | 'incluye-nivel';

/** Valor de N que entra a la ecuación, dado el número de niveles por encima del nivel considerado. */
export function nEfectivo(nivelesArriba: number, convencion: ConvencionN = 'literal'): number {
  return convencion === 'incluye-nivel' ? nivelesArriba + 1 : nivelesArriba;
}

/**
 * Área mínima de muros confinados por nivel y dirección, Ec. D.10.3-1: Am ≥ N·Aa·Ap / 20 (D.10.3.4, D-55).
 * @param N niveles por encima del nivel considerado (ver `ConvencionN`).
 * @param Aa coeficiente de aceleración pico efectiva (Título A).
 * @param Ap área del piso del nivel considerado, m².
 * @returns Am mínima, m² (incluye las columnas de confinamiento).
 */
export function areaMinimaMuros(N: number, Aa: number, Ap: number): number {
  return (N * Aa * Ap) / DIVISOR_DENSIDAD_MUROS;
}

/** Área de muros de una dirección, m²: Σ longitud (m) × espesor (mm / 1000). Incluye las columnas (D.10.0, Am). */
export function areaMuros(muros: readonly { longitud: number; espesor: number }[]): number {
  return muros.reduce((s, m) => s + (m.longitud * m.espesor) / 1000, 0);
}

export interface ResultadoDensidad {
  N: number;
  Amin: number;
  Am: number;
  cumple: boolean;
  /** Am / Amin (Infinity si Amin = 0). */
  razon: number;
  /** Densidad provista Am/Ap. */
  densidad: number;
  /** Densidad mínima Amin/Ap = N·Aa/20. */
  densidadMin: number;
}

/** Verifica Am ≥ N·Aa·Ap/20 para un nivel y una dirección. */
export function verificarDensidad(p: { nivelesArriba: number; Aa: number; Ap: number; Am: number; convencion?: ConvencionN }): ResultadoDensidad {
  const N = nEfectivo(p.nivelesArriba, p.convencion);
  const Amin = areaMinimaMuros(N, p.Aa, p.Ap);
  return {
    N,
    Amin,
    Am: p.Am,
    cumple: p.Am >= Amin - 1e-12,
    razon: Amin > 0 ? p.Am / Amin : Infinity,
    densidad: p.Ap > 0 ? p.Am / p.Ap : NaN,
    densidadMin: p.Ap > 0 ? Amin / p.Ap : NaN,
  };
}

export interface FilaNivel extends ResultadoDensidad {
  /** Nivel contado desde la base (1 = primer piso). */
  nivel: number;
  nivelesArriba: number;
}

/**
 * Tabla por nivel: para una edificación de `pisos` niveles con el mismo Ap y la misma Am en cada nivel, el nivel k (desde
 * la base) tiene `pisos − k` niveles por encima. Devuelve de la base hacia la cubierta.
 */
export function densidadPorNivel(p: { pisos: number; Aa: number; Ap: number; Am: number; convencion?: ConvencionN }): FilaNivel[] {
  const filas: FilaNivel[] = [];
  for (let k = 1; k <= p.pisos; k++) {
    const nivelesArriba = p.pisos - k;
    filas.push({ nivel: k, nivelesArriba, ...verificarDensidad({ nivelesArriba, Aa: p.Aa, Ap: p.Ap, Am: p.Am, convencion: p.convencion }) });
  }
  return filas;
}

/* =============================================================================================
 * D.10.3.2 y D.10.3.3 — Unidades y muro
 * ========================================================================================== */

/** f′cu mínima de la Tabla D.10.3-1 para el tipo de unidad (MPa). */
export function resistenciaMinimaUnidad(tipo: TipoUnidadConfinada): number {
  const fila = TABLA_D10_3_1.find((f) => f.id === tipo);
  if (!fila) throw new Error(`Tipo de unidad desconocido: ${tipo}`);
  return fila.fcuMin;
}

/**
 * ¿Se permite el bloque de perforación horizontal de arcilla en este piso? (D.10.3.2.2): en edificaciones de uno y dos
 * pisos, y en los dos pisos superiores de las de más de dos.
 * @param pisosTotales número de pisos de la edificación.
 * @param nivelDesdeArriba 1 = piso superior.
 */
export function bloqueHorizontalPermitido(pisosTotales: number, nivelDesdeArriba: number): boolean {
  return pisosTotales <= BLOQUE_HORIZONTAL.pisosEdificioPermitido || nivelDesdeArriba <= BLOQUE_HORIZONTAL.pisosSuperiores;
}

export interface DatosMuroConfinado {
  tipoUnidad: TipoUnidadConfinada;
  /** f′cu de la unidad, MPa. */
  fcu: number;
  /** Espesor nominal del muro, mm. */
  espesor: number;
  /** Altura libre del muro, mm. */
  alturaLibre: number;
  pisosTotales?: number;
  /** 1 = piso superior. */
  nivelDesdeArriba?: number;
  /** Pu actuante sobre el muro, N (solo bloque de perforación horizontal). */
  Pu?: number;
  /** Ae, mm². */
  Ae?: number;
  /** f′m, MPa. */
  fm?: number;
}

/** Verificaciones de D.10.3.2.1, D.10.3.2.2 y D.10.3.3. */
export function verificarMuroUnidades(d: DatosMuroConfinado): Verif[] {
  const out: Verif[] = [];
  const min = resistenciaMinimaUnidad(d.tipoUnidad);
  out.push(verif('fcu', 'D.10.3.2.1', 'Resistencia de la unidad, Tabla D.10.3-1', `f′cu ≥ ${num(min)} MPa`, `${num(d.fcu, 1)} MPa`, d.fcu >= min));
  const esb = d.alturaLibre / d.espesor;
  out.push(verif('esbeltez', 'D.10.3.3', 'Relación altura libre / espesor', `≤ ${ESBELTEZ_MAX_MURO_CONFINADO}`, num(esb, 1), esb <= ESBELTEZ_MAX_MURO_CONFINADO));
  out.push(verif('espesor', 'D.10.3.3', 'Espesor nominal del muro', `≥ ${ESPESOR_MIN_MURO_CONFINADO} mm`, `${num(d.espesor)} mm`, d.espesor >= ESPESOR_MIN_MURO_CONFINADO));
  if (d.tipoUnidad === 'bloque-horizontal-arcilla') {
    if (d.pisosTotales !== undefined && d.nivelDesdeArriba !== undefined) {
      const ok = bloqueHorizontalPermitido(d.pisosTotales, d.nivelDesdeArriba);
      out.push(verif('perm-horizontal', 'D.10.3.2.2', 'Uso permitido en este piso', 'edificio de 1–2 pisos o uno de los 2 pisos superiores', `piso ${num(d.nivelDesdeArriba)} desde arriba de ${num(d.pisosTotales)}`, ok));
    }
    if (d.Pu !== undefined && d.Ae !== undefined && d.fm !== undefined && d.Ae > 0) {
      const lim = BLOQUE_HORIZONTAL.factorFm * d.fm;
      const sig = d.Pu / d.Ae;
      out.push(verif('pu-ae', 'D.10.3.2.2', 'Esfuerzo axial Pu/Ae', `≤ 0.15 f′m = ${num(lim, 2)} MPa`, `${num(sig, 2)} MPa`, sig <= lim));
    }
  }
  return out;
}

/* =============================================================================================
 * Barras
 * ========================================================================================== */

/** Área total de n barras de la designación dada (mm²) según Tablas C.3.5.3-1 y -2. */
export function areaBarras(n: number, barraId: string): number {
  const b = buscarBarra(barraId);
  if (!b) throw new Error(`Barra desconocida: ${barraId}`);
  return n * b.area;
}

/** Diámetro nominal de la barra (mm). */
export function diametroBarra(barraId: string): number {
  const b = buscarBarra(barraId);
  if (!b) throw new Error(`Barra desconocida: ${barraId}`);
  return b.db;
}

/* =============================================================================================
 * D.10.5.3(c) — Separación máxima de columnas intermedias
 * ========================================================================================== */

export interface SeparacionColumnas {
  porEspesor: number;
  porAlturaVigas: number;
  porTope: number;
  /** Separación máxima admisible: el menor de los tres, mm. */
  max: number;
  rige: 'espesor' | 'altura' | 'tope';
}

/**
 * Separación máxima entre columnas de confinamiento en lugares intermedios (D.10.5.3(c), D-55): el menor de 35 veces el
 * espesor efectivo del muro, 1.5 veces la distancia vertical entre elementos horizontales de confinamiento y 4 m.
 */
export function separacionMaximaColumnas(espesorEfectivo: number, distanciaVerticalVigas: number): SeparacionColumnas {
  const c = COLUMNA_CONFINAMIENTO;
  const porEspesor = c.factorEspesor * espesorEfectivo;
  const porAlturaVigas = c.factorAlturaEntreVigas * distanciaVerticalVigas;
  const porTope = c.separacionTope;
  const max = Math.min(porEspesor, porAlturaVigas, porTope);
  const rige = max === porEspesor ? 'espesor' : max === porAlturaVigas ? 'altura' : 'tope';
  return { porEspesor, porAlturaVigas, porTope, max, rige };
}

/** Distancia vertical libre máxima entre vigas horizontales de confinamiento (D.10.6.3, D-56): 25 veces el espesor del muro. */
export function distanciaMaximaVigas(espesorMuro: number): number {
  return VIGA_CONFINAMIENTO.distanciaVerticalMaxFactor * espesorMuro;
}

/* =============================================================================================
 * Separación y longitud de estribos
 * ========================================================================================== */

/** Separación máxima de estribos de columna o viga (D.10.5.4(b), D.10.6.4(b)): el menor de 1.5 × menor dimensión y 200 mm. */
export function separacionMaximaEstribos(menorDimension: number): number {
  return Math.min(COLUMNA_CONFINAMIENTO.estribosFactorMenorDimension * menorDimension, COLUMNA_CONFINAMIENTO.estribosSeparacionMax);
}

/**
 * Longitud en cada extremo de la columna donde se colocan los estribos de confinamiento (D.10.5.6, D-56): la mayor entre
 * 450 mm, 3 veces la mayor dimensión de la sección y la sexta parte de la luz, mm.
 */
export function longitudZonaConfinada(mayorDimension: number, luz: number): number {
  const z = COLUMNA_CONFINAMIENTO.zonaConfinada;
  return Math.max(z.longitudMin, z.factorMayorDimension * mayorDimension, z.fraccionLuz * luz);
}

/* =============================================================================================
 * D.10.5 — Columnas de confinamiento
 * ========================================================================================== */

export type ZonaSismica = 'alta' | 'intermedia' | 'baja';

export interface DatosColumna {
  /** Dimensión de la columna en la dirección del espesor del muro, mm. */
  ancho: number;
  /** Dimensión de la columna a lo largo del muro, mm. */
  largo: number;
  /** Espesor del muro confinado, mm. */
  espesorMuro: number;
  /** f′c del concreto, MPa. */
  fc: number;
  nBarras: number;
  barraId: string;
  estriboId: string;
  /** Separación de estribos en la zona central, mm. */
  sepEstribos: number;
  zona: ZonaSismica;
  /** Separación de estribos en los extremos (zona confinada), mm; obligatoria en zonas alta e intermedia. */
  sepEstribosExtremo?: number;
  /** Separación horizontal máxima entre ramas del estribo, mm (zonas alta e intermedia). */
  sepRamas?: number;
  /** Luz libre de la columna (entre vigas), mm; para la longitud de la zona confinada. */
  luz?: number;
}

export interface ResultadoElemento {
  Ag: number;
  As: number;
  cuantia: number;
  AsMin: number;
  sepEstribosMax: number;
  longitudZona?: number;
  verificaciones: Verif[];
  cumple: boolean;
}

/** Verificación de una columna de confinamiento (D.10.4.1, D.10.5.2, D.10.5.4 y D.10.5.6). */
export function verificarColumna(d: DatosColumna): ResultadoElemento {
  const c = COLUMNA_CONFINAMIENTO;
  const Ag = d.ancho * d.largo;
  const As = areaBarras(d.nBarras, d.barraId);
  const dbL = diametroBarra(d.barraId);
  const dbE = diametroBarra(d.estriboId);
  const AsMin = c.cuantiaMin * Ag;
  const menor = Math.min(d.ancho, d.largo);
  const mayor = Math.max(d.ancho, d.largo);
  const sMax = separacionMaximaEstribos(menor);
  const v: Verif[] = [];
  v.push(verif('fc', 'D.10.4.1', 'Resistencia del concreto', `f′c ≥ ${FC_MIN_CONFINAMIENTO} MPa`, `${num(d.fc, 1)} MPa`, d.fc >= FC_MIN_CONFINAMIENTO));
  v.push(verif('espesor', 'D.10.5.2.1', 'Espesor igual al del muro', `≥ ${num(d.espesorMuro)} mm`, `${num(d.ancho)} mm`, d.ancho >= d.espesorMuro));
  v.push(verif('area', 'D.10.5.2.2', 'Área de la sección', `≥ ${num(c.areaMin)} mm²`, `${num(Ag)} mm²`, Ag >= c.areaMin));
  v.push(verif('n-barras', 'D.10.5.4(a)', 'Número de barras longitudinales', `≥ ${c.nBarrasMin}`, num(d.nBarras), d.nBarras >= c.nBarrasMin));
  v.push(verif('db-long', 'D.10.5.4(a)', 'Diámetro de las barras longitudinales', `≥ N° 3 ó 10M (${DIAMETROS_MINIMOS.n3_10M} mm)`, `${num(dbL, 1)} mm`, dbL >= DIAMETROS_MINIMOS.n3_10M));
  v.push(verif('cuantia', 'D.10.5.4(a)', 'Cuantía longitudinal As/Ag', `≥ ${c.cuantiaMin} (As ≥ ${num(AsMin, 0)} mm²)`, `${num(As / Ag, 4)} (As = ${num(As, 0)} mm²)`, As >= AsMin));
  v.push(verif('db-estribo', 'D.10.5.4(b)', 'Diámetro del estribo', `≥ N° 2 ó 6M (${DIAMETROS_MINIMOS.n2_6M} mm)`, `${num(dbE, 1)} mm`, dbE >= DIAMETROS_MINIMOS.n2_6M));
  v.push(verif('s-estribo', 'D.10.5.4(b)', 'Separación de estribos en la zona central', `≤ ${num(sMax)} mm (menor de 1.5 × ${num(menor)} y 200)`, `${num(d.sepEstribos)} mm`, d.sepEstribos <= sMax));
  let longitudZona: number | undefined;
  if (d.zona !== 'baja') {
    const z = c.zonaConfinada;
    const se = d.sepEstribosExtremo ?? d.sepEstribos;
    v.push(verif('s-extremo', 'D.10.5.6', 'Separación de estribos de confinamiento en los extremos', `≤ ${z.separacion} mm`, `${num(se)} mm`, se <= z.separacion));
    if (d.sepRamas !== undefined) {
      v.push(verif('ramas', 'D.10.5.6', 'Separación entre ramas del estribo', `≤ ${z.separacionRamasMax} mm`, `${num(d.sepRamas)} mm`, d.sepRamas <= z.separacionRamasMax));
    }
    if (d.luz !== undefined) longitudZona = longitudZonaConfinada(mayor, d.luz);
  }
  return { Ag, As, cuantia: As / Ag, AsMin, sepEstribosMax: sMax, longitudZona, verificaciones: v, cumple: todasCumplen(v) };
}

/* =============================================================================================
 * D.10.6 — Vigas de confinamiento
 * ========================================================================================== */

export interface DatosViga {
  /** Ancho de la viga (en la dirección del espesor del muro), mm. */
  ancho: number;
  /** Altura de la viga, mm. */
  alto: number;
  /** Espesor del muro confinado, mm. */
  espesorMuro: number;
  fc: number;
  nBarras: number;
  barraId: string;
  estriboId: string;
  sepEstribos: number;
  /** El entrepiso es una losa maciza: el refuerzo mínimo pasa a 2 barras N° 4 ó 12M (D.10.6.4(a)). */
  losaMaciza?: boolean;
  /** La viga requiere enchape: el ancho puede reducirse hasta 75 mm si se aumenta la altura (D.10.6.2.2). */
  enchape?: boolean;
  /** Distancia libre vertical entre vigas horizontales, mm (D.10.6.3). */
  distanciaVertical?: number;
}

/** Verificación de una viga de confinamiento o de amarre (D.10.4.1, D.10.6.2, D.10.6.3, D.10.6.4). */
export function verificarViga(d: DatosViga): ResultadoElemento {
  const w = VIGA_CONFINAMIENTO;
  const Ag = d.ancho * d.alto;
  const As = areaBarras(d.nBarras, d.barraId);
  const dbL = diametroBarra(d.barraId);
  const dbE = diametroBarra(d.estriboId);
  const AsMin = w.cuantiaMin * Ag;
  const menor = Math.min(d.ancho, d.alto);
  const sMax = separacionMaximaEstribos(menor);
  const angosta = d.ancho < w.anchoAngosto || d.losaMaciza === true;
  const anchoMin = d.espesorMuro - (d.enchape ? w.reduccionAnchoEnchape : 0);
  const v: Verif[] = [];
  v.push(verif('fc', 'D.10.4.1', 'Resistencia del concreto', `f′c ≥ ${FC_MIN_CONFINAMIENTO} MPa`, `${num(d.fc, 1)} MPa`, d.fc >= FC_MIN_CONFINAMIENTO));
  v.push(verif('espesor', 'D.10.6.2.1', d.enchape ? 'Ancho (reducido hasta 75 mm por enchape)' : 'Espesor igual al del muro', `≥ ${num(anchoMin)} mm`, `${num(d.ancho)} mm`, d.ancho >= anchoMin));
  v.push(verif('area', 'D.10.6.2.2', 'Área de la sección', `≥ ${num(w.areaMin)} mm²`, `${num(Ag)} mm²`, Ag >= w.areaMin));
  if (angosta) {
    v.push(verif('n-barras', 'D.10.6.4(a)', 'Barras longitudinales (ancho < 110 mm o losa maciza)', `≥ ${w.nBarrasAngosta} barras`, num(d.nBarras), d.nBarras >= w.nBarrasAngosta));
    v.push(verif('db-long', 'D.10.6.4(a)', 'Diámetro (ancho < 110 mm o losa maciza)', `≥ N° 4 ó 12M (${DIAMETROS_MINIMOS.n4_12M} mm)`, `${num(dbL, 1)} mm`, dbL >= DIAMETROS_MINIMOS.n4_12M));
  } else {
    v.push(verif('n-barras', 'D.10.6.4(a)', 'Número de barras longitudinales', `≥ ${w.nBarrasMin}`, num(d.nBarras), d.nBarras >= w.nBarrasMin));
    v.push(verif('db-long', 'D.10.6.4(a)', 'Diámetro de las barras longitudinales', `≥ N° 3 ó 10M (${DIAMETROS_MINIMOS.n3_10M} mm)`, `${num(dbL, 1)} mm`, dbL >= DIAMETROS_MINIMOS.n3_10M));
  }
  v.push(verif('cuantia', 'D.10.6.4(a)', 'Cuantía longitudinal As/Ag', `≥ ${w.cuantiaMin} (As ≥ ${num(AsMin, 0)} mm²)`, `${num(As / Ag, 4)} (As = ${num(As, 0)} mm²)`, As >= AsMin));
  v.push(verif('db-estribo', 'D.10.6.4(b)', 'Diámetro del estribo', `≥ N° 2 ó 6M (${DIAMETROS_MINIMOS.n2_6M} mm)`, `${num(dbE, 1)} mm`, dbE >= DIAMETROS_MINIMOS.n2_6M));
  v.push(verif('s-estribo', 'D.10.6.4(b)', 'Separación de estribos', `≤ ${num(sMax)} mm (menor de 1.5 × ${num(menor)} y 200)`, `${num(d.sepEstribos)} mm`, d.sepEstribos <= sMax));
  if (d.distanciaVertical !== undefined) {
    const lim = distanciaMaximaVigas(d.espesorMuro);
    v.push(verif('dist-vertical', 'D.10.6.3', 'Distancia libre vertical entre vigas', `≤ 25 t = ${num(lim)} mm`, `${num(d.distanciaVertical)} mm`, d.distanciaVertical <= lim));
  }
  return { Ag, As, cuantia: As / Ag, AsMin, sepEstribosMax: sMax, verificaciones: v, cumple: todasCumplen(v) };
}

/* =============================================================================================
 * Cinta de amarre — D.10.6.7
 * ========================================================================================== */

/** ¿Cumple una cinta de amarre de concreto reforzado (D.10.6.7(a))? Altura ≥ 100 mm y al menos 2 barras N° 3 ó 10M. */
export function verificarCintaConcreto(p: { altura: number; nBarras: number; barraId: string }): { cumple: boolean; verificaciones: Verif[] } {
  const c = CINTA_AMARRE.concreto;
  const db = diametroBarra(p.barraId);
  const v: Verif[] = [
    verif('alt', 'D.10.6.7(a)', 'Altura de la cinta', `≥ ${c.alturaMin} mm`, `${num(p.altura)} mm`, p.altura >= c.alturaMin),
    verif('n', 'D.10.6.7(a)', 'Barras longitudinales', `≥ ${c.nBarrasMin} de N° 3 ó 10M`, `${num(p.nBarras)} de ${num(db, 1)} mm`, p.nBarras >= c.nBarrasMin && db >= DIAMETROS_MINIMOS.n3_10M),
  ];
  return { cumple: todasCumplen(v), verificaciones: v };
}
