/**
 * Detalles del refuerzo, tolerancias y mortero de inyección de la mampostería estructural
 * (Capítulo D.4 de la NSR-10), transcritos del PDF (Norma/Norma-Sismo-Resistente-NSR-10.pdf).
 * Página PDF = página impresa "D-n" + 565. Las tablas se verificaron contra la imagen de la página
 * (el texto extraído desordena el contenido de la Tabla D.4.2-2 y de la Tabla D.4.6-1).
 *
 *   D.4.2.2   diámetros máximos y mínimos ........ PDF p.586 (D-21)
 *   D.4.2.3   límites de colocación .............. PDF p.587 (D-22)
 *   D.4.2.4   recubrimientos ..................... PDF p.587 (D-22)
 *   D.4.2.5   desarrollo, empalmes (Ec. D.4.2-1) . PDF p.587–588 (D-22, D-23)
 *   D.4.2.7   ganchos estándar ................... PDF p.588 (D-23)
 *   D.4.2.8   Tabla D.4.2-1 (doblamiento) ........ PDF p.588 (D-23)
 *   D.4.5.10  Tabla D.4.2-2 (tolerancias) ........ PDF p.591 (D-26)
 *   D.4.6.3.1 Tabla D.4.6-1 (altura de inyección)  PDF p.593 (D-28)
 *
 * Unidades: mm, MPa, m (alturas de inyección).
 */

// ---------------------------------------------------------------------------------------------
// D.4.2.2 — Diámetros máximos y mínimos del refuerzo (PDF p.586, D-21)
// ---------------------------------------------------------------------------------------------

/**
 * Diámetros de referencia (mm) de las barras citadas por la norma. Para comparar una barra concreta se usa
 * su diámetro nominal db (Tablas C.3.5.3-1 y C.3.5.3-2): N° 3 = 9.5, N° 5 = 15.9, N° 6 = 19.1, N° 7 = 22.2,
 * N° 8 = 25.4; 10M = 10, 16M = 16, 20M = 20, 22M = 22, 25M = 25. Cada límite usa el mayor de los dos
 * diámetros de la pareja «N° n ó nM» para que ambas designaciones se acepten.
 */
export const DIAMETROS_REFUERZO_CELDA = {
  /** D.4.2.2.1(a): mínimo N° 3 (3/8") ó 10M (10 mm). Se compara con 9.5 mm (N° 3). */
  minimoMm: 9.5,
  /** D.4.2.2.1(b): espesor nominal del muro ≥ 200 mm → máximo N° 8 (1") ó 25M (25 mm). */
  maximoMuroGruesoMm: 25.4,
  /** D.4.2.2.1(c): espesor nominal del muro < 200 mm → máximo N° 6 (3/4") ó 20M (20 mm). */
  maximoMuroDelgadoMm: 20,
  /** D.4.2.2.1(b)/(c): umbral de espesor nominal del muro (mm). */
  espesorUmbralMm: 200,
  /** D.4.2.2.1(d): el diámetro no puede exceder 1/3 de la menor dimensión libre de la celda. */
  fraccionCelda: 1 / 3,
} as const;

/** D.4.2.2.2: refuerzo horizontal de junta. */
export const DIAMETROS_REFUERZO_JUNTA = {
  /** (a) diámetro mínimo (mm). */
  minimoMm: 4,
  /** (b) el diámetro no puede exceder esta fracción del espesor del mortero de pega. */
  fraccionEspesorMortero: 1 / 2,
} as const;

// ---------------------------------------------------------------------------------------------
// D.4.2.3 — Límites para la colocación del refuerzo (PDF p.587, D-22)
// ---------------------------------------------------------------------------------------------

export const COLOCACION_REFUERZO = {
  /** D.4.2.3.1: una sola barra vertical por celda... */
  barrasPorCelda: 1,
  /** ...salvo que la menor dimensión de la celda sea mayor de este valor (mm): entonces se permiten dos barras. */
  celdaDosBarrasMm: 140,
  /** D.4.2.3.1: con dos barras, db no mayor de N° 5 (5/8") ó 16M (16 mm); se compara con 16 mm (16M; N° 5 = 15.9). */
  dbMaxDosBarrasMm: 16,
  /** D.4.2.3.2: puntos de corte de las barras de un paquete espaciados como mínimo 40 db. */
  corteBarrasPaqueteDb: 40,
  /** D.4.2.3.3: espesor mínimo de mortero de relleno entre el refuerzo y la unidad (mm). */
  morteroEntreBarraYUnidadMm: { fino: 6.5, grueso: 13 },
} as const;

// ---------------------------------------------------------------------------------------------
// D.4.2.4 — Recubrimiento del refuerzo (PDF p.587, D-22)
// ---------------------------------------------------------------------------------------------

/** D.4.2.4.1: barras en celdas; recubrimiento incluyendo el mortero de relleno y la pared de la unidad. */
export const RECUBRIMIENTO_CELDAS = {
  /** (a) expuesta a tierra o intemperie, barras mayores que N° 5 ó 16M (mm). */
  expuestaBarraGrande: 50,
  /** (a) expuesta a tierra o intemperie, barras menores o iguales que N° 5 ó 16M (mm). */
  expuestaBarraPequena: 40,
  /** (b) no expuesta a tierra ni intemperie (mm). */
  noExpuesta: 40,
  /** Umbral de diámetro: N° 5 (5/8") ó 16M (16 mm); se compara db ≤ 16 mm. */
  umbralDbMm: 16,
} as const;

/** D.4.2.4.2: refuerzo horizontal de junta; recubrimiento mínimo de mortero (mm). */
export const RECUBRIMIENTO_JUNTA = {
  expuesta: 12,
  noExpuesta: 6,
} as const;

// ---------------------------------------------------------------------------------------------
// D.4.2.5 — Desarrollo del refuerzo en mortero de relleno (PDF p.587–588, D-22 y D-23)
// ---------------------------------------------------------------------------------------------

/**
 * Ecuación D.4.2-1:  ℓd = 1.5 db² fy / (K √f′m)  ≥ 300 mm.
 * db y K en mm; fy y f′m en MPa; resultado en mm (el factor 1.5 absorbe las unidades: la norma no lo
 * expresa con unidades, así que la ecuación solo es válida con db y K en mm, y fy y f′m en MPa).
 */
export const DESARROLLO = {
  /** Coeficiente de la Ec. D.4.2-1. */
  coeficiente: 1.5,
  /** Longitud de desarrollo mínima (mm). */
  minimoMm: 300,
  /** Barras lisas: ℓd = doble del obtenido para barras corrugadas (D.4.2.5.2). */
  factorBarraLisa: 2,
  /** K no debe exceder 5 db (D.4.2.5.2, página D-23). */
  kMaxDb: 5,
} as const;

/** D.4.2.5.3: empalme por traslapo. */
export const EMPALME = {
  /** Longitud de traslapo = ℓd. */
  factorLd: 1,
  /** Barras traslapadas sin contacto: separación transversal ≤ 1/5 de la longitud de traslapo... */
  fraccionSeparacion: 1 / 5,
  /** ...y ≤ 200 mm. */
  separacionMaximaMm: 200,
  /** D.4.5.12.3: en la zona de empalme las barras están en contacto (posicionadores) o separadas ≥ 25 mm. */
  separacionMinimaSinContactoMm: 25,
} as const;

/** D.4.2.5.4: empalmes mecánicos o soldados ≥ 1.25 fy (soldadura según NTC 4040, ANSI/AWS D1.4). */
export const FACTOR_EMPALME_MECANICO = 1.25;

// ---------------------------------------------------------------------------------------------
// D.4.2.7 — Ganchos estándar (PDF p.588, D-23)
// ---------------------------------------------------------------------------------------------

export interface GanchoMamposteria {
  id: '180' | '90' | '135';
  /** Ángulo del doblez (grados). */
  angulo: number;
  /** Extensión recta mínima en múltiplos de db. */
  extensionDb: number;
  /** Extensión recta mínima absoluta (mm), si la norma la da. */
  extensionMinMm?: number;
  literal: 'a' | 'b' | 'c';
}

export const GANCHOS_ESTANDAR: readonly GanchoMamposteria[] = [
  { id: '180', angulo: 180, extensionDb: 4, extensionMinMm: 64, literal: 'a' },
  { id: '90', angulo: 90, extensionDb: 12, literal: 'b' },
  { id: '135', angulo: 135, extensionDb: 6, literal: 'c' },
];

// ---------------------------------------------------------------------------------------------
// D.4.2.8 — Tabla D.4.2-1: diámetros de doblamiento (PDF p.588, D-23)
// ---------------------------------------------------------------------------------------------

export interface FilaDoblamiento {
  /** fy de la fila (MPa). */
  fy: number;
  /** Diámetro mínimo de doblamiento en múltiplos de db (medido por el lado interior de la barra). */
  factorDb: number;
  /** Menor diámetro de barra cubierto por la fila (mm): N° 3 ó 10M. */
  dbMinMm: number;
  /** Mayor diámetro de barra cubierto por la fila (mm): N° 7 ó 22M (22.2); N° 8 ó 25M (25.4). */
  dbMaxMm: number;
  rango: string;
}

export const TABLA_D421_DOBLAMIENTO: readonly FilaDoblamiento[] = [
  { fy: 240, factorDb: 5, dbMinMm: 9.5, dbMaxMm: 22.2, rango: 'N° 3 (3/8") ó 10M (10 mm) a N° 7 (7/8") ó 22M (22 mm)' },
  { fy: 420, factorDb: 6, dbMinMm: 9.5, dbMaxMm: 25.4, rango: 'N° 3 (3/8") ó 10M (10 mm) a N° 8 (1") ó 25M (25 mm)' },
];

// ---------------------------------------------------------------------------------------------
// D.4.2-2 — Tolerancias constructivas (PDF p.591, D-26). La Tabla D.4.2-2 aparece impresa en D.4.5.10.
// ---------------------------------------------------------------------------------------------

export interface FilaTolerancia {
  n: number;
  elemento: string;
  /** Tolerancia principal (texto como en la norma). */
  tolerancia: string;
  /** Tolerancia máxima absoluta (texto), si la fila la tiene. */
  maximo?: string;
  /** Tolerancia en mm (límites numéricos) para uso en cálculo: [inferior, superior]. */
  limitesMm?: readonly [number, number];
  /** Pendiente máxima en mm por metro (±), si aplica. */
  mmPorMetro?: number;
  /** Máximo absoluto ± en mm (solo filas con "Máximo"). */
  maximoMm?: number;
}

export const TABLA_D422_TOLERANCIAS: readonly FilaTolerancia[] = [
  { n: 1, elemento: 'Dimensiones de elementos (sección o elevación)', tolerancia: '−6 mm + 12.5 mm', limitesMm: [-6, 12.5] },
  { n: 2, elemento: 'Junta de mortero (10 mm)', tolerancia: '−4 mm + 4 mm', limitesMm: [-4, 4] },
  { n: 3, elemento: 'Cavidad o celda de inyección', tolerancia: '−6 mm + 9 mm', limitesMm: [-6, 9] },
  { n: 4, elemento: 'Variación del nivel de junta horizontal', tolerancia: '± 2 mm/metro (1/500)', maximo: '± 12.5 mm', mmPorMetro: 2, maximoMm: 12.5 },
  { n: 5, elemento: 'Variación de la superficie de apoyo (cara superior del muro)', tolerancia: '± 2 mm/metro (1/500)', maximo: '± 12 mm', mmPorMetro: 2, maximoMm: 12 },
  { n: 6, elemento: 'Variación del plomo del muro', tolerancia: '± 2 mm/metro (1/500)', maximo: '± 12 mm', mmPorMetro: 2, maximoMm: 12 },
  { n: 7, elemento: 'Variación del alineamiento longitudinal', tolerancia: '± 2 mm/metro (1/500)', maximo: '± 12 mm', mmPorMetro: 2, maximoMm: 12 },
  { n: 8, elemento: 'Tolerancia de elementos en planta', tolerancia: '± 2 mm/metro (1/500)', maximo: '± 20 mm', mmPorMetro: 2, maximoMm: 20 },
  { n: 9, elemento: 'Tolerancia de elementos en elevación', tolerancia: '± 6 mm/piso', maximo: '± 20 mm', maximoMm: 20 },
];

/** D.4.5.10.1(f): espesor máximo de las juntas de pega (mm). */
export const JUNTA_PEGA_MAXIMA_MM = 10;

/** D.4.4.3 y D.4.5.12.1: tolerancia de colocación del refuerzo de empalme / vertical = 1/4 de la dimensión de la celda. */
export const TOLERANCIA_REFUERZO_CELDA = 1 / 4;

/** D.4.4.3: corrección suave de la barra de empalme, 1 horizontal : 6 vertical. */
export const PENDIENTE_CORRECCION_EMPALME = { h: 1, v: 6 } as const;

/** D.4.4.6: error de nivel de la cimentación que se corrige en las juntas (< 25 mm) o con realce de concreto (> 25 mm). */
export const ERROR_NIVEL_CIMENTACION_MM = 25;

// ---------------------------------------------------------------------------------------------
// D.4.6.3.1 — Tabla D.4.6-1: altura máxima de inyección (PDF p.593, D-28)
// ---------------------------------------------------------------------------------------------

export type TipoMorteroRelleno = 'fino' | 'grueso';

export interface FilaInyeccion {
  /** Altura máxima de inyección con mortero fino (m); null si la fila no lo admite («—»). */
  fino: number | null;
  /** Altura máxima de inyección con mortero grueso (m); null si la fila no lo admite («—»). */
  grueso: number | null;
  /** Dimensiones mínimas de celda requeridas (mm), espacio libre entre rebabas internas: [menor, mayor]. */
  celda: readonly [number, number];
  /** Dimensión mínima de cavidad (mm); mampostería de cavidad reforzada, espacio entre muros. */
  cavidad: number;
}

export const TABLA_D461_INYECCION: readonly FilaInyeccion[] = [
  { fino: 0.4, grueso: null, celda: [40, 50], cavidad: 25 },
  { fino: 1.2, grueso: 0.4, celda: [50, 60], cavidad: 38 },
  { fino: 1.5, grueso: 1.2, celda: [50, 75], cavidad: 50 },
  { fino: 3.0, grueso: 1.5, celda: [60, 75], cavidad: 60 },
  { fino: null, grueso: 3.0, celda: [75, 75], cavidad: 75 },
];

/** Nota (3) de la Tabla D.4.6-1: el área del refuerzo no ocupará más de este porcentaje del área de la cavidad. */
export const REFUERZO_MAX_AREA_CAVIDAD = 0.06;

/** Otros requisitos numéricos de D.4.6 (PDF p.593, D-28). */
export const MORTERO_RELLENO = {
  /** D.4.6.1: mezclado mecánico entre 3 y 10 minutos. */
  mezclaMin: 3,
  mezclaMax: 10,
  /** D.4.6.3.1(c) y D.4.6.3.2: intervalo máximo entre vaciados sucesivos (horas). */
  intervaloMaxHoras: 1,
  /** D.4.6.3.4: la junta de vaciado entre etapas queda al menos 40 mm por debajo de una junta de pega (mm). */
  juntaVaciadoBajoJuntaPegaMm: 40,
  /** D.4.6.4: compactación en porciones de 300 mm o menos (mm). */
  porcionCompactacionMm: 300,
  /** D.4.6.4.1: recompactación pasados unos 5 minutos cuando la porción excede 300 mm. */
  recompactacionMin: 5,
} as const;

/** D.4.5.10.2: ventanas de inspección y limpieza. */
export const VENTANA_INSPECCION = {
  minimoMm: 75,
  maximoMm: 100,
  /** Distancia máxima entre ventanas en mampostería de cavidad (m). */
  separacionCavidadMaxM: 1.0,
  /** Inyecciones parciales en altura: no se requiere ventana si la porción a inyectar no supera (m). */
  inyeccionParcialSinVentanaM: 1.4,
} as const;

/** D.4.5.9.1: distancia máxima entre juntas de control (m), ampliable con evidencia técnica. */
export const JUNTA_CONTROL_MAX_M = 8;

/** D.4.5.2.1: tasa inicial de absorción (TIA, g/min/cm²) de unidades de arcilla cocida. */
export const TIA_ARCILLA = { humedecer: 0.15, humedecer24h: 0.25 } as const;

/** D.4.5.6.3: tuberías embebidas en celdas inyectadas. */
export const TUBERIAS_EMBEBIDAS = {
  temperaturaMaxC: 65,
  presionMaxMPa: 0.4,
  /** El diámetro de la tubería (o del paquete) debe ser inferior a esta fracción del espesor del muro. */
  fraccionEspesorMuro: 1 / 3,
  /** En ningún caso ocupan más de este porcentaje del área transversal del muro. */
  areaMaxMuro: 0.05,
  /** Separación centro a centro mayor de este número de diámetros de tubería. */
  separacionDiametros: 5,
} as const;

/** D.4.7.4: espesor mínimo nominal del muro de carga con losas prefabricadas (mm). */
export const ESPESOR_MIN_MURO_LOSA_PREFABRICADA_MM = 120;

/** D.4.10: curado. */
export const CURADO = {
  /** D.4.10.1: unidades de concreto o sílico-calcáreas, protección durante los primeros días. */
  protegerConcretoDias: 3,
  /** D.4.10.2: unidades de arcilla, curado por al menos estos días. */
  curadoArcillaDias: 7,
} as const;
