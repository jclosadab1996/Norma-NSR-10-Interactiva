/**
 * Título B — Capítulo B.2: catálogo de combinaciones de carga y nomenclatura.
 * Páginas impresas "B-n" (página PDF = B-n + 219).
 */

export type MetodoDiseno = 'resistencia' | 'trabajo';

/** Cargas de la nomenclatura B.2.2 (B-4 y B-5) que intervienen en las combinaciones. */
export const NOMBRES_CARGAS = {
  D: 'Carga muerta',
  L: 'Carga viva',
  Lr: 'Carga viva sobre la cubierta',
  G: 'Granizo (sin empozamiento)',
  Le: 'Empozamiento de agua',
  W: 'Viento',
  E: 'Sismo reducido (E = Fs/R)',
  H: 'Empuje lateral (suelo, agua freática, materiales almacenados)',
  F: 'Fluidos con densidad definida',
  T: 'Temperatura, retracción, flujo plástico, humedad, asentamientos',
} as const;

export type NombreCarga = keyof typeof NOMBRES_CARGAS;
export const ORDEN_CARGAS: NombreCarga[] = ['D', 'L', 'Lr', 'G', 'Le', 'W', 'E', 'H', 'F', 'T'];

export type EcuacionB2 = {
  /** Número de ecuación tal como en la norma. */
  id: string;
  metodo: MetodoDiseno;
  /** Sección donde aparece. */
  seccion: 'B.2.3.1' | 'B.2.4.2';
  /** Página impresa. */
  pag: string;
  /** Texto de la ecuación como la norma (Lr ó G ó Le = una sola de las tres cargas de cubierta). */
  texto: string;
};

/** B.2.3.1 — Combinaciones para esfuerzos de trabajo / estado límite de servicio (pág. B-5). */
export const ECUACIONES_TRABAJO: EcuacionB2[] = [
  { id: 'B.2.3-1', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + F' },
  { id: 'B.2.3-2', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + L + T' },
  { id: 'B.2.3-3', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + (Lr ó G ó Le)' },
  { id: 'B.2.3-4', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + 0.75(L + T) + 0.75(Lr ó G ó Le)' },
  { id: 'B.2.3-5', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + W' },
  { id: 'B.2.3-6', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + 0.7E' },
  { id: 'B.2.3-7', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + 0.75W + 0.75L + 0.75(Lr ó G ó Le)' },
  { id: 'B.2.3-8', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: 'D + H + F + 0.75(0.7E) + 0.75L + 0.75(Lr ó G ó Le)' },
  { id: 'B.2.3-9', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: '0.6D + W + H' },
  { id: 'B.2.3-10', metodo: 'trabajo', seccion: 'B.2.3.1', pag: 'B-5', texto: '0.6D + 0.7E + H' },
];

/** B.2.4.2 — Combinaciones mayoradas del método de la resistencia (pág. B-6). */
export const ECUACIONES_RESISTENCIA: EcuacionB2[] = [
  { id: 'B.2.4-1', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '1.4(D + F)' },
  { id: 'B.2.4-2', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '1.2(D + F + T) + 1.6(L + H) + 0.5(Lr ó G ó Le)' },
  { id: 'B.2.4-3', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '1.2D + 1.6(Lr ó G ó Le) + (L ó 0.8W)' },
  { id: 'B.2.4-4', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '1.2D + 1.6W + 1.0L + 0.5(Lr ó G ó Le)' },
  { id: 'B.2.4-5', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '1.2D + 1.0E + 1.0L' },
  { id: 'B.2.4-6', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '0.9D + 1.6W + 1.6H' },
  { id: 'B.2.4-7', metodo: 'resistencia', seccion: 'B.2.4.2', pag: 'B-6', texto: '0.9D + 1.0E + 1.6H' },
];

export const ECUACIONES_B2: EcuacionB2[] = [...ECUACIONES_TRABAJO, ...ECUACIONES_RESISTENCIA];

/** B.2.4.2.2 (B-7): umbral de L0 por encima del cual NO se permite reducir el factor de L a 0.5. */
export const L0_LIMITE_REDUCCION_FACTOR_L = 4.8; // kN/m²

export type UsoCargaViva = 'general' | 'estacionamiento' | 'reunion-publica';
export const USOS_CARGA_VIVA: Record<UsoCargaViva, string> = {
  general: 'Uso general (vivienda, oficinas, etc.)',
  estacionamiento: 'Estacionamientos',
  'reunion-publica': 'Lugares de reunión pública',
};
