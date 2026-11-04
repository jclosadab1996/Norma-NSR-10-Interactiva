/**
 * Título C — Capítulo C.20: Evaluación de la resistencia de estructuras existentes (PDF p.473–475, C-171 a C-173).
 *
 * Intensidad de la carga de prueba (C.20.3.2), criterio de aceptación por deflexiones (Ecs. C.20-1, C.20-2, C.20-3) y
 * aumento de φ para evaluación analítica (C.20.2.5). Unidades: kN/m² (o kN, etc., mientras sean coherentes), mm.
 */

/** C.20.3.2 (C-172): carga total de ensayo = mayor entre (a) 1.15D + 1.5L + 0.4(Lr ó G ó Le), (b) 1.15D + 0.9L + 1.5(Lr ó G ó Le), (c) 1.3D. */
export const FACTORES_CARGA_PRUEBA = {
  a: { D: 1.15, L: 1.5, cubierta: 0.4 },
  b: { D: 1.15, L: 0.9, cubierta: 1.5 },
  c: { D: 1.3 },
  /** Factor de L en (b) que se puede reducir a 0.45 (salvo estacionamientos, reuniones públicas o L > 4.8 kN/m²). */
  lReducidoEnB: 0.45,
  lLimiteReduccion: 4.8,
} as const;

/** C.20.3.3 (C-172): edad mínima de la porción ensayada (días), salvo acuerdo de todas las partes. */
export const EDAD_MINIMA_DIAS = 56;
/** C.20.4: incrementos mínimos de carga, horas de carga total, horas de lectura final. */
export const INCREMENTOS_MINIMOS = 4;
export const HORAS_CARGA_TOTAL = 24;
export const HORAS_LECTURA_FINAL = 24;
export const HORAS_MINIMAS_REPETICION = 72;
/** C.20.4.1: las lecturas iniciales se toman no más de una hora antes del primer incremento. */
export const HORAS_LECTURA_INICIAL_MAX = 1;

export type EntradaCargaPrueba = {
  /** Carga muerta ya presente D. */
  D: number;
  /** Carga viva L. */
  L: number;
  /** Carga de cubierta, granizo o empozamiento (la mayor de Lr, G, Le). */
  cubierta?: number;
  /** Si se permite reducir el factor de L en (b) a 0.45: ver `puedeReducirLEnB`. */
  reducirLEnB?: boolean;
};

export type ResultadoCargaPrueba = {
  a: number;
  b: number;
  c: number;
  /** Mayor entre a, b y c. */
  total: number;
  gobierna: 'a' | 'b' | 'c';
  /** Carga de prueba por aplicar = total − D (parte que hay que colocar encima de la carga muerta ya presente). */
  adicional: number;
  /** Factor de L usado en (b). */
  factorLEnB: number;
};

/** Intensidad de la carga de prueba, C.20.3.2 (C-172). La carga total incluye la carga muerta ya presente. */
export function cargaPrueba(e: EntradaCargaPrueba): ResultadoCargaPrueba {
  const cub = e.cubierta ?? 0;
  const fb = e.reducirLEnB ? FACTORES_CARGA_PRUEBA.lReducidoEnB : FACTORES_CARGA_PRUEBA.b.L;
  const a = FACTORES_CARGA_PRUEBA.a.D * e.D + FACTORES_CARGA_PRUEBA.a.L * e.L + FACTORES_CARGA_PRUEBA.a.cubierta * cub;
  const b = FACTORES_CARGA_PRUEBA.b.D * e.D + fb * e.L + FACTORES_CARGA_PRUEBA.b.cubierta * cub;
  const c = FACTORES_CARGA_PRUEBA.c.D * e.D;
  const total = Math.max(a, b, c);
  const gobierna = total === a ? 'a' : total === b ? 'b' : 'c';
  return { a, b, c, total, gobierna, adicional: total - e.D, factorLEnB: fb };
}

/** C.20.3.2: el factor de L en (b) se puede reducir a 0.45 salvo en estacionamientos, lugares de reunión pública o áreas con L > 4.8 kN/m². */
export function puedeReducirLEnB(uso: 'general' | 'estacionamiento' | 'reunion-publica', lKnM2: number): boolean {
  if (uso !== 'general') return false;
  return lKnM2 <= FACTORES_CARGA_PRUEBA.lLimiteReduccion;
}

/** Ec. C.20-1 (C-173): límite de Δ1 = ℓt² / (20 000 h), en mm (ℓt y h en mm). */
export function limiteDeflexionC201(lt: number, h: number): number {
  if (!(lt > 0) || !(h > 0)) throw new RangeError('ℓt y h deben ser positivos');
  return (lt * lt) / (20000 * h);
}

/**
 * Luz ℓt del elemento sometido a la prueba (C.2, nomenclatura, C-10): la menor entre (a) la distancia entre centros de
 * apoyos y (b) la distancia libre entre apoyos más el espesor h; en voladizo, el doble de la distancia entre la cara del
 * apoyo y el extremo. (En losas en dos direcciones se toma la luz menor.)
 */
export function luzPrueba(e: { entreCentros: number; libre: number; h: number } | { voladizo: number }): number {
  if ('voladizo' in e) return 2 * e.voladizo;
  return Math.min(e.entreCentros, e.libre + e.h);
}

export type EntradaAceptacion = {
  /** Luz ℓt (mm). */
  lt: number;
  /** Espesor o altura h (mm). */
  h: number;
  /** Δ1: deflexión máxima medida en la primera prueba (mm). */
  delta1: number;
  /** Δr: deflexión residual 24 h después de retirar la carga (mm). */
  deltaR: number;
};

export type ResultadoAceptacion = {
  /** ℓt²/(20 000 h) (mm). */
  limite201: number;
  /** Cumple C.20-1: Δ1 ≤ ℓt²/(20 000 h). */
  cumple201: boolean;
  /** Δ1/4 (mm). */
  limite202: number;
  /** Cumple C.20-2: Δr ≤ Δ1/4. */
  cumple202: boolean;
  /** Basta cumplir una de las dos (C.20.5.2). */
  aceptable: boolean;
  /** Si no satisface ninguna, la prueba puede repetirse (después de 72 h). */
  puedeRepetir: boolean;
};

/** C.20.5.2 (C-173): las deflexiones máximas medidas deben satisfacer C.20-1 ó C.20-2. */
export function evaluarPrimeraPrueba(e: EntradaAceptacion): ResultadoAceptacion {
  const limite201 = limiteDeflexionC201(e.lt, e.h);
  const cumple201 = e.delta1 <= limite201;
  const limite202 = e.delta1 / 4;
  const cumple202 = e.deltaR <= limite202;
  const aceptable = cumple201 || cumple202;
  return { limite201, cumple201, limite202, cumple202, aceptable, puedeRepetir: !aceptable };
}

/** Ec. C.20-3 (C-173): en la repetición, aceptable si Δr ≤ Δ2/5; Δ2 relativa a la posición al iniciar la segunda prueba. */
export function evaluarRepeticion(e: { delta2: number; deltaR: number }): { limite203: number; cumple203: boolean } {
  const limite203 = e.delta2 / 5;
  return { limite203, cumple203: e.deltaR <= limite203 };
}

/** Valores máximos de φ para evaluación analítica con dimensiones y propiedades medidas (C.20.2.5, C-171). */
export const PHI_MAX_EVALUACION = {
  traccion: 1.0,
  compresionEspiral: 0.9,
  compresionOtros: 0.8,
  cortanteTorsion: 0.8,
  aplastamiento: 0.8,
} as const;
