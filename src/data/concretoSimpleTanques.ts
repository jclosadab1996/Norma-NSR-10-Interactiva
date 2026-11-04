/**
 * Título C — Capítulo C.22 (Concreto estructural simple) y Capítulo C.23 (Tanques y estructuras de ingeniería
 * ambiental de concreto). Datos transcritos del PDF (PDF 503–524, impresas C-201 a C-222; PDF = impresa + 302)
 * y verificados contra la imagen de cada página. Unidades del SI (MPa, mm, kN).
 */

/* ═════════════════════════════ C.22 — Concreto estructural simple ═════════════════════════════ */

/** C.9.3.5 (PDF p.371, C-69) y C.22: φ = 0.60 en flexión, compresión, cortante y aplastamiento del concreto simple. */
export const PHI_CONCRETO_SIMPLE = 0.6;

/** C.22.4.7 (PDF p.504, C-202): contra el suelo, la altura total h se toma 50 mm menor que la real. */
export const REDUCCION_H_CONTRA_SUELO_MM = 50;

/** Coeficientes de las ecuaciones de C.22.5 (PDF p.504–505, C-202 y C-203). */
export const COEF_C22 = {
  /** C.22-2: Mn = 0.42 λ √f′c Sm (controla la tracción). */
  flexionTraccion: 0.42,
  /** C.22-3: Mn = 0.85 f′c Sm (controla la compresión). */
  flexionCompresion: 0.85,
  /** C.22-5: Pn = 0.60 f′c [1 − (ℓc / 32h)²] A1. */
  compresionElemento: 0.6,
  /** C.22-5 y C.22-14: divisor 32 de ℓc/(32h). */
  divisorEsbeltez: 32,
  /** C.22-14: Pn = 0.45 f′c Ag [1 − (ℓc / 32h)²] (método empírico de muros, C.22.6.5.2; PDF p.506, C-204). */
  muroEmpirico: 0.45,
  /** C.22-9: Vn = 0.11 λ √f′c bw h (acción como viga). */
  cortanteViga: 0.11,
  /** C.22-10: Vn = 0.11 (1 + 2/β) λ √f′c bo h (dos direcciones). */
  cortanteDosDirecciones: 0.11,
  /** Tope de C.22-10: Vn ≤ 0.22 λ √f′c bo h. */
  cortanteDosDireccionesMax: 0.22,
  /** C.22-12: Bn = 0.85 f′c A1. */
  aplastamiento: 0.85,
  /** C.22.5.5: el factor √(A2/A1) no puede pasar de 2. */
  factorAplastamientoMax: 2,
  /** C.22-7: límite de tracción φ 0.42 λ √f′c en la cara de tracción (mismo 0.42 de C.22-2). */
  traccionCaraTraccion: 0.42,
} as const;

/** Límites geométricos y de detalle de C.22.6 a C.22.10 (PDF p.505–508, C-203 a C-206). */
export const LIMITES_C22 = {
  /** C.22.6.3: excentricidad no menor que 0.10 h en muros. */
  excentricidadMinimaMuro: 0.1,
  /** C.22.6.6.1: la longitud efectiva de muro por carga concentrada no pasa del ancho de apoyo + 4 veces el espesor. */
  vecesEspesorLongitudEfectiva: 4,
  /** C.22.6.6.2: espesor de muros de carga ≥ 1/24 de la longitud o altura no apoyada (la menor). */
  divisorEspesorMuro: 24,
  /** C.22.6.6.2: y no menor de 140 mm. */
  espesorMinimoMuroMm: 140,
  /** C.22.6.6.3: muros exteriores de sótano y de cimentación ≥ 190 mm. */
  espesorMinimoMuroSotanoMm: 190,
  /** C.22.6.6.5: al menos dos barras No. 5 (5/8") ó 16M (16 mm) alrededor de ventanas y puertas. */
  barrasAberturas: { cantidad: 2, diametroMm: 16 },
  /** C.22.6.6.5: las barras se extienden al menos 600 mm más allá de las esquinas de la abertura. */
  extensionBarrasAberturasMm: 600,
  /** C.22.7.4: espesor de zapatas de concreto simple ≥ 200 mm (ver C.22.4.7). */
  espesorMinimoZapataMm: 200,
  /** C.22.7.6.2(b): sección crítica de dos direcciones a h/2 del perímetro de la carga. */
  distanciaCriticaPunzonamiento: 0.5,
  /** C.22.8.2: relación altura no apoyada / promedio de la menor dimensión lateral de pedestales ≤ 3. */
  esbeltezMaximaPedestal: 3,
  /** C.22.10.1(b): zapatas de concreto simple con refuerzo longitudinal bajo muros reforzados en DES: 2 barras ≥ No. 4 (12M). */
  desZapataBarras: { cantidad: 2, diametroMm: 12 },
  /** C.22.10.1(b): área de refuerzo ≥ 0.002 Ag. */
  desZapataCuantiaMin: 0.002,
  /** C.22.10.1(c): muros de cimentación de concreto simple en vivienda liviana: ancho ≥ 190 mm. */
  desMuroCimentacionAnchoMm: 190,
  /** C.22.10.1(c): y contención de relleno no balanceado ≤ 1.2 m. */
  desMuroCimentacionRellenoMaxM: 1.2,
} as const;

/* ═════════════════════════════ C.23 — Tanques y estructuras ambientales ═════════════════════════════ */

/** C.23-C.1.1.1 (PDF p.509, C-207): f′c mínimo para estructuras de ingeniería ambiental y sanitaria. */
export const FC_MIN_AMBIENTAL_MPA = 28;

/** Tabla C.23-C.4.1.1 (PDF p.511, C-209): contenido mínimo de materiales cementantes. Se permite interpolar. */
export const TABLA_CEMENTANTE_MIN: readonly { tamanoMm: number; tamiz: string; kgM3: number }[] = [
  { tamanoMm: 38, tamiz: '467', kgM3: 320 },
  { tamanoMm: 25, tamiz: '57', kgM3: 330 },
  { tamanoMm: 20, tamiz: '67', kgM3: 350 },
  { tamanoMm: 13, tamiz: '7', kgM3: 360 },
  { tamanoMm: 10, tamiz: '8', kgM3: 370 },
];

/** Clases de exposición de la Tabla C.23-C.4.2.1 (PDF p.512, C-210). */
export type ClaseExposicionAmbiental =
  | 'F0' | 'F1' | 'F2' | 'F3' | 'S0' | 'S1' | 'S2' | 'S3' | 'P0' | 'P1' | 'C0' | 'C1' | 'C2' | 'Q0' | 'Q1';

/** Tabla C.23-C.4.2.1 (PDF p.512, C-210). Las cotas de S1 y S2 están cortadas en el PDF; ver erratas del capítulo. */
export const TABLA_EXPOSICION_AMBIENTAL: readonly {
  clase: ClaseExposicionAmbiental;
  categoria: string;
  severidad: string;
  condicion: string;
}[] = [
  { clase: 'F0', categoria: 'F — Congelamiento y deshielo', severidad: 'No es aplicable', condicion: 'Concreto no expuesto a ciclos de congelamiento y deshielo' },
  { clase: 'F1', categoria: 'F — Congelamiento y deshielo', severidad: 'Moderada', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo y exposición ocasional a la humedad' },
  { clase: 'F2', categoria: 'F — Congelamiento y deshielo', severidad: 'Severa', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo y en contacto continuo con la humedad' },
  { clase: 'F3', categoria: 'F — Congelamiento y deshielo', severidad: 'Muy severa', condicion: 'Concreto expuesto a ciclos de congelamiento y deshielo que estará en contacto continuo con la humedad y expuesto a productos químicos descongelantes' },
  { clase: 'S0', categoria: 'S — Sulfato', severidad: 'No aplicable', condicion: 'SO4 en el suelo < 0.10 % en peso; SO4 disuelto en agua < 150 ppm' },
  { clase: 'S1', categoria: 'S — Sulfato', severidad: 'Moderada', condicion: 'SO4 en el suelo 0.10 % ≤ SO4 < 0.20 % (cota superior cortada en el PDF); en agua 150 ≤ SO4 < 1500 ppm; agua marina' },
  { clase: 'S2', categoria: 'S — Sulfato', severidad: 'Severa', condicion: 'SO4 en el suelo 0.20 % ≤ SO4 ≤ 2.00 % (cotas cortadas en el PDF); en agua 1500 ≤ SO4 ≤ 10000 ppm' },
  { clase: 'S3', categoria: 'S — Sulfato', severidad: 'Muy severa', condicion: 'SO4 en el suelo > 2.00 %; en agua > 10000 ppm' },
  { clase: 'P0', categoria: 'P — Requiere baja permeabilidad', severidad: 'No aplicable', condicion: 'En contacto con el agua donde no se requiere baja permeabilidad' },
  { clase: 'P1', categoria: 'P — Requiere baja permeabilidad', severidad: 'Requerida', condicion: 'En contacto con el agua donde se requiera baja permeabilidad' },
  { clase: 'C0', categoria: 'C — Protección del refuerzo para la corrosión', severidad: 'No aplicable', condicion: 'Concreto seco o protegido contra la humedad' },
  { clase: 'C1', categoria: 'C — Protección del refuerzo para la corrosión', severidad: 'Moderada', condicion: 'Concreto expuesto a la humedad, pero no a una fuente externa de cloruros' },
  { clase: 'C2', categoria: 'C — Protección del refuerzo para la corrosión', severidad: 'Severa', condicion: 'Concreto expuesto a la humedad y a una fuente externa de cloruros provenientes de productos químicos descongelantes, sal, agua salobre, agua de mar o salpicaduras del mismo origen' },
  { clase: 'Q0', categoria: 'Q — Exposición a químicos corrosivos', severidad: 'No aplicable', condicion: 'Concreto que no está expuesto a químicos corrosivos' },
  { clase: 'Q1', categoria: 'Q — Exposición a químicos corrosivos', severidad: 'Severa', condicion: 'Concreto expuesto a químicos corrosivos diferentes de descongelantes' },
];

export type RequisitoMezclaAmbiental = {
  clase: 'F3' | 'S0' | 'S1' | 'S2' | 'S3' | 'P1' | 'Q1';
  /** Relación agua/material cementante máxima. */
  aMcMax: number;
  /** f′c mínimo, MPa. */
  fcMin: number;
  /** Texto de los requisitos adicionales (contenido de aire, tipos de cemento, CaCl2). */
  adicionales: string;
};

/**
 * Tabla C.23-C.4.3.1 (PDF p.513, C-211): requisitos para el concreto según la clase de exposición
 * (solo las clases que modifican la Tabla C.4.3.1).
 */
export const TABLA_MEZCLA_AMBIENTAL: readonly RequisitoMezclaAmbiental[] = [
  { clase: 'F3', aMcMax: 0.42, fcMin: 31, adicionales: 'Contenido de aire: Tabla C.4.4.1. Límites en los cementantes: Tabla C.4.4.2.' },
  { clase: 'S0', aMcMax: 0.45, fcMin: 28, adicionales: 'Sin restricción en el tipo de cemento (ASTM C 150, C 595, C 1157). Cloruro de calcio: sin restricción.' },
  { clase: 'S1', aMcMax: 0.42, fcMin: 31, adicionales: 'ASTM C 150: tipo II; ASTM C 595: IP(MS), IS(<70)(MS); ASTM C 1157: MS. Cloruro de calcio: sin restricción.' },
  { clase: 'S2', aMcMax: 0.4, fcMin: 35, adicionales: 'ASTM C 150: tipo V; ASTM C 595: IP(HS), IS(<70)(HS); ASTM C 1157: HS. No se permite cloruro de calcio.' },
  { clase: 'S3', aMcMax: 0.4, fcMin: 35, adicionales: 'ASTM C 150: tipo V más puzolanas o escoria; ASTM C 595: IP(HS) y puzolanas o escoria, o IS(<70)(HS) y puzolanas o escoria; ASTM C 1157: HS y puzolanas o escoria. No se permite cloruro de calcio.' },
  { clase: 'P1', aMcMax: 0.45, fcMin: 28, adicionales: 'Ninguna.' },
  { clase: 'Q1', aMcMax: 0.42, fcMin: 31, adicionales: 'Ninguna.' },
];

/** C.23-C.4.8.3 (PDF p.514, C-212): requisitos adicionales del concreto expuesto a erosión por abrasión. */
export const ABRASION = {
  fcMinMpa: 35,
  aMcMax: 0.4,
  /** Máximo contenido de aire, %: 6 % en general; 3 % si no estará sometido a congelamiento y deshielo. */
  aireMaxPct: 6,
  aireMaxSinCongelamientoPct: 3,
  cementanteMinKgM3: 380,
} as const;

/** C.23-C.4.8.2(c) (PDF p.514, C-212): relación aire/líquido cerca de la frontera sólida ≈ 8 % por volumen. */
export const AIRE_ANTI_CAVITACION_PCT = 8;

/** C.23-C.4.9.4 (PDF p.515, C-213): transmisión de vapor de revestimientos < 1×10⁻⁶ cm/s (34 g/h/m²), ASTM E 96. */
export const TRANSMISION_VAPOR_MAX = { cmPorS: 1e-6, gPorHPorM2: 34 } as const;

/** Juntas (C.23-C.4.10, C.23-C.6, PDF p.515–517, C-213 a C-215). */
export const JUNTAS = {
  /** C.23-C.4.10.2: espesor mínimo de barreras de caucho y PVC, mm. */
  barreraEspesorMinMm: 9.5,
  /** C.23-C.4.10.2: ancho mínimo, repartido mitad y mitad: juntas de expansión 220 mm; otras 150 mm. */
  barreraAnchoMinExpansionMm: 220,
  barreraAnchoMinOtrasMm: 150,
  /** C.23-C.4.10.2: barreras de acero: platina de 6 mm, embebida ≥ 75 mm a cada lado. */
  barreraAceroEspesorMm: 6,
  barreraAceroEmbebidoMm: 75,
  /** C.23-C.4.10.3: el relleno ideal resiste compresiones hasta la mitad de su espesor. */
  rellenoCompresionFraccion: 0.5,
  /** C.23-C.4.10.6.2 y C.23-C.6.4.9: lapso mínimo entre el vaciado de unidades adyacentes, horas. */
  lapsoVaciadoMinHoras: 48,
  /** C.23-C.6.1.7.1: sin elementos de amarre metálicos u otros dentro de 40 mm de la superficie. */
  amarresDistanciaMinMm: 40,
  /** C.23-C.6.5.3(a): en juntas de contracción de profundidad total el refuerzo se suspende a 50 mm de la junta. */
  refuerzoSuspendidoMm: 50,
  /** C.23-C.6.5.3(b): el refuerzo que pasa en juntas parciales no es más del 50 % del perpendicular a la junta. */
  parcialRefuerzoPasaMaxFraccion: 0.5,
  /** C.23-C.6.5.3(b): se espacian a ≈ 2/3 de las juntas de profundidad total. */
  parcialEspaciamientoFraccion: 2 / 3,
  /** C.23-C.15.14.5.1: barreras integrales: no en secciones con espesor menor de 125 mm; ≥ 25 mm de concreto sobre la barrera y ≥ 25 mm al refuerzo. */
  barreraIntegralEspesorSeccionMinMm: 125,
  barreraRecubrimientoMinMm: 25,
} as const;

export type ColumnaRecubrimiento = 'enSitio' | 'prefabricado' | 'preesforzado';

/** Una fila de la Tabla C.23-C.7.7.1; `null` = «No aplica». Valores en mm. */
export type FilaRecubrimientoAmbiental = {
  /** (a) contra tierra; (b) expuesto a tierra, líquidos, intemperie o en losas que sostienen rellenos; (c) otras. */
  condicion: 'a' | 'b' | 'c';
  elemento: string;
  detalle?: string;
  enSitio: number | null;
  prefabricado: number | null;
  preesforzado: number | null;
  /** Notas 2 o 3 de la tabla para prefabricado (ductos de preesforzado menores / mayores o iguales a 40 mm). */
  notaPrefabricado?: 2 | 3;
};

/** Tabla C.23-C.7.7.1 (PDF p.517, C-215), verificada contra la imagen. */
export const TABLA_RECUBRIMIENTO_AMBIENTAL: readonly FilaRecubrimientoAmbiental[] = [
  { condicion: 'a', elemento: 'Concreto vaciado contra la tierra y en permanente contacto con ella', enSitio: 75, prefabricado: null, preesforzado: 75 },
  { condicion: 'b', elemento: 'Losas y viguetas', enSitio: 50, prefabricado: 40, preesforzado: 40 },
  { condicion: 'b', elemento: 'Vigas y columnas', detalle: 'Estribos y espirales', enSitio: 50, prefabricado: 40, preesforzado: 40 },
  { condicion: 'b', elemento: 'Vigas y columnas', detalle: 'Refuerzo principal', enSitio: 65, prefabricado: 50, preesforzado: 50 },
  { condicion: 'b', elemento: 'Muros', enSitio: 50, prefabricado: 40, preesforzado: 40 },
  { condicion: 'b', elemento: 'Zapatas y losas de base', detalle: 'Superficies vaciadas contra formaleta', enSitio: 50, prefabricado: null, preesforzado: null },
  { condicion: 'b', elemento: 'Zapatas y losas de base', detalle: 'Superficie superior de zapatas y losas de base', enSitio: 50, prefabricado: null, preesforzado: null },
  { condicion: 'b', elemento: 'Cascarones y losas plegadas', enSitio: 40, prefabricado: 25, preesforzado: 25 },
  { condicion: 'c', elemento: 'Losas y viguetas', detalle: 'Barras No. 11 (36M) y menores', enSitio: 20, prefabricado: 20, preesforzado: 20, notaPrefabricado: 2 },
  { condicion: 'c', elemento: 'Losas y viguetas', detalle: 'Barras No. 14 (45M) y No. 18 (55M)', enSitio: 40, prefabricado: 40, preesforzado: 40, notaPrefabricado: 3 },
  { condicion: 'c', elemento: 'Vigas y columnas', detalle: 'Estribos y espirales', enSitio: 40, prefabricado: 25, preesforzado: 25 },
  { condicion: 'c', elemento: 'Vigas y columnas', detalle: 'Refuerzo principal', enSitio: 50, prefabricado: 40, preesforzado: 40 },
  { condicion: 'c', elemento: 'Muros', detalle: 'Barras No. 11 (36M) y menores', enSitio: 20, prefabricado: 20, preesforzado: 20, notaPrefabricado: 2 },
  { condicion: 'c', elemento: 'Muros', detalle: 'Barras No. 14 (45M) y No. 18 (55M)', enSitio: 40, prefabricado: 40, preesforzado: 40, notaPrefabricado: 3 },
  { condicion: 'c', elemento: 'Cascarones y losas plegadas', detalle: 'Barras No. 5 (16M), alambre MW30 o MD30 (6.2 mm) o menores', enSitio: 13, prefabricado: 20, preesforzado: 20 },
  { condicion: 'c', elemento: 'Cascarones y losas plegadas', detalle: 'Barras No. 6 (20M) y mayores', enSitio: 20, prefabricado: 25, preesforzado: 25 },
];

export type FilaRetraccionAmbiental = {
  /** Intervalo de distancia entre juntas para compensar movimientos, m: [desde, hasta). hasta = Infinity en la última fila. */
  desdeM: number;
  hastaM: number;
  rotulo: string;
  fy240: number;
  fy420: number;
};

/** Tabla C.23-C.7.12.2.1 (PDF p.518, C-216): cuantías mínimas de retracción de fraguado y variación de temperatura. */
export const TABLA_RETRACCION_AMBIENTAL: readonly FilaRetraccionAmbiental[] = [
  { desdeM: 0, hastaM: 6, rotulo: 'menos de 6 m', fy240: 0.003, fy420: 0.003 },
  { desdeM: 6, hastaM: 9, rotulo: '6 a menos de 9 m', fy240: 0.004, fy420: 0.003 },
  { desdeM: 9, hastaM: 12, rotulo: '9 a menos de 12 m', fy240: 0.005, fy420: 0.004 },
  { desdeM: 12, hastaM: Infinity, rotulo: '12 m o más', fy240: 0.006, fy420: 0.005 },
];

/** C.23-C.7.12.2.1 (PDF p.518): factor de la nota † para juntas de contracción de profundidad parcial. */
export const FACTOR_JUNTA_PARCIAL = 1.5;
/** C.23-C.7.12.2.1: espesores ≥ 600 mm se calculan con una capa de 300 mm en cada superficie. */
export const RETRACCION_ESPESOR_GRUESO_MM = 600;
export const RETRACCION_CAPA_EFECTIVA_MM = 300;
/** C.23-C.7.12.2.1: refuerzo de la cara inferior de losas sobre el suelo reducible en 50 %. */
export const RETRACCION_REDUCCION_LOSA_SUELO = 0.5;
/** C.23-C.7.12.2.2: separación máxima 300 mm, barra mínima No. 4 (12M), al menos 1/3 del área en cada cara. */
export const RETRACCION_SEPARACION_MAX_MM = 300;
export const RETRACCION_BARRA_MIN_MM = 12;
export const RETRACCION_FRACCION_MIN_POR_CARA = 1 / 3;

/** Esfuerzos permisibles fs del refuerzo para el coeficiente Sd (C.23-C.9.2.6.2 a .5; PDF p.519, C-217), MPa. */
export const FS_DURABILIDAD_MPA = {
  traccionDirecta: { normal: 140, severa: 120 },
  cortante: { normal: 170, severa: 140 },
} as const;

/** C.23-C.10.6.4 (PDF p.520, C-218): control de fisuración por esfuerzo de servicio en el refuerzo. */
export const FISURACION = {
  /** C.23-2 (exposición normal) y C.23-3 (severa): numeradores, MPa·mm. */
  numeradorNormal: 57000,
  numeradorSevera: 46500,
  /** Pisos por los que «no hay necesidad» de bajar fs,max, MPa. */
  pisoNormal: { unaDireccion: 140, dosDirecciones: 170 },
  pisoSevera: { unaDireccion: 120, dosDirecciones: 140 },
  /** Máximo absoluto de fs, MPa. */
  fsMaxAbsolutoMpa: 250,
  /** C.23-C.10.6.4.3: valor simplificado del término 4(50 + db/2)². */
  terminoSimplificado: 15625,
  /** C.23-C.10.6.4.4: β simplificado: 1.2 para h ≥ 400 mm; 1.35 para h < 400 mm. */
  betaGrande: 1.2,
  betaPequena: 1.35,
  hLimiteBetaMm: 400,
  /** C.23-C.10.6.4.5: exposición normal = pH > 5 y/o sulfatos ≤ 1000 ppm. */
  phMinNormal: 5,
  sulfatosMaxNormalPpm: 1000,
  /** C.23-C.10.6.2: relación lado largo / lado corto ≤ 2 → losa en dos direcciones. */
  relacionLadosDosDirecciones: 2,
  /** C.23-C.10.6.5 (PDF p.520–521): con recubrimiento > 75 mm y apariencia importante. */
  recubrimientoApariencia: 75,
  /** C.23-5: s = 380 (280/fs) − 2.5 cc, con s ≤ 300 mm. */
  coefS: 380,
  fsReferencia: 280,
  coefCc: 2.5,
  sMaxMm: 300,
} as const;

/** C.23-C.10.5.3 (PDF p.519, C-217): exención de refuerzo mínimo si As ≥ (4/3) As requerido (sin Sd). */
export const FACTOR_EXENCION_REFUERZO_MINIMO = 4 / 3;

/** Muros (C.23-C.14, PDF p.521–522, C-219 a C-220). */
export const MUROS_AMBIENTALES = {
  /** C.23-C.14.3.2: cuantía mínima vertical. */
  cuantiaVerticalMin: 0.003,
  /** C.23-C.14.3.4: con espesor > 250 mm, dos capas. */
  espesorDosCapasMm: 250,
  capaExteriorFraccion: { min: 1 / 2, max: 2 / 3 },
  /** C.23-C.14.3.4: cada capa a no más de 1/3 del espesor desde su superficie. */
  capaDistanciaMaxEspesor: 1 / 3,
  /** C.23-C.14.3.5: separación máxima del refuerzo vertical y horizontal, mm. */
  separacionMaxMm: 300,
  /** C.23-C.14.3.6: sin estribos laterales si ρ vertical ≤ 0.01 Ag o si no se requiere como refuerzo de compresión. */
  cuantiaSinEstribos: 0.01,
  /** C.23-C.14.3.7: barras adicionales en aberturas: desarrollar fy y no menos de 600 mm. */
  extensionAberturasMm: 600,
  /** C.23-C.14.5.3.1: muros de carga: espesor ≥ 1/25 de la altura o longitud (la menor) y ≥ 200 mm. */
  divisorEspesorCarga: 25,
  espesorMinimoCargaMm: 200,
  /** C.23-C.14.6.1: muros que no son de carga: ≥ 150 mm y ≥ 1/30 de la distancia mínima entre apoyos laterales. */
  espesorMinimoNoCargaMm: 150,
  divisorEspesorNoCarga: 30,
  /** C.23-C.14.6.2: muros en contacto con líquidos y más de 3 m de altura: ≥ 300 mm. */
  contactoLiquidoAlturaMm: 3000,
  contactoLiquidoEspesorMm: 300,
} as const;

/** Losas sobre el terreno y losas-membrana (C.23-C.15.14, PDF p.522–524, C-220 a C-222). */
export const LOSAS_TERRENO = {
  /** C.23-C.15.14.2.5: nivel de la sub-base dentro de +0 y −25 mm en cualquier tramo de 30 m. */
  subbaseTolerancia: { masMm: 0, menosMm: 25, longitudM: 30 },
  /** C.23-C.15.14.3.1: espesores mínimos de losas sobre el terreno, mm. */
  espesorMinSobreTerrenoMm: { unaCapa: 100, preesforzada: 125, dosCapas: 150 },
  /** C.23-C.15.14.3.2: espesores mínimos de losas-membrana, mm. */
  espesorMinMembranaMm: { electrosoldado: 75, noPreesforzadaBarrasPequenas: 100, preesforzada: 125 },
  /** C.23-C.15.14.3.3: espesores máximos de losas-membrana, mm. */
  espesorMaxMembranaMm: { noPreesforzada: 150, preesforzada: 175 },
  /** C.23-C.15.14.3.4: tolerancia del nivel de la superficie terminada: −0 / +20 mm, ±6 mm en 3 m. */
  toleranciaSuperficie: { menosMm: 0, masMm: 20, variacionMm: 6, enM: 3 },
  /** C.23-C.15.14.4.1 y .3: esfuerzo de compresión residual por preesforzado, MPa. */
  compresionPreesfuerzoMpa: 1.4,
  /** C.23-C.15.14.4.2: cuantía mínima de losas-membrana no preesforzadas en cada dirección. */
  cuantiaMembrana: 0.005,
  /** C.23-C.15.14.4.2: separación máxima entre alambres paralelos de malla electrosoldada, mm. */
  separacionAlambresMaxMm: 100,
  /** C.23-C.15.14.4.2: separación máxima entre barras corrugadas: el menor entre 300 mm y 2 veces el espesor. */
  separacionBarrasMaxMm: 300,
  /** C.23-C.15.14.4.3: cuantía mínima no preesforzada en losas-membrana preesforzadas. */
  cuantiaMembranaPreesforzada: 0.0015,
  /** C.23-C.15.14.4.4: recubrimiento superior mínimo, mm. */
  recubrimientoSuperiorMm: { sobreTerreno: 40, membrana: 25 },
  /** C.23-C.15.14.4.4: recubrimiento inferior mínimo, mm. */
  recubrimientoInferiorMm: { subbaseEstabilizadaOBarrera: 40, subbaseSinEstabilizar: 50 },
  /** C.23-C.15.14.4.4: losas sobre el terreno de más de 200 mm cumplen el recubrimiento de losas de cimentación. */
  espesorComoCimentacionMm: 200,
} as const;
