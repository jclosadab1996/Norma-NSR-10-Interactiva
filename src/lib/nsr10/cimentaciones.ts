/**
 * Capítulo C.15 de la NSR-10 — Cimentaciones (PDF p.443–448, C-141 a C-146), con apoyo en C.11 (cortante) y C.10.14
 * (aplastamiento). SI: cargas en kN, presiones en kPa, lados de zapata en m, d, h, c1, c2 en mm, f′c y fy en MPa.
 *
 * Punto de contacto con C.11: el cortante en dos direcciones usa `./punzonamiento` (C.11.11.2.1, Ecs. C.11-31 a C.11-33)
 * y el de una dirección usa `./cortante` (C.11.2.1, Ec. C.11-3). Lo marcado "(autor)" es estática o práctica usual y
 * no texto de la norma (p. ej. el área de base con presión neta y los despejes de d).
 */
import { beta1 } from './concreto';
import { vcSimplificado } from './cortante';
import { cortanteZapata, vcDosDirecciones } from './punzonamiento';
import { cuantiaRetraccion } from './refuerzoDetalles';
import {
  A2_PENDIENTE_HORIZONTAL_POR_VERTICAL,
  ALTURA_MIN_SOBRE_REFUERZO_MM,
  APLASTAMIENTO_COEF,
  APLASTAMIENTO_FACTOR_MAX,
  AS_MIN_INTERFAZ_FRACCION_AG,
  GAMMA_S_NUMERADOR,
  PHI_APLASTAMIENTO,
  PILOTE_LIMITES_AXIALES,
  RECUBRIMIENTO_CONTRA_SUELO_MM,
  TABLA_C15111,
  VIGA_AMARRE_DIVISOR_LUZ,
  VIGA_AMARRE_ESTRIBOS,
  type CapacidadDisipacion,
} from '../../data/cimentacionesConcreto';

const PHI_CORTANTE = 0.75; // C.9.3.2.3 (C-68)
const PHI_FLEXION_TRACCION = 0.9; // C.9.3.2.1 (C-68)
const EPS_CU = 0.003; // C.10.2.3 (C-75)

/* ═══════════════════════ C.15.2 — área de base con cargas no mayoradas ═══════════════════════ */

/** Presión neta admisible del suelo: qa menos el peso del relleno y de la zapata por unidad de área (autor), kPa. */
export const presionAdmisibleNeta = (qa: number, sobrecargaYPesoPropio: number): number => qa - sobrecargaYPesoPropio;

/** Área de base requerida (C.15.2.2, C-141): A = P / qa, con P y qa no mayorados (P en kN, qa en kPa → m²). */
export function areaBaseRequerida(P: number, qaNeta: number): number {
  if (!(qaNeta > 0)) throw new RangeError('la presión admisible neta debe ser positiva');
  return P / qaNeta;
}

/** Lado de una zapata cuadrada (m) para la carga de servicio P (kN) y presión neta admisible (kPa). */
export const ladoZapataCuadrada = (P: number, qaNeta: number): number => Math.sqrt(areaBaseRequerida(P, qaNeta));

/** Presión de contacto última qu = Pu / (B L) (autor), kPa. */
export const presionUltima = (Pu: number, B: number, L: number): number => Pu / (B * L);

/**
 * Presiones extremas bajo una zapata B × L con carga P y momento M alrededor del eje paralelo a B (autor, flexión
 * compuesta elástica): q = P/(BL) (1 ± 6e/L), e = M/P. Si e > L/6 hay despegue y no se calcula (devuelve `despegue`).
 */
export function presionesConMomento(P: number, M: number, B: number, L: number): { qMax: number; qMin: number; e: number; despegue: boolean } {
  const e = Math.abs(M / P);
  if (e > L / 6) return { qMax: Infinity, qMin: 0, e, despegue: true };
  const q0 = P / (B * L);
  return { qMax: q0 * (1 + (6 * e) / L), qMin: q0 * (1 - (6 * e) / L), e, despegue: false };
}

/* ═══════════════════════ C.15.3 — columna circular ═══════════════════════ */

/** Lado del cuadrado de igual área de una columna circular de diámetro D (C.15.3, C-141), mm. */
export const ladoCuadradoEquivalente = (D: number): number => (D * Math.sqrt(Math.PI)) / 2;

/* ═══════════════════════ C.15.4 — momentos y refuerzo ═══════════════════════ */

/** Voladizo medido desde la cara de la columna hasta el borde de la zapata (C.15.4.2(a), C-141), m. */
export const voladizoZapata = (ladoM: number, cMm: number): number => (ladoM - cMm / 1000) / 2;

/**
 * Momento mayorado en la cara de la columna (C.15.4.1–C.15.4.2(a), C-141): Mu = qu · b · v² / 2, kN·m, donde `ancho` (m)
 * es el ancho de la zapata perpendicular al voladizo y v (m) el voladizo.
 */
export function momentoZapataCara(p: { qu: number; ancho: number; voladizo: number }): number {
  return (p.qu * p.ancho * p.voladizo ** 2) / 2;
}

/** Ec. 15-1 (C.15.4.4.2, C-142): γs = 2/(β + 1), β = lado largo / lado corto. */
export function gammaS(beta: number): number {
  if (!(beta >= 1)) throw new RangeError('β = lado largo / lado corto debe ser ≥ 1');
  return GAMMA_S_NUMERADOR / (beta + 1);
}

/**
 * Reparto del refuerzo en la dirección corta de una zapata rectangular (C.15.4.4.2, C-142): γs As en la franja central
 * de ancho igual al lado corto y (1 − γs) As fuera de ella. `As` en mm² (o cualquier unidad).
 */
export function repartoRefuerzoCorto(As: number, beta: number): { franjaCentral: number; extremos: number; gammaS: number } {
  const g = gammaS(beta);
  return { franjaCentral: g * As, extremos: (1 - g) * As, gammaS: g };
}

export type ResultadoFlexionZapata = {
  /** Área de acero requerida por flexión, mm². */
  AsFlexion: number;
  /** Mínimo de C.10.5.4 → C.7.12.2.1 (retracción y temperatura), mm². */
  AsMin: number;
  /** As de diseño = máx(AsFlexion, AsMin), mm². */
  As: number;
  /** Profundidad del bloque a, mm; εt; y si es controlada por tracción (εt ≥ 0.005). */
  a: number;
  epsilonT: number;
  controladaPorTraccion: boolean;
  rho: number;
};

/**
 * As por flexión de una franja de ancho b (mm) y altura útil d (mm) con φ = 0.90 (autor: despeje del bloque rectangular
 * de C.10.2.7 con φMn ≥ Mu). Mu en kN·m. Se compara con el mínimo de C.10.5.4 (= C.7.12.2.1, ρ·b·h) con `h` (mm).
 * Lanza RangeError si la sección no alcanza (radicando negativo).
 */
export function asFlexionZapata(p: { Mu: number; b: number; d: number; h: number; fc: number; fy: number }): ResultadoFlexionZapata {
  const { Mu, b, d, h, fc, fy } = p;
  const rad = d * d - (2 * Mu * 1e6) / (PHI_FLEXION_TRACCION * 0.85 * fc * b);
  if (rad < 0) throw new RangeError('la sección no resiste el momento: aumente d');
  const a = d - Math.sqrt(rad);
  const AsFlexion = (0.85 * fc * b * a) / fy;
  const c = a / beta1(fc);
  const epsilonT = (EPS_CU * (d - c)) / c;
  const AsMin = cuantiaRetraccion(fy).cuantia * b * h;
  const As = Math.max(AsFlexion, AsMin);
  return { AsFlexion, AsMin, As, a, epsilonT, controladaPorTraccion: epsilonT >= 0.005, rho: As / (b * d) };
}

/* ═══════════════════════ C.15.5 — cortante (con C.11) ═══════════════════════ */

/**
 * Cortante en una dirección (viga ancha) a d de la cara de la columna (C.11.11.1.1 con C.11.2.1; sección crítica medida
 * desde la cara de la columna según C.15.5.2): Vu = qu · B · (v − d), kN, con v voladizo en m y d en mm.
 */
export function cortanteUnaDireccion(p: { qu: number; ancho: number; voladizo: number; d: number }): number {
  return Math.max(0, p.qu * p.ancho * (p.voladizo - p.d / 1000));
}

/** φVc de una dirección: φ · 0.17 λ √f′c b d (Ec. C.11-3), kN; b en m, d en mm. */
export function phiVcUnaDireccion(p: { fc: number; ancho: number; d: number; lambda?: number }): number {
  return PHI_CORTANTE * vcSimplificado({ fc: p.fc, bw: p.ancho * 1000, d: p.d, lambda: p.lambda });
}

/**
 * d mínimo por cortante en una dirección (autor): despeja d de qu v − qu d/1000 = φ 0.17 λ √f′c d (por metro de ancho),
 * d = qu v / (φ·0.17 λ √f′c + qu/1000), mm. (qu en kPa y v en m.)
 */
export function dMinimoUnaDireccion(p: { qu: number; voladizo: number; fc: number; lambda?: number }): number {
  const coef = phiVcUnaDireccion({ fc: p.fc, ancho: 1, d: 1, lambda: p.lambda }); // kN por m de ancho y mm de d
  return (p.qu * p.voladizo) / (coef + p.qu / 1000);
}

export type VerificacionDosDirecciones = {
  Vu: number;
  phiVc: number;
  bo: number;
  gobierna: string;
  cumple: boolean;
  /** Vu/φVc. */
  razon: number;
};

/**
 * Cortante en dos direcciones de una zapata con columna interior (C.11.11.1.2: sección crítica a d/2 de la cara; Vc
 * = menor de C.11-31, C.11-32, C.11-33; φ = 0.75). Vu = Pu − qu · (c1 + d)(c2 + d) (estática; delega en
 * `cortanteZapata` de `punzonamiento.ts`). Pu en kN, B y L en m, c1, c2, d en mm.
 */
export function cortanteDosDireccionesZapata(p: { Pu: number; B: number; L: number; c1: number; c2: number; d: number; fc: number; lambda?: number }): VerificacionDosDirecciones {
  const { Vu } = cortanteZapata({ Pu: p.Pu, B: p.B, L: p.L, c1: p.c1, c2: p.c2, d: p.d });
  const vc = vcDosDirecciones({ fc: p.fc, d: p.d, c1: p.c1, c2: p.c2, ubicacion: 'interior', lambda: p.lambda });
  const phiVc = PHI_CORTANTE * vc.Vc;
  return { Vu, phiVc, bo: vc.bo, gobierna: vc.gobierna, cumple: Vu <= phiVc, razon: Vu / phiVc };
}

/** Busca por bisección el menor d (mm) tal que f(d) ≤ 0 (f decreciente en d); devuelve null si no hay raíz hasta dMax. */
function menorDQueCumple(f: (d: number) => number, dMin: number, dMax: number): number | null {
  if (f(dMin) <= 0) return dMin;
  if (f(dMax) > 0) return null;
  let lo = dMin;
  let hi = dMax;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** d mínimo por cortante en dos direcciones (autor: bisección sobre `cortanteDosDireccionesZapata`), mm. */
export function dMinimoDosDirecciones(p: { Pu: number; B: number; L: number; c1: number; c2: number; fc: number; lambda?: number }): number {
  const f = (d: number) => {
    const r = cortanteDosDireccionesZapata({ ...p, d });
    return r.Vu - r.phiVc;
  };
  const d = menorDQueCumple(f, 50, 3000);
  if (d === null) throw new RangeError('no se encontró d ≤ 3000 mm que resista el punzonamiento');
  return d;
}

export type EntradaZapata = {
  /** Carga axial de servicio (D+L) y mayorada, kN. */
  Pservicio: number;
  Pu: number;
  /** Presión neta admisible del suelo, kPa. */
  qaNeta: number;
  /** Lado de la columna cuadrada, mm. */
  c: number;
  fc: number;
  fy: number;
  /** Recubrimiento al centro de la barra: recubrimiento libre + db/2, mm (por defecto 75 + 8). */
  recubrimientoCentro?: number;
  /** Redondeo del lado de la zapata, m (por defecto 0.05). */
  redondeoLado?: number;
  lambda?: number;
};

export type ResultadoZapata = {
  Bcalculado: number;
  B: number;
  area: number;
  quServicio: number;
  qu: number;
  voladizo: number;
  dUnaDireccion: number;
  dDosDirecciones: number;
  dMinimoNorma: number;
  dRequerido: number;
  /** d adoptado (redondeado a 10 mm hacia arriba) y altura total h = d + recubrimiento al centro. */
  d: number;
  h: number;
  cortanteUna: { Vu: number; phiVc: number; cumple: boolean };
  cortanteDos: VerificacionDosDirecciones;
  Mu: number;
  flexion: ResultadoFlexionZapata;
};

/**
 * Diseño de una zapata cuadrada con columna cuadrada interior sometida a carga axial centrada:
 * 1) lado B por presión neta con cargas de servicio (C.15.2.2); 2) qu = Pu/B²; 3) d por cortante en una y dos direcciones
 * (C.15.5.1 → C.11.11), con d ≥ 150 mm (C.15.7); 4) Mu en la cara (C.15.4.2(a)); 5) As con φ = 0.90 y mínimo de C.10.5.4.
 * (Los pasos 1 y 2 y los despejes de d son del autor.)
 */
export function disenarZapataCuadrada(e: EntradaZapata): ResultadoZapata {
  const redondeo = e.redondeoLado ?? 0.05;
  const Bcalc = ladoZapataCuadrada(e.Pservicio, e.qaNeta);
  const B = Math.ceil(Bcalc / redondeo - 1e-9) * redondeo;
  const qu = presionUltima(e.Pu, B, B);
  const v = voladizoZapata(B, e.c);
  if (!(v > 0)) throw new RangeError('la zapata es menor que la columna');
  const d1 = dMinimoUnaDireccion({ qu, voladizo: v, fc: e.fc, lambda: e.lambda });
  const d2 = dMinimoDosDirecciones({ Pu: e.Pu, B, L: B, c1: e.c, c2: e.c, fc: e.fc, lambda: e.lambda });
  const dMin = ALTURA_MIN_SOBRE_REFUERZO_MM.suelo;
  const dReq = Math.max(d1, d2, dMin);
  const d = Math.ceil(dReq / 10) * 10;
  const rec = e.recubrimientoCentro ?? RECUBRIMIENTO_CONTRA_SUELO_MM + 8;
  const h = d + rec;
  const vu1 = cortanteUnaDireccion({ qu, ancho: B, voladizo: v, d });
  const phiVc1 = phiVcUnaDireccion({ fc: e.fc, ancho: B, d, lambda: e.lambda });
  const dos = cortanteDosDireccionesZapata({ Pu: e.Pu, B, L: B, c1: e.c, c2: e.c, d, fc: e.fc, lambda: e.lambda });
  const Mu = momentoZapataCara({ qu, ancho: B, voladizo: v });
  const flexion = asFlexionZapata({ Mu, b: B * 1000, d, h, fc: e.fc, fy: e.fy });
  return {
    Bcalculado: Bcalc,
    B,
    area: B * B,
    quServicio: e.Pservicio / (B * B),
    qu,
    voladizo: v,
    dUnaDireccion: d1,
    dDosDirecciones: d2,
    dMinimoNorma: dMin,
    dRequerido: dReq,
    d,
    h,
    cortanteUna: { Vu: vu1, phiVc: phiVc1, cumple: vu1 <= phiVc1 },
    cortanteDos: dos,
    Mu,
    flexion,
  };
}

/* ═══════════════════════ C.15.5.4 — pilotes ═══════════════════════ */

/**
 * Parte de la reacción de un pilote que produce cortante en una sección (C.15.5.4.1–3, C-142): 1 si su centro está a
 * dpile/2 o más hacia afuera; 0 si está a dpile/2 o más hacia adentro; interpolación lineal en medio.
 * `x` = distancia del centro del pilote a la sección, positiva hacia afuera (m); `dPile` en m.
 */
export function fraccionReaccionPilote(x: number, dPile: number): number {
  const m = dPile / 2;
  if (x >= m) return 1;
  if (x <= -m) return 0;
  return (x + m) / dPile;
}

/* ═══════════════════════ C.15.8 — aplastamiento y dowels ═══════════════════════ */

/**
 * A2 de la zapata (Notación C.2, C-6): base inferior del mayor tronco de pirámide contenido en la zapata con base superior
 * el área cargada A1 = c1 × c2 y pendiente 1 vertical : 2 horizontal. Lectura del autor para columna centrada: crecimiento
 * horizontal por lado Δ = mín(2 h, (B − c1)/2, (L − c2)/2); A2 = (c1 + 2Δ)(c2 + 2Δ). Unidades: mm.
 */
export function areaA2Zapata(p: { c1: number; c2: number; h: number; B: number; L: number }): number {
  const delta = Math.min(A2_PENDIENTE_HORIZONTAL_POR_VERTICAL * p.h, (p.B - p.c1) / 2, (p.L - p.c2) / 2);
  return (p.c1 + 2 * delta) * (p.c2 + 2 * delta);
}

/** Resistencia de diseño al aplastamiento φ (0.85 f′c A1) × mín(√(A2/A1), 2) (C.10.14.1, C-85; φ = 0.65 de C.9.3.2.4), kN. A en mm². */
export function resistenciaAplastamiento(fc: number, A1: number, A2?: number): { factor: number; phiBn: number } {
  const factor = A2 !== undefined && A2 > A1 ? Math.min(Math.sqrt(A2 / A1), APLASTAMIENTO_FACTOR_MAX) : 1;
  return { factor, phiBn: (PHI_APLASTAMIENTO * APLASTAMIENTO_COEF * fc * A1 * factor) / 1000 };
}

export type ResultadoInterfaz = {
  A1: number;
  A2: number;
  /** Aplastamiento del lado de la columna (sobre su propia área) y del lado de la zapata (con √(A2/A1) ≤ 2). */
  phiBnColumna: number;
  phiBnZapata: number;
  factorZapata: number;
  /** Menor de las dos: gobierna (C.15.8.1.1). */
  phiBn: number;
  cumpleAplastamiento: boolean;
  /** Fuerza de compresión que excede la resistencia al aplastamiento y debe pasar por refuerzo (C.15.8.1.2(a)), kN. */
  exceso: number;
  /** As que transmite el exceso con φ = 0.65 (autor): exceso/(φ fy), mm². */
  AsPorExceso: number;
  /** Mínimo C.15.8.2.1: 0.005 Ag de la columna, mm². */
  AsMinimo: number;
  /** As de la interfaz = máx(AsPorExceso, AsMinimo), mm². */
  As: number;
};

/**
 * Transmisión de la carga de la columna a la zapata (C.15.8.1, C.15.8.2.1): compara Pu con φBn de la columna (A1 = c1 c2,
 * f′c de la columna) y de la zapata (A2 por `areaA2Zapata`, f′c de la zapata), y dimensiona dowels para el exceso y el
 * mínimo 0.005 Ag. El φ de los dowels en compresión (0.65, C.9.3.2.2(b)) es criterio del autor: la norma no fija la
 * fórmula del área de dowels.
 */
export function interfazColumnaZapata(p: { Pu: number; c1: number; c2: number; h: number; B: number; L: number; fcColumna: number; fcZapata: number; fy: number }): ResultadoInterfaz {
  const A1 = p.c1 * p.c2;
  const A2 = areaA2Zapata(p);
  const col = resistenciaAplastamiento(p.fcColumna, A1);
  const zap = resistenciaAplastamiento(p.fcZapata, A1, A2);
  const phiBn = Math.min(col.phiBn, zap.phiBn);
  const exceso = Math.max(0, p.Pu - phiBn);
  const AsPorExceso = (exceso * 1000) / (PHI_APLASTAMIENTO * p.fy);
  const AsMinimo = AS_MIN_INTERFAZ_FRACCION_AG * A1;
  return {
    A1,
    A2,
    phiBnColumna: col.phiBn,
    phiBnZapata: zap.phiBn,
    factorZapata: zap.factor,
    phiBn,
    cumpleAplastamiento: p.Pu <= phiBn,
    exceso,
    AsPorExceso,
    AsMinimo,
    As: Math.max(AsPorExceso, AsMinimo),
  };
}

/* ═══════════════════════ C.15.11 — pilotes ═══════════════════════ */

export type CargasPilote = { D: number; L: number; E?: number };

/**
 * Verificación de las Ecs. C.15-2 a C.15-5 (C.15.11.3, C-144/C-145): esfuerzo axial de compresión ≤ coef · f′c · Ag.
 * Cargas en kN, f′c en MPa, Ag en mm². Devuelve la capacidad permitida y si cumple cada ecuación (C.15-4 y C.15-5 solo si hay E).
 */
export function verificarEsfuerzosPilote(c: CargasPilote, fc: number, Ag: number): Array<{ ec: string; demanda: number; limite: number; cumple: boolean }> {
  const L = PILOTE_LIMITES_AXIALES;
  const lim = (k: number) => (k * fc * Ag) / 1000;
  const r = [
    { ec: 'C.15-2', demanda: L.c152.factorD * c.D + L.c152.factorL * c.L, limite: lim(L.c152.limite) },
    { ec: 'C.15-3', demanda: L.c153.factorD * c.D + L.c153.factorL * c.L, limite: lim(L.c153.limite) },
  ];
  if (c.E !== undefined) {
    r.push({ ec: 'C.15-4', demanda: L.c154.factorD * c.D + L.c154.factorL * c.L + L.c154.factorE * c.E, limite: lim(L.c154.limite) });
    r.push({ ec: 'C.15-5', demanda: L.c155.factorD * c.D + L.c155.factorL * c.L + L.c155.factorE * c.E, limite: lim(L.c155.limite) });
  }
  return r.map((x) => ({ ...x, cumple: x.demanda <= x.limite }));
}

/** Ec. C.15-6 (C-145): tracción sísmica con levantamiento, −1.0 D + E ≤ 0.9 fy Ast. Devuelve Ast mínimo requerido (mm²) o 0 si no hay tracción. */
export function astTraccionPilote(D: number, E: number, fy: number): number {
  const T = PILOTE_LIMITES_AXIALES.c156.factorD * D + PILOTE_LIMITES_AXIALES.c156.factorE * E;
  return T > 0 ? (T * 1000) / (PILOTE_LIMITES_AXIALES.c156.coefAst * fy) : 0;
}

/** Cuantía longitudinal mínima y longitud armada de la Tabla C.15.11-1 para un pilote de longitud `Lpilote` (m) y área Ag (mm²). */
export function armaduraMinimaPilote(cap: CapacidadDisipacion, Lpilote: number, Ag: number): { asMin: number; longitudArmada: number; fila: (typeof TABLA_C15111)[CapacidadDisipacion] } {
  const f = TABLA_C15111[cap];
  return { asMin: f.cuantiaLongitudinalMin * Ag, longitudArmada: Math.max(f.longitudRefuerzoFraccion * Lpilote, f.longitudRefuerzoMinM), fila: f };
}

/* ═══════════════════════ C.15.13 — vigas de amarre ═══════════════════════ */

/** Dimensión mayor mínima de la viga de amarre: luz / 20 (DES), / 30 (DMO) ó / 40 (DMI) (C.15.13.3.1, C-146), misma unidad que la luz. */
export function dimensionMinimaVigaAmarre(luz: number, cap: 'DES' | 'DMO' | 'DMI'): number {
  return luz / VIGA_AMARRE_DIVISOR_LUZ[cap];
}

/** Separación máxima de estribos de la viga de amarre: mín(½ de la menor dimensión, 300 mm) (C.15.13.4, C-146), mm. */
export function separacionMaximaEstribosAmarre(menorDimensionMm: number): number {
  return Math.min(VIGA_AMARRE_ESTRIBOS.fraccionMenorDimension * menorDimensionMm, VIGA_AMARRE_ESTRIBOS.maximoMm);
}
