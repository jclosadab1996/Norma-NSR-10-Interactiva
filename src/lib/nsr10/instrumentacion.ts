/**
 * Capítulo A.11 — Instrumentación sísmica: ¿cuántos acelerógrafos exige la norma?
 * Se importa directamente (no está en `index.ts`).
 */
import type { ZonaAmenaza } from './zonaAmenaza';

export type Instrumentacion = {
  /** Número mínimo de instrumentos en la edificación (0 = no hay obligación). */
  instrumentos: number;
  /** Localización exigida. */
  ubicacion: string;
  /** ¿Los instrumentos deben conformar un arreglo (disparo simultáneo)? */
  arreglo: boolean;
  /** Literal de la norma que aplica. */
  ref: string;
};

const NINGUNO: Instrumentacion = { instrumentos: 0, ubicacion: 'No hay obligación', arreglo: false, ref: '—' };

/**
 * A.11.2 — Instrumentos requeridos en una edificación según la zona de amenaza, el área construida (m²) y el
 * número de pisos. No incluye los conjuntos habitacionales (ver `instrumentacionConjunto`).
 */
export function instrumentacionEdificacion(zona: ZonaAmenaza, areaM2: number, pisos: number): Instrumentacion {
  if (zona === 'Baja') return { ...NINGUNO, ref: 'A.11.2.3' };

  if (zona === 'Alta') {
    if (pisos >= 21) {
      return { instrumentos: 3, ubicacion: 'Nivel inferior, mitad de la altura y cubierta', arreglo: true, ref: 'A.11.2.1(c)' };
    }
    if (areaM2 > 20000 && pisos >= 11 && pisos <= 20) {
      return { instrumentos: 2, ubicacion: 'Nivel inferior y cerca de la cubierta', arreglo: false, ref: 'A.11.2.1(b)' };
    }
    if (areaM2 > 20000 && pisos >= 3 && pisos <= 10) {
      return { instrumentos: 1, ubicacion: 'Nivel inferior', arreglo: false, ref: 'A.11.2.1(a)' };
    }
    return { ...NINGUNO, ref: 'A.11.2.1 (sin literal aplicable)' };
  }

  // Zona intermedia
  if (pisos > 25) {
    return { instrumentos: 3, ubicacion: 'Nivel inferior, mitad de la altura y cubierta', arreglo: true, ref: 'A.11.2.2(c)' };
  }
  if (areaM2 > 30000 && pisos >= 16 && pisos <= 25) {
    return { instrumentos: 2, ubicacion: 'Nivel inferior y cerca de la cubierta', arreglo: false, ref: 'A.11.2.2(b)' };
  }
  if (areaM2 > 30000 && pisos >= 5 && pisos <= 15) {
    return { instrumentos: 1, ubicacion: 'Nivel inferior', arreglo: false, ref: 'A.11.2.2(a)' };
  }
  return { ...NINGUNO, ref: 'A.11.2.2 (sin literal aplicable)' };
}

/**
 * A.11.2.1(d) y A.11.2.2(d) — ¿Un conjunto habitacional debe llevar un instrumento de campo abierto?
 * Aplica a conjuntos con más de 200 (zona alta) o 300 (zona intermedia) unidades de vivienda que no sean de
 * interés social.
 */
export function instrumentacionConjunto(zona: ZonaAmenaza, unidades: number, esInteresSocial: boolean): boolean {
  if (esInteresSocial) return false;
  if (zona === 'Alta') return unidades > 200;
  if (zona === 'Intermedia') return unidades > 300;
  return false;
}
