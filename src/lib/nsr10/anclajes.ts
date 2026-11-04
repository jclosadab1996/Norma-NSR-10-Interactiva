/**
 * Apéndice C-D (Anclaje al concreto) de la NSR-10.
 * Unidades: mm, MPa; las resistencias se devuelven en kN. Las constantes viven en src/data/anclajes.ts.
 * Todo lo marcado «(proyecto)» es una decisión de implementación y no texto de la norma.
 */
import {
  BORDE_MIN_POST_FACTOR_DA,
  CAC_FACTOR_HEF,
  COEF_ANCO,
  COEF_AVCO,
  type CategoriaPost,
  type CombinacionesCarga,
  type CondicionRefuerzo,
  FACTOR_MORTERO_INYECTADO,
  FACTOR_PROYECCION_N,
  FACTOR_SISMICO_CONCRETO,
  FUTA_FACTOR_FYA,
  FUTA_MAX_MPA,
  HEF_MAX_ESPESOR_MENOS_MM,
  HEF_MAX_FRACCION_ESPESOR,
  INTERACCION_LIMITE,
  INTERACCION_UMBRAL,
  KC_MAX,
  KC_POSTINSTALADO,
  KC_PREINSTALADO,
  KCP_CORTO,
  KCP_HEF_LIMITE_MM,
  KCP_LARGO,
  LE_FACTOR_TORQUE_CAMISA,
  LE_MAX_FACTOR_DA,
  NB_ALT_COEF,
  NB_ALT_HEF_MAX_MM,
  NB_ALT_HEF_MIN_MM,
  NP_COEF_CABEZA,
  NP_COEF_GANCHO,
  NSB_COEF,
  NSB_RELACION_CA2_MAX,
  NSBG_RELACION_S_CA1,
  PHI_ACERO,
  PHI_CONCRETO,
  PSI_CN_NO_FISURADO_POSTINSTALADO,
  PSI_CN_NO_FISURADO_PREINSTALADO,
  PSI_CP_NO_FISURADO,
  PSI_CV,
  SEPARACION_MIN_FACTOR_DA,
  type TipoAnclaje,
  VB_COEF,
  VB_COEF_SOLDADO,
  VSA_FACTOR_TORNILLO,
} from '../../data/anclajes';

export type { CategoriaPost, CombinacionesCarga, CondicionRefuerzo, TipoAnclaje };

const aKN = (n: number) => n / 1000;

export const esPostinstalado = (t: TipoAnclaje) => t !== 'preinstalado';

/* ------------------------------------------------------------------ */
/* φ                                                                    */
/* ------------------------------------------------------------------ */

export type ModoConcreto = 'arrancamiento' | 'desprendimiento-lateral' | 'extraccion' | 'cabeceo';

/** φ de un elemento de acero (C-D.4.4 a/b, C-D.4.5 a/b). */
export function phiAcero(combinaciones: CombinacionesCarga, ductil: boolean, carga: 'traccion' | 'cortante'): number {
  return PHI_ACERO[combinaciones][ductil ? 'ductil' : 'fragil'][carga];
}

/** Condición A (refuerzo suplementario, salvo extracción o cabeceo) o B (C-D.4.4 c). */
export function condicionPhi(refuerzoSuplementario: boolean, modo: ModoConcreto): CondicionRefuerzo {
  return refuerzoSuplementario && modo !== 'extraccion' && modo !== 'cabeceo' ? 'A' : 'B';
}

/** φ de un modo de falla del concreto (C-D.4.4 c, C-D.4.5 c). `categoria` solo aplica a postinstalados en tracción. */
export function phiConcreto(args: {
  combinaciones: CombinacionesCarga;
  carga: 'traccion' | 'cortante';
  modo: ModoConcreto;
  refuerzoSuplementario: boolean;
  tipo: TipoAnclaje;
  categoria?: CategoriaPost;
}): number {
  const cond = condicionPhi(args.refuerzoSuplementario, args.modo);
  const t = PHI_CONCRETO[args.combinaciones];
  if (args.carga === 'cortante') return t.cortante[cond];
  if (!esPostinstalado(args.tipo)) return t.traccion.preinstalado[cond];
  const cat = args.categoria ?? 3;
  const clave = cat === 1 ? 'categoria1' : cat === 2 ? 'categoria2' : 'categoria3';
  return t.traccion[clave][cond];
}

/* ------------------------------------------------------------------ */
/* Acero                                                                */
/* ------------------------------------------------------------------ */

/** futa utilizable: el menor entre futa, 1.9 fya y 860 MPa (C-D.5.1.2). */
export function futaEfectiva(futa: number, fya: number): number {
  return Math.min(futa, FUTA_FACTOR_FYA * fya, FUTA_MAX_MPA);
}

/** Ec. C-D-3: Nsa = n Ase,N futa (kN). */
export function resistenciaAceroTraccion(n: number, Ase: number, futa: number, fya: number): number {
  return aKN(n * Ase * futaEfectiva(futa, fya));
}

export type TipoAceroCortante = 'conector-soldado' | 'tornillo';

/** Ec. C-D-19 (conectores preinstalados) y C-D-20 (0.6 Ase,V futa) (kN); con mortero inyectado × 0.80 (C-D.6.1.3). */
export function resistenciaAceroCortante(args: {
  n: number;
  Ase: number;
  futa: number;
  fya: number;
  tipo: TipoAceroCortante;
  morteroInyectado?: boolean;
}): number {
  const f = futaEfectiva(args.futa, args.fya);
  const base = args.tipo === 'conector-soldado' ? args.n * args.Ase * f : args.n * VSA_FACTOR_TORNILLO * args.Ase * f;
  return aKN(base * (args.morteroInyectado ? FACTOR_MORTERO_INYECTADO : 1));
}

/* ------------------------------------------------------------------ */
/* Arrancamiento del concreto en tracción                               */
/* ------------------------------------------------------------------ */

/** kc: 10 preinstalados, 7 postinstalados; con ensayos ACI 355.2 puede subir sin pasar de 10 (C-D.5.2.2). */
export function kcAnclaje(tipo: TipoAnclaje, kcEnsayo?: number): number {
  if (!esPostinstalado(tipo)) return KC_PREINSTALADO;
  if (kcEnsayo === undefined) return KC_POSTINSTALADO;
  return Math.min(Math.max(kcEnsayo, KC_POSTINSTALADO), KC_MAX);
}

/** Ec. C-D-7: Nb = kc λ √f′c hef^1.5 (kN). */
export function resistenciaBasicaArrancamiento(fc: number, hef: number, kc: number, lambda = 1): number {
  return aKN(kc * lambda * Math.sqrt(fc) * hef ** 1.5);
}

/** Ec. C-D-8 (pernos con cabeza preinstalados, 280 ≤ hef ≤ 635 mm): Nb = 3.9 λ √f′c hef^(5/3) (kN). */
export function resistenciaBasicaArrancamientoAlt(fc: number, hef: number, lambda = 1): number {
  return aKN(NB_ALT_COEF * lambda * Math.sqrt(fc) * hef ** (5 / 3));
}

/** ¿Se permite la Ec. C-D-8? (280 mm ≤ hef ≤ 635 mm) */
export const permiteNbAlternativo = (hef: number) => hef >= NB_ALT_HEF_MIN_MM && hef <= NB_ALT_HEF_MAX_MM;

/** Ec. C-D-6: ANco = 9 hef² (mm²). */
export const areaNco = (hef: number) => COEF_ANCO * hef * hef;

export interface GeometriaGrupo {
  /** Anclajes en la dirección x (≥ 1) y en la y (≥ 1). */
  nx: number;
  ny: number;
  /** Separación entre anclajes consecutivos, mm. */
  sx: number;
  sy: number;
  /** Distancia desde los anclajes extremos hasta cada borde libre, mm (Infinity si no hay borde cercano). */
  cIzq: number;
  cDer: number;
  cSup: number;
  cInf: number;
}

/** Longitud de la unión de intervalos [pos − izq, pos + der] a lo largo de un eje. */
function longitudUnion(posiciones: number[], izq: number[], der: number[]): number {
  const iv = posiciones.map((p, i) => [p - izq[i], p + der[i]] as [number, number]).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [ini, fin] = iv[0];
  for (let i = 1; i < iv.length; i++) {
    const [a, b] = iv[i];
    if (a <= fin) fin = Math.max(fin, b);
    else {
      total += fin - ini;
      [ini, fin] = [a, b];
    }
  }
  return total + (fin - ini);
}

function extension(n: number, s: number, cMenos: number, cMas: number, alcance: number): number {
  const pos = Array.from({ length: n }, (_, i) => i * s);
  const izq = pos.map((_, i) => (i === 0 ? Math.min(cMenos, alcance) : alcance));
  const der = pos.map((_, i) => (i === n - 1 ? Math.min(cMas, alcance) : alcance));
  return longitudUnion(pos, izq, der);
}

/**
 * ANc (mm²): base del rectángulo que resulta de proyectar la superficie de falla 1.5 hef desde los ejes de los anclajes
 * (limitado por los bordes libres) y sin pasar de n ANco (C-D.5.2.1). Se calcula como unión de intervalos por eje (proyecto):
 * coincide con el rectángulo de la norma cuando s < 3 hef y no sobrestima si los conos no se traslapan.
 */
export function areaProyectadaTraccion(hef: number, g: GeometriaGrupo): number {
  const alc = FACTOR_PROYECCION_N * hef;
  const lx = extension(g.nx, g.sx, g.cIzq, g.cDer, alc);
  const ly = extension(g.ny, g.sy, g.cSup, g.cInf, alc);
  return Math.min(lx * ly, g.nx * g.ny * areaNco(hef));
}

/** Ec. C-D-9: ψec,N = 1 / (1 + 2e′N / (3 hef)) ≤ 1.0 por eje; con dos ejes se multiplican. */
export function psiEcN(eN: number, hef: number): number {
  return Math.min(1, 1 / (1 + (2 * Math.abs(eN)) / (3 * hef)));
}

/** Ecs. C-D-10 y C-D-11: ψed,N. */
export function psiEdN(caMin: number, hef: number): number {
  return caMin >= FACTOR_PROYECCION_N * hef ? 1 : 0.7 + (0.3 * caMin) / (FACTOR_PROYECCION_N * hef);
}

/**
 * ψc,N (C-D.5.2.6): 1.0 si el análisis indica fisuración a nivel de servicio; 1.25 preinstalados y 1.4 postinstalados con
 * kc = 7 si no hay fisuración. Para postinstalados con kc > 7 de ensayos se debe usar el informe ACI 355.2 (`psiEnsayo`).
 */
export function psiCN(tipo: TipoAnclaje, fisurado: boolean, opciones: { kc?: number; psiEnsayo?: number } = {}): number {
  if (fisurado) return 1;
  if (!esPostinstalado(tipo)) return PSI_CN_NO_FISURADO_PREINSTALADO;
  if (opciones.psiEnsayo !== undefined) return opciones.psiEnsayo;
  if (opciones.kc !== undefined && opciones.kc > KC_POSTINSTALADO) return 1;
  return PSI_CN_NO_FISURADO_POSTINSTALADO;
}

/** Distancia crítica de borde cac mínima (C-D.8.6): 2.5 hef (sobreperforación), 4 hef (torque o desplazamiento). */
export function distanciaCriticaBorde(tipo: TipoAnclaje, hef: number): number {
  if (tipo === 'preinstalado') return Infinity;
  return CAC_FACTOR_HEF[tipo] * hef;
}

/**
 * ψcp,N (Ecs. C-D-12 y C-D-13): solo para postinstalados diseñados para concreto no fisurado sin refuerzo suplementario;
 * en los demás casos vale 1.0. Con ca,mín < cac: ca,mín/cac, no menor que 1.5 hef/cac.
 */
export function psiCpN(args: { aplica: boolean; caMin: number; cac: number; hef: number }): number {
  if (!args.aplica) return 1;
  if (args.caMin >= args.cac) return 1;
  return Math.max(args.caMin / args.cac, (FACTOR_PROYECCION_N * args.hef) / args.cac);
}

/** hef a usar con anclajes a menos de 1.5 hef de tres o más bordes: mayor entre ca,máx/1.5 y smáx/3 (C-D.5.2.3). */
export function hefTresBordes(caMax: number, sMax: number): number {
  return Math.max(caMax / FACTOR_PROYECCION_N, sMax / 3);
}

export interface EntradaArrancamiento {
  fc: number;
  lambda?: number;
  hef: number;
  tipo: TipoAnclaje;
  geometria: GeometriaGrupo;
  fisurado: boolean;
  /** Excentricidades de la carga de tracción respecto al centroide de los anclajes traccionados, mm. */
  eNx?: number;
  eNy?: number;
  kcEnsayo?: number;
  psiCNEnsayo?: number;
  refuerzoSuplementario?: boolean;
  /** Usar la Ec. C-D-8 en lugar de la C-D-7 (solo preinstalados con cabeza y 280 ≤ hef ≤ 635). */
  usarEcCD8?: boolean;
}

export interface ResultadoArrancamiento {
  n: number;
  hefUsado: number;
  hefReducido: boolean;
  kc: number;
  Nb: number;
  Anco: number;
  Anc: number;
  caMin: number;
  psiEc: number;
  psiEd: number;
  psiC: number;
  psiCp: number;
  /** Ncb si n = 1, Ncbg si n > 1 (kN). */
  Ncb: number;
  esGrupo: boolean;
  /** Los anclajes están a menos de 3 hef (grupo, según C-D.1; el PDF dice «al menos» 3 hef: errata). */
  separacionMinimaAdyacente: number;
}

/** Ecs. C-D-4 y C-D-5: arrancamiento del concreto de un anclaje o grupo en tracción. */
export function arrancamientoTraccion(e: EntradaArrancamiento): ResultadoArrancamiento {
  const g = e.geometria;
  const n = g.nx * g.ny;
  const lambda = e.lambda ?? 1;
  const bordes = [g.cIzq, g.cDer, g.cSup, g.cInf];
  const caMin = Math.min(...bordes);
  const cercanos = bordes.filter((c) => c < FACTOR_PROYECCION_N * e.hef);
  let hefUsado = e.hef;
  let hefReducido = false;
  if (cercanos.length >= 3) {
    const sMax = Math.max(g.nx > 1 ? (g.nx - 1) * g.sx : 0, g.ny > 1 ? (g.ny - 1) * g.sy : 0);
    hefUsado = hefTresBordes(Math.max(...cercanos), sMax);
    hefReducido = hefUsado !== e.hef;
  }
  const kc = kcAnclaje(e.tipo, e.kcEnsayo);
  const usaAlt = !!e.usarEcCD8 && e.tipo === 'preinstalado' && permiteNbAlternativo(hefUsado);
  const Nb = usaAlt ? resistenciaBasicaArrancamientoAlt(e.fc, hefUsado, lambda) : resistenciaBasicaArrancamiento(e.fc, hefUsado, kc, lambda);
  const Anco = areaNco(hefUsado);
  const Anc = areaProyectadaTraccion(hefUsado, g);
  const psiEc = n > 1 ? psiEcN(e.eNx ?? 0, hefUsado) * psiEcN(e.eNy ?? 0, hefUsado) : 1;
  const psiEd = psiEdN(caMin, hefUsado);
  const psiC = psiCN(e.tipo, e.fisurado, { kc, psiEnsayo: e.psiCNEnsayo });
  const cac = distanciaCriticaBorde(e.tipo, hefUsado);
  const psiCp = psiCpN({ aplica: esPostinstalado(e.tipo) && !e.fisurado && !e.refuerzoSuplementario, caMin, cac, hef: hefUsado });
  const Ncb = (Anc / Anco) * psiEc * psiEd * psiC * psiCp * Nb;
  const sMinAdy = Math.min(g.nx > 1 ? g.sx : Infinity, g.ny > 1 ? g.sy : Infinity);
  return { n, hefUsado, hefReducido, kc, Nb, Anco, Anc, caMin, psiEc, psiEd, psiC, psiCp, Ncb, esGrupo: n > 1, separacionMinimaAdyacente: sMinAdy };
}

/* ------------------------------------------------------------------ */
/* Extracción por deslizamiento y desprendimiento lateral               */
/* ------------------------------------------------------------------ */

/** Ec. C-D-15: Np = 8 Abrg f′c (kN). */
export const NpCabeza = (Abrg: number, fc: number) => aKN(NP_COEF_CABEZA * Abrg * fc);
/** Ec. C-D-16: Np = 0.9 f′c eh da (kN), con 3 da ≤ eh ≤ 4.5 da. */
export const NpGancho = (fc: number, eh: number, da: number) => aKN(NP_COEF_GANCHO * fc * eh * da);
/** ψc,P (C-D.5.3.6): 1.4 sin fisuración a nivel de servicio, 1.0 con fisuración. */
export const psiCP = (fisurado: boolean) => (fisurado ? 1 : PSI_CP_NO_FISURADO);
/** Ec. C-D-14: Npn = ψc,P Np (kN, por anclaje). Para n anclajes, φ n Npn (C-D.4.1.2). */
export const Npn = (Np: number, fisurado: boolean) => psiCP(fisurado) * Np;

/** Ec. C-D-17: Nsb = 13 ca1 √Abrg λ √f′c (kN), con factor (1 + ca2/ca1)/4 si ca2 < 3 ca1. Aplica si hef > 2.5 ca1. */
export function desprendimientoLateral(args: { ca1: number; ca2: number; Abrg: number; fc: number; lambda?: number; hef: number }): { aplica: boolean; Nsb: number; factorCa2: number } {
  const { ca1, ca2, Abrg, fc, hef } = args;
  const aplica = hef > 2.5 * ca1;
  const base = NSB_COEF * ca1 * Math.sqrt(Abrg) * (args.lambda ?? 1) * Math.sqrt(fc);
  const rel = ca2 / ca1;
  const factorCa2 = ca2 < NSB_RELACION_CA2_MAX * ca1 ? (1 + Math.min(Math.max(rel, 1), NSB_RELACION_CA2_MAX)) / 4 : 1;
  return { aplica, Nsb: aKN(base * factorCa2), factorCa2 };
}

/** Ec. C-D-18: Nsbg = (1 + s/(6 ca1)) Nsb si s < 6 ca1 (kN); Nsb sin el factor de ca2. */
export function desprendimientoLateralGrupo(Nsb: number, s: number, ca1: number): number {
  return s < NSBG_RELACION_S_CA1 * ca1 ? (1 + s / (NSBG_RELACION_S_CA1 * ca1)) * Nsb : 2 * Nsb;
}

/* ------------------------------------------------------------------ */
/* Cortante                                                             */
/* ------------------------------------------------------------------ */

export type TipoLe = 'constante' | 'torque-camisa' | 'otros';

/** ℓe (C-D.6.2.2): hef; 2 da; o ≤ 8 da (aquí min(hef, 8 da), decisión del proyecto). */
export function longitudApoyoCortante(tipo: TipoLe, hef: number, da: number): number {
  if (tipo === 'constante') return hef;
  if (tipo === 'torque-camisa') return LE_FACTOR_TORQUE_CAMISA * da;
  return Math.min(hef, LE_MAX_FACTOR_DA * da);
}

/** Ecs. C-D-24 y C-D-25: Vb = 0.6 (ℓe/da)^0.2 √da λ √f′c ca1^1.5 (kN); 0.66 si están soldados continuamente a un aditamento. */
export function resistenciaBasicaCortante(args: { le: number; da: number; fc: number; ca1: number; lambda?: number; soldado?: boolean }): number {
  const c = args.soldado ? VB_COEF_SOLDADO : VB_COEF;
  return aKN(c * (args.le / args.da) ** 0.2 * Math.sqrt(args.da) * (args.lambda ?? 1) * Math.sqrt(args.fc) * args.ca1 ** 1.5);
}

/** Ec. C-D-23: AVco = 4.5 ca1² (mm²). */
export const areaVco = (ca1: number) => COEF_AVCO * ca1 * ca1;

/**
 * AVc (mm²): ancho paralelo al borde (unión de intervalos con 1.5 ca1 a cada lado limitado por ca2) por profundidad
 * min(1.5 ca1, ha); no mayor que n AVco (C-D.6.2.1). `nParalelo` anclajes con separación `sParalelo` a lo largo del borde.
 */
export function areaProyectadaCortante(args: { ca1: number; ha: number; nParalelo: number; sParalelo: number; ca2Menos: number; ca2Mas: number; nTotal: number }): number {
  const alc = FACTOR_PROYECCION_N * args.ca1;
  const ancho = extension(args.nParalelo, args.sParalelo, args.ca2Menos, args.ca2Mas, alc);
  const prof = Math.min(alc, args.ha);
  return Math.min(ancho * prof, args.nTotal * areaVco(args.ca1));
}

/** Ec. C-D-26: ψec,V = 1/(1 + 2e′V/(3 ca1)) ≤ 1.0. */
export const psiEcV = (eV: number, ca1: number) => Math.min(1, 1 / (1 + (2 * Math.abs(eV)) / (3 * ca1)));
/** Ecs. C-D-27 y C-D-28: ψed,V. */
export const psiEdV = (ca2: number, ca1: number) => (ca2 >= 1.5 * ca1 ? 1 : 0.7 + (0.3 * ca2) / (1.5 * ca1));
/** Ec. C-D-29: ψh,V = √(1.5 ca1 / ha) ≥ 1.0 (solo si ha < 1.5 ca1). */
export const psiHV = (ca1: number, ha: number) => (ha < 1.5 * ca1 ? Math.max(1, Math.sqrt((1.5 * ca1) / ha)) : 1);

export type RefuerzoBorde = 'ninguno' | 'barra' | 'barra-estribos';
/** ψc,V (C-D.6.2.7). */
export function psiCV(fisurado: boolean, refuerzoBorde: RefuerzoBorde = 'ninguno'): number {
  if (!fisurado) return PSI_CV.noFisurado;
  if (refuerzoBorde === 'barra-estribos') return PSI_CV.fisuradoConBordeYEstribos;
  if (refuerzoBorde === 'barra') return PSI_CV.fisuradoConBorde;
  return PSI_CV.fisuradoSinRefuerzo;
}

/** kcp (C-D.6.3.1): 1.0 si hef < 65 mm, 2.0 si hef ≥ 65 mm. */
export const kcpCabeceo = (hef: number) => (hef < KCP_HEF_LIMITE_MM ? KCP_CORTO : KCP_LARGO);

/** Ecs. C-D-30 y C-D-31: Vcp = kcp Ncb (kN), con Ncb(g) de las Ecs. C-D-4/5. */
export const cabeceo = (hef: number, Ncb: number) => kcpCabeceo(hef) * Ncb;

export interface EntradaArrancamientoCortante {
  fc: number;
  lambda?: number;
  da: number;
  hef: number;
  /** Distancia del borde a la fila crítica (perpendicular al cortante), mm. */
  ca1: number;
  /** Distancia al borde más cercano perpendicular a ca1 (por lado), mm. */
  ca2Menos: number;
  ca2Mas: number;
  /** Espesor del elemento paralelo al anclaje, mm. */
  ha: number;
  /** Anclajes a lo largo del borde (en la fila crítica) y totales en el grupo. */
  nParalelo: number;
  sParalelo: number;
  nTotal: number;
  tipoLe?: TipoLe;
  soldado?: boolean;
  fisurado: boolean;
  refuerzoBorde?: RefuerzoBorde;
  eV?: number;
  /** Cortante paralelo al borde: se permite el doble, con ψed,V = 1 (C-D.6.2.1 c). */
  paraleloAlBorde?: boolean;
}

export interface ResultadoArrancamientoCortante {
  le: number;
  Vb: number;
  Avc: number;
  Avco: number;
  psiEc: number;
  psiEd: number;
  psiC: number;
  psiH: number;
  Vcb: number;
}

/** Ecs. C-D-21 y C-D-22 (kN). */
export function arrancamientoCortante(e: EntradaArrancamientoCortante): ResultadoArrancamientoCortante {
  const le = longitudApoyoCortante(e.tipoLe ?? 'constante', e.hef, e.da);
  const Vb = resistenciaBasicaCortante({ le, da: e.da, fc: e.fc, ca1: e.ca1, lambda: e.lambda, soldado: e.soldado });
  const Avc = areaProyectadaCortante({ ca1: e.ca1, ha: e.ha, nParalelo: e.nParalelo, sParalelo: e.sParalelo, ca2Menos: e.ca2Menos, ca2Mas: e.ca2Mas, nTotal: e.nTotal });
  const Avco = areaVco(e.ca1);
  const psiEc = e.nTotal > 1 ? psiEcV(e.eV ?? 0, e.ca1) : 1;
  const psiEd = e.paraleloAlBorde ? 1 : psiEdV(Math.min(e.ca2Menos, e.ca2Mas), e.ca1);
  const psiC = psiCV(e.fisurado, e.refuerzoBorde);
  const psiH = psiHV(e.ca1, e.ha);
  const factor = e.paraleloAlBorde ? 2 : 1;
  const Vcb = factor * (Avc / Avco) * psiEc * psiEd * psiC * psiH * Vb;
  return { le, Vb, Avc, Avco, psiEc, psiEd, psiC, psiH, Vcb };
}

/* ------------------------------------------------------------------ */
/* Interacción (C-D.7)                                                  */
/* ------------------------------------------------------------------ */

export interface ResultadoInteraccion {
  caso: 'solo-traccion' | 'solo-cortante' | 'interaccion';
  /** Razón gobernante: Nua/φNn, Vua/φVn o la suma de la Ec. C-D-32. */
  razon: number;
  limite: number;
  cumple: boolean;
  razonN: number;
  razonV: number;
}

/** C-D.7.1 a C-D.7.3 y Ec. C-D-32. */
export function interaccionTraccionCortante(Nua: number, phiNn: number, Vua: number, phiVn: number): ResultadoInteraccion {
  const razonN = phiNn > 0 ? Nua / phiNn : Infinity;
  const razonV = phiVn > 0 ? Vua / phiVn : Infinity;
  if (Vua <= INTERACCION_UMBRAL * phiVn) return { caso: 'solo-traccion', razon: razonN, limite: 1, cumple: razonN <= 1, razonN, razonV };
  if (Nua <= INTERACCION_UMBRAL * phiNn) return { caso: 'solo-cortante', razon: razonV, limite: 1, cumple: razonV <= 1, razonN, razonV };
  const s = razonN + razonV;
  return { caso: 'interaccion', razon: s, limite: INTERACCION_LIMITE, cumple: s <= INTERACCION_LIMITE, razonN, razonV };
}

/* ------------------------------------------------------------------ */
/* Distancias, separaciones y espesores (C-D.8)                         */
/* ------------------------------------------------------------------ */

/** Separación mínima centro a centro (C-D.8.1): 4 da (preinstalados sin torsión) o 6 da. */
export const separacionMinima = (da: number, torsionado: boolean) => (torsionado ? SEPARACION_MIN_FACTOR_DA.conTorsion : SEPARACION_MIN_FACTOR_DA.sinTorsion) * da;

/** Distancia mínima al borde de postinstalados sin datos de ensayo (C-D.8.3): 6 da, 8 da o 10 da. */
export function bordeMinimoPostinstalado(tipo: Exclude<TipoAnclaje, 'preinstalado'>, da: number): number {
  return BORDE_MIN_POST_FACTOR_DA[tipo] * da;
}

/** hef máximo de postinstalados: el mayor entre 2/3 del espesor y el espesor menos 100 mm (C-D.8.5). */
export const hefMaximoPostinstalado = (espesor: number) => Math.max(HEF_MAX_FRACCION_ESPESOR * espesor, espesor - HEF_MAX_ESPESOR_MENOS_MM);

/* ------------------------------------------------------------------ */
/* Resultado integrado de tracción y cortante                           */
/* ------------------------------------------------------------------ */

export interface ModoResistencia {
  clave: string;
  nombre: string;
  /** Resistencia nominal del modo (kN), ya incluido n si corresponde. */
  nominal: number;
  phi: number;
  /** φ × nominal (× factor sísmico si aplica a modos del concreto). */
  disenio: number;
  nota?: string;
}

export interface EntradaAnclaje {
  tipo: TipoAnclaje;
  categoria?: CategoriaPost;
  combinaciones: CombinacionesCarga;
  fc: number;
  lambda?: number;
  da: number;
  hef: number;
  /** Área efectiva de la sección en tracción/cortante, mm² (se usa la misma para Ase,N y Ase,V). */
  Ase: number;
  futa: number;
  fya: number;
  aceroDuctil: boolean;
  geometria: GeometriaGrupo;
  fisurado: boolean;
  refuerzoSuplementario: boolean;
  /** Anclajes preinstalados con cabeza: área neta de apoyo de la cabeza (Abrg) para Np y Nsb. */
  Abrg?: number;
  /** Tornillo con gancho: eh. */
  eh?: number;
  /** Np de ensayos (postinstalados), kN por anclaje. */
  NpEnsayo?: number;
  kcEnsayo?: number;
  usarEcCD8?: boolean;
  eNx?: number;
  eNy?: number;
  /** Zona sísmica DMO/DES: φ de modos del concreto × 0.75 (C-D.3.3.3). */
  sismico?: boolean;
  /** Cortante. */
  ha?: number;
  refuerzoBorde?: RefuerzoBorde;
  tipoAceroCortante?: TipoAceroCortante;
  morteroInyectado?: boolean;
  tipoLe?: TipoLe;
  soldado?: boolean;
}

export interface ResultadoTraccionAnclaje {
  modos: ModoResistencia[];
  gobernante: ModoResistencia;
  phiNn: number;
  arrancamiento: ResultadoArrancamiento;
  advertencias: string[];
}

/** Resistencia a tracción de un anclaje o grupo: φNn = menor de φNsa, φ n Npn, φNsb(g) y φNcb(g) (C-D.4.1.2). */
export function resistenciaTraccionAnclaje(e: EntradaAnclaje): ResultadoTraccionAnclaje {
  const g = e.geometria;
  const n = g.nx * g.ny;
  const adv: string[] = [];
  const fSis = e.sismico ? FACTOR_SISMICO_CONCRETO : 1;
  const modos: ModoResistencia[] = [];

  const Nsa = resistenciaAceroTraccion(n, e.Ase, e.futa, e.fya);
  const phiS = phiAcero(e.combinaciones, e.aceroDuctil, 'traccion');
  modos.push({ clave: 'Nsa', nombre: 'Acero del anclaje', nominal: Nsa, phi: phiS, disenio: phiS * Nsa });

  const arr = arrancamientoTraccion({
    fc: e.fc,
    lambda: e.lambda,
    hef: e.hef,
    tipo: e.tipo,
    geometria: g,
    fisurado: e.fisurado,
    eNx: e.eNx,
    eNy: e.eNy,
    kcEnsayo: e.kcEnsayo,
    refuerzoSuplementario: e.refuerzoSuplementario,
    usarEcCD8: e.usarEcCD8,
  });
  const phiArr = phiConcreto({ combinaciones: e.combinaciones, carga: 'traccion', modo: 'arrancamiento', refuerzoSuplementario: e.refuerzoSuplementario, tipo: e.tipo, categoria: e.categoria });
  modos.push({ clave: arr.esGrupo ? 'Ncbg' : 'Ncb', nombre: 'Arrancamiento del concreto', nominal: arr.Ncb, phi: phiArr, disenio: phiArr * arr.Ncb * fSis });

  let NpUno: number | undefined;
  if (e.NpEnsayo !== undefined) NpUno = e.NpEnsayo;
  else if (e.tipo === 'preinstalado' && e.Abrg) NpUno = NpCabeza(e.Abrg, e.fc);
  else if (e.tipo === 'preinstalado' && e.eh) NpUno = NpGancho(e.fc, e.eh, e.da);
  if (NpUno !== undefined) {
    const NpnUno = Npn(NpUno, e.fisurado);
    const phiP = phiConcreto({ combinaciones: e.combinaciones, carga: 'traccion', modo: 'extraccion', refuerzoSuplementario: e.refuerzoSuplementario, tipo: e.tipo, categoria: e.categoria });
    modos.push({ clave: 'Npn', nombre: 'Extracción por deslizamiento', nominal: n * NpnUno, phi: phiP, disenio: phiP * n * NpnUno * fSis, nota: 'n × Npn (C-D.4.1.2)' });
  } else if (esPostinstalado(e.tipo)) {
    adv.push('Postinstalado: Np debe venir de ensayos ACI 355.2 (C-D.5.3.2); sin ese dato no se evalúa la extracción por deslizamiento.');
  } else {
    adv.push('Sin Abrg ni eh no se evalúa la extracción por deslizamiento (C-D.5.3).');
  }

  if (e.tipo === 'preinstalado' && e.Abrg) {
    const ca1 = Math.min(g.cIzq, g.cDer, g.cSup, g.cInf);
    if (Number.isFinite(ca1) && e.hef > 2.5 * ca1) {
      // Fila más cercana al borde y borde adyacente (proyecto).
      const bordes = [
        { c: g.cIzq, fila: g.ny, s: g.sy, adj: Math.min(g.cSup, g.cInf) },
        { c: g.cDer, fila: g.ny, s: g.sy, adj: Math.min(g.cSup, g.cInf) },
        { c: g.cSup, fila: g.nx, s: g.sx, adj: Math.min(g.cIzq, g.cDer) },
        { c: g.cInf, fila: g.nx, s: g.sx, adj: Math.min(g.cIzq, g.cDer) },
      ];
      const b = bordes.reduce((a, x) => (x.c < a.c ? x : a));
      const sb = desprendimientoLateral({ ca1, ca2: b.adj, Abrg: e.Abrg, fc: e.fc, lambda: e.lambda, hef: e.hef });
      const sinFactor = desprendimientoLateral({ ca1, ca2: Infinity, Abrg: e.Abrg, fc: e.fc, lambda: e.lambda, hef: e.hef }).Nsb;
      let nominalFila = sb.Nsb;
      if (b.fila > 1) nominalFila = desprendimientoLateralGrupo(sinFactor, b.s, ca1);
      // Se supone la carga repartida por igual: la fila cercana al borde toma b.fila/n de Nua (proyecto).
      const equivalente = nominalFila * (n / b.fila);
      const phiB = phiConcreto({ combinaciones: e.combinaciones, carga: 'traccion', modo: 'desprendimiento-lateral', refuerzoSuplementario: e.refuerzoSuplementario, tipo: e.tipo, categoria: e.categoria });
      modos.push({
        clave: b.fila > 1 ? 'Nsbg' : 'Nsb',
        nombre: 'Desprendimiento lateral',
        nominal: equivalente,
        phi: phiB,
        disenio: phiB * equivalente * fSis,
        nota: n > b.fila ? 'Fila del borde, carga repartida por igual (proyecto)' : undefined,
      });
    }
  }

  if (arr.separacionMinimaAdyacente >= 3 * arr.hefUsado && n > 1) adv.push('Separación ≥ 3 hef: los anclajes no forman un grupo según C-D.1 (trabajan individualmente en tracción).');
  if (arr.hefReducido) adv.push('Tres o más bordes a menos de 1.5 hef: se usó el hef reducido de C-D.5.2.3.');
  if (e.fc > (esPostinstalado(e.tipo) ? 55 : 70)) adv.push(`f′c excede el máximo del apéndice (${esPostinstalado(e.tipo) ? 55 : 70} MPa, C-D.3.5).`);

  const gobernante = modos.reduce((a, m) => (m.disenio < a.disenio ? m : a));
  return { modos, gobernante, phiNn: gobernante.disenio, arrancamiento: arr, advertencias: adv };
}

export interface ResultadoCortanteAnclaje {
  modos: ModoResistencia[];
  gobernante: ModoResistencia;
  phiVn: number;
  arrancamiento: ResultadoArrancamientoCortante;
}

/**
 * Resistencia a cortante perpendicular al borde inferior (cInf): fila crítica = la más cercana a ese borde (ca1 = cInf).
 * φVn = menor de φVsa, φVcb(g) y φVcp(g) (C-D.4.1.2).
 */
export function resistenciaCortanteAnclaje(e: EntradaAnclaje): ResultadoCortanteAnclaje {
  const g = e.geometria;
  const n = g.nx * g.ny;
  const ha = e.ha ?? Infinity;
  const fSis = e.sismico ? FACTOR_SISMICO_CONCRETO : 1;
  const modos: ModoResistencia[] = [];

  const Vsa = resistenciaAceroCortante({ n, Ase: e.Ase, futa: e.futa, fya: e.fya, tipo: e.tipoAceroCortante ?? 'tornillo', morteroInyectado: e.morteroInyectado });
  const phiS = phiAcero(e.combinaciones, e.aceroDuctil, 'cortante');
  modos.push({ clave: 'Vsa', nombre: 'Acero del anclaje', nominal: Vsa, phi: phiS, disenio: phiS * Vsa });

  const arr = arrancamientoCortante({
    fc: e.fc,
    lambda: e.lambda,
    da: e.da,
    hef: e.hef,
    ca1: g.cInf,
    ca2Menos: g.cIzq,
    ca2Mas: g.cDer,
    ha,
    nParalelo: g.nx,
    sParalelo: g.sx,
    nTotal: n,
    tipoLe: e.tipoLe,
    soldado: e.soldado,
    fisurado: e.fisurado,
    refuerzoBorde: e.refuerzoBorde,
  });
  const phiC = phiConcreto({ combinaciones: e.combinaciones, carga: 'cortante', modo: 'arrancamiento', refuerzoSuplementario: e.refuerzoSuplementario, tipo: e.tipo, categoria: e.categoria });
  modos.push({ clave: n > 1 ? 'Vcbg' : 'Vcb', nombre: 'Arrancamiento del concreto', nominal: arr.Vcb, phi: phiC, disenio: phiC * arr.Vcb * fSis });

  const tr = arrancamientoTraccion({
    fc: e.fc,
    lambda: e.lambda,
    hef: e.hef,
    tipo: e.tipo,
    geometria: g,
    fisurado: e.fisurado,
    kcEnsayo: e.kcEnsayo,
    refuerzoSuplementario: e.refuerzoSuplementario,
    eNx: e.eNx,
    eNy: e.eNy,
  });
  const Vcp = cabeceo(e.hef, tr.Ncb);
  const phiP = phiConcreto({ combinaciones: e.combinaciones, carga: 'cortante', modo: 'cabeceo', refuerzoSuplementario: e.refuerzoSuplementario, tipo: e.tipo, categoria: e.categoria });
  modos.push({ clave: n > 1 ? 'Vcpg' : 'Vcp', nombre: 'Desprendimiento por cabeceo', nominal: Vcp, phi: phiP, disenio: phiP * Vcp * fSis });

  const gobernante = modos.reduce((a, m) => (m.disenio < a.disenio ? m : a));
  return { modos, gobernante, phiVn: gobernante.disenio, arrancamiento: arr };
}
