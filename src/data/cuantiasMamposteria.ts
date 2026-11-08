/**
 * Capítulos D.6 a D.9 — Constantes de refuerzo mínimo, separaciones máximas y requisitos de los siete sistemas de
 * mampostería. Transcritas de las páginas D-43 a D-52 del PDF (página PDF = impresa + 565, es decir 608–617).
 * Verificadas visualmente contra la imagen de cada página.
 *
 * Convenciones del proyecto (no son texto de la norma):
 *  - "N° 4 (1/2") ó 12M (12 mm)" se evalúa con el menor de los dos diámetros equivalentes: 12 mm.
 *    "N° 3 (3/8") ó 10M (10 mm)": 9.5 mm. "N° 2 (1/4") ó 6M (6 mm)": 6 mm.
 *  - Unidades SI: mm, mm², MPa. Las cuantías son adimensionales (As / área bruta).
 */

/** Sistemas cubiertos por la calculadora (D.6 a D.9). */
export type SistemaMamposteria = 'cavidad' | 'reforzada' | 'parcial' | 'no-reforzada';

export const NOMBRE_SISTEMA: Record<SistemaMamposteria, string> = {
  cavidad: 'D.6 — Mampostería de cavidad reforzada',
  reforzada: 'D.7 — Mampostería reforzada (perforación vertical)',
  parcial: 'D.8 — Mampostería parcialmente reforzada',
  'no-reforzada': 'D.9 — Mampostería no reforzada',
};

/** Equivalencias de diámetro mínimo usadas por el proyecto para "N° n ó nM". */
export const DIAMETRO_N4_12M = 12;
export const DIAMETRO_N3_10M = 9.5;
export const DIAMETRO_N2_6M = 6;

// ---------------------------------------------------------------------------------------------
// D.6 — Mampostería de cavidad reforzada (PDF 608–611, D-43 a D-46)
// ---------------------------------------------------------------------------------------------

export const D6 = {
  /** D.6.1.3 (D-43): espesor real total mínimo y de cada parte. */
  espesorTotalMin: 190,
  espesorParedMin: 70,
  espesorCavidadMin: 50,
  /** D.6.1.4 (D-43): conectores de alambre entre paredes. */
  conectores: { diametroMin: 4, sepVerticalMax: 600, sepHorizontalMax: 800, aberturaEstribo: [100, 150] as const },
  /** D.6.1.4.2 (D-43): conectores en zeta. */
  conectorZeta: { pataMin: 50, sepVerticalMax: 400, sepHorizontalMax: 600 },
  /** D.6.1.5 (D-43): ventanas de limpieza. */
  ventanaLimpieza: { ladoMin: 75, sepMax: 1000 },
  /** D.6.1.6 (D-43): resistencias (MPa). */
  resistencias: { materialInyeccionMin: 12.5, fmMin: 6.25, fmFraccionMin: 0.5, fmFraccionMax: 2 },
  /** D.6.3.2(a) (D-44): cuantías mínimas sobre el área bruta de la cavidad. */
  cuantiaCavidad: { vertical: 0.0015, horizontal: 0.002 },
  /** D.6.3.2(b) (D-44): sobre el área bruta de la sección completa. */
  cuantiaSeccion: { porDireccion: 0.0007, suma: 0.002 },
  /** D.6.3.2.1 (D-44): separación del refuerzo en la cavidad y posicionadores. */
  separacion: { max: 400, min: 50, posicionadorDiametros: 250, posicionadorMax: 3000 },
  /** D.6.3.3 (D-44): extremos del muro y remate/arranque. */
  extremos: { nBarras: 2, diametroMin: DIAMETRO_N4_12M },
  /** D.6.3.3 (D-44): aberturas; las barras sobrepasan el borde la mayor de Ld y 500 mm. */
  aberturas: { nBarras: 2, diametroMin: DIAMETRO_N4_12M, sobrepasoMin: 500 },
  /** D.6.3.4 (D-44): refuerzo vertical de la cavidad y su soporte lateral. */
  compresion: {
    diametroSinCompresion: DIAMETRO_N2_6M,
    diametroConCompresion: DIAMETRO_N4_12M,
    estriboDiametroMin: DIAMETRO_N2_6M,
    estriboSepMax: 200,
    estriboSepDiametros: 16,
  },
  /** D.6.3.5 (D-44): el diámetro de las barras no puede exceder 1/4 del espesor de la cavidad. */
  diametroMaxFraccionCavidad: 0.25,
  /** D.6.3.6 (D-44): una capa hasta 150 mm de cavidad; en dos capas, ninguna con más del 66 %. */
  capas: { unaCapaHasta: 150, fraccionMaxPorCapa: 0.66 },
  /** D.6.4.3 (D-45): relación de módulos fuera de [0.5, 2] exige ensayos. */
  relacionModulosEnsayo: { min: 0.5, max: 2 },
  /** D.6.4.5.1 (D-45): esfuerzo cortante de contacto cavidad-paredes (MPa). */
  cortanteContactoMax: 0.07,
  /** D.6.5.1 a D.6.5.3 (D-45): construcción. */
  construccion: {
    desfasePared: 400,
    edadMinimaInyeccionDias: 3,
    alturaCapaInyeccion: 1.2,
    esperaEntreCapasMin: [60, 90] as const,
    recompactarMin: 5,
    longitudInyeccionMax: 8,
  },
} as const;

// ---------------------------------------------------------------------------------------------
// D.7 — Mampostería reforzada con unidades de perforación vertical (PDF 612–613, D-47 y D-48)
// ---------------------------------------------------------------------------------------------

export const D7 = {
  /** D.7.1.3 (D-47): espesor nominal mínimo (mm). */
  espesorNominalMin: 120,
  /** D.7.1.4 (D-47): intervalo de f′m (MPa). */
  fmMin: 10,
  fmMax: 28,
  /** D.7.3.1 (D-48): cuantías mínimas sobre el área bruta del muro. */
  cuantia: { porDireccion: 0.0007, suma: 0.002, fraccionVerticalDeHorizontal: 0.5 },
  /** D.7.3.2 (D-48): refuerzo vertical. */
  vertical: { sepMax: 1200, extremoDiametroMin: DIAMETRO_N4_12M, aberturaDiametroMin: DIAMETRO_N4_12M, aberturaMin: 600 },
  /** D.7.3.3 (D-48): refuerzo horizontal. */
  horizontal: {
    juntaDiametroMin: 4,
    juntaSepMax: 600,
    embebidoSepMax: 120,
    /** Valor probable (errata): ver el comentario de `des`. */
    embebidoSepMaxProbable: 1200,
    remateNBarras: 2,
    remateDiametroMin: DIAMETRO_N3_10M,
    aberturaPenetracion: 600,
  },
  /**
   * D.7.2.1.1 (D-47): requisitos adicionales para DES. El PDF imprime "120 mm" en (a) y (b); es casi seguro una errata
   * de "1 200 mm" (D.7.3.2(a) usa 1 200 mm y 120 mm es menor que el paso de las celdas de un bloque). Se conserva el
   * valor impreso y el valor probable; la calculadora evalúa con el probable y avisa.
   */
  des: { fraccionLongitud: 1 / 3, fraccionAltura: 1 / 3, limiteImpreso: 120, limiteProbable: 1200 },
} as const;

// ---------------------------------------------------------------------------------------------
// D.8 — Mampostería parcialmente reforzada (PDF 614–615, D-49 y D-50)
// ---------------------------------------------------------------------------------------------

export const D8 = {
  /** D.8.1.3 (D-49): espesor nominal mínimo (mm); salvo Tabla E.3.5-1 (viviendas de uno y dos pisos). */
  espesorNominalMin: 120,
  /** D.8.1.4 (D-49): f′m mínimo (MPa); sin máximo en el texto. */
  fmMin: 8,
  /** D.8.3.1 (D-49): cuantía mínima por dirección, solo refuerzo continuo en el tramo del muro. */
  cuantiaPorDireccion: 0.00027,
  /** D.8.3.2 (D-49): refuerzo vertical. */
  vertical: { sepMax: 2400, extremoDiametroMin: DIAMETRO_N3_10M, aberturaDiametroMin: DIAMETRO_N3_10M, aberturaMin: 600 },
  /** D.8.3.3 (D-49 y D-50): refuerzo horizontal. */
  horizontal: {
    juntaSepMax: 800,
    embebidoSepMax: 3000,
    remateNBarras: 2,
    remateDiametroMin: DIAMETRO_N3_10M,
    aberturaPenetracion: 600,
  },
} as const;

// ---------------------------------------------------------------------------------------------
// D.9 — Mampostería no reforzada (PDF 616–617, D-51 y D-52)
// ---------------------------------------------------------------------------------------------

export const D9 = {
  /** D.9.1.3 (D-51): espesor nominal mínimo (mm); salvo Tabla E.3.5-1. */
  espesorNominalMin: 120,
  /** D.9.2.1 (D-51): solo en zonas de amenaza sísmica baja con Aa menor o igual a este valor. */
  aaMax: 0.05,
} as const;

/** Capacidad de disipación de energía que la norma asigna a cada sistema (D.6.2.1, D.7.2.1, D.8.2.1, D.9.2.1). */
export const CAPACIDAD_DISIPACION = {
  cavidad: { codigo: 'DES', seccion: 'D.6.2.1', pag: 'D-43/D-44' },
  reforzadaTodasInyectadas: { codigo: 'DES', seccion: 'D.7.2.1.1', pag: 'D-47' },
  reforzadaSoloConRefuerzo: { codigo: 'DMO', seccion: 'D.7.2.1.2', pag: 'D-47' },
  parcial: { codigo: 'DMO', seccion: 'D.8.2.1', pag: 'D-49' },
  noReforzada: { codigo: 'DMI', seccion: 'D.9.2.1', pag: 'D-51' },
} as const;

/**
 * Barras y alambres seleccionables en la calculadora (diámetro mm, área mm²). Áreas de las Tablas C.3.5.3-1/-2 (src/data/
 * materialesConcreto.ts); el alambre de 4 mm no figura en ellas: su área es π·4²/4 = 12.6 mm² (cálculo del proyecto).
 */
export interface BarraD {
  id: string;
  etiqueta: string;
  diametro: number;
  area: number;
}

export const BARRAS_D: readonly BarraD[] = [
  { id: 'alambre-4', etiqueta: 'Alambre 4 mm', diametro: 4, area: 12.6 },
  { id: '6M', etiqueta: '6M (6 mm)', diametro: 6, area: 28.3 },
  { id: 'No. 2', etiqueta: 'N° 2 (1/4") — 6.4 mm', diametro: 6.4, area: 32 },
  { id: '8M', etiqueta: '8M (8 mm)', diametro: 8, area: 50.3 },
  { id: 'No. 3', etiqueta: 'N° 3 (3/8") — 9.5 mm', diametro: 9.5, area: 71 },
  { id: '10M', etiqueta: '10M (10 mm)', diametro: 10, area: 78.5 },
  { id: '12M', etiqueta: '12M (12 mm)', diametro: 12, area: 113.1 },
  { id: 'No. 4', etiqueta: 'N° 4 (1/2") — 12.7 mm', diametro: 12.7, area: 129 },
  { id: 'No. 5', etiqueta: 'N° 5 (5/8") — 15.9 mm', diametro: 15.9, area: 199 },
  { id: '16M', etiqueta: '16M (16 mm)', diametro: 16, area: 201.1 },
  { id: 'No. 6', etiqueta: 'N° 6 (3/4") — 19.1 mm', diametro: 19.1, area: 284 },
];

export function buscarBarraD(id: string): BarraD {
  return BARRAS_D.find((b) => b.id === id) ?? BARRAS_D[0];
}
