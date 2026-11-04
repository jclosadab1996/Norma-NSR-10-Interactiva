/**
 * Constantes y tablas del Capítulo C.11 (Cortante y torsión) de la NSR-10. SI: MPa, N, mm.
 * PDF = página impresa "C-n" + 302. Cada constante cita su sección y página.
 * Todos los coeficientes que multiplican a √f′c están en MPa^½·(unidad de la ecuación): con f′c en MPa, b y d en mm,
 * la fuerza sale en N.
 */

/** φ de cortante y torsión = 0.75 (C.9.3.2.3, PDF p.370, C-68). Con DMO/DES ver C.9.3.4 (0.60 en ciertos casos). */
export const PHI_CORTANTE_TORSION = 0.75;
/** φ de cortante cuando, en DMO/DES, Vn es menor que el cortante asociado a Mn (C.9.3.4(a), PDF p.371, C-69). */
export const PHI_CORTANTE_SISMICO_DEFICIENTE = 0.6;
/** φ de cortante en ménsulas y cartelas: se toma 0.75 en todos los cálculos de C.11.8 (C.11.8.3.1, PDF p.400, C-98). */
export const PHI_MENSULA = 0.75;

/** √f′c de los cálculos de este capítulo no debe exceder 8.3 MPa (C.11.1.2, PDF p.389, C-87). */
export const RAIZ_FC_LIMITE = 8.3;

/** fy y fyt de refuerzo de cortante no deben exceder 420 MPa (C.11.4.2, PDF p.391, C-90). */
export const FYT_MAX_CORTANTE = 420;
/** Límite para refuerzo electrosoldado de alambre corrugado (C.11.4.2, PDF p.391, C-90). */
export const FYT_MAX_MALLA_CORRUGADA = 550;

/* ---------- C.11.2 y C.11.3: resistencia del concreto Vc ---------- */

/** Vc = 0.17 λ √f′c bw d (Ec. C.11-3, PDF p.390, C-88). */
export const COEF_VC_SIMPLE = 0.17;
/** Divisor 14 en Vc = 0.17 (1 + Nu / 14Ag) λ √f′c bw d (Ec. C.11-4, PDF p.390, C-88). */
export const DIVISOR_NU_COMPRESION = 14;
/** Vc detallado: (0.16 λ √f′c + 17 ρw Vu d / Mu) bw d ≤ 0.29 λ √f′c bw d (Ec. C.11-5, PDF p.390, C-88). */
export const VC_DETALLADO = { coefRaiz: 0.16, coefRho: 17, maximo: 0.29, ratioVudMuMax: 1.0 } as const;
/** Coeficiente 0.29 en C.11-7 y C.11-8 (efecto de la fuerza axial; PDF p.390, C-88). */
export const COEF_NU_AXIAL = 0.29;

/** Vc de elementos preesforzados (C.11.3, PDF p.391–392, C-89/C-90). */
export const VC_PREESFORZADO = {
  /** Ec. C.11-9: (0.05 λ √f′c + 4.8 Vu dp / Mu) bw d. */
  c119: { coefRaiz: 0.05, coefVudp: 4.8, minimo: 0.17, maximo: 0.42, ratioMax: 1.0 },
  /** Ec. C.11-10: Vci = 0.05 λ √f′c bw dp + Vd + Vi Mcre / Mmax; no menor que 0.14 λ √f′c bw d. */
  vci: { coefRaiz: 0.05, minimo: 0.14 },
  /** Ec. C.11-11: Mcre = (I / yt)(0.5 λ √f′c + fpe − fd). */
  mcreCoefRaiz: 0.5,
  /** Ec. C.11-12: Vcw = (0.29 λ √f′c + 0.3 fpc) bw dp + Vp. */
  vcw: { coefRaiz: 0.29, coefFpc: 0.3 },
  /** Esfuerzo principal de tracción alternativo para Vcw: 0.33 λ √f′c (C.11.3.3.2). */
  tensionPrincipalAlterna: 0.33,
  /** dp no se toma menor que 0.80h (C.11.3.1, C.11.3.3.1, C.11.3.3.2). */
  dpMinFraccionH: 0.8,
  /** La fuerza efectiva de preesforzado debe ser ≥ 40 % de la resistencia a tracción del refuerzo de flexión (C.11.3.2). */
  fraccionPreesforzadoMin: 0.4,
  /** Longitud de transferencia supuesta en diámetros: torones 50, alambres 100 (C.11.3.4 y C.11.3.5). */
  longitudTransferenciaDiametros: { torones: 50, alambres: 100 },
} as const;

/** Elementos circulares: d se permite tomar como 0.80 veces el diámetro (C.11.2.3, PDF p.391, C-89). */
export const D_CIRCULAR_FRACCION_DIAMETRO = 0.8;

/* ---------- C.11.4: refuerzo de cortante ---------- */

/** Límites de Vs y de la separación (C.11.4.5, C.11.4.7.9, PDF p.391–393, C-90–C-92). */
export const LIMITES_VS = {
  /** Vs no mayor que 0.66 √f′c bw d (C.11.4.7.9). */
  maximo: 0.66,
  /** Si Vs > 0.33 √f′c bw d, las separaciones máximas se reducen a la mitad (C.11.4.5.3). */
  umbralReduccionSeparacion: 0.33,
  /** Barras dobladas en un solo punto: Vs ≤ 0.25 √f′c bw d (C.11.4.7.5). */
  maximoBarraDoblada: 0.25,
} as const;

/** Separación máxima del refuerzo de cortante perpendicular al eje (C.11.4.5.1, PDF p.391, C-90). */
export const SEPARACION_MAX = {
  /** No preesforzado: d/2. */
  noPreesforzadoFraccionD: 0.5,
  /** Preesforzado: 0.75h. */
  preesforzadoFraccionH: 0.75,
  /** En ambos casos, 600 mm. */
  absolutaMm: 600,
} as const;

/** Av,min = 0.062 √f′c bw s / fyt ≥ 0.35 bw s / fyt (Ec. C.11-13, C.11.4.6.3, PDF p.393, C-91). */
export const AV_MIN = { coefRaiz: 0.062, coefMinimo: 0.35 } as const;
/** Av,min preesforzado (Ec. C.11-14): Aps fpu s / (80 fyt d) · √(d/bw), con preesforzado efectivo ≥ 40 %. */
export const AV_MIN_PREESFORZADO_DIVISOR = 80;

/** Se exige Av,min donde Vu excede 0.5 φ Vc (C.11.4.6.1, PDF p.393, C-91). */
export const FRACCION_PHIVC_REFUERZO_MINIMO = 0.5;

/** Excepciones al refuerzo mínimo de cortante en elementos a flexión (C.11.4.6.1, PDF p.393, C-91). */
export const EXCEPCIONES_AV_MIN: readonly { literal: string; descripcion: string }[] = [
  { literal: 'a', descripcion: 'Zapatas y losas sólidas.' },
  { literal: 'b', descripcion: 'Elementos alveolares con altura total (sin afinado) no mayor de 315 mm y unidades alveolares donde Vu no es mayor de 0.5 φVcw.' },
  { literal: 'c', descripcion: 'Losas nervadas de concreto con viguetas definidas en C.8.13.' },
  { literal: 'd', descripcion: 'Vigas con h no mayor que 250 mm.' },
  { literal: 'e', descripcion: 'Vigas integrales con losas, con h no mayor de 600 mm y no mayor que el mayor entre 2.5 veces el espesor del ala y 0.5 veces el ancho del alma.' },
  { literal: 'f', descripcion: 'Vigas de concreto de peso normal reforzado con fibra de acero, f′c ≤ 40 MPa, h ≤ 600 mm y Vu ≤ φ 0.17 √f′c bw d.' },
];

/* ---------- C.11.5: torsión ---------- */

/** Coeficientes de torsión (C.11.5, PDF p.394–398, C-92–C-96). */
export const TORSION = {
  /** Umbral: Tu < φ 0.083 λ √f′c (Acp²/pcp) (C.11.5.1). */
  umbral: 0.083,
  /** Reducción máxima por redistribución: φ 0.33 λ √f′c (Acp²/pcp) (C.11.5.2.2). */
  redistribucion: 0.33,
  /** Esfuerzo de fisuración combinado: Vc/(bw d) + 0.66 √f′c (Ecs. C.11-18 y C.11-19). */
  limiteSeccion: 0.66,
  /** Denominador 1.7 Aoh² (Ecs. C.11-18 y C.11-19). */
  divisorAoh: 1.7,
  /** Ao puede tomarse como 0.85 Aoh (C.11.5.3.6). */
  aoSobreAoh: 0.85,
  /** θ entre 30° y 60° (C.11.5.3.6). */
  thetaMinGrados: 30,
  thetaMaxGrados: 60,
  /** θ = 45° (no preesforzados) o 37.5° (preesforzados con preesforzado efectivo ≥ 40 %) (C.11.5.3.6). */
  thetaNoPreesforzado: 45,
  thetaPreesforzado: 37.5,
  /** Refuerzo mínimo transversal: Av + 2At = 0.062 √f′c bw s / fyt ≥ 0.35 bw s / fyt (Ec. C.11-23). */
  avMas2AtCoefRaiz: 0.062,
  avMas2AtMinimo: 0.35,
  /** Refuerzo longitudinal mínimo: 0.42 √f′c Acp / fy − (At/s) ph fyt/fy (Ec. C.11-24); At/s ≥ 0.175 bw / fyt. */
  alMinCoefRaiz: 0.42,
  atSobreSMinimo: 0.175,
  /** fy y fyt de torsión no mayores que 420 MPa (C.11.5.3.4). */
  fyMax: 420,
  /** Separación máxima de estribos de torsión: el menor entre ph/8 y 300 mm (C.11.5.6.1). */
  separacionMaxFraccionPh: 1 / 8,
  separacionMaxMm: 300,
  /** Separación máxima del refuerzo longitudinal de torsión: 300 mm (C.11.5.6.2). */
  separacionLongitudinalMaxMm: 300,
  /** Diámetro mínimo de barra longitudinal: 0.042 s, no menos de No. 3 (10 mm) (C.11.5.6.2). */
  diametroLongitudinalFraccionS: 0.042,
  diametroLongitudinalMinMm: 10,
  /** Distancia del eje del refuerzo a la cara interior de la pared hueca ≥ 0.5 Aoh/ph (C.11.5.4.4). */
  distanciaParedHuecaFraccion: 0.5,
  /** Relación de forma mínima para el diseño alternativo de secciones sólidas: h/bt ≥ 3 (C.11.5.7). */
  relacionFormaDisenoAlternativo: 3,
} as const;

/* ---------- C.11.6: cortante por fricción ---------- */

export type TipoSuperficieFriccion = 'monolitico' | 'rugosa' | 'no-rugosa' | 'acero';

/** Coeficiente de fricción μ (se multiplica por λ) — C.11.6.4.3, PDF p.397, C-97. */
export const TABLA_MU_FRICCION: readonly { id: TipoSuperficieFriccion; descripcion: string; mu: number }[] = [
  { id: 'monolitico', descripcion: 'Concreto colocado monolíticamente', mu: 1.4 },
  { id: 'rugosa', descripcion: 'Concreto colocado sobre concreto endurecido con la superficie intencionalmente rugosa (amplitud completa de unos 6 mm, C.11.6.9)', mu: 1.0 },
  { id: 'no-rugosa', descripcion: 'Concreto colocado sobre concreto endurecido no intencionalmente rugoso', mu: 0.6 },
  { id: 'acero', descripcion: 'Concreto anclado a acero estructural mediante pernos con cabeza o barras de refuerzo (C.11.6.10)', mu: 0.7 },
];

/** Límites de Vn en cortante por fricción (C.11.6.5, PDF p.397, C-97). Los valores 3.3, 11 y 5.5 están en MPa. */
export const LIMITES_VN_FRICCION = {
  /** Concreto normal monolítico o sobre superficie rugosa: menor de 0.2 f′c Ac, (3.3 + 0.08 f′c) Ac y 11 Ac. */
  rugosoNormal: { a: 0.2, b0: 3.3, b1: 0.08, c: 11 },
  /** Demás casos: menor de 0.2 f′c Ac y 5.5 Ac. */
  otros: { a: 0.2, c: 5.5 },
} as const;
/** λ máximo para λ determinada por dosificación volumétrica en C.11.6.4.3 (no debe exceder de 0.85); 0.75 si todo liviano. */
export const LAMBDA_FRICCION = { normal: 1.0, livianoTotal: 0.75, maximoMixto: 0.85 } as const;

/* ---------- C.11.7: vigas altas ---------- */

/** Vigas altas (C.11.7, PDF p.398, C-98). */
export const VIGAS_ALTAS = {
  /** ln ≤ 4h (o regiones con cargas concentradas dentro de 2h del apoyo) (C.11.7.1). */
  relacionLnH: 4,
  /** Vn ≤ 0.83 √f′c bw d (C.11.7.3). */
  vnMaxCoef: 0.83,
  /** Av ≥ 0.0025 bw s, con s ≤ menor de d/5 y 300 mm (C.11.7.4). */
  avMinCuantia: 0.0025,
  /** Avh ≥ 0.0015 bw s2, con s2 ≤ menor de d/5 y 300 mm (C.11.7.5). */
  avhMinCuantia: 0.0015,
  separacionMaxFraccionD: 1 / 5,
  separacionMaxMm: 300,
} as const;

/* ---------- C.11.8: ménsulas y cartelas ---------- */

/** Ménsulas y cartelas (C.11.8, PDF p.398–399, C-98–C-99). */
export const MENSULAS = {
  /** Se puede usar C.11.8.3–C.11.8.4 si av/d ≤ 1 y Nuc ≤ Vu (C.11.8.1). Con av/d < 2 se puede usar el Apéndice C-A. */
  avSobreDMax: 1,
  avSobreDApendiceA: 2,
  /** La altura en el borde exterior del apoyo no menor de 0.5d (C.11.8.2). */
  alturaBordeFraccionD: 0.5,
  /** Nuc no menor que 0.2 Vu salvo medidas especiales (C.11.8.3.4). */
  nucMinFraccionVu: 0.2,
  /** Asc ≥ mayor de (Af + An) y (2Avf/3 + An) (C.11.8.3.5). */
  ascFraccionAvf: 2 / 3,
  /** Ah ≥ 0.5 (Asc − An), distribuido en los 2d/3 adyacentes al refuerzo principal (C.11.8.4). */
  ahFraccionAsc: 0.5,
  ahZonaFraccionD: 2 / 3,
  /** Asc/(bd) ≥ 0.04 f′c/fy (C.11.8.5). */
  cuantiaMinCoef: 0.04,
  /** Vn de concreto de densidad normal: menor de 0.2 f′c bw d, (3.3 + 0.08 f′c) bw d y 11 bw d (C.11.8.3.2.1). */
  vnMaxNormal: { a: 0.2, b0: 3.3, b1: 0.08, c: 11 },
  /** Concreto liviano: menor de (0.2 − 0.07 av/d) f′c bw d y (5.5 − 1.9 av/d) bw d (C.11.8.3.2.2). */
  vnMaxLiviano: { a0: 0.2, a1: 0.07, c0: 5.5, c1: 1.9 },
} as const;

/* ---------- C.11.9: muros ---------- */

/** Muros (C.11.9, PDF p.399–401, C-99–C-101). */
export const MUROS = {
  /** Vn ≤ 0.83 √f′c h d (C.11.9.3). */
  vnMaxCoef: 0.83,
  /** d = 0.8 ℓw (C.11.9.4). */
  dFraccionLw: 0.8,
  /** Vc ≤ 0.17 λ √f′c h d para muros con compresión axial (C.11.9.5). */
  vcMaxCompresion: 0.17,
  /** Ec. C.11-27: Vc = 0.27 λ √f′c h d + Nu d / (4 ℓw). */
  c1127: { coefRaiz: 0.27, divisorLw: 4 },
  /** Ec. C.11-28: Vc = [0.05 λ √f′c + ℓw (0.1 λ √f′c + 0.2 Nu/(ℓw h)) / (Mu/Vu − ℓw/2)] h d. */
  c1128: { coefRaiz: 0.05, coefRaizAlma: 0.1, coefNu: 0.2 },
  /** Refuerzo horizontal: ρt ≥ 0.0025 (C.11.9.9.2); s ≤ menor de ℓw/5, 3h y 450 mm (C.11.9.9.3). */
  rhoHorizontalMin: 0.0025,
  sHorizontalMax: { fraccionLw: 1 / 5, vecesH: 3, mm: 450 },
  /** Refuerzo vertical (C.11.9.9.4, Ec. C.11-30): ρℓ = 0.0025 + 0.5 (2.5 − hw/ℓw)(ρt − 0.0025) ≥ 0.0025. */
  rhoVerticalMin: 0.0025,
  c1130: { base: 0.0025, coef: 0.5, relacion: 2.5 },
  /** s vertical ≤ menor de ℓw/3, 3h y 450 mm (C.11.9.9.5). */
  sVerticalMax: { fraccionLw: 1 / 3, vecesH: 3, mm: 450 },
  /** Si Vu < 0.5 φVc el refuerzo puede ser el del Capítulo C.14 (C.11.9.8). */
  fraccionPhiVcC14: 0.5,
} as const;

/* ---------- C.11.11: losas y zapatas (cortante en dos direcciones) ---------- */

export type UbicacionColumna = 'interior' | 'borde' | 'esquina';

/** αs de la Ec. C.11-32: 40 interior, 30 borde, 20 esquina (C.11.11.2.1, PDF p.403, C-101). */
export const ALPHA_S: Record<UbicacionColumna, number> = { interior: 40, borde: 30, esquina: 20 };

/** Coeficientes de Vc en dos direcciones, losas no preesforzadas y zapatas (Ecs. C.11-31 a C.11-33, PDF p.403–404, C-101/C-102). */
export const VC_DOS_DIRECCIONES = {
  /** (a) Vc = 0.17 (1 + 2/β) λ √f′c bo d. */
  c1131: { coef: 0.17, dos: 2 },
  /** (b) Vc = 0.083 (αs d/bo + 2) λ √f′c bo d. */
  c1132: { coef: 0.083, dos: 2 },
  /** (c) Vc = 0.33 λ √f′c bo d. */
  c1133: { coef: 0.33 },
} as const;

/** Losas preesforzadas en dos direcciones (Ec. C.11-34, C.11.11.2.2, PDF p.404, C-102). */
export const VC_DOS_DIRECCIONES_PREESFORZADO = {
  /** βp = menor de 0.29 y 0.083 (αs d/bo + 1.5). */
  betaPMax: 0.29,
  betaPCoef: 0.083,
  betaPSuma: 1.5,
  /** Vc = (βp λ √f′c + 0.3 fpc) bo d + Vp. */
  coefFpc: 0.3,
  /** fpc entre 0.9 y 3.5 MPa en cada dirección (C.11.11.2.2(c)). */
  fpcMinMPa: 0.9,
  fpcMaxMPa: 3.5,
  /** Columna a no menos de 4 veces el espesor de losa de un borde discontinuo (C.11.11.2.2(a)). */
  bordeDiscontinuoVecesH: 4,
} as const;

/** Refuerzo de cortante en losas y zapatas (C.11.11.3 a C.11.11.5, PDF p.404–406, C-102–C-104). */
export const REFUERZO_CORTANTE_LOSAS = {
  /** d ≥ 150 mm y ≥ 16 veces el diámetro de la barra del refuerzo de cortante (C.11.11.3). */
  dMinMm: 150,
  dMinVecesDiametroBarra: 16,
  estribos: {
    /** Vc ≤ 0.17 λ √f′c bo d (C.11.11.3.1). */
    vcMax: 0.17,
    /** Vn ≤ 0.5 √f′c bo d (C.11.11.3.2). */
    vnMax: 0.5,
    /** Primera línea a ≤ d/2 de la cara de la columna; entre ramas adyacentes ≤ 2d; entre líneas ≤ d/2 (C.11.11.3.3). */
    primeraLineaFraccionD: 0.5,
    separacionRamasVecesD: 2,
    separacionLineasFraccionD: 0.5,
  },
  pernos: {
    /** Vc ≤ 0.25 λ √f′c bo d y Vn ≤ 0.66 √f′c bo d (C.11.11.5.1). */
    vcMax: 0.25,
    vnMax: 0.66,
    /** Av fy / (bo s) ≥ 0.17 √f′c (C.11.11.5.1). */
    avMinCoef: 0.17,
    /** Primera línea a ≤ d/2 (C.11.11.5.2). Entre líneas: 0.75d si vu ≤ 0.5 φ√f′c; 0.5d si es mayor. */
    primeraLineaFraccionD: 0.5,
    separacionLineasFraccionD: 0.75,
    separacionLineasFraccionDAlta: 0.5,
    umbralEsfuerzoCoef: 0.5,
    /** Separación entre pernos adyacentes en el perímetro de la primera línea ≤ 2d (C.11.11.5.3). */
    separacionPernosVecesD: 2,
    /** Esfuerzo máximo a d/2 fuera de la línea más externa ≤ 0.17 φ λ √f′c (C.11.11.5.4, C.11.11.7.2(b)). */
    esfuerzoExteriorCoef: 0.17,
  },
  /** Cabezas de cortante (C.11.11.4): Vn ≤ 0.33 √f′c bo d en la sección de C.11.11.4.7 y ≤ 0.58 √f′c bo d en C.11.11.1.2(a). */
  cabezas: {
    vnMaxSeccionCabeza: 0.33,
    vnMaxSeccionColumna: 0.58,
    alturaMaxVecesAlma: 70,
    alaCompresionFraccionD: 0.3,
    alphaVMin: 0.15,
    momentoMaxFraccionFranja: 0.3,
    cortePuntaGradosMin: 30,
    esfuerzoTransferenciaMomentoCoef: 0.33,
  },
} as const;

/** Sección crítica de punzonamiento: perímetro mínimo a no menos de d/2 de la columna (C.11.11.1.2, PDF p.403, C-101). */
export const SECCION_CRITICA_DISTANCIA_FRACCION_D = 0.5;
/** Aberturas: efecto si están a menos de 10 veces el espesor de la losa de la carga o reacción (C.11.11.6, PDF p.406, C-104). */
export const ABERTURAS_VECES_H = 10;
