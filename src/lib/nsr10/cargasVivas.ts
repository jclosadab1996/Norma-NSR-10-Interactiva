/**
 * Capítulo B.4 — Cargas vivas. Lógica de reducción (B.4.5), impacto (B.4.4), empozamiento de agua y
 * granizo (B.4.8). Las tablas están en `src/data/cargasVivas.ts`.
 * Página de la norma "B-n" = página PDF n + 219.
 */
import {
  GRANIZO,
  PANELES_INFLUENCIA,
  REDUCCION_AREA,
  REDUCCION_PISOS,
  type TipoElemento,
} from '../../data/cargasVivas';

/* ------------------------------------------------------------------ */
/* B.4.5.1 — Reducción por área aferente (PDF p.236, B-17)             */
/* ------------------------------------------------------------------ */

/** Número de paneles que definen el área de influencia de un elemento (B.4.5.1.2). */
export function numeroPaneles(tipo: TipoElemento): number {
  return PANELES_INFLUENCIA[tipo].paneles;
}

/**
 * Área de influencia Ai (m²) de un elemento (B.4.5.1.2): paneles que tocan el elemento × área de un panel.
 * Para elementos que soportan más de un piso se suman las áreas de influencia de los diferentes pisos.
 */
export function areaInfluencia(tipo: TipoElemento, areaPanelM2: number, pisosSoportados = 1): number {
  return numeroPaneles(tipo) * areaPanelM2 * pisosSoportados;
}

/** Factor bruto de la ecuación B.4.5-1: L/L0 = 0.25 + 4.6/√Ai (sin límites). */
export function factorEcuacionB451(ai: number): number {
  return 0.25 + 4.6 / Math.sqrt(ai);
}

/** Área Ai (m²) para la cual la ecuación B.4.5-1 da una fracción dada de L0: Ai = (4.6/(f − 0.25))². */
export function areaParaFraccion(fraccion: number): number {
  return (4.6 / (fraccion - 0.25)) ** 2;
}

export type ResultadoAreaAferente = {
  /** `true` si se cumplen las condiciones de B.4.5.1 (Ai ≥ 35 m² y 1.80 < L0 < 3.00 kN/m²). */
  aplica: boolean;
  /** Condiciones que no se cumplen (vacío si aplica). */
  motivos: string[];
  /** Factor de la ecuación B.4.5-1 sin límites (NaN si Ai ≤ 0). */
  factorEcuacion: number;
  /** Fracción mínima de L0 permitida por B.4.5.1.1 (0.5 un piso; 0.4 dos o más). */
  fraccionMinima: number;
  /** `true` si gobierna el mínimo de B.4.5.1.1. */
  gobiernaMinimo: boolean;
  /**
   * `true` si la ecuación da un valor mayor que L0 (35 m² ≤ Ai < 37.6 m²): como la norma habla de
   * "reducir", aquí la carga reducida nunca excede L0.
   */
  ecuacionExcedeL0: boolean;
  /** Fracción final L/L0 aplicada. */
  factor: number;
  /** Carga viva reducida L (kN/m²). */
  l: number;
};

/**
 * Reducción de la carga viva por área aferente (B.4.5.1, ecuación B.4.5-1).
 * @param l0 carga viva sin reducir (kN/m²)
 * @param ai área de influencia del elemento (m²), ya sumada sobre los pisos que soporta
 * @param pisosSoportados pisos que soporta el elemento (define el mínimo de B.4.5.1.1)
 */
export function reduccionAreaAferente(l0: number, ai: number, pisosSoportados = 1): ResultadoAreaAferente {
  const fraccionMinima = pisosSoportados >= 2 ? REDUCCION_AREA.fraccionMinVariosPisos : REDUCCION_AREA.fraccionMinUnPiso;
  const motivos: string[] = [];
  if (!(ai >= REDUCCION_AREA.areaMinM2)) motivos.push(`El área de influencia debe ser ≥ ${REDUCCION_AREA.areaMinM2} m².`);
  if (!(l0 > REDUCCION_AREA.l0MinExcl && l0 < REDUCCION_AREA.l0MaxExcl)) {
    motivos.push(`La carga viva debe ser mayor de ${REDUCCION_AREA.l0MinExcl.toFixed(2)} y menor de ${REDUCCION_AREA.l0MaxExcl.toFixed(2)} kN/m².`);
  }
  const factorEcuacion = ai > 0 ? factorEcuacionB451(ai) : NaN;
  if (motivos.length > 0) {
    return { aplica: false, motivos, factorEcuacion, fraccionMinima, gobiernaMinimo: false, ecuacionExcedeL0: false, factor: 1, l: l0 };
  }
  const ecuacionExcedeL0 = factorEcuacion > 1;
  const gobiernaMinimo = factorEcuacion < fraccionMinima;
  const factor = Math.min(1, Math.max(fraccionMinima, factorEcuacion));
  return { aplica: true, motivos, factorEcuacion, fraccionMinima, gobiernaMinimo, ecuacionExcedeL0, factor, l: l0 * factor };
}

export type PuntoCurvaReduccion = {
  ai: number;
  /** Fracción L/L0 con mínimo de un piso (50 %). */
  unPiso: number;
  /** Fracción L/L0 con mínimo de dos o más pisos (40 %). */
  variosPisos: number;
};

/**
 * Curva L/L0 contra Ai para graficar. Por debajo de 35 m² no hay reducción (factor 1). Se asume que se
 * cumple la condición de L0 de B.4.5.1.
 */
export function curvaReduccion(aiMax = 1000, pasos = 200): PuntoCurvaReduccion[] {
  const puntos: PuntoCurvaReduccion[] = [];
  for (let k = 0; k <= pasos; k++) {
    const ai = (aiMax * k) / pasos;
    if (ai < REDUCCION_AREA.areaMinM2) {
      puntos.push({ ai, unPiso: 1, variosPisos: 1 });
      continue;
    }
    const f = factorEcuacionB451(ai);
    puntos.push({
      ai,
      unPiso: Math.min(1, Math.max(REDUCCION_AREA.fraccionMinUnPiso, f)),
      variosPisos: Math.min(1, Math.max(REDUCCION_AREA.fraccionMinVariosPisos, f)),
    });
  }
  return puntos;
}

/* ------------------------------------------------------------------ */
/* B.4.5.2 — Reducción por número de pisos (PDF p.236, B-17)           */
/* ------------------------------------------------------------------ */

/**
 * Coeficiente r del piso i en un edificio de n pisos (B.4.5.2), con i = n el piso superior:
 *  - r = 1.0 para i = n … n − 4 (cinco pisos superiores)
 *  - r = 1.0 + 0.10(i − n + 4) para i = n − 5 … n − 8
 *  - r = 0.5 para i = n − 9 en adelante
 * (El PDF imprime la expresión como "1.0 + 0.10(in + 4)": falta el signo menos, que es el único
 * que hace continua la serie 1.0, 0.9, … 0.6, 0.5.)
 * Si n < 5 la reducción no aplica y se devuelve 1.0.
 */
export function coeficientePisos(i: number, n: number): number {
  if (n < REDUCCION_PISOS.pisosMin) return 1.0;
  const d = n - i; // pisos por debajo de la cubierta
  if (d <= REDUCCION_PISOS.pisosSuperioresR1 - 1) return 1.0;
  if (d <= 8) return 1.0 + 0.1 * (i - n + 4);
  return REDUCCION_PISOS.rMinimo;
}

export type FilaPiso = { piso: number; r: number; carga: number; aporte: number };

export type ResultadoPisos = {
  aplica: boolean;
  filas: FilaPiso[];
  /** Suma de las cargas vivas sin reducir (Σ Li). */
  sinReducir: number;
  /** Suma de las cargas vivas reducidas (Σ r·Li). */
  reducida: number;
  /** Fracción global reducida / sin reducir. */
  factorGlobal: number;
};

/**
 * Carga viva acumulada para columnas y cimentación como Σ r·Li (B.4.5.2).
 * @param cargasPorPiso carga viva (en kN o kN/m²: la unidad se conserva) de cada piso, del piso 1 al piso n
 */
export function reduccionPorPisos(cargasPorPiso: readonly number[]): ResultadoPisos {
  const n = cargasPorPiso.length;
  const filas = cargasPorPiso.map((carga, k) => {
    const piso = k + 1;
    const r = coeficientePisos(piso, n);
    return { piso, r, carga, aporte: r * carga };
  });
  const sinReducir = filas.reduce((s, f) => s + f.carga, 0);
  const reducida = filas.reduce((s, f) => s + f.aporte, 0);
  return { aplica: n >= REDUCCION_PISOS.pisosMin, filas, sinReducir, reducida, factorGlobal: sinReducir > 0 ? reducida / sinReducir : 1 };
}

/** Atajo: n pisos iguales con carga `carga` cada uno. */
export function reduccionPorPisosUniforme(n: number, carga: number): ResultadoPisos {
  return reduccionPorPisos(Array.from({ length: n }, () => carga));
}

/* ------------------------------------------------------------------ */
/* B.4.4 — Impacto (PDF p.235-236)                                      */
/* ------------------------------------------------------------------ */

/** Carga viva incrementada por impacto: L · (1 + p/100). */
export function cargaConImpacto(l: number, porcentaje: number): number {
  return l * (1 + porcentaje / 100);
}

/* ------------------------------------------------------------------ */
/* B.4.8 — Empozamiento de agua y granizo (PDF p.237, B-18)            */
/* ------------------------------------------------------------------ */

/** Peso unitario del agua dulce: 1 000 kg/m³ · 9.8 m/s² (Tabla B.3.2-1, B-9) = 9.8 kN/m³. */
export const GAMMA_AGUA_DULCE = 9.8;
/** Peso unitario del agua marina: 1 030 kg/m³ · 9.8 m/s² (Tabla B.3.2-1) = 10.094 kN/m³. */
export const GAMMA_AGUA_MARINA = (1030 * 9.8) / 1000;

/** Carga de empozamiento Le (kN/m²) por profundidad h (m) de agua hasta el nivel del rebosadero: Le = γw·h. */
export function empozamientoPorProfundidad(h: number, gammaW = GAMMA_AGUA_DULCE): number {
  return gammaW * h;
}

/** Peso total del agua acumulada (kN) para un volumen V (m³): W = γw·V. */
export function pesoAguaEmpozada(volumenM3: number, gammaW = GAMMA_AGUA_DULCE): number {
  return gammaW * volumenM3;
}

/** Carga de empozamiento Le (kN/m²) repartida sobre el área de cubierta A (m²) a partir del volumen V (m³). */
export function empozamientoPorVolumen(volumenM3: number, areaM2: number, gammaW = GAMMA_AGUA_DULCE): number {
  return pesoAguaEmpozada(volumenM3, gammaW) / areaM2;
}

/** Profundidad media de agua (m) equivalente a un volumen V sobre un área A. */
export function profundidadEquivalente(volumenM3: number, areaM2: number): number {
  return volumenM3 / areaM2;
}

export type ResultadoGranizo = {
  /** `true` si hay que considerar granizo (altura > 2 000 m o exigencia de la autoridad). */
  aplica: boolean;
  /** Motivo de aplicación; vacío si no aplica. */
  motivo: '' | 'altura' | 'autoridad';
  /** Carga de granizo G en kN/m² (0 si no aplica). */
  g: number;
  /** `true` si se usó el valor reducido (inclinación > 15°). */
  reducida: boolean;
};

/**
 * Carga de granizo G (B.4.8.3): se considera por encima de 2 000 m s. n. m. o donde la autoridad lo exija;
 * vale 1.0 kN/m², o 0.5 kN/m² si la cubierta tiene inclinación mayor a 15°.
 */
export function cargaGranizo(opts: { alturaMsnm: number; inclinacionGrados: number; exigidoPorAutoridad?: boolean }): ResultadoGranizo {
  const porAltura = opts.alturaMsnm > GRANIZO.alturaMsnmM;
  const porAutoridad = !!opts.exigidoPorAutoridad;
  if (!porAltura && !porAutoridad) return { aplica: false, motivo: '', g: 0, reducida: false };
  const reducida = opts.inclinacionGrados > GRANIZO.inclinacionReduccionGrados;
  return { aplica: true, motivo: porAltura ? 'altura' : 'autoridad', g: reducida ? GRANIZO.gReducida : GRANIZO.g, reducida };
}
