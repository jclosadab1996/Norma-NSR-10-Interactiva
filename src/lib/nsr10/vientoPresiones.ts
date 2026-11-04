/**
 * Presiones y fuerzas de viento de diseño del Método 2 de la NSR-10 (B.6.5.11 a B.6.5.15).
 * Lógica pura: recibe las presiones por velocidad (qz, qh, en N/m²) ya calculadas (B.6.5.10, ecuación B.6.5-13)
 * y devuelve presiones en N/m² (positivas = hacia la superficie, negativas = hacia afuera, B.6.5.12.1.1).
 */
import {
  BS_VALLAS,
  CASOS_CARGA_VIENTO,
  CF_VALLAS_AB,
  COEF_RI,
  CP_ALERO_BARLOVENTO,
  CP_ARCO,
  CP_CUBIERTA_BARLOVENTO,
  CP_CUBIERTA_PARALELA,
  CP_CUBIERTA_SOTAVENTO,
  CP_MURO_BARLOVENTO,
  CP_MURO_LATERAL,
  CP_MURO_SOTAVENTO,
  EXCENTRICIDAD_RIGIDA,
  FRANJAS_PARALELA,
  FACTOR_EQUIPO_CUBIERTA,
  FACTOR_REDUCCION_AREA,
  GCPF,
  GCPI,
  GCPN_PARAPETO,
  GCP_MUROS_8A,
  G_RIGIDA,
  HL_CUBIERTA,
  THETA_BARLOVENTO,
  THETA_LIMITE_CP_08,
  THETA_SOTAVENTO,
  ZONAS_GCPF,
  type Cerramiento,
  type ZonaGCpf,
} from '../../data/vientoPresiones';

export type { Cerramiento, ZonaGCpf };
export { G_RIGIDA };

// ---------------------------------------------------------------------------------------------------------------
// Utilidades de interpolación
// ---------------------------------------------------------------------------------------------------------------

/** Interpolación lineal por tramos sobre nodos (x ascendente), con valores constantes fuera del rango. */
export function interpolar(xs: readonly number[], ys: readonly number[], x: number): number {
  if (xs.length !== ys.length || xs.length === 0) throw new Error('Nodos inválidos');
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

// ---------------------------------------------------------------------------------------------------------------
// B.6.5.11.1 — Presión interna
// ---------------------------------------------------------------------------------------------------------------

/** Coeficientes de presión interna GCpi (Figura B.6.5-2): `positivo` y `negativo` según el cerramiento. */
export function gcpi(cerramiento: Cerramiento): { positivo: number; negativo: number } {
  return GCPI[cerramiento];
}

/**
 * Ecuación B.6.5-14 — Factor de reducción Ri para edificios parcialmente cerrados de gran volumen
 * (un solo espacio sin particiones): Ri = 0.5·(1 + 1/√(1 + Vi/(11000·Aog))), con tope 1.0.
 * @param aog área total de aberturas del cerramiento (m²)
 * @param vi volumen interno sin particiones (m³)
 */
export function reduccionRi(aog: number, vi: number): number {
  if (!(aog > 0) || !(vi >= 0)) throw new Error('Aog debe ser > 0 y Vi ≥ 0');
  return Math.min(1, 0.5 * (1 + 1 / Math.sqrt(1 + vi / (COEF_RI * aog))));
}

// ---------------------------------------------------------------------------------------------------------------
// Figura B.6.5-3 — Cp del SPRFV
// ---------------------------------------------------------------------------------------------------------------

export function cpMuroBarlovento(): number {
  return CP_MURO_BARLOVENTO;
}

export function cpMuroLateral(): number {
  return CP_MURO_LATERAL;
}

/** Cp del muro a sotavento según L/B (L en la dirección del viento, B normal): −0.5 (≤1), −0.3 (2), −0.2 (≥4). */
export function cpMuroSotavento(lSobreB: number): number {
  return interpolar(
    CP_MURO_SOTAVENTO.map((p) => p.lb),
    CP_MURO_SOTAVENTO.map((p) => p.cp),
    lSobreB,
  );
}

function interpolarBilineal(
  hls: readonly number[],
  nodos: readonly number[],
  tabla: readonly (readonly number[])[],
  hl: number,
  x: number,
): number {
  const porHl = tabla.map((fila) => interpolar(nodos, fila, x));
  return interpolar(hls, porHl, hl);
}

/** Resultado de un Cp con posibles advertencias sobre anomalías del PDF o límites de la figura. */
export type CpConAviso = { cp: number; advertencias: string[] };

/**
 * Factor de reducción por área del Cp = −1.3 (Figura B.6.5-3, "**"): 1 hasta 10 m², 0.9 a 20 m², 0.8 desde 100 m²,
 * interpolado linealmente entre esos puntos.
 */
export function factorReduccionArea(areaM2: number): number {
  return interpolar(
    FACTOR_REDUCCION_AREA.map((p) => p.area),
    FACTOR_REDUCCION_AREA.map((p) => p.factor),
    areaM2,
  );
}

/**
 * Cp de la cubierta a BARLOVENTO con viento normal a la cumbrera y θ ≥ 10° (Figura B.6.5-3). Devuelve las dos
 * filas de la tabla (`fila1` y `fila2`): ambas deben investigarse. h/L < 0.25 usa la columna ≤ 0.25 y h/L > 1
 * usa la columna ≥ 1.0. Para θ > 60° vale 0.01·θ y desde θ > 80° vale 0.8.
 * @param hl relación h/L
 * @param thetaGrados ángulo de la cubierta (grados); requiere θ ≥ 10°
 * @param areaM2 área sobre la cual aplica el Cp = −1.3 (opcional): aplica la reducción de la figura
 */
export function cpCubiertaBarlovento(
  hl: number,
  thetaGrados: number,
  areaM2?: number,
): { fila1: number; fila2: number; advertencias: string[] } {
  if (thetaGrados < 10) throw new Error('Para θ < 10° use cpCubiertaParalela (viento normal a la cumbrera con θ < 10°)');
  const advertencias: string[] = [];
  const hls = HL_CUBIERTA as readonly number[];
  const th = THETA_BARLOVENTO as readonly number[];
  let fila1: number;
  let fila2: number;
  if (thetaGrados > THETA_LIMITE_CP_08) {
    fila1 = fila2 = 0.8;
    advertencias.push('θ > 80°: Cp = 0.8 (nota "#" de la Figura B.6.5-3; el PDF imprime “θ ≤ 80°”, errata evidente).');
  } else if (thetaGrados > 60) {
    fila1 = fila2 = 0.01 * thetaGrados;
  } else {
    fila1 = interpolarBilineal(hls, th, CP_CUBIERTA_BARLOVENTO.map((f) => f.fila1), hl, thetaGrados);
    fila2 = interpolarBilineal(hls, th, CP_CUBIERTA_BARLOVENTO.map((f) => f.fila2), hl, thetaGrados);
  }
  if (hl < 0.5 && thetaGrados > 25 && thetaGrados < 35) {
    advertencias.push(
      'Para h/L ≤ 0.25 y θ = 30° el PDF imprime −0.30 en la fila inferior (probable errata: +0.30 en ASCE 7-05); se usa el valor impreso.',
    );
  }
  if (areaM2 !== undefined && fila1 <= -1.3 + 1e-9 && thetaGrados <= 10 + 1e-9 && hl >= 1) {
    fila1 *= factorReduccionArea(areaM2);
  }
  return { fila1, fila2, advertencias };
}

/** Cp de la cubierta a SOTAVENTO con viento normal a la cumbrera y θ ≥ 10° (Figura B.6.5-3). Usa θ ≥ 20° = columna 20. */
export function cpCubiertaSotavento(hl: number, thetaGrados: number): number {
  if (thetaGrados < 10) throw new Error('Para θ < 10° use cpCubiertaParalela');
  return interpolarBilineal(
    HL_CUBIERTA as readonly number[],
    THETA_SOTAVENTO as readonly number[],
    CP_CUBIERTA_SOTAVENTO.map((f) => f.cp),
    hl,
    thetaGrados,
  );
}

/**
 * Cp de cubierta por franjas desde el borde de barlovento, para viento normal a la cumbrera con θ < 10° o viento
 * paralelo a la cumbrera (cualquier θ). Devuelve 4 franjas (0–h/2, h/2–h, h–2h, > 2h), cada una con sus dos
 * condiciones (`fila1` succión y `fila2` = −0.18). Entre h/L = 0.5 y 1.0 se interpola linealmente.
 * @param areaM2 si se da, aplica la reducción por área al −1.3 de la primera franja (h/L ≥ 1)
 */
export function cpCubiertaParalela(hl: number, areaM2?: number): { fila1: number[]; fila2: number[] } {
  const t = Math.min(1, Math.max(0, (hl - 0.5) / 0.5));
  const mezcla = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v + t * (b[i] - v));
  const fila1 = mezcla(CP_CUBIERTA_PARALELA.bajo.fila1, CP_CUBIERTA_PARALELA.alto.fila1);
  const fila2 = mezcla(CP_CUBIERTA_PARALELA.bajo.fila2, CP_CUBIERTA_PARALELA.alto.fila2);
  if (areaM2 !== undefined && hl >= 1) fila1[0] *= factorReduccionArea(areaM2);
  return { fila1, fila2 };
}

/**
 * Cp de cubiertas en ARCO (Figura B.6.5-5) por tercios: cuarto a barlovento, medio central y cuarto a sotavento.
 * @param r relación flecha/luz (0 < r ≤ 0.6)
 * @param arranqueEnPiso true si el arco arranca desde el nivel del piso; false si está sobre estructura elevada
 * @param usarAlternativa usar 6r − 2.1 en el cuarto de barlovento para 0.2 ≤ r ≤ 0.3
 */
export function cpArco(
  r: number,
  arranqueEnPiso: boolean,
  usarAlternativa = false,
): { barlovento: number; medioCentral: number; sotavento: number } {
  if (!(r > 0 && r <= 0.6)) throw new Error('La relación flecha/luz debe estar en (0, 0.6]');
  let barlovento: number;
  if (arranqueEnPiso) {
    barlovento = CP_ARCO.arranquePiso.barlovento.a * r;
  } else if (usarAlternativa && r >= 0.2 && r <= 0.3) {
    barlovento = CP_ARCO.alternativa.a * r + CP_ARCO.alternativa.b;
  } else {
    const tramo = CP_ARCO.elevada.find((t) => r >= t.desde && r < t.hasta) ?? CP_ARCO.elevada[CP_ARCO.elevada.length - 1];
    barlovento = tramo.barlovento.a * r + tramo.barlovento.b;
  }
  return {
    barlovento,
    medioCentral: CP_ARCO.medioCentral.a * r + CP_ARCO.medioCentral.b,
    sotavento: CP_ARCO.sotavento,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// B.6.5.12 — Presiones de diseño
// ---------------------------------------------------------------------------------------------------------------

/**
 * Ecuaciones B.6.5-15 y B.6.5-17 — Presión de diseño del SPRFV en edificios rígidos (o flexibles con Gf):
 * p = q·G·Cp − qi·(GCpi), en N/m².
 */
export function presionSPRFV(p: { q: number; g: number; cp: number; qi: number; gcpi: number }): number {
  return p.q * p.g * p.cp - p.qi * p.gcpi;
}

/** Ecuación B.6.5-16 — Edificios bajos: p = qh·[GCpf − GCpi]. */
export function presionBajaAltura(p: { qh: number; gcpf: number; gcpi: number }): number {
  return p.qh * (p.gcpf - p.gcpi);
}

/** Ecuaciones B.6.5-20 y B.6.5-22 — Componentes y revestimientos (h ≤ 18 m): p = qh·[GCp − GCpi]. */
export function presionComponentes(p: { qh: number; gcp: number; gcpi: number }): number {
  return p.qh * (p.gcp - p.gcpi);
}

/** Ecuación B.6.5-21 — Componentes de edificios con h > 18 m: p = q·GCp − qi·GCpi. */
export function presionComponentesAltos(p: { q: number; gcp: number; qi: number; gcpi: number }): number {
  return p.q * p.gcp - p.qi * p.gcpi;
}

/** Ecuación B.6.5-18 — Parapetos: pp = qp·GCpn (+1.5 barlovento, −1.0 sotavento), en N/m². */
export function presionParapeto(qp: number, lado: 'barlovento' | 'sotavento'): number {
  return qp * GCPN_PARAPETO[lado];
}

/** B.6.5.11.4.1 — Presión positiva en la cara inferior del alero a barlovento: p = qh·G·0.8. */
export function presionAleroBarlovento(qh: number, g: number = G_RIGIDA): number {
  return qh * g * CP_ALERO_BARLOVENTO;
}

/** Ecuaciones B.6.5-23 y B.6.5-24 — Edificios abiertos con cubierta libre: p = qh·G·CN. */
export function presionAbierto(p: { qh: number; g: number; cn: number }): number {
  return p.qh * p.g * p.cn;
}

/** Ecuación B.6.5-25 — Fuerza en muros libres y vallas macizas: F = qh·G·Cf·As (N). */
export function fuerzaMuroLibre(p: { qh: number; g: number; cf: number; as: number }): number {
  return p.qh * p.g * p.cf * p.as;
}

/** Ecuación B.6.5-26 — Fuerza en otras estructuras: F = qz·G·Cf·Af (N). */
export function fuerzaOtrasEstructuras(p: { qz: number; g: number; cf: number; af: number }): number {
  return p.qz * p.g * p.cf * p.af;
}

/**
 * B.6.5.15.1 — Factor de amplificación para equipos sobre cubiertas de edificios con h ≤ 18 m: 1.9 si Af < 0.1·B·h,
 * disminuyendo linealmente hasta 1.0 cuando Af = B·h.
 */
export function factorEquipoCubierta(af: number, b: number, h: number): number {
  const a0 = 0.1 * b * h;
  const a1 = b * h;
  return interpolar([a0, a1], [FACTOR_EQUIPO_CUBIERTA.maximo, FACTOR_EQUIPO_CUBIERTA.minimo], af);
}

/** Factor de reducción por porosidad de vallas con ε = área sólida / área total (nota 2, Fig. B.6.5-17): 1 − (1 − ε)^1.5. */
export function factorPorosidadValla(epsilon: number): number {
  if (!(epsilon >= 0 && epsilon <= 1)) throw new Error('ε debe estar entre 0 y 1');
  return 1 - Math.pow(1 - epsilon, 1.5);
}

/**
 * Cf de muros libres y vallas macizas, casos A y B (Figura B.6.5-17), por interpolación bilineal en s/h y B/s.
 * @param sh relación de galibo s/h (≤ 0.16 usa la última fila; ≥ 1 la primera)
 * @param bs relación de aspecto B/s (≤ 0.05 y ≥ 45 usan los extremos)
 */
export function cfMuroLibreAB(sh: number, bs: number): number {
  // Las filas están de mayor a menor s/h: se invierten para tener nodos ascendentes.
  const filas = [...CF_VALLAS_AB].reverse();
  const shs = filas.map((f) => f.sh);
  const porSh = (columna: number) => interpolar(shs, filas.map((f) => f.cf[columna]), sh);
  const cfPorColumna = BS_VALLAS.map((_, j) => porSh(j));
  return interpolar(BS_VALLAS, cfPorColumna, bs);
}

// ---------------------------------------------------------------------------------------------------------------
// Edificios bajos — zonas y GCpf
// ---------------------------------------------------------------------------------------------------------------

/**
 * Ancho de las zonas de esquina/borde "a" (Figura B.6.5-7, nota 9): el menor entre 10 % de la menor dimensión
 * horizontal y 0.4h, pero no menos de 4 % de la menor dimensión horizontal ni de 1.0 m.
 */
export function anchoZonaA(menorDimension: number, h: number): number {
  return Math.max(Math.min(0.1 * menorDimension, 0.4 * h), 0.04 * menorDimension, 1.0);
}

/** GCpf de una zona (Figura B.6.5-7) para un ángulo de cubierta θ, con interpolación lineal entre ángulos. */
export function gcpf(zona: ZonaGCpf, thetaGrados: number): number {
  const j = ZONAS_GCPF.indexOf(zona);
  if (j < 0) throw new Error(`Zona desconocida: ${zona}`);
  return interpolar(
    GCPF.map((f) => f.theta),
    GCPF.map((f) => f.valores[j]),
    thetaGrados,
  );
}

/** Todas las zonas de la Figura B.6.5-7 para un ángulo θ. */
export function gcpfTodas(thetaGrados: number): Record<ZonaGCpf, number> {
  return Object.fromEntries(ZONAS_GCPF.map((z) => [z, gcpf(z, thetaGrados)])) as Record<ZonaGCpf, number>;
}

// ---------------------------------------------------------------------------------------------------------------
// Componentes y revestimientos de muros (Figura B.6.5-8A)
// ---------------------------------------------------------------------------------------------------------------

function logInterp(area: number, a0: number, a1: number, v0: number, v1: number): number {
  if (area <= a0) return v0;
  if (area >= a1) return v1;
  return v0 + ((Math.log10(area) - Math.log10(a0)) / (Math.log10(a1) - Math.log10(a0))) * (v1 - v0);
}

/**
 * GCp de un muro (Figura B.6.5-8A, h ≤ 18 m) para un área efectiva de viento, en la zona 4 (interior) o 5 (esquina).
 * Devuelve el valor de presión (positivo) y de succión (negativo). Para θ ≤ 10° se reduce 10 % (nota 5).
 * @param areaM2 área efectiva de viento (m²)
 */
export function gcpMuro(areaM2: number, zona: '4' | '5', thetaGrados = 45): { positivo: number; negativo: number } {
  const { areaMin, areaMax, positivo, negativo } = GCP_MUROS_8A;
  const n = negativo[zona];
  const f = thetaGrados <= 10 ? GCP_MUROS_8A.reduccionTheta10 : 1;
  return {
    positivo: f * logInterp(areaM2, areaMin, areaMax, positivo.enAreaMin, positivo.enAreaMax),
    negativo: f * logInterp(areaM2, areaMin, areaMax, n.enAreaMin, n.enAreaMax),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Casos de carga y excentricidad (B.6.5.12.3)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Momento torsional por unidad de altura (N·m/m) de los casos 2 y 4 de la Figura B.6.5-6:
 * MT = f·(PW + PL)·B·e con e = 0.15·B y f = 0.75 (caso 2) o 0.563 (caso 4).
 * @param pw presión de barlovento (N/m²) sobre el eje evaluado
 * @param pl presión de sotavento (N/m², en valor absoluto o con signo, según se quiera sumar)
 * @param b dimensión del edificio normal al viento, a lo largo de la cual actúa la carga (m)
 */
export function momentoTorsional(caso: 2 | 4, pw: number, pl: number, b: number): number {
  const f = CASOS_CARGA_VIENTO[caso].factorX;
  return f * (pw + pl) * b * (EXCENTRICIDAD_RIGIDA * b);
}

/** Ecuación B.6.5-19 — Excentricidad e de estructuras flexibles. */
export function excentricidadFlexible(p: {
  eQ: number;
  eR: number;
  iz: number;
  gQ: number;
  q: number;
  gR: number;
  r: number;
}): number {
  const num = p.eQ + 1.7 * p.iz * Math.sqrt((p.gQ * p.q * p.eQ) ** 2 + (p.gR * p.r * p.eR) ** 2);
  const den = 1 + 1.7 * p.iz * Math.sqrt((p.gQ * p.q) ** 2 + (p.gR * p.r) ** 2);
  return num / den;
}

// ---------------------------------------------------------------------------------------------------------------
// Presiones sobre todas las superficies de un edificio rígido cerrado o parcialmente cerrado
// ---------------------------------------------------------------------------------------------------------------

export type EntradaEdificio = {
  /** Presión por velocidad a la altura z de evaluación del muro a barlovento (N/m²). Por defecto qh. */
  qzBarlovento?: number;
  /** Presión por velocidad a la altura media de la cubierta h (N/m²). */
  qh: number;
  /** Presión por velocidad a la altura de la abertura más alta, para la presión interna positiva en
   *  edificios parcialmente cerrados (B.6.5.12.2.1). Por defecto qh (conservador). */
  qiPositiva?: number;
  /** Factor de efecto ráfaga G. Por defecto 0.85 (B.6.5.8.1). */
  g?: number;
  cerramiento: Cerramiento;
  /** Dimensión horizontal paralela al viento (m). */
  L: number;
  /** Dimensión horizontal normal al viento (m). */
  B: number;
  /** Altura media de la cubierta (m); para θ ≤ 10° la altura del alero. */
  h: number;
  /** Ángulo de la cubierta (grados). */
  theta: number;
  /** Viento normal (perpendicular) o paralelo a la cumbrera. */
  direccion: 'normal' | 'paralela';
  /** Factor Ri (B.6.5-14) aplicado a GCpi en edificios parcialmente cerrados de gran volumen. */
  ri?: number;
};

export type FilaPresion = {
  clave: string;
  nombre: string;
  /** Presión por velocidad usada ('qz' o 'qh'). */
  q: 'qz' | 'qh';
  /** Cp (uno o varios, cuando la figura exige investigar más de una condición). */
  cps: number[];
  /** Presión de diseño con GCpi positivo (+) y negativo (−) para cada Cp: p[i] = { cp, conMas, conMenos }. */
  casos: { cp: number; pConGcpiMas: number; pConGcpiMenos: number }[];
  /** Mayor presión (más positiva) y mayor succión (más negativa) entre todos los casos. */
  pMax: number;
  pMin: number;
};

export type ResultadoEdificio = {
  filas: FilaPresion[];
  gcpiPositivo: number;
  gcpiNegativo: number;
  advertencias: string[];
};

/**
 * Presiones de viento de diseño del SPRFV de un edificio rígido cerrado o parcialmente cerrado (B.6.5.12.2.1),
 * con la ecuación B.6.5-15: p = q·G·Cp − qi·(GCpi).
 * Barlovento: q = qz (aquí `qzBarlovento`). Sotavento, laterales y cubierta: q = qh.
 * qi = qh (cerrado y presiones internas negativas); qi = `qiPositiva` para presión interna positiva en parcialmente cerrado.
 */
export function presionesEdificioRigido(e: EntradaEdificio): ResultadoEdificio {
  const g = e.g ?? G_RIGIDA;
  const { cerramiento, qh, L, B, h, theta } = e;
  const qz = e.qzBarlovento ?? qh;
  const ri = e.ri ?? 1;
  const base = GCPI[cerramiento];
  const gcpiPositivo = base.positivo * (cerramiento === 'parcial' ? ri : 1);
  const gcpiNegativo = base.negativo * (cerramiento === 'parcial' ? ri : 1);
  // qi para presión interna positiva: solo difiere de qh en edificios parcialmente cerrados.
  const qiPos = cerramiento === 'parcial' ? (e.qiPositiva ?? qh) : qh;
  const qiNeg = qh;
  const advertencias: string[] = [];
  if (cerramiento === 'abierto') {
    advertencias.push('Edificio abierto: GCpi = 0. Para cubiertas libres use los coeficientes CN de B.6.5.13.');
  }

  const armarFila = (clave: string, nombre: string, q: 'qz' | 'qh', cps: number[]): FilaPresion => {
    const qv = q === 'qz' ? qz : qh;
    const casos = cps.map((cp) => ({
      cp,
      pConGcpiMas: presionSPRFV({ q: qv, g, cp, qi: qiPos, gcpi: gcpiPositivo }),
      pConGcpiMenos: presionSPRFV({ q: qv, g, cp, qi: qiNeg, gcpi: gcpiNegativo }),
    }));
    const todas = casos.flatMap((c) => [c.pConGcpiMas, c.pConGcpiMenos]);
    return { clave, nombre, q, cps, casos, pMax: Math.max(...todas), pMin: Math.min(...todas) };
  };

  const filas: FilaPresion[] = [];
  const lb = L / B;
  const hl = h / L;
  // Los coeficientes de muros de la Figura B.6.5-3 no dependen de la dirección respecto a la cumbrera.
  filas.push(armarFila('barlovento', 'Muro a barlovento', 'qz', [cpMuroBarlovento()]));
  filas.push(armarFila('sotavento', 'Muro a sotavento', 'qh', [cpMuroSotavento(lb)]));
  filas.push(armarFila('lateral', 'Muros laterales', 'qh', [cpMuroLateral()]));

  if (e.direccion === 'normal' && theta >= 10) {
    const bar = cpCubiertaBarlovento(hl, theta);
    advertencias.push(...bar.advertencias);
    filas.push(armarFila('cubierta-barlovento', 'Cubierta a barlovento', 'qh', [bar.fila1, bar.fila2]));
    filas.push(armarFila('cubierta-sotavento', 'Cubierta a sotavento', 'qh', [cpCubiertaSotavento(hl, theta)]));
  } else {
    const par = cpCubiertaParalela(hl);
    FRANJAS_PARALELA.forEach((et, i) => {
      filas.push(armarFila(`cubierta-franja-${i + 1}`, `Cubierta, franja ${et}`, 'qh', [par.fila1[i], par.fila2[i]]));
    });
  }
  return { filas, gcpiPositivo, gcpiNegativo, advertencias };
}
