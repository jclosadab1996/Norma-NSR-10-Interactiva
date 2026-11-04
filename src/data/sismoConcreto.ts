/**
 * Requisitos de diseño sismo resistente del concreto estructural (Capítulo C.21 de la NSR-10), transcritos del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302. Cada valor se verificó contra la
 * imagen de la página (el texto extraído pierde los radicales y las fracciones).
 *
 *   C.21.1  requisitos generales ................. PDF p.477–479 (C-175 a C-177)
 *   C.21.2  pórticos DMI ......................... PDF p.479–480 (C-177 a C-178)
 *   C.21.3  pórticos DMO (vigas, columnas) ....... PDF p.480–483 (C-178 a C-181)
 *   C.21.4  muros intermedios DMO ................ PDF p.483–484 (C-181 a C-182)
 *   C.21.5  vigas de pórticos DES ................ PDF p.484–486 (C-182 a C-184)
 *   C.21.6  columnas de pórticos DES ............. PDF p.486–489 (C-184 a C-187)
 *   C.21.7  nudos DES ............................ PDF p.489–491 (C-187 a C-189)
 *   C.21.9  muros especiales y vigas de acople ... PDF p.491–495 (C-189 a C-193)
 *   C.21.11 diafragmas y cerchas ................. PDF p.495–498 (C-193 a C-196)
 *   C.21.12 cimentaciones ........................ PDF p.498–499 (C-196 a C-197)
 *   C.21.13 elementos no designados .............. PDF p.499–501 (C-197 a C-199)
 *
 * Unidades: mm, mm², MPa, kN, kN·m. Los símbolos siguen la norma (db, dbe = diámetro de la barra del estribo, hx, so, ℓo).
 */

export type GradoDisipacion = 'DMI' | 'DMO' | 'DES';

/** Pórtico o muro que debe cumplir cada numeral según la capacidad de disipación (C.21.1.1.4 a C.21.1.1.7, PDF p.477, C-175). */
export const NUMERALES_POR_GRADO: Record<GradoDisipacion, { generales: string; porticos: string; muros: string }> = {
  DMI: { generales: 'C.21.1.2', porticos: 'C.21.2', muros: 'ninguno del C.21 (muro ordinario)' },
  DMO: { generales: 'C.21.1.2 a C.21.1.8', porticos: 'C.21.3', muros: 'C.21.4' },
  DES: { generales: 'C.21.1.2 a C.21.1.8 y C.21.11 a C.21.13', porticos: 'C.21.5 a C.21.8', muros: 'C.21.9 y C.21.10' },
};

/* ------------------------------------------------------------------------------------------------ */
/* C.21.1 — Requisitos generales (PDF p.478–479, C-176 a C-177)                                      */
/* ------------------------------------------------------------------------------------------------ */

export const MATERIALES_C211 = {
  /** C.21.1.4.2: f′c ≥ 21 MPa en DMO y DES (exento: hasta tres pisos con muros de carga). */
  fcMin: 21,
  /** C.21.1.4.3: f′c del concreto liviano ≤ 35 MPa salvo evidencia experimental. */
  fcMaxLiviano: 35,
  /** C.21.1.5.2(a): la fluencia real no excede fy en más de 125 MPa. */
  excesoFluenciaMax: 125,
  /** C.21.1.5.2(b): relación resistencia real de tracción / fluencia real ≥ 1.25. */
  relacionTraccionFluenciaMin: 1.25,
  /** C.21.1.5.4: fyt usado para la cuantía de confinamiento ≤ 700 MPa. */
  fytMax: 700,
} as const;

/** Empalmes mecánicos y soldados: no se usan a menos de 2 h de la cara (C.21.1.6.2 y C.21.1.7.1, PDF p.479, C-177). */
export const DISTANCIA_EMPALMES_FACTOR_H = 2;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.2 — Pórticos DMI (PDF p.479–480, C-177 a C-178)                                              */
/* ------------------------------------------------------------------------------------------------ */

export const DMI = {
  /** C.21.2.2: al menos dos barras continuas arriba y abajo (desarrolladas en la cara de apoyo). */
  barrasContinuasViga: 2,
  /** C.21.2.3: columna con altura libre ≤ 5 c1 se diseña para cortante según C.21.3.3. */
  columnaCortaRelacion: 5,
  /** Losas sin vigas (C.21.2.4). */
  losa: {
    fraccionFranjaColumnaEnAnchoEfectivo: 1 / 2, // C.21.2.4.3
    fraccionSuperiorContinua: 1 / 4, // C.21.2.4.4
    fraccionInferiorSobreSuperior: 1 / 3, // C.21.2.4.5
    fraccionInferiorCentroContinua: 1 / 2, // C.21.2.4.6
    factorCortanteGravitacional: 0.4, // C.21.2.4.8: Vug ≤ 0.4 φVc
  },
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.3 — Pórticos DMO (PDF p.480–483, C-178 a C-181)                                               */
/* ------------------------------------------------------------------------------------------------ */

export const DMO_VIGA = {
  /** C.21.3.2: separa la aplicación de C.21.3.4 (Pu ≤ Ag f′c / 10) de C.21.3.5. */
  limiteAxial: 1 / 10,
  /** C.21.3.4.1: bw ≥ 200 mm. */
  bwMin: 200,
  /** C.21.3.4.2: excentricidad con la columna ≤ 25 % del ancho del apoyo. */
  excentricidadMax: 0.25,
  /** C.21.3.4.3: ρ ≤ 0.025; al menos dos barras continuas ≥ No. 4 (12M). */
  rhoMax: 0.025,
  barrasContinuas: 2,
  /** C.21.3.4.4: M+ ≥ 1/3 M− en la cara del nudo; cualquier sección ≥ 1/5 del máximo en la cara. */
  relacionMomentoPositivoNegativo: 1 / 3,
  relacionMomentoSeccion: 1 / 5,
  /** C.21.3.4.6: estribos cerrados No. 3 (10M) mínimo, en 2h desde la cara; primero a ≤ 50 mm. */
  longitudConfinamientoFactorH: 2,
  primerEstriboMax: 50,
  separacion: { dEntre: 4, vecesDbLongitudinal: 8, vecesDbEstribo: 24, maximo: 300 },
  /** C.21.3.4.8: estribos con ganchos sísmicos a ≤ d/2 en toda la longitud. */
  separacionFueraDEntre: 2,
} as const;

export const DMO_COLUMNA = {
  /** C.21.3.5.1: dimensión menor ≥ 250 mm (T, C o I: 200 mm y área ≥ 0.0625 m²). */
  dimensionMin: 250,
  dimensionMinTCI: 200,
  areaMinTCI_m2: 0.0625,
  /** C.21.3.5.2: 0.01 Ag ≤ Ast ≤ 0.04 Ag. */
  cuantiaMin: 0.01,
  cuantiaMax: 0.04,
  /** C.21.3.5.5, Ec. C.21-1: ρs = 0.08 f′c / fyt. */
  coefEspiral: 0.08,
  /** C.21.3.5.6: so = menor de 8 db, 16 dbe, menor dimensión / 3 y 150 mm. */
  so: { vecesDbLongitudinal: 8, vecesDbEstribo: 16, dimensionMenorEntre: 3, maximo: 150 },
  /** C.21.3.5.6: ℓo = mayor de luz libre/6, mayor dimensión y 500 mm. */
  lo: { luzLibreEntre: 6, minimo: 500 },
  /** C.21.3.5.7, Ecs. C.21-2 y C.21-3. */
  ash: { coefConAg: 0.2, coefMinimo: 0.06 },
  /** C.21.3.5.8: ramas o ganchos suplementarios a ≤ 350 mm. */
  hxMax: 350,
  /** C.21.3.5.9: alternativa con No. 3 (10M), fyt = 420 MPa, s = 100 mm y f′c ≤ 35 MPa. */
  alternativa: { sMm: 100, fytMpa: 420, fcMaxMpa: 35, ramasMaxPorDimension: 1 / 2, ramasMaxMm: 200 },
  /** C.21.3.5.10 y C.21.3.5.11: primer estribo a so/2; fuera de ℓo, separación ≤ 2 so. */
  primerEstriboFraccionSo: 1 / 2,
  fueraDeLoFactorSo: 2,
  /** C.21.3.5.13: columna que sostiene un elemento rígido discontinuo; límite Ag f′c/10 sube a Ag f′c/4 con sobrerresistencia. */
  discontinuoAxial: 1 / 10,
  discontinuoAxialSobrerresistencia: 1 / 4,
  /** C.21.3.6.2, Ec. C.21-4: ΣMnc ≥ 1.2 ΣMnb. */
  relacionColumnaViga: 1.2,
  /** C.21.3.6.3: se tolera el incumplimiento solo hasta en el 10 % de las columnas de un mismo piso. */
  incumplimientoMaxPorPiso: 0.1,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.4 — Muros intermedios DMO (PDF p.483–484, C-181 a C-182)                                      */
/* ------------------------------------------------------------------------------------------------ */

export const DMO_MURO = {
  /** C.21.4.3: elementos de conexión no diseñados para fluir deben resistir al menos 1.5 Sy. */
  conexionFactorSy: 1.5,
  /** C.21.4.4.1: en C.21-11, δu/hw no menor que 0.0035. */
  derivaMin: 0.0035,
  /** C.21.4.4.2: elementos de borde cuando σ > 0.3 f′c; se descontinúan donde σ < 0.22 f′c. */
  bordeEsfuerzo: 0.3,
  bordeEsfuerzoFin: 0.22,
  /** C.21.4.4.3: separación de C.21.3.5.6(c) ≥ 1/2 de la menor dimensión del borde, sin tomarla menor de 150 mm. */
  separacionFraccion: 1 / 2,
  separacionMin: 150,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.5 — Vigas de pórticos DES (PDF p.484–486, C-182 a C-184)                                      */
/* ------------------------------------------------------------------------------------------------ */

export const DES_VIGA = {
  /** C.21.5.1.1: Pu ≤ Ag f′c/10. */
  limiteAxial: 1 / 10,
  /** C.21.5.1.2: luz libre ℓn ≥ 4 d. */
  luzLibreVecesD: 4,
  /** C.21.5.1.3: bw ≥ menor de 0.3 h y 250 mm. */
  bwFraccionH: 0.3,
  bwMin: 250,
  /** C.21.5.1.4: bw ≤ c2 + 2·min(c2, 0.75 c1). */
  voladoFraccionC1: 0.75,
  /** C.21.5.2.1: As ≥ Ec. C.10-3 y ≥ 1.4 bw d / fy; ρ ≤ 0.025; al menos dos barras continuas. */
  asMinCoef: 1.4,
  rhoMax: 0.025,
  barrasContinuas: 2,
  /** C.21.5.2.2: M+ ≥ 1/2 M− en la cara del nudo; cualquier sección ≥ 1/4 del máximo en la cara. */
  relacionMomentoPositivoNegativo: 1 / 2,
  relacionMomentoSeccion: 1 / 4,
  /** C.21.5.2.3: separación de estribos en traslapos ≤ menor de d/4 y 100 mm. */
  traslapo: { dEntre: 4, maximo: 100 },
  /** C.21.5.3.1: estribos de confinamiento en 2h desde cada cara; C.21.5.3.2: primero a ≤ 50 mm. */
  longitudConfinamientoFactorH: 2,
  primerEstriboMax: 50,
  /** C.21.5.3.2: s ≤ menor de d/4, 8 db (menor longitudinal), 24 dbe y 300 mm. */
  separacion: { dEntre: 4, vecesDbLongitudinal: 8, vecesDbEstribo: 24, maximo: 300 },
  /** C.21.5.3.4: donde no se requieren, estribos con ganchos sísmicos a ≤ d/2. */
  separacionFueraDEntre: 2,
  /** C.21.5.4.2: Vc = 0 si el cortante sísmico ≥ la mitad del máximo requerido y Pu < Ag f′c/20. */
  vcCeroFraccionCortante: 1 / 2,
  vcCeroAxial: 1 / 20,
  /** Factor del momento probable: esfuerzo de tracción 1.25 fy y φ = 1.0 (Notación Mpr, PDF p.313; C.21.7.2.1). */
  alfaMpr: 1.25,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.6 — Columnas de pórticos DES (PDF p.486–489, C-184 a C-187)                                   */
/* ------------------------------------------------------------------------------------------------ */

export const DES_COLUMNA = {
  /** C.21.6.1: aplica a elementos con Pu > Ag f′c/10 en cualquier combinación. */
  limiteAxial: 1 / 10,
  /** C.21.6.1.1: dimensión menor ≥ 300 mm (T, C o I: 0.25 m y área ≥ 0.09 m²). */
  dimensionMin: 300,
  dimensionMinTCI: 250,
  areaMinTCI_m2: 0.09,
  /** C.21.6.1.2: relación entre la dimensión menor y la perpendicular ≥ 0.4. */
  relacionDimensionesMin: 0.4,
  /** C.21.6.2.2, Ec. C.21-4: ΣMnc ≥ 1.2 ΣMnb. */
  relacionColumnaViga: 1.2,
  /** C.21.6.3.1: 0.01 Ag ≤ Ast ≤ 0.04 Ag. */
  cuantiaMin: 0.01,
  cuantiaMax: 0.04,
  /** C.21.6.4.1: ℓo = mayor de la altura del elemento en la cara del nudo, luz libre/6 y 450 mm. */
  lo: { luzLibreEntre: 6, minimo: 450 },
  /** C.21.6.4.2: hx ≤ 350 mm. */
  hxMax: 350,
  /** C.21.6.4.3: s ≤ menor de dimensión mínima/4, 6 db y so (Ec. C.21-5, entre 100 y 150 mm). */
  separacion: { dimensionMinimaEntre: 4, vecesDbLongitudinal: 6 },
  /** Ec. C.21-5: so = 100 + (350 − hx)/3, con 100 ≤ so ≤ 150 mm. */
  so: { base: 100, hxReferencia: 350, divisor: 3, min: 100, max: 150 },
  /** C.21.6.4.4(a), Ec. C.21-6: ρs = 0.12 f′c / fyt (y no menor que la Ec. C.10-5). */
  coefEspiral: 0.12,
  /** C.21.6.4.4(b), Ecs. C.21-7 y C.21-8. */
  ash: { coefConAg: 0.3, coefMinimo: 0.09 },
  /** C.21.6.4.5: fuera de ℓo, s ≤ menor de 6 db y 150 mm. */
  fueraDeLo: { vecesDb: 6, maximo: 150 },
  /** C.21.6.4.6: columnas bajo un elemento rígido discontinuo; límite Ag f′c/10 sube a Ag f′c/4. */
  discontinuoAxial: 1 / 10,
  discontinuoAxialSobrerresistencia: 1 / 4,
  /** C.21.6.4.6(b): el refuerzo transversal penetra al menos 300 mm en la zapata o losa de cimentación. */
  penetracionZapataMin: 300,
  /** C.21.6.4.7: si el recubrimiento fuera del refuerzo de confinamiento excede 100 mm, refuerzo adicional (s ≤ 300 mm). */
  recubrimientoMaxSinAdicional: 100,
  separacionRefuerzoAdicionalMax: 300,
  /** C.21.6.5.2: Vc = 0 si el cortante sísmico ≥ 1/2 del máximo requerido en ℓo y Pu < Ag f′c/20. */
  vcCeroFraccionCortante: 1 / 2,
  vcCeroAxial: 1 / 20,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.7 — Nudos DES (PDF p.489–491, C-187 a C-189)                                                  */
/* ------------------------------------------------------------------------------------------------ */

/** Confinamiento del nudo según las caras cubiertas por vigas (C.21.7.4.1, PDF p.490, C-188). */
export type ConfinamientoNudo = 'cuatro-caras' | 'tres-caras-o-dos-opuestas' | 'otros';

/** Coeficientes de Vn ≤ coef · √f′c · Aj (MPa, mm²; concreto de peso normal). */
export const COEF_CORTANTE_NUDO: Record<ConfinamientoNudo, number> = {
  'cuatro-caras': 1.7,
  'tres-caras-o-dos-opuestas': 1.2,
  otros: 1.0,
};

export const NUDO = {
  /** C.21.7.2.1: fuerzas del refuerzo de viga en la cara del nudo con 1.25 fy. */
  alfaFy: 1.25,
  /** C.21.7.2.3: dimensión de la columna ≥ 20 db de la barra de viga mayor (26 db en liviano). */
  dimensionColumnaVecesDb: 20,
  dimensionColumnaVecesDbLiviano: 26,
  /** C.21.7.3.2: con vigas en las cuatro caras de ancho ≥ 3/4 del ancho de la columna: la mitad del refuerzo y s ≤ 150 mm. */
  cuatroVigasFraccionAncho: 0.75,
  cuatroVigasFraccionRefuerzo: 1 / 2,
  cuatroVigasSeparacionMax: 150,
  /** C.21.7.4.1: una cara se considera confinada si ≥ 3/4 de ella está cubierta por el elemento. */
  fraccionCaraConfinada: 0.75,
  /** C.21.7.4.2: concreto liviano, Vn ≤ 3/4 de los límites. */
  factorLiviano: 0.75,
  /** C.21.7.5.1, Ec. C.21-9: ℓdh = fy db / (5.4 √f′c), no menor que 8 db ni 150 mm (liviano: 10 db, 190 mm y 1.25 ×). */
  ldh: { coef: 5.4, vecesDb: 8, minimoMm: 150, vecesDbLiviano: 10, minimoMmLiviano: 190, factorLiviano: 1.25 },
  /** C.21.7.5.2: barra recta, ℓd = 2.5 ℓdh (concreto fresco bajo la barra ≤ 300 mm) o 3.25 ℓdh (> 300 mm). */
  ldFactor: { hasta300: 2.5, masDe300: 3.25, espesorLimiteMm: 300 },
  /** C.21.7.5.3: la parte de ℓd fuera del núcleo confinado se multiplica por 1.6. */
  factorFueraNucleo: 1.6,
  /** C.21.7.5.1: barras No. 3 (10M) a No. 11 (36M). */
  barrasValidas: 'No. 3 (10M) a No. 11 (36M)',
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.8 — Pórticos DES prefabricados (PDF p.491, C-189)                                              */
/* ------------------------------------------------------------------------------------------------ */

export const PREFABRICADO_PORTICO = {
  /** C.21.8.2(a): Vn de conexiones dúctiles ≥ 2 Ve. */
  conexionDuctilFactorVe: 2,
  /** C.21.8.2(b): empalmes mecánicos de viga a ≥ h/2 de la cara del nudo. */
  empalmeMecanicoFraccionH: 1 / 2,
  /** C.21.8.3(d): conexión fuerte columna–columna: φSn ≥ 1.4 Se; φMn ≥ 0.4 Mpr de la columna. */
  conexionFuerteColumnaFactorSe: 1.4,
  conexionFuerteColumnaFactorMpr: 0.4,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.9 — Muros estructurales especiales y vigas de acople (PDF p.491–495, C-189 a C-193)         */
/* ------------------------------------------------------------------------------------------------ */

export const MURO_ESPECIAL = {
  /** C.21.9.2.1: ρℓ y ρt ≥ 0.0025; separación ≤ 450 mm. */
  rhoMin: 0.0025,
  separacionMax: 450,
  /** C.21.9.2.1: si Vu ≤ 0.083 Acv λ √f′c, ρℓ y ρt pueden reducirse a los de C.14.3. */
  vuReduccion: 0.083,
  /** C.21.9.2.3: dos capas de refuerzo cuando Vu > 0.17 Acv λ √f′c. */
  vuDosCapas: 0.17,
  /** C.21.9.2.4(a): altura efectiva 0.8 ℓw; (c): ℓd × 1.25 donde se espere fluencia. */
  alturaEfectivaFraccionLw: 0.8,
  desarrolloFluenciaFactor: 1.25,
  /** C.21.9.4.1, Ec. C.21-10: αc = 0.25 (hw/ℓw ≤ 1.5), 0.17 (hw/ℓw ≥ 2.0), lineal entre ambos. */
  alfaC: { alto: 0.25, bajo: 0.17, relacionInferior: 1.5, relacionSuperior: 2.0 },
  /** C.21.9.4.4: todos los machones con fuerza común Vn ≤ 0.66 Acv √f′c; machón individual Vn ≤ 0.83 Acw √f′c. */
  vnMaxMachonesComunes: 0.66,
  vnMaxMachonIndividual: 0.83,
  /** C.21.9.4.5: segmentos horizontales y vigas de acople Vn ≤ 0.83 Acw √f′c. */
  vnMaxSegmentoHorizontal: 0.83,
  /** C.21.9.5.2: ancho efectivo de ala = menor de la mitad de la distancia al alma vecina y 25 % de la altura total del muro. */
  anchoAlaFraccionAltura: 0.25,
  /** C.21.9.6.2, Ec. C.21-11: c ≥ ℓw / (600 δu/hw), con δu/hw ≥ 0.007. */
  bordeDesplazamiento: { divisor: 600, derivaMin: 0.007 },
  /** C.21.9.6.3: elementos de borde si σ extrema > 0.2 f′c; se descontinúan donde σ < 0.15 f′c. */
  bordeEsfuerzo: 0.2,
  bordeEsfuerzoFin: 0.15,
  /** C.21.9.6.2(b): altura de extensión vertical = mayor entre ℓw y Mu/(4 Vu). */
  extensionVerticalMuVuDivisor: 4,
  /** C.21.9.6.4(a): extensión horizontal ≥ mayor entre c − 0.1 ℓw y c/2. */
  extensionHorizontal: { restaFraccionLw: 0.1, fraccionC: 0.5 },
  /** C.21.9.6.4(b): en secciones con alas, al menos 300 mm dentro del alma; (d) 300 mm dentro de la zapata. */
  bordeEnAlmaMin: 300,
  bordeZapataMin: 300,
  /** C.21.9.6.4(c): s ≤ un tercio de la menor dimensión del borde (en lugar de un cuarto de C.21.6.4.3(a)). */
  bordeSeparacionFraccion: 1 / 3,
  /** C.21.9.6.5(a): sin elemento especial pero con ρ de borde > 2.8/fy, s transversal ≤ 200 mm. */
  rhoBordeCoef: 2.8,
  bordeSeparacionSinEspecial: 200,
} as const;

export const VIGA_ACOPLE = {
  /** C.21.9.7.1: ℓn/h ≥ 4 → requisitos de C.21.5 (vigas de pórtico especial). */
  relacionVigaPorticoMin: 4,
  /** C.21.9.7.2: ℓn/h < 2 y Vu > 0.33 λ √f′c Acw → dos grupos de barras diagonales. */
  relacionDiagonalMax: 2,
  vuDiagonal: 0.33,
  /** C.21.9.7.4(a), Ec. C.21-12: Vn = 2 Avd fy senα ≤ 0.83 √f′c Acw. */
  vnMaxDiagonal: 0.83,
  /** C.21.9.7.4(b): cada grupo con ≥ 4 barras en dos o más capas; embebidas ≥ 1.25 ℓd. */
  barrasPorGrupoMin: 4,
  embebidoFactorLd: 1.25,
  /** C.21.9.7.4(c): confinamiento exterior ≥ bw/2 (paralelo a bw) y bw/5 (otros lados); refuerzo perimetral 0.002 bw s, ≤ 300 mm. */
  confinamientoParaleloFraccionBw: 1 / 2,
  confinamientoOtrosFraccionBw: 1 / 5,
  refuerzoPerimetralCoef: 0.002,
  refuerzoPerimetralSeparacionMax: 300,
  /** C.21.9.7.4(c): s a lo largo de las diagonales ≤ 6 db diagonal; hx ≤ 350 mm. */
  separacionVecesDbDiagonal: 6,
  hxMax: 350,
  /** C.21.9.7.4(d): alternativa con confinamiento de toda la sección: s ≤ menor de 150 mm y 6 db; hx ≤ 200 mm. */
  alternativa: { separacionMax: 150, vecesDbDiagonal: 6, hxMax: 200 },
  /** C.9.3.4(c): φ de cortante = 0.85 en vigas de acople reforzadas en diagonal. */
  phiCortante: 0.85,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.11 — Diafragmas y cerchas DES (PDF p.495–498, C-193 a C-196)                                  */
/* ------------------------------------------------------------------------------------------------ */

export const DIAFRAGMA = {
  /** C.21.11.6: espesor mínimo 50 mm (losas y afinados compuestos) y 65 mm (afinados no compuestos sobre prefabricado). */
  espesorMin: 50,
  espesorMinAfinadoNoCompuesto: 65,
  /** C.21.11.7.1: separación del refuerzo ≤ 450 mm; alambres paralelos a los prefabricados ≥ 250 mm. */
  separacionMax: 450,
  separacionMallaParalelaMin: 250,
  /** C.21.11.7.2: tendones adheridos como refuerzo: esfuerzo bajo fuerzas de diseño ≤ 420 MPa. */
  tendonEsfuerzoMax: 420,
  /** C.21.11.7.5: colectores con σ de compresión > 0.2 f′c (0.5 f′c amplificado) requieren confinamiento; se descontinúa < 0.15 f′c (0.4 f′c). */
  colectorEsfuerzo: 0.2,
  colectorEsfuerzoFin: 0.15,
  colectorEsfuerzoSobrerresistencia: 0.5,
  colectorEsfuerzoFinSobrerresistencia: 0.4,
  /** C.21.11.7.6(a): colectores en empalmes y anclajes: separación ≥ 3 db (≥ 40 mm) y recubrimiento ≥ 2.5 db (≥ 50 mm). */
  colectorSeparacion: { vecesDb: 3, minimoMm: 40 },
  colectorRecubrimiento: { vecesDb: 2.5, minimoMm: 50 },
  /** C.21.11.9.1, Ec. C.21-13: Vn = Acv (0.17 λ √f′c + ρt fy). */
  vnCoefConcreto: 0.17,
  /** C.21.11.9.2: Vn ≤ 0.66 Acv √f′c. */
  vnMax: 0.66,
  /** C.21.11.9.3, Ec. C.21-14: Vn = Avf fy μ, con μ = 1.0 λ. */
  mu: 1.0,
  /** Cerchas (C.21.11.11.1): compresión > 0.2 f′c exige confinamiento de C.21.6.4.2 a C.21.6.4.4 y C.21.6.4.7. */
  cerchaEsfuerzo: 0.2,
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.12 — Cimentaciones DES (PDF p.498–499, C-196 a C-197)                                          */
/* ------------------------------------------------------------------------------------------------ */

export const CIMENTACION = {
  /** C.21.12.3.2: vigas de acople entre zapatas: dimensión menor ≥ luz libre / 20 (sin pasar de 450 mm); estribos s ≤ la mitad de la menor dimensión o 300 mm. */
  vigaAmarreDivisor: 20,
  vigaAmarreDimensionMaxExigida: 450,
  vigaAmarreEstriboMax: 300,
  /** C.21.12.4.3: ensayo de inyección: ≥ 1.25 fy de la barra. */
  inyeccionFactorFy: 1.25,
  /** C.21.12.4.4(a): refuerzo transversal en pilotes: ≥ 5 veces la dimensión transversal, sin ser menor de 1.8 m. */
  pilote: { vecesDimension: 5, minimoM: 1.8 },
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* C.21.13 — Elementos no designados como parte del sistema (PDF p.499–501, C-197 a C-199)           */
/* ------------------------------------------------------------------------------------------------ */

export const NO_DESIGNADOS = {
  /** C.21.13.1: solo para rehabilitaciones sísmicas; no se permite en edificaciones nuevas. */
  soloRehabilitacion: true,
  /** C.21.13.3: combinaciones de gravedad: 1.2D + 1.0L o 0.9D; L puede reducirse a 0.5 (salvo garajes, reunión pública y L > 4.8 kN/m²). */
  cargaVivaReducida: 0.5,
  cargaVivaLimiteKnM2: 4.8,
  /** C.21.13.3.1/C.21.13.3.2: límite axial Ag f′c/10; C.21.13.3.3: 0.35 Po. */
  axialBajo: 1 / 10,
  axialAlto_Po: 0.35,
  /** C.21.13.3.2: so ≤ menor de 6 db y 150 mm. */
  soVecesDb: 6,
  soMax: 150,
  /** C.21.13.5(c): longitud de apoyo de vigas prefabricadas ≥ 50 mm más que la calculada. */
  apoyoPrefabricadoAdicional: 50,
  /** C.21.13.6: refuerzo de cortante en conexiones losa–columna: Vs ≥ 0.29 √f′c bo d, extendido 4 h desde la cara del apoyo. */
  losaColumna: { vsCoef: 0.29, extensionVecesEspesor: 4, derivaMin: 0.005, derivaA: 0.35, derivaB: 0.05 },
} as const;

/* ------------------------------------------------------------------------------------------------ */
/* Tabla-resumen de requisitos geométricos y de refuerzo por grado (elaboración PROPIA a partir de   */
/* los numerales anteriores, para comparar DMO y DES lado a lado).                                   */
/* ------------------------------------------------------------------------------------------------ */

export interface FilaComparacion {
  concepto: string;
  dmo: string;
  des: string;
  refDmo: string;
  refDes: string;
}

export const COMPARACION_DMO_DES: readonly FilaComparacion[] = [
  { concepto: 'Ancho mínimo de la viga bw', dmo: '≥ 200 mm', des: '≥ menor de 0.3 h y 250 mm', refDmo: 'C.21.3.4.1', refDes: 'C.21.5.1.3' },
  { concepto: 'Cuantía máxima de viga', dmo: 'ρ ≤ 0.025', des: 'ρ ≤ 0.025', refDmo: 'C.21.3.4.3', refDes: 'C.21.5.2.1' },
  { concepto: 'M+ en la cara del nudo', dmo: '≥ 1/3 de M−', des: '≥ 1/2 de M−', refDmo: 'C.21.3.4.4', refDes: 'C.21.5.2.2' },
  { concepto: 'Momento en cualquier sección', dmo: '≥ 1/5 del máximo en la cara', des: '≥ 1/4 del máximo en la cara', refDmo: 'C.21.3.4.4', refDes: 'C.21.5.2.2' },
  { concepto: 'Lado menor de la columna', dmo: '≥ 250 mm', des: '≥ 300 mm', refDmo: 'C.21.3.5.1', refDes: 'C.21.6.1.1' },
  { concepto: 'Relación entre lados de la columna', dmo: 'sin límite', des: '≥ 0.4', refDmo: '—', refDes: 'C.21.6.1.2' },
  { concepto: 'Cuantía longitudinal de la columna', dmo: '0.01 Ag a 0.04 Ag', des: '0.01 Ag a 0.04 Ag', refDmo: 'C.21.3.5.2', refDes: 'C.21.6.3.1' },
  { concepto: 'Columna fuerte–viga débil', dmo: 'ΣMnc ≥ 1.2 ΣMnb', des: 'ΣMnc ≥ 1.2 ΣMnb', refDmo: 'C.21.3.6.2', refDes: 'C.21.6.2.2' },
  { concepto: 'Cuantía de espiral ρs', dmo: '0.08 f′c/fyt', des: '0.12 f′c/fyt', refDmo: 'C.21-1', refDes: 'C.21-6' },
  { concepto: 'Ash con Ag/Ach', dmo: '0.2 s bc f′c/fyt (Ag/Ach − 1)', des: '0.3 s bc f′c/fyt (Ag/Ach − 1)', refDmo: 'C.21-2', refDes: 'C.21-7' },
  { concepto: 'Ash mínimo', dmo: '0.06 s bc f′c/fyt', des: '0.09 s bc f′c/fyt', refDmo: 'C.21-3', refDes: 'C.21-8' },
  { concepto: 'Separación en ℓo', dmo: 'so ≤ 8 db, 16 dbe, lado menor/3, 150 mm', des: 's ≤ lado menor/4, 6 db, so (100 a 150 mm)', refDmo: 'C.21.3.5.6', refDes: 'C.21.6.4.3' },
  { concepto: 'Longitud ℓo', dmo: '≥ luz libre/6, lado mayor, 500 mm', des: '≥ altura, luz libre/6, 450 mm', refDmo: 'C.21.3.5.6', refDes: 'C.21.6.4.1' },
  { concepto: 'Separación fuera de ℓo', dmo: '≤ 2 so', des: '≤ 6 db y 150 mm', refDmo: 'C.21.3.5.11', refDes: 'C.21.6.4.5' },
];
