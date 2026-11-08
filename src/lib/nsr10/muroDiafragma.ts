/**
 * Título D de la NSR-10 — Capítulo D.11 (Muros diafragma): lógica pura. PDF = página impresa "D-n" + 565 (D-63/D-64 = PDF 628/629).
 *
 * UNIDADES: longitudes y espesores en mm · áreas en mm² · esfuerzos en MPa · FUERZAS en kN (la Ec. D.11.4-1 está escrita en N y mm²;
 * aquí se convierte en la frontera, kN = N/1000), como `mamposteria.ts`.
 *
 * Qué es texto de la norma y qué es aporte del proyecto («autoría del proyecto»):
 *  - Norma: Vu ≤ φ vm Am con φ = 0.50 y vm de la Tabla D.11.1-1 (`cortanteResistente`); espesor ≥ 120 mm; R0 ≤ 2.0; área de compresión
 *    diagonal = diagonal/5 × espesor con h′ = diagonal (D.11.4.1 b); cortante mínimo de vigas y columnas = 1/4 del del muro en el 25 % de
 *    la longitud del miembro (D.11.4.3).
 *  - Autoría del proyecto: «dimensión diagonal» = √(ℓ² + h²) del panel; la resistencia de aplastamiento usa D.5.5 (Po, Re, Pn, φPn con
 *    φ = 0.60 de D.5.1.5.2 b, muro sin refuerzo) y la fuerza horizontal asociada a la biela se obtiene como φPn·cosθ (equilibrio de la
 *    biela diagonal); la fracción de área neta de unidades perforadas; la elección de Vu (y no de φ vm Am) como «cortante del muro» en
 *    D.11.4.3. Ninguno de estos supuestos está formulado así en D.11.
 */
import {
  ESPESOR_MIN_DIAFRAGMA_MM,
  FRACCION_CORTANTE_MIEMBROS,
  FRACCION_DIAGONAL_APLASTAMIENTO,
  FRACCION_LONGITUD_ZONA_MIEMBRO,
  PHI_CORTANTE_DIAFRAGMA,
  R0_MAX_DIAFRAGMA,
  VM_MAX_MPA,
  type TipoUnidadDiafragma,
} from '../../data/muroDiafragma';
import { phiMuro, resistenciaAxial } from './mamposteria';

const N_A_KN = 1 / 1000;

/** vm máximo (MPa) de la Tabla D.11.1-1 para el tipo de unidad. */
export function vmMaximo(tipo: TipoUnidadDiafragma): number {
  return VM_MAX_MPA[tipo];
}

/**
 * Am: área neta horizontal de la mampostería del diafragma, mm² (D.11.4.2): ℓ·t·fracciónNeta.
 * La norma solo la define como «área neta horizontal»; la fracción neta de unidades perforadas es dato del usuario (autoría del proyecto).
 */
export function areaNetaHorizontal(longitud: number, espesor: number, fraccionNeta = 1): number {
  return longitud * espesor * fraccionNeta;
}

export interface EntradaCortanteDiafragma {
  tipo: TipoUnidadDiafragma;
  /** Am, mm². */
  Am: number;
  /** vm obtenido de ensayos estadísticamente representativos, MPa (única forma de superar la Tabla D.11.1-1 en edificios existentes). */
  vmEnsayado?: number;
}

export interface ResultadoCortanteDiafragma {
  /** Valor de la Tabla D.11.1-1, MPa. */
  vmTabla: number;
  /** vm adoptado, MPa. */
  vm: number;
  /** true si se usó un vm ensayado. */
  usaEnsayo: boolean;
  /** true si el vm ensayado supera la tabla (válido solo con ensayos representativos). */
  superaTabla: boolean;
  phi: number;
  /** φ vm Am, kN. */
  Vr: number;
}

/** Ec. D.11.4-1: Vu ≤ φ vm Am. Devuelve la resistencia de diseño φ vm Am en kN (D.11.4.2, D-64). */
export function cortanteResistente(e: EntradaCortanteDiafragma): ResultadoCortanteDiafragma {
  const vmTabla = vmMaximo(e.tipo);
  const usaEnsayo = e.vmEnsayado !== undefined && Number.isFinite(e.vmEnsayado) && e.vmEnsayado > 0;
  const vm = usaEnsayo ? (e.vmEnsayado as number) : vmTabla;
  return {
    vmTabla,
    vm,
    usaEnsayo,
    superaTabla: usaEnsayo && vm > vmTabla,
    phi: PHI_CORTANTE_DIAFRAGMA,
    Vr: PHI_CORTANTE_DIAFRAGMA * vm * e.Am * N_A_KN,
  };
}

/** Dimensión diagonal del muro, √(ℓ² + h²), mm (lectura del proyecto de «dimensión diagonal» de D.11.4.1 b). */
export function longitudDiagonal(longitud: number, altura: number): number {
  return Math.hypot(longitud, altura);
}

export interface EntradaAplastamientoDiagonal {
  /** Longitud ℓ del panel, mm. */
  L: number;
  /** Altura h del panel, mm. */
  h: number;
  /** Espesor efectivo t, mm. */
  t: number;
  /** f′m, MPa. */
  fm: number;
  /** φ de compresión; por defecto 0.60 (D.5.1.5.2 b, fuerzas paralelas al plano). */
  phi?: number;
  /** Fracción de la sección que trabaja (unidades perforadas): reduce el área de compresión por debajo del máximo de D.11.4.1 b. Por defecto 1 (autoría del proyecto). */
  fraccionNeta?: number;
}

export interface ResultadoAplastamientoDiagonal {
  diagonal: number;
  /** Área efectiva de compresión = diagonal/5 × t (× fracción neta, autoría del proyecto), mm² (D.11.4.1 b). */
  Ae: number;
  /** h′ = diagonal (D.11.4.1 b). */
  hPrime: number;
  /** h′/t. */
  esbeltez: number;
  /** h′/t ≤ 25 (D.5.4.3.1): la norma no exceptúa a los diafragmas; se informa como alerta. */
  esbeltezAdmisible: boolean;
  Re: number;
  Po: number;
  Pn: number;
  phi: number;
  /** φPn de la biela, kN. */
  phiPn: number;
  /** Ángulo de la diagonal con la horizontal, grados. */
  anguloGrados: number;
  /** cos θ = ℓ/diagonal. */
  cosTheta: number;
  /** Componente horizontal de φPn (cortante horizontal resistido por aplastamiento), kN (autoría del proyecto). */
  Vh: number;
}

/**
 * D.11.4.1 b: aplastamiento diagonal. Área efectiva = diagonal/5 × t; h′ = diagonal; se usan los requisitos de D.5
 * (Po = 0.80 f′m Ae, Re de la Ec. D.5.5-2, Pn = 0.80 Po Re, φPn). El muro diafragma no lleva refuerzo en el cálculo (Ast = 0).
 */
export function aplastamientoDiagonal(e: EntradaAplastamientoDiagonal): ResultadoAplastamientoDiagonal {
  const diagonal = longitudDiagonal(e.L, e.h);
  const Ae = FRACCION_DIAGONAL_APLASTAMIENTO * diagonal * e.t * (e.fraccionNeta ?? 1);
  const phi = e.phi ?? phiMuro('en-compresion');
  const r = resistenciaAxial({ fm: e.fm, Ae, Ast: 0, fy: 0, hPrime: diagonal, t: e.t, phi });
  const cosTheta = e.L / diagonal;
  return {
    diagonal,
    Ae,
    hPrime: diagonal,
    esbeltez: r.esbeltez,
    esbeltezAdmisible: r.esbeltezAdmisible,
    Re: r.Re,
    Po: r.Po,
    Pn: r.Pn,
    phi,
    phiPn: r.phiPn,
    anguloGrados: (Math.atan2(e.h, e.L) * 180) / Math.PI,
    cosTheta,
    Vh: r.phiPn * cosTheta,
  };
}

/** D.11.4.3: cortante mínimo de diseño de cada viga o columna del pórtico = 1/4 del cortante del muro, en kN. */
export function cortanteMinimoMiembroPortico(Vmuro: number): number {
  return FRACCION_CORTANTE_MIEMBROS * Vmuro;
}

/** D.11.4.3: longitud de la zona del miembro que resiste ese cortante = 25 % de su longitud, mm. */
export function zonaCortanteMiembro(longitudMiembro: number): number {
  return FRACCION_LONGITUD_ZONA_MIEMBRO * longitudMiembro;
}

/** D.11.1.4: espesor nominal ≥ 120 mm. */
export function cumpleEspesorMinimo(t: number): boolean {
  return t >= ESPESOR_MIN_DIAFRAGMA_MM;
}

/** D.11.2.2: R0 ≤ 2.0. */
export function r0Admisible(R0: number): boolean {
  return R0 <= R0_MAX_DIAFRAGMA;
}

export interface EntradaDiafragma {
  tipo: TipoUnidadDiafragma;
  /** Longitud ℓ, mm. */
  L: number;
  /** Altura h (de piso a piso, entre vigas), mm. */
  h: number;
  /** Espesor nominal t, mm. */
  t: number;
  /** Fracción neta de la sección horizontal (1.0 maciza; menor para unidades perforadas), autoría del proyecto. */
  fraccionNeta?: number;
  /** f′m, MPa. */
  fm: number;
  /** Cortante horizontal solicitado Vu, kN. */
  Vu: number;
  vmEnsayado?: number;
  /** R0 del sistema (opcional, para la alerta de D.11.2.2). */
  R0?: number;
}

export type ModoGobernante = 'cortante' | 'aplastamiento';

export interface ResultadoDiafragma {
  espesorCumple: boolean;
  Am: number;
  cortante: ResultadoCortanteDiafragma & { razon: number; cumple: boolean };
  aplastamiento: ResultadoAplastamientoDiagonal & { razon: number; cumple: boolean };
  /** Menor de las dos resistencias horizontales, kN. */
  Vmax: number;
  gobierna: ModoGobernante;
  /** Cortante mínimo de diseño de cada viga y columna del pórtico, kN (D.11.4.3). */
  Vminimo: number;
  r0Cumple: boolean | null;
  cumple: boolean;
}

/** Verificación completa de un muro diafragma: espesor, cortante D.11.4-1, aplastamiento diagonal D.11.4.1(b) y mínimo para el pórtico. */
export function verificarMuroDiafragma(e: EntradaDiafragma): ResultadoDiafragma {
  const Am = areaNetaHorizontal(e.L, e.t, e.fraccionNeta ?? 1);
  const c = cortanteResistente({ tipo: e.tipo, Am, vmEnsayado: e.vmEnsayado });
  const a = aplastamientoDiagonal({ L: e.L, h: e.h, t: e.t, fm: e.fm, fraccionNeta: e.fraccionNeta });
  const razonC = e.Vu / c.Vr;
  const razonA = e.Vu / a.Vh;
  const espesorCumple = cumpleEspesorMinimo(e.t);
  const r0Cumple = e.R0 === undefined ? null : r0Admisible(e.R0);
  return {
    espesorCumple,
    Am,
    cortante: { ...c, razon: razonC, cumple: razonC <= 1 },
    aplastamiento: { ...a, razon: razonA, cumple: razonA <= 1 },
    Vmax: Math.min(c.Vr, a.Vh),
    gobierna: c.Vr <= a.Vh ? 'cortante' : 'aplastamiento',
    Vminimo: cortanteMinimoMiembroPortico(e.Vu),
    r0Cumple,
    cumple: espesorCumple && razonC <= 1 && razonA <= 1 && r0Cumple !== false,
  };
}
