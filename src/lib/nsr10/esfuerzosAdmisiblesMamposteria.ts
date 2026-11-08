/**
 * Título D de la NSR-10 — Apéndice D-1: diseño de mampostería estructural por el método de los esfuerzos de trabajo
 * admisibles (D-1.5). Lógica pura, sin React.
 *
 * UNIDADES (como el apéndice): longitudes en mm · áreas en mm² · esfuerzos en MPa · FUERZAS en N (MPa·mm² = N).
 * Las cargas de servicio (P, V) entran en N; las calculadoras convierten desde kN en la frontera.
 * PDF = página impresa "D-n" + 565 (D-69 a D-74 = PDF 634 a 639). Constantes en src/data/esfuerzosAdmisiblesMamposteria.ts.
 *
 * ÍNDICE
 *   Acero ........ esfuerzoAdmisibleAcero (D-1.5-18 a D-1.5-23)
 *   Compresión ... reEsbeltez (D-1.5-5), faMuro / faColumnaNoReforzada (D-1.5-1, -2), paColumnaReforzada y
 *                  faColumnaReforzada (D-1.5-3, -4), fbAdmisible (D-1.5-6)
 *   Tracción ..... ftAdmisible (Tabla D-1.5-1)
 *   Combinados ... razonCombinada (D-1.5-7)
 *   Cortante ..... esfuerzoCortanteSolicitado (D-1.5-8 y -11), fvVigaAdmisible (D-1.5-9 y -10), fvMuroNoReforzado (D-1.5-12),
 *                  fvMuroReforzado (D-1.5-13 a -16), refuerzoCortante (D-1.5-17), separacionMaximaCortante
 *   Conjunto ..... evaluarEsfuerzos: calcula todos los admisibles aplicables y los compara con los actuantes que se den.
 *
 * Lo que NO es texto de la norma está rotulado «autoría del proyecto»: el uso de Fs = 0.4 fy ≤ 170 MPa (Ec. D-1.5-21) dentro
 * de Pa, la interpretación del incremento 0.2 fam, el valor absoluto de M/(Vd) y el factor de incremento opcional de esfuerzos.
 */
import {
  COMBINADO_MAX,
  FA_COEF_FM,
  FB_COEF_FM,
  FB_MAX_MPA,
  FS_ADMISIBLE,
  FV_MURO_NO_REFORZADO,
  FV_MURO_REFORZADO,
  FV_VIGA_CON_REFUERZO,
  FV_VIGA_SIN_REFUERZO,
  J_POR_DEFECTO,
  MVD_UMBRAL,
  PA_COEF_ACERO,
  S_MAX_FRACCION_D,
  S_MAX_MM,
  TABLA_D151,
  type ClaseMortero,
  type ClaveFs,
  type DireccionFt,
  type MorteroFt,
  type UnidadFt,
} from '../../data/esfuerzosAdmisiblesMamposteria';
import { ESBELTEZ_MAXIMA_MURO } from '../../data/muroMamposteria';
import { factorEsbeltez } from './mamposteria';

export type TipoAcero = 'corrugada' | 'lisa' | 'alambre';

/* ================================================================== */
/* D-1.5.10 — Esfuerzos admisibles en el refuerzo                      */
/* ================================================================== */

export interface ResultadoFs {
  /** Fs adoptado = mín(coef · fy, tope), MPa. */
  Fs: number;
  /** Valor sin el tope, coef · fy, MPa. */
  sinTope: number;
  tope: number;
  topeActivo: boolean;
  ecuacion: string;
}

/**
 * Fs = coef · fy ≤ tope (Ecs. D-1.5-18 a D-1.5-23, D-73/D-74, PDF p.638–639).
 * Corrugadas en tracción: 0.5 fy ≤ 170; lisas: 0.4 fy ≤ 140; alambres: 0.5 fy ≤ 210; columnas en compresión: 0.4 fy ≤ 170;
 * compresión en flexión (con refuerzo transversal D.4.2): corrugadas 0.5 fy ≤ 170; lisas 0.4 fy ≤ 140.
 */
export function esfuerzoAdmisibleAcero(clave: ClaveFs, fy: number): ResultadoFs {
  const c = FS_ADMISIBLE[clave];
  const sinTope = c.coef * fy;
  const Fs = Math.min(sinTope, c.maxMpa);
  return { Fs, sinTope, tope: c.maxMpa, topeActivo: sinTope > c.maxMpa, ecuacion: c.ecuacion };
}

/** Clave de Fs a tracción según el tipo de acero (D-1.5.10 a). */
export function claveFsTraccion(tipo: TipoAcero): ClaveFs {
  return tipo === 'corrugada' ? 'corrugada-traccion' : tipo === 'lisa' ? 'lisa-traccion' : 'alambre-traccion';
}

/** Clave de Fs a compresión en elementos a flexión (D-1.5.10 b); la norma no da valor para alambres → null. */
export function claveFsCompresionFlexion(tipo: TipoAcero): ClaveFs | null {
  return tipo === 'corrugada' ? 'flexion-corrugada-compresion' : tipo === 'lisa' ? 'flexion-lisa-compresion' : null;
}

/* ================================================================== */
/* D-1.5.2 y D-1.5.3 — Compresión axial y por flexión                  */
/* ================================================================== */

/** Re (Ec. D-1.5-5, D-71): 1 − [h′/(42t)]² si h′/t ≤ 30; [21t/h′]² si h′/t > 30. Idéntica a la Ec. D.5.5-2. */
export function reEsbeltez(hPrime: number, t: number): number {
  return factorEsbeltez(hPrime, t);
}

/** Fa de muros de mampostería = 0.20 f′m Re (Ec. D-1.5-1, D-70). MPa. */
export function faMuro(fm: number, Re: number): number {
  return FA_COEF_FM * fm * Re;
}

/** Fa de columnas de mampostería no reforzadas = 0.20 f′m Re (Ec. D-1.5-2, D-71). MPa. */
export function faColumnaNoReforzada(fm: number, Re: number): number {
  return FA_COEF_FM * fm * Re;
}

/** Pa = [0.20 f′m (Ae − Ast) + 0.65 Ast Fs] Re (Ec. D-1.5-4, D-71), en N con áreas en mm² y esfuerzos en MPa. */
export function paColumnaReforzada(args: { fm: number; Ae: number; Ast: number; Fs: number; Re: number }): number {
  const { fm, Ae, Ast, Fs, Re } = args;
  return (FA_COEF_FM * fm * (Ae - Ast) + PA_COEF_ACERO * Ast * Fs) * Re;
}

/** Fa de columnas reforzadas = Pa / Ae (Ec. D-1.5-3, D-71). Devuelve Pa (N) y Fa (MPa). */
export function faColumnaReforzada(args: { fm: number; Ae: number; Ast: number; Fs: number; Re: number }): { Pa: number; Fa: number } {
  const Pa = paColumnaReforzada(args);
  return { Pa, Fa: Pa / args.Ae };
}

/** Fb = 0.33 f′m ≤ 14 MPa (Ec. D-1.5-6, D-71). */
export function fbAdmisible(fm: number): { Fb: number; sinTope: number; topeActivo: boolean } {
  const sinTope = FB_COEF_FM * fm;
  return { Fb: Math.min(sinTope, FB_MAX_MPA), sinTope, topeActivo: sinTope > FB_MAX_MPA };
}

/* ================================================================== */
/* D-1.5.4 — Tracción por flexión, mampostería no reforzada            */
/* ================================================================== */

export interface EntradaFt {
  direccion: DireccionFt;
  unidad: UnidadFt;
  mortero: MorteroFt;
  clase: ClaseMortero;
  /**
   * Fracción de celdas inyectadas (0 a 1) para mampostería parcialmente inyectada de perforación vertical con tracción
   * perpendicular a las juntas horizontales: nota 1 de la Tabla D-1.5-1 (interpolación lineal entre «sin rellenar» y «rellenas»).
   * Si se omite, se usa el valor de la fila elegida.
   */
  fraccionRelleno?: number;
}

/** Valor de la Tabla D-1.5-1 (MPa) para una fila, tipo de mortero y clase de mortero. */
export function valorTablaFt(fila: (typeof TABLA_D151)[number], mortero: MorteroFt, clase: ClaseMortero): number {
  const col = mortero === 'cemento-cal' ? fila.cementoCal : fila.cementoMamposteria;
  return col[clase];
}

/**
 * Ft de la Tabla D-1.5-1 (D-71, PDF p.636). Con `fraccionRelleno` y unidades de perforación vertical, perpendicular a las
 * juntas horizontales, interpola linealmente entre las filas «sin rellenar» y «rellenas» (nota 1 de la tabla).
 * Los valores se toman directamente de las columnas de la tabla (ver `REDUCCION_TEXTO_CEMENTO_MAMPOSTERIA` en los datos).
 */
export function ftAdmisible(e: EntradaFt): number {
  const buscar = (u: UnidadFt) => {
    const fila = TABLA_D151.find((f) => f.direccion === e.direccion && f.unidad === u);
    if (!fila) throw new Error(`Fila no encontrada en la Tabla D-1.5-1: ${e.direccion} / ${u}`);
    return valorTablaFt(fila, e.mortero, e.clase);
  };
  if (e.fraccionRelleno !== undefined && e.direccion === 'perpendicular-junta-horizontal' && e.unidad !== 'maciza') {
    const x = Math.min(1, Math.max(0, e.fraccionRelleno));
    const vacio = buscar('perforacion-vertical-sin-rellenar');
    const lleno = buscar('perforacion-vertical-rellena');
    return vacio + x * (lleno - vacio);
  }
  return buscar(e.unidad);
}

/* ================================================================== */
/* D-1.5.5 — Esfuerzos combinados                                      */
/* ================================================================== */

/** Razón fa/Fa + fb/Fb (Ec. D-1.5-7, D-72); debe ser ≤ 1.0. */
export function razonCombinada(fa: number, Fa: number, fb: number, Fb: number): { razon: number; cumple: boolean } {
  const razon = fa / Fa + fb / Fb;
  return { razon, cumple: razon <= COMBINADO_MAX };
}

/* ================================================================== */
/* D-1.5.6 a D-1.5.9 — Cortante                                        */
/* ================================================================== */

/** fv = V / (b j d) (Ecs. D-1.5-8 y D-1.5-11, D-72). V en N; b y d en mm; j = 0.8 por defecto. Con T o I, b = bw. */
export function esfuerzoCortanteSolicitado(V: number, b: number, d: number, j: number = J_POR_DEFECTO): number {
  return V / (b * j * d);
}

/** Fv admisible en vigas (D-1.5.6): sin refuerzo √f′m/12 ≤ 0.35 (D-1.5-9); con refuerzo que toma todo √f′m/4 ≤ 1.1 MPa (D-1.5-10). */
export function fvVigaAdmisible(fm: number, conRefuerzo: boolean): { Fv: number; sinTope: number; topeActivo: boolean; ecuacion: string } {
  const c = conRefuerzo ? FV_VIGA_CON_REFUERZO : FV_VIGA_SIN_REFUERZO;
  const sinTope = Math.sqrt(fm) / c.divisor;
  return { Fv: Math.min(sinTope, c.maxMpa), sinTope, topeActivo: sinTope > c.maxMpa, ecuacion: conRefuerzo ? 'D-1.5-10' : 'D-1.5-9' };
}

/**
 * Fv admisible de muros no reforzados = √f′m/40 ≤ 0.56 MPa (Ec. D-1.5-12, D-72), «incrementado en 0.2 fam» con fam el
 * esfuerzo de compresión por carga muerta sola. El incremento se suma al valor ya topado (interpretación del proyecto: el
 * texto no aclara si el tope de 0.56 MPa aplica antes o después del incremento).
 */
export function fvMuroNoReforzado(fm: number, fam = 0): { Fv: number; base: number; incremento: number; topeActivo: boolean } {
  const sinTope = Math.sqrt(fm) / FV_MURO_NO_REFORZADO.divisor;
  const base = Math.min(sinTope, FV_MURO_NO_REFORZADO.maxMpa);
  const incremento = FV_MURO_NO_REFORZADO.incrementoFam * fam;
  return { Fv: base + incremento, base, incremento, topeActivo: sinTope > FV_MURO_NO_REFORZADO.maxMpa };
}

export type QuienTomaCortante = 'mamposteria' | 'refuerzo';

export interface ResultadoFvMuro {
  Fv: number;
  /** Primer término (la ecuación con √f′m), MPa. */
  sinTope: number;
  /** Tope aplicable, MPa. */
  tope: number;
  topeActivo: boolean;
  ecuacion: string;
  rama: 'M/Vd < 1' | 'M/Vd ≥ 1';
}

/**
 * Fv admisible de muros reforzados (D-1.5.7 b, D-73, PDF p.638).
 * La mampostería toma todo el cortante: M/Vd < 1 → (4 − M/Vd) √f′m/40 ≤ 0.6 − 0.3 M/Vd (D-1.5-13); M/Vd ≥ 1 → √f′m/12 ≤ 0.25 (D-1.5-14).
 * El refuerzo toma todo el cortante: M/Vd < 1 → (4 − M/Vd) √f′m/24 ≤ 0.84 − 0.3 M/Vd (D-1.5-15); M/Vd ≥ 1 → √f′m/8 ≤ 0.52 (D-1.5-16).
 * Se toma M/Vd en valor absoluto (autoría del proyecto: la norma no discute el signo).
 */
export function fvMuroReforzado(fm: number, MVd: number, quien: QuienTomaCortante): ResultadoFvMuro {
  const r = Math.abs(MVd);
  const grupo = FV_MURO_REFORZADO[quien];
  if (r < MVD_UMBRAL) {
    const sinTope = (grupo.bajo.coefMvd - r) * (Math.sqrt(fm) / grupo.bajo.divisor);
    const tope = grupo.bajo.c0 - grupo.bajo.c1 * r;
    return {
      Fv: Math.min(sinTope, tope),
      sinTope,
      tope,
      topeActivo: sinTope > tope,
      ecuacion: quien === 'mamposteria' ? 'D-1.5-13' : 'D-1.5-15',
      rama: 'M/Vd < 1',
    };
  }
  const sinTope = Math.sqrt(fm) / grupo.alto.divisor;
  return {
    Fv: Math.min(sinTope, grupo.alto.maxMpa),
    sinTope,
    tope: grupo.alto.maxMpa,
    topeActivo: sinTope > grupo.alto.maxMpa,
    ecuacion: quien === 'mamposteria' ? 'D-1.5-14' : 'D-1.5-16',
    rama: 'M/Vd ≥ 1',
  };
}

/** Av = fv bw s / Fs (Ec. D-1.5-17, D-73), en mm². fv y Fs en MPa; bw y s en mm. */
export function refuerzoCortante(fv: number, bw: number, s: number, Fs: number): number {
  return (fv * bw * s) / Fs;
}

/** Separación máxima del refuerzo de cortante: mín(1200 mm, d/2) (D-1.5.8 y D-1.5.8.1, D-73). */
export function separacionMaximaCortante(d: number): number {
  return Math.min(S_MAX_MM, S_MAX_FRACCION_D * d);
}

/* ================================================================== */
/* Evaluación conjunta                                                 */
/* ================================================================== */

export type ElementoD1 = 'muro-reforzado' | 'muro-no-reforzado' | 'columna-reforzada' | 'columna-no-reforzada' | 'viga';

export interface Actuantes {
  /** Fuerza axial de compresión de servicio, N (fa = P / Ae). Alternativa a `fa`. */
  P?: number;
  /** Esfuerzo axial actuante, MPa (si se da, tiene prioridad sobre P). */
  fa?: number;
  /** Esfuerzo de compresión por flexión, MPa. */
  fb?: number;
  /** Esfuerzo de tracción por flexión en la mampostería, MPa (solo mampostería no reforzada). */
  ft?: number;
  /** Cortante de servicio, N (fv = V/(bjd)). Alternativa a `fv`. */
  V?: number;
  /** Esfuerzo cortante actuante, MPa (si se da, tiene prioridad sobre V). */
  fv?: number;
  /** Esfuerzo actuante en el acero a tracción, MPa. */
  fsTraccion?: number;
  /** Esfuerzo actuante en el acero a compresión, MPa. */
  fsCompresion?: number;
}

export interface EntradaEvaluacion {
  elemento: ElementoD1;
  /** f′m, MPa. */
  fm: number;
  /** Altura efectiva h′ y espesor efectivo t, mm (D.5.4.2 y D.5.4.3). Obligatorios para muros y columnas. */
  hPrime?: number;
  t?: number;
  /** Área efectiva Ae, mm² (D.5.4.1); y refuerzo longitudinal Ast, mm² (columnas reforzadas). */
  Ae?: number;
  Ast?: number;
  fy?: number;
  tipoAcero?: TipoAcero;
  /** Tracción por flexión de mampostería no reforzada. */
  traccion?: EntradaFt;
  /** Datos de cortante. */
  cortante?: {
    /** Ancho (o bw) y altura efectiva d de la sección, mm; j (por defecto 0.8). */
    b?: number;
    d?: number;
    j?: number;
    /** Vigas: ¿el refuerzo toma todo el cortante? Muros reforzados: quién toma el cortante. */
    conRefuerzo?: boolean;
    quien?: QuienTomaCortante;
    /** M/(Vd) para muros reforzados. */
    MVd?: number;
    /** Esfuerzo de compresión por carga muerta sola, MPa (incremento de muros no reforzados). */
    fam?: number;
  };
  /**
   * Factor opcional que multiplica los esfuerzos admisibles (D-1.3.4 permite incrementarlos para cargas transitorias «según B.2.3.4»,
   * numeral que no existe en el Título B de este documento). Por defecto 1.0 (sin incremento); autoría del proyecto.
   */
  incremento?: number;
  actuantes?: Actuantes;
}

export type ClaveVerificacion = 'axial' | 'flexion' | 'traccion' | 'combinada' | 'cortante' | 'acero-traccion' | 'acero-compresion';

export interface Verificacion {
  clave: ClaveVerificacion;
  etiqueta: string;
  /** Ecuación o tabla de la norma de donde sale el admisible. */
  ecuacion: string;
  /** Esfuerzo admisible, MPa (para la combinada es 1.0). */
  admisible: number | null;
  /** Esfuerzo actuante, MPa (para la combinada es fa/Fa + fb/Fb). */
  actuante: number | null;
  /** actuante / admisible. */
  razon: number | null;
  /** true/false si hay actuante y admisible; null si falta alguno. */
  cumple: boolean | null;
  nota?: string;
}

export interface ResultadoEvaluacion {
  elemento: ElementoD1;
  esbeltez: number | null;
  esbeltezMax: number;
  /** false si es un muro y h′/t > 25 (D.5.4.3.1; D-1.4.1 exige cumplir D.5.4). */
  esbeltezAdmisible: boolean | null;
  Re: number | null;
  Pa: number | null;
  /** Fs de compresión usado dentro de Pa (columnas reforzadas), MPa. */
  FsColumna: number | null;
  fa: number | null;
  fv: number | null;
  verificaciones: Verificacion[];
  /** true si todas las verificaciones con datos cumplen; null si no hay ninguna con datos. */
  cumpleTodo: boolean | null;
}

function fila(
  clave: ClaveVerificacion,
  etiqueta: string,
  ecuacion: string,
  admisible: number | null,
  actuante: number | undefined | null,
  nota?: string,
): Verificacion {
  const tieneAct = actuante !== undefined && actuante !== null && Number.isFinite(actuante);
  const razon = tieneAct && admisible !== null && admisible > 0 ? (actuante as number) / admisible : null;
  return {
    clave,
    etiqueta,
    ecuacion,
    admisible,
    actuante: tieneAct ? (actuante as number) : null,
    razon,
    cumple: razon === null ? null : razon <= 1,
    nota,
  };
}

/**
 * Calcula todos los esfuerzos admisibles del Apéndice D-1 aplicables al elemento y, si se dan esfuerzos actuantes (o las
 * cargas de servicio para obtenerlos), verifica cumple / no cumple. No analiza la sección: los esfuerzos de flexión
 * (fb, ft, fs) los suministra el usuario con su propio análisis elástico (D-1.2.2).
 */
export function evaluarEsfuerzos(e: EntradaEvaluacion): ResultadoEvaluacion {
  const k = e.incremento !== undefined && Number.isFinite(e.incremento) && e.incremento > 0 ? e.incremento : 1;
  const act = e.actuantes ?? {};
  const esMuro = e.elemento === 'muro-reforzado' || e.elemento === 'muro-no-reforzado';
  const esColumna = e.elemento === 'columna-reforzada' || e.elemento === 'columna-no-reforzada';
  const reforzado = e.elemento === 'muro-reforzado' || e.elemento === 'columna-reforzada' || e.elemento === 'viga';
  const verificaciones: Verificacion[] = [];
  const nota = k !== 1 ? `Admisible multiplicado por el factor de incremento ${k}.` : undefined;

  let esbeltez: number | null = null;
  let esbeltezAdmisible: boolean | null = null;
  let Re: number | null = null;
  let Pa: number | null = null;
  let FsColumna: number | null = null;
  let Fa: number | null = null;
  let fa: number | null = null;

  // --- D-1.5.2 compresión axial
  if (esMuro || esColumna) {
    if (e.hPrime === undefined || e.t === undefined || e.Ae === undefined) throw new Error('Se requieren hPrime, t y Ae para muros y columnas.');
    esbeltez = e.hPrime / e.t;
    Re = reEsbeltez(e.hPrime, e.t);
    if (esMuro) esbeltezAdmisible = esbeltez <= ESBELTEZ_MAXIMA_MURO;
    let ecuacion: string;
    if (e.elemento === 'columna-reforzada') {
      const Ast = e.Ast ?? 0;
      FsColumna = esfuerzoAdmisibleAcero('columna-compresion', e.fy ?? 0).Fs;
      const r = faColumnaReforzada({ fm: e.fm, Ae: e.Ae, Ast, Fs: FsColumna, Re });
      Pa = r.Pa;
      Fa = r.Fa;
      ecuacion = 'D-1.5-3 y D-1.5-4';
    } else {
      Fa = e.elemento === 'muro-no-reforzado' || e.elemento === 'muro-reforzado' ? faMuro(e.fm, Re) : faColumnaNoReforzada(e.fm, Re);
      ecuacion = esMuro ? 'D-1.5-1' : 'D-1.5-2';
    }
    Fa *= k;
    fa = act.fa !== undefined ? act.fa : act.P !== undefined ? act.P / e.Ae : null;
    verificaciones.push(fila('axial', 'Compresión axial fa ≤ Fa', ecuacion, Fa, fa, nota));
  }

  // --- D-1.5.3 compresión por flexión
  const Fb = fbAdmisible(e.fm).Fb * k;
  verificaciones.push(fila('flexion', 'Compresión por flexión fb ≤ Fb', 'D-1.5-6', Fb, act.fb, nota));

  // --- D-1.5.4 tracción por flexión (solo no reforzada)
  if (!reforzado && e.traccion) {
    const Ft = ftAdmisible(e.traccion) * k;
    verificaciones.push(fila('traccion', 'Tracción por flexión ft ≤ Ft', 'Tabla D-1.5-1', Ft, act.ft, nota));
  }

  // --- D-1.5.5 combinada
  if ((esMuro || esColumna) && Fa !== null && Fa > 0 && Fb > 0) {
    const hay = fa !== null && act.fb !== undefined && Number.isFinite(act.fb) && Number.isFinite(fa);
    const razon = hay ? (fa as number) / Fa + (act.fb as number) / Fb : null;
    verificaciones.push({
      clave: 'combinada',
      etiqueta: 'Combinada fa/Fa + fb/Fb ≤ 1.0',
      ecuacion: 'D-1.5-7',
      admisible: COMBINADO_MAX,
      actuante: razon,
      razon,
      cumple: razon === null ? null : razon <= COMBINADO_MAX,
      nota,
    });
  }

  // --- D-1.5.6 y D-1.5.7 cortante
  let fv: number | null = null;
  const c = e.cortante;
  if (e.elemento !== 'columna-reforzada' && e.elemento !== 'columna-no-reforzada') {
    let Fv: number | null = null;
    let ecuacion = '';
    let nombre = 'Cortante fv ≤ Fv';
    if (e.elemento === 'viga') {
      const r = fvVigaAdmisible(e.fm, c?.conRefuerzo ?? false);
      Fv = r.Fv;
      ecuacion = r.ecuacion;
    } else if (e.elemento === 'muro-no-reforzado') {
      Fv = fvMuroNoReforzado(e.fm, c?.fam ?? 0).Fv;
      ecuacion = 'D-1.5-12';
    } else {
      const r = fvMuroReforzado(e.fm, c?.MVd ?? 0, c?.quien ?? 'mamposteria');
      Fv = r.Fv;
      ecuacion = r.ecuacion;
      nombre = c?.quien === 'refuerzo' ? 'Cortante fv ≤ Fv (el refuerzo toma todo)' : 'Cortante fv ≤ Fv (la mampostería toma todo)';
    }
    Fv *= k;
    if (act.fv !== undefined) fv = act.fv;
    else if (act.V !== undefined && c?.b && c?.d) fv = esfuerzoCortanteSolicitado(act.V, c.b, c.d, c.j ?? J_POR_DEFECTO);
    verificaciones.push(fila('cortante', nombre, ecuacion, Fv, fv, nota));
  }

  // --- D-1.5.10 acero
  if (reforzado && e.fy !== undefined && e.fy > 0) {
    const tipo = e.tipoAcero ?? 'corrugada';
    const tr = esfuerzoAdmisibleAcero(claveFsTraccion(tipo), e.fy);
    verificaciones.push(fila('acero-traccion', 'Acero a tracción fs ≤ Fs', tr.ecuacion, tr.Fs * k, act.fsTraccion, nota));
    if (e.elemento === 'columna-reforzada') {
      const cc = esfuerzoAdmisibleAcero('columna-compresion', e.fy);
      verificaciones.push(fila('acero-compresion', 'Acero a compresión (columna) fs ≤ Fs', cc.ecuacion, cc.Fs * k, act.fsCompresion, nota));
    } else {
      const clave = claveFsCompresionFlexion(tipo);
      if (clave) {
        const cf = esfuerzoAdmisibleAcero(clave, e.fy);
        verificaciones.push(fila('acero-compresion', 'Acero a compresión (flexión) fs ≤ Fs', cf.ecuacion, cf.Fs * k, act.fsCompresion, 'Solo si el refuerzo vertical lleva refuerzo transversal según D.4.2; si no, se desprecia.'));
      } else {
        verificaciones.push(fila('acero-compresion', 'Acero a compresión (flexión) fs ≤ Fs', 'D-1.5.10 b', null, act.fsCompresion, 'La norma no da Fs de compresión en flexión para alambres.'));
      }
    }
  }

  const conDatos = verificaciones.filter((v) => v.cumple !== null);
  const cumpleTodo = conDatos.length === 0 ? null : conDatos.every((v) => v.cumple === true) && esbeltezAdmisible !== false;

  return { elemento: e.elemento, esbeltez, esbeltezMax: ESBELTEZ_MAXIMA_MURO, esbeltezAdmisible, Re, Pa, FsColumna, fa, fv, verificaciones, cumpleTodo };
}
