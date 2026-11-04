/**
 * Título B — Capítulo B.2: combinaciones de carga.
 *
 * Numeración y páginas según la NSR-10 (páginas impresas "B-n"):
 *  - B.2.3 (B-5, B-6): MÉTODO DE ESFUERZOS DE TRABAJO / estado límite de servicio. Ecuaciones B.2.3-1 a B.2.3-10.
 *  - B.2.4 (B-6, B-7): MÉTODO DE LA RESISTENCIA (cargas mayoradas). Ecuaciones B.2.4-1 a B.2.4-7.
 *
 * Convenciones del módulo:
 *  - Las cargas son EFECTOS de carga (fuerza, momento, reacción…) del mismo tipo y en las mismas unidades,
 *    con signo (por ejemplo W o E pueden tener sentido contrario). Las cargas ausentes valen 0.
 *  - "(Lr ó G ó Le)" significa que entra UNA sola de las tres cargas de cubierta; se toma la más desfavorable
 *    (la mayor), tal como pide B.2.3.1 ("el efecto más desfavorable").
 *  - "(L ó 0.8W)" de B.2.4-3: entra una sola de las dos; se toma la mayor.
 *  - Esta lógica no decide qué es "desfavorable" en un elemento concreto: da el valor de cada combinación para
 *    el efecto que el usuario introduce, y la gobernante es la de mayor valor (la mínima sirve para ver inversión
 *    de esfuerzos o levantamiento, p. ej. 0.9D + 1.6W).
 */
import {
  ECUACIONES_RESISTENCIA,
  ECUACIONES_TRABAJO,
  L0_LIMITE_REDUCCION_FACTOR_L,
  ORDEN_CARGAS,
  type EcuacionB2,
  type MetodoDiseno,
  type NombreCarga,
  type UsoCargaViva,
} from '../../data/combinacionesB';

export type { MetodoDiseno, NombreCarga, UsoCargaViva } from '../../data/combinacionesB';

export type Cargas = Partial<Record<NombreCarga, number>>;
type CargasCompletas = Record<NombreCarga, number>;

export type Termino = { carga: NombreCarga; factor: number };

export type Combinacion = {
  /** Número de ecuación, p. ej. "B.2.4-3". */
  id: string;
  metodo: MetodoDiseno;
  pag: string;
  /** Texto de la ecuación tal como aparece en la norma. */
  texto: string;
  /** Términos efectivamente usados (con la alternativa "ó" ya resuelta y los factores de las opciones aplicadas). */
  terminos: Termino[];
  /** Expresión resuelta, p. ej. "1.2D + 1.6Lr + 0.8W". */
  expresion: string;
  valor: number;
  /** Carga de cubierta escogida cuando la ecuación trae (Lr ó G ó Le). */
  cubierta?: 'Lr' | 'G' | 'Le';
  /** Variante de signo cuando se evalúan ambos sentidos de W / E. */
  variante?: string;
  notas: string[];
};

/** Opciones del método de la resistencia (B.2.4.2.x). */
export type OpcionesResistencia = {
  /** B.2.4.2.2 (B-7): usar 0.5 en lugar de 1.0 para L en B.2.4-3, -4 y -5. */
  reducirFactorL?: boolean;
  /** B.2.4.2.3 (B-7): usar 1.3W en lugar de 1.6W en B.2.4-4 y B.2.4-6 (viento sin reducir por direccionalidad). */
  viento13?: boolean;
  /** B.2.4.2.4 (B-7): usar 1.4E en lugar de 1.0E en B.2.4-5 y B.2.4-7 (E basado en niveles de servicio). */
  sismoNivelServicio?: boolean;
  /** B.2.4.2.5 (B-7): H = 0 en B.2.4-6 y B.2.4-7 si su acción neutraliza la de W o E. */
  hNeutralizaWE?: boolean;
};

/** Opciones del método de esfuerzos de trabajo (B.2.3.2.x). */
export type OpcionesTrabajo = {
  /** B.2.3.2.1 (B-6): verificación de derivas, 1.0E en lugar de 0.7E, con E = Fs sin dividir por R. */
  verificacionDerivas?: boolean;
};

export type OpcionesCombinaciones = OpcionesResistencia &
  OpcionesTrabajo & {
    /** 'dado' evalúa W y E con el signo introducido; 'ambos' evalúa además el sentido contrario. */
    sentidos?: 'dado' | 'ambos';
  };

const completar = (c: Cargas): CargasCompletas => {
  const r = {} as CargasCompletas;
  for (const k of ORDEN_CARGAS) r[k] = c[k] ?? 0;
  return r;
};

const usaWE = (ts: Termino[]) => ts.some((x) => x.carga === 'W' || x.carga === 'E');

/** Carga de cubierta más desfavorable entre Lr, G y Le (se prefiere Lr en caso de empate). */
export function cargaCubierta(c: Cargas): { carga: 'Lr' | 'G' | 'Le'; valor: number } {
  const k = completar(c);
  let mejor: 'Lr' | 'G' | 'Le' = 'Lr';
  for (const n of ['G', 'Le'] as const) if (k[n] > k[mejor]) mejor = n;
  return { carga: mejor, valor: k[mejor] };
}

type Contexto = { k: CargasCompletas; cub: 'Lr' | 'G' | 'Le' };
type Constructor = (cx: Contexto, o: OpcionesCombinaciones) => { terminos: Termino[]; notas?: string[] };

const t = (carga: NombreCarga, factor: number): Termino => ({ carga, factor });

/** Coeficiente de carga de E en esfuerzos de trabajo: 0.7 (B.2.3.2) o 1.0 para derivas (B.2.3.2.1), pág. B-6. */
const fE = (o: OpcionesCombinaciones) => (o.verificacionDerivas ? 1.0 : 0.7);

const CONSTRUCTORES: Record<string, Constructor> = {
  /* ───────────── B.2.3 — esfuerzos de trabajo (pág. B-5) ───────────── */
  // B.2.3-1 (B-5): D + F
  'B.2.3-1': () => ({ terminos: [t('D', 1), t('F', 1)] }),
  // B.2.3-2 (B-5): D + H + F + L + T
  'B.2.3-2': () => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('L', 1), t('T', 1)] }),
  // B.2.3-3 (B-5): D + H + F + (Lr ó G ó Le)
  'B.2.3-3': (cx) => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t(cx.cub, 1)] }),
  // B.2.3-4 (B-5): D + H + F + 0.75(L + T) + 0.75(Lr ó G ó Le)
  'B.2.3-4': (cx) => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('L', 0.75), t('T', 0.75), t(cx.cub, 0.75)] }),
  // B.2.3-5 (B-5): D + H + F + W
  'B.2.3-5': () => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('W', 1)] }),
  // B.2.3-6 (B-5): D + H + F + 0.7E  (E = Fs/R, B.2.3.2 en B-6)
  'B.2.3-6': (_cx, o) => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('E', fE(o))] }),
  // B.2.3-7 (B-5): D + H + F + 0.75W + 0.75L + 0.75(Lr ó G ó Le)
  'B.2.3-7': (cx) => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('W', 0.75), t('L', 0.75), t(cx.cub, 0.75)] }),
  // B.2.3-8 (B-5): D + H + F + 0.75(0.7E) + 0.75L + 0.75(Lr ó G ó Le)
  'B.2.3-8': (cx, o) => ({ terminos: [t('D', 1), t('H', 1), t('F', 1), t('E', 0.75 * fE(o)), t('L', 0.75), t(cx.cub, 0.75)] }),
  // B.2.3-9 (B-5): 0.6D + W + H
  'B.2.3-9': () => ({ terminos: [t('D', 0.6), t('W', 1), t('H', 1)] }),
  // B.2.3-10 (B-5): 0.6D + 0.7E + H
  'B.2.3-10': (_cx, o) => ({ terminos: [t('D', 0.6), t('E', fE(o)), t('H', 1)] }),

  /* ───────────── B.2.4 — método de la resistencia (pág. B-6) ───────────── */
  // B.2.4-1 (B-6): 1.4(D + F)
  'B.2.4-1': () => ({ terminos: [t('D', 1.4), t('F', 1.4)] }),
  // B.2.4-2 (B-6): 1.2(D + F + T) + 1.6(L + H) + 0.5(Lr ó G ó Le)
  'B.2.4-2': (cx) => ({ terminos: [t('D', 1.2), t('F', 1.2), t('T', 1.2), t('L', 1.6), t('H', 1.6), t(cx.cub, 0.5)] }),
  // B.2.4-3 (B-6): 1.2D + 1.6(Lr ó G ó Le) + (L ó 0.8W); L puede ir con 0.5 (B.2.4.2.2, B-7)
  'B.2.4-3': (cx, o) => {
    const fl = o.reducirFactorL ? 0.5 : 1.0;
    const eligeL = fl * cx.k.L >= 0.8 * cx.k.W;
    return {
      terminos: [t('D', 1.2), t(cx.cub, 1.6), eligeL ? t('L', fl) : t('W', 0.8)],
      notas: [eligeL ? '(L ó 0.8W): gobierna L' : '(L ó 0.8W): gobierna 0.8W'],
    };
  },
  // B.2.4-4 (B-6): 1.2D + 1.6W + 1.0L + 0.5(Lr ó G ó Le); 1.3W (B.2.4.2.3) y L con 0.5 (B.2.4.2.2), B-7
  'B.2.4-4': (cx, o) => ({
    terminos: [t('D', 1.2), t('W', o.viento13 ? 1.3 : 1.6), t('L', o.reducirFactorL ? 0.5 : 1.0), t(cx.cub, 0.5)],
  }),
  // B.2.4-5 (B-6): 1.2D + 1.0E + 1.0L; 1.4E (B.2.4.2.4) y L con 0.5 (B.2.4.2.2), B-7
  'B.2.4-5': (_cx, o) => ({
    terminos: [t('D', 1.2), t('E', o.sismoNivelServicio ? 1.4 : 1.0), t('L', o.reducirFactorL ? 0.5 : 1.0)],
  }),
  // B.2.4-6 (B-6): 0.9D + 1.6W + 1.6H; 1.3W (B.2.4.2.3) y H = 0 si neutraliza (B.2.4.2.5), B-7
  'B.2.4-6': (_cx, o) => ({
    terminos: [t('D', 0.9), t('W', o.viento13 ? 1.3 : 1.6), t('H', o.hNeutralizaWE ? 0 : 1.6)],
    notas: o.hNeutralizaWE ? ['H = 0 porque neutraliza a W (B.2.4.2.5)'] : [],
  }),
  // B.2.4-7 (B-6): 0.9D + 1.0E + 1.6H; 1.4E (B.2.4.2.4) y H = 0 si neutraliza (B.2.4.2.5), B-7
  'B.2.4-7': (_cx, o) => ({
    terminos: [t('D', 0.9), t('E', o.sismoNivelServicio ? 1.4 : 1.0), t('H', o.hNeutralizaWE ? 0 : 1.6)],
    notas: o.hNeutralizaWE ? ['H = 0 porque neutraliza a E (B.2.4.2.5)'] : [],
  }),
};

const num = (x: number) => String(Number(x.toFixed(4)));

/** Texto de una expresión resuelta: "1.2D + 1.6Lr + 0.8W" (omite factores de valor 0). */
export function expresionDe(terminos: Termino[]): string {
  const partes = terminos
    .filter((x) => x.factor !== 0)
    .map((x) => (x.factor === 1 ? x.carga : `${num(x.factor)}${x.carga}`));
  return partes.length ? partes.join(' + ') : '0';
}

/** Σ factor·carga de los términos dados. */
export function evaluarTerminos(terminos: Termino[], cargas: Cargas): number {
  const k = completar(cargas);
  return terminos.reduce((s, x) => s + x.factor * k[x.carga], 0);
}

function construir(def: EcuacionB2, cargas: CargasCompletas, o: OpcionesCombinaciones, flip: boolean): Combinacion {
  const k: CargasCompletas = flip ? { ...cargas, W: -cargas.W, E: -cargas.E } : cargas;
  const cub = cargaCubierta(k).carga;
  const r = CONSTRUCTORES[def.id]({ k, cub }, o);
  const usaCub = /Lr ó G ó Le/.test(def.texto);
  return {
    id: def.id,
    metodo: def.metodo,
    pag: def.pag,
    texto: def.texto,
    terminos: r.terminos,
    expresion: expresionDe(r.terminos),
    valor: evaluarTerminos(r.terminos, k),
    cubierta: usaCub ? cub : undefined,
    variante: flip ? 'sentido contrario de W y E' : undefined,
    notas: r.notas ?? [],
  };
}

/**
 * Todas las combinaciones de un método para el conjunto de cargas dado.
 * Con `sentidos: 'ambos'` se añade, para cada combinación con W o E, la misma con el sentido contrario.
 */
export function combinaciones(metodo: MetodoDiseno, cargas: Cargas, opciones: OpcionesCombinaciones = {}): Combinacion[] {
  const k = completar(cargas);
  const defs = metodo === 'resistencia' ? ECUACIONES_RESISTENCIA : ECUACIONES_TRABAJO;
  const salida: Combinacion[] = [];
  for (const d of defs) {
    const base = construir(d, k, opciones, false);
    salida.push(base);
    if (opciones.sentidos === 'ambos' && usaWE(base.terminos)) salida.push(construir(d, k, opciones, true));
  }
  return salida;
}

export const combinacionesResistencia = (c: Cargas, o: OpcionesResistencia & { sentidos?: 'dado' | 'ambos' } = {}) =>
  combinaciones('resistencia', c, o);
export const combinacionesTrabajo = (c: Cargas, o: OpcionesTrabajo & { sentidos?: 'dado' | 'ambos' } = {}) =>
  combinaciones('trabajo', c, o);

export type Envolvente = {
  /** Combinación de mayor valor (gobernante para el efecto positivo). */
  maxima: Combinacion;
  /** Combinación de menor valor (útil para inversión de esfuerzos o levantamiento). */
  minima: Combinacion;
};

/** Gobernante (máxima) y mínima de un conjunto de combinaciones. Devuelve null si está vacío. */
export function envolvente(lista: Combinacion[]): Envolvente | null {
  if (lista.length === 0) return null;
  let maxima = lista[0];
  let minima = lista[0];
  for (const c of lista) {
    if (c.valor > maxima.valor) maxima = c;
    if (c.valor < minima.valor) minima = c;
  }
  return { maxima, minima };
}

/** Atajo: combinación gobernante (mayor valor). */
export const gobernante = (lista: Combinacion[]): Combinacion | null => envolvente(lista)?.maxima ?? null;

/**
 * B.2.4.2.2 (B-7): ¿se permite reducir a 0.5 el factor de L en B.2.4-3, -4 y -5?
 * No se permite en estacionamientos, lugares de reunión pública ni donde L0 > 4.8 kN/m².
 */
export function puedeReducirFactorL(uso: UsoCargaViva, l0: number): boolean {
  if (uso === 'estacionamiento' || uso === 'reunion-publica') return false;
  return l0 <= L0_LIMITE_REDUCCION_FACTOR_L;
}

/** B.2.2 (B-4): R = φa·φp·φr·R0. */
export function coeficienteRDiseno(r0: number, phiA = 1, phiP = 1, phiR = 1): number {
  return phiA * phiP * phiR * r0;
}

/** B.2.3.2 (B-6) y B.2.4.2.1 (B-6/B-7): E = Fs / R. */
export function sismoReducido(fs: number, r: number): number {
  return fs / r;
}
