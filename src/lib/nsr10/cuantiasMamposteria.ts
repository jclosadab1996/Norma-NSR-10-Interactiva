/**
 * Capítulos D.6 a D.9 — Verificación del refuerzo mínimo, las separaciones máximas y los requisitos geométricos y de
 * materiales de los sistemas de mampostería de cavidad reforzada (D.6), reforzada (D.7), parcialmente reforzada (D.8) y no
 * reforzada (D.9). Lógica pura (sin React) compartida por los capítulos MDX y la calculadora `CuantiasMamposteria`.
 *
 * Constantes en `src/data/cuantiasMamposteria.ts` (páginas D-43 a D-52 del PDF, verificadas contra la imagen).
 * Unidades SI: mm, mm², MPa; longitud y altura del muro en m. Las cuantías son adimensionales.
 *
 * Todo lo que no es texto de la norma está marcado "(autoría del proyecto)": la agrupación de las verificaciones, el
 * criterio del menor diámetro equivalente para "N° n ó nM", el uso del límite probable (1 200 mm) donde el PDF imprime
 * 120 mm (posible errata) y la clasificación automática del muro de perforación vertical.
 */
import {
  CAPACIDAD_DISIPACION,
  D6,
  D7,
  D8,
  D9,
  type SistemaMamposteria,
} from '../../data/cuantiasMamposteria';

// ---------------------------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------------------------

/** Una familia de barras: `n` barras de diámetro y área dados cada `sep` mm. Con n = 0 no hay refuerzo. */
export interface Refuerzo {
  /** Diámetro de la barra (mm). */
  diametro: number;
  /** Área de una barra (mm²). */
  area: number;
  /** Separación entre grupos de barras (mm), medida a lo largo del muro (vertical) o de la altura (horizontal). */
  sep: number;
  /** Barras por grupo (p. ej. 2 en una escalerilla de dos alambres). Por defecto 1. */
  n?: number;
}

/** Resultado de una verificación individual. */
export interface Verificacion {
  id: string;
  grupo: 'Geometría' | 'Materiales' | 'Cuantías' | 'Separaciones' | 'Barras mínimas' | 'Conectores' | 'Uso';
  /** Numeral de la norma. */
  seccion: string;
  /** Página impresa. */
  pag: string;
  requisito: string;
  requerido: string;
  provisto: string;
  cumple: boolean;
  nota?: string;
  /** true si el PDF imprime un valor probablemente errado y se evaluó con el valor probable. */
  errata?: boolean;
  /** Si `errata`, resultado con el valor tal como está impreso en el PDF. */
  cumpleValorImpreso?: boolean;
}

export interface ResumenVerificacion {
  total: number;
  cumplen: number;
  incumplen: number;
  todasCumplen: boolean;
}

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------

const f = (x: number, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '—');

/** Área de refuerzo por milímetro de longitud: n·As / sep (mm²/mm). NaN si la separación no es positiva. */
export function areaPorMm(r: Refuerzo): number {
  const n = r.n ?? 1;
  if (n === 0) return 0;
  if (!(r.sep > 0)) return NaN;
  return (n * r.area) / r.sep;
}

/** Cuantía = (n·As / sep) / espesor, evaluada sobre el área bruta (espesor × longitud unitaria). */
export function cuantia(r: Refuerzo, espesor: number): number {
  if (!(espesor > 0)) return NaN;
  return areaPorMm(r) / espesor;
}

/** Cuantía de cavidad: `capas` capas idénticas de barras sobre el área bruta de la cavidad (D.6.3.2(a)). */
export function cuantiaCavidad(r: Refuerzo, capas: number, espesorCavidad: number): number {
  return (capas * areaPorMm({ ...r, n: r.n ?? 1 })) / espesorCavidad;
}

function v(
  base: Omit<Verificacion, 'requerido' | 'provisto' | 'cumple'> & { requerido: string; provisto: string; cumple: boolean },
): Verificacion {
  return base;
}

export function resumir(vs: readonly Verificacion[]): ResumenVerificacion {
  const cumplen = vs.filter((x) => x.cumple).length;
  return { total: vs.length, cumplen, incumplen: vs.length - cumplen, todasCumplen: cumplen === vs.length };
}

// ---------------------------------------------------------------------------------------------
// D.6 — Mampostería de cavidad reforzada
// ---------------------------------------------------------------------------------------------

export interface DatosCavidad {
  /** Espesor real de cada pared lateral (mm); se supone el mismo en las dos. */
  espesorPared: number;
  /** Espesor de la cavidad (mm). */
  espesorCavidad: number;
  /** f′m de las paredes (MPa). */
  fm: number;
  /** Resistencia especificada del material de inyección (mortero de relleno o concreto fluido), MPa. */
  fInyeccion: number;
  /** Capas de refuerzo en la cavidad (1 o 2). */
  capas: 1 | 2;
  /** Fracción del refuerzo total de la cavidad que lleva la capa más cargada (0.5 si las dos capas son iguales). */
  fraccionCapaMayor: number;
  /** Barra vertical de la cavidad (cada capa). */
  verticalCavidad: Refuerzo;
  /** Barra horizontal de la cavidad (cada capa). */
  horizontalCavidad: Refuerzo;
  /** Refuerzo vertical adicional en las paredes laterales (n = 0 si no hay). */
  verticalParedes: Refuerzo;
  /** Refuerzo horizontal en las juntas de las paredes laterales (total de las dos paredes; n = 0 si no hay). */
  horizontalParedes: Refuerzo;
  /** Barras en cada extremo del muro (toda la altura). */
  extremo: { n: number; diametro: number };
  /** Barras horizontales en el remate y en el arranque. */
  remate: { n: number; diametro: number };
  /** ¿El refuerzo vertical de la cavidad ayuda a resistir compresión? (D.6.3.4) */
  contribuyeCompresion: boolean;
  /** Estribos que soportan lateralmente la barra comprimida (solo si contribuyeCompresion). */
  estribo: { diametro: number; sep: number };
  /** Separación de los posicionadores del refuerzo vertical (mm). */
  posicionadorSep: number;
  /** Conectores entre paredes. */
  conector: { tipo: 'cercha' | 'zeta'; diametro: number; sepVertical: number; sepHorizontal: number; pata: number };
}

export interface CuantiasCavidad {
  cavidadVertical: number;
  cavidadHorizontal: number;
  seccionVertical: number;
  seccionHorizontal: number;
  suma: number;
  espesorTotal: number;
}

export function cuantiasCavidad(d: DatosCavidad): CuantiasCavidad {
  const t = 2 * d.espesorPared + d.espesorCavidad;
  const cavV = cuantiaCavidad(d.verticalCavidad, d.capas, d.espesorCavidad);
  const cavH = cuantiaCavidad(d.horizontalCavidad, d.capas, d.espesorCavidad);
  const aV = d.capas * areaPorMm(d.verticalCavidad) + areaPorMm(d.verticalParedes);
  const aH = d.capas * areaPorMm(d.horizontalCavidad) + areaPorMm(d.horizontalParedes);
  const secV = aV / t;
  const secH = aH / t;
  return { cavidadVertical: cavV, cavidadHorizontal: cavH, seccionVertical: secV, seccionHorizontal: secH, suma: secV + secH, espesorTotal: t };
}

export function verificarCavidad(d: DatosCavidad): Verificacion[] {
  const q = cuantiasCavidad(d);
  const out: Verificacion[] = [];
  const dbCav = Math.max(d.verticalCavidad.diametro, d.horizontalCavidad.diametro);

  // Geometría
  out.push(v({ id: 'd6-esp-total', grupo: 'Geometría', seccion: 'D.6.1.3', pag: 'D-43', requisito: 'Espesor real total del muro', requerido: `≥ ${D6.espesorTotalMin} mm`, provisto: `${f(q.espesorTotal)} mm`, cumple: q.espesorTotal >= D6.espesorTotalMin }));
  out.push(v({ id: 'd6-esp-pared', grupo: 'Geometría', seccion: 'D.6.1.3', pag: 'D-43', requisito: 'Espesor real de cada pared lateral', requerido: `≥ ${D6.espesorParedMin} mm`, provisto: `${f(d.espesorPared)} mm`, cumple: d.espesorPared >= D6.espesorParedMin }));
  out.push(v({ id: 'd6-esp-cavidad', grupo: 'Geometría', seccion: 'D.6.1.3', pag: 'D-43', requisito: 'Espesor de la cavidad', requerido: `≥ ${D6.espesorCavidadMin} mm`, provisto: `${f(d.espesorCavidad)} mm`, cumple: d.espesorCavidad >= D6.espesorCavidadMin }));

  // Materiales
  const r = D6.resistencias;
  out.push(v({ id: 'd6-finj', grupo: 'Materiales', seccion: 'D.6.1.6', pag: 'D-43', requisito: 'Resistencia del material de inyección a 28 días', requerido: `≥ ${r.materialInyeccionMin} MPa`, provisto: `${f(d.fInyeccion, 1)} MPa`, cumple: d.fInyeccion >= r.materialInyeccionMin }));
  out.push(v({ id: 'd6-fm-min', grupo: 'Materiales', seccion: 'D.6.1.6', pag: 'D-43', requisito: "f′m de las paredes, límite absoluto", requerido: `≥ ${r.fmMin} MPa`, provisto: `${f(d.fm, 2)} MPa`, cumple: d.fm >= r.fmMin }));
  out.push(v({ id: 'd6-fm-rel', grupo: 'Materiales', seccion: 'D.6.1.6', pag: 'D-43', requisito: "f′m respecto al material de inyección", requerido: `entre ${f(r.fmFraccionMin * d.fInyeccion, 2)} y ${f(r.fmFraccionMax * d.fInyeccion, 2)} MPa (0.5 y 2 veces)`, provisto: `${f(d.fm, 2)} MPa`, cumple: d.fm >= r.fmFraccionMin * d.fInyeccion && d.fm <= r.fmFraccionMax * d.fInyeccion }));

  // Cuantías
  out.push(v({ id: 'd6-rho-cav-v', grupo: 'Cuantías', seccion: 'D.6.3.2(a)', pag: 'D-44', requisito: 'Cuantía vertical sobre el área bruta de la cavidad', requerido: `≥ ${D6.cuantiaCavidad.vertical}`, provisto: f(q.cavidadVertical, 5), cumple: q.cavidadVertical >= D6.cuantiaCavidad.vertical }));
  out.push(v({ id: 'd6-rho-cav-h', grupo: 'Cuantías', seccion: 'D.6.3.2(a)', pag: 'D-44', requisito: 'Cuantía horizontal sobre el área bruta de la cavidad', requerido: `≥ ${D6.cuantiaCavidad.horizontal}`, provisto: f(q.cavidadHorizontal, 5), cumple: q.cavidadHorizontal >= D6.cuantiaCavidad.horizontal }));
  out.push(v({ id: 'd6-rho-sec-v', grupo: 'Cuantías', seccion: 'D.6.3.2(b)', pag: 'D-44', requisito: 'Cuantía vertical total (cavidad + paredes) sobre la sección completa', requerido: `≥ ${D6.cuantiaSeccion.porDireccion}`, provisto: f(q.seccionVertical, 5), cumple: q.seccionVertical >= D6.cuantiaSeccion.porDireccion }));
  out.push(v({ id: 'd6-rho-sec-h', grupo: 'Cuantías', seccion: 'D.6.3.2(b)', pag: 'D-44', requisito: 'Cuantía horizontal total (cavidad + paredes) sobre la sección completa', requerido: `≥ ${D6.cuantiaSeccion.porDireccion}`, provisto: f(q.seccionHorizontal, 5), cumple: q.seccionHorizontal >= D6.cuantiaSeccion.porDireccion }));
  out.push(v({ id: 'd6-rho-suma', grupo: 'Cuantías', seccion: 'D.6.3.2(b)', pag: 'D-44', requisito: 'Suma de cuantías vertical + horizontal (sección completa)', requerido: `≥ ${D6.cuantiaSeccion.suma}`, provisto: f(q.suma, 5), cumple: q.suma >= D6.cuantiaSeccion.suma }));

  // Separaciones
  const s = D6.separacion;
  out.push(v({ id: 'd6-sep-v', grupo: 'Separaciones', seccion: 'D.6.3.2.1', pag: 'D-44', requisito: 'Separación del refuerzo vertical en la cavidad', requerido: `entre ${s.min} y ${s.max} mm`, provisto: `${f(d.verticalCavidad.sep)} mm`, cumple: d.verticalCavidad.sep >= s.min && d.verticalCavidad.sep <= s.max }));
  out.push(v({ id: 'd6-sep-h', grupo: 'Separaciones', seccion: 'D.6.3.2.1', pag: 'D-44', requisito: 'Separación del refuerzo horizontal en la cavidad', requerido: `entre ${s.min} y ${s.max} mm`, provisto: `${f(d.horizontalCavidad.sep)} mm`, cumple: d.horizontalCavidad.sep >= s.min && d.horizontalCavidad.sep <= s.max }));
  const posMax = Math.min(s.posicionadorDiametros * d.verticalCavidad.diametro, s.posicionadorMax);
  out.push(v({ id: 'd6-posicionadores', grupo: 'Separaciones', seccion: 'D.6.3.2.1', pag: 'D-44', requisito: 'Posicionadores del refuerzo vertical', requerido: `≤ ${f(posMax)} mm (menor de 250 ∅ y 3 m)`, provisto: `${f(d.posicionadorSep)} mm`, cumple: d.posicionadorSep <= posMax }));

  // Barras mínimas
  out.push(v({ id: 'd6-extremos', grupo: 'Barras mínimas', seccion: 'D.6.3.3', pag: 'D-44', requisito: 'Barras verticales en cada extremo del muro (toda la altura, ancladas)', requerido: `≥ ${D6.extremos.nBarras} barras de ≥ ${D6.extremos.diametroMin} mm`, provisto: `${d.extremo.n} × ${f(d.extremo.diametro, 1)} mm`, cumple: d.extremo.n >= D6.extremos.nBarras && d.extremo.diametro >= D6.extremos.diametroMin }));
  out.push(v({ id: 'd6-remate', grupo: 'Barras mínimas', seccion: 'D.6.3.3', pag: 'D-44', requisito: 'Barras horizontales en el remate y en el arranque (toda la longitud)', requerido: `≥ ${D6.extremos.nBarras} barras de ≥ ${D6.extremos.diametroMin} mm`, provisto: `${d.remate.n} × ${f(d.remate.diametro, 1)} mm`, cumple: d.remate.n >= D6.extremos.nBarras && d.remate.diametro >= D6.extremos.diametroMin }));
  const c = D6.compresion;
  const diamMinVert = d.contribuyeCompresion ? c.diametroConCompresion : c.diametroSinCompresion;
  out.push(v({ id: 'd6-diam-min', grupo: 'Barras mínimas', seccion: 'D.6.3.4', pag: 'D-44', requisito: d.contribuyeCompresion ? 'Diámetro de la barra vertical que trabaja a compresión' : 'Diámetro de la barra vertical (no trabaja a compresión)', requerido: `≥ ${diamMinVert} mm`, provisto: `${f(d.verticalCavidad.diametro, 1)} mm`, cumple: d.verticalCavidad.diametro >= diamMinVert }));
  if (d.contribuyeCompresion) {
    const sMax = Math.min(c.estriboSepMax, c.estriboSepDiametros * d.verticalCavidad.diametro);
    out.push(v({ id: 'd6-estribo', grupo: 'Separaciones', seccion: 'D.6.3.4', pag: 'D-44', requisito: 'Estribos de soporte lateral de la barra comprimida', requerido: `∅ ≥ ${c.estriboDiametroMin} mm y separación ≤ ${f(sMax, 1)} mm (menor de 200 mm y 16 ∅)`, provisto: `∅ ${f(d.estribo.diametro, 1)} mm a ${f(d.estribo.sep)} mm`, cumple: d.estribo.diametro >= c.estriboDiametroMin && d.estribo.sep <= sMax }));
  }
  const dMax = D6.diametroMaxFraccionCavidad * d.espesorCavidad;
  out.push(v({ id: 'd6-diam-max', grupo: 'Barras mínimas', seccion: 'D.6.3.5', pag: 'D-44', requisito: 'Diámetro máximo de las barras de la cavidad', requerido: `≤ ${f(dMax, 1)} mm (¼ del espesor de la cavidad)`, provisto: `${f(dbCav, 1)} mm`, cumple: dbCav <= dMax, nota: 'El título de D.6.3.5 dice «diámetro mínimo», pero el texto fija un máximo (errata de título).' }));

  // Capas
  if (d.espesorCavidad <= D6.capas.unaCapaHasta) {
    out.push(v({ id: 'd6-capas', grupo: 'Separaciones', seccion: 'D.6.3.6', pag: 'D-44', requisito: 'Capas de refuerzo según el espesor de la cavidad', requerido: `1 capa (cavidad ≤ ${D6.capas.unaCapaHasta} mm)`, provisto: `${d.capas} capa(s)`, cumple: d.capas === 1 }));
  } else {
    out.push(v({ id: 'd6-capas', grupo: 'Separaciones', seccion: 'D.6.3.6', pag: 'D-44', requisito: 'Capas de refuerzo según el espesor de la cavidad', requerido: `2 capas, ninguna con más de ${D6.capas.fraccionMaxPorCapa * 100} % del refuerzo`, provisto: `${d.capas} capa(s); la mayor con ${f(d.fraccionCapaMayor * 100)} %`, cumple: d.capas === 2 && d.fraccionCapaMayor <= D6.capas.fraccionMaxPorCapa }));
  }

  // Conectores
  const k = d.conector;
  const lim = k.tipo === 'zeta' ? D6.conectorZeta : D6.conectores;
  out.push(v({ id: 'd6-conector-diam', grupo: 'Conectores', seccion: 'D.6.1.4', pag: 'D-43', requisito: 'Diámetro de los conectores', requerido: `≥ ${D6.conectores.diametroMin} mm`, provisto: `${f(k.diametro, 1)} mm`, cumple: k.diametro >= D6.conectores.diametroMin }));
  out.push(v({ id: 'd6-conector-sepv', grupo: 'Conectores', seccion: k.tipo === 'zeta' ? 'D.6.1.4.2' : 'D.6.1.4', pag: 'D-43', requisito: `Separación vertical de los conectores (${k.tipo === 'zeta' ? 'en zeta' : 'cercha, escalera o estribo'})`, requerido: `≤ ${lim.sepVerticalMax} mm`, provisto: `${f(k.sepVertical)} mm`, cumple: k.sepVertical <= lim.sepVerticalMax }));
  out.push(v({ id: 'd6-conector-seph', grupo: 'Conectores', seccion: k.tipo === 'zeta' ? 'D.6.1.4.2' : 'D.6.1.4', pag: 'D-43', requisito: 'Separación horizontal de los conectores', requerido: `≤ ${lim.sepHorizontalMax} mm`, provisto: `${f(k.sepHorizontal)} mm`, cumple: k.sepHorizontal <= lim.sepHorizontalMax }));
  if (k.tipo === 'zeta') {
    out.push(v({ id: 'd6-conector-pata', grupo: 'Conectores', seccion: 'D.6.1.4.2', pag: 'D-43', requisito: 'Longitud de la pata del conector en zeta (embebida en el mortero de pega)', requerido: `≥ ${D6.conectorZeta.pataMin} mm`, provisto: `${f(k.pata)} mm`, cumple: k.pata >= D6.conectorZeta.pataMin, nota: 'Solo con paredes de unidades sólidas o de perforación horizontal.' }));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// D.7 y D.8 — Muros de perforación vertical
// ---------------------------------------------------------------------------------------------

export type UbicacionHorizontal = 'juntas' | 'embebido';

export interface DatosBloque {
  /** Espesor nominal del muro (mm), usado también para el área bruta. */
  espesor: number;
  /** f′m (MPa). */
  fm: number;
  /** Longitud del muro (m). */
  longitud: number;
  /** Altura del muro (m). */
  altura: number;
  /** ¿Todas las celdas verticales (también las sin refuerzo) están inyectadas? (D.7.2.1.1) */
  todasCeldasInyectadas: boolean;
  /** Refuerzo vertical: una barra cada `sep` mm. */
  vertical: Refuerzo;
  /** Refuerzo horizontal: `n` barras/alambres por nivel, cada `sep` mm de altura. */
  horizontal: Refuerzo;
  /** Dónde va el refuerzo horizontal: en las juntas de pega o dentro de elementos embebidos (D.4.5.11.2). */
  ubicacionHorizontal: UbicacionHorizontal;
  /** Barras verticales en cada extremo del muro. */
  extremo: { n: number; diametro: number };
  /** Barras horizontales en el remate, el arranque y al nivel de las losas. */
  remate: { n: number; diametro: number };
  /** ¿Hay aberturas interiores mayores de 600 mm? */
  hayAberturas: boolean;
  /** Barra vertical junto a las aberturas (diámetro, mm). */
  aberturaVertical: { n: number; diametro: number };
  /** Barras horizontales arriba y abajo de las aberturas. */
  aberturaHorizontal: { n: number; diametro: number };
}

export interface CuantiasBloque {
  vertical: number;
  horizontal: number;
  suma: number;
  relacionVH: number;
}

export function cuantiasBloque(d: DatosBloque): CuantiasBloque {
  const rv = cuantia(d.vertical, d.espesor);
  const rh = cuantia(d.horizontal, d.espesor);
  return { vertical: rv, horizontal: rh, suma: rv + rh, relacionVH: rh > 0 ? rv / rh : Infinity };
}

export function verificarReforzada(d: DatosBloque): Verificacion[] {
  const q = cuantiasBloque(d);
  const out: Verificacion[] = [];
  const x = D7;
  out.push(v({ id: 'd7-espesor', grupo: 'Geometría', seccion: 'D.7.1.3', pag: 'D-47', requisito: 'Espesor nominal mínimo del muro', requerido: `≥ ${x.espesorNominalMin} mm`, provisto: `${f(d.espesor)} mm`, cumple: d.espesor >= x.espesorNominalMin, nota: 'Además: solo aparejo trabado y sin mortero tipo N (D.7.1.3).' }));
  out.push(v({ id: 'd7-fm', grupo: 'Materiales', seccion: 'D.7.1.4', pag: 'D-47', requisito: "Resistencia f′m de la mampostería", requerido: `entre ${x.fmMin} y ${x.fmMax} MPa`, provisto: `${f(d.fm, 2)} MPa`, cumple: d.fm >= x.fmMin && d.fm <= x.fmMax }));
  out.push(v({ id: 'd7-rho-v', grupo: 'Cuantías', seccion: 'D.7.3.1(a)', pag: 'D-48', requisito: 'Cuantía vertical sobre el área bruta del muro', requerido: `≥ ${x.cuantia.porDireccion}`, provisto: f(q.vertical, 5), cumple: q.vertical >= x.cuantia.porDireccion }));
  out.push(v({ id: 'd7-rho-h', grupo: 'Cuantías', seccion: 'D.7.3.1(a)', pag: 'D-48', requisito: 'Cuantía horizontal sobre el área bruta del muro', requerido: `≥ ${x.cuantia.porDireccion}`, provisto: f(q.horizontal, 5), cumple: q.horizontal >= x.cuantia.porDireccion }));
  out.push(v({ id: 'd7-rho-suma', grupo: 'Cuantías', seccion: 'D.7.3.1(b)', pag: 'D-48', requisito: 'Suma de cuantías horizontal + vertical', requerido: `≥ ${x.cuantia.suma}`, provisto: f(q.suma, 5), cumple: q.suma >= x.cuantia.suma }));
  out.push(v({ id: 'd7-rho-vh', grupo: 'Cuantías', seccion: 'D.7.3.1(c)', pag: 'D-48', requisito: 'Cuantía vertical no menor que la mitad de la horizontal', requerido: `ρv ≥ ${f(x.cuantia.fraccionVerticalDeHorizontal * q.horizontal, 5)} (½ ρh)`, provisto: f(q.vertical, 5), cumple: q.vertical >= x.cuantia.fraccionVerticalDeHorizontal * q.horizontal }));
  out.push(v({ id: 'd7-sep-v', grupo: 'Separaciones', seccion: 'D.7.3.2(a)', pag: 'D-48', requisito: 'Separación horizontal entre barras verticales', requerido: `≤ ${x.vertical.sepMax} mm`, provisto: `${f(d.vertical.sep)} mm`, cumple: d.vertical.sep <= x.vertical.sepMax }));
  out.push(v({ id: 'd7-extremo', grupo: 'Barras mínimas', seccion: 'D.7.3.2(b)', pag: 'D-48', requisito: 'Barra vertical en cada extremo del muro', requerido: `≥ 1 barra de ≥ ${x.vertical.extremoDiametroMin} mm (N° 4 ó 12M)`, provisto: `${d.extremo.n} × ${f(d.extremo.diametro, 1)} mm`, cumple: d.extremo.n >= 1 && d.extremo.diametro >= x.vertical.extremoDiametroMin }));
  if (d.ubicacionHorizontal === 'juntas') {
    out.push(v({ id: 'd7-h-diam', grupo: 'Barras mínimas', seccion: 'D.7.3.3(a)', pag: 'D-48', requisito: 'Diámetro del refuerzo horizontal en las juntas de pega', requerido: `≥ ${x.horizontal.juntaDiametroMin} mm`, provisto: `${f(d.horizontal.diametro, 1)} mm`, cumple: d.horizontal.diametro >= x.horizontal.juntaDiametroMin }));
    out.push(v({ id: 'd7-h-sep', grupo: 'Separaciones', seccion: 'D.7.3.3(a)', pag: 'D-48', requisito: 'Separación vertical del refuerzo horizontal en juntas', requerido: `≤ ${x.horizontal.juntaSepMax} mm`, provisto: `${f(d.horizontal.sep)} mm`, cumple: d.horizontal.sep <= x.horizontal.juntaSepMax }));
  } else {
    out.push(v({ id: 'd7-h-sep-emb', grupo: 'Separaciones', seccion: 'D.7.3.3(b)', pag: 'D-48', requisito: 'Separación vertical del refuerzo horizontal en elementos embebidos (D.4.5.11.2)', requerido: `≤ ${x.horizontal.embebidoSepMaxProbable} mm (el PDF imprime ${x.horizontal.embebidoSepMax} mm)`, provisto: `${f(d.horizontal.sep)} mm`, cumple: d.horizontal.sep <= x.horizontal.embebidoSepMaxProbable, errata: true, cumpleValorImpreso: d.horizontal.sep <= x.horizontal.embebidoSepMax, nota: 'El PDF imprime 120 mm: casi seguro una errata de 1 200 mm (los elementos embebidos son más espaciados que las juntas, 600 mm; en D.8 la relación es 800 mm / 3.00 m). Se evalúa con 1 200 mm y se informa también el resultado con el valor impreso.' }));
  }
  out.push(v({ id: 'd7-remate', grupo: 'Barras mínimas', seccion: 'D.7.3.3(c)', pag: 'D-48', requisito: 'Refuerzo horizontal en remate, arranque y al nivel de losas de entrepiso', requerido: `≥ ${x.horizontal.remateNBarras} barras de ≥ ${x.horizontal.remateDiametroMin} mm (N° 3 ó 10M)`, provisto: `${d.remate.n} × ${f(d.remate.diametro, 1)} mm`, cumple: d.remate.n >= x.horizontal.remateNBarras && d.remate.diametro >= x.horizontal.remateDiametroMin }));
  if (d.hayAberturas) {
    out.push(v({ id: 'd7-ab-v', grupo: 'Barras mínimas', seccion: 'D.7.3.2(c)', pag: 'D-48', requisito: 'Barra vertical continua al lado de aberturas mayores de 600 mm', requerido: `≥ 1 barra de ≥ ${x.vertical.aberturaDiametroMin} mm`, provisto: `${d.aberturaVertical.n} × ${f(d.aberturaVertical.diametro, 1)} mm`, cumple: d.aberturaVertical.n >= 1 && d.aberturaVertical.diametro >= x.vertical.aberturaDiametroMin }));
    out.push(v({ id: 'd7-ab-h', grupo: 'Barras mínimas', seccion: 'D.7.3.3(d)', pag: 'D-48', requisito: 'Refuerzo horizontal arriba y abajo de aberturas mayores de 600 mm (penetra ≥ 600 mm en el muro)', requerido: `≥ ${x.horizontal.remateNBarras} barras de ≥ ${x.horizontal.remateDiametroMin} mm`, provisto: `${d.aberturaHorizontal.n} × ${f(d.aberturaHorizontal.diametro, 1)} mm`, cumple: d.aberturaHorizontal.n >= x.horizontal.remateNBarras && d.aberturaHorizontal.diametro >= x.horizontal.remateDiametroMin }));
  }
  return out;
}

export function verificarParcial(d: DatosBloque): Verificacion[] {
  const q = cuantiasBloque(d);
  const x = D8;
  const out: Verificacion[] = [];
  out.push(v({ id: 'd8-espesor', grupo: 'Geometría', seccion: 'D.8.1.3', pag: 'D-49', requisito: 'Espesor nominal mínimo del muro', requerido: `≥ ${x.espesorNominalMin} mm (salvo Tabla E.3.5-1)`, provisto: `${f(d.espesor)} mm`, cumple: d.espesor >= x.espesorNominalMin, nota: 'No se admite mortero tipo N (D.8.1.3).' }));
  out.push(v({ id: 'd8-fm', grupo: 'Materiales', seccion: 'D.8.1.4', pag: 'D-49', requisito: "Resistencia f′m de la mampostería", requerido: `≥ ${x.fmMin} MPa`, provisto: `${f(d.fm, 2)} MPa`, cumple: d.fm >= x.fmMin }));
  out.push(v({ id: 'd8-rho-v', grupo: 'Cuantías', seccion: 'D.8.3.1', pag: 'D-49', requisito: 'Cuantía vertical (solo refuerzo continuo en el tramo del muro)', requerido: `≥ ${x.cuantiaPorDireccion}`, provisto: f(q.vertical, 5), cumple: q.vertical >= x.cuantiaPorDireccion }));
  out.push(v({ id: 'd8-rho-h', grupo: 'Cuantías', seccion: 'D.8.3.1', pag: 'D-49', requisito: 'Cuantía horizontal (solo refuerzo continuo en el tramo del muro)', requerido: `≥ ${x.cuantiaPorDireccion}`, provisto: f(q.horizontal, 5), cumple: q.horizontal >= x.cuantiaPorDireccion }));
  out.push(v({ id: 'd8-sep-v', grupo: 'Separaciones', seccion: 'D.8.3.2(a)', pag: 'D-49', requisito: 'Separación entre barras verticales', requerido: `≤ ${x.vertical.sepMax} mm (2.40 m)`, provisto: `${f(d.vertical.sep)} mm`, cumple: d.vertical.sep <= x.vertical.sepMax }));
  out.push(v({ id: 'd8-extremo', grupo: 'Barras mínimas', seccion: 'D.8.3.2(b)', pag: 'D-49', requisito: 'Barra vertical en cada extremo del muro', requerido: `≥ 1 barra de ≥ ${x.vertical.extremoDiametroMin} mm (N° 3 ó 10M)`, provisto: `${d.extremo.n} × ${f(d.extremo.diametro, 1)} mm`, cumple: d.extremo.n >= 1 && d.extremo.diametro >= x.vertical.extremoDiametroMin }));
  const limH = d.ubicacionHorizontal === 'juntas' ? x.horizontal.juntaSepMax : x.horizontal.embebidoSepMax;
  out.push(v({ id: 'd8-h-sep', grupo: 'Separaciones', seccion: d.ubicacionHorizontal === 'juntas' ? 'D.8.3.3(a)' : 'D.8.3.3(b)', pag: 'D-49', requisito: d.ubicacionHorizontal === 'juntas' ? 'Separación vertical del refuerzo horizontal en juntas de pega' : 'Separación vertical del refuerzo horizontal en elementos embebidos (D.4.5.11.2)', requerido: `≤ ${limH} mm`, provisto: `${f(d.horizontal.sep)} mm`, cumple: d.horizontal.sep <= limH }));
  out.push(v({ id: 'd8-remate', grupo: 'Barras mínimas', seccion: 'D.8.3.3(c)', pag: 'D-49/D-50', requisito: 'Refuerzo horizontal en remate, arranque y al nivel de losas de entrepiso', requerido: `≥ ${x.horizontal.remateNBarras} barras de ≥ ${x.horizontal.remateDiametroMin} mm (N° 3 ó 10M)`, provisto: `${d.remate.n} × ${f(d.remate.diametro, 1)} mm`, cumple: d.remate.n >= x.horizontal.remateNBarras && d.remate.diametro >= x.horizontal.remateDiametroMin }));
  if (d.hayAberturas) {
    out.push(v({ id: 'd8-ab-v', grupo: 'Barras mínimas', seccion: 'D.8.3.2(c)', pag: 'D-49', requisito: 'Barra vertical continua al lado de aberturas mayores de 600 mm', requerido: `≥ 1 barra de ≥ ${x.vertical.aberturaDiametroMin} mm`, provisto: `${d.aberturaVertical.n} × ${f(d.aberturaVertical.diametro, 1)} mm`, cumple: d.aberturaVertical.n >= 1 && d.aberturaVertical.diametro >= x.vertical.aberturaDiametroMin }));
    out.push(v({ id: 'd8-ab-h', grupo: 'Barras mínimas', seccion: 'D.8.3.3(d)', pag: 'D-50', requisito: 'Refuerzo horizontal arriba y abajo de aberturas mayores de 600 mm', requerido: `≥ ${x.horizontal.remateNBarras} barras de ≥ ${x.horizontal.remateDiametroMin} mm`, provisto: `${d.aberturaHorizontal.n} × ${f(d.aberturaHorizontal.diametro, 1)} mm`, cumple: d.aberturaHorizontal.n >= x.horizontal.remateNBarras && d.aberturaHorizontal.diametro >= x.horizontal.remateDiametroMin, nota: 'La frase de D.8.3.3(d) está cortada en el PDF; se lee como continuación de (c): dos barras N° 3 ó 10M, que penetran ≥ 600 mm.' }));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// D.9 — Mampostería no reforzada
// ---------------------------------------------------------------------------------------------

export function verificarNoReforzada(d: { espesor: number; aa: number }): Verificacion[] {
  return [
    v({ id: 'd9-espesor', grupo: 'Geometría', seccion: 'D.9.1.3', pag: 'D-51', requisito: 'Espesor nominal mínimo del muro', requerido: `≥ ${D9.espesorNominalMin} mm (salvo Tabla E.3.5-1)`, provisto: `${f(d.espesor)} mm`, cumple: d.espesor >= D9.espesorNominalMin }),
    v({ id: 'd9-aa', grupo: 'Uso', seccion: 'D.9.2.1', pag: 'D-51', requisito: 'Uso como sistema de resistencia sísmica: amenaza sísmica baja con Aa', requerido: `Aa ≤ ${D9.aaMax}`, provisto: f(d.aa, 3), cumple: d.aa <= D9.aaMax }),
  ];
}

// ---------------------------------------------------------------------------------------------
// Requisitos adicionales DES de D.7.2.1.1 y clasificación del muro de perforación vertical
// ---------------------------------------------------------------------------------------------

export interface EvaluacionDES {
  /** Límite de separación = menor de L/3, H/3 y 1 200 mm (valor probable; el PDF imprime 120 mm). */
  limiteSeparacion: number;
  /** Mismo límite con el valor impreso (120 mm). */
  limiteImpreso: number;
  verticalOk: boolean;
  horizontalOk: boolean;
  horizontalEmbebidoOk: boolean;
  verticalOkImpreso: boolean;
  horizontalOkImpreso: boolean;
  /** (a) y (b) cumplidos con el límite probable. (c) se cubre con D.7.3.1(c) y no se verifica aquí. */
  cumpleAdicionales: boolean;
}

export function evaluarAdicionalesDES(d: DatosBloque): EvaluacionDES {
  // Se redondea a 1e-6 mm para evitar que 2.4 m / 3 = 799.9999… mm deje fuera una separación de 800 mm.
  const redondear = (x: number) => Math.round(x * 1e6) / 1e6;
  const limBase = redondear(Math.min(D7.des.fraccionLongitud * d.longitud * 1000, D7.des.fraccionAltura * d.altura * 1000));
  const lim = Math.min(limBase, D7.des.limiteProbable);
  const limImp = Math.min(limBase, D7.des.limiteImpreso);
  const verticalOk = d.vertical.sep <= lim;
  const horizontalEmbebidoOk = d.ubicacionHorizontal === 'embebido';
  const horizontalOk = d.horizontal.sep <= lim && horizontalEmbebidoOk;
  return {
    limiteSeparacion: lim,
    limiteImpreso: limImp,
    verticalOk,
    horizontalOk,
    horizontalEmbebidoOk,
    verticalOkImpreso: d.vertical.sep <= limImp,
    horizontalOkImpreso: d.horizontal.sep <= limImp && horizontalEmbebidoOk,
    cumpleAdicionales: verticalOk && horizontalOk,
  };
}

export type CapacidadDisipacion = 'DES' | 'DMO' | 'DMI';

export interface Clasificacion {
  sistema: SistemaMamposteria;
  capacidad: CapacidadDisipacion;
  seccion: string;
  /** Texto explicativo (autoría del proyecto). */
  explicacion: string;
  cumpleReforzada: boolean;
  cumpleParcial: boolean;
  des?: EvaluacionDES;
}

/**
 * Clasifica un muro de perforación vertical según los requisitos que cumple (autoría del proyecto, sobre D.2.1.2, D.7.2.1,
 * D.8.2.1 y D.9.1.2): si cumple todo D.7 es reforzada (DES si inyecta todas las celdas **o** cumple los adicionales de
 * D.7.2.1.1, como plantea D.2.1.2; DMO si solo se inyectan las celdas con refuerzo y no se cumplen los adicionales); si no,
 * y cumple D.8, es parcialmente reforzada (DMO); si no cumple ninguno, la edificación se clasifica y diseña como no
 * reforzada (D.9.1.2, DMI).
 */
export function clasificarPerforacionVertical(d: DatosBloque): Clasificacion {
  const cumpleReforzada = resumir(verificarReforzada(d)).todasCumplen;
  const cumpleParcial = resumir(verificarParcial(d)).todasCumplen;
  if (cumpleReforzada) {
    const des = evaluarAdicionalesDES(d);
    if (d.todasCeldasInyectadas) {
      return { sistema: 'reforzada', capacidad: 'DES', seccion: CAPACIDAD_DISIPACION.reforzadaTodasInyectadas.seccion, explicacion: 'Cumple D.7 e inyecta todas las celdas verticales, incluso las sin refuerzo: DES (D.7.2.1.1; D.2.1.2).', cumpleReforzada, cumpleParcial, des };
    }
    if (des.cumpleAdicionales) {
      return { sistema: 'reforzada', capacidad: 'DES', seccion: CAPACIDAD_DISIPACION.reforzadaTodasInyectadas.seccion, explicacion: 'Cumple D.7 y los requisitos adicionales de refuerzo mínimo de D.7.2.1.1(a)–(b): DES, aunque no se inyecten todas las celdas (D.2.1.2 los plantea como alternativa: «o»).', cumpleReforzada, cumpleParcial, des };
    }
    return { sistema: 'reforzada', capacidad: 'DMO', seccion: CAPACIDAD_DISIPACION.reforzadaSoloConRefuerzo.seccion, explicacion: 'Cumple D.7, pero solo se inyectan las celdas con refuerzo y no se cumplen los adicionales de D.7.2.1.1: DMO (D.7.2.1.2).', cumpleReforzada, cumpleParcial, des };
  }
  if (cumpleParcial) {
    return { sistema: 'parcial', capacidad: 'DMO', seccion: CAPACIDAD_DISIPACION.parcial.seccion, explicacion: 'No cumple todo D.7 pero sí D.8: mampostería parcialmente reforzada (DMO).', cumpleReforzada, cumpleParcial };
  }
  return { sistema: 'no-reforzada', capacidad: 'DMI', seccion: CAPACIDAD_DISIPACION.noReforzada.seccion, explicacion: 'No cumple D.7 ni D.8: la edificación se clasifica y diseña como mampostería no reforzada (D.9.1.2; D.2.1.4), DMI.', cumpleReforzada, cumpleParcial };
}

/** Verificación del sistema elegido (punto de entrada común de la calculadora). */
export function verificarSistema(
  sistema: SistemaMamposteria,
  datos: { cavidad: DatosCavidad; bloque: DatosBloque; aa: number },
): Verificacion[] {
  switch (sistema) {
    case 'cavidad':
      return verificarCavidad(datos.cavidad);
    case 'reforzada':
      return verificarReforzada(datos.bloque);
    case 'parcial':
      return verificarParcial(datos.bloque);
    case 'no-reforzada':
      return verificarNoReforzada({ espesor: datos.bloque.espesor, aa: datos.aa });
  }
}
