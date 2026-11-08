/**
 * Resistencia a la compresión de la mampostería f′m (Capítulo D.3 de la NSR-10, D.3.5.3, D.3.7 y D.3.8).
 * SI: MPa, mm, kN. Lógica pura: la comparten la calculadora FmMamposteria y los ejemplos del capítulo d3.
 * PDF = página impresa "D-n" + 565.
 *
 * Todo lo marcado «(interpretación)» es una decisión del proyecto para casos que el texto de la norma deja
 * ambiguos; no es texto de la NSR-10.
 */
import {
  ACEPTACION,
  CV_MAX_HISTORICO,
  FACTOR_FM_SOBRE_RM,
  FACTOR_MAX_SOBRE_MENOR,
  FM_INYECTADO,
  FRACCION_ESTADISTICA,
  FRECUENCIAS_MUESTREO,
  KP,
  KR,
  RELACION_MURETE,
  RELLENO_LIMITES,
  RM,
  TABLA_D371,
  UMBRAL_N,
  type OrigenEstadistico,
  type TipoUnidad,
} from '../../data/materialesMamposteria';

/* ------------------------------------------------------------------ */
/* D.3.7.2 — Muretes                                                    */
/* ------------------------------------------------------------------ */

/** ¿La relación altura/espesor está entre 1.5 y 5 (D.3.7.2.4) y, por tanto, dentro de la Tabla D.3.7-1? */
export function relacionMureteValida(relacion: number): boolean {
  return Number.isFinite(relacion) && relacion >= RELACION_MURETE.min && relacion <= RELACION_MURETE.max;
}

/**
 * Factor de corrección por esbeltez del murete (Tabla D.3.7-1, D.3.7.2.5, PDF p.583, D-18).
 * En los valores tabulados devuelve el de la norma; entre ellos interpola linealmente (interpretación: el PDF no
 * indica cómo tratar relaciones intermedias). Fuera de 1.5–5 devuelve NaN (el murete no cumple D.3.7.2.4).
 */
export function factorEsbeltezMurete(relacion: number): number {
  if (!relacionMureteValida(relacion)) return NaN;
  for (let i = 0; i < TABLA_D371.length; i++) {
    const a = TABLA_D371[i];
    if (relacion === a.relacion) return a.factor;
    const b = TABLA_D371[i + 1];
    if (b && relacion > a.relacion && relacion < b.relacion) {
      const t = (relacion - a.relacion) / (b.relacion - a.relacion);
      return a.factor + t * (b.factor - a.factor);
    }
  }
  return NaN;
}

/** ¿La relación coincide exactamente con un valor tabulado de la Tabla D.3.7-1 (sin interpolar)? */
export function esValorTabulado(relacion: number): boolean {
  return TABLA_D371.some((f) => f.relacion === relacion);
}

/** Esfuerzo de un murete = carga última / área neta (D.3.7.2.3). Carga en kN, área en mm²: resultado en MPa. */
export function esfuerzoMurete(cargaKN: number, areaNetaMm2: number): number {
  return (cargaKN * 1000) / areaNetaMm2;
}

export type ResultadoMuestraMuretes = {
  n: number;
  /** ¿Hay los 3 muretes que exige D.3.7.2.2? */
  completa: boolean;
  promedio: number;
  menor: number;
  /** 1.25 × el menor valor (límite de D.3.7.2.2). */
  tope: number;
  /** ¿El promedio excedía el tope y se limitó? */
  limitado: boolean;
  /** Promedio después de aplicar el tope del 125 % del menor. */
  promedioLimitado: number;
  relacion: number;
  relacionValida: boolean;
  /** Factor de la Tabla D.3.7-1 (NaN si la relación está fuera de 1.5–5). */
  factor: number;
  /** f′m de la muestra = promedioLimitado × factor (MPa). */
  fm: number;
};

/**
 * f′m de una muestra de muretes: promedio de los esfuerzos (≤ 125 % del menor, D.3.7.2.2) por el factor de esbeltez (D.3.7.2.5).
 * El orden «tope → factor» equivale a «factor → tope» porque el factor es común a los 3 muretes (la misma geometría).
 */
export function fmMuestraMuretes(esfuerzos: readonly number[], relacionHT: number): ResultadoMuestraMuretes {
  const n = esfuerzos.length;
  const promedio = esfuerzos.reduce((s, x) => s + x, 0) / n;
  const menor = Math.min(...esfuerzos);
  const tope = FACTOR_MAX_SOBRE_MENOR * menor;
  const limitado = promedio > tope;
  const promedioLimitado = limitado ? tope : promedio;
  const factor = factorEsbeltezMurete(relacionHT);
  return {
    n,
    completa: n >= 3,
    promedio,
    menor,
    tope,
    limitado,
    promedioLimitado,
    relacion: relacionHT,
    relacionValida: relacionMureteValida(relacionHT),
    factor,
    fm: promedioLimitado * factor,
  };
}

/* ------------------------------------------------------------------ */
/* D.3.7.3 y D.3.7.4 — Determinación estadística / experimental         */
/* ------------------------------------------------------------------ */

export type Estadisticos = { n: number; promedio: number; desviacion: number; cv: number };

/** Promedio, desviación estándar muestral (n − 1) y coeficiente de variación (la norma no define cuál desviación usar; interpretación). */
export function estadisticos(valores: readonly number[]): Estadisticos {
  const n = valores.length;
  const promedio = valores.reduce((s, x) => s + x, 0) / n;
  const desviacion = n > 1 ? Math.sqrt(valores.reduce((s, x) => s + (x - promedio) ** 2, 0) / (n - 1)) : 0;
  return { n, promedio, desviacion, cv: promedio > 0 ? desviacion / promedio : NaN };
}

export type ResultadoEstadistico = Estadisticos & {
  origen: OrigenEstadistico;
  /** ¿Se puede aplicar el procedimiento? */
  aplicable: boolean;
  /** Fracción del promedio que se adopta (null si no aplicable). */
  fraccion: number | null;
  /** f′m adoptado en MPa (null si no aplicable). */
  fm: number | null;
  /** Numeral de la norma aplicado, p. ej. "D.3.7.3.2". */
  numeral: string;
  /** Razones de no aplicabilidad o advertencias. */
  motivos: string[];
  /** ¿El tramo es una interpretación del proyecto (n = 10 en D.3.7.4)? */
  interpretacion: boolean;
};

/**
 * f′m por determinación estadística.
 * - `historico` (D.3.7.3): registros de muretes de obras anteriores; exige CV ≤ 30 %; n ≥ 30 → 75 %; 10 ≤ n < 30 → 70 %; n < 10 no se permite.
 *   (D.3.7.3.1 dice «superior o igual a 30» y D.3.7.3.2 «de 10 a 30»: se adopta 30 en el tramo del 75 %.)
 * - `previo` (D.3.7.4): muretes preliminares a la obra; n ≥ 30 → 85 %; 10 < n < 30 → 80 %; 3 ≤ n < 10 → 75 %.
 *   El texto deja n = 10 sin tramo («superior a 10» y «inferior a 10»): se adopta 80 % (interpretación).
 */
export function fmEstadistico(valores: readonly number[], origen: OrigenEstadistico): ResultadoEstadistico {
  const est = estadisticos(valores);
  const { n } = est;
  const motivos: string[] = [];
  let fraccion: number | null = null;
  let numeral = '';
  let interpretacion = false;

  if (origen === 'historico') {
    if (n >= UMBRAL_N.alto) {
      fraccion = FRACCION_ESTADISTICA.historico.n30;
      numeral = 'D.3.7.3.1';
    } else if (n >= UMBRAL_N.medio) {
      fraccion = FRACCION_ESTADISTICA.historico.n10;
      numeral = 'D.3.7.3.2';
    } else {
      numeral = 'D.3.7.3.3';
      motivos.push('Con menos de 10 pruebas registradas no se pueden usar registros históricos (D.3.7.3.3).');
    }
    if (n >= UMBRAL_N.medio && !(est.cv <= CV_MAX_HISTORICO)) {
      fraccion = null;
      motivos.push(`El coeficiente de variación (${(est.cv * 100).toFixed(1)} %) excede el 30 % exigido para usar registros históricos (D.3.7.3).`);
    }
  } else {
    if (n >= UMBRAL_N.alto) {
      fraccion = FRACCION_ESTADISTICA.previo.n30;
      numeral = 'D.3.7.4.1';
    } else if (n >= UMBRAL_N.medio) {
      fraccion = FRACCION_ESTADISTICA.previo.n10;
      numeral = 'D.3.7.4.2';
      if (n === UMBRAL_N.medio) {
        interpretacion = true;
        motivos.push('Con exactamente 10 muretes el texto no indica tramo («superior a 10» / «inferior a 10»): se adopta el 80 % (interpretación del proyecto).');
      }
    } else if (n >= UMBRAL_N.minimoPrevio) {
      fraccion = FRACCION_ESTADISTICA.previo.n3;
      numeral = 'D.3.7.4.3';
    } else {
      numeral = 'D.3.7.4.3';
      motivos.push('Se requieren al menos 3 muretes ensayados (D.3.7.4.3).');
    }
  }

  return {
    ...est,
    origen,
    aplicable: fraccion !== null,
    fraccion,
    fm: fraccion === null ? null : fraccion * est.promedio,
    numeral,
    motivos,
    interpretacion,
  };
}

/* ------------------------------------------------------------------ */
/* D.3.7.5 y D.3.7.6 — f′m a partir de la calidad de los materiales     */
/* ------------------------------------------------------------------ */

export type EntradaRm = {
  /** Altura de la unidad (mm). */
  h: number;
  /** Resistencia especificada de la unidad sobre área neta f′cu (MPa). */
  fcu: number;
  /** Resistencia especificada del mortero de pega f′cp (MPa). */
  fcp: number;
  /** Factor de absorción kp (1.4 concreto; 0.8 arcilla o sílico-calcárea). */
  kp: number;
};

export type ResultadoRm = {
  terminoUnidad: number;
  terminoMortero: number;
  /** Suma de los dos términos antes del límite. */
  sinLimite: number;
  /** Límite 0.8 f′cu. */
  limite: number;
  gobiernaLimite: boolean;
  Rm: number;
};

/** Ec. D.3.7-1: Rm = 2h/(75+3h)·f′cu + 50kp/(75+3h)·f′cp ≤ 0.8 f′cu (PDF p.584, D-19). */
export function resistenciaRm({ h, fcu, fcp, kp }: EntradaRm): ResultadoRm {
  const den = RM.base + RM.factorAltura * h;
  const terminoUnidad = ((RM.coefAltura * h) / den) * fcu;
  const terminoMortero = ((RM.coefMortero * kp) / den) * fcp;
  const sinLimite = terminoUnidad + terminoMortero;
  const limite = RM.limiteSobreFcu * fcu;
  return { terminoUnidad, terminoMortero, sinLimite, limite, gobiernaLimite: sinLimite > limite, Rm: Math.min(sinLimite, limite) };
}

/** kp según el tipo de unidad (D.3.0). */
export function kpPorUnidad(tipo: TipoUnidad): number {
  return KP[tipo];
}
/** kr según el tipo de unidad (D.3.0). */
export function krPorUnidad(tipo: TipoUnidad): number {
  return KR[tipo];
}

/** Ec. D.3.7-2: f′m = 0.75 Rm (mampostería sin inyectar, calidad de los materiales). */
export function fmDesdeRm(Rm: number): number {
  return FACTOR_FM_SOBRE_RM * Rm;
}

export type EntradaFmInyectado = EntradaRm & {
  /** Relación área neta / área bruta de la unidad r (0 < r ≤ 1). */
  r: number;
  /** Factor kr de la mampostería inyectada. */
  kr: number;
  /** Resistencia del mortero de relleno f′cr (MPa). */
  fcr: number;
};

export type ResultadoFmInyectado = {
  Rm: ResultadoRm;
  /** 0.75 [r Rm + 0.9 kr (1 − r) f′cr], antes del tope. */
  sinTope: number;
  /** Tope 0.94 Rm. */
  tope: number;
  gobiernaTope: boolean;
  fm: number;
};

/** Ec. D.3.7-3: f′m = 0.75[r Rm + 0.9 kr (1 − r) f′cr] ≤ 0.94 Rm (PDF p.584, D-19). */
export function fmInyectado(e: EntradaFmInyectado): ResultadoFmInyectado {
  const rm = resistenciaRm(e);
  const sinTope = FM_INYECTADO.factor * (e.r * rm.Rm + FM_INYECTADO.coefRelleno * e.kr * (1 - e.r) * e.fcr);
  const tope = FM_INYECTADO.limiteSobreRm * rm.Rm;
  return { Rm: rm, sinTope, tope, gobiernaTope: sinTope > tope, fm: Math.min(sinTope, tope) };
}

/* ------------------------------------------------------------------ */
/* D.3.5.3 — Límites de f′cr del mortero de relleno                      */
/* ------------------------------------------------------------------ */

export type LimitesRelleno = {
  /** max(1.25 f′m, 12.5 MPa). */
  minimo: number;
  /** 1.5 f′m. */
  maximo: number;
  /** ¿El piso de 12.5 MPa supera al tope 1.5 f′m? (ocurre con f′m < 8.33 MPa: el texto se contradice). */
  contradiccion: boolean;
};

export function limitesMorteroRelleno(fm: number): LimitesRelleno {
  const minimo = Math.max(RELLENO_LIMITES.minSobreFm * fm, RELLENO_LIMITES.absolutoMinMpa);
  const maximo = RELLENO_LIMITES.maxSobreFm * fm;
  return { minimo, maximo, contradiccion: minimo > maximo };
}

/* ------------------------------------------------------------------ */
/* D.3.8.2 — Criterios de aceptación                                    */
/* ------------------------------------------------------------------ */

export type ResultadoAceptacion = {
  n: number;
  promedio: number;
  minimo: number;
  especificada: number;
  /** 0.8 × especificada. */
  umbralIndividual: number;
  cumplePromedio: boolean;
  cumpleIndividual: boolean;
  /** Número de resultados individuales por debajo del 80 %. */
  nBajos: number;
  /** Cumple simultáneamente ambas condiciones (D.3.8.2.1). */
  cumple: boolean;
  /** Si algún valor está bajo el 80 % se activa D.3.8.2.3 (verificar la capacidad de carga; núcleos). */
  requiereD3823: boolean;
};

/**
 * D.3.8.2.1: la calidad es satisfactoria si el promedio es ≥ la resistencia especificada Y ningún valor individual
 * es inferior al 80 % de ella (aplica a morteros de pega, de relleno, unidades y muretes; cada serie por separado — interpretación).
 */
export function verificarAceptacion(valores: readonly number[], especificada: number): ResultadoAceptacion {
  const n = valores.length;
  const promedio = valores.reduce((s, x) => s + x, 0) / n;
  const minimo = Math.min(...valores);
  const umbralIndividual = ACEPTACION.minIndividualFraccion * especificada;
  const nBajos = valores.filter((v) => v < umbralIndividual).length;
  const cumplePromedio = promedio >= especificada;
  const cumpleIndividual = nBajos === 0;
  return {
    n,
    promedio,
    minimo,
    especificada,
    umbralIndividual,
    cumplePromedio,
    cumpleIndividual,
    nBajos,
    cumple: cumplePromedio && cumpleIndividual,
    requiereD3823: nBajos > 0,
  };
}

export type ResultadoNucleos = {
  n: number;
  promedio: number;
  umbral: number;
  /** ¿El promedio de las porciones extraídas es ≥ 80 % de la especificada? */
  cumple: boolean;
  /** ¿Se tomó el número exigido (3 porciones por lote afectado)? */
  completo: boolean;
};

/** D.3.8.2.3: promedio de las porciones cortadas (3 por lote afectado) ≥ 80 % de la resistencia especificada. */
export function verificarNucleos(valores: readonly number[], especificada: number): ResultadoNucleos {
  const n = valores.length;
  const promedio = valores.reduce((s, x) => s + x, 0) / n;
  const umbral = ACEPTACION.nucleosPromedioMinFraccion * especificada;
  return { n, promedio, umbral, cumple: promedio >= umbral, completo: n >= ACEPTACION.nucleosPorLote };
}

/* ------------------------------------------------------------------ */
/* D.3.8.1 — Frecuencias mínimas de muestreo                             */
/* ------------------------------------------------------------------ */

export type EntradaFrecuencias = {
  /** Área de muro construido (m²). */
  areaMuroM2: number;
  /** Volumen de mortero de relleno inyectado (m³); 0 si no hay. */
  volumenInyectadoM3: number;
  /** Número de unidades de la obra (para calcular lotes de hasta 5000 unidades). */
  unidades: number;
  /** Días de pega (opcional; si se da, el nº de ensayos es el mayor entre el criterio por área y por día). */
  diasPega?: number;
  /** Días de inyección (opcional; ídem). */
  diasInyeccion?: number;
};

export type ResultadoFrecuencias = {
  morteroPega: number;
  morteroRelleno: number;
  unidades: number;
  muretes: number;
  /** Mínimo de muretes inyectados (≥ 50 % del total; interpretación: el total es el mínimo de 3 por 500 m²). */
  muretesInyectadosMin: number;
};

/**
 * Número mínimo de ensayos de D.3.8.1. Cuando la norma dice «por cada 200 m² … o por cada día de pega» se adopta el mayor
 * de los dos conteos (interpretación conservadora).
 */
export function frecuenciasMuestreo(e: EntradaFrecuencias): ResultadoFrecuencias {
  const F = FRECUENCIAS_MUESTREO;
  const porAreaPega = Math.ceil(e.areaMuroM2 / F.morteroPegaM2);
  const morteroPega = Math.max(porAreaPega, e.diasPega ?? 0);
  const porVolumen = e.volumenInyectadoM3 > 0 ? Math.ceil(e.volumenInyectadoM3 / F.morteroRellenoM3) : 0;
  const morteroRelleno = Math.max(porVolumen, e.volumenInyectadoM3 > 0 ? (e.diasInyeccion ?? 0) : 0);
  const lotes = Math.max(1, Math.ceil(e.unidades / F.unidadesLoteMax));
  const unidades = Math.max(lotes * F.unidadesPorLote, Math.ceil(e.areaMuroM2 / F.unidadesM2));
  const muretes = F.muretesPorGrupo * Math.max(1, Math.ceil(e.areaMuroM2 / F.muretesM2));
  return {
    morteroPega,
    morteroRelleno,
    unidades,
    muretes,
    muretesInyectadosMin: Math.ceil(F.muretesInyectadosMinFraccion * muretes),
  };
}
