/**
 * Título D de la NSR-10 — Muro de mampostería en su plano (D.5.8): composición de `mamposteria.ts` en un solo resumen.
 *
 * Reúne, para un muro rectangular ℓw × t con refuerzo vertical concentrado en los extremos (más barras intermedias
 * opcionales) y refuerzo horizontal de cortante:
 *   D.5.8.3 flexo-compresión (diagrama de interacción), D.5.8.2 flexión mínima Mn ≥ α Mcr, D.5.8.4 cortante Vn = Vm + Vs
 *   (Tablas D.5.8-2 y D.5.8-3, articulación plástica) y D.5.8.5 elementos de borde.
 * No contiene ecuaciones nuevas: es la misma secuencia del ejemplo 5 y 6 de d5b.mdx.
 * UNIDADES: mm, mm², MPa, kN, kN·m (como `mamposteria.ts`). PDF = página impresa "D-n" + 565.
 *
 * Interpretaciones del proyecto (la norma no las precisa): Mn de D.5.8-1 se evalúa a la carga Pu dada y, a título informativo, en
 * flexión pura; el diagrama usa Ae = t·ℓw (celdas inyectadas) y Re con h′/t del muro; con refuerzo vertical simétrico y fy ≤ 420 MPa
 * se aplica la rampa de φ de D.5.1.5.2 b.
 */
import {
  alphaMcr,
  articulacionPlastica,
  cargaBalanceada,
  capasMuroEnPlano,
  cortanteMuroEnPlano,
  curvaInteraccionMuro,
  esfuerzoFibraExtrema,
  momentoAgrietamiento,
  phiCortanteEnPlano,
  phiEnPlanoFn,
  requiereElementoBorde,
  verificarFlexoCompresion,
  type CurvaMuro,
  type ResultadoBorde,
  type ResultadoCortanteEnPlano,
  type SeccionM,
  type VerificacionFlexoCompresion,
} from './mamposteria';
import { ESBELTEZ_MAXIMA_MURO, SEPARACION_ARTICULACION, type TipoInyeccion, type TipoMamposteriaBorde, type TipoRefuerzoCortante } from '../../data/muroMamposteria';

export interface EntradaMuroEnPlano {
  fm: number;
  fy: number;
  /** Longitud horizontal ℓw, mm. */
  lw: number;
  /** Espesor = ancho efectivo del alma b, mm. */
  t: number;
  /** Altura efectiva h′, mm (para Re, D.5.5.2). */
  hPrime: number;
  /** Refuerzo vertical concentrado en cada extremo, mm², y distancia d′ del borde al centroide, mm. */
  areaExtremo: number;
  dPrime: number;
  /** Barras verticales intermedias distribuidas: número y área de cada una (mm²). */
  nIntermedias: number;
  areaIntermedia: number;
  /** Refuerzo horizontal de cortante: área Av (mm²) cada s (mm), fy (MPa) y tipo (η). */
  Av: number;
  s: number;
  fyCortante: number;
  refuerzoCortante: TipoRefuerzoCortante;
  /** Módulo de ruptura fr, MPa (Tabla D.5.8-1; ver `moduloRuptura`). */
  fr: number;
  tipoInyeccion: TipoInyeccion;
  tipoBorde: TipoMamposteriaBorde;
  /** Cargas mayoradas: Pu (kN, compresión +), Mu (kN·m) y Vu (kN) de la misma combinación. */
  Pu: number;
  Mu: number;
  Vu: number;
}

export interface ResultadoMuroEnPlano {
  sec: SeccionM;
  Ae: number;
  Ast: number;
  /** Pb, kN (Ec. D.5.1-2), con d = ℓw − d′. */
  Pb: number;
  curva: CurvaMuro;
  /** D.5.8.3: verificación (Pu, Mu) contra el diagrama de diseño. */
  flexo: VerificacionFlexoCompresion;
  /** h′/t y su límite D.5.4.3.1. */
  esbeltez: number;
  esbeltezAdmisible: boolean;
  /** D.5.8.2: Mn ≥ α Mcr. */
  minima: {
    fr: number;
    alfa: number;
    Mcr: number;
    alfaMcr: number;
    /** Mn a la carga Pu (null si Pu queda fuera del diagrama). */
    Mn: number | null;
    cumple: boolean | null;
    /** Mn en flexión pura (Pu = 0), informativo. */
    MnPura: number | null;
    cumplePura: boolean | null;
  };
  /** D.5.8.4: cortante en el plano. */
  cortante: ResultadoCortanteEnPlano;
  /** D.5.8.4.1: región de articulación plástica (base hasta ℓw). */
  hinge: {
    VMn: number | null;
    riesgo: boolean | null;
    sMax: number;
    /** s dada ≤ min(3t, 600). */
    cumpleSeparacion: boolean;
    /** Vs con el refuerzo dado (Vn = Vs en la región, Ec. D.5.8-6). */
    Vs: number;
    phi: number | null;
    /** φ Vs ≥ V(Mn). */
    cumple: boolean | null;
    /** Av/s necesario para φ = 0.85 y Vs = V(Mn)/0.85 (mm²/mm) y la s resultante con el Av dado (mm), acotada a sMax. */
    AvSobreSRequerido: number | null;
    sNecesaria: number | null;
  };
  /** D.5.8.5: elementos de borde. */
  borde: { sigma: number; res: ResultadoBorde };
  /** Todas las comprobaciones evaluables cumplen (la región de articulación solo cuenta si Vn > V(Mn)). El borde es una exigencia constructiva, no entra. */
  cumpleTodo: boolean;
}

/** Resumen completo de un muro de mampostería en su plano (D.5.8.2 a D.5.8.5). */
export function resumenMuroEnPlano(e: EntradaMuroEnPlano): ResultadoMuroEnPlano {
  const capas = capasMuroEnPlano(e.lw, e.dPrime, e.areaExtremo, e.areaIntermedia, e.nIntermedias);
  const sec: SeccionM = { b: e.t, h: e.lw, fm: e.fm, fy: e.fy, capas };
  const Ae = e.t * e.lw;
  const Ast = capas.reduce((a, c) => a + c.area, 0);
  const Pb = cargaBalanceada(e.fm, e.t, e.lw - e.dPrime, e.fy);
  const phiFn = phiEnPlanoFn({ fm: e.fm, Ae, fy: e.fy, simetrico: true, Pb });
  const esb = { hPrime: e.hPrime, t: e.t };
  const curva = curvaInteraccionMuro(sec, phiFn, esb);
  const flexo = verificarFlexoCompresion(sec, e.Pu, e.Mu, phiFn, esb);

  // D.5.8.2
  const fr = e.fr;
  const alfa = alphaMcr(e.tipoInyeccion);
  const Mcr = momentoAgrietamiento(e.t, e.lw, fr);
  const Mn = flexo.detalle ? flexo.detalle.Mn : null;
  const MnPura = curva.flexionPura ? curva.flexionPura.Mn : null;
  const minima = {
    fr,
    alfa,
    Mcr,
    alfaMcr: alfa * Mcr,
    Mn,
    cumple: Mn === null ? null : Mn >= alfa * Mcr,
    MnPura,
    cumplePura: MnPura === null ? null : MnPura >= alfa * Mcr,
  };

  // D.5.8.4
  const cortante = cortanteMuroEnPlano({
    fm: e.fm,
    lw: e.lw,
    b: e.t,
    Vu: e.Vu,
    Mu: e.Mu,
    Pu: Math.max(e.Pu, 0),
    Av: e.Av,
    s: e.s,
    fyCortante: e.fyCortante,
    refuerzo: e.refuerzoCortante,
    MnFlexion: Mn ?? undefined,
  });

  // D.5.8.4.1 — región de articulación plástica
  const sMax = Math.min(SEPARACION_ARTICULACION.veces_t * e.t, SEPARACION_ARTICULACION.maxMm);
  const tieneVMn = Mn !== null && e.Mu !== 0 && e.Vu !== 0;
  const art = tieneVMn ? articulacionPlastica({ Vn: cortante.VnUtil, Mn: Mn!, brazoMV: Math.abs(e.Mu / e.Vu) * 1000, t: e.t }) : null;
  const VMn = art ? art.VMn : null;
  const Vs = cortante.Vs;
  const phiH = VMn !== null ? phiCortanteEnPlano(Vs, VMn) : null;
  const AvS = VMn !== null ? ((VMn / 0.85) * 1000 * e.t) / (cortante.eta * e.fyCortante * cortante.Amv) : null;
  const hinge = {
    VMn,
    riesgo: art ? art.riesgo : null,
    sMax,
    cumpleSeparacion: e.s <= sMax,
    Vs,
    phi: phiH,
    cumple: VMn !== null && phiH !== null ? phiH * Math.min(Vs, cortante.VnMax) >= VMn : null,
    AvSobreSRequerido: AvS,
    sNecesaria: AvS !== null && AvS > 0 ? Math.min(e.Av / AvS, sMax) : null,
  };

  // D.5.8.5
  const sigma = esfuerzoFibraExtrema({ Pu: e.Pu, Mu: e.Mu, b: e.t, lw: e.lw });
  const borde = { sigma, res: requiereElementoBorde(sigma, e.fm, e.tipoBorde) };

  const esbeltez = e.hPrime / e.t;
  const esbeltezAdmisible = esbeltez <= ESBELTEZ_MAXIMA_MURO;
  const cumpleTodo =
    flexo.cumple &&
    esbeltezAdmisible &&
    minima.cumple !== false &&
    cortante.cumple &&
    cortante.cumpleMaximo &&
    (hinge.riesgo !== true || (hinge.cumple !== false && hinge.cumpleSeparacion));

  return { sec, Ae, Ast, Pb, curva, flexo, esbeltez, esbeltezAdmisible, minima, cortante, hinge, borde, cumpleTodo };
}
