/**
 * Clasificación de la mampostería estructural del Título D (D.2.1) y su capacidad de disipación de energía.
 * Datos transcritos de D.2.1.1 a D.2.1.7 (págs. impresas D-5 y D-6). Los ejemplos y diagramas de d2.mdx usan estos mismos datos.
 */

/** Capacidad de disipación de energía en el rango inelástico (A.13 / A.3): especial, moderada o mínima. */
export type CapacidadDisipacion = 'DES' | 'DMO' | 'DMI';

export interface TipoMamposteria {
  id: 'cavidad-reforzada' | 'reforzada' | 'parcialmente-reforzada' | 'no-reforzada' | 'muros-confinados' | 'muros-diafragma' | 'reforzada-externamente';
  /** Sección de D.2.1 donde se define. */
  seccion: string;
  nombre: string;
  /** Capítulo del Título D que establece sus requisitos. */
  capitulo: string;
  /** Capacidad de disipación asignada; la mampostería reforzada puede ser DES o DMO según el caso. */
  capacidades: readonly CapacidadDisipacion[];
  /** Descripción abreviada de la definición de la norma. */
  resumen: string;
  /** Solo el tipo D.2.1.6: no se permite en edificaciones nuevas. */
  soloEdificacionesExistentes?: boolean;
}

export const TIPOS_MAMPOSTERIA: readonly TipoMamposteria[] = [
  {
    id: 'cavidad-reforzada',
    seccion: 'D.2.1.1',
    nombre: 'Mampostería de cavidad reforzada',
    capitulo: 'D.6',
    capacidades: ['DES'],
    resumen: 'Dos paredes de piezas de caras paralelas, reforzadas o no, separadas por un espacio continuo de concreto reforzado, con funcionamiento compuesto.',
  },
  {
    id: 'reforzada',
    seccion: 'D.2.1.2',
    nombre: 'Mampostería reforzada',
    capitulo: 'D.7',
    capacidades: ['DES', 'DMO'],
    resumen: 'Piezas de perforación vertical unidas con mortero y reforzadas internamente con barras y alambres. DES si todas las celdas se inyectan o se cumple D.7.2.1.1; DMO si solo se inyectan las celdas con refuerzo.',
  },
  {
    id: 'parcialmente-reforzada',
    seccion: 'D.2.1.3',
    nombre: 'Mampostería parcialmente reforzada',
    capitulo: 'D.8',
    capacidades: ['DMO'],
    resumen: 'Piezas de perforación vertical unidas con mortero y reforzadas internamente con barras y alambres, según los requisitos de D.8.',
  },
  {
    id: 'no-reforzada',
    seccion: 'D.2.1.4',
    nombre: 'Mampostería no reforzada',
    capitulo: 'D.9',
    capacidades: ['DMI'],
    resumen: 'Piezas unidas con mortero que no cumplen las cuantías mínimas de refuerzo de la mampostería parcialmente reforzada.',
  },
  {
    id: 'muros-confinados',
    seccion: 'D.2.1.5',
    nombre: 'Mampostería de muros confinados',
    capitulo: 'D.10',
    capacidades: ['DMO'],
    resumen: 'Piezas unidas con mortero, reforzadas de manera principal con elementos de concreto reforzado construidos alrededor del muro, confinándolo.',
  },
  {
    id: 'muros-diafragma',
    seccion: 'D.2.1.6',
    nombre: 'Mampostería de muros diafragma',
    capitulo: 'D.11',
    capacidades: [],
    resumen: 'Muros colocados dentro de una estructura de pórticos, que restringen su desplazamiento libre bajo cargas laterales. No se permite en edificaciones nuevas; solo dentro del alcance del Capítulo A.10 (edificaciones existentes).',
    soloEdificacionesExistentes: true,
  },
  {
    id: 'reforzada-externamente',
    seccion: 'D.2.1.7',
    nombre: 'Mampostería reforzada externamente',
    capitulo: 'D.12',
    capacidades: ['DMI'],
    resumen: 'El refuerzo se coloca dentro de una capa de revoque (pañete) y se fija al muro con conectores y/o clavos.',
  },
];

export interface CondicionesReforzada {
  /** Todas las celdas del muro se inyectan con mortero de relleno. */
  todasLasCeldasInyectadas: boolean;
  /** Se cumplen los refuerzos mínimos adicionales descritos en D.7.2.1.1. */
  cumpleRefuerzoMinimoD7211: boolean;
}

/**
 * D.2.1.2: la mampostería reforzada es DES cuando todas sus celdas se inyectan con mortero de relleno o cuando
 * se cumplen los refuerzos mínimos adicionales de D.7.2.1.1, y DMO cuando solo se inyectan las celdas verticales
 * que llevan refuerzo.
 */
export function capacidadMamposteriaReforzada(c: CondicionesReforzada): CapacidadDisipacion {
  return c.todasLasCeldasInyectadas || c.cumpleRefuerzoMinimoD7211 ? 'DES' : 'DMO';
}

/** Tipo de mampostería por id. */
export function tipoMamposteria(id: TipoMamposteria['id']): TipoMamposteria {
  const t = TIPOS_MAMPOSTERIA.find((x) => x.id === id);
  if (!t) throw new Error(`tipo de mampostería desconocido: ${id}`);
  return t;
}
