/**
 * NSR-10 B.6.5 — Método 2 (Procedimiento analítico) de viento: parámetros de diseño.
 * Cubre B.6.5.3 a B.6.5.10: velocidad básica, Kd, I, exposición (Kz), topografía (Kzt),
 * factor de efecto ráfaga (G, Gf) y presión por velocidad qz.
 *
 * Unidades del SI como la norma: V en m/s, alturas y longitudes en m, presiones en N/m² (Pa).
 * Tablas en `src/data/vientoAnalitico.ts`. Página impresa "B-n" = página PDF n − 219.
 */
import {
  H_MIN_TOPOGRAFIA,
  PARAMETROS_TOPOGRAFIA,
  REGIONES_VELOCIDAD_BASICA,
  TABLA_B651_FACTOR_IMPORTANCIA,
  TABLA_B652_CONSTANTES,
  TABLA_B653_KZ,
  TABLA_B654_KD,
  TABLA_K2,
  TABLA_K3,
  TABLA_K1_EXPOSICION_C,
  Z_MIN_KZ,
  Z_MIN_KZ_B_CASO_1,
  type FormaTopografica,
  type GrupoUsoViento,
} from '../../data/vientoAnalitico';

export type Exposicion = 'B' | 'C' | 'D';
export type { FormaTopografica, GrupoUsoViento };

/** Interpolación lineal en una tabla ordenada [x, y...]; fuera del rango se satura (no extrapola). */
function interpolar(tabla: readonly (readonly number[])[], x: number, col: number): number {
  if (x <= tabla[0][0]) return tabla[0][col];
  const ultima = tabla[tabla.length - 1];
  if (x >= ultima[0]) return ultima[col];
  for (let i = 1; i < tabla.length; i++) {
    const a = tabla[i - 1];
    const b = tabla[i];
    if (x <= b[0]) return a[col] + ((b[col] - a[col]) * (x - a[0])) / (b[0] - a[0]);
  }
  return ultima[col];
}

/* ------------------------------------------------------------------------------------------------
 * B.6.5.4 / B.6.5.5 — Velocidad básica, Kd e I
 * ---------------------------------------------------------------------------------------------- */

/** Velocidad básica V (m/s) de la región 1 a 5 de la Figura B.6.4-1 (PDF p.258, B-39). */
export function velocidadBasicaRegion(region: 1 | 2 | 3 | 4 | 5): number {
  const r = REGIONES_VELOCIDAD_BASICA.find((x) => x.region === region);
  if (!r) throw new RangeError(`Región de viento inválida: ${region}`);
  return r.ms;
}

/** Factor de direccionalidad Kd (Tabla B.6.5-4, B-82) por id de fila de `TABLA_B654_KD`. */
export function factorDireccionalidad(id: string): number {
  const f = TABLA_B654_KD.find((x) => x.id === id);
  if (!f) throw new RangeError(`Tipo de estructura desconocido para Kd: ${id}`);
  return f.kd;
}

/**
 * Factor de importancia I para viento (Tabla B.6.5-1, B-79).
 * @param grupo grupo de uso I a IV (A.2.5)
 * @param regionHuracanes `true` para regiones con posibilidad de huracanes y V > 45 m/s (segunda columna).
 */
export function factorImportanciaViento(grupo: GrupoUsoViento, regionHuracanes = false): number {
  const f = TABLA_B651_FACTOR_IMPORTANCIA[grupo];
  return regionHuracanes ? f.huracanes : f.noHuracanes;
}

/* ------------------------------------------------------------------------------------------------
 * B.6.5.6 — Exposición: Kz / Kh
 * ---------------------------------------------------------------------------------------------- */

/** Caso de la Tabla B.6.5-3: 1 = componentes y revestimientos (y SPRFV de edificios bajos, Fig. B.6.5-7); 2 = SPRFV en general. */
export type CasoKz = 1 | 2;

/**
 * Coeficiente de exposición para la presión por velocidad Kz (o Kh si z = h), calculado con las
 * ecuaciones de la nota 2 de la Tabla B.6.5-3 (B-81):
 *
 *   Kz = 2.01 · (z / zg)^(2/α)        para 4.0 m ≤ z ≤ zg
 *   Kz = 2.01 · (4.0 / zg)^(2/α)      para z < 4.0 m
 *
 * `α` y `zg` salen de la Tabla B.6.5-2. Para el caso 1 en exposición B, z no se toma menor que 9.0 m.
 *
 * @param exposicion categoría de exposición B, C o D (B.6.5.6.3)
 * @param z altura sobre el terreno, en m (0 ≤ z ≤ zg)
 * @param caso 1 o 2 de la Tabla B.6.5-3 (por defecto 2; solo cambia el resultado en exposición B con z < 9 m)
 * @returns Kz adimensional
 */
export function kz(exposicion: Exposicion, z: number, caso: CasoKz = 2): number {
  const { alfa, zg } = TABLA_B652_CONSTANTES[exposicion];
  if (!Number.isFinite(z) || z < 0) throw new RangeError('La altura z debe ser un número no negativo.');
  if (z > zg) throw new RangeError(`z = ${z} m excede zg = ${zg} m de la exposición ${exposicion}: fuera del alcance de la ecuación.`);
  let zEf = Math.max(z, Z_MIN_KZ);
  if (exposicion === 'B' && caso === 1) zEf = Math.max(zEf, Z_MIN_KZ_B_CASO_1);
  return 2.01 * Math.pow(zEf / zg, 2 / alfa);
}

/**
 * Kz leído de la Tabla B.6.5-3 (B-81) con interpolación lineal entre alturas (nota 4).
 * Para z menor que la primera fila (4.5 m) se usa el valor de la primera fila. Para z > 152 m lanza RangeError.
 * Útil para contrastar con `kz()`: ambos difieren en pocos centésimos porque la tabla está redondeada.
 */
export function kzTabla(exposicion: Exposicion, z: number, caso: CasoKz = 2): number {
  if (!Number.isFinite(z) || z < 0) throw new RangeError('La altura z debe ser un número no negativo.');
  const maxZ = TABLA_B653_KZ[TABLA_B653_KZ.length - 1].z;
  if (z > maxZ) throw new RangeError(`z = ${z} m excede la última altura tabulada (${maxZ} m).`);
  const tabla = TABLA_B653_KZ.map((f) => [f.z, f.B1, f.B2, f.C, f.D] as const);
  const col = exposicion === 'B' ? (caso === 1 ? 1 : 2) : exposicion === 'C' ? 3 : 4;
  return interpolar(tabla, z, col);
}

/** Perfil de Kz y qz con la altura para trazar gráficas (z en m, qz en N/m²). */
export function perfilKz(
  exposicion: Exposicion,
  zMax: number,
  opciones: { V: number; Kzt?: number; Kd?: number; I?: number; caso?: CasoKz; n?: number },
): { z: number; kz: number; qz: number }[] {
  const n = opciones.n ?? 60;
  const { zg } = TABLA_B652_CONSTANTES[exposicion];
  const tope = Math.min(zMax, zg);
  const puntos: { z: number; kz: number; qz: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const z = (tope * i) / n;
    const k = kz(exposicion, z, opciones.caso ?? 2);
    puntos.push({ z, kz: k, qz: presionVelocidad({ V: opciones.V, Kz: k, Kzt: opciones.Kzt, Kd: opciones.Kd, I: opciones.I }) });
  }
  return puntos;
}

/* ------------------------------------------------------------------------------------------------
 * B.6.5.7 — Efectos topográficos: Kzt
 * ---------------------------------------------------------------------------------------------- */

/** Ecuación B.6.5-1: Kzt = (1 + K1·K2·K3)². */
export function kztDesdeMultiplicadores(k1: number, k2: number, k3: number): number {
  return Math.pow(1 + k1 * k2 * k3, 2);
}

export type EntradaTopografia = {
  forma: FormaTopografica;
  exposicion: Exposicion;
  /** Altura de la colina o escarpe sobre el terreno de barlovento, en m. */
  H: number;
  /** Distancia horizontal hacia barlovento desde la cresta hasta donde la altura del terreno es H/2, en m. */
  Lh: number;
  /** Distancia horizontal desde la cresta hasta el sitio del edificio, en m (se usa su valor absoluto). */
  x: number;
  /** Altura sobre el nivel del terreno local, en m (para Kzt a la altura z de interés). */
  z: number;
  /** Lado de la cresta donde está el edificio (afecta μ en escarpes). Por defecto 'barlovento'. */
  lado?: 'barlovento' | 'sotavento';
  /** Si es `true`, calcula Kzt aunque no se cumplan las condiciones numéricas de B.6.5.7.1 (d) y (e). */
  ignorarCondiciones?: boolean;
};

export type ResultadoTopografia = {
  k1: number;
  k2: number;
  k3: number;
  /** Factor topográfico a usar (1.0 si no se cumplen las condiciones y no se ignoran). */
  kzt: number;
  /** Kzt que resultaría de K1·K2·K3, aunque las condiciones no se cumplan. */
  kztCalculado: number;
  /** H/Lh efectivo para K1 (limitado a 0.5, nota 2 de la Figura B.6.5-1). */
  hLhK1: number;
  /** Lh efectivo para K2 y K3 (se sustituye por 2H si H/Lh > 0.5). */
  lhEfectivo: number;
  /** ¿Se cumplen las condiciones numéricas (d) H/Lh ≥ 0.2 y (e) H mínima de B.6.5.7.1? */
  cumpleCondiciones: boolean;
  avisos: string[];
};

/**
 * Factor topográfico Kzt (B.6.5.7.2, Figura B.6.5-1; B-30, B-47 y B-48), con las ecuaciones de la figura:
 *
 *   K1 = (K1 / (H/Lh)) · (H/Lh)          [coeficiente por forma y exposición; Tabla de parámetros]
 *   K2 = 1 − |x| / (μ·Lh)                 [mínimo 0]
 *   K3 = e^(−γ·z/Lh)
 *   Kzt = (1 + K1·K2·K3)²                 (B.6.5-1)
 *
 * Nota 2 de la figura: si H/Lh > 0.5 se usa H/Lh = 0.5 para K1 y se sustituye Lh por 2H en K2 y K3.
 * Solo verifica numéricamente (d) H/Lh ≥ 0.2 y (e) H ≥ 4.5 m (exposición C y D) o 18 m (B); las condiciones (a), (b) y (c)
 * (aislamiento de la colina y posición en la mitad superior) las debe juzgar el diseñador.
 */
export function factorTopografico(e: EntradaTopografia): ResultadoTopografia {
  const { H, Lh, x, z } = e;
  if (!(H > 0) || !(Lh > 0)) throw new RangeError('H y Lh deben ser positivos.');
  const par = PARAMETROS_TOPOGRAFIA[e.forma];
  const hLh = H / Lh;
  const hLhK1 = Math.min(hLh, 0.5);
  const lhEfectivo = hLh > 0.5 ? 2 * H : Lh;
  const mu = e.forma === 'escarpe2D' && e.lado === 'sotavento' ? par.muSotavento : par.muBarlovento;
  const k1 = par.k1PorHLh[e.exposicion] * hLhK1;
  const k2 = Math.max(0, 1 - Math.abs(x) / (mu * lhEfectivo));
  const k3 = Math.exp((-par.gamma * Math.max(0, z)) / lhEfectivo);
  const kztCalculado = kztDesdeMultiplicadores(k1, k2, k3);
  const avisos: string[] = [];
  const cumpleHLh = hLh >= 0.2;
  const cumpleH = H >= H_MIN_TOPOGRAFIA[e.exposicion];
  if (!cumpleHLh) avisos.push('H/Lh < 0.2: no se cumple B.6.5.7.1 (d); Kzt = 1.0.');
  if (!cumpleH) avisos.push(`H < ${H_MIN_TOPOGRAFIA[e.exposicion]} m para la exposición ${e.exposicion}: no se cumple B.6.5.7.1 (e); Kzt = 1.0.`);
  if (hLh > 0.5) avisos.push('H/Lh > 0.5: se usó H/Lh = 0.5 en K1 y Lh = 2H en K2 y K3 (nota 2).');
  const cumpleCondiciones = cumpleHLh && cumpleH;
  return {
    k1,
    k2,
    k3,
    kztCalculado,
    kzt: cumpleCondiciones || e.ignorarCondiciones ? kztCalculado : 1,
    hLhK1,
    lhEfectivo,
    cumpleCondiciones,
    avisos,
  };
}

/** K1 tabulado para exposición C (Figura B.6.5-1, B-47) con interpolación lineal; solo para contraste con `factorTopografico`. */
export function k1TablaExposicionC(forma: FormaTopografica, hLh: number): number {
  const col = forma === 'loma2D' ? 1 : forma === 'escarpe2D' ? 2 : 3;
  return interpolar(TABLA_K1_EXPOSICION_C, hLh, col);
}

/** K2 tabulado (Figura B.6.5-1, B-47) con interpolación lineal; `escarpeSotavento` selecciona la columna "Escarpe 2-D". */
export function k2Tabla(xLh: number, escarpeSotavento = false): number {
  return interpolar(TABLA_K2, Math.abs(xLh), escarpeSotavento ? 1 : 2);
}

/** K3 tabulado (Figura B.6.5-1, B-47) con interpolación lineal. */
export function k3Tabla(zLh: number, forma: FormaTopografica): number {
  const col = forma === 'loma2D' ? 1 : forma === 'escarpe2D' ? 2 : 3;
  return interpolar(TABLA_K3, zLh, col);
}

/* ------------------------------------------------------------------------------------------------
 * B.6.5.8 — Factor de efecto ráfaga
 * ---------------------------------------------------------------------------------------------- */

/** Valor simplificado permitido para estructuras rígidas (B.6.5.8.1). */
export const G_RIGIDO_SIMPLIFICADO = 0.85;
/** gQ = gv = 3.4 (B.6.5.8.1 y B.6.5.8.2). */
export const G_PICO = 3.4;

/** Altura equivalente z̄ = máx(0.6·h, zmin) (B.6.5.8.1; zmin de la Tabla B.6.5-2). */
export function alturaEquivalente(exposicion: Exposicion, h: number): number {
  return Math.max(0.6 * h, TABLA_B652_CONSTANTES[exposicion].zmin);
}

/** Intensidad de turbulencia a la altura z̄: Iz̄ = c·(10/z̄)^(1/6) (B.6.5-3). */
export function intensidadTurbulencia(exposicion: Exposicion, zBarra: number): number {
  return TABLA_B652_CONSTANTES[exposicion].c * Math.pow(10 / zBarra, 1 / 6);
}

/** Longitud integral de escala de la turbulencia Lz̄ = ℓ·(z̄/10)^ε̄, en m (B.6.5-5). */
export function longitudEscala(exposicion: Exposicion, zBarra: number): number {
  const { ell, epsBar } = TABLA_B652_CONSTANTES[exposicion];
  return ell * Math.pow(zBarra / 10, epsBar);
}

/** Respuesta del entorno Q = 1 / √(1 + 0.62·((B+h)/Lz̄)^0.63) (B.6.5-4, coeficiente 0.62 como en el PDF). */
export function respuestaEntorno(B: number, h: number, lzBarra: number): number {
  return 1 / Math.sqrt(1 + 0.62 * Math.pow((B + h) / lzBarra, 0.63));
}

export type ResultadoRafagaRigido = {
  /** Factor de efecto ráfaga calculado con B.6.5-2. */
  G: number;
  zBarra: number;
  Iz: number;
  Lz: number;
  Q: number;
};

/**
 * Factor de efecto ráfaga G para estructuras rígidas (B.6.5.8.1, ecuaciones B.6.5-2 a B.6.5-5; B-30):
 *
 *   G = 0.925 · (1 + 1.7·gQ·Iz̄·Q) / (1 + 1.7·gv·Iz̄),  con gQ = gv = 3.4
 *
 * @param exposicion categoría de exposición B, C o D
 * @param h altura media de la cubierta (m)
 * @param B dimensión horizontal del edificio normal a la dirección del viento (m)
 * @returns G y las variables intermedias. La norma también permite tomar G = 0.85 (`G_RIGIDO_SIMPLIFICADO`).
 */
export function factorRafagaRigido(p: { exposicion: Exposicion; h: number; B: number }): ResultadoRafagaRigido {
  const zBarra = alturaEquivalente(p.exposicion, p.h);
  const Iz = intensidadTurbulencia(p.exposicion, zBarra);
  const Lz = longitudEscala(p.exposicion, zBarra);
  const Q = respuestaEntorno(p.B, p.h, Lz);
  const G = 0.925 * ((1 + 1.7 * G_PICO * Iz * Q) / (1 + 1.7 * G_PICO * Iz));
  return { G, zBarra, Iz, Lz, Q };
}

/** Factor de respuesta de resonancia R_ℓ (B.6.5-11a y 11b) para η dado. */
export function respuestaResonanciaRl(eta: number): number {
  if (eta <= 0) return 1;
  return 1 / eta - (1 - Math.exp(-2 * eta)) / (2 * eta * eta);
}

export type ResultadoRafagaFlexible = {
  Gf: number;
  gR: number;
  R: number;
  Rn: number;
  Rh: number;
  RB: number;
  RL: number;
  N1: number;
  Vz: number;
  zBarra: number;
  Iz: number;
  Lz: number;
  Q: number;
};

/**
 * Factor de efecto ráfaga Gf para estructuras flexibles o dinámicamente sensibles
 * (B.6.5.8.2, ecuaciones B.6.5-6 a B.6.5-12; B-30 y B-31):
 *
 *   Gf = 0.925 · (1 + 1.7·Iz̄·√(gQ²Q² + gR²R²)) / (1 + 1.7·gv·Iz̄)
 *   gR = √(2·ln(3600·n1)) + 0.577 / √(2·ln(3600·n1))
 *   R  = √( (1/β) · Rn·Rh·RB·(0.53 + 0.47·RL) )
 *   Rn = 7.47·N1 / (1 + 10.3·N1)^(5/3),   N1 = n1·Lz̄ / Vz̄
 *   Vz̄ = b̄·(z̄/10)^ᾱ·V
 *
 * Rh, RB y RL son R_ℓ con η = 4.6·n1·h/Vz̄, 4.6·n1·B/Vz̄ y 15.4·n1·L/Vz̄ (el PDF imprime "EB" en la segunda;
 * se interpreta como B, por analogía con la norma de origen).
 *
 * @param p.n1 frecuencia natural del edificio (Hz)
 * @param p.beta amortiguamiento crítico como fracción (0.01 = 1 %); el PDF dice "porcentaje" pero la ecuación exige la fracción
 * @param p.V velocidad básica del viento (m/s)
 * @param p.B dimensión horizontal normal al viento (m)
 * @param p.L dimensión horizontal paralela al viento (m)
 */
export function factorRafagaFlexible(p: {
  exposicion: Exposicion;
  h: number;
  B: number;
  L: number;
  n1: number;
  beta: number;
  V: number;
}): ResultadoRafagaFlexible {
  if (!(p.n1 > 0) || !(p.beta > 0) || !(p.V > 0)) throw new RangeError('n1, β y V deben ser positivos.');
  const c = TABLA_B652_CONSTANTES[p.exposicion];
  const zBarra = alturaEquivalente(p.exposicion, p.h);
  const Iz = intensidadTurbulencia(p.exposicion, zBarra);
  const Lz = longitudEscala(p.exposicion, zBarra);
  const Q = respuestaEntorno(p.B, p.h, Lz);
  const Vz = c.bBar * Math.pow(zBarra / 10, c.alfaBar) * p.V;
  const N1 = (p.n1 * Lz) / Vz;
  const Rn = (7.47 * N1) / Math.pow(1 + 10.3 * N1, 5 / 3);
  const Rh = respuestaResonanciaRl((4.6 * p.n1 * p.h) / Vz);
  const RB = respuestaResonanciaRl((4.6 * p.n1 * p.B) / Vz);
  const RL = respuestaResonanciaRl((15.4 * p.n1 * p.L) / Vz);
  const R = Math.sqrt((1 / p.beta) * Rn * Rh * RB * (0.53 + 0.47 * RL));
  const raiz = Math.sqrt(2 * Math.log(3600 * p.n1));
  const gR = raiz + 0.577 / raiz;
  const Gf = 0.925 * ((1 + 1.7 * Iz * Math.sqrt(G_PICO ** 2 * Q ** 2 + gR ** 2 * R ** 2)) / (1 + 1.7 * G_PICO * Iz));
  return { Gf, gR, R, Rn, Rh, RB, RL, N1, Vz, zBarra, Iz, Lz, Q };
}

/* ------------------------------------------------------------------------------------------------
 * B.6.5.10 — Presión por velocidad
 * ---------------------------------------------------------------------------------------------- */

/** Coeficiente numérico de la ecuación B.6.5-13 (se usa si no hay registros climáticos que justifiquen otro). */
export const COEF_PRESION_VELOCIDAD = 0.613;

/**
 * Presión por velocidad qz (ecuación B.6.5-13, B-32):
 *
 *   qz = 0.613 · Kz · Kzt · Kd · V² · I      [N/m²], con V en m/s
 *
 * @param p.V velocidad básica del viento, en m/s
 * @param p.Kz coeficiente de exposición (a la altura z; use Kh para qh)
 * @param p.Kzt factor topográfico (por defecto 1.0)
 * @param p.Kd factor de direccionalidad (por defecto 1.0; la Tabla B.6.5-4 da 0.85 para edificios)
 * @param p.I factor de importancia (por defecto 1.0)
 * @returns qz en N/m² (divida por 1000 para kN/m²)
 */
export function presionVelocidad(p: { V: number; Kz: number; Kzt?: number; Kd?: number; I?: number }): number {
  const { V, Kz, Kzt = 1, Kd = 1, I = 1 } = p;
  return COEF_PRESION_VELOCIDAD * Kz * Kzt * Kd * V * V * I;
}

/** qz en kN/m² (= presionVelocidad / 1000). */
export function presionVelocidadKN(p: { V: number; Kz: number; Kzt?: number; Kd?: number; I?: number }): number {
  return presionVelocidad(p) / 1000;
}
