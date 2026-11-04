/**
 * Capítulo C.14 — Muros de concreto. Lógica pura (sin React) compartida por el capítulo MDX.
 * Unidades: mm, N, MPa (momentos en N·mm; las funciones indican cuando usan kN o kN·m).
 * PDF p.439–442 (C-137 a C-140); página PDF = página impresa "C-n" + 302.
 *
 * Lo que es texto de la norma lleva su sección; lo que es criterio propio (equilibrio de la sección para Mn y c,
 * iteración de Ma, etc.) está marcado como tal.
 */
import { ES_ACERO_MPA, beta1, moduloElasticidad, moduloRotura } from './concreto';

/** Constantes de C.14 (PDF p.439–442, C-137 a C-140). */
export const MUROS = {
  /** C.14.3.2: cuantía mínima vertical ρℓ. */
  rhoVertical: { barraPequenaFy420: 0.0012, barraOtras: 0.0015, mallaPequena: 0.0012 },
  /** C.14.3.3: cuantía mínima horizontal ρt. */
  rhoHorizontal: { barraPequenaFy420: 0.002, barraOtras: 0.0025, mallaPequena: 0.002 },
  /** "No mayor que No. 5 (5/8") ó 16M (16 mm)" y "MW200 ó MD200 (16 mm de diámetro)": db ≤ 16 mm. */
  dbPequenaMaxMm: 16,
  fyPequenaMinMpa: 420,
  /** C.14.3.4: espesor > 250 mm (salvo muros de sótano) → refuerzo en dos capas. */
  espesorDosCapasMm: 250,
  capaExterior: { fraccionMin: 1 / 2, fraccionMax: 2 / 3, recubrimientoMinMm: 50, distanciaMaxFraccionEspesor: 1 / 3 },
  capaInterior: { recubrimientoMinMm: 20, distanciaMaxFraccionEspesor: 1 / 3 },
  /** C.14.3.5: separación máxima del refuerzo = 3 veces el espesor, sin exceder 450 mm. */
  separacionMaxFactorEspesor: 3,
  separacionMaxMm: 450,
  /** C.14.3.6: no necesita estribos si ρ vertical ≤ 0.01 Ag o si no se requiere como refuerzo de compresión. */
  rhoSinEstribosMax: 0.01,
  /** C.14.3.7: barras alrededor de aberturas No. 5 (16M): 2 con dos capas, 1 con una capa. */
  barrasAbertura: { dosCapas: 2, unaCapa: 1 },
  /** C.14.2.4: largo efectivo por carga concentrada ≤ menor distancia centro a centro y ancho de apoyo + 4 h. */
  largoEfectivoFactorEspesor: 4,
  /** C.14.5.2: φPn = 0.55 φ f′c Ag [1 − (k ℓc/32h)²]. */
  empirico: { coef: 0.55, divisorEsbeltez: 32, phiCompresion: 0.65, phiEspiral: 0.75 },
  /** C.14.5.2: factor de longitud efectiva k. */
  k: { arriostradoRestringido: 0.8, arriostradoLibre: 1.0, noArriostrado: 2.0 },
  /** C.14.5.1: la resultante de las cargas mayoradas dentro del tercio central → e ≤ h/6. */
  tercioCentral: 1 / 6,
  /** C.14.5.3.1: espesor de muros de carga ≥ 1/25 de la menor entre altura y longitud, y ≥ 100 mm. */
  espesorEmpirico: { divisor: 25, minimoMm: 100 },
  /** C.14.5.3.2: espesor de muros exteriores de sótanos y cimentaciones ≥ 190 mm. */
  espesorSotanoMinMm: 190,
  /** C.14.6.1: muros no portantes ≥ 100 mm y ≥ 1/30 de la distancia mínima entre apoyos laterales. */
  noPortante: { divisor: 30, minimoMm: 100 },
  /** C.14.8: método alterno para muros esbeltos. */
  esbelto: {
    /** C.14.8.2.6: Pu/Ag a media altura ≤ 0.06 f′c. */
    esfuerzoVerticalMaxFraccionFc: 0.06,
    /** Factor 0.75 de C.14-5 y C.14-6. */
    factorRigidez: 0.75,
    /** C.14.8.3: Es/Ec no menor de 6. */
    relacionModularMin: 6,
    /** C.14.8.4: Δs ≤ ℓc/150. */
    limiteDeflexionDivisor: 150,
    /** Umbral (2/3) Mcr. */
    fraccionMcr: 2 / 3,
    phiTraccion: 0.9,
  },
} as const;

function exigirPositivo(nombre: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${nombre} debe ser un número positivo`);
}

// ---------------------------------------------------------------------------------------------
// C.14.3 — Refuerzo mínimo
// ---------------------------------------------------------------------------------------------

export type TipoRefuerzoMuro = 'barra-corrugada' | 'malla';

export interface CuantiasMinimasMuro {
  /** Cuantía vertical mínima ρℓ. */
  rhoVertical: number;
  /** Cuantía horizontal mínima ρt. */
  rhoHorizontal: number;
  /** Cuál de los casos (a), (b) o (c) de C.14.3.2 y C.14.3.3 aplica. */
  caso: 'a' | 'b' | 'c';
}

/**
 * Cuantías mínimas (C.14.3.2 y C.14.3.3): (a) barras corrugadas ≤ No. 5 (16M) con fy ≥ 420 MPa: 0.0012 y 0.0020;
 * (b) otras barras corrugadas: 0.0015 y 0.0025; (c) malla de alambre ≤ MW200/MD200 (16 mm): 0.0012 y 0.0020.
 */
export function cuantiasMinimasMuro(tipo: TipoRefuerzoMuro, db: number, fy: number): CuantiasMinimasMuro {
  exigirPositivo('db', db);
  exigirPositivo('fy', fy);
  const pequena = db <= MUROS.dbPequenaMaxMm;
  if (tipo === 'malla' && pequena) {
    return { rhoVertical: MUROS.rhoVertical.mallaPequena, rhoHorizontal: MUROS.rhoHorizontal.mallaPequena, caso: 'c' };
  }
  if (tipo === 'barra-corrugada' && pequena && fy >= MUROS.fyPequenaMinMpa) {
    return { rhoVertical: MUROS.rhoVertical.barraPequenaFy420, rhoHorizontal: MUROS.rhoHorizontal.barraPequenaFy420, caso: 'a' };
  }
  return { rhoVertical: MUROS.rhoVertical.barraOtras, rhoHorizontal: MUROS.rhoHorizontal.barraOtras, caso: 'b' };
}

/** Área de refuerzo mínima por metro de muro (mm²/m) = ρ · h · 1000. */
export function areaMinimaPorMetro(rho: number, h: number): number {
  return rho * h * 1000;
}

/** C.14.3.5: separación máxima = menor de 3h y 450 mm. */
export function separacionMaximaRefuerzoMuro(h: number): number {
  return Math.min(MUROS.separacionMaxFactorEspesor * h, MUROS.separacionMaxMm);
}

/** Separación (mm) de barras de área `ab` (mm²) que aportan `asRequeridaPorMetro` (mm²/m), limitada por C.14.3.5. Una capa. */
export function separacionBarrasMuro(ab: number, asRequeridaPorMetro: number, h: number): { calculada: number; limite: number; adoptada: number; gobierna: 'area' | 'C.14.3.5' } {
  exigirPositivo('As', asRequeridaPorMetro);
  const calculada = (ab * 1000) / asRequeridaPorMetro;
  const limite = separacionMaximaRefuerzoMuro(h);
  return { calculada, limite, adoptada: Math.min(calculada, limite), gobierna: calculada <= limite ? 'area' : 'C.14.3.5' };
}

/** C.14.3.4: ¿se exigen dos capas? (espesor > 250 mm, salvo muros de sótano). */
export function requiereDosCapas(h: number, esMuroDeSotano = false): boolean {
  return !esMuroDeSotano && h > MUROS.espesorDosCapasMm;
}

export interface UbicacionCapas {
  /** Fracción mínima y máxima del refuerzo total en la capa exterior. */
  fraccionExterior: [number, number];
  /** Posición admisible de la capa exterior medida desde la superficie exterior: [mínimo, máximo] (mm). */
  capaExterior: [number, number];
  /** Posición admisible de la capa interior medida desde la superficie interior: [mínimo, máximo] (mm). */
  capaInterior: [number, number];
}

/** C.14.3.4 (a) y (b): ubicación admisible de las dos capas en un muro de espesor h. */
export function ubicacionDosCapas(h: number): UbicacionCapas {
  return {
    fraccionExterior: [MUROS.capaExterior.fraccionMin, MUROS.capaExterior.fraccionMax],
    capaExterior: [MUROS.capaExterior.recubrimientoMinMm, h * MUROS.capaExterior.distanciaMaxFraccionEspesor],
    capaInterior: [MUROS.capaInterior.recubrimientoMinMm, h * MUROS.capaInterior.distanciaMaxFraccionEspesor],
  };
}

/** C.14.3.6: el refuerzo vertical no requiere estribos laterales si ρ ≤ 0.01 (o si no se requiere como refuerzo de compresión). */
export function verticalSinEstribos(rhoVerticalReal: number, requeridoEnCompresion: boolean): boolean {
  return rhoVerticalReal <= MUROS.rhoSinEstribosMax || !requeridoEnCompresion;
}

/** C.14.2.4: longitud horizontal efectiva por carga concentrada = menor de la distancia centro a centro y (ancho de apoyo + 4h). */
export function largoEfectivoCargaConcentrada(distanciaCentroACentro: number, anchoApoyo: number, h: number): number {
  return Math.min(distanciaCentroACentro, anchoApoyo + MUROS.largoEfectivoFactorEspesor * h);
}

// ---------------------------------------------------------------------------------------------
// C.14.5 — Método empírico
// ---------------------------------------------------------------------------------------------

/** C.14.5.3.1: espesor mínimo de un muro de carga = mayor de 1/25 de la menor entre altura y longitud, y 100 mm. */
export function espesorMinimoMuroEmpirico(alturaMm: number, longitudMm: number): number {
  return Math.max(Math.min(alturaMm, longitudMm) / MUROS.espesorEmpirico.divisor, MUROS.espesorEmpirico.minimoMm);
}

/** Espesor mínimo exigido por el método empírico: C.14.5.3.1 y, si es muro exterior de sótano o cimentación, 190 mm (C.14.5.3.2). */
export function espesorMinimoEmpiricoTotal(alturaMm: number, longitudMm: number, muroExteriorDeSotano = false): number {
  const base = espesorMinimoMuroEmpirico(alturaMm, longitudMm);
  return muroExteriorDeSotano ? Math.max(base, MUROS.espesorSotanoMinMm) : base;
}

/** C.14.6.1: espesor mínimo de muros no portantes = mayor de 100 mm y 1/30 de la distancia mínima entre apoyos laterales. */
export function espesorMinimoNoPortante(distanciaMinimaApoyosMm: number): number {
  return Math.max(MUROS.noPortante.minimoMm, distanciaMinimaApoyosMm / MUROS.noPortante.divisor);
}

export type CondicionApoyoMuro = 'arriostrado-restringido' | 'arriostrado-libre' | 'no-arriostrado';

/** Factor de longitud efectiva k (C.14.5.2): 0.8, 1.0 ó 2.0. */
export function factorKMuro(condicion: CondicionApoyoMuro): number {
  return condicion === 'arriostrado-restringido' ? MUROS.k.arriostradoRestringido : condicion === 'arriostrado-libre' ? MUROS.k.arriostradoLibre : MUROS.k.noArriostrado;
}

/** C.14.5.1: la resultante de las cargas mayoradas debe quedar dentro del tercio central: e ≤ h/6. */
export function resultanteEnTercioCentral(excentricidadMm: number, h: number): boolean {
  return Math.abs(excentricidadMm) <= h * MUROS.tercioCentral;
}

export interface EntradaMuroEmpirico {
  /** f′c (MPa). */
  fc: number;
  /** Área bruta Ag de la sección horizontal considerada (mm²) = h × ancho efectivo. */
  ag: number;
  /** Factor de longitud efectiva k. */
  k: number;
  /** ℓc: distancia vertical entre apoyos (mm). */
  lc: number;
  /** h: espesor del muro (mm). */
  h: number;
  /** φ de secciones controladas por compresión (C.9.3.2.2): 0.65 por defecto. */
  phi?: number;
}

/** Ecuación C.14-1: φPn = 0.55 φ f′c Ag [1 − (k ℓc/(32 h))²] (N). */
export function phiPnMuroEmpirico(e: EntradaMuroEmpirico): { phiPn: number; factorEsbeltez: number; resistenciaBruta: number } {
  exigirPositivo('f′c', e.fc);
  exigirPositivo('Ag', e.ag);
  exigirPositivo('h', e.h);
  const phi = e.phi ?? MUROS.empirico.phiCompresion;
  const resistenciaBruta = MUROS.empirico.coef * phi * e.fc * e.ag;
  const factorEsbeltez = 1 - ((e.k * e.lc) / (MUROS.empirico.divisorEsbeltez * e.h)) ** 2;
  return { phiPn: resistenciaBruta * factorEsbeltez, factorEsbeltez, resistenciaBruta };
}

// ---------------------------------------------------------------------------------------------
// C.14.8 — Diseño alternativo para muros esbeltos
// ---------------------------------------------------------------------------------------------

/** Ig = ℓw h³/12 (mm⁴) de una franja de ancho ℓw y espesor h. */
export function inerciaBrutaMuro(lw: number, h: number): number {
  return (lw * h ** 3) / 12;
}

/** Mcr = fr Ig / yt con fr = 0.62 λ √f′c (Ec. C.9-10) y yt = h/2 (N·mm), para una franja de ancho ℓw. */
export function momentoAgrietamientoMuro(fc: number, lw: number, h: number, lambda = 1): number {
  return (moduloRotura(fc, lambda) * inerciaBrutaMuro(lw, h)) / (h / 2);
}

/** Es/Ec con el mínimo de 6 (C.14.8.3). */
export function relacionModularMuro(ec: number): number {
  return Math.max(ES_ACERO_MPA / ec, MUROS.esbelto.relacionModularMin);
}

export interface EntradaMnMuro {
  /** As del refuerzo a tracción en el ancho ℓw (mm²). */
  as: number;
  fy: number;
  fc: number;
  /** Ancho de la franja (mm). */
  lw: number;
  /** Espesor (mm). */
  h: number;
  /** Altura útil d (mm); en una capa centrada d = h/2. */
  d: number;
  /** Carga axial Pu a media altura (N), de compresión positiva. */
  pu: number;
}

/**
 * Resistencia nominal a flexión de la franja con carga axial (CRITERIO PROPIO: equilibrio de la sección rectangular con el
 * bloque de C.10.2.7; no es una ecuación de C.14). a = (As fy + Pu)/(0.85 f′c ℓw); c = a/β1;
 * Mn = As fy (d − a/2) + Pu (h/2 − a/2) (N·mm, momentos respecto al centroide de la sección).
 */
export function mnMuroEsbelto(e: EntradaMnMuro): { a: number; c: number; mn: number } {
  const a = (e.as * e.fy + e.pu) / (0.85 * e.fc * e.lw);
  const c = a / beta1(e.fc);
  return { a, c, mn: e.as * e.fy * (e.d - a / 2) + e.pu * (e.h / 2 - a / 2) };
}

export interface EntradaIcrMuro {
  as: number;
  pu: number;
  fy: number;
  /** Espesor h (mm), altura útil d (mm), profundidad del eje neutro c (mm) y ancho ℓw (mm). */
  h: number;
  d: number;
  c: number;
  lw: number;
  /** Ec (MPa); Es se toma de la norma (200 000 MPa). */
  ec: number;
}

/** Ecuación C.14-7: Icr = (Es/Ec)(As + Pu h/(fy 2d))(d − c)² + ℓw c³/3 (mm⁴), con Es/Ec ≥ 6. */
export function inerciaFisuradaMuro(e: EntradaIcrMuro): number {
  const n = relacionModularMuro(e.ec);
  return n * (e.as + (e.pu * e.h) / (e.fy * 2 * e.d)) * (e.d - e.c) ** 2 + (e.lw * e.c ** 3) / 3;
}

/** Ecuación C.14-6: Mu = Mua / (1 − 5 Pu ℓc²/(0.75·48 Ec Icr)) (N·mm). Falla si el denominador no es positivo (inestable). */
export function muAmplificadoMuro(mua: number, pu: number, lc: number, ec: number, icr: number): number {
  const den = 1 - (5 * pu * lc ** 2) / (MUROS.esbelto.factorRigidez * 48 * ec * icr);
  if (den <= 0) throw new RangeError('El muro es inestable bajo Pu: 5 Pu ℓc²/(0.75·48 Ec Icr) ≥ 1');
  return mua / den;
}

/** Ecuación C.14-5: Δu = 5 Mu ℓc²/(0.75·48 Ec Icr) (mm). */
export function deflexionUltimaMuro(mu: number, lc: number, ec: number, icr: number): number {
  return (5 * mu * lc ** 2) / (MUROS.esbelto.factorRigidez * 48 * ec * icr);
}

/** Ecuación C.14-10: Δcr = 5 Mcr ℓc²/(48 Ec Ig) (mm). */
export function deflexionAgrietamientoMuro(mcr: number, lc: number, ec: number, ig: number): number {
  return (5 * mcr * lc ** 2) / (48 * ec * ig);
}

/** Ecuación C.14-11: Δn = 5 Mn ℓc²/(48 Ec Icr) (mm). */
export function deflexionNominalMuro(mn: number, lc: number, ec: number, icr: number): number {
  return (5 * mn * lc ** 2) / (48 * ec * icr);
}

/** Ecuaciones C.14-8 y C.14-9: Δs en función de Ma (N·mm); retorna también cuál ecuación se usó. */
export function deflexionServicioMuro(ma: number, mcr: number, mn: number, deltaCr: number, deltaN: number): { deltaS: number; ecuacion: 'C.14-8' | 'C.14-9' } {
  const f = MUROS.esbelto.fraccionMcr;
  if (ma <= f * mcr) return { deltaS: (ma / mcr) * deltaCr, ecuacion: 'C.14-9' };
  return { deltaS: f * deltaCr + ((ma - f * mcr) / (mn - f * mcr)) * (deltaN - f * deltaCr), ecuacion: 'C.14-8' };
}

export interface EntradaServicioMuro {
  /** Momento de servicio a media altura sin efecto PΔ (N·mm). */
  maa: number;
  /** Carga axial de servicio a media altura (N). */
  ps: number;
  lc: number;
  ec: number;
  ig: number;
  icr: number;
  mcr: number;
  mn: number;
}

/**
 * Δs incluyendo PΔ por iteración (C.14.8.4: "Ma debe obtenerse por iteración de las deflexiones"). CRITERIO PROPIO:
 * Ma = Maa + Ps Δs, con Δs según C.14-8 o C.14-9, hasta converger.
 */
export function deflexionServicioIterativa(e: EntradaServicioMuro): { ma: number; deltaS: number; iteraciones: number; ecuacion: 'C.14-8' | 'C.14-9'; converge: boolean } {
  const deltaCr = deflexionAgrietamientoMuro(e.mcr, e.lc, e.ec, e.ig);
  const deltaN = deflexionNominalMuro(e.mn, e.lc, e.ec, e.icr);
  let ma = e.maa;
  let res = deflexionServicioMuro(ma, e.mcr, e.mn, deltaCr, deltaN);
  for (let i = 1; i <= 200; i++) {
    const nuevo = e.maa + e.ps * res.deltaS;
    const r = deflexionServicioMuro(nuevo, e.mcr, e.mn, deltaCr, deltaN);
    if (Math.abs(nuevo - ma) <= 1e-6 * Math.max(1, Math.abs(nuevo))) return { ma: nuevo, deltaS: r.deltaS, iteraciones: i, ecuacion: r.ecuacion, converge: true };
    ma = nuevo;
    res = r;
  }
  return { ma, deltaS: res.deltaS, iteraciones: 200, ecuacion: res.ecuacion, converge: false };
}

export interface EntradaMuroEsbelto {
  fc: number;
  fy: number;
  /** Ancho de la franja ℓw (mm), espesor h, altura útil d, As en el ancho ℓw. */
  lw: number;
  h: number;
  d: number;
  as: number;
  /** Altura entre apoyos ℓc (mm). */
  lc: number;
  /** Mua (N·mm) y Pu (N) factorizados a media altura; Maa (N·mm) y Ps (N) de servicio. */
  mua: number;
  pu: number;
  maa: number;
  ps: number;
  lambda?: number;
}

export interface ResultadoMuroEsbelto {
  ec: number;
  ig: number;
  mcr: number;
  mn: number;
  phiMn: number;
  a: number;
  c: number;
  icr: number;
  /** C.14.8.2.6: Pu/Ag (MPa) y su límite 0.06 f′c. */
  esfuerzoVertical: number;
  limiteEsfuerzoVertical: number;
  cumpleEsfuerzoVertical: boolean;
  /** C.14-2: φMn ≥ Mcr. */
  cumpleMcr: boolean;
  /** C.14.8.2.3: controlado por tracción (c/d ≤ 0.375, εt ≥ 0.005 con εcu = 0.003; criterio propio de verificación). */
  controladoPorTraccion: boolean;
  mu: number;
  deltaU: number;
  /** C.14-3: φMn ≥ Mu. */
  cumpleMu: boolean;
  servicio: { ma: number; deltaS: number; limite: number; ecuacion: 'C.14-8' | 'C.14-9'; cumple: boolean; converge: boolean };
  deltaCr: number;
  deltaN: number;
}

/** Encadena todas las verificaciones de C.14.8 para una franja de muro simplemente apoyado con carga lateral uniforme. */
export function verificarMuroEsbelto(e: EntradaMuroEsbelto): ResultadoMuroEsbelto {
  const ec = moduloElasticidad(e.fc);
  const ig = inerciaBrutaMuro(e.lw, e.h);
  const mcr = momentoAgrietamientoMuro(e.fc, e.lw, e.h, e.lambda ?? 1);
  const { a, c, mn } = mnMuroEsbelto({ as: e.as, fy: e.fy, fc: e.fc, lw: e.lw, h: e.h, d: e.d, pu: e.pu });
  const phiMn = MUROS.esbelto.phiTraccion * mn;
  const icr = inerciaFisuradaMuro({ as: e.as, pu: e.pu, fy: e.fy, h: e.h, d: e.d, c, lw: e.lw, ec });
  const ag = e.lw * e.h;
  const esfuerzoVertical = e.pu / ag;
  const limiteEsfuerzoVertical = MUROS.esbelto.esfuerzoVerticalMaxFraccionFc * e.fc;
  const mu = muAmplificadoMuro(e.mua, e.pu, e.lc, ec, icr);
  const deltaU = deflexionUltimaMuro(mu, e.lc, ec, icr);
  const deltaCr = deflexionAgrietamientoMuro(mcr, e.lc, ec, ig);
  const deltaN = deflexionNominalMuro(mn, e.lc, ec, icr);
  const sv = deflexionServicioIterativa({ maa: e.maa, ps: e.ps, lc: e.lc, ec, ig, icr, mcr, mn });
  const limite = e.lc / MUROS.esbelto.limiteDeflexionDivisor;
  return {
    ec,
    ig,
    mcr,
    mn,
    phiMn,
    a,
    c,
    icr,
    esfuerzoVertical,
    limiteEsfuerzoVertical,
    cumpleEsfuerzoVertical: esfuerzoVertical <= limiteEsfuerzoVertical,
    cumpleMcr: phiMn >= mcr,
    controladoPorTraccion: c / e.d <= 0.003 / (0.003 + 0.005),
    mu,
    deltaU,
    cumpleMu: phiMn >= mu,
    servicio: { ma: sv.ma, deltaS: sv.deltaS, limite, ecuacion: sv.ecuacion, cumple: sv.deltaS <= limite, converge: sv.converge },
    deltaCr,
    deltaN,
  };
}
