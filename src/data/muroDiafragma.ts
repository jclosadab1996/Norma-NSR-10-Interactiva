/**
 * Constantes del Capítulo D.11 (Muros diafragma) de la NSR-10. Unidades del SI: MPa, mm, mm².
 * PDF = página impresa "D-n" + 565 (D.11 ocupa D-63 y D-64 = PDF 628 y 629).
 * La lógica está en `src/lib/nsr10/muroDiafragma.ts`; el capítulo (d11.mdx) y la calculadora importan de aquí.
 */

/** Tipos de unidad de mampostería de la Tabla D.11.1-1 (D-64, PDF p.629). */
export type TipoUnidadDiafragma = 'maciza' | 'perforacion-vertical' | 'perforacion-horizontal';

/** Tabla D.11.1-1 — Valores máximos para vm en muros diafragma (MPa) (D.11.4.2, D-64). */
export const TABLA_D1111: ReadonlyArray<{ clave: TipoUnidadDiafragma; unidades: string; vm: number }> = [
  { clave: 'maciza', unidades: 'Unidades macizas de concreto o arcilla', vm: 0.35 },
  { clave: 'perforacion-vertical', unidades: 'Unidades de perforación vertical de concreto o arcilla', vm: 0.25 },
  { clave: 'perforacion-horizontal', unidades: 'Unidades de perforación horizontal de arcilla', vm: 0.15 },
];

/** vm máximo (MPa) por tipo de unidad, derivado de la Tabla D.11.1-1. */
export const VM_MAX_MPA: Readonly<Record<TipoUnidadDiafragma, number>> = {
  maciza: 0.35,
  'perforacion-vertical': 0.25,
  'perforacion-horizontal': 0.15,
};

/** Coeficiente de reducción de resistencia para corte φ = 0.50 (D.11.4.2, Ec. D.11.4-1, D-64). */
export const PHI_CORTANTE_DIAFRAGMA = 0.5;

/** Espesor nominal mínimo del muro diafragma, mm (D.11.1.4, D-63). */
export const ESPESOR_MIN_DIAFRAGMA_MM = 120;

/** Tope del coeficiente básico de capacidad de disipación de energía: R0 ≤ 2.0 (D.11.2.2, D-63). */
export const R0_MAX_DIAFRAGMA = 2.0;

/** Área efectiva máxima de compresión diagonal: la quinta parte de la diagonal por el espesor (D.11.4.1 b, D-64). */
export const FRACCION_DIAGONAL_APLASTAMIENTO = 1 / 5;

/** Cortante de diseño mínimo en vigas y columnas del pórtico: la cuarta parte del cortante del muro (D.11.4.3, D-64). */
export const FRACCION_CORTANTE_MIEMBROS = 1 / 4;

/** Zona donde se resiste ese cortante: el 25 % de la longitud del miembro (D.11.4.3, D-64). */
export const FRACCION_LONGITUD_ZONA_MIEMBRO = 0.25;

/** Tipo de mortero de pega exigido (D.11.1.4, D-63). */
export const MORTERO_DIAFRAGMA = 'M';
