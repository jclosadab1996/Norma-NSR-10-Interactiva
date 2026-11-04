/**
 * Título C — Apéndice C-C: Factores de carga y de reducción de la resistencia alternativos
 * (PDF p.533–536, impresas C-231 a C-234).
 *
 * Contiene:
 *  - Resistencia requerida U con las Ecs. C-C.9-1 a C-C.9-6 (C-C.9.2.1 a C-C.9.2.7).
 *  - Factores φ de C-C.9.3.2 (0.90 / 0.75 / 0.70 / 0.85) y la variación lineal por εt y por carga axial.
 *  - Comparación con el cuerpo del Capítulo C.9 (C.9-1 a C.9-7 y φ de C.9.3) y comprobación de que C.9 = B.2.4.
 *
 * Unidades: las cargas en cualquier unidad coherente (kN, kN/m, kN·m…); U sale en la misma. Lo que NO es texto de la
 * norma se marca "(auxiliar)": la comparación U/φ y la lectura de dónde se suma F cuando hay un grupo 0.75(…).
 */
import { PHI_CC, TABLA_PHI_COMPARADA, type FilaPhiCC } from '../../data/apendicesC';
import { PHI_TRACCION, TABLA_PHI } from '../../data/resistenciaServicioC9';
import { combinacionesResistencia } from './combinaciones';
import {
  envolventeU,
  epsilonLimiteCompresion,
  resistenciaRequerida,
  type CargasU,
  type TipoEstribo,
} from './resistenciaServicio';

/* ═════════════════════════ C-C.9.2 — Resistencia requerida ═════════════════════════ */

export type CargaCC = 'D' | 'L' | 'W' | 'E' | 'H' | 'F' | 'T';
export type CargasCC = Partial<Record<CargaCC, number>>;
export type TerminoCC = { carga: CargaCC; factor: number };

export type OpcionesCC = {
  /** C-C.9.2.2: 1.3W en lugar de 1.6W (viento sin reducir por direccionalidad). */
  viento13?: boolean;
  /** C-C.9.2.2: 1.4E en lugar de 1.0E (E basado en fuerzas sísmicas al nivel de servicio). */
  sismoServicio?: boolean;
  /** C-C.9.2.3: en C-C.9-4, si D o L reducen el efecto de H, se usa 0.9D y L = 0. */
  dReduceH?: boolean;
  /** Si es 'ambos' se añade, para cada ecuación con W o E, el sentido contrario. */
  sentidos?: 'dado' | 'ambos';
};

export type ResultadoCC = {
  /** Ecuación de la norma, p. ej. "C-C.9-2". */
  id: string;
  /** Texto de la ecuación tal como aparece en la norma. */
  texto: string;
  /** Qué alternativa de «1.6W ó 1.0E» se evaluó: 'W', 'E' o undefined si la ecuación no la tiene. */
  accion?: 'W' | 'E';
  /** Expresión con los factores efectivamente aplicados, p. ej. "1.05D + 1.275L + 1.6W". */
  expresion: string;
  terminos: TerminoCC[];
  valor: number;
  variante?: string;
  notas: string[];
};

const ORDEN_CC: CargaCC[] = ['D', 'L', 'W', 'E', 'H', 'F', 'T'];
const completarCC = (c: CargasCC): Record<CargaCC, number> => {
  const r = {} as Record<CargaCC, number>;
  for (const k of ORDEN_CC) r[k] = c[k] ?? 0;
  return r;
};
const t = (carga: CargaCC, factor: number): TerminoCC => ({ carga, factor });
const num = (x: number) => String(Number(x.toFixed(4)));

/** Texto de una expresión resuelta, omitiendo los factores iguales a 0. */
export function expresionCC(terminos: TerminoCC[]): string {
  const partes = terminos.filter((x) => x.factor !== 0).map((x) => (x.factor === 1 ? x.carga : `${num(x.factor)}${x.carga}`));
  return partes.length ? partes.join(' + ') : '0';
}

const valorDe = (terminos: TerminoCC[], k: Record<CargaCC, number>) => terminos.reduce((s, x) => s + x.factor * k[x.carga], 0);

type Plantilla = { id: string; texto: string; accion?: 'W' | 'E'; terminos: TerminoCC[]; notas?: string[]; usaWE: boolean };

/**
 * Las ecuaciones de C-C.9.2 aplicables a las cargas presentes (C-C.9.2.1 a C-C.9.2.6). F entra con 1.4 en todas las
 * combinaciones que incluyen L (C-C.9.2.4); lectura del autor: se suma 1.4F fuera del grupo 0.75(…).
 * C-C.9-2 y C-C.9-3 solo se generan si hay W o E; C-C.9-4 si hay H; C-C.9-5 y C-C.9-6 si hay T.
 */
export function resistenciaRequeridaCC(cargas: CargasCC, o: OpcionesCC = {}): ResultadoCC[] {
  const k = completarCC(cargas);
  const fW = o.viento13 ? 1.3 : 1.6;
  const fE = o.sismoServicio ? 1.4 : 1.0;
  const conF: TerminoCC[] = k.F !== 0 ? [t('F', 1.4)] : [];
  const plantillas: Plantilla[] = [];

  plantillas.push({ id: 'C-C.9-1', texto: '1.4D + 1.7L', terminos: [t('D', 1.4), t('L', 1.7), ...conF], usaWE: false });

  const lateral: { accion: 'W' | 'E'; factor: number; presente: boolean }[] = [
    { accion: 'W', factor: fW, presente: k.W !== 0 },
    { accion: 'E', factor: fE, presente: k.E !== 0 },
  ];
  for (const a of lateral) {
    if (!a.presente) continue;
    plantillas.push({
      id: 'C-C.9-2',
      texto: '0.75(1.4D + 1.7L) + (1.6W ó 1.0E)',
      accion: a.accion,
      terminos: [t('D', 0.75 * 1.4), t('L', 0.75 * 1.7), t(a.accion, a.factor), ...conF],
      usaWE: true,
      notas: k.F !== 0 ? ['1.4F se suma sin el factor 0.75 (lectura del autor de C-C.9.2.4)'] : [],
    });
    plantillas.push({
      id: 'C-C.9-3',
      texto: '0.9D + (1.6W ó 1.0E)',
      accion: a.accion,
      terminos: [t('D', 0.9), t(a.accion, a.factor)],
      usaWE: true,
    });
  }

  if (k.H !== 0) {
    plantillas.push(
      o.dReduceH
        ? { id: 'C-C.9-4', texto: '1.4D + 1.7L + 1.7H', terminos: [t('D', 0.9), t('L', 0), t('H', 1.7), ...conF], usaWE: false, notas: ['D o L reducen el efecto de H: 0.9D en lugar de 1.4D y L = 0 (C-C.9.2.3)'] }
        : { id: 'C-C.9-4', texto: '1.4D + 1.7L + 1.7H', terminos: [t('D', 1.4), t('L', 1.7), t('H', 1.7), ...conF], usaWE: false },
    );
  }

  if (k.T !== 0) {
    plantillas.push({ id: 'C-C.9-5', texto: '0.75(1.4D + 1.4T + 1.7L)', terminos: [t('D', 0.75 * 1.4), t('T', 0.75 * 1.4), t('L', 0.75 * 1.7), ...conF], usaWE: false });
    plantillas.push({ id: 'C-C.9-6', texto: '1.4(D + T)', terminos: [t('D', 1.4), t('T', 1.4)], usaWE: false });
  }

  const salida: ResultadoCC[] = [];
  for (const p of plantillas) {
    salida.push({ id: p.id, texto: p.texto, accion: p.accion, expresion: expresionCC(p.terminos), terminos: p.terminos, valor: valorDe(p.terminos, k), notas: p.notas ?? [] });
    if (o.sentidos === 'ambos' && p.usaWE) {
      const kf = { ...k, W: -k.W, E: -k.E };
      salida.push({ id: p.id, texto: p.texto, accion: p.accion, expresion: expresionCC(p.terminos), terminos: p.terminos, valor: valorDe(p.terminos, kf), variante: 'sentido contrario de W y E', notas: p.notas ?? [] });
    }
  }
  return salida;
}

/** Combinación de mayor valor y de menor valor de una lista de resultados de C-C.9.2. */
export function envolventeCC(lista: ResultadoCC[]): { maxima: ResultadoCC; minima: ResultadoCC } | null {
  if (lista.length === 0) return null;
  let maxima = lista[0];
  let minima = lista[0];
  for (const c of lista) {
    if (c.valor > maxima.valor) maxima = c;
    if (c.valor < minima.valor) minima = c;
  }
  return { maxima, minima };
}

/** C-C.9.2.7 (C-232): fuerza de diseño de la zona de anclaje de postensado = 1.2 × fuerza máxima del gato. */
export const fuerzaAnclajePostensadoCC = (fuerzaGato: number): number => 1.2 * fuerzaGato;

/* ═════════════════════════ C-C.9.3 — Factores φ ═════════════════════════ */

export type SolicitacionPhi =
  | 'traccion'
  | 'compresion-espiral'
  | 'compresion-otros'
  | 'cortante-torsion'
  | 'aplastamiento'
  | 'anclaje-postensado'
  | 'puntal-tensor'
  | 'simple';

/** φ de C-C.9.3.2 (y C-C.9.3.5 para concreto simple). */
export function phiCCPorSolicitacion(s: SolicitacionPhi): number {
  switch (s) {
    case 'traccion':
      return PHI_CC.traccion;
    case 'compresion-espiral':
      return PHI_CC.compresionEspiral;
    case 'compresion-otros':
      return PHI_CC.compresionOtros;
    case 'cortante-torsion':
      return PHI_CC.cortanteTorsion;
    case 'aplastamiento':
      return PHI_CC.aplastamiento;
    case 'anclaje-postensado':
      return PHI_CC.anclajePostensado;
    case 'puntal-tensor':
      return PHI_CC.puntalTensor;
    case 'simple':
      return PHI_CC.simple;
  }
}

/** φ del cuerpo del Capítulo C.9 (C.9.3.2 y C.9.3.5) para la misma solicitación. */
export function phiC9PorSolicitacion(s: SolicitacionPhi): number {
  const n = TABLA_PHI;
  const buscar = (sec: string) => {
    const f = n.find((x) => x.seccion === sec);
    if (!f) throw new Error(`falta ${sec} en TABLA_PHI`);
    return f.phi;
  };
  switch (s) {
    case 'traccion':
      return buscar('C.9.3.2.1');
    case 'compresion-espiral':
      return buscar('C.9.3.2.2(a)');
    case 'compresion-otros':
      return buscar('C.9.3.2.2(b)');
    case 'cortante-torsion':
      return buscar('C.9.3.2.3');
    case 'aplastamiento':
      return buscar('C.9.3.2.4');
    case 'anclaje-postensado':
      return buscar('C.9.3.2.5');
    case 'puntal-tensor':
      return buscar('C.9.3.2.6');
    case 'simple':
      return buscar('C.9.3.5');
  }
}

/** Fila de la comparación C-C ↔ C.9 por numeral de C-C (p. ej. 'C-C.9.3.2.3'). */
export function filaComparada(seccionCC: string): FilaPhiCC | undefined {
  return TABLA_PHI_COMPARADA.find((f) => f.seccion === seccionCC);
}

/**
 * C-C.9.3.2.2 (C-232): φ de la región de transición con los φ de compresión del Apéndice C-C (0.75 con espiral, 0.70
 * otros): crece linealmente hasta 0.90 al aumentar εt desde el límite controlado por compresión hasta 0.005.
 * El límite es 0.002 para fy = 420 MPa y preesforzado, o fy/Es en general (C.10.3.3).
 */
export function phiDeformacionCC(epsilonT: number, tipoEstribo: TipoEstribo = 'otro', fy: number | 'preesforzado' = 420): number {
  if (!Number.isFinite(epsilonT)) throw new RangeError('εt debe ser un número finito');
  const pc = tipoEstribo === 'espiral' ? PHI_CC.compresionEspiral : PHI_CC.compresionOtros;
  const lim = epsilonLimiteCompresion(fy);
  const f = Math.min(1, Math.max(0, (epsilonT - lim) / (0.005 - lim)));
  return pc + (PHI_TRACCION - pc) * f;
}

/**
 * Alternativa por carga axial de C-C.9.3.2.2 (C-232) con los φ de C-C: φ aumenta linealmente hasta 0.90 al decrecer φPn
 * desde el umbral hasta cero. Umbral = 0.10 f′c Ag (fy ≤ 420 MPa, refuerzo simétrico, (d − d′)/h ≥ 0.70) o el menor entre
 * 0.10 f′c Ag y φPb (otros elementos): pasa `phiPb` solo en este segundo caso. φPn y φPb en kN, Ag en mm².
 */
export function phiPorCargaAxialCC(phiPn: number, fc: number, ag: number, tipoEstribo: TipoEstribo = 'otro', phiPb?: number): number {
  const pc = tipoEstribo === 'espiral' ? PHI_CC.compresionEspiral : PHI_CC.compresionOtros;
  const u0 = (0.1 * fc * ag) / 1000;
  const umbral = phiPb === undefined ? u0 : Math.min(u0, phiPb);
  if (!(umbral > 0)) throw new RangeError('umbral de carga axial no positivo');
  if (phiPn >= umbral) return pc;
  if (phiPn <= 0) return PHI_TRACCION;
  return PHI_TRACCION - ((PHI_TRACCION - pc) * phiPn) / umbral;
}

/* ═════════════════════════ Comparación con el cuerpo de C.9 y con B.2.4 (auxiliar) ═════════════════════════ */

export type OpcionesComparacion = {
  viento13?: boolean;
  sismoServicio?: boolean;
};

export interface ComparacionConjuntos {
  /** Mayor U del cuerpo del Capítulo C.9 y la ecuación que la produce. */
  uC9: number;
  ecuacionC9: string;
  /** Mayor U de C-C y la ecuación que la produce. */
  uCC: number;
  ecuacionCC: string;
  phiC9: number;
  phiCC: number;
  /** Resistencia nominal necesaria = U/φ con cada conjunto. */
  reqC9: number;
  reqCC: number;
  /** reqCC / reqC9: >1 significa que C-C exige más resistencia nominal. */
  razon: number;
  masExigente: 'C-C' | 'C.9' | 'igual';
}

/**
 * (auxiliar) Compara la resistencia nominal que exige cada conjunto de factores para una misma solicitación (misma
 * clase de φ): Rn,req = U_máx/φ. El conjunto de C-C no debe mezclarse con el de C.9 (C.9.1.3); aquí solo se comparan
 * los resultados de cada uno por separado. Los efectos de las cargas se dan como valores con signo (misma unidad).
 */
export function compararConjuntos(
  cargas: CargasCC,
  solicitacion: SolicitacionPhi,
  o: OpcionesComparacion = {},
): ComparacionConjuntos {
  const lista9 = resistenciaRequerida(cargas as CargasU, { viento13: o.viento13, sismoServicio: o.sismoServicio });
  const listaCC = resistenciaRequeridaCC(cargas, { viento13: o.viento13, sismoServicio: o.sismoServicio });
  const e9 = envolventeU(lista9);
  const eCC = envolventeCC(listaCC);
  if (!e9 || !eCC) throw new RangeError('sin combinaciones que evaluar');
  const phiC9 = phiC9PorSolicitacion(solicitacion);
  const phiC = phiCCPorSolicitacion(solicitacion);
  const reqC9 = e9.maxima.valor / phiC9;
  const reqCC = eCC.maxima.valor / phiC;
  const razon = reqCC / reqC9;
  return {
    uC9: e9.maxima.valor,
    ecuacionC9: e9.maxima.id,
    uCC: eCC.maxima.valor,
    ecuacionCC: eCC.maxima.id + (eCC.maxima.accion ? ` (${eCC.maxima.accion})` : ''),
    phiC9,
    phiCC: phiC,
    reqC9,
    reqCC,
    razon,
    masExigente: Math.abs(razon - 1) < 1e-9 ? 'igual' : razon > 1 ? 'C-C' : 'C.9',
  };
}

/**
 * (auxiliar) El cuerpo del Capítulo C.9 trae las mismas siete combinaciones que B.2.4 (C.9-n ↔ B.2.4-n). Devuelve true si,
 * para las cargas dadas, cada U de C.9 coincide con la B.2.4 de igual número.
 */
export function c9IgualAB24(cargas: CargasU, o: { viento13?: boolean; sismoServicio?: boolean; reducirL?: boolean; hNeutraliza?: boolean } = {}): boolean {
  const c9 = resistenciaRequerida(cargas, o);
  const b24 = combinacionesResistencia(cargas, {
    viento13: o.viento13,
    sismoNivelServicio: o.sismoServicio,
    reducirFactorL: o.reducirL,
    hNeutralizaWE: o.hNeutraliza,
  });
  if (c9.length !== b24.length) return false;
  return c9.every((x, i) => Math.abs(x.valor - b24[i].valor) < 1e-9);
}
