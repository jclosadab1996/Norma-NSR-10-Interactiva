/**
 * Requisitos generales del Título D (Mampostería estructural), Capítulo D.1.
 * Lógica pura de verificación usada por los ejemplos de d1.mdx.
 *
 * Fuentes (NSR-10): D.1.2.1 (contenido de los planos), D.1.3.1 (supervisión técnica) y D.1.4.1.1
 * (diferencia de rigidez entre las dos direcciones principales en planta).
 */

/** Área construida (m²) por encima de la cual la supervisión técnica es obligatoria (D.1.3.1, Ley 400 de 1997). */
export const AREA_SUPERVISION_OBLIGATORIA_M2 = 3000;

/** Cociente mínimo de rigideces entre direcciones ortogonales: 20 % (tres niveles o más) y 10 % (uno o dos niveles), D.1.4.1.1. */
export const RELACION_RIGIDEZ_MIN = { tresOMasNiveles: 0.2, unoODosNiveles: 0.1 } as const;

/** Límite de D.1.4.1.1 según el número de niveles de la edificación. */
export function limiteRigidezOrtogonal(niveles: number): number {
  if (!Number.isFinite(niveles) || niveles < 1) throw new RangeError('niveles debe ser un entero positivo');
  return niveles >= 3 ? RELACION_RIGIDEZ_MIN.tresOMasNiveles : RELACION_RIGIDEZ_MIN.unoODosNiveles;
}

export interface ResultadoRigidezOrtogonal {
  /** Rigidez de la dirección más flexible. */
  kMenor: number;
  /** Rigidez de la dirección más rígida. */
  kMayor: number;
  /** kMenor / kMayor. */
  relacion: number;
  limite: number;
  cumple: boolean;
  /** Dirección que aporta menos rigidez ('x' o 'y'; 'igual' si coinciden). */
  direccionDebil: 'x' | 'y' | 'igual';
}

/**
 * D.1.4.1.1: en cualquier piso la rigidez aportada por el conjunto de elementos estructurales de una
 * dirección no puede ser inferior al 20 % (edificaciones de 3 niveles o más) o al 10 % (1 o 2 niveles)
 * de la rigidez de la dirección ortogonal. `kx` y `ky` deben estar en las mismas unidades.
 */
export function verificarRigidezOrtogonal(kx: number, ky: number, niveles: number): ResultadoRigidezOrtogonal {
  if (!(kx > 0) || !(ky > 0)) throw new RangeError('las rigideces deben ser positivas');
  const limite = limiteRigidezOrtogonal(niveles);
  const kMenor = Math.min(kx, ky);
  const kMayor = Math.max(kx, ky);
  const relacion = kMenor / kMayor;
  return { kMenor, kMayor, relacion, limite, cumple: relacion >= limite, direccionDebil: kx === ky ? 'igual' : kx < ky ? 'x' : 'y' };
}

export type SupervisionTecnica = 'obligatoria' | 'recomendada';

/**
 * D.1.3.1: obligatoria si el área construida es mayor de 3000 m²; por debajo, el Título D la recomienda
 * «bajo estricta supervisión técnica». Con exactamente 3000 m² el texto no la exige (dice «más de 3000»).
 */
export function supervisionTecnica(areaConstruidaM2: number): SupervisionTecnica {
  if (!(areaConstruidaM2 > 0)) throw new RangeError('el área construida debe ser positiva');
  return areaConstruidaM2 > AREA_SUPERVISION_OBLIGATORIA_M2 ? 'obligatoria' : 'recomendada';
}

/** Contenido adicional de los planos estructurales de mampostería, literales (a)–(i) de D.1.2.1 (resumido). */
export const CONTENIDO_PLANOS_D = [
  { literal: 'a', texto: 'Características de las unidades y norma NTC bajo la cual se fabrican (D.3.6)' },
  { literal: 'b', texto: "Resistencia nominal a la compresión de la mampostería f′m, sobre área neta promedio, por elemento" },
  { literal: 'c', texto: 'Tipo de mortero de pega (H, M, S o N, D.3.4) y su resistencia mínima a compresión' },
  { literal: 'd', texto: 'Ubicación de las celdas y cavidades que se inyectan con mortero de relleno' },
  { literal: 'e', texto: 'Tipo de mortero de relleno (D.3.5) y su resistencia mínima a compresión' },
  { literal: 'f', texto: 'Tamaño y localización de todos los elementos especificados' },
  { literal: 'g', texto: 'Tamaño, resistencia, tipo y localización del refuerzo, anclajes mecánicos y conectores' },
  { literal: 'h', texto: 'Ubicación, tamaño y características de las juntas de control y de construcción' },
  { literal: 'i', texto: 'Ubicación y tamaño de las celdas de inspección' },
] as const;
