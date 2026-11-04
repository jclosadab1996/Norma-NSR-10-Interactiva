import {
  ALTURA_MAXIMA_METODO_1,
  ANGULO_MAXIMO_COMPONENTES_CUATRO_AGUAS,
  ANGULO_MAXIMO_COMPONENTES_DOS_AGUAS,
  ANGULO_MAXIMO_SPRFV,
  ANGULOS_TABULADOS,
  FACTOR_IMPORTANCIA_VIENTO,
  PNET10,
  PNET10_ALERO,
  PRESION_MINIMA,
  PS10,
  TABLA_LAMBDA,
  VELOCIDADES_BASICAS,
  ZONAS_SPRFV,
  type AnguloTabulado,
  type CategoriaUso,
  type ExposicionViento,
  type GrupoSuperficie,
  type VelocidadBasica,
  type ZonaSprfv,
} from '../../data/vientoSimplificado';

/**
 * NSR-10, B.6.4 — Procedimiento simplificado (Método 1).
 *
 *   ps   = λ·Kzt·I·ps10     (B.6.4-1, SPRFV)
 *   pnet = λ·Kzt·I·pnet10   (B.6.4-2, componentes y revestimientos)
 *
 * Las presiones se expresan en kN/m²; positivas = presión sobre la superficie, negativas = succión.
 */

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------

function indiceVelocidad(v: number): number {
  const i = (VELOCIDADES_BASICAS as readonly number[]).indexOf(v);
  if (i < 0) {
    throw new RangeError(
      `V = ${v} m/s no está tabulada: el Método 1 solo da presiones para ${VELOCIDADES_BASICAS.join(', ')} m/s (regiones 1 a 5 de la Figura B.6.4-1).`,
    );
  }
  return i;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Redondeo a 2 decimales como en las tablas (evita ruido binario al comparar). */
export function redondear(x: number, d = 2): number {
  const f = 10 ** d;
  return Math.round((x + Number.EPSILON) * f) / f;
}

// ---------------------------------------------------------------------------------------------
// Geometría: altura media de cubierta y ancho de zonas de borde
// ---------------------------------------------------------------------------------------------

/**
 * B.6.2 — Altura media de cubierta h: promedio entre la altura de la cornisa (alero) y la del punto más alto
 * de la cubierta. Para θ ≤ 10° es la altura de la cornisa.
 */
export function alturaMediaCubierta(alturaAlero: number, alturaCumbrera: number, theta: number): number {
  if (theta <= 10) return alturaAlero;
  return (alturaAlero + alturaCumbrera) / 2;
}

/**
 * Altura de cumbrera de una cubierta a dos aguas simétrica: he + (B/2)·tan θ, con B el ancho de la luz.
 * (Utilidad geométrica; no es una ecuación de la norma.)
 */
export function alturaCumbreraDosAguas(alturaAlero: number, anchoLuz: number, theta: number): number {
  return alturaAlero + (anchoLuz / 2) * Math.tan((theta * Math.PI) / 180);
}

/**
 * Ancho `a` de las zonas de borde (notas de las Figuras B.6.4-2 y B.6.4-3): 10 % de la menor dimensión horizontal
 * o 0.4h, el menor; sin bajar del 4 % de la menor dimensión horizontal ni de 0.9 m.
 */
export function anchoZonaBorde(menorDimensionHorizontal: number, h: number): number {
  const base = Math.min(0.1 * menorDimensionHorizontal, 0.4 * h);
  return Math.max(base, 0.04 * menorDimensionHorizontal, 0.9);
}

// ---------------------------------------------------------------------------------------------
// Alcance (B.6.4.1)
// ---------------------------------------------------------------------------------------------

export type TipoCubierta = 'plana' | 'dos-aguas' | 'cuatro-aguas';

/**
 * Comprueba los límites geométricos numéricos de B.6.4.1 (altura y ángulo). Devuelve una lista de mensajes;
 * vacía si los datos están dentro del alcance. No verifica las condiciones cualitativas (regularidad,
 * diafragma simple, edificio cerrado, etc.).
 */
export function verificarAlcance(args: {
  uso: 'sprfv' | 'componentes';
  h: number;
  theta: number;
  tipo: TipoCubierta;
}): string[] {
  const { uso, h, theta, tipo } = args;
  const msg: string[] = [];
  if (!(h > 0)) msg.push('La altura media h debe ser positiva.');
  if (h > ALTURA_MAXIMA_METODO_1) msg.push(`h = ${h} m excede 18.0 m: el Método 1 no aplica (B.6.4.1).`);
  if (tipo === 'plana' && theta > 10) msg.push('Una cubierta plana tiene θ prácticamente nulo; revisa el ángulo.');
  if (theta < 0) msg.push('El ángulo de cubierta no puede ser negativo.');
  if (uso === 'sprfv' && theta > ANGULO_MAXIMO_SPRFV) {
    msg.push(`θ = ${theta}° excede 45°: fuera del alcance del SPRFV por Método 1 (B.6.4.1.1 g).`);
  }
  if (uso === 'componentes') {
    if (tipo === 'dos-aguas' && theta > ANGULO_MAXIMO_COMPONENTES_DOS_AGUAS) {
      msg.push(`θ = ${theta}° excede 45° en cubierta a dos aguas (B.6.4.1.2 d).`);
    }
    if (tipo === 'cuatro-aguas' && theta > ANGULO_MAXIMO_COMPONENTES_CUATRO_AGUAS) {
      msg.push(`θ = ${theta}° excede 27° en cubierta a cuatro aguas (B.6.4.1.2 d).`);
    }
  }
  return msg;
}

// ---------------------------------------------------------------------------------------------
// Factores de ajuste: λ, I
// ---------------------------------------------------------------------------------------------

export type ModoLambda = 'interpolar' | 'superior';

/**
 * Factor de ajuste por altura y exposición λ (Figura B.6.4-2, continuación; PDF p.261).
 *
 * La norma tabula λ cada 1.5 m desde 4.5 hasta 18.0 m y no indica explícitamente qué hacer entre alturas
 * tabuladas; por defecto se interpola linealmente (práctica habitual). Con `modo = 'superior'` se toma el valor
 * de la siguiente altura tabulada (opción conservadora). Para h < 4.5 m se usa el valor de 4.5 m.
 */
export function factorLambda(h: number, exposicion: ExposicionViento, modo: ModoLambda = 'interpolar'): number {
  if (!(h > 0)) throw new RangeError('h debe ser positiva.');
  if (h > ALTURA_MAXIMA_METODO_1 + 1e-9) {
    throw new RangeError('El procedimiento simplificado solo aplica a h ≤ 18.0 m (B.6.4.1).');
  }
  const t = TABLA_LAMBDA;
  if (h <= t[0].h) return t[0][exposicion];
  for (let k = 0; k < t.length - 1; k++) {
    const a = t[k];
    const b = t[k + 1];
    if (h <= b.h + 1e-9) {
      if (modo === 'superior') return b[exposicion];
      return lerp(a[exposicion], b[exposicion], (h - a.h) / (b.h - a.h));
    }
  }
  return t[t.length - 1][exposicion];
}

/** Factor de importancia de viento (Tabla B.6.5-1). Colombia: V ≤ 36 m/s, columna "no propensas a huracanes". */
export function factorImportanciaViento(categoria: CategoriaUso, huracanMayor45 = false): number {
  const f = FACTOR_IMPORTANCIA_VIENTO[categoria];
  return huracanMayor45 ? f.huracan : f.normal;
}

// ---------------------------------------------------------------------------------------------
// SPRFV (B.6.4.2.1, Figura B.6.4-2)
// ---------------------------------------------------------------------------------------------

export type CasoCarga = 1 | 2;
export type PresionesSprfv = Record<ZonaSprfv, number>;

/** Fila tabulada completa (los "----" del caso 2 se completan con el caso 1 del mismo ángulo; ver `ps10`). */
function filaCompleta(v: VelocidadBasica, ang: AnguloTabulado, caso: CasoCarga): number[] {
  const f = PS10.find((r) => r.v === v && r.ang === ang && r.caso === caso);
  const f1 = PS10.find((r) => r.v === v && r.ang === ang && r.caso === 1);
  if (!f || !f1) throw new Error(`Fila ps10 inexistente: V=${v}, θ=${ang}, caso=${caso}`);
  return f.p.map((x, k) => x ?? (f1.p[k] as number));
}

/**
 * Casos de carga a verificar según el ángulo (Figura B.6.4-2, nota 4): el caso 1 siempre; el caso 2 solo para
 * 25° < θ ≤ 45° (a 25° el caso 2 se da únicamente para interpolar entre 25° y 30°).
 */
export function casosAplicables(theta: number): CasoCarga[] {
  return theta > 25 ? [1, 2] : [1];
}

/**
 * Presión básica ps10 (Exposición B, h = 10 m, Kzt = 1, I = 1) para una velocidad tabulada y un ángulo θ,
 * con interpolación lineal para pendientes intermedias (nota 6 de la Figura B.6.4-2).
 *
 * Convenciones sobre la tabla:
 *  - La fila "0 a 5" rige para θ ≤ 5° y la fila "30 a 45" para θ ≥ 30°.
 *  - El caso 2 solo difiere del caso 1 en las zonas E–H; en las zonas A–D y en los aleros la norma deja
 *    "----" a 25° y repite los valores del caso 1 en "30 a 45". Por eso, en el caso 2 esas zonas se toman iguales
 *    al caso 1 (interpretación documentada, no un dato nuevo).
 */
export function ps10(v: number, theta: number, caso: CasoCarga = 1): PresionesSprfv {
  const vi = indiceVelocidad(v);
  const vel = VELOCIDADES_BASICAS[vi];
  if (theta < 0 || theta > ANGULO_MAXIMO_SPRFV + 1e-9) {
    throw new RangeError('θ debe estar entre 0° y 45° (B.6.4.1.1 g).');
  }
  if (caso === 2 && theta <= 25) {
    throw new RangeError('El caso de carga 2 solo se verifica para θ > 25° (Figura B.6.4-2, nota 4).');
  }
  const puntos = ANGULOS_TABULADOS;
  let vec: number[];
  if (theta <= puntos[0]) {
    vec = filaCompleta(vel, puntos[0], caso === 2 ? 1 : caso);
  } else if (theta >= puntos[puntos.length - 1]) {
    vec = filaCompleta(vel, puntos[puntos.length - 1], caso);
  } else {
    let k = 0;
    while (k < puntos.length - 2 && theta >= puntos[k + 1]) k++;
    const a = puntos[k];
    const b = puntos[k + 1];
    const t = (theta - a) / (b - a);
    const va = filaCompleta(vel, a, caso === 2 && a < 25 ? 1 : caso);
    const vb = filaCompleta(vel, b, caso);
    vec = va.map((x, j) => lerp(x, vb[j], t));
  }
  return Object.fromEntries(ZONAS_SPRFV.map((z, j) => [z, vec[j]])) as PresionesSprfv;
}

/** Caso de carga mínimo B.6.4.2.1.1: ps = +0.40 kN/m² en las zonas A–D y 0 en las zonas E–H. */
export const CASO_MINIMO_SPRFV: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H', number> = {
  A: PRESION_MINIMA,
  B: PRESION_MINIMA,
  C: PRESION_MINIMA,
  D: PRESION_MINIMA,
  E: 0,
  F: 0,
  G: 0,
  H: 0,
};

/** B.6.1.3.1 — Fuerza mínima del SPRFV (kN) = 0.40 kN/m² × área proyectada en un plano vertical normal al viento (m²). */
export function cargaMinimaSprfv(areaProyectadaVertical: number): number {
  return PRESION_MINIMA * areaProyectadaVertical;
}

export type ResultadoCasoSprfv = {
  caso: CasoCarga;
  /** ps10 interpolado en θ. */
  ps10: PresionesSprfv;
  /** ps = λ·Kzt·I·ps10. */
  ps: PresionesSprfv;
};

export type ResultadoSprfv = {
  lambda: number;
  kzt: number;
  i: number;
  /** λ·Kzt·I. */
  factor: number;
  casos: ResultadoCasoSprfv[];
};

/**
 * Ecuación B.6.4-1: ps = λ·Kzt·I·ps10, para cada caso de carga aplicable. `h` es la altura media de cubierta.
 * Recuerda verificar además el caso mínimo (`CASO_MINIMO_SPRFV`) y que la fuerza horizontal total no sea menor
 * que la obtenida con ps = 0 en las zonas B y D (nota 7 de la Figura B.6.4-2).
 */
export function presionesSprfv(args: {
  v: number;
  theta: number;
  h: number;
  exposicion: ExposicionViento;
  i: number;
  kzt?: number;
  modoLambda?: ModoLambda;
}): ResultadoSprfv {
  const { v, theta, h, exposicion, i, kzt = 1, modoLambda = 'interpolar' } = args;
  const lambda = factorLambda(h, exposicion, modoLambda);
  const factor = lambda * kzt * i;
  const casos = casosAplicables(theta).map((caso) => {
    const base = ps10(v, theta, caso);
    const ps = Object.fromEntries(ZONAS_SPRFV.map((z) => [z, factor * base[z]])) as PresionesSprfv;
    return { caso, ps10: base, ps };
  });
  return { lambda, kzt, i, factor, casos };
}

/**
 * Nota 7 de la Figura B.6.4-2: fuerza horizontal total por metro de longitud = suma de ps·(altura de la proyección
 * vertical) de las zonas. Esta utilidad suma presiones horizontales por áreas proyectadas dadas (kN).
 * `areas` indica el área proyectada vertical (m²) sobre la que actúa cada zona A–D.
 */
export function fuerzaHorizontalTotal(
  ps: PresionesSprfv,
  areas: Partial<Record<'A' | 'B' | 'C' | 'D', number>>,
  opciones: { ceroEnBD?: boolean } = {},
): number {
  let f = 0;
  for (const z of ['A', 'B', 'C', 'D'] as const) {
    const a = areas[z] ?? 0;
    const p = opciones.ceroEnBD && (z === 'B' || z === 'D') ? 0 : ps[z];
    f += p * a;
  }
  return f;
}

// ---------------------------------------------------------------------------------------------
// Componentes y revestimientos (B.6.4.2.2, Figura B.6.4-3)
// ---------------------------------------------------------------------------------------------

/** Grupo de la tabla pnet10 según el ángulo de la cubierta: 0<θ≤7°, 7<θ≤27° o 27<θ≤45°. */
export function grupoCubierta(theta: number): Exclude<GrupoSuperficie, 'muro'> {
  if (theta <= 7) return 'c0-7';
  if (theta <= 27) return 'c7-27';
  return 'c27-45';
}

/**
 * Figura B.6.4-3, nota 3: en cubiertas a cuatro aguas con θ ≤ 25° la zona 3 se trata como zona 2.
 * Devuelve la zona de tabla que debe usarse.
 */
export function zonaCubiertaEfectiva(tipo: TipoCubierta, theta: number, zona: 1 | 2 | 3): 1 | 2 | 3 {
  if (tipo === 'cuatro-aguas' && theta <= 25 && zona === 3) return 2;
  return zona;
}

export type ModoArea = 'interpolar' | 'menor';

function porArea(filas: { area: number }[], area: number, modo: ModoArea): { a: number; b: number; t: number; fuera: 'menor' | 'mayor' | null } {
  const orden = [...filas].sort((x, y) => x.area - y.area);
  const idx = orden.map((f) => f.area);
  if (area <= idx[0]) return { a: 0, b: 0, t: 0, fuera: area < idx[0] ? 'menor' : null };
  if (area >= idx[idx.length - 1]) {
    const k = idx.length - 1;
    return { a: k, b: k, t: 0, fuera: area > idx[k] ? 'mayor' : null };
  }
  let k = 0;
  while (area >= idx[k + 1]) k++;
  if (area === idx[k]) return { a: k, b: k, t: 0, fuera: null };
  // Figura B.6.4-3, nota 4: entre áreas tabuladas se permite interpolar o usar el valor del área efectiva menor.
  const t = modo === 'interpolar' ? (area - idx[k]) / (idx[k + 1] - idx[k]) : 0;
  return { a: k, b: k + 1, t, fuera: null };
}

export type ParPresion = { pos: number; neg: number };

/**
 * pnet10 (Exposición B, h = 10 m, Kzt = 1, I = 1) para una velocidad tabulada, superficie, zona y área efectiva
 * de viento. Entre áreas tabuladas se interpola linealmente (o se usa el valor del área menor, `modo = 'menor'`),
 * como permite la nota 4 de la Figura B.6.4-3. Fuera del rango tabulado se usa el valor del extremo
 * (áreas menores que 1 m² con el de 1 m²; mayores que el máximo tabulado con el del máximo), lo que indica `fuera`.
 */
export function pnet10(
  v: number,
  grupo: GrupoSuperficie,
  zona: 1 | 2 | 3 | 4 | 5,
  area: number,
  modo: ModoArea = 'interpolar',
): ParPresion & { fuera: 'menor' | 'mayor' | null } {
  const vi = indiceVelocidad(v);
  const filas = PNET10.filter((r) => r.grupo === grupo && r.zona === zona);
  if (filas.length === 0) throw new RangeError(`No hay datos de pnet10 para grupo ${grupo}, zona ${zona}.`);
  if (!(area > 0)) throw new RangeError('El área efectiva debe ser positiva.');
  const { a, b, t, fuera } = porArea(filas, area, modo);
  const ordenadas = [...filas].sort((x, y) => x.area - y.area);
  const fa = ordenadas[a].p[vi];
  const fb = ordenadas[b].p[vi];
  return { pos: lerp(fa[0], fb[0], t), neg: lerp(fa[1], fb[1], t), fuera };
}

/** pnet10 de aleros (solo succión, kN/m²), con las mismas reglas de área que `pnet10`. Zonas 2 y 3. */
export function pnet10Alero(
  v: number,
  grupo: Exclude<GrupoSuperficie, 'muro'>,
  zona: 2 | 3,
  area: number,
  modo: ModoArea = 'interpolar',
): { neg: number; fuera: 'menor' | 'mayor' | null } {
  const vi = indiceVelocidad(v);
  const filas = PNET10_ALERO.filter((r) => r.grupo === grupo && r.zona === zona);
  if (filas.length === 0) throw new RangeError(`No hay datos de alero para grupo ${grupo}, zona ${zona}.`);
  if (!(area > 0)) throw new RangeError('El área efectiva debe ser positiva.');
  const { a, b, t, fuera } = porArea(filas, area, modo);
  const ordenadas = [...filas].sort((x, y) => x.area - y.area);
  return { neg: lerp(ordenadas[a].p[vi], ordenadas[b].p[vi], t), fuera };
}

/**
 * B.6.4.2.2.1 — Presiones mínimas: las presiones positivas de diseño no serán menores que +0.40 kN/m²
 * ni las negativas menores (en valor absoluto) que 0.40 kN/m².
 */
export function aplicarMinimoComponentes(p: ParPresion): ParPresion {
  return { pos: Math.max(p.pos, PRESION_MINIMA), neg: Math.min(p.neg, -PRESION_MINIMA) };
}

export type ResultadoComponentes = {
  lambda: number;
  factor: number;
  /** pnet10 tabulado/interpolado. */
  pnet10: ParPresion;
  /** pnet = λ·Kzt·I·pnet10, sin mínimos. */
  pnet: ParPresion;
  /** pnet con los mínimos de B.6.4.2.2.1 aplicados. */
  diseno: ParPresion;
  /** Zona de tabla efectivamente usada (nota 3 para cubiertas a cuatro aguas). */
  zonaUsada: 1 | 2 | 3 | 4 | 5;
  fuera: 'menor' | 'mayor' | null;
};

/**
 * Ecuación B.6.4-2: pnet = λ·Kzt·I·pnet10 para un elemento de revestimiento o componente.
 * - `superficie = 'muro'`: zonas 4 y 5.
 * - `superficie = 'cubierta'`: zonas 1, 2 y 3 con el grupo de θ (y la nota 3 para cuatro aguas); con `alero = true`
 *   usa la tabla de aleros (solo succión, zonas 2 y 3).
 */
export function presionNetaComponentes(args: {
  v: number;
  superficie: 'muro' | 'cubierta';
  zona: 1 | 2 | 3 | 4 | 5;
  area: number;
  h: number;
  exposicion: ExposicionViento;
  i: number;
  kzt?: number;
  theta?: number;
  tipo?: TipoCubierta;
  alero?: boolean;
  modoArea?: ModoArea;
  modoLambda?: ModoLambda;
}): ResultadoComponentes {
  const {
    v, superficie, zona, area, h, exposicion, i,
    kzt = 1, theta = 0, tipo = 'plana', alero = false, modoArea = 'interpolar', modoLambda = 'interpolar',
  } = args;
  const lambda = factorLambda(h, exposicion, modoLambda);
  const factor = lambda * kzt * i;
  let base: ParPresion;
  let fuera: 'menor' | 'mayor' | null;
  let zonaUsada = zona;
  if (superficie === 'muro') {
    if (zona !== 4 && zona !== 5) throw new RangeError('Los muros tienen zonas 4 y 5.');
    const r = pnet10(v, 'muro', zona, area, modoArea);
    base = { pos: r.pos, neg: r.neg };
    fuera = r.fuera;
  } else {
    if (zona > 3) throw new RangeError('Las cubiertas tienen zonas 1, 2 y 3.');
    const z = zonaCubiertaEfectiva(tipo, theta, zona as 1 | 2 | 3);
    zonaUsada = z;
    const g = grupoCubierta(tipo === 'plana' ? 0 : theta);
    if (alero) {
      if (z === 1) throw new RangeError('Los aleros solo tienen zonas 2 y 3 (Figura B.6.4-3).');
      const r = pnet10Alero(v, g, z, area, modoArea);
      base = { pos: 0, neg: r.neg };
      fuera = r.fuera;
    } else {
      const r = pnet10(v, g, z, area, modoArea);
      base = { pos: r.pos, neg: r.neg };
      fuera = r.fuera;
    }
  }
  const pnet = { pos: factor * base.pos, neg: factor * base.neg };
  const diseno = alero ? { pos: 0, neg: Math.min(pnet.neg, -PRESION_MINIMA) } : aplicarMinimoComponentes(pnet);
  return { lambda, factor, pnet10: base, pnet, diseno, zonaUsada, fuera };
}
