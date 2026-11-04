/**
 * Capítulo C.13 de la NSR-10 — Sistemas de losa en una y dos direcciones (PDF p.421–438, C-119 a C-136).
 * SI: qu en kN/m² (kPa), luces en m, momentos en kN·m, E en MPa, inercias en mm⁴.
 * Las constantes y tablas están en `src/data/losasConcreto.ts`. Lo que no es texto de la norma se marca
 * como "(autor)" en el comentario (p. ej. la expresión de los momentos por metro de ancho de franja).
 */
import {
  ABERTURA_ZONA_COMUN_COLUMNAS_FRACCION,
  BETA_T_LIMITE_TABLA,
  C139_VIGA_CORTA_FACTOR,
  COEF_UNA_DIRECCION,
  COLUMNA_C137,
  FRANJA_COLUMNA_FRACCION,
  GAMMA_F_AUMENTO,
  GAMMA_F_COEF,
  L2_SOBRE_L1_TABLAS,
  LIMITES_DISENO_DIRECTO,
  LN_MIN_FRACCION_L1,
  M_MIN_C139,
  REPARTO_VANO_INTERIOR,
  TABLA_C13633_VANO_FINAL,
  TABLA_C13641_NEG_INTERIOR,
  TABLA_C13642_NEG_EXTERIOR,
  TABLA_C13644_POSITIVO,
  TABLA_C1391_MOMENTO_NEGATIVO,
  TABLA_C1392_POSITIVO_CARGA_MUERTA,
  TABLA_C1393_POSITIVO_CARGA_VIVA,
  TABLA_C1394_REPARTO_CARGA,
  UNA_DIRECCION_LIMITES,
  VIGA_FRACCION_FRANJA_COLUMNA,
  type FilaCoef,
  type TipoVanoFinal,
} from '../../data/losasConcreto';

export type { TipoVanoFinal };

const lerp = (x: number, x0: number, x1: number, y0: number, y1: number): number => (x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));

/* ═══════════════════════ C.13.2 — franjas ═══════════════════════ */

/** Semiancho de la franja de columna a cada lado del eje: 0.25 ℓ2 ó 0.25 ℓ1, el menor (C.13.2.1, C-120), m. */
export function semianchoFranjaColumna(l1: number, l2: number): number {
  return FRANJA_COLUMNA_FRACCION * Math.min(l1, l2);
}

/** Ancho total de la franja de columna (dos semianchos, centrada en el eje de columnas), m. */
export const anchoFranjaColumna = (l1: number, l2: number): number => 2 * semianchoFranjaColumna(l1, l2);

/* ═══════════════════════ Ec. C.13-3, C.13-5 y C.13-6 ═══════════════════════ */

/** Ec. C.13-3 (C-125): αf = Ecb Ib / (Ecs Is), relación de rigideces a flexión de la viga y de la losa. */
export function alfaF(Ecb: number, Ib: number, Ecs: number, Is: number): number {
  if (!(Ecs * Is > 0)) throw new RangeError('Ecs·Is debe ser positivo');
  return (Ecb * Ib) / (Ecs * Is);
}

/** Inercia de la losa de ancho ℓ2 y espesor h (m → mm⁴): Is = ℓ2 h³ / 12 (autor; rectángulo bruto). */
export const inerciaFranjaLosa = (l2M: number, hMm: number): number => (l2M * 1000 * hMm ** 3) / 12;

/**
 * Ec. C.13-6 (C-127): C = Σ (1 − 0.63 x/y) x³ y / 3 para cada rectángulo de la sección transversal (x = lado menor,
 * y = lado mayor, mm). Para T o L se divide en rectángulos (C.13.2.4) y se suman. Resultado en mm⁴.
 */
export function constanteTorsion(rectangulos: ReadonlyArray<{ x: number; y: number }>): number {
  return rectangulos.reduce((s, r) => {
    const x = Math.min(r.x, r.y);
    const y = Math.max(r.x, r.y);
    return s + ((1 - (0.63 * x) / y) * x ** 3 * y) / 3;
  }, 0);
}

/** Ec. C.13-5 (C-127): βt = Ecb C / (2 Ecs Is). */
export function betaT(Ecb: number, C: number, Ecs: number, Is: number): number {
  if (!(Ecs * Is > 0)) throw new RangeError('Ecs·Is debe ser positivo');
  return (Ecb * C) / (2 * Ecs * Is);
}

/* ═══════════════════════ C.13.6.1 — limitaciones ═══════════════════════ */

export type EntradaLimites = {
  /** Número de vanos continuos en cada dirección. */
  vanosDireccion1: number;
  vanosDireccion2: number;
  /** Luces centro a centro del panel, m. */
  luzMayor: number;
  luzMenor: number;
  /** Luces contiguas (centro a centro) en la dirección analizada, m. */
  lucesContiguas?: number[];
  /** Desalineamiento máximo de columnas respecto del eje, como fracción de la luz (0.10 = 10 %). */
  desalineamientoFraccion?: number;
  /** Cargas no mayoradas, kN/m². */
  D: number;
  L: number;
  /** Solo cargas gravitacionales uniformes en todo el panel (C.13.6.1.5). */
  soloGravitacionalUniforme?: boolean;
  /** Si hay vigas en todos los lados del panel: αf1, αf2, ℓ1, ℓ2 para la Ec. C.13-2. */
  vigas?: { alfaF1: number; alfaF2: number; l1: number; l2: number };
};

export type ChequeoLimite = { numeral: string; descripcion: string; cumple: boolean; valor?: number };

/** Verifica las limitaciones C.13.6.1.1 a C.13.6.1.6 del método de diseño directo (C-125). */
export function verificarLimitesDisenoDirecto(e: EntradaLimites): { cumple: boolean; chequeos: ChequeoLimite[] } {
  const L = LIMITES_DISENO_DIRECTO;
  const ch: ChequeoLimite[] = [];
  ch.push({
    numeral: 'C.13.6.1.1',
    descripcion: `Mínimo ${L.vanosMinimos} vanos continuos en cada dirección`,
    cumple: e.vanosDireccion1 >= L.vanosMinimos && e.vanosDireccion2 >= L.vanosMinimos,
  });
  const rel = e.luzMayor / e.luzMenor;
  ch.push({ numeral: 'C.13.6.1.2', descripcion: `Luz mayor/menor del panel ≤ ${L.relacionLucesMax}`, cumple: rel <= L.relacionLucesMax + 1e-12, valor: rel });
  if (e.lucesContiguas && e.lucesContiguas.length > 1) {
    const mayor = Math.max(...e.lucesContiguas);
    const menor = Math.min(...e.lucesContiguas);
    const dif = (mayor - menor) / mayor;
    ch.push({
      numeral: 'C.13.6.1.3',
      descripcion: 'Luces contiguas no difieren de la luz mayor en más de 1/3',
      cumple: dif <= L.diferenciaLucesContiguasFraccion + 1e-12,
      valor: dif,
    });
  }
  if (e.desalineamientoFraccion !== undefined) {
    ch.push({
      numeral: 'C.13.6.1.4',
      descripcion: 'Desalineamiento de columnas ≤ 10 % de la luz',
      cumple: e.desalineamientoFraccion <= L.desalineamientoMaxFraccion + 1e-12,
      valor: e.desalineamientoFraccion,
    });
  }
  const ld = e.D > 0 ? e.L / e.D : Infinity;
  ch.push({
    numeral: 'C.13.6.1.5',
    descripcion: 'Solo cargas gravitacionales uniformes; L no mayorada ≤ 2 D no mayorada',
    cumple: (e.soloGravitacionalUniforme ?? true) && ld <= L.cargaVivaSobreMuertaMax + 1e-12,
    valor: ld,
  });
  if (e.vigas) {
    const v = e.vigas;
    const r = (v.alfaF1 * v.l2 ** 2) / (v.alfaF2 * v.l1 ** 2);
    const r2 = 1 / r; // la otra dirección (perpendicular) debe cumplir también
    ch.push({
      numeral: 'C.13.6.1.6 (Ec. C.13-2)',
      descripcion: `0.2 ≤ αf1 ℓ2² / (αf2 ℓ1²) ≤ 5.0 en las dos direcciones`,
      cumple: r >= L.relacionRigidezVigasMin - 1e-12 && r <= L.relacionRigidezVigasMax + 1e-12 && r2 >= L.relacionRigidezVigasMin - 1e-12 && r2 <= L.relacionRigidezVigasMax + 1e-12,
      valor: r,
    });
  }
  return { cumple: ch.every((c) => c.cumple), chequeos: ch };
}

/* ═══════════════════════ C.13.6.2 — momento estático total ═══════════════════════ */

/** ℓn mínimo utilizable en C.13-4: 0.65 ℓ1 (C.13.6.2.5, C-125), m. */
export const lnMinimo = (l1: number): number => LN_MIN_FRACCION_L1 * l1;

/** Promedio de las luces transversales adyacentes (C.13.6.2.3, C-125), m. */
export const l2Promedio = (a: number, b: number): number => (a + b) / 2;

/**
 * Ec. C.13-4 (C-125): Mo = qu ℓ2 ℓn² / 8 (kN·m). Si se pasa `l1`, ℓn se limita inferiormente a 0.65 ℓ1 (C.13.6.2.5).
 */
export function momentoEstaticoTotal(p: { qu: number; l2: number; ln: number; l1?: number }): { Mo: number; lnUsado: number; limitadoPor065: boolean } {
  const { qu, l2, ln, l1 } = p;
  if (!(qu >= 0) || !(l2 > 0) || !(ln > 0)) throw new RangeError('qu ≥ 0, ℓ2 > 0 y ℓn > 0');
  const min = l1 !== undefined ? lnMinimo(l1) : 0;
  const lnUsado = Math.max(ln, min);
  return { Mo: (qu * l2 * lnUsado ** 2) / 8, lnUsado, limitadoPor065: lnUsado > ln };
}

/** Diámetro del cuadrado equivalente de un apoyo circular de diámetro D (C.13.6.2.5): lado = D √π / 2, mm. */
export const ladoCuadradoEquivalente = (diametro: number): number => (diametro * Math.sqrt(Math.PI)) / 2;

/* ═══════════════════════ C.13.6.3 — reparto de Mo ═══════════════════════ */

export type ReparteMo = { negInterior: number; positivo: number; negExterior: number | null };

/** Reparto de Mo en un vano interior (C.13.6.3.2, C-126): 0.65 negativo, 0.35 positivo. */
export function repartoVanoInterior(Mo: number): ReparteMo {
  return { negInterior: REPARTO_VANO_INTERIOR.negativo * Mo, positivo: REPARTO_VANO_INTERIOR.positivo * Mo, negExterior: null };
}

/** Reparto de Mo en un vano final (tabla de C.13.6.3.3, C-126). */
export function repartoVanoFinal(Mo: number, tipo: TipoVanoFinal): ReparteMo {
  const f = TABLA_C13633_VANO_FINAL.find((x) => x.id === tipo);
  if (!f) throw new RangeError(`tipo de vano final desconocido: ${tipo}`);
  return { negInterior: f.negInterior * Mo, positivo: f.positivo * Mo, negExterior: f.negExterior * Mo };
}

/* ═══════════════════════ C.13.6.4 — porcentajes a la franja de columna ═══════════════════════ */

function interpL2L1(l2l1: number, valores: readonly number[]): number {
  const x = [...L2_SOBRE_L1_TABLAS];
  if (!(l2l1 >= x[0] - 1e-12 && l2l1 <= x[2] + 1e-12)) {
    throw new RangeError(`ℓ2/ℓ1 = ${l2l1} fuera del rango 0.5–2.0 de las tablas de C.13.6.4`);
  }
  if (l2l1 <= x[1]) return lerp(l2l1, x[0], x[1], valores[0], valores[1]);
  return lerp(l2l1, x[1], x[2], valores[1], valores[2]);
}

const acotarAlfa = (alfaL: number): number => Math.min(1, Math.max(0, alfaL));

/**
 * C.13.6.4.1 (C-126): % del momento negativo interior que toma la franja de columna. `alfaL` = αf1 ℓ2/ℓ1.
 * Interpolación lineal en ℓ2/ℓ1 (0.5–2.0) y en αf1ℓ2/ℓ1 entre 0 y 1.0 (≥ 1.0 usa la fila ≥ 1.0).
 */
export function pctFranjaColumnaNegInterior(l2l1: number, alfaL: number): number {
  const v0 = interpL2L1(l2l1, TABLA_C13641_NEG_INTERIOR.alfa0);
  const v1 = interpL2L1(l2l1, TABLA_C13641_NEG_INTERIOR.alfa1);
  return v0 + (v1 - v0) * acotarAlfa(alfaL);
}

/**
 * C.13.6.4.2 (C-127): % del momento negativo exterior que toma la franja de columna. Además de ℓ2/ℓ1 y αf1ℓ2/ℓ1 se
 * interpola en βt entre 0 y 2.5 (≥ 2.5 usa la fila "βt ≥ 2.5").
 */
export function pctFranjaColumnaNegExterior(l2l1: number, alfaL: number, bt: number): number {
  const t = Math.min(1, Math.max(0, bt / BETA_T_LIMITE_TABLA));
  const fila = (f: { bt0: readonly number[]; bt25: readonly number[] }) => {
    const a = interpL2L1(l2l1, f.bt0);
    const b = interpL2L1(l2l1, f.bt25);
    return a + (b - a) * t;
  };
  const v0 = fila(TABLA_C13642_NEG_EXTERIOR.alfa0);
  const v1 = fila(TABLA_C13642_NEG_EXTERIOR.alfa1);
  return v0 + (v1 - v0) * acotarAlfa(alfaL);
}

/** C.13.6.4.4 (C-127): % del momento positivo que toma la franja de columna. */
export function pctFranjaColumnaPositivo(l2l1: number, alfaL: number): number {
  const v0 = interpL2L1(l2l1, TABLA_C13644_POSITIVO.alfa0);
  const v1 = interpL2L1(l2l1, TABLA_C13644_POSITIVO.alfa1);
  return v0 + (v1 - v0) * acotarAlfa(alfaL);
}

/**
 * C.13.6.5.1–2 (C-127): fracción (0–1) del momento de la franja de columna que resisten las vigas entre apoyos:
 * 0.85 si αf1ℓ2/ℓ1 ≥ 1.0; interpolación lineal entre 0.85 y 0 para valores entre 1.0 y 0.
 */
export function fraccionDeVigas(alfaL: number): number {
  return VIGA_FRACCION_FRANJA_COLUMNA * acotarAlfa(alfaL);
}

/* ═══════════════════════ Método de diseño directo completo para un panel ═══════════════════════ */

export type EntradaDisenoDirecto = {
  qu: number;
  l1: number;
  l2: number;
  ln: number;
  /** 'interior' o uno de los cinco casos de vano final. */
  vano: 'interior' | TipoVanoFinal;
  /** αf1 de las vigas en la dirección ℓ1 (0 si no hay vigas). */
  alfaF1?: number;
  /** βt de la viga de borde o franja torsional (Ec. C.13-5); solo para vanos finales. */
  betaT?: number;
};

export type MomentosFranja = { negInterior: number; positivo: number; negExterior: number | null };

export type ResultadoDisenoDirecto = {
  Mo: number;
  lnUsado: number;
  l2l1: number;
  alfaL: number;
  /** Momentos totales de la sección crítica (todo el ancho ℓ2 del pórtico), kN·m. */
  total: MomentosFranja;
  /** % tomado por la franja de columna. */
  pct: { negInterior: number; positivo: number; negExterior: number | null };
  franjaColumna: MomentosFranja;
  /** Suma de las dos mitades de franja central (C.13.6.6, C-127). */
  franjaCentral: MomentosFranja;
  /** Parte de la franja de columna que toman las vigas entre apoyos (C.13.6.5) y parte que queda para la losa (C.13.6.4.5). */
  vigas: { fraccion: number; momentos: MomentosFranja };
  losaEnFranjaColumna: MomentosFranja;
  /** Ancho de franja de columna y de franja central, m (autor: para expresar momentos por metro). */
  anchoColumna: number;
  anchoCentral: number;
};

const mult = (m: MomentosFranja, f: (clave: keyof MomentosFranja) => number): MomentosFranja => ({
  negInterior: m.negInterior * f('negInterior'),
  positivo: m.positivo * f('positivo'),
  negExterior: m.negExterior === null ? null : m.negExterior * f('negExterior'),
});

/**
 * Método de diseño directo, C.13.6.2 a C.13.6.6: Mo (C.13-4) → reparto (C.13.6.3) → franja de columna (C.13.6.4) →
 * vigas (C.13.6.5) → franja central por diferencia (C.13.6.6.1). No verifica las limitaciones (ver
 * `verificarLimitesDisenoDirecto`).
 */
export function disenoDirectoPanel(e: EntradaDisenoDirecto): ResultadoDisenoDirecto {
  const { Mo, lnUsado } = momentoEstaticoTotal({ qu: e.qu, l2: e.l2, ln: e.ln, l1: e.l1 });
  const l2l1 = e.l2 / e.l1;
  const alfaL = (e.alfaF1 ?? 0) * l2l1;
  const total = e.vano === 'interior' ? repartoVanoInterior(Mo) : repartoVanoFinal(Mo, e.vano);
  const pNegInt = pctFranjaColumnaNegInterior(l2l1, alfaL);
  const pPos = pctFranjaColumnaPositivo(l2l1, alfaL);
  const pNegExt = total.negExterior === null ? null : pctFranjaColumnaNegExterior(l2l1, alfaL, e.betaT ?? 0);
  const pct = { negInterior: pNegInt, positivo: pPos, negExterior: pNegExt };
  const fc = (c: keyof MomentosFranja) => (pct[c] ?? 0) / 100;
  const franjaColumna = mult(total, fc);
  const franjaCentral = mult(total, (c) => 1 - fc(c));
  const fv = fraccionDeVigas(alfaL);
  const vigas = { fraccion: fv, momentos: mult(franjaColumna, () => fv) };
  const losaEnFranjaColumna = mult(franjaColumna, () => 1 - fv);
  const anchoColumna = anchoFranjaColumna(e.l1, e.l2);
  return { Mo, lnUsado, l2l1, alfaL, total, pct, franjaColumna, franjaCentral, vigas, losaEnFranjaColumna, anchoColumna, anchoCentral: e.l2 - anchoColumna };
}

/* ═══════════════════════ C.13.6.9 — columnas ═══════════════════════ */

/**
 * Ec. C.13-7 (C.13.6.9.2, C-128): M = 0.07 [ (qDu + 0.5 qLu) ℓ2 ℓn² − q′Du ℓ′2 (ℓ′n)² ], kN·m. Los datos con prima son
 * los del vano más corto.
 */
export function momentoColumnaInterior(p: { qDu: number; qLu: number; l2: number; ln: number; qDuP: number; l2P: number; lnP: number }): number {
  return COLUMNA_C137.coef * ((p.qDu + COLUMNA_C137.factorQLu * p.qLu) * p.l2 * p.ln ** 2 - p.qDuP * p.l2P * p.lnP ** 2);
}

/* ═══════════════════════ C.13.5.3 — transferencia de momento ═══════════════════════ */

/** Ec. C.13-1 (C-123): γf = 1 / (1 + (2/3) √(b1/b2)), fracción del momento no balanceado transmitida por flexión. */
export function gammaF(b1: number, b2: number): number {
  return 1 / (1 + GAMMA_F_COEF * Math.sqrt(b1 / b2));
}

export type CasoGammaF = 'borde-paralelo' | 'esquina' | 'interior-o-borde-perpendicular';

/**
 * C.13.5.3.3 (C-123): γf aumentado en losas no preesforzadas. `VuSobrePhiVc` = Vu / (φVc) con Vc de C.11.11.2.1.
 * - borde-paralelo: γf = 1.0 si Vu ≤ 0.75 φVc; esquina: γf = 1.0 si Vu ≤ 0.5 φVc;
 * - interior-o-borde-perpendicular: hasta 1.25 γf (sin pasar de 1.0) si Vu ≤ 0.4 φVc y εt ≥ 0.010.
 * Si no se cumple la condición se devuelve el valor de la Ec. C.13-1.
 */
export function gammaFAumentado(p: { b1: number; b2: number; caso: CasoGammaF; VuSobrePhiVc: number; epsilonT?: number }): { gammaF: number; aumentado: boolean } {
  const base = gammaF(p.b1, p.b2);
  const A = GAMMA_F_AUMENTO;
  if (p.caso === 'borde-paralelo' && p.VuSobrePhiVc <= A.bordeVuMaxBorde) return { gammaF: 1, aumentado: true };
  if (p.caso === 'esquina' && p.VuSobrePhiVc <= A.bordeVuMaxEsquina) return { gammaF: 1, aumentado: true };
  if (p.caso === 'interior-o-borde-perpendicular' && p.VuSobrePhiVc <= A.interiorVuMax && (p.epsilonT ?? 0) >= A.interiorEpsilonTMin) {
    return { gammaF: Math.min(1, A.interiorFactor * base), aumentado: true };
  }
  return { gammaF: base, aumentado: false };
}

/* ═══════════════════════ C.13.5.5 — una dirección ═══════════════════════ */

export type EntradaUnaDireccion = {
  vanos: number;
  /** Luces libres de los vanos adyacentes (mayor y menor), para verificar el 20 %. */
  lucesLibres?: number[];
  cargaUniforme?: boolean;
  L: number;
  D: number;
  prismaticos?: boolean;
};

/** Condiciones (a) a (e) de C.13.5.5.3 (C-124) para usar los coeficientes aproximados. */
export function puedeUsarCoeficientesUnaDireccion(e: EntradaUnaDireccion): { cumple: boolean; motivos: string[] } {
  const motivos: string[] = [];
  if (e.vanos < UNA_DIRECCION_LIMITES.minimoVanos) motivos.push('(a) debe haber dos o más vanos');
  if (e.lucesLibres && e.lucesLibres.length > 1) {
    const mayor = Math.max(...e.lucesLibres);
    const menor = Math.min(...e.lucesLibres);
    if (mayor > UNA_DIRECCION_LIMITES.vanoMayorSobreMenorMax * menor + 1e-12) motivos.push('(b) el vano mayor excede en más de 20 % al menor');
  }
  if (e.cargaUniforme === false) motivos.push('(c) las cargas deben ser uniformemente distribuidas');
  if (e.D > 0 ? e.L > UNA_DIRECCION_LIMITES.carga_L_sobre_D_max * e.D + 1e-12 : e.L > 0) motivos.push('(d) L no mayorada excede 3 veces D no mayorada');
  if (e.prismaticos === false) motivos.push('(e) los elementos deben ser prismáticos');
  return { cumple: motivos.length === 0, motivos };
}

/** Momentos y cortantes aproximados de C.13.5.5.3 (C-124): wu ℓn² / divisor; con ℓn promedio en momentos negativos. */
export function momentoUnaDireccion(wu: number, ln: number, divisor: number): number {
  return (wu * ln * ln) / divisor;
}

export const cortantePrimerApoyoInterior = (wu: number, ln: number): number => (COEF_UNA_DIRECCION.cortantePrimerApoyoInterior * wu * ln) / 2;
export const cortanteDemasApoyos = (wu: number, ln: number): number => (COEF_UNA_DIRECCION.cortanteDemasApoyos * wu * ln) / 2;

/* ═══════════════════════ C.13.4 — aberturas ═══════════════════════ */

/** Abertura máxima en la zona común de dos franjas de columna: 1/8 del ancho de la franja de columna (C.13.4.2.2, C-122), m. */
export const aberturaMaximaZonaComunColumnas = (anchoFranjaColumnaM: number): number => ABERTURA_ZONA_COMUN_COLUMNAS_FRACCION * anchoFranjaColumnaM;

/* ═══════════════════════ C.13.9 — método de coeficientes ═══════════════════════ */

export type TablaC139 = 'negativo' | 'positivo-D' | 'positivo-L' | 'reparto';

const TABLAS_C139: Record<TablaC139, readonly FilaCoef[]> = {
  negativo: TABLA_C1391_MOMENTO_NEGATIVO,
  'positivo-D': TABLA_C1392_POSITIVO_CARGA_MUERTA,
  'positivo-L': TABLA_C1393_POSITIVO_CARGA_VIVA,
  reparto: TABLA_C1394_REPARTO_CARGA,
};

/** Filas de las tablas C.13.9 ordenadas de m = 1.00 a 0.50. */
function filaInterpolada(tabla: TablaC139, caso: number, m: number): { a: number | null; b: number | null } {
  if (!Number.isInteger(caso) || caso < 1 || caso > 9) throw new RangeError('el caso debe ser un entero de 1 a 9');
  if (!(m >= M_MIN_C139 - 1e-12 && m <= 1 + 1e-12)) throw new RangeError('m = ℓna/ℓnb debe estar entre 0.50 y 1.00');
  const filas = TABLAS_C139[tabla];
  const i = Math.min(filas.length - 2, Math.max(0, Math.floor((1 - m) / 0.05 + 1e-9)));
  const f0 = filas[i];
  const f1 = filas[i + 1];
  const interp = (v0: number | null, v1: number | null): number | null => (v0 === null || v1 === null ? null : lerp(m, f0.m, f1.m, v0, v1));
  return { a: interp(f0.a[caso - 1], f1.a[caso - 1]), b: interp(f0.b[caso - 1], f1.b[caso - 1]) };
}

/**
 * Coeficientes (Ca, Cb) de las Tablas C.13.9-1 a C.13.9-4 para un caso (1–9) y m = ℓna/ℓnb (0.50–1.00). Para valores de m
 * que no están en la tabla (múltiplos de 0.05) se interpola linealmente (autor: la norma no lo dice, pero es la práctica
 * usual). `null` = celda vacía en el PDF (no hay momento negativo en esa dirección).
 */
export function coeficientesC139(tabla: TablaC139, caso: number, m: number): { a: number | null; b: number | null } {
  return filaInterpolada(tabla, caso, m);
}

/** Si m < 0.5 la losa se diseña como en una dirección y el refuerzo negativo paralelo a la luz larga corresponde a m = 0.5 (C.13.9.3, C-131). */
export const usarComoUnaDireccionC139 = (m: number): boolean => m < M_MIN_C139;

export type ResultadoC139 = {
  caso: number;
  m: number;
  /** Momentos por unidad de ancho de la franja central, kN·m/m (Ecs. C.13-8 y C.13-9). */
  negativoA: number | null;
  negativoB: number | null;
  positivoA: number;
  positivoB: number;
  /** Fracción de qu en cada dirección (Tabla C.13.9-4). */
  qa: number;
  qb: number;
};

/**
 * Ecs. C.13-8 y C.13-9 (C-131/C-132): Mas = Ca,j qj ℓna², Mbs = Cb,j qj ℓnb². Negativo con qu = 1.2 qDu + 1.6 qLu
 * (Tabla C.13.9-1); positivo = Ca,D qDu ℓ² + Ca,L qLu ℓ² (suma de las Tablas C.13.9-2 y -3, lectura usual del autor).
 * lna = luz libre corta, lnb = luz libre larga (m); qDu y qLu mayoradas (kN/m²). Momentos de la franja central.
 */
export function momentosC139(p: { caso: number; lna: number; lnb: number; qDu: number; qLu: number }): ResultadoC139 {
  const m = p.lna / p.lnb;
  const qu = p.qDu + p.qLu;
  const neg = coeficientesC139('negativo', p.caso, m);
  const pd = coeficientesC139('positivo-D', p.caso, m);
  const pl = coeficientesC139('positivo-L', p.caso, m);
  const rep = coeficientesC139('reparto', p.caso, m);
  return {
    caso: p.caso,
    m,
    negativoA: neg.a === null ? null : neg.a * qu * p.lna ** 2,
    negativoB: neg.b === null ? null : neg.b * qu * p.lnb ** 2,
    positivoA: (pd.a ?? 0) * p.qDu * p.lna ** 2 + (pl.a ?? 0) * p.qLu * p.lna ** 2,
    positivoB: (pd.b ?? 0) * p.qDu * p.lnb ** 2 + (pl.b ?? 0) * p.qLu * p.lnb ** 2,
    qa: rep.a ?? 0,
    qb: rep.b ?? 0,
  };
}

/** Carga equivalente uniforme mínima sobre la viga que salva la luz corta: qu ℓna / 3 (C.13.9.10.1, C-132), kN/m. */
export const cargaMinimaVigaCorta = (qu: number, lna: number): number => C139_VIGA_CORTA_FACTOR * qu * lna;
