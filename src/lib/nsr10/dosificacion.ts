/**
 * Lógica del Capítulo C.5 (Calidad del concreto, mezclado y colocación) de la NSR-10:
 * resistencia promedio requerida f′cr, factor de modificación de la desviación estándar y criterios de aceptación.
 * Datos en `src/data/dosificacion.ts`. Unidades: MPa. Página PDF = página impresa "C-n" + 302.
 */
import {
  COEF_FCR,
  COEF_FCR_SIN_DATOS,
  CURADO_OBRA,
  FACTOR_MODIFICACION_DESVIACION,
  FC_LIMITE_ECUACIONES_MPA,
  FC_MIN_NSR10_MPA,
  FRECUENCIA_MUESTREO,
  MARGEN_RESULTADO_INDIVIDUAL,
  NUCLEOS,
  N_DESVIACION_COMPLETA,
  N_MIN_DESVIACION_MODIFICADA,
  N_MIN_ENSAYOS_PROYECTO,
  SUMA_SIN_EXPERIENCIA_MPA,
  VOLUMEN_SIN_ENSAYOS_M3,
} from '../../data/dosificacion';

const EPS = 1e-9;

// ---------------------------------------------------------------------------------------------
// Estadística básica (no es texto de la norma: es la definición usual de desviación estándar de la muestra)
// ---------------------------------------------------------------------------------------------

/** Promedio aritmético. */
export function promedio(valores: readonly number[]): number {
  if (valores.length === 0) throw new RangeError('Se requiere al menos un valor');
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Desviación estándar de la muestra, s = √[Σ(xi − x̄)² / (n − 1)], con n ≥ 2 (definición estadística usual). */
export function desviacionEstandar(valores: readonly number[]): number {
  const n = valores.length;
  if (n < 2) throw new RangeError('Se requieren al menos 2 ensayos para la desviación estándar');
  const m = promedio(valores);
  return Math.sqrt(valores.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
}

// ---------------------------------------------------------------------------------------------
// C.5.3.1.2 — Factor de modificación de la desviación estándar
// ---------------------------------------------------------------------------------------------

/**
 * Factor de modificación de la Tabla C.5.3.1.2 (C-40): 15 → 1.16, 20 → 1.08, 25 → 1.03, 30 o más → 1.00; interpolación lineal
 * para n intermedio (nota * de la tabla). Para n < 15 la tabla no da factor ("Emplee la tabla C.5.3.2.2") y se devuelve `null`.
 */
export function factorModificacionDesviacion(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('n debe ser un número no negativo');
  if (n < N_MIN_DESVIACION_MODIFICADA) return null;
  if (n >= N_DESVIACION_COMPLETA) return 1;
  const tabla = FACTOR_MODIFICACION_DESVIACION;
  for (let i = 0; i < tabla.length - 1; i++) {
    const a = tabla[i];
    const b = tabla[i + 1];
    if (n >= a.n && n <= b.n) return a.factor + ((n - a.n) / (b.n - a.n)) * (b.factor - a.factor);
  }
  return 1;
}

/** Desviación estándar modificada ss = s · factor (C.5.3.1.2), o `null` si n < 15 (se debe usar la Tabla C.5.3.2.2). */
export function desviacionModificada(s: number, n: number): number | null {
  const f = factorModificacionDesviacion(n);
  return f === null ? null : s * f;
}

// ---------------------------------------------------------------------------------------------
// C.5.3.2 — Resistencia promedio requerida
// ---------------------------------------------------------------------------------------------

export interface FcrConDatos {
  /** f′cr adoptado, MPa. */
  fcr: number;
  /** Valor de la ecuación (C.5-1). */
  c51: number;
  /** Valor de la segunda ecuación: (C.5-2) si f′c ≤ 35 MPa o (C.5-3) si f′c > 35 MPa. */
  segunda: number;
  /** Número de la segunda ecuación aplicada. */
  ecuacionSegunda: 'C.5-2' | 'C.5-3';
  /** Ecuación que gobierna (la de mayor valor). */
  gobierna: 'C.5-1' | 'C.5-2' | 'C.5-3';
}

/**
 * Tabla C.5.3.2.1 (C-40): f′cr con desviación estándar ss disponible. f′c ≤ 35 MPa: mayor de f′c + 1.34 ss (C.5-1) y
 * f′c + 2.33 ss − 3.5 (C.5-2). f′c > 35 MPa: mayor de C.5-1 y 0.90 f′c + 2.33 ss (C.5-3).
 */
export function fcrConDatos(fc: number, ss: number): FcrConDatos {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  if (!(ss >= 0)) throw new RangeError('La desviación estándar debe ser no negativa');
  const c51 = fc + COEF_FCR.c51.k * ss;
  const alta = fc > FC_LIMITE_ECUACIONES_MPA;
  const segunda = alta ? COEF_FCR.c53.factorFc * fc + COEF_FCR.c53.k * ss : fc + COEF_FCR.c52.k * ss - COEF_FCR.c52.resta;
  const ecuacionSegunda = alta ? 'C.5-3' : 'C.5-2';
  const gobierna = c51 >= segunda ? 'C.5-1' : ecuacionSegunda;
  return { fcr: Math.max(c51, segunda), c51, segunda, ecuacionSegunda, gobierna };
}

/** Tabla C.5.3.2.2 (C-41): f′cr cuando no hay registros para calcular ss. f′c < 21: +7.0; 21 ≤ f′c ≤ 35: +8.3; f′c > 35: 1.10 f′c + 5.0. */
export function fcrSinDatos(fc: number): number {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  if (fc < COEF_FCR_SIN_DATOS.bajo.limite) return fc + COEF_FCR_SIN_DATOS.bajo.suma;
  if (fc <= COEF_FCR_SIN_DATOS.alto.limite) return fc + COEF_FCR_SIN_DATOS.medio.suma;
  return COEF_FCR_SIN_DATOS.alto.factorFc * fc + COEF_FCR_SIN_DATOS.alto.suma;
}

/** C.5.4.1: sin experiencia en obra ni mezclas de prueba, f′cr ≥ f′c + 8.3 MPa; no permitido si f′c > 35 MPa (devuelve `null`). */
export function fcrSinExperiencia(fc: number): number | null {
  if (!(fc > 0)) throw new RangeError('f′c debe ser positivo');
  return fc > FC_LIMITE_ECUACIONES_MPA ? null : fc + SUMA_SIN_EXPERIENCIA_MPA;
}

export type OrigenFcr = 'desviacion-completa' | 'desviacion-modificada' | 'tabla-sin-datos';

export interface ResultadoFcr {
  fcr: number;
  origen: OrigenFcr;
  /** n ensayos del registro (si se dio). */
  n?: number;
  /** Desviación estándar calculada de los ensayos (sin modificar). */
  s?: number;
  /** Factor de modificación aplicado (1 si n ≥ 30). */
  factor?: number;
  /** Desviación estándar usada en las ecuaciones (ss). */
  ss?: number;
  /** Detalle de las ecuaciones C.5-1 y C.5-2/C.5-3 (solo si hubo ss). */
  detalle?: FcrConDatos;
}

/**
 * f′cr de una planta según la cantidad de ensayos del registro (C.5.3.1 y C.5.3.2):
 * n ≥ 30 → ss = s; 15 ≤ n ≤ 29 → ss = s × factor (Tabla C.5.3.1.2); n < 15 o sin registro → Tabla C.5.3.2.2.
 * Los requisitos cualitativos del registro (materiales similares, f′c dentro de 7 MPa, 45 días, menos de 12 meses) no se pueden
 * verificar aquí: son responsabilidad del usuario.
 */
export function fcrPlanta(fc: number, s?: number, n?: number): ResultadoFcr {
  if (s === undefined || n === undefined || !Number.isFinite(s) || !Number.isFinite(n) || n < N_MIN_DESVIACION_MODIFICADA) {
    return { fcr: fcrSinDatos(fc), origen: 'tabla-sin-datos', n, s };
  }
  const factor = factorModificacionDesviacion(n) as number;
  const ss = s * factor;
  const detalle = fcrConDatos(fc, ss);
  return { fcr: detalle.fcr, origen: n >= N_DESVIACION_COMPLETA ? 'desviacion-completa' : 'desviacion-modificada', n, s, factor, ss, detalle };
}

// ---------------------------------------------------------------------------------------------
// C.5.6.2 — Frecuencia de ensayos
// ---------------------------------------------------------------------------------------------

export interface MuestreoMinimo {
  /** Muestras mínimas por cada criterio. */
  porDia: number;
  porVolumen: number;
  porSuperficie: number;
  porTandas: number;
  /** Número mínimo de muestras de ese día (el mayor de los cuatro criterios). */
  minimo: number;
}

/**
 * Muestras mínimas de una clase de concreto colocada en un día (C.5.6.2.1, C-42): una vez al día, una por cada 40 m³,
 * una por cada 200 m² de superficie de losas o muros y una por cada 50 tandas. Se redondea hacia arriba cada fracción
 * (interpretación usual de "por cada").
 */
export function muestrasMinimasDia(volumenM3: number, superficieM2 = 0, tandas = 0): MuestreoMinimo {
  if (volumenM3 < 0 || superficieM2 < 0 || tandas < 0) throw new RangeError('Las cantidades deben ser no negativas');
  const porVolumen = Math.ceil(volumenM3 / FRECUENCIA_MUESTREO.m3 - EPS);
  const porSuperficie = Math.ceil(superficieM2 / FRECUENCIA_MUESTREO.m2 - EPS);
  const porTandas = Math.ceil(tandas / FRECUENCIA_MUESTREO.tandas - EPS);
  const porDia = FRECUENCIA_MUESTREO.porDia;
  return { porDia, porVolumen, porSuperficie, porTandas, minimo: Math.max(porDia, porVolumen, porSuperficie, porTandas) };
}

/** C.5.6.2.2: si el total de ensayos del proyecto sería menor de 5 deben ensayarse al menos 5 tandas al azar (o todas si hay menos de 5). */
export function ensayosMinimosProyecto(ensayosPorFrecuencia: number, tandasTotales: number): number {
  if (ensayosPorFrecuencia >= N_MIN_ENSAYOS_PROYECTO) return ensayosPorFrecuencia;
  return Math.min(N_MIN_ENSAYOS_PROYECTO, tandasTotales);
}

/** C.5.6.2.3: con menos de 10 m³ de una clase de concreto pueden omitirse los ensayos si el Supervisor Técnico aprueba la evidencia. */
export function puedeOmitirEnsayos(volumenTotalM3: number): boolean {
  return volumenTotalM3 < VOLUMEN_SIN_ENSAYOS_M3;
}

// ---------------------------------------------------------------------------------------------
// C.5.6.3 — Aceptación con cilindros curados en forma estándar
// ---------------------------------------------------------------------------------------------

/** Un ensayo de resistencia es el promedio de las resistencias de las probetas hechas de la misma muestra (C.5.6.2.4). */
export function resultadoDeEnsayo(probetasMpa: readonly number[]): number {
  return promedio(probetasMpa);
}

/** Valor mínimo admisible de un ensayo individual (C.5.6.3.3(b)): f′c − 3.5 si f′c ≤ 35; 0.90 f′c si f′c > 35. */
export function minimoIndividual(fc: number): number {
  return fc <= MARGEN_RESULTADO_INDIVIDUAL.limiteFc ? fc - MARGEN_RESULTADO_INDIVIDUAL.mpa : fc * (1 - MARGEN_RESULTADO_INDIVIDUAL.fraccion);
}

export interface EvaluacionAceptacion {
  fc: number;
  n: number;
  /** Mínimo individual admitido (criterio b). */
  minimoIndividual: number;
  /** Promedios móviles de 3 ensayos consecutivos (criterio a); vacío si n < 3. */
  promediosMoviles: number[];
  /** Índices (base 0) de los grupos de 3 cuyo promedio es menor que f′c. */
  gruposFallidos: number[];
  /** Índices (base 0) de los ensayos individuales por debajo del mínimo individual. */
  individualesFallidos: number[];
  /** Cumple (a): todo promedio de tres ensayos consecutivos ≥ f′c (verdadero también si n < 3, sin grupos que evaluar). */
  cumpleA: boolean;
  /** Cumple (b): ningún ensayo menor que f′c por más del margen. */
  cumpleB: boolean;
  /** Nivel de resistencia satisfactorio (a y b). */
  satisfactorio: boolean;
  /** Si no cumple (b) hay que investigar según C.5.6.5. */
  requiereInvestigacion: boolean;
  /** Hay menos de 3 ensayos y no se puede aplicar el criterio (a). */
  datosInsuficientes: boolean;
}

/**
 * Evaluación del nivel de resistencia (C.5.6.3.3, C-42): satisfactorio si (a) cada promedio aritmético de tres ensayos
 * consecutivos es ≥ f′c y (b) ningún ensayo es menor que f′c por más de 3.5 MPa (f′c ≤ 35) o más de 0.10 f′c (f′c > 35).
 */
export function evaluarAceptacion(ensayos: readonly number[], fc: number): EvaluacionAceptacion {
  const n = ensayos.length;
  const minInd = minimoIndividual(fc);
  const promediosMoviles: number[] = [];
  const gruposFallidos: number[] = [];
  for (let i = 0; i + 2 < n; i++) {
    const p = (ensayos[i] + ensayos[i + 1] + ensayos[i + 2]) / 3;
    promediosMoviles.push(p);
    if (p < fc - EPS) gruposFallidos.push(i);
  }
  const individualesFallidos = ensayos.map((x, i) => (x < minInd - EPS ? i : -1)).filter((i) => i >= 0);
  const cumpleA = gruposFallidos.length === 0;
  const cumpleB = individualesFallidos.length === 0;
  return {
    fc,
    n,
    minimoIndividual: minInd,
    promediosMoviles,
    gruposFallidos,
    individualesFallidos,
    cumpleA,
    cumpleB,
    satisfactorio: n >= 3 && cumpleA && cumpleB,
    requiereInvestigacion: !cumpleB,
    datosInsuficientes: n < 3,
  };
}

// ---------------------------------------------------------------------------------------------
// C.5.6.4 y C.5.6.5 — Curado en obra y núcleos
// ---------------------------------------------------------------------------------------------

/**
 * C.5.6.4.4: hay que mejorar la protección y el curado si la resistencia de cilindros curados en obra es menor que 85 % de la
 * de los compañeros curados en laboratorio; el 85 % no se exige si la resistencia en obra excede f′c en más de 3.5 MPa.
 */
export function curadoEnObraDeficiente(fObra: number, fLab: number, fc: number): boolean {
  if (fObra > fc + CURADO_OBRA.exencionMpa + EPS) return false;
  return fObra < CURADO_OBRA.fraccionLab * fLab - EPS;
}

export interface EvaluacionNucleos {
  promedio: number;
  /** Promedio ≥ 85 % de f′c. */
  cumplePromedio: boolean;
  /** Ningún núcleo menor del 75 % de f′c. */
  cumpleMinimo: boolean;
  /** Estructuralmente adecuado (ambos). */
  adecuado: boolean;
  /** Umbrales usados (MPa). */
  umbralPromedio: number;
  umbralMinimo: number;
}

/** C.5.6.5.4 (C-43): tres núcleos: promedio ≥ 85 % de f′c y ningún núcleo < 75 % de f′c. */
export function evaluarNucleos(nucleosMpa: readonly number[], fc: number): EvaluacionNucleos {
  if (nucleosMpa.length < NUCLEOS.cantidad) throw new RangeError('Se requieren tres núcleos');
  const prom = promedio(nucleosMpa);
  const umbralPromedio = NUCLEOS.fraccionPromedio * fc;
  const umbralMinimo = NUCLEOS.fraccionMinima * fc;
  const cumplePromedio = prom >= umbralPromedio - EPS;
  const cumpleMinimo = nucleosMpa.every((x) => x >= umbralMinimo - EPS);
  return { promedio: prom, cumplePromedio, cumpleMinimo, adecuado: cumplePromedio && cumpleMinimo, umbralPromedio, umbralMinimo };
}

/** f′c mínimo permitido por C.5.1.1 (17 MPa). */
export const FC_MINIMO_MPA = FC_MIN_NSR10_MPA;

/** Curvas de f′cr contra ss para graficar: devuelve puntos {ss, c51, segunda, fcr} entre 0 y `ssMax`. */
export function curvaFcrVsDesviacion(fc: number, ssMax = 6, pasos = 24): { ss: number; c51: number; segunda: number; fcr: number }[] {
  const puntos: { ss: number; c51: number; segunda: number; fcr: number }[] = [];
  for (let i = 0; i <= pasos; i++) {
    const ss = (ssMax * i) / pasos;
    const r = fcrConDatos(fc, ss);
    puntos.push({ ss, c51: r.c51, segunda: r.segunda, fcr: r.fcr });
  }
  return puntos;
}
