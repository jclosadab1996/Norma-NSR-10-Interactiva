/**
 * Título C — Capítulo C.9: Requisitos de resistencia y funcionamiento (PDF p.369–375, impresas C-67 a C-73).
 *
 * Contiene:
 *  - Resistencia requerida U (C.9.2.1, Ecs. C.9-1 a C.9-7) con las excepciones (a) a (d).
 *  - Factores de reducción de resistencia φ (C.9.3), en particular φ(εt) con la transición lineal.
 *  - Alturas mínimas de elementos en una dirección (Tabla C.9.5(a)) y de losas en dos direcciones
 *    (Tabla C.9.5(c), Ecs. C.9-12 y C.9-13).
 *  - Deflexiones: momento de inercia efectivo Ie (C.9-8 a C.9-10), λΔ (C.9-11), ξ y límites de la Tabla C.9.5(b).
 *
 * Unidades: SI. Longitudes y secciones en mm / mm⁴; momentos en kN·m; módulos y resistencias en MPa;
 * cargas distribuidas en kN/m; deflexiones en mm. Lo que NO es texto de la norma está marcado "(auxiliar)":
 * fórmulas usuales de mecánica (Icr, deflexiones elásticas) que la norma deja a "los métodos o fórmulas usuales".
 */
import { ES_ACERO_MPA, moduloRotura } from './concreto';
import {
  ALFA_F_VIGA_BORDE_MIN,
  AUMENTO_BORDE_DISCONTINUO,
  ECUACIONES_U,
  EPSILON_CU,
  EPSILON_LIMITE_COMPRESION_420,
  EPSILON_T_TRACCION,
  FACTOR_ANCLAJE_POSTENSADO,
  FACTOR_LIVIANO_MIN,
  FY_MAX_DISENO_MPA,
  FY_REF_C95A,
  H_MIN_C912_MM,
  H_MIN_C913_MM,
  H_MIN_CON_ABACO_MM,
  H_MIN_SIN_ABACO_MM,
  L0_LIMITE_REDUCCION_L,
  PHI_COMPRESION_ESPIRAL,
  PHI_COMPRESION_OTROS,
  PHI_TRACCION,
  TABLA_C95A,
  TABLA_C95B,
  TABLA_C95C,
  TABLA_XI,
  WC_LIVIANO_MAX,
  WC_LIVIANO_MIN,
  type ApoyoUnaDireccion,
  type CargaC9,
  type ConAbaco,
  type DuracionCarga,
  type ElementoUnaDireccion,
  type PanelC95c,
  type TipoElementoDeflexion,
} from '../../data/resistenciaServicioC9';

/* ═════════════════════════ C.9.2 — Resistencia requerida U ═════════════════════════ */

export type CargasU = Partial<Record<CargaC9, number>>;
type CargasCompletas = Record<CargaC9, number>;
export type TerminoU = { carga: CargaC9; factor: number };

export type OpcionesU = {
  /** C.9.2.1(a): usar 0.5 en lugar de 1.0 para L en C.9-3, C.9-4 y C.9-5. */
  reducirL?: boolean;
  /** C.9.2.1(b): usar 1.3W en lugar de 1.6W en C.9-4 y C.9-6 (viento sin reducir por direccionalidad). */
  viento13?: boolean;
  /** C.9.2.1(c): usar 1.4E en lugar de 1.0E en C.9-5 y C.9-7 (E basado en niveles de servicio). */
  sismoServicio?: boolean;
  /** C.9.2.1(d): H = 0 en C.9-6 y C.9-7 si su acción neutraliza la de W o E. */
  hNeutraliza?: boolean;
  /** 'dado' usa W y E con el signo introducido; 'ambos' añade el sentido contrario (para efectos reversibles). */
  sentidos?: 'dado' | 'ambos';
};

export type ResultadoU = {
  /** Ecuación de la norma, p. ej. "C.9-3". */
  id: string;
  /** Texto de la ecuación tal como aparece en la norma. */
  texto: string;
  /** Expresión con los factores efectivamente aplicados, p. ej. "1.2D + 1.0E + 0.5L". */
  expresion: string;
  terminos: TerminoU[];
  valor: number;
  /** Carga de cubierta escogida cuando la ecuación trae (Lr ó G ó Le). */
  cubierta?: 'Lr' | 'G' | 'Le';
  variante?: string;
  notas: string[];
};

const ORDEN: CargaC9[] = ['D', 'L', 'Lr', 'G', 'Le', 'W', 'E', 'F', 'H', 'T'];

const completar = (c: CargasU): CargasCompletas => {
  const r = {} as CargasCompletas;
  for (const k of ORDEN) r[k] = c[k] ?? 0;
  return r;
};

const t = (carga: CargaC9, factor: number): TerminoU => ({ carga, factor });
const num = (x: number) => String(Number(x.toFixed(4)));

/** Texto de una expresión resuelta, omitiendo los factores iguales a 0. */
export function expresionU(terminos: TerminoU[]): string {
  const partes = terminos.filter((x) => x.factor !== 0).map((x) => (x.factor === 1 ? x.carga : `${num(x.factor)}${x.carga}`));
  return partes.length ? partes.join(' + ') : '0';
}

/** Carga de cubierta más desfavorable entre Lr, G y Le (se prefiere Lr en empate). Entra UNA sola. */
export function cargaCubiertaC9(c: CargasU): { carga: 'Lr' | 'G' | 'Le'; valor: number } {
  const k = completar(c);
  let mejor: 'Lr' | 'G' | 'Le' = 'Lr';
  for (const n of ['G', 'Le'] as const) if (k[n] > k[mejor]) mejor = n;
  return { carga: mejor, valor: k[mejor] };
}

type Ctx = { k: CargasCompletas; cub: 'Lr' | 'G' | 'Le' };
type Constructor = (cx: Ctx, o: OpcionesU) => { terminos: TerminoU[]; notas?: string[] };

const fW = (o: OpcionesU) => (o.viento13 ? 1.3 : 1.6);
const fE = (o: OpcionesU) => (o.sismoServicio ? 1.4 : 1.0);
const fL = (o: OpcionesU) => (o.reducirL ? 0.5 : 1.0);
const fH = (o: OpcionesU) => (o.hNeutraliza ? 0 : 1.6);

const CONSTRUCTORES: Record<string, Constructor> = {
  // C.9-1 (C-67): U = 1.4(D + F)
  'C.9-1': () => ({ terminos: [t('D', 1.4), t('F', 1.4)] }),
  // C.9-2: U = 1.2(D + F + T) + 1.6(L + H) + 0.5(Lr ó G ó Le)
  'C.9-2': (cx) => ({ terminos: [t('D', 1.2), t('F', 1.2), t('T', 1.2), t('L', 1.6), t('H', 1.6), t(cx.cub, 0.5)] }),
  // C.9-3: U = 1.2D + 1.6(Lr ó G ó Le) + (1.0L ó 0.8W); L puede ir con 0.5 (excepción a)
  'C.9-3': (cx, o) => {
    const f = fL(o);
    const eligeL = f * cx.k.L >= 0.8 * cx.k.W;
    return {
      terminos: [t('D', 1.2), t(cx.cub, 1.6), eligeL ? t('L', f) : t('W', 0.8)],
      notas: [eligeL ? `(${f}L ó 0.8W): gobierna L` : `(${f}L ó 0.8W): gobierna 0.8W`],
    };
  },
  // C.9-4: U = 1.2D + 1.6W + 1.0L + 0.5(Lr ó G ó Le); 1.3W (b) y 0.5L (a)
  'C.9-4': (cx, o) => ({ terminos: [t('D', 1.2), t('W', fW(o)), t('L', fL(o)), t(cx.cub, 0.5)] }),
  // C.9-5: U = 1.2D + 1.0E + 1.0L; 1.4E (c) y 0.5L (a)
  'C.9-5': (_cx, o) => ({ terminos: [t('D', 1.2), t('E', fE(o)), t('L', fL(o))] }),
  // C.9-6: U = 0.9D + 1.6W + 1.6H; 1.3W (b) y H = 0 (d)
  'C.9-6': (_cx, o) => ({
    terminos: [t('D', 0.9), t('W', fW(o)), t('H', fH(o))],
    notas: o.hNeutraliza ? ['H = 0: neutraliza a W (C.9.2.1(d))'] : [],
  }),
  // C.9-7: U = 0.9D + 1.0E + 1.6H; 1.4E (c) y H = 0 (d)
  'C.9-7': (_cx, o) => ({
    terminos: [t('D', 0.9), t('E', fE(o)), t('H', fH(o))],
    notas: o.hNeutraliza ? ['H = 0: neutraliza a E (C.9.2.1(d))'] : [],
  }),
};

function construirU(id: string, texto: string, cargas: CargasCompletas, o: OpcionesU, flip: boolean): ResultadoU {
  const k: CargasCompletas = flip ? { ...cargas, W: -cargas.W, E: -cargas.E } : cargas;
  const cub = cargaCubiertaC9(k).carga;
  const r = CONSTRUCTORES[id]({ k, cub }, o);
  const valor = r.terminos.reduce((s, x) => s + x.factor * k[x.carga], 0);
  return {
    id,
    texto,
    expresion: expresionU(r.terminos),
    terminos: r.terminos,
    valor,
    cubierta: /Lr ó G ó Le/.test(texto) ? cub : undefined,
    variante: flip ? 'sentido contrario de W y E' : undefined,
    notas: r.notas ?? [],
  };
}

/**
 * Las siete combinaciones de C.9.2.1 (Ecs. C.9-1 a C.9-7) para los efectos de carga dados (mismo tipo de efecto y
 * unidades, con signo; las cargas ausentes valen 0). Con `sentidos: 'ambos'` se añade el sentido contrario de W y E
 * en las ecuaciones que los incluyen. Debe investigarse además el efecto de una o más cargas que no actúan (C.9.2.1).
 */
export function resistenciaRequerida(cargas: CargasU, opciones: OpcionesU = {}): ResultadoU[] {
  const k = completar(cargas);
  const salida: ResultadoU[] = [];
  for (const e of ECUACIONES_U) {
    const base = construirU(e.id, e.texto, k, opciones, false);
    salida.push(base);
    if (opciones.sentidos === 'ambos' && base.terminos.some((x) => x.carga === 'W' || x.carga === 'E')) {
      salida.push(construirU(e.id, e.texto, k, opciones, true));
    }
  }
  return salida;
}

/** Combinación de mayor valor (gobierna el efecto positivo) y de menor valor (efecto negativo / inversión). */
export function envolventeU(lista: ResultadoU[]): { maxima: ResultadoU; minima: ResultadoU } | null {
  if (lista.length === 0) return null;
  let maxima = lista[0];
  let minima = lista[0];
  for (const c of lista) {
    if (c.valor > maxima.valor) maxima = c;
    if (c.valor < minima.valor) minima = c;
  }
  return { maxima, minima };
}

export type UsoL = 'general' | 'estacionamiento' | 'reunion-publica';

/**
 * C.9.2.1(a) (C-67): ¿se permite reducir a 0.5 el factor de L en C.9-3 a C.9-5?
 * No en estacionamientos, lugares de reunión pública ni donde L0 > 4.8 kN/m².
 */
export function puedeReducirL(uso: UsoL, l0: number): boolean {
  if (uso === 'estacionamiento' || uso === 'reunion-publica') return false;
  return l0 <= L0_LIMITE_REDUCCION_L;
}

/** C.9.2.4 (C-68): fuerza de diseño en zonas de anclaje de postensado = 1.2 × fuerza máxima aplicada por el gato. */
export function fuerzaAnclajePostensado(fuerzaGato: number): number {
  return FACTOR_ANCLAJE_POSTENSADO * fuerzaGato;
}

/* ═════════════════════════ C.9.3 — Factores φ ═════════════════════════ */

export type TipoEstribo = 'espiral' | 'otro';
export type ZonaSeccion = 'compresion' | 'transicion' | 'traccion';

/** φ de compresión: 0.75 con refuerzo en espiral (C.9.3.2.2(a)), 0.65 en otros elementos (C.9.3.2.2(b)). */
export const phiCompresion = (tipo: TipoEstribo): number => (tipo === 'espiral' ? PHI_COMPRESION_ESPIRAL : PHI_COMPRESION_OTROS);

/**
 * Límite de deformación unitaria controlada por compresión (C.10.3.3, C-76): es la εt en condición balanceada,
 * εty = fy/Es; para refuerzo Grado 420 y para todo refuerzo preesforzado se permite fijarlo en 0.002.
 * Con otro fy se usa fy/Es (lectura del texto de C.10.3.3; para fy ≠ 420 no se da un valor tabulado).
 */
export function epsilonLimiteCompresion(fy: number | 'preesforzado' = 420): number {
  if (fy === 'preesforzado') return EPSILON_LIMITE_COMPRESION_420;
  if (!Number.isFinite(fy) || fy <= 0) throw new RangeError('fy debe ser positivo');
  return Math.abs(fy - FY_REF_C95A) < 1e-9 ? EPSILON_LIMITE_COMPRESION_420 : fy / ES_ACERO_MPA;
}

export type DetallePhi = {
  phi: number;
  zona: ZonaSeccion;
  /** φ de la sección controlada por compresión que se usó como extremo inferior. */
  phiCompresion: number;
  /** εt del límite controlado por compresión. */
  epsilonLimite: number;
  /** εt del límite controlado por tracción (0.005). */
  epsilonTraccion: number;
  /** Fracción de la transición recorrida (0 en compresión, 1 en tracción). */
  fraccion: number;
};

/** φ de flexión/carga axial en función de εt, con detalle de la zona (C.9.3.2.1, C.9.3.2.2 y transición lineal, C-68). */
export function phiDetalle(epsilonT: number, tipoEstribo: TipoEstribo = 'otro', fy: number | 'preesforzado' = 420): DetallePhi {
  if (!Number.isFinite(epsilonT)) throw new RangeError('εt debe ser un número finito');
  const lim = epsilonLimiteCompresion(fy);
  const pc = phiCompresion(tipoEstribo);
  const fraccion = Math.min(1, Math.max(0, (epsilonT - lim) / (EPSILON_T_TRACCION - lim)));
  const zona: ZonaSeccion = epsilonT <= lim ? 'compresion' : epsilonT >= EPSILON_T_TRACCION ? 'traccion' : 'transicion';
  return {
    phi: pc + (PHI_TRACCION - pc) * fraccion,
    zona,
    phiCompresion: pc,
    epsilonLimite: lim,
    epsilonTraccion: EPSILON_T_TRACCION,
    fraccion,
  };
}

/**
 * φ en función de la deformación unitaria neta de tracción εt del acero extremo en tracción (C.9.3.2, C-68):
 *  - εt ≤ límite de compresión: φ = 0.75 (espiral) ó 0.65 (otro);
 *  - εt ≥ 0.005: φ = 0.90;
 *  - entre ambos: variación lineal de φ de compresión a 0.90.
 * @param epsilonT   deformación unitaria neta de tracción (adimensional, p. ej. 0.0035).
 * @param tipoEstribo 'espiral' (refuerzo en espiral según C.10.9.3) u 'otro'.
 * @param fy         fy del refuerzo (MPa) que define el límite de compresión (0.002 para Grado 420), o 'preesforzado'.
 */
export function phiFlexion(epsilonT: number, tipoEstribo: TipoEstribo = 'otro', fy: number | 'preesforzado' = 420): number {
  return phiDetalle(epsilonT, tipoEstribo, fy).phi;
}

/**
 * εt = 0.003 (dt − c) / c: deformación del acero extremo en tracción por proporción de deformaciones lineales con
 * εcu = 0.003 (auxiliar: consecuencia de las hipótesis de C.10.2). `c` y `dt` en la misma unidad.
 */
export function epsilonTDesdeC(c: number, dt: number): number {
  if (!(c > 0)) throw new RangeError('c debe ser positivo');
  return (EPSILON_CU * (dt - c)) / c;
}

/**
 * Alternativa de C.9.3.2.2 (Apéndice C-B, C-68): φ aumenta linealmente hasta 0.90 al disminuir φPn desde
 * 0.10·f′c·Ag (o φPb, el menor, en elementos que no cumplen las condiciones de fy ≤ 420 MPa, refuerzo simétrico y
 * (d − d′)/h ≥ 0.70) hasta cero. Por encima del umbral φ es el de compresión.
 * @param phiPn  kN · @param fc MPa · @param ag mm² · @param phiPb kN (opcional; si se da, el umbral es min(0.10 f′c Ag, φPb)).
 */
export function phiPorCargaAxial(phiPn: number, fc: number, ag: number, tipoEstribo: TipoEstribo = 'otro', phiPb?: number): number {
  const pc = phiCompresion(tipoEstribo);
  const umbral0 = (0.1 * fc * ag) / 1000; // kN
  const umbral = phiPb === undefined ? umbral0 : Math.min(umbral0, phiPb);
  if (!(umbral > 0)) throw new RangeError('umbral de carga axial no positivo');
  if (phiPn >= umbral) return pc;
  if (phiPn <= 0) return PHI_TRACCION;
  return PHI_TRACCION - ((PHI_TRACCION - pc) * phiPn) / umbral;
}

/**
 * C.9.3.2.7(b) (C-69): φ de flexión en elementos pretensados donde el embebido del torón es menor que la longitud de
 * desarrollo: 0.75 hasta el fin de la longitud de transferencia y luego lineal hasta 0.90 en la longitud de desarrollo.
 * @param x distancia embebida desde el extremo del torón; `lt` longitud de transferencia; `ld` longitud de desarrollo.
 */
export function phiPretensadoEmbebido(x: number, lt: number, ld: number): number {
  if (!(ld > lt && lt >= 0)) throw new RangeError('se requiere ld > lt ≥ 0');
  if (x <= lt) return 0.75;
  if (x >= ld) return PHI_TRACCION;
  return 0.75 + ((PHI_TRACCION - 0.75) * (x - lt)) / (ld - lt);
}

/** C.9.4 (C-69): fy y fyt de diseño ≤ 550 MPa (no aplica a acero de preesforzado ni a espirales de C.10.9.3 y C.21.1.5.4). */
export const fyDisenoPermitido = (fy: number): boolean => fy <= FY_MAX_DISENO_MPA;

/* ═════════════════════════ C.9.5.2 — Altura mínima en una dirección ═════════════════════════ */

/** Nota (b) de la Tabla C.9.5(a): factor (0.4 + fy/700) para fy ≠ 420 MPa (vale 1.0 con 420). */
export const factorFyAltura = (fy: number): number => 0.4 + fy / 700;

/**
 * Nota (a) de la Tabla C.9.5(a): para concreto liviano estructural con 1440 ≤ wc ≤ 1840 kg/m³ los valores se
 * multiplican por (1.65 − 0.0003 wc), pero no menos de 1.09. Fuera de ese rango lanza RangeError.
 */
export function factorConcretoLiviano(wc: number): number {
  if (!(wc >= WC_LIVIANO_MIN && wc <= WC_LIVIANO_MAX)) {
    throw new RangeError(`la nota (a) de la Tabla C.9.5(a) solo cubre ${WC_LIVIANO_MIN} ≤ wc ≤ ${WC_LIVIANO_MAX} kg/m³`);
  }
  return Math.max(1.65 - 0.0003 * wc, FACTOR_LIVIANO_MIN);
}

export type EntradaAlturaMinima = {
  elemento: ElementoUnaDireccion;
  apoyo: ApoyoUnaDireccion;
  /** Luz ℓ en mm (luz de cálculo según C.8.9; en voladizo, la longitud del voladizo). */
  luzMm: number;
  /** fy del refuerzo, MPa (por defecto 420). */
  fy?: number;
  /** Densidad del concreto liviano estructural (kg/m³); omitir para concreto de peso normal. */
  wc?: number;
};

export type ResultadoAlturaMinima = {
  /** ℓ/divisor de la Tabla C.9.5(a). */
  divisor: number;
  /** h de la tabla (grado 420, peso normal), mm. */
  hTablaMm: number;
  factorFy: number;
  factorLiviano: number;
  /** h mínima modificada, mm. */
  hMm: number;
};

/** Altura o espesor mínimo de la Tabla C.9.5(a) con las notas (a) y (b) (C.9.5.2.1, C-69/C-70). */
export function alturaMinimaUnaDireccion({ elemento, apoyo, luzMm, fy = 420, wc }: EntradaAlturaMinima): ResultadoAlturaMinima {
  if (!(luzMm > 0)) throw new RangeError('la luz debe ser positiva');
  if (!(fy > 0)) throw new RangeError('fy debe ser positivo');
  const divisor = TABLA_C95A[elemento][apoyo];
  const hTablaMm = luzMm / divisor;
  const factorFy = factorFyAltura(fy);
  const factorLiviano = wc === undefined ? 1 : factorConcretoLiviano(wc);
  return { divisor, hTablaMm, factorFy, factorLiviano, hMm: hTablaMm * factorFy * factorLiviano };
}

/* ═════════════════════════ C.9.5.3 — Losas en dos direcciones ═════════════════════════ */

/** Divisor de ℓn de la Tabla C.9.5(c), con interpolación lineal en fy (nota † de la tabla); fy entre 280 y 520 MPa. */
export function divisorC95c(fy: number, abaco: ConAbaco, panel: PanelC95c): number {
  const f0 = TABLA_C95C[0].fy;
  const fN = TABLA_C95C[TABLA_C95C.length - 1].fy;
  if (!(fy >= f0 && fy <= fN)) throw new RangeError(`la Tabla C.9.5(c) cubre ${f0} ≤ fy ≤ ${fN} MPa; no se extrapola`);
  for (let i = 0; i < TABLA_C95C.length - 1; i++) {
    const a = TABLA_C95C[i];
    const b = TABLA_C95C[i + 1];
    if (fy >= a.fy && fy <= b.fy) {
      const va = a.valores[abaco][panel];
      const vb = b.valores[abaco][panel];
      return va + ((vb - va) * (fy - a.fy)) / (b.fy - a.fy);
    }
  }
  return TABLA_C95C[TABLA_C95C.length - 1].valores[abaco][panel];
}

export type EntradaDosDirecciones = {
  /** Luz libre en la dirección larga ℓn, mm. */
  lnMm: number;
  /** β = luz libre larga / luz libre corta. */
  beta: number;
  /** αfm: valor promedio de αf (Ec. C.13-3) de las vigas en los bordes del panel; 0 para losas sin vigas interiores. */
  alfaFm: number;
  fy: number;
  /** Solo se usa cuando se aplica la Tabla C.9.5(c) (losa sin vigas interiores o αfm ≤ 0.2). */
  abaco?: ConAbaco;
  panel?: PanelC95c;
  /** C.9.5.3.3(d): panel con borde discontinuo sin viga de borde con αf ≥ 0.80 → h × 1.10. */
  bordeDiscontinuoSinViga?: boolean;
};

export type ResultadoDosDirecciones = {
  /** Regla aplicada. */
  regla: 'C.9.5.3.2' | 'C.9-12' | 'C.9-13';
  /** h calculada antes de los mínimos absolutos, mm. */
  hCalculadaMm: number;
  /** Mínimo absoluto de la regla (125, 100 ó 90 mm). */
  minimoAbsolutoMm: number;
  /** h mínima final (incluye el 10 % de C.9.5.3.3(d) si se pidió), mm. */
  hMm: number;
};

/** Espesor mínimo de losas en dos direcciones según C.9.5.3.2 (Tabla C.9.5(c)) o C.9.5.3.3 (Ecs. C.9-12 y C.9-13). */
export function espesorMinimoDosDirecciones(e: EntradaDosDirecciones): ResultadoDosDirecciones {
  const { lnMm, beta, alfaFm, fy } = e;
  if (!(lnMm > 0) || !(beta >= 1) || !(alfaFm >= 0) || !(fy > 0)) throw new RangeError('datos de losa no válidos (ℓn > 0, β ≥ 1, αfm ≥ 0, fy > 0)');
  let regla: ResultadoDosDirecciones['regla'];
  let hCalc: number;
  let minimo: number;
  if (alfaFm <= 0.2) {
    const abaco = e.abaco ?? 'sin-abaco';
    hCalc = lnMm / divisorC95c(fy, abaco, e.panel ?? 'interior');
    minimo = abaco === 'con-abaco' ? H_MIN_CON_ABACO_MM : H_MIN_SIN_ABACO_MM;
    regla = 'C.9.5.3.2';
  } else if (alfaFm <= 2.0) {
    hCalc = (lnMm * (0.8 + fy / 1400)) / (36 + 5 * beta * (alfaFm - 0.2));
    minimo = H_MIN_C912_MM;
    regla = 'C.9-12';
  } else {
    hCalc = (lnMm * (0.8 + fy / 1400)) / (36 + 9 * beta);
    minimo = H_MIN_C913_MM;
    regla = 'C.9-13';
  }
  let h = Math.max(hCalc, minimo);
  if (e.bordeDiscontinuoSinViga && regla !== 'C.9.5.3.2') h *= 1 + AUMENTO_BORDE_DISCONTINUO;
  return { regla, hCalculadaMm: hCalc, minimoAbsolutoMm: minimo, hMm: h };
}

/** C.9.5.3.3(d): αf mínimo de la viga de borde para no tener que aumentar h en el panel con borde discontinuo. */
export const ALFA_F_BORDE_MIN = ALFA_F_VIGA_BORDE_MIN;

/* ═════════════════════════ C.9.5.2.3 — Inercia efectiva Ie ═════════════════════════ */

/** Propiedades de una sección rectangular b × h (mm): Ig = b h³/12, yt = h/2. (auxiliar) */
export function propiedadesRectangulares(bMm: number, hMm: number): { ig: number; yt: number; area: number } {
  return { ig: (bMm * hMm ** 3) / 12, yt: hMm / 2, area: bMm * hMm };
}

/** Ec. C.9-10: fr = 0.62 λ √f′c (MPa). Reexporta `moduloRotura` de concreto.ts. */
export const frC9 = moduloRotura;

/**
 * Ec. C.9-9: Mcr = fr·Ig / yt. fr en MPa, Ig en mm⁴, yt en mm. Devuelve kN·m.
 */
export function momentoAgrietamiento(fr: number, ig: number, yt: number): number {
  return (fr * ig) / yt / 1e6;
}

/**
 * Ec. C.9-8 (Branson): Ie = (Mcr/Ma)³ Ig + [1 − (Mcr/Ma)³] Icr, sin exceder Ig (C.9.5.2.3, C-70).
 * Si Ma ≤ Mcr la sección no se fisura y Ie = Ig. Mcr y Ma en las mismas unidades.
 */
export function inerciaEfectiva(mcr: number, ma: number, ig: number, icr: number): number {
  if (!(ig > 0) || !(icr > 0)) throw new RangeError('Ig e Icr deben ser positivos');
  if (!(ma > 0)) return ig;
  const r3 = (mcr / ma) ** 3;
  return Math.min(ig, r3 * ig + (1 - r3) * icr);
}

/** C.9.5.2.4 (C-70): Ie de elementos continuos = promedio de los valores de C.9-8 de las secciones críticas dadas. */
export function inerciaEfectivaPromedio(valores: number[]): number {
  if (valores.length === 0) throw new RangeError('se requiere al menos un valor de Ie');
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

export type EntradaIcr = {
  bMm: number;
  /** Profundidad efectiva al refuerzo de tracción, mm. */
  dMm: number;
  /** Área de refuerzo de tracción, mm². */
  asMm2: number;
  /** Ec del concreto, MPa. */
  ecMpa: number;
  /** Es del acero, MPa (por defecto 200 000). */
  esMpa?: number;
  /** Refuerzo de compresión (opcional): área y distancia d′ desde la fibra comprimida. */
  asPrimaMm2?: number;
  dPrimaMm?: number;
};

/**
 * Sección rectangular fisurada transformada (auxiliar, método usual de la mecánica):
 * eje neutro x de b·x²/2 + (n−1)A′s(x−d′) = n·As(d−x), y Icr = b x³/3 + (n−1)A′s(x−d′)² + n·As(d−x)², con n = Es/Ec.
 */
export function inerciaFisuradaRectangular(e: EntradaIcr): { x: number; icr: number; n: number } {
  const { bMm: b, dMm: d, asMm2: as, ecMpa: ec } = e;
  const n = (e.esMpa ?? ES_ACERO_MPA) / ec;
  const asP = e.asPrimaMm2 ?? 0;
  const dP = e.dPrimaMm ?? 0;
  const A = b / 2;
  const B = n * as + (n - 1) * asP;
  const C = -(n * as * d + (n - 1) * asP * dP);
  const x = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  const icr = (b * x ** 3) / 3 + (n - 1) * asP * (x - dP) ** 2 + n * as * (d - x) ** 2;
  return { x, icr, n };
}

/* ═════════════════════════ C.9.5.2.5 — Deflexión diferida ═════════════════════════ */

/** Factor ξ de la norma (C.9.5.2.5, C-70) para 3, 6, 12 meses y 5 años o más (60). */
export function factorXi(duracion: DuracionCarga): number {
  const fila = TABLA_XI.find((f) => f.meses === duracion);
  if (!fila) throw new RangeError('la norma solo da ξ para 3, 6, 12 meses y 5 años o más (60)');
  return fila.xi;
}

/** ρ′ = A′s / (b d), cuantía de refuerzo en compresión a mitad de luz (apoyo en voladizos). (auxiliar) */
export const rhoPrima = (asPrimaMm2: number, bMm: number, dMm: number): number => asPrimaMm2 / (bMm * dMm);

/** Ec. C.9-11: λΔ = ξ / (1 + 50 ρ′). La deflexión adicional a largo plazo es λΔ × deflexión inmediata por carga permanente. */
export function lambdaDiferida(xi: number, rhoP: number): number {
  return xi / (1 + 50 * rhoP);
}

export type CasoDeflexion = 'simple' | 'voladizo' | 'empotrado-ambos' | 'un-extremo-continuo';

/** Coeficiente c de δ = c·w·L⁴/(Ec·Ie) para carga uniforme (auxiliar: fórmulas elásticas usuales; el último caso es el máx. aprox. 1/185). */
export const COEF_DEFLEXION: Record<CasoDeflexion, number> = {
  simple: 5 / 384,
  voladizo: 1 / 8,
  'empotrado-ambos': 1 / 384,
  'un-extremo-continuo': 1 / 185,
};

/**
 * Deflexión inmediata por carga uniforme (auxiliar): δ = c·w·L⁴ / (Ec·Ie).
 * @param w kN/m · @param luzM m · @param ecMpa MPa · @param ieMm4 mm⁴ → mm.
 */
export function deflexionInmediataUniforme(caso: CasoDeflexion, w: number, luzM: number, ecMpa: number, ieMm4: number): number {
  return (COEF_DEFLEXION[caso] * w * (luzM * 1000) ** 4) / (ecMpa * ieMm4);
}

/** Límite de la Tabla C.9.5(b): ℓ/divisor (mm si ℓ en mm). */
export function limiteDeflexion(tipo: TipoElementoDeflexion, luz: number): number {
  const fila = TABLA_C95B.find((f) => f.id === tipo);
  if (!fila) throw new RangeError('tipo de elemento desconocido');
  return luz / fila.divisor;
}
