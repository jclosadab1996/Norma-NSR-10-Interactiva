import { DERIVA_LIMITE, DERIVA_LIMITE_UMBRAL_DANO, type ColindanciaSeparacion } from '../../data/tablas';

export type TipoLimiteDeriva = 'general' | 'mamposteriaCortante';

/** Tabla A.6.4-1 — Límite de deriva como fracción de hpi. */
export function limiteDeriva(tipo: TipoLimiteDeriva): number {
  return DERIVA_LIMITE[tipo];
}

/** Tabla A.12.5-1 — Límite de deriva para el umbral de daño. */
export function limiteDerivaUmbralDano(tipo: TipoLimiteDeriva): number {
  return DERIVA_LIMITE_UMBRAL_DANO[tipo];
}

export type VerificacionDeriva = {
  /** Deriva (diferencia de desplazamientos entre pisos consecutivos), en la unidad de entrada. */
  deriva: number;
  /** Deriva como fracción de hpi. */
  razon: number;
  /** Límite como fracción de hpi. */
  limite: number;
  cumple: boolean;
  /** razon / limite — fracción del límite que se usa. */
  uso: number;
};

/**
 * Verifica la deriva de un piso. `desplazamientoSuperior` e `desplazamientoInferior` son los
 * desplazamientos horizontales totales δ de los niveles i e i−1 (A.6.3). Si se usan secciones
 * fisuradas se puede aplicar `factorFisuracion = 0.7` (A.6.4.1.1).
 */
export function verificarDeriva(
  desplazamientoSuperior: number,
  desplazamientoInferior: number,
  alturaPiso: number,
  limite: number,
  factorFisuracion = 1,
): VerificacionDeriva {
  const deriva = Math.abs(desplazamientoSuperior - desplazamientoInferior) * factorFisuracion;
  const razon = deriva / alturaPiso;
  return { deriva, razon, limite, cumple: razon <= limite + 1e-12, uso: razon / limite };
}

/**
 * Tabla A.6.5-1 — Coeficiente de separación sísmica respecto al paramento.
 * `pisosAereos` es el número de pisos aéreos de la edificación nueva en la colindancia.
 */
export function coeficienteSeparacion(pisosAereos: number, colindancia: ColindanciaSeparacion): number {
  if (pisosAereos <= 2) return 0;
  if (pisosAereos === 3) return colindancia === 'no-coinciden-losas' ? 0.01 : 0;
  if (colindancia === 'coinciden-losas') return 0.02;
  if (colindancia === 'no-coinciden-losas') return 0.03;
  return 0.01;
}

/** Separación sísmica mínima en un piso a altura h sobre el terreno (nota 1 de la Tabla A.6.5-1). */
export function separacionSismica(
  alturaSobreTerreno: number,
  pisosAereos: number,
  colindancia: ColindanciaSeparacion,
): number {
  return coeficienteSeparacion(pisosAereos, colindancia) * alturaSobreTerreno;
}
