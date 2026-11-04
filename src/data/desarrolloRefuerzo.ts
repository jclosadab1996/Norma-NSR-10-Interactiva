/**
 * Longitudes de desarrollo y empalmes del refuerzo (Capítulo C.12 de la NSR-10), transcritos del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302.
 * Cada tabla y factor se verificó contra la imagen de la página (el texto extraído pierde los radicales).
 *
 *   C.12.1  (límite de √f′c)                  .......... PDF p.409 (C-107)
 *   C.12.2  Tabla de ℓd, ψt ψe ψs λ, Ktr      .......... PDF p.409–410 (C-107, C-108)
 *   C.12.3  compresión                        .......... PDF p.410 (C-108)
 *   C.12.4  paquetes de barras                .......... PDF p.411 (C-109)
 *   C.12.5  ganchos estándar                  .......... PDF p.411 (C-109)
 *   C.12.6  barras con cabeza                 .......... PDF p.412 (C-110)
 *   C.12.7–C.12.9  malla y torones            .......... PDF p.412–413 (C-110, C-111)
 *   C.12.10–C.12.13  refuerzo de flexión/alma .......... PDF p.413–416 (C-111 a C-114)
 *   C.12.14–C.12.19  empalmes                 .......... PDF p.416–419 (C-114 a C-117)
 *
 * Unidades: mm, MPa. "No. n" = n octavos de pulgada; "nM" = diámetro nominal de n mm.
 */

// ---------------------------------------------------------------------------------------------
// Límites generales
// ---------------------------------------------------------------------------------------------

/** C.12.1.2: los valores de √f′c usados en el capítulo no deben exceder 8.3 MPa (PDF p.409, C-107). */
export const RAIZ_FC_MAX_MPA = 8.3;

/** f′c máximo equivalente a √f′c = 8.3 MPa: 8.3² = 68.89 MPa (derivado). */
export const FC_MAX_EQUIVALENTE_MPA = RAIZ_FC_MAX_MPA ** 2;

/** Longitudes mínimas (mm) y otros umbrales del capítulo. */
export const MINIMOS = {
  /** C.12.2.1: ℓd en tracción no menor de 300 mm (PDF p.409, C-107). */
  ldTraccion: 300,
  /** C.12.3.1: ℓdc en compresión no menor de 200 mm (PDF p.410, C-108). */
  ldCompresion: 200,
  /** C.12.5.1: ℓdh no menor del mayor entre 8db y 150 mm (PDF p.411, C-109). */
  ldhFactorDb: 8,
  ldhMm: 150,
  /** C.12.6.2: ℓdt no menor del mayor entre 8db y 150 mm (PDF p.412, C-110). */
  ldtFactorDb: 8,
  ldtMm: 150,
  /** C.12.7.1: ℓd de malla de alambre corrugado no menor de 200 mm (PDF p.412, C-110). */
  ldMallaCorrugada: 200,
  /** C.12.8: ℓd de malla de alambre liso no menor de 150 mm (PDF p.413, C-111). */
  ldMallaLisa: 150,
  /** C.12.15.1 y C.12.16.1: empalme por traslapo no menor de 300 mm (PDF p.417, C-115). */
  empalme: 300,
} as const;

// ---------------------------------------------------------------------------------------------
// C.12.2 — Barras y alambres corrugados a tracción (PDF p.409–410, C-107 y C-108)
// ---------------------------------------------------------------------------------------------

/** Frontera de tamaño de la tabla de C.12.2.2 y de ψs: No. 6 (3/4") ó 20M (20 mm) y menores / No. 7 (7/8") ó 22M y mayores. */
export const FRONTERA_TAMANO_DB_MM = 20;

export interface FilaTablaC122 {
  id: 'espaciamiento-adecuado' | 'otros-casos';
  caso: string;
  /** Divisor de ℓd/db para barras No. 6 (20M) y menores y alambres corrugados. */
  pequenas: number;
  /** Divisor de ℓd/db para barras No. 7 (22M) y mayores. */
  grandes: number;
}

/**
 * Tabla de C.12.2.2 (sin número en el PDF): ℓd = ( fy ψt ψe / (c λ √f′c) ) db, con c el valor tabulado.
 * ERRATA del PDF: en la celda "Otros casos / No. 7 y mayores" el PDF imprime la expresión con λ también en el numerador
 * (fy ψt ψe λ / (1.1 λ √f′c)), lo que cancelaría λ. Se tabula 1.1 y λ solo en el denominador, como en las otras tres
 * celdas (criterio propio; ver el capítulo).
 */
export const TABLA_C122: readonly FilaTablaC122[] = [
  {
    id: 'espaciamiento-adecuado',
    caso:
      'Espaciamiento libre entre barras o alambres que se desarrollan o empalman no menor que db, recubrimiento libre no menor que db y estribos a lo largo de ℓd no menos que el mínimo del Título C; o espaciamiento libre no menor de 2db y recubrimiento libre no menor que db',
    pequenas: 2.1,
    grandes: 1.7,
  },
  { id: 'otros-casos', caso: 'Otros casos', pequenas: 1.4, grandes: 1.1 },
];

/** Constante de la ecuación C.12-1: ℓd = fy ψt ψe ψs / ( 1.1 λ √f′c (cb+Ktr)/db ) · db. */
export const C121_CONSTANTE = 1.1;

/** C.12.2.3: el término (cb + Ktr)/db no debe tomarse mayor de 2.5. */
export const CB_KTR_DB_MAX = 2.5;

/** Ecuación C.12-2: Ktr = 40 Atr / (s n), con Atr en mm² y s en mm, de modo que Ktr queda en mm (PDF p.410, C-108). */
export const KTR_CONSTANTE = 40;

/** C.12.2.4 (a): ψt = 1.3 con más de 300 mm de concreto fresco bajo el refuerzo horizontal; 1.0 en los demás casos. */
export const PSI_T = { masDe300mmDebajo: 1.3, otros: 1.0, umbralConcretoFrescoMm: 300 } as const;

/**
 * C.12.2.4 (b): ψe. 1.5 si hay recubrimiento epóxico con recubrimiento menor de 3db o separación libre menor de 6db;
 * 1.2 para las demás barras con recubrimiento epóxico; 1.0 sin recubrimiento o galvanizado. El producto ψtψe no necesita
 * exceder 1.7.
 */
export const PSI_E = {
  epoxicoRecubrimientoOSeparacionPequenos: 1.5,
  epoxicoOtros: 1.2,
  sinEpoxico: 1.0,
  recubrimientoLimiteDb: 3,
  separacionLimiteDb: 6,
  productoMaximoPsiTPsiE: 1.7,
} as const;

/** C.12.2.4 (c): ψs = 0.8 para No. 6 (20M) y menores y alambres corrugados; 1.0 para No. 7 (22M) y mayores. */
export const PSI_S = { pequenas: 0.8, grandes: 1.0 } as const;

/** C.12.2.4 (d): λ no debe exceder 0.75 en concreto liviano salvo que se especifique fct (C.8.6.1); 1.0 en peso normal. */
export const LAMBDA_LIVIANO_MAX = 0.75;

// ---------------------------------------------------------------------------------------------
// C.12.3 — Compresión (PDF p.410, C-108)
// ---------------------------------------------------------------------------------------------

/** C.12.3.2: ℓdc = el mayor de 0.24 fy/(λ√f′c) db y 0.043 fy db (0.043 en mm²/N). */
export const COMPRESION = {
  k1: 0.24,
  k2: 0.043,
  /** C.12.3.3 (b): factor 0.75 con espiral de barra ≥ 6 mm y paso ≤ 100 mm, o estribos No. 13 (según C.7.10.5) a ≤ 100 mm entre centros. */
  factorEspiral: 0.75,
  espiralBarraMinMm: 6,
  espiralPasoMaxMm: 100,
  estribosSeparacionMaxMm: 100,
} as const;

// ---------------------------------------------------------------------------------------------
// C.12.4 — Paquetes de barras (PDF p.411, C-109)
// ---------------------------------------------------------------------------------------------

/** C.12.4.1: ℓd de cada barra del paquete = ℓd individual × 1.20 (3 barras) ó × 1.33 (4 barras). */
export const FACTOR_PAQUETE: Readonly<Record<number, number>> = { 2: 1.0, 3: 1.2, 4: 1.33 };

// ---------------------------------------------------------------------------------------------
// C.12.5 — Ganchos estándar en tracción (PDF p.411, C-109)
// ---------------------------------------------------------------------------------------------

/** C.12.5.2: ℓdh = 0.24 ψe fy/(λ√f′c) db. */
export const GANCHO = {
  k: 0.24,
  /** C.12.5.2 (texto impreso): ψe = 0.75 para concreto con agregados livianos; otros casos ψe y λ = 1.0. Ver erratas. */
  psiELivianoImpreso: 0.75,
} as const;

export interface FactorGancho {
  id: 'recubrimiento' | 'estribos-90' | 'estribos-180' | 'exceso';
  seccion: string;
  descripcion: string;
  /** Factor multiplicador; null cuando depende de As,requerido/As,proporcionado. */
  factor: number | null;
}

/** Factores de modificación de ℓdh (C.12.5.3). Los barras "No. 36 y menores" son No. 11 (36M) y menores. */
export const FACTORES_GANCHO: readonly FactorGancho[] = [
  {
    id: 'recubrimiento',
    seccion: 'C.12.5.3 (a)',
    descripcion: 'Barras No. 36 (36M) y menores con recubrimiento lateral (normal al plano del gancho) ≥ 65 mm y, en ganchos de 90°, recubrimiento sobre la extensión más allá del gancho ≥ 50 mm',
    factor: 0.7,
  },
  {
    id: 'estribos-90',
    seccion: 'C.12.5.3 (b)',
    descripcion: 'Ganchos de 90° de barras No. 36 (36M) y menores confinados por estribos perpendiculares o paralelos a la barra, espaciados ≤ 3db a lo largo de ℓdh',
    factor: 0.8,
  },
  {
    id: 'estribos-180',
    seccion: 'C.12.5.3 (c)',
    descripcion: 'Ganchos de 180° de barras No. 11 (36M) y menores confinados con estribos perpendiculares a la barra, espaciados ≤ 3db a lo largo de ℓdh',
    factor: 0.8,
  },
  {
    id: 'exceso',
    seccion: 'C.12.5.3 (d)',
    descripcion: 'Refuerzo en exceso sobre el requerido por análisis, si no se exige específicamente anclaje o ℓd para fy',
    factor: null,
  },
];

/** C.12.5.3: estribo que confina la parte doblada a menos de 2db del borde externo del gancho; separación ≤ 3db. */
export const GANCHO_ESTRIBOS = { separacionMaxDb: 3, primerEstriboMaxDb: 2, recubrimientoLateralMm: 65, recubrimientoExtensionMm: 50 } as const;

// ---------------------------------------------------------------------------------------------
// C.12.6 — Barras con cabeza (PDF p.412, C-110)
// ---------------------------------------------------------------------------------------------

export const CABEZA = {
  /** C.12.6.2: ℓdt = 0.19 ψe fy/√f′c db. */
  k: 0.19,
  /** C.12.6.1: fy ≤ 420 MPa; barra ≤ No. 11 (36M); concreto de peso normal; Abrg ≥ 4Ab; recubrimiento libre ≥ 2db; separación libre ≥ 4db. */
  fyMaxMpa: 420,
  dbMaxMm: 36,
  areaApoyoMinFactor: 4,
  recubrimientoMinDb: 2,
  separacionLibreMinDb: 4,
  /** C.12.6.2: f′c usado no mayor de 40 MPa. */
  fcMaxMpa: 40,
  /** ψe = 1.2 con epóxico, 1.0 en los demás casos. */
  psiEEpoxico: 1.2,
} as const;

// ---------------------------------------------------------------------------------------------
// C.12.7 a C.12.9 — Malla electrosoldada y torones (PDF p.412–413, C-110 y C-111)
// ---------------------------------------------------------------------------------------------

/** C.12.7.2: ψw = mayor de (fy − 240)/fy y 5db/sw, sin pasar de 1.0. La constante 240 está en MPa. */
export const MALLA = {
  psiWConstanteMpa: 240,
  psiWFactorDbSobreS: 5,
  /** Distancia mínima del alambre transversal a la sección crítica. */
  transversalMinDesdeSeccionMm: 50,
  /** C.12.7.4: alambres corrugados mayores que MD200 (16 mm) o lisos → se desarrolla con C.12.8. */
  mdMaxMm: 16,
  /** C.12.8, Ec. C.12-3: ℓd = 3.3 (Ab/s)(fy/(λ√f′c)). */
  lisaK: 3.3,
} as const;

/** C.12.9.1, Ec. C.12-4: ℓd = (fse/21) db + ((fps − fse)/7) db (constantes sin unidades; fse y fps en MPa). */
export const TORON = { divisorFse: 21, divisorDelta: 7, factorSiTraccionSinAdherenciaHastaElExtremo: 2 } as const;

// ---------------------------------------------------------------------------------------------
// C.12.10 a C.12.13 — Refuerzo de flexión y del alma (PDF p.413–416, C-111 a C-114)
// ---------------------------------------------------------------------------------------------

export const FLEXION = {
  /** C.12.10.3: extender más allá del punto donde ya no se necesita: d ó 12db, el mayor. */
  extensionDb: 12,
  /** C.12.10.5.1: Vu en el punto terminal no excede (2/3)φVn. */
  fraccionVuC12105_1: 2 / 3,
  /** C.12.10.5.2: área adicional de estribos ≥ 0.41 bw s/fyt a lo largo de (3/4)d; s ≤ d/(8βb). */
  estribosExtraK: 0.41,
  distanciaEstribosExtraD: 3 / 4,
  separacionMaxEstribosDivisor: 8,
  /** C.12.10.5.3: barras No. 36 (36M) y menores, el refuerzo que continúa da el doble del área requerida y Vu ≤ (3/4)φVn. */
  fraccionVuC12105_3: 3 / 4,
  areaContinuaFactorC12105_3: 2,
  /** C.12.11.1: al menos 1/3 (simplemente apoyados) o 1/4 (continuos) del refuerzo de momento positivo llega al apoyo; ≥ 150 mm dentro del apoyo en vigas. */
  fraccionPositivoAlApoyo: { simple: 1 / 3, continuo: 1 / 4 },
  penetracionApoyoViga: 150,
  /** C.12.11.3: Mn/Vu puede aumentarse 30 % si los extremos están confinados por una reacción de compresión. */
  aumentoMnVuConfinado: 1.3,
  /** C.12.12.3: al menos 1/3 del refuerzo negativo se prolonga más allá del punto de inflexión: d, 12db ó ℓn/16, el mayor. */
  fraccionNegativoPasaInflexion: 1 / 3,
  divisorLnC12123: 16,
} as const;

export const ALMA = {
  /** C.12.13.2.2: ℓ embebida desde la mitad de la altura ≥ 0.17 db fyt/(λ√f′c). */
  kEstriboU: 0.17,
  /** C.12.13.2.1 y C.12.13.2.2: umbral fyt = 280 MPa. */
  fytUmbralMpa: 280,
  /** C.12.13.2.3 a C.12.13.2.4: separación entre alambres longitudinales ≥ 50 mm. */
  separacionAlambresMm: 50,
  /** C.12.13.5: pares de estribos en U traslapados 1.3 ℓd; en d ≥ 450 mm, Ab fyt ≤ 40 kN por rama. */
  traslapoParesEstriboU: 1.3,
  dMinSinTraslapoMm: 450,
  fuerzaRamaMaxKn: 40,
} as const;

// ---------------------------------------------------------------------------------------------
// C.12.14 a C.12.19 — Empalmes (PDF p.416–419, C-114 a C-117)
// ---------------------------------------------------------------------------------------------

export type ClaseEmpalme = 'A' | 'B';

/** C.12.15.1: empalme por traslapo en tracción Clase A = 1.0 ℓd; Clase B = 1.3 ℓd (mínimo 300 mm). */
export const FACTOR_CLASE_EMPALME: Readonly<Record<ClaseEmpalme, number>> = { A: 1.0, B: 1.3 };

export const EMPALMES = {
  /** C.12.14.2.1: no usar traslapos en barras mayores de No. 36 (36M), salvo C.12.16.2 y C.15.8.2.3. */
  traslapoDbMaxBarraEq: 11,
  /** C.12.14.2.3: separación transversal máxima entre barras traslapadas sin contacto en flexión: menor de 1/5 ℓ traslapo ó 150 mm. */
  separacionTransversalFraccion: 1 / 5,
  separacionTransversalMm: 150,
  /** C.12.14.3.2 y C.12.14.3.4: empalme mecánico completo o totalmente soldado ≥ 1.25 fy. */
  factorFyMecanicoSoldado: 1.25,
  /** C.12.15.2: Clase A solo si As proporcionada ≥ 2 As requerida en todo el traslapo y ≤ 1/2 del refuerzo se empalma en la longitud. */
  claseAAreaFactorMin: 2,
  claseAFraccionMaxEmpalmada: 0.5,
  /** C.12.15.5: empalmes soldados/mecánicos "parciales" solo en No. 5 (16M) y menores, escalonados ≥ 600 mm; fuerza ≥ 2 × requerida y ≥ 140 MPa × As total. */
  parcialEscalonamientoMm: 600,
  parcialFuerzaFactor: 2,
  parcialEsfuerzoMinimoMpa: 140,
  /** C.12.15.6: elementos de amarre en tracción: empalme completo, barras adyacentes escalonadas ≥ 750 mm. */
  amarreEscalonamientoMm: 750,
  /** C.12.19: malla lisa. */
  mallaLisaSeparacionMasMm: 50,
  mallaLisaFactorLd: 1.5,
  mallaLisaMinMm: 150,
  mallaLisaConExcesoMinMm: 50,
  /** C.12.18.1: malla corrugada: mayor de 1.3 ℓd y 200 mm; entre alambres transversales extremos ≥ 50 mm. */
  mallaCorrugadaFactorLd: 1.3,
  mallaCorrugadaMinMm: 200,
  mallaCorrugadaEntreTransversalesMm: 50,
} as const;

/**
 * C.12.16.1: empalme por traslapo en compresión = 0.071 fy db (fy ≤ 420 MPa) ó (0.13 fy − 24) db (fy > 420 MPa),
 * mínimo 300 mm; si f′c < 21 MPa se incrementa en 1/3.
 */
export const EMPALME_COMPRESION = {
  k1: 0.071,
  k2: 0.13,
  resta: 24,
  fyUmbralMpa: 420,
  fcUmbralMpa: 21,
  incrementoFcBajo: 1 / 3,
  minimoMm: 300,
  /** C.12.16.4.2: empalmes a tope, tolerancias angulares (grados). */
  topeToleranciaCorteGrados: 1.5,
  topeToleranciaAjusteGrados: 3,
} as const;

/** C.12.17: empalmes en columnas. */
export const EMPALME_COLUMNAS = {
  /** C.12.17.2.2 y C.12.17.2.3: umbral de esfuerzo de tracción 0.5 fy. */
  fraccionFyTraccion: 0.5,
  /** C.12.17.2.4: estribos con área efectiva ≥ 0.0015 h s en ambas direcciones → ×0.83 (mínimo 300 mm). */
  estribosCuantiaMin: 0.0015,
  factorEstribos: 0.83,
  /** C.12.17.2.5: espiral → ×0.75 (mínimo 300 mm). */
  factorEspiral: 0.75,
  /** C.12.17.4: empalmes a tope: barras continuas con resistencia ≥ 0.25 fy × área del refuerzo vertical de esa cara. */
  topeFraccionFy: 0.25,
} as const;
