/**
 * Título D, Capítulo D.5 (partes D.5.1 a D.5.4): módulos de elasticidad y de cortante, dimensiones efectivas de la
 * mampostería estructural y utilidades de cargas concentradas. Módulo puro, sin dependencias de React.
 *
 * API ESTABLE (la importan otros capítulos y calculadoras del Título D; no cambiar firmas).
 * UNIDADES: longitudes en mm; áreas en mm²; esfuerzos y módulos en MPa; fuerzas en N (MPa·mm² = N), salvo que se indique.
 * Las razones (h′/t, coeficientes de la Tabla D.5.4-1, φ) son adimensionales.
 * PDF = página impresa "D-n" + 565. Constantes en src/data/dimensionesMamposteria.ts.
 *
 * Exporta: moduloElasticidadMamposteria, moduloElasticidadMamposteriaDetalle, moduloElasticidadMortero,
 * moduloElasticidadMorteroDetalle, dispersionPorUnidadProfundidad, moduloCortanteMamposteria, moduloCortanteMortero, relacionModular, coeficienteMachones, espesorEfectivoMachones,
 * espesorEquivalenteInercia, alturaEfectiva, verificarEsbeltez, anchoEfectivoPerpendicular, anchoEfectivoParalelo,
 * areaEfectiva, areaCortantePerpendicular, areaCortanteParalela, distanciaMaximaApoyosViga, flechaMaximaViga,
 * esVigaAlta, anchoAletaMaximo, longitudAplastamiento, esfuerzoAplastamientoMaximo, alturaBloque,
 * cargaBalanceada, phiEnPlanoFlexocompresion, dimensionesEfectivas.
 */
import {
  ANGULO_DISPERSION_GRADOS,
  COEF_EM_ARCILLA,
  COEF_EM_CONCRETO,
  COEF_ER,
  DIVISOR_FLECHA_VIGA,
  EM_MAX_MPA,
  EPSILON_MU,
  ER_MAX_MPA,
  ES_ACERO_MPA,
  FACTOR_A_SOBRE_C,
  FACTOR_ALETA,
  FACTOR_ALTURA_VOLADIZO,
  FACTOR_ANCHO_EFECTIVO,
  FACTOR_APLASTAMIENTO_FM,
  FACTOR_BLOQUE_FM,
  FACTOR_DISTANCIA_APOYOS_VIGA,
  FACTOR_LONGITUD_APLASTAMIENTO,
  FY_MAX_INCREMENTO_PHI,
  LIMITES_INCREMENTO_PHI,
  PHI_ENPLANO_FLEXOCOMPRESION_MAX,
  PHI_MAMPOSTERIA,
  RAZON_GM_EM,
  RAZON_GR_ER,
  RELACION_ESBELTEZ_MAX,
  RELACION_VIGA_ALTA,
  TABLA_D54_1,
} from '../../data/dimensionesMamposteria';

export type TipoMamposteria = 'concreto' | 'arcilla';
export type Aparejo = 'trabado' | 'petaca';
export type ApoyoLateral = 'ambos' | 'voladizo';

/* ------------------------------------------------------------------ */
/* D.5.2 — Módulos de elasticidad y de cortante                        */
/* ------------------------------------------------------------------ */

export type ResultadoModulo = {
  /** Valor de la ecuación sin aplicar el tope, MPa. */
  sinTope: number;
  /** Valor adoptado = mín(sinTope, tope), MPa. */
  valor: number;
  /** true si el tope de 20 000 MPa gobierna. */
  topeActivo: boolean;
};

function aplicarTope(sinTope: number, tope: number): ResultadoModulo {
  const valor = Math.min(sinTope, tope);
  return { sinTope, valor, topeActivo: sinTope > tope };
}

/** Em con detalle del tope. Concreto: 900 f′m (D.5.2-2); arcilla: 750 f′m (D.5.2-3); ambas ≤ 20 000 MPa. fm en MPa. */
export function moduloElasticidadMamposteriaDetalle(fm: number, tipo: TipoMamposteria): ResultadoModulo {
  const coef = tipo === 'concreto' ? COEF_EM_CONCRETO : COEF_EM_ARCILLA;
  return aplicarTope(coef * fm, EM_MAX_MPA);
}

/** Em en MPa sin ensayos (D.5.2.1.2, Ec. D.5.2-2 y D.5.2-3). fm = f′m en MPa. */
export function moduloElasticidadMamposteria(fm: number, tipo: TipoMamposteria): number {
  return moduloElasticidadMamposteriaDetalle(fm, tipo).valor;
}

/** Er con detalle del tope: 2500 √f′cr ≤ 20 000 MPa (Ec. D.5.2-4). fcr = resistencia del mortero de relleno, MPa. */
export function moduloElasticidadMorteroDetalle(fcr: number): ResultadoModulo {
  return aplicarTope(COEF_ER * Math.sqrt(fcr), ER_MAX_MPA);
}

/** Er en MPa (D.5.2.1.3, Ec. D.5.2-4). */
export function moduloElasticidadMortero(fcr: number): number {
  return moduloElasticidadMorteroDetalle(fcr).valor;
}

/** Gm = 0.4 Em (Ec. D.5.2-5), MPa. */
export function moduloCortanteMamposteria(Em: number): number {
  return RAZON_GM_EM * Em;
}

/** Gr = 0.5 Er (Ec. D.5.2-6), MPa. */
export function moduloCortanteMortero(Er: number): number {
  return RAZON_GR_ER * Er;
}

/** Relación modular n = Es/Em (autoría del proyecto: la usan la sección transformada y el Apéndice D-1; D.5 no la formula). */
export function relacionModular(Em: number, Es: number = ES_ACERO_MPA): number {
  return Es / Em;
}

/* ------------------------------------------------------------------ */
/* D.5.4.2 — Espesor efectivo (Tabla D.5.4-1)                          */
/* ------------------------------------------------------------------ */

export type ResultadoMachones = {
  /** Coeficiente de la Tabla D.5.4-1 (interpolación lineal en ambas direcciones). */
  coef: number;
  /** Relación espaciamiento/espesor del machón usada (ya acotada a 6…20 si estaba fuera). */
  relEspaciamientoUsada: number;
  /** Relación espesor machón/espesor muro usada (acotada a 1…3). */
  relEspesorUsada: number;
  /** true si alguna relación quedó fuera de los límites 1.0–3.0 (columnas) de la tabla y se acotó. */
  fueraDeTabla: boolean;
};

function interpolar(x: number, xs: readonly number[], ys: readonly number[]): number {
  if (x <= xs[0]) return ys[0];
  const n = xs.length;
  if (x >= xs[n - 1]) return ys[n - 1];
  for (let i = 0; i < n - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const f = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + f * (ys[i + 1] - ys[i]);
    }
  }
  return ys[n - 1];
}

/**
 * Coeficiente de la Tabla D.5.4-1 por interpolación lineal (nota (*) de la tabla).
 * relEspaciamiento = espaciamiento del machón / espesor del machón (≤ 6 usa la fila «6 ó menos»; ≥ 20 usa «20 ó más» = 1.0).
 * relEspesor = espesor del machón / espesor del muro (columnas 1.0 a 3.0). Si es < 1 se toma 1.0 (coef = 1) y si es > 3 se toma
 * el de 3.0; en ambos casos `fueraDeTabla` = true (la norma no da valores fuera de la tabla; el acotamiento es criterio del proyecto).
 */
export function coeficienteMachones(relEspaciamiento: number, relEspesor: number): ResultadoMachones {
  const { relEspaciamiento: filas, relEspesor: cols, coeficientes } = TABLA_D54_1;
  const relE = Math.min(Math.max(relEspaciamiento, filas[0]), filas[filas.length - 1]);
  const relT = Math.min(Math.max(relEspesor, cols[0]), cols[cols.length - 1]);
  const porColumna = cols.map((_, j) => interpolar(relE, filas, coeficientes.map((fila) => fila[j])));
  const coef = interpolar(relT, cols, porColumna);
  return {
    coef,
    relEspaciamientoUsada: relE,
    relEspesorUsada: relT,
    fueraDeTabla: relEspesor < cols[0] || relEspesor > cols[cols.length - 1],
  };
}

/** Espesor efectivo t = t_muro × coeficiente de la Tabla D.5.4-1 (D.5.4.2(b)). Longitudes en mm. */
export function espesorEfectivoMachones(
  espesorMuro: number,
  espaciamientoMachon: number,
  espesorMachon: number,
): { t: number } & ResultadoMachones {
  const r = coeficienteMachones(espaciamientoMachon / espesorMachon, espesorMachon / espesorMuro);
  return { ...r, t: espesorMuro * r.coef };
}

/**
 * Espesor efectivo de una sección no rectangular (D.5.4.2(d)): espesor de la sección rectangular de igual ancho b e inercia
 * equivalente I → t = (12 I / b)^(1/3). I en mm⁴ (respecto al eje paralelo al ancho b), b en mm.
 */
export function espesorEquivalenteInercia(I: number, b: number): number {
  return Math.cbrt((12 * I) / b);
}

/* ------------------------------------------------------------------ */
/* D.5.4.3 — Altura efectiva y relación h′/t                           */
/* ------------------------------------------------------------------ */

/**
 * Altura efectiva h′ (D.5.4.3).
 * - 'ambos': soportado lateralmente arriba y abajo → distancia libre entre apoyos (a).
 * - 'voladizo': no soportado en un extremo → doble de la dimensión desde el apoyo (b).
 * `hJustificada` (opcional): dimensión menor justificada apropiadamente (c); solo se acepta si es menor que la de (a)/(b).
 */
export function alturaEfectiva(dimension: number, apoyo: ApoyoLateral, hJustificada?: number): number {
  const base = apoyo === 'voladizo' ? FACTOR_ALTURA_VOLADIZO * dimension : dimension;
  if (hJustificada !== undefined && Number.isFinite(hJustificada) && hJustificada > 0 && hJustificada < base) return hJustificada;
  return base;
}

/** Relación h′/t y verificación h′/t ≤ 25 en muros estructurales (D.5.4.3.1). */
export function verificarEsbeltez(hEf: number, t: number): { relacion: number; maximo: number; cumple: boolean; hMaxima: number } {
  const relacion = hEf / t;
  return { relacion, maximo: RELACION_ESBELTEZ_MAX, cumple: relacion <= RELACION_ESBELTEZ_MAX, hMaxima: RELACION_ESBELTEZ_MAX * t };
}

/* ------------------------------------------------------------------ */
/* D.5.4.4 — Ancho efectivo b                                          */
/* ------------------------------------------------------------------ */

export type ResultadoAncho = {
  /** Ancho efectivo adoptado, mm (criterio literal de la norma: el MAYOR). */
  b: number;
  /** n × ancho nominal del muro (n = 6 trabado, 3 petaca), mm. */
  nVecesAncho: number;
  /** Distancia centro a centro entre refuerzos verticales, mm. */
  separacion: number;
  /** Lectura alternativa «el MENOR», solo informativa (autoría del proyecto): ver nota de errata en el capítulo D.5a. */
  bSiSeLeyeraComoTope: number;
  /** true si todas las celdas están inyectadas: la sección es sólida y no se aplican reducciones. */
  solida: boolean;
};

/**
 * Ancho efectivo b para flexión perpendicular al plano del muro (D.5.4.4.1), unidades de perforación vertical.
 * Aparejo trabado: la mayor entre 6 veces el ancho nominal y la separación centro a centro del refuerzo vertical;
 * petaca: la mayor entre 3 veces el ancho nominal y la separación. Con todas las celdas inyectadas la sección es sólida y
 * no se aplican las reducciones: b = `anchoSolido` (longitud de muro considerada; por defecto la separación).
 */
export function anchoEfectivoPerpendicular(args: {
  aparejo: Aparejo;
  anchoNominal: number;
  separacionRefuerzo: number;
  todasInyectadas?: boolean;
  anchoSolido?: number;
}): ResultadoAncho {
  const { aparejo, anchoNominal, separacionRefuerzo, todasInyectadas = false, anchoSolido } = args;
  const nVecesAncho = FACTOR_ANCHO_EFECTIVO[aparejo] * anchoNominal;
  if (todasInyectadas) {
    const b = anchoSolido ?? separacionRefuerzo;
    return { b, nVecesAncho, separacion: separacionRefuerzo, bSiSeLeyeraComoTope: b, solida: true };
  }
  return {
    b: Math.max(nVecesAncho, separacionRefuerzo),
    nVecesAncho,
    separacion: separacionRefuerzo,
    bSiSeLeyeraComoTope: Math.min(nVecesAncho, separacionRefuerzo),
    solida: false,
  };
}

/** Ancho efectivo b para flexión paralela al plano: b = Ae/ℓw (D.5.4.4.2). Ae en mm², ℓw en mm. */
export function anchoEfectivoParalelo(Ae: number, lw: number): number {
  return Ae / lw;
}

/* ------------------------------------------------------------------ */
/* D.5.4.1 y D.5.4.5 — Áreas efectivas                                 */
/* ------------------------------------------------------------------ */

/**
 * Área efectiva Ae (D.5.4.1) = área mínima de contacto mortero de pega–unidad + área inyectada (+ elementos de confinamiento
 * en mampostería confinada). `factorJuntaRanurada` (≤ 1) reduce proporcionalmente el área de contacto cuando la junta es
 * ranurada (la norma no da el factor: se interpreta como relación entre el contacto efectivo y el total; autoría del proyecto).
 */
export function areaEfectiva(args: {
  areaContacto: number;
  areaInyectada?: number;
  areaConfinamiento?: number;
  factorJuntaRanurada?: number;
}): number {
  const { areaContacto, areaInyectada = 0, areaConfinamiento = 0, factorJuntaRanurada = 1 } = args;
  return areaContacto * factorJuntaRanurada + areaInyectada + areaConfinamiento;
}

/**
 * Amv para cortante perpendicular al plano (D.5.4.5.1): Amv = Ae, salvo que el mortero de pega se coloque solo en las paredes
 * laterales de la unidad de perforación vertical (D.4.5.10.1(b)); en ese caso Amv = suma de las porciones inyectadas con sus
 * paredes circundantes (`areaInyectadaConParedes`).
 */
export function areaCortantePerpendicular(Ae: number, morteroSoloParedesLaterales = false, areaInyectadaConParedes?: number): number {
  return morteroSoloParedesLaterales && areaInyectadaConParedes !== undefined ? areaInyectadaConParedes : Ae;
}

/** Amv para cortante paralelo al plano (D.5.4.5.2): Amv = b ℓw, con b el ancho efectivo del alma (zona central si hay concentraciones de celdas inyectadas en los extremos). */
export function areaCortanteParalela(bAlma: number, lw: number): number {
  return bAlma * lw;
}

/* ------------------------------------------------------------------ */
/* D.5.4.6 a D.5.4.8 — Vigas y dinteles                                */
/* ------------------------------------------------------------------ */

/** Distancia máxima entre apoyos laterales de vigas y dinteles = 32 b (D.5.4.6), mm. */
export function distanciaMaximaApoyosViga(b: number): number {
  return FACTOR_DISTANCIA_APOYOS_VIGA * b;
}

/** Flecha elástica máxima = ℓ/500 bajo las cargas verticales sin mayorar (D.5.4.7), misma unidad que ℓ. */
export function flechaMaximaViga(luz: number): number {
  return luz / DIVISOR_FLECHA_VIGA;
}

/** Viga de sección alta si ℓ/h < 1.25 (luz simple) o < 2.5 (luz continua) (D.5.4.8). */
export function esVigaAlta(luz: number, h: number, continua = false): { relacion: number; limite: number; alta: boolean } {
  const limite = continua ? RELACION_VIGA_ALTA.continua : RELACION_VIGA_ALTA.simple;
  const relacion = luz / h;
  return { relacion, limite, alta: relacion < limite };
}

/* ------------------------------------------------------------------ */
/* D.5.3 — Aletas y cargas concentradas                                */
/* ------------------------------------------------------------------ */

/** Ancho efectivo máximo de aleta (a cada lado o a un lado) = 6 × espesor del muro intersectado (D.5.3.2.1), mm. */
export function anchoAletaMaximo(espesorMuroIntersectado: number): number {
  return FACTOR_ALETA * espesorMuroIntersectado;
}

/**
 * Longitud del área de aplastamiento bajo una carga concentrada (D.5.3.3(a)).
 * Trabado: ≤ ancho de la pieza soportada + 4 × espesor del apoyo, sin pasar de la distancia entre centros de cargas (si se da).
 * Petaca: el tamaño de la unidad en esa dirección (`tamanoUnidad`).
 */
export function longitudAplastamiento(args: {
  aparejo: Aparejo;
  anchoPieza?: number;
  espesorApoyo?: number;
  distanciaEntreCargas?: number;
  tamanoUnidad?: number;
}): number {
  const { aparejo, anchoPieza = 0, espesorApoyo = 0, distanciaEntreCargas, tamanoUnidad = 0 } = args;
  if (aparejo === 'petaca') return tamanoUnidad;
  const base = anchoPieza + FACTOR_LONGITUD_APLASTAMIENTO * espesorApoyo;
  return distanciaEntreCargas !== undefined ? Math.min(base, distanciaEntreCargas) : base;
}

/** Esfuerzo de aplastamiento máximo bajo cargas mayoradas = φ 0.85 f′m con φ = 0.60 (D.5.3.3(b), D.5.1.5.3), MPa. */
export function esfuerzoAplastamientoMaximo(fm: number): number {
  return PHI_MAMPOSTERIA.aplastamiento * FACTOR_APLASTAMIENTO_FM * fm;
}

/** Tangente del ángulo de dispersión de cargas concentradas (45° trabado, 30° petaca), D.5.3.3(c): ancho que gana por unidad de profundidad. */
export function dispersionPorUnidadProfundidad(aparejo: Aparejo): number {
  return Math.tan((ANGULO_DISPERSION_GRADOS[aparejo] * Math.PI) / 180);
}

/* ------------------------------------------------------------------ */
/* D.5.1 — Bloque equivalente, Pb y φ variable                         */
/* ------------------------------------------------------------------ */

/** Profundidad del bloque a = 0.85 c (D.5.1.6.6(b)), mm. */
export function alturaBloque(c: number): number {
  return FACTOR_A_SOBRE_C * c;
}

/**
 * Condición balanceada con todas las celdas inyectadas (Ec. D.5.1-2): ab = 0.85 d εmu/(εmu + fy/Es), Pb = 0.80 f′m b ab.
 * d y b en mm; fm, fy en MPa; ab en mm; Pb en N. Es = 200 000 MPa.
 */
export function cargaBalanceada(fm: number, b: number, d: number, fy: number, Es: number = ES_ACERO_MPA): { ab: number; Pb: number } {
  const ab = FACTOR_A_SOBRE_C * d * (EPSILON_MU / (EPSILON_MU + fy / Es));
  return { ab, Pb: FACTOR_BLOQUE_FM * fm * b * ab };
}

/**
 * φ para flexo-compresión paralela al plano en muros con refuerzo simétrico y fy ≤ 420 MPa (D.5.1.5.2(b)): φ = 0.60 y puede
 * incrementarse linealmente hasta 0.85 cuando φPn baja desde 0.10 f′m Ae «ó» 0.25 Pb hasta cero.
 * La norma no dice cuál de los dos límites rige: se adopta el MENOR (criterio conservador, autoría del proyecto).
 * phiPn, f′m·Ae y Pb en la misma unidad de fuerza (N o kN, coherentes).
 */
export function phiEnPlanoFlexocompresion(args: { phiPn: number; fmAe: number; Pb?: number; fy: number }): {
  phi: number;
  limite: number;
  incrementoPermitido: boolean;
} {
  const { phiPn, fmAe, Pb, fy } = args;
  const base = PHI_MAMPOSTERIA.enPlanoCompresion;
  const l1 = LIMITES_INCREMENTO_PHI.factorFmAe * fmAe;
  const limite = Pb !== undefined && Number.isFinite(Pb) ? Math.min(l1, LIMITES_INCREMENTO_PHI.factorPb * Pb) : l1;
  if (fy > FY_MAX_INCREMENTO_PHI || !(limite > 0)) return { phi: base, limite, incrementoPermitido: false };
  const fr = Math.min(Math.max(phiPn / limite, 0), 1);
  return { phi: PHI_ENPLANO_FLEXOCOMPRESION_MAX - (PHI_ENPLANO_FLEXOCOMPRESION_MAX - base) * fr, limite, incrementoPermitido: true };
}

/* ------------------------------------------------------------------ */
/* Paquete para la calculadora                                         */
/* ------------------------------------------------------------------ */

export type EntradaDimensiones = {
  tipo: TipoMamposteria;
  fm: number;
  fcr?: number;
  espesorMuro: number;
  /** Si hay machones: espaciamiento y espesor del machón. */
  machones?: { espaciamiento: number; espesor: number };
  dimensionVertical: number;
  apoyo: ApoyoLateral;
  hJustificada?: number;
};

/** Cálculo integral usado por la calculadora «Dimensiones efectivas y módulos»: módulos E/G, t, h′ y h′/t. */
export function dimensionesEfectivas(e: EntradaDimensiones) {
  const Em = moduloElasticidadMamposteriaDetalle(e.fm, e.tipo);
  const Er = e.fcr !== undefined && Number.isFinite(e.fcr) && e.fcr > 0 ? moduloElasticidadMorteroDetalle(e.fcr) : undefined;
  const mach = e.machones ? espesorEfectivoMachones(e.espesorMuro, e.machones.espaciamiento, e.machones.espesor) : undefined;
  const t = mach ? mach.t : e.espesorMuro;
  const hEf = alturaEfectiva(e.dimensionVertical, e.apoyo, e.hJustificada);
  return {
    Em,
    Gm: moduloCortanteMamposteria(Em.valor),
    Er,
    Gr: Er ? moduloCortanteMortero(Er.valor) : undefined,
    n: relacionModular(Em.valor),
    machones: mach,
    t,
    hEf,
    esbeltez: verificarEsbeltez(hEf, t),
  };
}
