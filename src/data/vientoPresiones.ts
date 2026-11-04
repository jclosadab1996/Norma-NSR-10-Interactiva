/**
 * Coeficientes de presión y de fuerza del Método 2 (procedimiento analítico) de la NSR-10, B.6.5.11 a B.6.5.15,
 * transcritos de las figuras B.6.5-2 a B.6.5-17 del PDF (Norma/Norma-Sismo-Resistente-NSR-10.pdf).
 * Página de la norma "B-n" = página PDF n + 219. Cada constante cita su figura y página ("PDF p.X (B-n)").
 *
 * Solo se transcriben las figuras que se leen con certeza en la imagen. Las demás (GCp de cubiertas 8B–13,
 * Fig. B.6.5-14, CN de cubiertas libres 15A–16C, Cf de otras estructuras 18–19 y Caso C de la 17) se muestran
 * como imagen en el capítulo y NO están aquí.
 *
 * ANOMALÍAS del PDF detectadas (ver notas junto a cada dato):
 *  - Fig. B.6.5-3, h/L ≤ 0.25, θ = 30°, fila inferior: el PDF imprime −0.30; la tendencia de la fila y la
 *    Figura 6-6 de ASCE 7-05 sugieren +0.30. Aquí se conserva el valor impreso.
 *  - Fig. B.6.5-3, nota "#": dice "θ ≤ 80°" donde debería decir "θ > 80°" (Cp = 0.8 solo tiene sentido para
 *    pendientes muy altas, pues 0.01·θ vale 0.6–0.8 entre 60° y 80°).
 *  - Fig. B.6.5-3, muro a barlovento: la columna "Usar con" dice "q2"; se entiende qz.
 */

// ---------------------------------------------------------------------------------------------------------------
// Clasificación del cerramiento y coeficiente de presión interna
// ---------------------------------------------------------------------------------------------------------------

export type Cerramiento = 'abierto' | 'parcial' | 'cerrado';

/**
 * Figura B.6.5-2 — Coeficientes de presión interna GCpi. PDF p.268 (B-49).
 * Edificio abierto 0.00; parcialmente cerrado ±0.55; cerrado ±0.18.
 * Signo positivo: presión sobre las superficies internas; negativo: succión.
 */
export const GCPI: Record<Cerramiento, { positivo: number; negativo: number }> = {
  abierto: { positivo: 0, negativo: 0 },
  parcial: { positivo: 0.55, negativo: -0.55 },
  cerrado: { positivo: 0.18, negativo: -0.18 },
};

/** Coeficiente numérico de la ecuación B.6.5-14 tal como está impreso en el PDF p.251 (B-32). */
export const COEF_RI = 11000;

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-3 — Cp para el SPRFV (edificios total o parcialmente cerrados, todas las alturas)
// ---------------------------------------------------------------------------------------------------------------

/** Muro a barlovento: Cp = 0.8 para todo L/B, se usa con qz. PDF p.270 (B-51). */
export const CP_MURO_BARLOVENTO = 0.8;

/** Muros laterales: Cp = −0.7 para todo L/B, se usan con qh. PDF p.270 (B-51). */
export const CP_MURO_LATERAL = -0.7;

/**
 * Muro a sotavento, se usa con qh: L/B = 0–1 → −0.5; L/B = 2 → −0.3; L/B ≥ 4 → −0.2.
 * PDF p.270 (B-51). Se permite interpolar linealmente (nota 2).
 */
export const CP_MURO_SOTAVENTO: readonly { lb: number; cp: number }[] = [
  { lb: 1, cp: -0.5 },
  { lb: 2, cp: -0.3 },
  { lb: 4, cp: -0.2 },
];

/** Relaciones h/L de las tablas de cubierta (≤0.25, 0.50, ≥1.0). PDF p.270 (B-51). */
export const HL_CUBIERTA = [0.25, 0.5, 1.0] as const;

/** Ángulos θ de la tabla de cubierta a barlovento. En θ = 60 la norma da 0.01·θ (= 0.6). */
export const THETA_BARLOVENTO = [10, 15, 20, 25, 30, 35, 45, 60] as const;

/**
 * Cp de cubierta a BARLOVENTO, viento normal a la cumbrera, θ ≥ 10°, se usa con qh. PDF p.270 (B-51).
 * Para cada h/L hay dos filas de la tabla: `fila1` (superior, mayormente succión) y `fila2` (inferior, mayormente
 * presión o succión menor). Ambas deben investigarse (nota 3). El 0.0 de las columnas marcadas con * en el PDF
 * está "dado para fines de interpolación". Para θ = 45° con h/L ≤ 0.25 el PDF da un único valor (0.40) para
 * ambas filas; para θ = 60° ambas filas valen 0.01·θ = 0.6.
 */
export const CP_CUBIERTA_BARLOVENTO: readonly { hl: number; fila1: readonly number[]; fila2: readonly number[] }[] = [
  {
    hl: 0.25,
    fila1: [-0.7, -0.5, -0.3, -0.2, -0.2, 0.0, 0.4, 0.6],
    // OJO: el −0.30 en θ = 30° es el valor impreso (ver anomalía en el encabezado del archivo).
    fila2: [-0.18, 0.0, 0.2, 0.3, -0.3, 0.4, 0.4, 0.6],
  },
  {
    hl: 0.5,
    fila1: [-0.9, -0.7, -0.4, -0.3, -0.2, -0.2, 0.0, 0.6],
    fila2: [-0.18, -0.18, 0.0, 0.2, 0.2, 0.3, 0.4, 0.6],
  },
  {
    hl: 1.0,
    // −1.3 (θ = 10°) puede reducirse con el área tributaria: ver FACTOR_REDUCCION_AREA.
    fila1: [-1.3, -1.0, -0.7, -0.5, -0.3, -0.2, 0.0, 0.6],
    fila2: [-0.18, -0.18, -0.18, 0.0, 0.2, 0.2, 0.3, 0.6],
  },
];

/** Ángulos θ de la tabla de cubierta a sotavento (el último, 20, vale para θ ≥ 20°). */
export const THETA_SOTAVENTO = [10, 15, 20] as const;

/** Cp de cubierta a SOTAVENTO, viento normal a la cumbrera, θ ≥ 10°, con qh. PDF p.270 (B-51). */
export const CP_CUBIERTA_SOTAVENTO: readonly { hl: number; cp: readonly number[] }[] = [
  { hl: 0.25, cp: [-0.3, -0.5, -0.6] },
  { hl: 0.5, cp: [-0.5, -0.5, -0.6] },
  { hl: 1.0, cp: [-0.7, -0.6, -0.6] },
];

/**
 * Cp de cubierta cuando el viento es normal a la cumbrera con θ < 10° o paralelo a la cumbrera (cualquier θ).
 * Se da por franjas medidas desde el borde de barlovento (0–h/2, h/2–h, h–2h, > 2h), con qh. PDF p.270 (B-51).
 * Para h/L ≤ 0.5: −0.9, −0.9, −0.5, −0.3 (y −0.18 como segunda condición). Para h/L ≥ 1.0 la norma solo da
 * dos franjas (0–h/2: −1.3; > h/2: −0.7), que aquí se expanden a cuatro. Se interpola entre h/L = 0.5 y 1.0.
 */
export const FRANJAS_PARALELA = ['0 a h/2', 'h/2 a h', 'h a 2h', '> 2h'] as const;
export const CP_CUBIERTA_PARALELA = {
  /** h/L ≤ 0.5 */
  bajo: { fila1: [-0.9, -0.9, -0.5, -0.3], fila2: [-0.18, -0.18, -0.18, -0.18] },
  /** h/L ≥ 1.0 (−1.3 reducible con el área) */
  alto: { fila1: [-1.3, -0.7, -0.7, -0.7], fila2: [-0.18, -0.18, -0.18, -0.18] },
} as const;

/**
 * Factor de reducción del Cp = −1.3 según el área (m²) sobre la que aplica. PDF p.270 (B-51):
 * < 10 → 1.0; 20 → 0.9; > 100 → 0.8 (se interpola linealmente entre esos puntos).
 */
export const FACTOR_REDUCCION_AREA: readonly { area: number; factor: number }[] = [
  { area: 10, factor: 1.0 },
  { area: 20, factor: 0.9 },
  { area: 100, factor: 0.8 },
];

/** Cubiertas muy inclinadas: Cp = 0.01·θ para 60° ≤ θ ≤ 80° y 0.8 para θ > 80° (nota "#"; ver anomalía). */
export const THETA_LIMITE_CP_08 = 80;

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-5 — Cp de cubiertas en arco
// ---------------------------------------------------------------------------------------------------------------

/**
 * Figura B.6.5-5 — Cubiertas en arco. Cp a cuarto de barlovento, medio central y cuarto de sotavento,
 * con r = flecha/luz (altura/luz). Se usan con qh. PDF p.272 (B-53).
 * Cubierta sobre estructura elevada: 0 < r < 0.2: −0.9; 0.2 ≤ r < 0.3: 1.5r − 0.3 (alternativa 6r − 2.1);
 * 0.3 ≤ r < 0.6: 2.75r − 0.7. Cubierta con arranque desde el piso: 0 < r ≤ 0.6: 1.4r.
 * Medio central: −0.7 − r. Cuarto de sotavento: −0.5.
 */
export const CP_ARCO = {
  elevada: [
    { desde: 0, hasta: 0.2, barlovento: { a: 0, b: -0.9 } },
    { desde: 0.2, hasta: 0.3, barlovento: { a: 1.5, b: -0.3 } },
    { desde: 0.3, hasta: 0.6, barlovento: { a: 2.75, b: -0.7 } },
  ],
  arranquePiso: { barlovento: { a: 1.4, b: 0 }, rMax: 0.6 },
  medioCentral: { a: -1, b: -0.7 },
  sotavento: -0.5,
  /** Alternativa permitida para 0.2 ≤ r ≤ 0.3 (cuarto de barlovento): 6r − 2.1. */
  alternativa: { a: 6, b: -2.1 },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-7 — GCpf para el SPRFV de edificios bajos (h ≤ 18 m)
// ---------------------------------------------------------------------------------------------------------------

export const ZONAS_GCPF = ['1', '2', '3', '4', '5', '6', '1E', '2E', '3E', '4E'] as const;
export type ZonaGCpf = (typeof ZONAS_GCPF)[number];

/**
 * Figura B.6.5-7 — Coeficientes GCpf, edificios bajos totalmente o parcialmente cerrados. PDF p.275 (B-56).
 * Filas por ángulo de cubierta θ; columnas en el orden de ZONAS_GCPF. θ = 0–5° (una sola fila), 20°, 30–45° y 90°;
 * se permite interpolar linealmente entre ángulos (nota 2).
 */
export const GCPF: readonly { theta: number; etiqueta: string; valores: readonly number[] }[] = [
  { theta: 5, etiqueta: '0–5', valores: [0.4, -0.69, -0.37, -0.29, -0.45, -0.45, 0.61, -1.07, -0.53, -0.43] },
  { theta: 20, etiqueta: '20', valores: [0.53, -0.69, -0.48, -0.43, -0.45, -0.45, 0.8, -1.07, -0.69, -0.64] },
  { theta: 30, etiqueta: '30–45', valores: [0.56, 0.21, -0.43, -0.37, -0.45, -0.45, 0.69, 0.27, -0.53, -0.48] },
  { theta: 45, etiqueta: '30–45', valores: [0.56, 0.21, -0.43, -0.37, -0.45, -0.45, 0.69, 0.27, -0.53, -0.48] },
  { theta: 90, etiqueta: '90', valores: [0.56, 0.56, -0.37, -0.37, -0.45, -0.45, 0.69, 0.69, -0.48, -0.48] },
];

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-8A — GCp de componentes y revestimientos en muros (h ≤ 18 m)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Figura B.6.5-8A — GCp de muros, zonas 4 (interior) y 5 (esquinas, ancho a). Se usan con qh. PDF p.276 (B-57).
 * La figura es log-lineal en el área efectiva A (m²): constante para A ≤ 1 m², recta hasta A = 50 m², constante
 * después. Presión (positiva) igual en zonas 4 y 5: +1.0 → +0.7. Succión zona 4: −1.1 → −0.8; zona 5: −1.4 → −0.8.
 * Nota 5: los GCp de muros se reducen 10 % cuando θ ≤ 10°.
 */
export const GCP_MUROS_8A = {
  areaMin: 1,
  areaMax: 50,
  positivo: { enAreaMin: 1.0, enAreaMax: 0.7 },
  negativo: {
    '4': { enAreaMin: -1.1, enAreaMax: -0.8 },
    '5': { enAreaMin: -1.4, enAreaMax: -0.8 },
  },
  reduccionTheta10: 0.9,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Parapetos, aleros y casos de carga
// ---------------------------------------------------------------------------------------------------------------

/** B.6.5.12.2.4 — Coeficiente de presión neta combinada GCpn de parapetos (SPRFV). PDF p.253 (B-34). */
export const GCPN_PARAPETO = { barlovento: 1.5, sotavento: -1.0 } as const;

/** B.6.5.11.4.1 — Cp en la cara inferior del alero a barlovento (SPRFV). PDF p.252 (B-33). */
export const CP_ALERO_BARLOVENTO = 0.8;

/**
 * Figura B.6.5-6 — Casos de carga de viento de diseño. PDF p.273 (B-54).
 * Caso 1: 100 % sin torsión. Caso 2: 75 % con momento torsional MT = 0.75(PW + PL)·B·e, e = ±0.15 B.
 * Caso 3: 75 % en x y 75 % en y simultáneamente. Caso 4: 56.3 % en cada dirección con torsión.
 */
export const CASOS_CARGA_VIENTO = {
  1: { factorX: 1, factorY: 0, torsion: false },
  2: { factorX: 0.75, factorY: 0, torsion: true },
  3: { factorX: 0.75, factorY: 0.75, torsion: false },
  4: { factorX: 0.563, factorY: 0.563, torsion: true },
} as const;
/** Excentricidad de los casos 2 y 4 para estructuras rígidas: e = ±0.15·B. */
export const EXCENTRICIDAD_RIGIDA = 0.15;

/** B.6.5.8.1 — Factor de efecto ráfaga de estructuras rígidas (valor simplificado). PDF p.249 (B-30). */
export const G_RIGIDA = 0.85;

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-17 — Cf de muros libres y vallas macizas (casos A y B)
// ---------------------------------------------------------------------------------------------------------------

/** Relaciones de aspecto B/s de la Figura B.6.5-17 (casos A y B). El último vale para B/s ≥ 45. */
export const BS_VALLAS = [0.05, 0.1, 0.2, 0.5, 1, 2, 4, 5, 10, 20, 30, 45] as const;

/**
 * Figura B.6.5-17 — Cf, casos A y B, por relación de galibo s/h (filas, de mayor a menor) y B/s (columnas).
 * PDF p.294 (B-75). La primera fila corresponde a s/h = 1.0, y la última a s/h ≤ 0.16.
 * Se permite interpolar linealmente (nota 5). El Caso C (B/s ≥ 2, p.295) no se transcribe.
 */
export const CF_VALLAS_AB: readonly { sh: number; cf: readonly number[] }[] = [
  { sh: 1.0, cf: [1.8, 1.7, 1.65, 1.55, 1.45, 1.4, 1.35, 1.35, 1.3, 1.3, 1.3, 1.3] },
  { sh: 0.9, cf: [1.85, 1.75, 1.7, 1.6, 1.55, 1.5, 1.45, 1.45, 1.4, 1.4, 1.4, 1.4] },
  { sh: 0.7, cf: [1.9, 1.85, 1.75, 1.7, 1.65, 1.6, 1.6, 1.55, 1.55, 1.55, 1.55, 1.55] },
  { sh: 0.5, cf: [1.95, 1.85, 1.8, 1.75, 1.75, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.75] },
  { sh: 0.3, cf: [1.95, 1.9, 1.85, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.85, 1.85, 1.85] },
  { sh: 0.2, cf: [1.95, 1.9, 1.85, 1.8, 1.8, 1.8, 1.8, 1.8, 1.85, 1.9, 1.9, 1.95] },
  { sh: 0.16, cf: [1.95, 1.9, 1.85, 1.85, 1.8, 1.8, 1.85, 1.85, 1.85, 1.9, 1.9, 1.95] },
];

/** Estructuras sobre cubierta con Af < 0.1·B·h en edificios h ≤ 18 m: factor 1.9 → 1.0 (B.6.5.15.1). PDF p.256 (B-37). */
export const FACTOR_EQUIPO_CUBIERTA = { maximo: 1.9, minimo: 1.0 } as const;
