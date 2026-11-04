/**
 * Requisitos generales y unidades del Título C (Capítulos C.1 y C.2; Apéndice C-F).
 * Las equivalencias son las de la Tabla del Apéndice C-F (PDF p.553, impresa C-251): la norma usa factores
 * redondeados (1 MPa = 10 kgf/cm² = 142.2 psi), por eso los resultados difieren ligeramente de la conversión exacta.
 */

/** Resistencia mínima especificada del concreto estructural, f′c ≥ 17 MPa (C.1.1.1, PDF p.303, C-1). */
export const FC_MINIMO_MPA = 17;

/** ¿Cumple f′c el mínimo de C.1.1.1? (No hay máximo salvo restricción específica del Título C.) */
export function cumpleFcMinimo(fcMpa: number): boolean {
  return fcMpa >= FC_MINIMO_MPA;
}

export type SistemaUnidades = 'SI' | 'mks' | 'ingles';

/** Factores de esfuerzo del Apéndice C-F: 1 MPa = 10 kgf/cm² = 142.2 psi. */
export const KGF_CM2_POR_MPA = 10;
export const PSI_POR_MPA = 142.2;

/** Esfuerzo en MPa → esfuerzo en el sistema indicado (MPa, kgf/cm² o psi) con los factores de C-F. */
export function esfuerzoDesdeMpa(mpa: number, sistema: SistemaUnidades): number {
  if (sistema === 'mks') return mpa * KGF_CM2_POR_MPA;
  if (sistema === 'ingles') return mpa * PSI_POR_MPA;
  return mpa;
}

/** Esfuerzo en el sistema indicado → MPa (inverso de `esfuerzoDesdeMpa`). */
export function esfuerzoAMpa(valor: number, sistema: SistemaUnidades): number {
  if (sistema === 'mks') return valor / KGF_CM2_POR_MPA;
  if (sistema === 'ingles') return valor / PSI_POR_MPA;
  return valor;
}

/**
 * Coeficientes de los términos con raíz de f′c de la tabla C-F. Cada fila es la MISMA cantidad escrita en los tres
 * sistemas: `coef · √f′c` con f′c expresada en las unidades de cada sistema (MPa, kgf/cm², psi).
 */
export const FILAS_RAIZ_FC = [
  { id: 'raiz', si: 1, mks: 3.18, ingles: 12 },
  { id: '0.313', si: 0.313, mks: 1, ingles: 3.77 },
  { id: '0.083', si: 0.083, mks: 0.27, ingles: 1 },
  { id: '0.17', si: 0.17, mks: 0.53, ingles: 2 },
] as const;

export type IdFilaRaizFc = (typeof FILAS_RAIZ_FC)[number]['id'];

export type TerminoRaizFc = {
  /** f′c convertida al sistema indicado. */
  fcEnSistema: number;
  /** Valor del término `coef·√f′c` en las unidades del sistema (MPa, kgf/cm² o psi). */
  valorEnSistema: number;
  /** El mismo valor expresado en MPa (con los factores de C-F). */
  valorMpa: number;
};

/**
 * Evalúa un término `coef·√f′c` de la tabla C-F en el sistema indicado y lo devuelve también en MPa.
 * Sirve para ver cuánto difieren entre sí las tres versiones (por el redondeo de los coeficientes).
 */
export function terminoRaizFc(fcMpa: number, fila: IdFilaRaizFc, sistema: SistemaUnidades): TerminoRaizFc {
  const f = FILAS_RAIZ_FC.find((x) => x.id === fila);
  if (!f) throw new RangeError(`fila desconocida: ${fila}`);
  if (fcMpa <= 0) throw new RangeError('f′c debe ser positiva');
  const coef = sistema === 'SI' ? f.si : sistema === 'mks' ? f.mks : f.ingles;
  const fcEnSistema = esfuerzoDesdeMpa(fcMpa, sistema);
  const valorEnSistema = coef * Math.sqrt(fcEnSistema);
  return { fcEnSistema, valorEnSistema, valorMpa: esfuerzoAMpa(valorEnSistema, sistema) };
}

/** Momento de kN·m a N·mm (unidad de M en el Título C): 1 kN·m = 10⁶ N·mm. */
export function kNmANmm(kNm: number): number {
  return kNm * 1e6;
}

/** Fuerza de kN a N (unidad de V, N y P en el Título C): 1 kN = 10³ N. */
export function kNAN(kN: number): number {
  return kN * 1e3;
}

/** Cuantía de refuerzo longitudinal ρ = As/(b·d) (C.2.1, notación ρ y ρw, PDF p.317, C-15), con As en mm² y b, d en mm. */
export function cuantia(AsMm2: number, bMm: number, dMm: number): number {
  if (bMm <= 0 || dMm <= 0) throw new RangeError('b y d deben ser positivos');
  return AsMm2 / (bMm * dMm);
}

/**
 * Clasificación de un elemento a compresión por esbeltez geométrica, según las definiciones de C.2.2 (PDF p.319 y p.324):
 * columna si altura / menor dimensión lateral > 3; pedestal si ≤ 3.
 */
export function columnaOPedestal(alturaMm: number, menorDimensionMm: number): 'columna' | 'pedestal' {
  if (alturaMm <= 0 || menorDimensionMm <= 0) throw new RangeError('dimensiones positivas');
  return alturaMm / menorDimensionMm > 3 ? 'columna' : 'pedestal';
}

/**
 * Clasificación de la sección por la deformación unitaria neta de tracción εt en el acero extremo (C.2.2, PDF p.325):
 * controlada por tracción si εt ≥ 0.005; controlada por compresión si εt ≤ límite de deformación controlada por compresión
 * (el límite depende de fy, C.10.3.3; se pasa como argumento). En medio es la zona de transición.
 */
export function tipoSeccion(epsilonT: number, limiteCompresion: number): 'controlada por tracción' | 'transición' | 'controlada por compresión' {
  if (epsilonT >= 0.005) return 'controlada por tracción';
  if (epsilonT <= limiteCompresion) return 'controlada por compresión';
  return 'transición';
}
