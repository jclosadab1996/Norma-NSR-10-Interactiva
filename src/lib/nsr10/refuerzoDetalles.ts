/**
 * Capítulo C.7 — Detalles del refuerzo. Lógica pura (sin React) compartida por el capítulo MDX y la calculadora.
 * Datos transcritos en `src/data/refuerzoDetalles.ts`. Página PDF = página impresa "C-n" + 302.
 *
 * Todo lo que es texto de la norma lleva su sección; lo que es cálculo geométrico propio (longitud desarrollada del
 * gancho, altura útil aproximada, diámetro equivalente del paquete) está marcado como "criterio propio".
 */
import {
  COLUMNA_CAMBIO_SECCION,
  DOBLADO_MALLA,
  ESPIRAL,
  ESTRIBOS_COLUMNA,
  EQ_MAX_ESTRIBO_4DB,
  FACTOR_DOBLADO_ESTRIBO_PEQUENO,
  FRACCION_TOL_RECUBRIMIENTO,
  GANCHOS,
  INTEGRIDAD,
  RECUBRIMIENTO_PAQUETE,
  RETRACCION_TEMPERATURA,
  SEPARACION,
  TABLA_C72_DOBLADO,
  TOLERANCIAS_COLOCACION,
  TOLERANCIA_FONDO_CIMBRA_MM,
  TRASLAPO_ESPIRAL,
  type AmbienteRecubrimiento,
  type BarraRefuerzo,
  type TipoGancho,
} from '../../data/refuerzoDetalles';

// ---------------------------------------------------------------------------------------------
// C.7.2 — Diámetros mínimos de doblado
// ---------------------------------------------------------------------------------------------

export interface DobladoMinimo {
  /** Factor sobre db, o null si la norma no cubre este tamaño. */
  factor: number | null;
  /** Diámetro interior mínimo de doblado (mm), o null. */
  mm: number | null;
  seccion: string;
  nota?: string;
}

/**
 * Diámetro interior mínimo de doblado.
 * - Barras (y estribos mayores que No. 5/16M): Tabla C.7.2 → 6db, 8db o 10db según el tamaño (PDF p.353, C-51).
 * - Estribos No. 5 (16M) y menores: 4db (C.7.2.2).
 * La Tabla C.7.2 empieza en No. 3 (10M): para barras menores (No. 2, 6M, 8M) no hay valor en la norma → null.
 */
export function diametroMinimoDoblado(barra: BarraRefuerzo, esEstribo = false): DobladoMinimo {
  if (esEstribo && barra.eq <= EQ_MAX_ESTRIBO_4DB) {
    return { factor: FACTOR_DOBLADO_ESTRIBO_PEQUENO, mm: FACTOR_DOBLADO_ESTRIBO_PEQUENO * barra.db, seccion: 'C.7.2.2' };
  }
  const fila = TABLA_C72_DOBLADO.find((f) => barra.eq >= f.eqMin && barra.eq <= f.eqMax);
  if (!fila) {
    return {
      factor: null,
      mm: null,
      seccion: 'Tabla C.7.2',
      nota: 'La Tabla C.7.2 empieza en No. 3 (10M): no da diámetro de doblado para esta barra.',
    };
  }
  return {
    factor: fila.factor,
    mm: fila.factor * barra.db,
    seccion: esEstribo ? 'C.7.2.2 y Tabla C.7.2' : 'Tabla C.7.2',
    nota: barra.sinEquivalente ? 'La designación no tiene equivalente directo en C.7: se clasificó por diámetro (criterio propio).' : undefined,
  };
}

/** C.7.2.3: diámetro interior de doblado de estribos de refuerzo electrosoldado (4db si es corrugado mayor de MD40, 2db en los demás). */
export function diametroDobladoMalla(dbMm: number, corrugado: boolean): number {
  return (corrugado && dbMm > DOBLADO_MALLA.umbralMD40Mm ? DOBLADO_MALLA.corrugadoMayorMD40 : DOBLADO_MALLA.otros) * dbMm;
}

// ---------------------------------------------------------------------------------------------
// C.7.1 — Ganchos estándar
// ---------------------------------------------------------------------------------------------

/**
 * Extensión del gancho de estribo de 90° (C.7.1.3): 6db para No. 5 (16M) y menores; 12db para No. 6 (20M), No. 7 (22M) y No. 8 (25M).
 * Para tamaños mayores que No. 8 la norma no define gancho de estribo → null. 18M queda entre 16M y 20M: se usa el
 * valor más exigente (12db) y se marca `ambiguo` (criterio propio).
 */
export function extensionEstribo90(barra: BarraRefuerzo): { factor: number; ambiguo: boolean } | null {
  if (barra.eq <= 5) return { factor: 6, ambiguo: false };
  if (barra.eq < 6) return { factor: 12, ambiguo: true };
  if (barra.eq <= 8) return { factor: 12, ambiguo: false };
  return null;
}

export interface GanchoResultado {
  tipo: TipoGancho;
  seccion: string;
  descripcion: string;
  /** false si la norma no define ese gancho para este tamaño de barra. */
  valido: boolean;
  angulo: number;
  /** Extensión en múltiplos de db. */
  extensionFactor: number;
  /** Extensión mínima por factor (mm) y extensión de diseño = máx(factor·db, mínimo absoluto). */
  extensionMm: number;
  minimoAbsolutoMm?: number;
  /** Diámetro interior de doblado mínimo (mm) o null si la norma no lo da para ese tamaño. */
  diametroDobladoMm: number | null;
  /** Radio interior = D/2. */
  radioInteriorMm: number | null;
  /**
   * Longitud desarrollada del gancho medida sobre el eje de la barra desde donde empieza la curva hasta el extremo:
   * π(D + db)/2 · θ/180 + extensión. CRITERIO PROPIO (geometría), útil para despieces; no es una ecuación de la norma.
   */
  longitudDesarrolladaMm: number | null;
  advertencias: string[];
}

/** Dimensiones del gancho `tipo` para la barra dada, con el diámetro mínimo de doblado de C.7.2. */
export function ganchoEstandar(tipo: TipoGancho, barra: BarraRefuerzo): GanchoResultado {
  const def = GANCHOS.find((g) => g.id === tipo);
  if (!def) throw new RangeError(`Tipo de gancho desconocido: ${tipo}`);
  const adv: string[] = [];
  let valido = true;
  let factor = def.extensionDb;

  if (tipo === 'estribo-90') {
    const e = extensionEstribo90(barra);
    if (!e) {
      valido = false;
      adv.push('C.7.1.3 define el gancho de estribo de 90° solo hasta No. 8 (25M).');
    } else {
      factor = e.factor;
      if (e.ambiguo) adv.push('18M queda entre 16M (6db) y 20M (12db): se aplicó 12db por prudencia (criterio propio).');
    }
  }
  if (tipo === 'estribo-135' && barra.eq > 8) {
    valido = false;
    adv.push('C.7.1.3(c) define el gancho de 135° solo para No. 8 (25M) y menores.');
  }
  if (barra.sinEquivalente) adv.push('Esta designación (8M o 18M) no tiene equivalente directo en C.7: se clasificó por diámetro.');

  const extensionMm = Math.max(factor * barra.db, def.minimoMm ?? 0);
  const dob = diametroMinimoDoblado(barra, def.esEstribo);
  if (dob.nota && dob.mm === null) adv.push(dob.nota);
  const D = dob.mm;
  const longitud = D === null ? null : (Math.PI * (D + barra.db) * def.angulo) / 360 + extensionMm;

  return {
    tipo,
    seccion: def.seccion,
    descripcion: def.descripcion,
    valido,
    angulo: def.angulo,
    extensionFactor: factor,
    extensionMm,
    minimoAbsolutoMm: def.minimoMm,
    diametroDobladoMm: D,
    radioInteriorMm: D === null ? null : D / 2,
    longitudDesarrolladaMm: longitud,
    advertencias: adv,
  };
}

// ---------------------------------------------------------------------------------------------
// C.7.5.2 — Tolerancias de colocación
// ---------------------------------------------------------------------------------------------

export interface ToleranciaColocacion {
  /** Tolerancia en d (± mm). */
  tolD: number;
  /** Tolerancia hacia menos del recubrimiento (mm, positivo = cuánto se puede perder). */
  tolRecubrimiento: number;
  /** Recubrimiento mínimo aceptable en obra = especificado − tolerancia. */
  recubrimientoMinimoObra: number;
}

/**
 * C.7.5.2.1: ±10 mm si d ≤ 200 mm, ±13 mm si d > 200 mm; el recubrimiento tolera −10/−13 mm, pero no más de 1/3 del recubrimiento
 * especificado, y −6 mm para la distancia libre al fondo de las cimbras.
 */
export function toleranciaColocacion(d: number, recubrimientoEspecificado: number, fondoCimbra = false): ToleranciaColocacion {
  const fila = TOLERANCIAS_COLOCACION.find((f) => f.dMax === null || d <= f.dMax)!;
  let tolRec = Math.min(fila.tolRecubrimiento, recubrimientoEspecificado * FRACCION_TOL_RECUBRIMIENTO);
  if (fondoCimbra) tolRec = Math.min(tolRec, TOLERANCIA_FONDO_CIMBRA_MM);
  return { tolD: fila.tolD, tolRecubrimiento: tolRec, recubrimientoMinimoObra: recubrimientoEspecificado - tolRec };
}

// ---------------------------------------------------------------------------------------------
// C.7.6 — Separación del refuerzo
// ---------------------------------------------------------------------------------------------

export type TipoElementoSeparacion = 'flexion' | 'compresion';

/**
 * Distancia libre mínima entre barras paralelas de una capa:
 * flexión (C.7.6.1): db, pero no menor de 25 mm; compresión con estribos o espirales (C.7.6.3): 1.5db, no menor de 40 mm.
 */
export function separacionLibreMinima(db: number, tipo: TipoElementoSeparacion = 'flexion'): number {
  return tipo === 'flexion'
    ? Math.max(db, SEPARACION.libreMinimaCapaMm)
    : Math.max(SEPARACION.compresionFactorDb * db, SEPARACION.compresionMinimaMm);
}

/** C.7.6.6.5: un paquete se trata como una barra de diámetro equivalente con la misma área total: de = db·√n (derivación propia). */
export function diametroEquivalentePaquete(db: number, n: number): number {
  return db * Math.sqrt(n);
}

/** C.7.7.4: recubrimiento mínimo de un paquete = diámetro equivalente, sin necesidad de exceder 50 mm (75 mm contra el suelo). */
export function recubrimientoPaquete(db: number, n: number, contraSuelo = false): number {
  if (contraSuelo) return RECUBRIMIENTO_PAQUETE.contraSueloMm;
  return Math.min(diametroEquivalentePaquete(db, n), RECUBRIMIENTO_PAQUETE.maximoExigidoMm);
}

export interface EntradaCapa {
  /** Ancho del elemento (mm). */
  b: number;
  /** Recubrimiento especificado, medido hasta la cara exterior del estribo (mm). */
  recubrimiento: number;
  /** Diámetro del estribo (mm). */
  dEstribo: number;
  /** Número de barras en la capa. */
  n: number;
  /** Diámetro de las barras (mm). */
  db: number;
  tipo?: TipoElementoSeparacion;
  /** Tamaño máximo nominal del agregado (mm), para verificar C.3.3.2(c). */
  tamanoAgregado?: number;
}

export interface VerificacionCapa {
  /** Ancho disponible entre las caras internas de los estribos (mm). */
  anchoInterior: number;
  /** Distancia libre entre barras adyacentes (mm); null si hay menos de 2 barras. */
  libre: number | null;
  minima: number;
  cumple: boolean;
  /** Número máximo de barras de este diámetro en una capa de ese ancho. */
  nMax: number;
  /** Ancho mínimo del elemento para las n barras. */
  anchoMinimo: number;
  /** C.3.3.2(c): tamaño máximo del agregado ≤ 3/4 del espaciamiento libre. */
  agregadoMaximoPermitido: number | null;
  agregadoCumple: boolean | null;
}

/** Ancho interior disponible para barras = b − 2·recubrimiento − 2·dEstribo. */
export function anchoInterior(b: number, recubrimiento: number, dEstribo: number): number {
  return b - 2 * recubrimiento - 2 * dEstribo;
}

/**
 * Verificación de una capa de refuerzo (C.7.6.1 / C.7.6.3). La distancia libre es
 * s = (b − 2·rec − 2·de − n·db) / (n − 1), con el recubrimiento hasta el estribo (definición de C.2). Esta fórmula es
 * geometría propia; los límites son los de la norma.
 */
export function verificarCapa(e: EntradaCapa): VerificacionCapa {
  const tipo = e.tipo ?? 'flexion';
  const minima = separacionLibreMinima(e.db, tipo);
  const interior = anchoInterior(e.b, e.recubrimiento, e.dEstribo);
  const libre = e.n >= 2 ? (interior - e.n * e.db) / (e.n - 1) : null;
  const nMax = Math.max(0, Math.floor((interior + minima) / (e.db + minima)));
  const anchoMinimo = 2 * e.recubrimiento + 2 * e.dEstribo + e.n * e.db + Math.max(0, e.n - 1) * minima;
  const cumple = libre === null ? interior >= e.db : libre >= minima - 1e-9;
  let agregadoMaximoPermitido: number | null = null;
  let agregadoCumple: boolean | null = null;
  if (libre !== null) {
    agregadoMaximoPermitido = 0.75 * libre;
    if (e.tamanoAgregado !== undefined) agregadoCumple = e.tamanoAgregado <= agregadoMaximoPermitido + 1e-9;
  }
  return { anchoInterior: interior, libre, minima, cumple, nMax, anchoMinimo, agregadoMaximoPermitido, agregadoCumple };
}

/** C.7.6.5: separación máxima del refuerzo principal de flexión en muros y losas (no nervadas): 3h y 450 mm. */
export function separacionMaximaFlexionLosa(h: number): number {
  return Math.min(SEPARACION.murosLosasFactorH * h, SEPARACION.murosLosasMaximaMm);
}

/**
 * C.7.6.5: en secciones críticas de losas en dos direcciones no debe exceder 2h. La norma no repite el límite de 450 mm en
 * esa excepción; aquí se conserva (criterio propio, más conservador).
 */
export function separacionMaximaLosaDosDireccionesCritica(h: number): number {
  return Math.min(SEPARACION.losasDosDireccionesFactorH * h, SEPARACION.murosLosasMaximaMm);
}

/** C.7.6.5 y C.7.12.2.2: refuerzo de temperatura en losas: 5h y 450 mm. */
export function separacionMaximaTemperatura(h: number): number {
  return Math.min(SEPARACION.temperaturaFactorH * h, SEPARACION.temperaturaMaximaMm);
}

/** C.7.6.6.1 a C.7.6.6.3: ¿es válido un paquete de n barras de la barra dada en una viga (o en otro elemento)? */
export function paqueteValido(n: number, barra: BarraRefuerzo, enViga: boolean): { valido: boolean; motivos: string[] } {
  const motivos: string[] = [];
  if (n < 2) motivos.push('Un paquete tiene al menos 2 barras.');
  if (n > SEPARACION.paqueteMaxBarras) motivos.push('C.7.6.6.1: máximo 4 barras por paquete.');
  if (enViga && barra.eq > SEPARACION.paqueteNoEnVigasMayorQueEq) motivos.push('C.7.6.6.3: en vigas no se agrupan barras mayores que No. 11 (36M).');
  return { valido: motivos.length === 0, motivos };
}

// ---------------------------------------------------------------------------------------------
// C.7.7 — Recubrimientos
// ---------------------------------------------------------------------------------------------

export type ElementoSitio = 'losa-muro-vigueta' | 'viga-columna' | 'cascara';

export interface ResultadoRecubrimiento {
  mm: number;
  norma: string;
  /** Texto de la fila de la tabla que aplica. */
  fila: string;
  nota?: string;
}

/**
 * C.7.7.1 — Recubrimiento mínimo de concreto construido en sitio, no preesforzado (PDF p.356, C-54).
 * La clasificación por tamaño sigue la tabla ("No. 6 y mayores" / "No. 5 y menores", etc.).
 */
export function recubrimientoMinimo(ambiente: AmbienteRecubrimiento, elemento: ElementoSitio, barra: BarraRefuerzo): ResultadoRecubrimiento {
  const nota = barra.sinEquivalente ? 'Designación 8M/18M sin equivalente directo en C.7: se clasificó por diámetro (criterio propio).' : undefined;
  if (ambiente === 'suelo') {
    return { mm: 75, norma: 'C.7.7.1(a)', fila: 'Concreto colocado contra el suelo y expuesto permanentemente a él', nota };
  }
  if (ambiente === 'intemperie') {
    return barra.eq > 5
      ? { mm: 50, norma: 'C.7.7.1(b)', fila: 'Expuesto a suelo o intemperie: barras No. 6 (20M) a No. 18 (55M)', nota }
      : { mm: 40, norma: 'C.7.7.1(b)', fila: 'Expuesto a suelo o intemperie: barras No. 5 (16M) y menores', nota };
  }
  if (elemento === 'viga-columna') {
    return { mm: 40, norma: 'C.7.7.1(c)', fila: 'Vigas y columnas no expuestas: armadura principal, estribos y espirales', nota };
  }
  if (elemento === 'losa-muro-vigueta') {
    return barra.eq >= 14
      ? { mm: 40, norma: 'C.7.7.1(c)', fila: 'Losas, muros y viguetas no expuestos: barras No. 14 (45M) y No. 18 (55M)', nota }
      : { mm: 20, norma: 'C.7.7.1(c)', fila: 'Losas, muros y viguetas no expuestos: barras No. 11 (36M) y menores', nota };
  }
  return barra.eq > 5
    ? { mm: 20, norma: 'C.7.7.1(c)', fila: 'Cáscaras y placas plegadas: barra No. 6 (20M) y mayores', nota }
    : { mm: 13, norma: 'C.7.7.1(c)', fila: 'Cáscaras y placas plegadas: barras No. 5 (16M) y menores', nota };
}

export type ElementoPreesforzado = 'losa-muro-vigueta' | 'viga-columna' | 'cascara' | 'otros';

/**
 * C.7.7.2 — Recubrimiento mínimo de concreto construido en sitio preesforzado (PDF p.356, C-54).
 * `refuerzo`: 'principal' o 'estribos' (solo se distingue en vigas y columnas interiores).
 */
export function recubrimientoPreesforzadoSitio(
  ambiente: AmbienteRecubrimiento,
  elemento: ElementoPreesforzado,
  refuerzo: 'principal' | 'estribos',
  barra?: BarraRefuerzo,
): ResultadoRecubrimiento {
  if (ambiente === 'suelo') return { mm: 75, norma: 'C.7.7.2(a)', fila: 'Concreto colocado contra el suelo y expuesto permanentemente a él' };
  if (ambiente === 'intemperie') {
    return elemento === 'losa-muro-vigueta'
      ? { mm: 25, norma: 'C.7.7.2(b)', fila: 'Paneles de muros, losas, viguetas' }
      : { mm: 40, norma: 'C.7.7.2(b)', fila: 'Otros elementos' };
  }
  if (elemento === 'losa-muro-vigueta') return { mm: 20, norma: 'C.7.7.2(c)', fila: 'Losas, muros, viguetas' };
  if (elemento === 'viga-columna') {
    return refuerzo === 'principal'
      ? { mm: 40, norma: 'C.7.7.2(c)', fila: 'Vigas y columnas: refuerzo principal' }
      : { mm: 25, norma: 'C.7.7.2(c)', fila: 'Vigas y columnas: estribos y espirales' };
  }
  // Cáscaras y losas plegadas (y "otros" interiores, que la tabla no distingue): ver nota.
  if (barra && barra.eq <= 5) return { mm: 10, norma: 'C.7.7.2(c)', fila: 'Cáscaras y losas plegadas: barra No. 5 (16M) y menores' };
  return { mm: Math.max(barra?.db ?? 0, 20), norma: 'C.7.7.2(c)', fila: 'Cáscaras y losas plegadas: otros refuerzos, db pero no menos de 20 mm' };
}

/** C.7.7.6.1: elementos preesforzados Clase T o C en ambientes corrosivos: 1.5 veces el recubrimiento de C.7.7.2 ó C.7.7.3. */
export function recubrimientoPreesforzadoCorrosivo(recubrimientoBase: number): number {
  return 1.5 * recubrimientoBase;
}

/** Altura útil aproximada de una viga con una capa de refuerzo: d = h − recubrimiento − de − db/2 (criterio propio). */
export function alturaUtilAproximada(h: number, recubrimiento: number, dEstribo: number, db: number): number {
  return h - recubrimiento - dEstribo - db / 2;
}

// ---------------------------------------------------------------------------------------------
// C.7.10 — Espirales y estribos de columnas
// ---------------------------------------------------------------------------------------------

/** C.7.10.4.5(a): longitud mínima de traslapo de la espiral = máx(300 mm, factor·db). `id` es el numeral (1) a (5). */
export function longitudTraslapoEspiral(id: '1' | '2' | '3' | '4' | '5', db: number): number {
  const fila = TRASLAPO_ESPIRAL.find((f) => f.id === id)!;
  return Math.max(ESPIRAL.traslapoMinimoMm, fila.factorDb * db);
}

/** C.7.10.4.3: el espaciamiento libre entre hélices debe estar entre 25 y 75 mm. */
export function pasoEspiralValido(libreMm: number): boolean {
  return libreMm >= ESPIRAL.libreMinimoMm && libreMm <= ESPIRAL.libreMaximoMm;
}

/**
 * C.7.10.5.1: número de barra equivalente mínimo del estribo de columna: No. 3 (10M) para barras longitudinales No. 10 (32M) o menores;
 * No. 4 (12M) para No. 11 (36M), No. 14, No. 18 y paquetes. En DMI con columnas de uno o dos pisos se permite No. 2 (6M).
 */
export function estriboMinimoColumna(barraLongitudinal: BarraRefuerzo, esPaquete = false, dmiUnoDosPisos = false): { eqMinimo: number; nota?: string } {
  if (dmiUnoDosPisos) return { eqMinimo: ESTRIBOS_COLUMNA.estriboMinimoDMIEq, nota: 'DMI con columnas de uno o dos pisos: se permiten estribos No. 2 (6M).' };
  const eq =
    !esPaquete && barraLongitudinal.eq <= 10
      ? ESTRIBOS_COLUMNA.diametroMinimoEq.longitudinalHastaNo10
      : ESTRIBOS_COLUMNA.diametroMinimoEq.longitudinalNo11OMayoresOPaquetes;
  return { eqMinimo: eq };
}

/** C.7.10.5.2: separación vertical máxima de estribos = mín(16 db_long, 48 db_estribo, menor dimensión del elemento). */
export function separacionMaximaEstribos(dbLongitudinal: number, dbEstribo: number, menorDimension: number): { s: number; gobierna: 'longitudinal' | 'estribo' | 'dimension' } {
  const a = ESTRIBOS_COLUMNA.separacionMax.factorDbLongitudinal * dbLongitudinal;
  const b = ESTRIBOS_COLUMNA.separacionMax.factorDbEstribo * dbEstribo;
  const c = menorDimension;
  const s = Math.min(a, b, c);
  return { s, gobierna: s === a ? 'longitudinal' : s === b ? 'estribo' : 'dimension' };
}

/** C.7.8.1.3: soporte horizontal de una barra doblada por cambio de sección = 1.5 × la componente horizontal de la fuerza en el tramo inclinado. */
export function soporteHorizontalBarraDoblada(componenteHorizontal: number): number {
  return COLUMNA_CAMBIO_SECCION.factorSoporteHorizontal * componenteHorizontal;
}

// ---------------------------------------------------------------------------------------------
// C.7.12 — Retracción y temperatura
// ---------------------------------------------------------------------------------------------

export interface CuantiaRetraccion {
  cuantia: number;
  /** Literal de C.7.12.2.1 que aplica. */
  regla: 'a' | 'b' | 'c';
}

/**
 * Cuantía mínima de retracción y temperatura (C.7.12.2.1, PDF p.361, C-59):
 * (a) 0.0020 con barras corrugadas Grado 280 o 350; (b) 0.0018 con Grado 420 o malla electrosoldada;
 * (c) 0.0018·420/fy con fy > 420 MPa; en todos los casos no menos de 0.0014.
 * La norma solo nombra los grados 280, 350 y 420: entre 350 y 420 MPa o por debajo de 280 se lanza RangeError (no cubierto).
 */
export function cuantiaRetraccion(fy: number, tipo: 'barra' | 'malla' = 'barra'): CuantiaRetraccion {
  const R = RETRACCION_TEMPERATURA;
  const min = R.cuantiaMinimaAbsoluta;
  if (fy > R.fyReferenciaMPa) return { cuantia: Math.max(min, (R.cuantiaBaseFyMayor * R.fyReferenciaMPa) / fy), regla: 'c' };
  if (tipo === 'malla') return { cuantia: Math.max(min, R.cuantiaGrado420OMalla), regla: 'b' };
  if (fy === R.fyReferenciaMPa) return { cuantia: Math.max(min, R.cuantiaGrado420OMalla), regla: 'b' };
  if (fy >= 280 && fy <= 350) return { cuantia: Math.max(min, R.cuantiaGrado280o350), regla: 'a' };
  throw new RangeError('C.7.12.2.1 solo da cuantías para barras Grado 280, 350, 420 o fy mayor que 420 MPa.');
}

/** Área de refuerzo de retracción y temperatura por franja de ancho `ancho` (mm; por defecto 1000 mm): As = ρ·b·h (mm²). */
export function areaRetraccion(cuantia: number, h: number, ancho = 1000): number {
  return cuantia * ancho * h;
}

export interface SeparacionRetraccion {
  /** Área requerida por metro de losa (mm²/m). */
  areaPorMetro: number;
  /** Separación que daría el área con la barra elegida (mm). */
  calculada: number;
  /** Límite de C.7.12.2.2: mín(5h, 450 mm). */
  maxima: number;
  /** Separación a especificar: mín(calculada, máxima) redondeada hacia abajo a múltiplos de 5 mm. */
  propuesta: number;
}

/** Separación de barras de retracción y temperatura de área `areaBarra` (mm²) en una losa de espesor h con cuantía ρ. */
export function separacionRetraccion(areaBarra: number, h: number, cuantia: number): SeparacionRetraccion {
  const areaPorMetro = areaRetraccion(cuantia, h);
  const calculada = (areaBarra * 1000) / areaPorMetro;
  const maxima = separacionMaximaTemperatura(h);
  return { areaPorMetro, calculada, maxima, propuesta: Math.floor(Math.min(calculada, maxima) / 5) * 5 };
}

// ---------------------------------------------------------------------------------------------
// C.7.13 — Integridad estructural
// ---------------------------------------------------------------------------------------------

export interface IntegridadPerimetro {
  /** Área continua mínima en la cara superior (≥ 1/6 de As requerido para momento negativo). */
  asNegContinuo: number;
  /** Área continua mínima en la cara inferior (≥ 1/4 de As requerido para momento positivo). */
  asPosContinuo: number;
  barrasMinimas: number;
}

/** C.7.13.2.2: refuerzo continuo de vigas del perímetro: ≥ As⁻/6 y ≥ As⁺/4, en ambos casos no menos de dos barras. */
export function refuerzoIntegridadPerimetro(asNegativo: number, asPositivo: number): IntegridadPerimetro {
  return {
    asNegContinuo: asNegativo * INTEGRIDAD.perimetroNegativoFraccion,
    asPosContinuo: asPositivo * INTEGRIDAD.perimetroPositivoFraccion,
    barrasMinimas: INTEGRIDAD.minimoBarras,
  };
}
