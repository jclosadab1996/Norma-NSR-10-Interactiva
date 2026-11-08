/**
 * Constantes de diseño de la mampostería de muros confinados (NSR-10, Título D, D.10.7 — Requisitos de análisis y diseño,
 * D-57 a D-61; PDF = página impresa + 565, es decir PDF 622 a 626).
 *
 * Aquí solo hay números que el texto de la norma fija (coeficientes de ecuaciones y φ). Las unidades de las ecuaciones son
 * N, mm y MPa; las funciones de `src/lib/nsr10/muroConfinadoResistencia.ts` convierten en la frontera a kN y kN·m.
 */

/**
 * φ de D.10.7.2 (D-57), que REEMPLAZAN a los de D.5.1.5 en la mampostería de muros confinados:
 * (a) compresión axial, con o sin flexión: 0.65 · (b) tracción axial: 0.85 · (c) flexión sin carga axial: 0.85 · (d) cortante: 0.50.
 */
export const PHI_CONFINADO = {
  compresion: 0.65,
  traccion: 0.85,
  flexion: 0.85,
  cortante: 0.5,
} as const;

/** φ de cortante de concreto reforzado en el Título C (C.9.3.2.3), solo como alternativa a la lectura literal de D.10.7.2 (d) en D.10.7.9 (autoría del proyecto). */
export const PHI_CORTANTE_TITULO_C = 0.75;

/** Ec. D.10.7-1: Pnc = 0.80 [0.85 f′c (Aci − Ast) + fy Ast]. Factor externo y factor de f′c. */
export const PNC = { factorExterno: 0.8, factorFc: 0.85 } as const;

/** Ec. D.10.7-3: Pnd = 0.80 (0.80 f′m Amd) Re. Factor externo y factor de f′m. */
export const PND = { factorExterno: 0.8, factorFm: 0.8 } as const;

/** D.10.7.5.1 (d): la carga axial en el elemento de confinamiento se toma como el DOBLE de la proporcional a las áreas. */
export const FACTOR_CARGA_COLUMNA_FUERA_PLANO = 2;

/** Ec. D.10.7-18: Vn = (√f′m/12 + Pu/(3 Ae)) Amv ≤ (√f′m/6) Amv. Divisores 12, 3 y 6. */
export const VN_CONFINADO = { divisorRaiz: 12, divisorPu: 3, divisorTope: 6 } as const;

/** D.10.7.8: la biela de compresión tiene un ancho efectivo igual a un quinto de la longitud de la diagonal. */
export const DIVISOR_ANCHO_BIELA = 5;

/** D.10.7.9: los elementos de confinamiento resisten, como cortante transversal, la MITAD de la componente de la fuerza de la biela (Ecs. D.10.7-21 y D.10.7-22). */
export const FRACCION_CORTANTE_ELEMENTO = 0.5;

/** D.10.4.1: resistencia mínima del concreto de columnas y vigas de confinamiento a los 28 días, MPa. */
export const FC_MINIMO_CONFINAMIENTO = 17.5;
