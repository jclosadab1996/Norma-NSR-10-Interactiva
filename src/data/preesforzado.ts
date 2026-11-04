/**
 * Título C — Capítulos C.16 (prefabricado) y C.18 (preesforzado): constantes y coeficientes transcritos del PDF
 * (páginas PDF 449–452 y 455–467, impresas C-147 a C-150 y C-153 a C-165; PDF = impresa + 302),
 * verificados contra la imagen de cada página.
 *
 * Convenciones: MPa, mm, N, kN. Los coeficientes que multiplican √f′c se guardan como número sin la raíz
 * (p. ej. 0.62 para "0.62√f′c"). Lo que NO es texto de la norma está marcado "(auxiliar)".
 */

/* ───────────────────────── C.18.3.3 — Clases de elementos a flexión (PDF p.455–456, C-153/C-154) ───────────────────────── */

/** C.18.3.3 (C-153/154): límites de ft (fibra extrema en tracción de la zona precomprimida, cargas de servicio) en múltiplos de √f′c. */
export const CLASES_FLEXION = {
  /** Clase U: ft ≤ 0.62√f′c. */
  U: { max: 0.62 },
  /** Clase T: 0.62√f′c < ft ≤ 1.0√f′c. */
  T: { min: 0.62, max: 1.0 },
  /** Clase C: ft > 1.0√f′c. */
  C: { min: 1.0 },
} as const;

/** C.18.3.3 (C-154): losas preesforzadas en dos direcciones = Clase U con ft ≤ 0.50√f′c. */
export const FT_MAX_LOSA_DOS_DIRECCIONES = 0.5;

/* ───────────────────────── C.18.4 — Esfuerzos admisibles en el concreto (PDF p.456, C-154) ───────────────────────── */

/** C.18.4.1 (C-154): esfuerzos en el concreto inmediatamente después de aplicar el preesforzado (múltiplos de f′ci, o de √f′c). */
export const ESFUERZOS_TRANSFERENCIA = {
  /** (a) compresión en la fibra extrema, salvo (b): 0.60 f′ci. */
  compresion: 0.6,
  /** (b) compresión en los extremos de elementos simplemente apoyados: 0.70 f′ci. */
  compresionExtremosSimples: 0.7,
  /** (c) tracción ft que obliga a refuerzo adherido adicional, extremos de elementos simplemente apoyados: 0.5√f′c. */
  traccionExtremosSimples: 0.5,
  /** (c) tracción ft que obliga a refuerzo adherido adicional, otras ubicaciones: 0.25√f′c. */
  traccionOtras: 0.25,
} as const;

/** C.18.4.2 (C-154): flexión Clase U y T, cargas de servicio después de todas las pérdidas (múltiplos de f′c). */
export const ESFUERZOS_SERVICIO = {
  /** (a) compresión por preesforzado + cargas permanentes en el tiempo: 0.45 f′c. */
  compresionSostenida: 0.45,
  /** (b) compresión por preesforzado + todas las cargas: 0.60 f′c. */
  compresionTotal: 0.6,
} as const;

/** C.18.4.4.1 (C-154/155): espaciamiento de tendones adheridos ≤ 2/3 del máximo del refuerzo no preesforzado (C.10.6.4); barra–tendón ≤ 5/6. */
export const ESPACIAMIENTO_TENDONES = { tendonesAdheridos: 2 / 3, barraTendon: 5 / 6 } as const;

/** C.18.4.4.3 (C-155): Δfps ≤ 250 MPa; si Δfps ≤ 140 MPa no aplican los requisitos de espaciamiento de C.18.4.4.1 y C.18.4.4.2. */
export const DELTA_FPS_MAX_MPA = 250;
export const DELTA_FPS_SIN_ESPACIAMIENTO_MPA = 140;

/** C.18.4.4.4 (C-155): si h de una viga excede este valor, refuerzo longitudinal de superficie según C.10.6.7. */
export const H_VIGA_REFUERZO_SUPERFICIE_MM = 900;

/* ───────────────────────── C.18.5 — Esfuerzos admisibles en el acero (PDF p.457, C-155) ───────────────────────── */

/** C.18.5.1 (C-155): esfuerzos de tracción máximos en el acero de preesforzado (múltiplos de fpy o fpu). */
export const ESFUERZOS_ACERO = {
  /** (a) gato: 0.94 fpy, pero no mayor que min(0.80 fpu, máximo del fabricante). */
  gatoFpy: 0.94,
  gatoFpuMax: 0.8,
  /** (b) inmediatamente después de la transferencia: 0.82 fpy, pero no mayor que 0.74 fpu. */
  transferenciaFpy: 0.82,
  transferenciaFpuMax: 0.74,
  /** (c) tendones de postensado, en anclajes y acoples, inmediatamente después de la transferencia: 0.70 fpu. */
  anclajesFpu: 0.7,
} as const;

/* ───────────────────────── C.18.6 — Pérdidas (PDF p.457–458, C-155/156) ───────────────────────── */

/** C.18.6.1 (C-155): fuentes de pérdida de preesfuerzo que deben considerarse para hallar fse. */
export const FUENTES_PERDIDA = [
  { id: 'a', texto: 'Asentamiento del acero de preesforzado durante la transferencia' },
  { id: 'b', texto: 'Acortamiento elástico del concreto' },
  { id: 'c', texto: 'Flujo plástico del concreto' },
  { id: 'd', texto: 'Retracción del concreto' },
  { id: 'e', texto: 'Relajación de esfuerzo en el acero de preesforzado' },
  { id: 'f', texto: 'Fricción por curvatura intencional o accidental de los tendones de postensado' },
] as const;

/** C.18.6.2.1 (C-156): la Ec. C.18-2 (forma aproximada) puede usarse si (Kℓpx + μp αpx) no es mayor que este valor. */
export const FRICCION_EXPONENTE_MAX_APROX = 0.3;

/* ───────────────────────── C.18.7 — Resistencia a flexión (PDF p.458–459, C-156/157) ───────────────────────── */

/** C.18.7.2 (C-156): las Ecs. C.18-3 a C.18-5 valen solo si fse ≥ 0.50 fpu. */
export const FSE_MIN_FPU = 0.5;

/**
 * C.18.7.2(a) (C-156): factor γp según fpy/fpu. Se aplica el primer renglón cuyo mínimo cumple la relación
 * (0.55 si fpy/fpu ≥ 0.80; 0.40 si ≥ 0.85; 0.28 si ≥ 0.90). Orden de menor a mayor relación como en la norma.
 */
export const GAMMA_P = [
  { fpyFpuMin: 0.8, gamma: 0.55 },
  { fpyFpuMin: 0.85, gamma: 0.4 },
  { fpyFpuMin: 0.9, gamma: 0.28 },
] as const;

/** C.18.7.2(a) (C-156): con refuerzo de compresión, el corchete de la Ec. C.18-3 no se toma menor de 0.17 y d′ ≤ 0.15 dp. */
export const CORCHETE_C183_MIN = 0.17;
export const DPRIMA_MAX_FRACCION_DP = 0.15;

/** Ecs. C.18-4 y C.18-5 (C-156/157): tendones no adheridos. Divisores de 100ρp / 300ρp, +70 MPa y topes (fse + 420 / fse + 210). */
export const NO_ADHERIDOS = {
  /** Relación luz/altura límite entre C.18-4 (≤ 35) y C.18-5 (> 35). */
  luzAlturaLimite: 35,
  incremento: 70,
  corto: { divisor: 100, topeSobreFse: 420 },
  largo: { divisor: 300, topeSobreFse: 210 },
} as const;

/** C.18.8.2 (C-157): carga mayorada mínima, múltiplo de la carga de fisuración (con fr de C.9.5.2.3). */
export const FACTOR_CARGA_FISURACION = 1.2;

/* ───────────────────────── C.18.9 — Refuerzo mínimo adherido (PDF p.459–460, C-157/158) ───────────────────────── */

export const REFUERZO_ADHERIDO = {
  /** Ec. C.18-6: As = 0.004 Act (tendones no adheridos, elementos a flexión). */
  coefAct: 0.004,
  /** C.18.9.3.1: sin refuerzo adherido en momento positivo de losas si ft ≤ 0.17√f′c. */
  ftSinRefuerzoLosa: 0.17,
  /** Ec. C.18-7: As = Nc / (0.5 fy), con fy ≤ 420 MPa. */
  fyMaxC187: 420,
  /** Ec. C.18-8: As = 0.00075 Acf (momento negativo sobre columnas). */
  coefAcf: 0.00075,
  /** C.18.9.3.3: distribución entre líneas a 1.5h de las caras de la columna; al menos 4 barras por dirección; separación ≤ 300 mm. */
  anchoFranjaH: 1.5,
  barrasMin: 4,
  separacionMaxMm: 300,
  /** C.18.9.4: longitud mínima = 1/3 de la luz libre (positivo, centrada) o 1/6 a cada lado del apoyo (negativo). */
  longitudPositivoFraccionLn: 1 / 3,
  longitudNegativoFraccionLn: 1 / 6,
} as const;

/* ───────────────────────── C.18.11 — Elementos a compresión (PDF p.461, C-159) ───────────────────────── */

export const COMPRESION_PREESFORZADA = {
  /** C.18.11.2.1/2: esfuerzo promedio por preesforzado efectivo; por debajo → refuerzo mínimo de C.7.10, C.10.9.1-2 (columnas) o C.14.3 (muros); igual o mayor → tendones rodeados por espirales o estribos. */
  esfuerzoPromedioMpa: 1.6,
  /** C.18.11.2.2(b): estribos ≥ No. 10, separación vertical ≤ 48 db y ≤ menor dimensión. */
  separacionEstribosFraccionDb: 48,
  /** C.18.11.2.2(d): los estribos pueden terminar a no más de 75 mm bajo el refuerzo inferior de las vigas o ménsulas. */
  terminacionBajoVigasMm: 75,
} as const;

/* ───────────────────────── C.18.12 — Sistemas de losas (PDF p.461–462, C-159/160) ───────────────────────── */

export const LOSAS_PREESFORZADAS = {
  /** C.18.12.4: separación de tendones ≤ min(8 h, 1.5 m); preesforzado promedio efectivo mínimo 0.9 MPa. */
  separacionFraccionH: 8,
  separacionMaxMm: 1500,
  preesfuerzoMinMpa: 0.9,
  /** C.18.12.6: mínimo 2 torones de 7 alambres de 12.7 mm o más, en cada dirección, en las columnas. */
  toronesIntegridadMin: 2,
  toronDiametroMinMm: 12.7,
  /** C.18.12.7: alternativa con refuerzo inferior ≥ 1.5 veces lo requerido por C.10-3 y ≥ 2.1 bw d / fy. */
  factorRefuerzoInferior: 1.5,
  coefBwDFy: 2.1,
} as const;

/* ───────────────────────── C.18.13–C.18.15 — Zonas de anclaje (PDF p.462–465, C-160 a C-163) ───────────────────────── */

export const ZONA_ANCLAJE = {
  /** C.18.13.4.1: fps = fse + 70 para refuerzo no adherido preesforzado que resiste tracciones en la zona de anclaje. */
  incrementoNoAdheridoMpa: 70,
  /** C.18.13.4.2: resistencia nominal a compresión del concreto de la zona general limitada a 0.7 λ f′ci (sin confinamiento equivalente a C.10-5). */
  compresionZonaGeneral: 0.7,
  /** C.18.13.4.3: f′c mínimo al postensar: 28 MPa (torones de varios alambres) o 17 MPa (un torón o barras). */
  fcMinPostensarVariosMpa: 28,
  fcMinPostensarUnoMpa: 17,
  /** C.18.13.4.3: o acero esforzado a no más del 50 % de la fuerza final. */
  fraccionFuerzaFinalAlternativa: 0.5,
  /** C.18.13.5.2: ecuaciones simplificadas no valen si la distancia mínima al borde < 1.5 veces la dimensión lateral del anclaje. */
  distanciaBordeFraccionAnclaje: 1.5,
  /** C.18.13.5.5: anclajes lejos del extremo: refuerzo adherido para transferir al menos 0.35 Ppu. */
  fraccionPpuLejosDelExtremo: 0.35,
  /** C.18.13.5.7: refuerzo ortogonal anti-descascaramiento con resistencia nominal a tracción = 2 % de cada Ppu. */
  fraccionPpuDescascaramiento: 0.02,
  /** C.18.14.2.2: dos barras horizontales ≥ No. 13, dentro de h/2 delante de cada anclaje y extendidas ≥ 150 mm a cada lado. */
  barrasLosaDiametroMinNo: 13,
  barrasLosaExtensionMm: 150,
  /** C.18.14.2.3: anclajes con separación centro a centro ≤ 300 mm se consideran agrupados; grupos de 6 o más → n + 1 horquillas/estribos ≥ No. 10. */
  agrupadosSeparacionMm: 300,
  grupoMinAnclajes: 6,
  horquillasNoMin: 10,
  /** C.18.14.1: anclajes de tendón único de un alambre o barras de 16 mm o menos (ACI 423.7). */
  barraDiametroMaxMm: 16,
} as const;

/* ───────────────────────── C.18.17–C.18.21 — Ductos, mortero, aplicación de la fuerza (PDF p.465–467, C-163 a C-165) ───────────────────────── */

export const DUCTOS_Y_MORTERO = {
  /** C.18.17.2: ductos de un solo alambre, torón o barra: diámetro interior ≥ 6 mm mayor que el del acero. */
  holguraDuctoMm: 6,
  /** C.18.17.3: ductos de varios elementos: área interior ≥ 2 veces el área del acero de preesforzado. */
  relacionAreaDucto: 2,
  /** C.18.18.3.3: relación agua/cemento ≤ 0.45 en peso. */
  relacionAguaCementoMax: 0.45,
  /** C.18.18.4.2: temperatura de los elementos al inyectar > 2 °C hasta que cubos de 50 mm alcancen 5.5 MPa. */
  temperaturaMinElementoC: 2,
  resistenciaCubosMpa: 5.5,
  cuboLadoMm: 50,
  /** C.18.18.4.3: temperatura del mortero ≤ 32 °C durante mezclado y bombeo. */
  temperaturaMaxMorteroC: 32,
} as const;

export const FUERZA_PREESFUERZO = {
  /** C.18.20.1: diferencia máxima entre elongación y manómetro/celda: 5 % en pretensado, 7 % en postensado. */
  diferenciaMaxPretensadoPct: 5,
  diferenciaMaxPostensadoPct: 7,
  /** C.18.20.4: pérdida total por acero roto no reemplazado ≤ 2 % del preesforzado total. */
  perdidaMaxAceroRotoPct: 2,
  /** C.18.21.1: anclajes y conectores desarrollan al menos 95 % de fpu (ensayo sin adherencia); 100 % en secciones críticas si el tendón es adherido. */
  anclajeFraccionFpuEnsayo: 0.95,
} as const;

/* ───────────────────────── C.16 — Concreto prefabricado (PDF p.449–452, C-147 a C-150) ───────────────────────── */

export const PREFABRICADO = {
  /** C.16.4.1 (C-147): losas en una dirección y paneles de muro preesforzados con ancho menor que este valor pueden omitir refuerzo transversal de retracción y temperatura (C.7.12). */
  anchoSinRetraccionTransversalM: 3.7,
  /** C.16.4.2 (C-147/148): muros no preesforzados, refuerzo vertical y horizontal ≥ 0.001 Ag, cada uno. */
  cuantiaMinMuro: 0.001,
  /** C.16.4.2: separación ≤ 5 veces el espesor y ≤ 750 mm (muros interiores) / 450 mm (exteriores). */
  separacionMuroFraccionEspesor: 5,
  separacionMuroInteriorMm: 750,
  separacionMuroExteriorMm: 450,
  /** C.16.5.1.2 (C-148): conexión diafragma–elemento con resistencia nominal a tracción ≥ 4.4 kN por metro lineal. */
  conexionDiafragmaKnPorM: 4.4,
  /** C.16.5.1.3(a): columnas con resistencia nominal a tracción ≥ 1.4 Ag (N, con Ag en mm²); área efectiva ≥ la mitad del área total. */
  columnaCoefAgN: 1.4,
  columnaAreaEfectivaMinFraccion: 0.5,
  /** C.16.5.1.3(b): paneles de muro, mínimo dos amarres por panel con resistencia nominal ≥ 44 kN por amarre. */
  panelAmarresMin: 2,
  panelAmarreKn: 44,
  /** C.16.5.2 (C-148): muros portantes prefabricados de tres o más pisos. */
  tresPisosOMas: 3,
  /** C.16.5.2.1: amarres de piso y cubierta de 22 kN por metro de ancho o largo, a ≤ 600 mm del plano del sistema. */
  amarrePisoKnPorM: 22,
  amarreDistanciaPlanoMm: 600,
  /** C.16.5.2.2: amarres longitudinales paralelos a los vanos con separación ≤ 3 m entre centros. */
  amarreLongitudinalSeparacionMaxM: 3,
  /** C.16.5.2.4: amarres perimetrales dentro de 1.2 m del borde con resistencia nominal a tracción ≥ 71 kN. */
  amarrePerimetralKn: 71,
  amarrePerimetralDistanciaBordeM: 1.2,
  /** C.16.5.2.5: amarres verticales continuos en toda la altura, ≥ 44 kN por metro horizontal de muro, y ≥ 2 por panel. */
  amarreVerticalKnPorM: 44,
  /** C.16.6.2.2(a) (C-149): distancia del borde del apoyo al extremo del elemento ≥ ℓn/180 y no menos de 50 mm (losas macizas o alveolares) ni 75 mm (vigas y elementos en T alargada). */
  apoyoDivisorLn: 180,
  apoyoMinLosaMm: 50,
  apoyoMinVigaMm: 75,
  /** C.16.6.2.2(b): almohadillas en bordes no reforzados desplazadas hacia atrás ≥ 13 mm desde la cara del apoyo. */
  almohadillaRetrocesoMm: 13,
  /** C.16.6.2.3: al menos un tercio del refuerzo de momento positivo se extiende hasta el centro del apoyo. */
  refuerzoPositivoHastaApoyoFraccion: 1 / 3,
} as const;

/** C.16.6.2.2(a) (C-149): distancia mínima del borde del apoyo al extremo del elemento prefabricado. */
export type TipoApoyoPrefabricado = 'losa' | 'viga';
