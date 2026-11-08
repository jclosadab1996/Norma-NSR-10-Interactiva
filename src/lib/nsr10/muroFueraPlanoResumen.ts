/**
 * Título D de la NSR-10 — Muro de mampostería fuera de su plano (D.5.7): composición de `mamposteria.ts` en un resumen por franja.
 *
 * Franja vertical de ancho b (D.5.4.4.1) y espesor t con una capa de refuerzo vertical (barra de área `areaBarra` cada `sep`)
 * a la profundidad d. Reúne D.5.7.2/D.5.7.3 (flexión y flexo-compresión, φ Re Mn), D.5.5 (φPn axial) y D.5.7.4 (cortante).
 * UNIDADES: mm, mm², MPa, kN, kN·m por franja (con b = 1000 mm, por metro de muro). PDF = página impresa "D-n" + 565.
 *
 * Interpretaciones del proyecto: Pn = Pu/φ al entrar al diagrama con Pu > 0.10 f′m Ae (ver nota en d5b.mdx, D.5.7.3);
 * el diagrama de interacción se calcula respecto del centroide de la sección t/2, mientras que la Ec. D.5.7-2 toma momentos
 * respecto del refuerzo (coinciden con el refuerzo al centro, d = t/2).
 */
import { PHI } from '../../data/muroMamposteria';
import {
  cortanteFueraPlano,
  curvaInteraccionMuro,
  muroFueraPlano,
  phiFueraPlanoFn,
  resistenciaAxial,
  type CurvaMuro,
  type ResultadoAxial,
  type ResultadoMuroFuera,
  type SeccionM,
} from './mamposteria';

export interface EntradaMuroFueraPlano {
  fm: number;
  fy: number;
  /** Espesor t, mm. */
  t: number;
  /** Ancho de la franja de diseño b, mm. */
  b: number;
  /** Ae / (b t): 1 con todas las celdas inyectadas (D.5.4.1). */
  fraccionAe: number;
  /** Altura efectiva h′, mm. */
  hPrime: number;
  /** Área de una barra vertical (mm²) y su separación (mm). */
  areaBarra: number;
  sep: number;
  /** Profundidad del refuerzo desde la cara comprimida, mm. */
  d: number;
  /** Pu (kN) y Mu (kN·m) sobre la franja; Vu (kN) opcional. */
  Pu: number;
  Mu: number;
  Vu?: number;
}

export interface ResultadoMuroFueraPlano {
  As: number;
  Ae: number;
  fuera: ResultadoMuroFuera;
  axial: ResultadoAxial;
  /** Carga nominal con la que se entra al diagrama: Pu (D.5.7.2, Pu < 0.10 f′m Ae) o Pu/φ (D.5.7.3). */
  Pn: number;
  /** Vn (Ec. D.5.7-7), φ Vn y razón Vu/φVn (si hay Vu), kN. */
  Vn: number;
  phiVn: number;
  razonV: number | null;
  cumpleV: boolean | null;
  sec: SeccionM;
  curva: CurvaMuro;
  /** Cumplen todas las comprobaciones evaluables. */
  cumpleTodo: boolean;
}

/** Resumen de una franja de muro fuera de su plano (D.5.7). */
export function resumenMuroFueraPlano(e: EntradaMuroFueraPlano): ResultadoMuroFueraPlano {
  const As = (e.areaBarra * e.b) / e.sep;
  const Ae = e.b * e.t * e.fraccionAe;
  const phi = PHI.perpendicular.flexionYFlexoCompresion;
  const fuera = muroFueraPlano({ fm: e.fm, fy: e.fy, b: e.b, t: e.t, d: e.d, As, Pu: e.Pu, hPrime: e.hPrime, Ae, Mu: e.Mu, phi });
  const axial = resistenciaAxial({ fm: e.fm, Ae, Ast: As, fy: e.fy, hPrime: e.hPrime, t: e.t, phi, Pu: e.Pu > 0 ? e.Pu : undefined });
  const Pn = fuera.caso === 'menor' ? e.Pu : e.Pu / phi;
  const Vn = cortanteFueraPlano(Ae, e.fm);
  const phiVn = PHI.perpendicular.cortante * Vn;
  const razonV = e.Vu === undefined ? null : Math.abs(e.Vu) / phiVn;
  const sec: SeccionM = { b: e.b, h: e.t, fm: e.fm, fy: e.fy, capas: [{ area: As, y: e.d }] };
  const curva = curvaInteraccionMuro(sec, phiFueraPlanoFn(), { hPrime: e.hPrime, t: e.t });
  const cumpleV = razonV === null ? null : razonV <= 1;
  const cumpleTodo =
    fuera.cumple === true && fuera.esbeltezAdmisible && fuera.cumpleCuantia !== false && cumpleV !== false && (e.Pu <= 0 || axial.cumple !== false);
  return { As, Ae, fuera, axial, Pn, Vn, phiVn, razonV, cumpleV, sec, curva, cumpleTodo };
}

/**
 * Efectos de una carga lateral uniforme q (kN/m² de muro) sobre una franja de ancho b (mm) apoyada arriba y abajo
 * (simplemente apoyada, luz h′): Mu = q b h′² / 8 (kN·m) y Vu = q b h′ / 2 (kN). Esquema del proyecto, no texto de la norma.
 */
export function efectosCargaLateral(q: number, b: number, hPrime: number): { Mu: number; Vu: number } {
  const bm = b / 1000;
  const hm = hPrime / 1000;
  return { Mu: (q * bm * hm * hm) / 8, Vu: (q * bm * hm) / 2 };
}
