/**
 * Título C — Capítulo C.23: tanques y estructuras de ingeniería ambiental de concreto
 * (PDF p.509–524, impresas C-207 a C-222). Unidades: MPa, mm, kN, kN·m salvo que se indique.
 * Las ecuaciones C.23-1 a C.23-5 y C.23-C.11-2 son de la norma; los helpers de geometría (brazo interno fisurado,
 * áreas por metro, separación de barras) son mecánica usual y se marcan como auxiliares.
 */
import {
  ABRASION,
  FACTOR_EXENCION_REFUERZO_MINIMO,
  FACTOR_JUNTA_PARCIAL,
  FISURACION,
  FS_DURABILIDAD_MPA,
  LOSAS_TERRENO,
  MUROS_AMBIENTALES,
  RETRACCION_BARRA_MIN_MM,
  RETRACCION_CAPA_EFECTIVA_MM,
  RETRACCION_ESPESOR_GRUESO_MM,
  RETRACCION_REDUCCION_LOSA_SUELO,
  RETRACCION_SEPARACION_MAX_MM,
  TABLA_CEMENTANTE_MIN,
  TABLA_MEZCLA_AMBIENTAL,
  TABLA_RECUBRIMIENTO_AMBIENTAL,
  TABLA_RETRACCION_AMBIENTAL,
  type ColumnaRecubrimiento,
  type FilaRecubrimientoAmbiental,
  type RequisitoMezclaAmbiental,
} from '../../data/concretoSimpleTanques';
import { ES_ACERO_MPA } from './concreto';
import { claseSulfato } from './durabilidad';
import { inerciaFisuradaRectangular } from './resistenciaServicio';

export type Exposicion = 'normal' | 'severa';

/* ═════════════ C.23-C.4 — Durabilidad ═════════════ */

/**
 * Tabla C.23-C.4.1.1: contenido mínimo de materiales cementantes (kg/m³) según el tamaño máximo nominal (mm).
 * La nota de la tabla permite interpolar entre tamaños; aquí la interpolación es lineal (lectura del autor).
 */
export function cementanteMinimo(tamanoMaxMm: number): number {
  const filas = [...TABLA_CEMENTANTE_MIN].sort((a, b) => a.tamanoMm - b.tamanoMm);
  const min = filas[0].tamanoMm;
  const max = filas[filas.length - 1].tamanoMm;
  if (tamanoMaxMm < min || tamanoMaxMm > max) throw new RangeError(`La tabla cubre tamaños de ${min} a ${max} mm`);
  for (let i = 0; i < filas.length - 1; i++) {
    const a = filas[i];
    const b = filas[i + 1];
    if (tamanoMaxMm >= a.tamanoMm && tamanoMaxMm <= b.tamanoMm) {
      const t = (tamanoMaxMm - a.tamanoMm) / (b.tamanoMm - a.tamanoMm);
      return a.kgM3 + t * (b.kgM3 - a.kgM3);
    }
  }
  return filas[filas.length - 1].kgM3;
}

/** Fila de la Tabla C.23-C.4.3.1 para una clase de exposición (solo F3, S0–S3, P1 y Q1 modifican la Tabla C.4.3.1). */
export function requisitoMezclaAmbiental(clase: RequisitoMezclaAmbiental['clase']): RequisitoMezclaAmbiental {
  const fila = TABLA_MEZCLA_AMBIENTAL.find((f) => f.clase === clase);
  if (!fila) throw new RangeError(`La Tabla C.23-C.4.3.1 no incluye la clase ${clase}`);
  return fila;
}

/** Clase de sulfato (S0–S3) por sulfato en el suelo (% en peso) y/o en el agua (ppm); misma segmentación de C.4. */
export const claseSulfatoAmbiental = claseSulfato;

/** Resultado de verificar una mezcla contra la Tabla C.23-C.4.3.1 (a/mc máx, f′c mín). */
export function verificarMezclaAmbiental(clase: RequisitoMezclaAmbiental['clase'], aMc: number, fc: number): { cumpleAMc: boolean; cumpleFc: boolean; cumple: boolean; req: RequisitoMezclaAmbiental } {
  const req = requisitoMezclaAmbiental(clase);
  const cumpleAMc = aMc <= req.aMcMax + 1e-9;
  const cumpleFc = fc >= req.fcMin;
  return { cumpleAMc, cumpleFc, cumple: cumpleAMc && cumpleFc, req };
}

/** C.23-C.4.8.3: requisitos adicionales para erosión por abrasión (f′c, a/mc, aire, cementante). */
export function verificarAbrasion(p: { fc: number; aMc: number; airePct: number; cementanteKgM3: number; congelamiento: boolean }): { cumple: boolean; fallas: string[] } {
  const fallas: string[] = [];
  if (p.fc < ABRASION.fcMinMpa) fallas.push(`f′c < ${ABRASION.fcMinMpa} MPa`);
  if (p.aMc > ABRASION.aMcMax) fallas.push(`a/mc > ${ABRASION.aMcMax}`);
  const aireMax = p.congelamiento ? ABRASION.aireMaxPct : ABRASION.aireMaxSinCongelamientoPct;
  if (p.airePct > aireMax) fallas.push(`aire > ${aireMax} %`);
  if (p.cementanteKgM3 < ABRASION.cementanteMinKgM3) fallas.push(`cementante < ${ABRASION.cementanteMinKgM3} kg/m³`);
  return { cumple: fallas.length === 0, fallas };
}

/** C.23-C.4.10.2: ancho mínimo de una barrera de caucho o PVC (mm), 220 en juntas de expansión y 150 en las demás. */
export function anchoMinimoBarrera(expansion: boolean): number {
  return expansion ? 220 : 150;
}

/* ═════════════ C.23-C.7.7 — Recubrimientos ═════════════ */

/**
 * Filas de la Tabla C.23-C.7.7.1 que corresponden a una condición ((a), (b) o (c)) y, opcionalmente, a un elemento
 * (coincidencia por texto, sin distinguir mayúsculas).
 */
export function filasRecubrimiento(condicion: 'a' | 'b' | 'c', elemento?: string): FilaRecubrimientoAmbiental[] {
  return TABLA_RECUBRIMIENTO_AMBIENTAL.filter(
    (f) => f.condicion === condicion && (elemento === undefined || f.elemento.toLowerCase().includes(elemento.toLowerCase())),
  );
}

/**
 * Recubrimiento mínimo (mm) de la Tabla C.23-C.7.7.1 para una fila concreta, o `null` si «No aplica».
 * `detalle` distingue las filas de un mismo elemento (p. ej. «Refuerzo principal»).
 */
export function recubrimientoAmbiental(p: { condicion: 'a' | 'b' | 'c'; elemento: string; detalle?: string; tipo: ColumnaRecubrimiento }): number | null {
  const candidatas = filasRecubrimiento(p.condicion, p.elemento).filter((f) => p.detalle === undefined || (f.detalle ?? '').toLowerCase().includes(p.detalle.toLowerCase()));
  if (candidatas.length === 0) throw new RangeError('No hay fila en la Tabla C.23-C.7.7.1 para esa combinación');
  if (candidatas.length > 1) throw new RangeError('Combinación ambigua: precise `detalle`');
  return candidatas[0][p.tipo];
}

/** Recubrimiento real de una barra: cc = r − d_est − db/2 si la capa lleva estribos (auxiliar; verifica cc ≥ mínimo). */
export function verificarRecubrimiento(ccProvistoMm: number, ccMinimoMm: number): { cumple: boolean; holguraMm: number } {
  return { cumple: ccProvistoMm >= ccMinimoMm, holguraMm: ccProvistoMm - ccMinimoMm };
}

/* ═════════════ C.23-C.7.12 — Refuerzo de retracción y temperatura ═════════════ */

/**
 * Cuantía mínima de la Tabla C.23-C.7.12.2.1 (sobre la sección bruta).
 * `distanciaM` es la distancia entre juntas de expansión y de contracción de profundidad total; si las juntas son de
 * contracción de profundidad parcial se multiplica la distancia real por 1.5 (nota †). La última fila (12 m o más) es la
 * cuantía máxima a usar cuando no se proveen juntas.
 */
export function cuantiaRetraccionAmbiental(distanciaM: number, fy: 240 | 420, juntaParcial = false): number {
  if (fy !== 240 && fy !== 420) throw new RangeError('La Tabla C.23-C.7.12.2.1 solo da cuantías para fy = 240 y 420 MPa');
  if (distanciaM < 0) throw new RangeError('La distancia entre juntas no puede ser negativa');
  const d = juntaParcial ? distanciaM * FACTOR_JUNTA_PARCIAL : distanciaM;
  const fila = TABLA_RETRACCION_AMBIENTAL.find((f) => d >= f.desdeM && d < f.hastaM);
  if (!fila) throw new RangeError('distancia fuera de la tabla');
  return fy === 240 ? fila.fy240 : fila.fy420;
}

export type ResultadoRetraccion = {
  rho: number;
  /** Espesor de concreto sobre el que se calcula el área, mm. */
  espesorCalculoMm: number;
  /** Área total por metro de ancho, mm²/m (suma de ambas caras). */
  asTotalMm2PorM: number;
  /** Área mínima por cara (≥ 1/3 del total en cada cara, lectura del autor), mm²/m. */
  asMinimaPorCaraMm2PorM: number;
  /** Para dos caras iguales: área por cara, mm²/m. */
  asPorCaraIgualMm2PorM: number;
};

/**
 * Área mínima de refuerzo de retracción y temperatura por metro de ancho de un elemento (muro o losa).
 * Espesor ≥ 600 mm: se calcula con 300 mm de concreto en cada superficie (600 mm en total).
 * `reducirCaraInferiorLosaSuelo` aplica el 50 % de la cara inferior de losas en contacto con el suelo al área
 * por cara que corresponde a esa cara (se devuelve el total reducido a la mitad en esa cara).
 */
export function refuerzoRetraccionAmbiental(p: { hMm: number; distanciaM: number; fy: 240 | 420; juntaParcial?: boolean; losaSobreSuelo?: boolean }): ResultadoRetraccion {
  const rho = cuantiaRetraccionAmbiental(p.distanciaM, p.fy, p.juntaParcial ?? false);
  const espesor = p.hMm >= RETRACCION_ESPESOR_GRUESO_MM ? 2 * RETRACCION_CAPA_EFECTIVA_MM : p.hMm;
  const total = rho * 1000 * espesor;
  const porCara = total / 2;
  const caraInferiorReducida = p.losaSobreSuelo ? porCara * RETRACCION_REDUCCION_LOSA_SUELO : porCara;
  const asTotal = p.losaSobreSuelo ? porCara + caraInferiorReducida : total;
  return { rho, espesorCalculoMm: espesor, asTotalMm2PorM: asTotal, asMinimaPorCaraMm2PorM: total / 3, asPorCaraIgualMm2PorM: porCara };
}

/** Separación (mm) de barras de área `areaBarraMm2` para dar `asMm2PorM` por metro de ancho (auxiliar). */
export function separacionParaArea(areaBarraMm2: number, asMm2PorM: number): number {
  return (1000 * areaBarraMm2) / asMm2PorM;
}

/** C.23-C.7.12.2.2: separación ≤ 300 mm y barra mínima No. 4 (12M, 12 mm). */
export function verificarDetalleRetraccion(separacionMm: number, diametroBarraMm: number): { cumpleSeparacion: boolean; cumpleBarra: boolean; cumple: boolean } {
  const cumpleSeparacion = separacionMm <= RETRACCION_SEPARACION_MAX_MM;
  const cumpleBarra = diametroBarraMm >= RETRACCION_BARRA_MIN_MM;
  return { cumpleSeparacion, cumpleBarra, cumple: cumpleSeparacion && cumpleBarra };
}

/* ═════════════ C.23-C.9.2.6 — Coeficiente de durabilidad ambiental Sd ═════════════ */

/** γ = carga mayorada / carga no mayorada (definición bajo la Ec. C.23-1). */
export function gammaCarga(cargaMayorada: number, cargaNoMayorada: number): number {
  if (cargaNoMayorada <= 0) throw new RangeError('la carga no mayorada debe ser positiva');
  return cargaMayorada / cargaNoMayorada;
}

/** fs permisible (MPa) para tracción directa o anular y para el refuerzo de cortante (C.23-C.9.2.6.2 a .5). */
export function fsDurabilidad(caso: 'traccion-directa' | 'cortante', exposicion: Exposicion): number {
  return caso === 'traccion-directa' ? FS_DURABILIDAD_MPA.traccionDirecta[exposicion] : FS_DURABILIDAD_MPA.cortante[exposicion];
}

/** Ec. C.23-1: Sd = φ fy / (γ fs) ≥ 1.0. Devuelve también el valor sin acotar. */
export function coeficienteDurabilidad(phi: number, fy: number, gamma: number, fs: number): { sd: number; sinAcotar: number; gobiernaMinimo: boolean } {
  const sinAcotar = (phi * fy) / (gamma * fs);
  return { sd: Math.max(1, sinAcotar), sinAcotar, gobiernaMinimo: sinAcotar < 1 };
}

/**
 * ¿Debe aplicarse Sd? No si la sección es controlada por compresión (flexión), si es refuerzo preesforzado o zona de
 * anclaje de postensado (C.23-C.9.2.7), si la combinación incluye sismo (C.23-C.9.2.6(c)) ni si se diseña con cargas
 * de servicio / esfuerzos admisibles (C.23-C.9.2.6(b)).
 */
export function aplicaSd(p: { controladaPorCompresion?: boolean; preesforzadoOAnclaje?: boolean; incluyeSismo?: boolean; cargasDeServicio?: boolean }): boolean {
  return !(p.controladaPorCompresion || p.preesforzadoOAnclaje || p.incluyeSismo || p.cargasDeServicio);
}

/** C.23-C.9.2.6: resistencia requerida amplificada, Sd × U. */
export function resistenciaRequeridaConSd(u: number, sd: number): number {
  return u * sd;
}

/** Ec. C.23-C.11-2: Vn = Vc + Vs / Sd (Sd solo afecta la parte del refuerzo de cortante). */
export function cortanteNominalAmbiental(vc: number, vs: number, sd: number): number {
  return vc + vs / sd;
}

/** C.23-C.10.5.3: se exime del refuerzo mínimo de C.10.5.1 y C.10.5.2 si As ≥ (4/3) As requerido (sin Sd). */
export function exentoRefuerzoMinimo(asProvistoMm2: number, asRequeridoSinSdMm2: number): boolean {
  return asProvistoMm2 >= FACTOR_EXENCION_REFUERZO_MINIMO * asRequeridoSinSdMm2;
}

/* ═════════════ C.23-C.10.6 — Control de fisuración ═════════════ */

/** C.23-C.10.6.4.5: exposición normal si pH > 5 y sulfatos ≤ 1000 ppm (lectura del autor); severa si se excede alguno. */
export function clasificarExposicion(p: { ph?: number; sulfatosPpm?: number }): Exposicion {
  if (p.ph !== undefined && p.ph <= FISURACION.phMinNormal) return 'severa';
  if (p.sulfatosPpm !== undefined && p.sulfatosPpm > FISURACION.sulfatosMaxNormalPpm) return 'severa';
  return 'normal';
}

/** C.23-C.10.6.2: relación lado largo/corto ≤ 2 → dos direcciones; > 2 → una dirección. */
export function direccionesLosa(ladoLargo: number, ladoCorto: number): 'una' | 'dos' {
  return ladoLargo / ladoCorto <= FISURACION.relacionLadosDosDirecciones ? 'dos' : 'una';
}

/** Ec. C.23-4: β = (h − c) / (d − c), con c al nivel de cargas de servicio. */
export function betaGradiente(hMm: number, cMm: number, dMm: number): number {
  return (hMm - cMm) / (dMm - cMm);
}

/** C.23-C.10.6.4.4: β simplificado, 1.2 para h ≥ 400 mm y 1.35 para h < 400 mm. */
export function betaSimplificado(hMm: number): number {
  return hMm >= FISURACION.hLimiteBetaMm ? FISURACION.betaGrande : FISURACION.betaPequena;
}

/**
 * Esfuerzo máximo de servicio del refuerzo fs,max (MPa): Ec. C.23-2 (normal) o C.23-3 (severa), con los pisos de
 * C.23-C.10.6.4.1/.2 y el tope de 250 MPa. s = separación centro a centro del refuerzo más cercano a la cara en
 * tracción (mm); db = diámetro de barra (mm). `simplificado` usa 15 625 en lugar de 4(50 + db/2)² (C.23-C.10.6.4.3).
 */
export function fsMaximoFisuracion(p: { s: number; db: number; beta: number; exposicion: Exposicion; direcciones: 'una' | 'dos'; simplificado?: boolean }): { fsCalculado: number; fsMax: number; piso: number; gobiernaPiso: boolean; gobiernaTope: boolean } {
  const termino = p.simplificado ? FISURACION.terminoSimplificado : 4 * (50 + p.db / 2) ** 2;
  const numerador = p.exposicion === 'normal' ? FISURACION.numeradorNormal : FISURACION.numeradorSevera;
  const fsCalculado = numerador / (p.beta * Math.sqrt(p.s * p.s + termino));
  const pisos = p.exposicion === 'normal' ? FISURACION.pisoNormal : FISURACION.pisoSevera;
  const piso = p.direcciones === 'una' ? pisos.unaDireccion : pisos.dosDirecciones;
  const conPiso = Math.max(fsCalculado, piso);
  const fsMax = Math.min(conPiso, FISURACION.fsMaxAbsolutoMpa);
  return { fsCalculado, fsMax, piso, gobiernaPiso: fsCalculado < piso, gobiernaTope: conPiso > FISURACION.fsMaxAbsolutoMpa };
}

/** C.23-C.10.6.4.6: fs = M no mayorado / (As · jd), MPa, con M en kN·m, As en mm² y jd (brazo interno) en mm. */
export function esfuerzoServicioFlexion(msKnm: number, asMm2: number, brazoMm: number): number {
  return (msKnm * 1e6) / (asMm2 * brazoMm);
}

/**
 * Brazo interno jd = d − x/3 de la sección rectangular fisurada y eje neutro x a nivel de servicio (auxiliar: mecánica
 * usual de la sección transformada con n = Es/Ec; reutiliza `inerciaFisuradaRectangular`).
 */
export function brazoInternoFisurado(p: { bMm: number; dMm: number; asMm2: number; ecMpa: number }): { x: number; brazo: number; n: number } {
  const { x, n } = inerciaFisuradaRectangular({ bMm: p.bMm, dMm: p.dMm, asMm2: p.asMm2, ecMpa: p.ecMpa });
  return { x, brazo: p.dMm - x / 3, n };
}

/** Ec. C.23-5: s = 380 (280/fs) − 2.5 cc, máximo 300 mm (apariencia importante y recubrimiento > 75 mm). */
export function separacionMaximaApariencia(fsMpa: number, ccMm: number): number {
  return Math.min(FISURACION.sMaxMm, FISURACION.coefS * (FISURACION.fsReferencia / fsMpa) - FISURACION.coefCc * ccMm);
}

/* ═════════════ C.23-C.14 — Muros ═════════════ */

/** C.23-C.14.5.3.1 y C.23-C.14.6: espesor mínimo (mm) de muros de carga (método empírico) o que no son de carga. */
export function espesorMinimoMuroAmbiental(p: { tipo: 'carga' | 'no-carga'; alturaMm: number; longitudMm?: number; distanciaApoyosLateralesMm?: number }): number {
  if (p.tipo === 'carga') {
    const menor = Math.min(p.alturaMm, p.longitudMm ?? p.alturaMm);
    return Math.max(menor / MUROS_AMBIENTALES.divisorEspesorCarga, MUROS_AMBIENTALES.espesorMinimoCargaMm);
  }
  const d = p.distanciaApoyosLateralesMm ?? p.alturaMm;
  return Math.max(MUROS_AMBIENTALES.espesorMinimoNoCargaMm, d / MUROS_AMBIENTALES.divisorEspesorNoCarga);
}

/** C.23-C.14.6.2: muros convencionales vaciados en sitio en contacto con líquidos y de más de 3 m de altura: ≥ 300 mm. */
export function espesorMinimoMuroContactoLiquido(alturaMm: number): number | null {
  return alturaMm > MUROS_AMBIENTALES.contactoLiquidoAlturaMm ? MUROS_AMBIENTALES.contactoLiquidoEspesorMm : null;
}

/** C.23-C.14.3.4: con h > 250 mm, refuerzo en dos capas; la capa exterior lleva entre 1/2 y 2/3 del total. */
export function muroRequiereDosCapas(hMm: number): boolean {
  return hMm > MUROS_AMBIENTALES.espesorDosCapasMm;
}

/* ═════════════ C.23-C.15.14 — Losas sobre el terreno ═════════════ */

/** C.23-C.15.14.3.1: espesor mínimo de losas sobre el terreno (mm). */
export function espesorMinimoLosaSobreTerreno(refuerzo: 'una-capa' | 'preesforzada' | 'dos-capas'): number {
  const e = LOSAS_TERRENO.espesorMinSobreTerrenoMm;
  return refuerzo === 'una-capa' ? e.unaCapa : refuerzo === 'preesforzada' ? e.preesforzada : e.dosCapas;
}

/** C.23-C.15.14.3.2 y .3: intervalo [mínimo, máximo] de espesor de losas-membrana (mm). Máximo `null` si no se da. */
export function espesorLosaMembrana(tipo: 'electrosoldado' | 'no-preesforzada-barras-pequenas' | 'preesforzada'): { min: number; max: number | null } {
  const mn = LOSAS_TERRENO.espesorMinMembranaMm;
  const mx = LOSAS_TERRENO.espesorMaxMembranaMm;
  if (tipo === 'electrosoldado') return { min: mn.electrosoldado, max: mx.noPreesforzada };
  if (tipo === 'no-preesforzada-barras-pequenas') return { min: mn.noPreesforzadaBarrasPequenas, max: mx.noPreesforzada };
  return { min: mn.preesforzada, max: mx.preesforzada };
}

/** C.23-C.15.14.4.4: recubrimiento inferior mínimo (mm) según la sub-base. */
export function recubrimientoInferiorLosaTerreno(subbaseEstabilizadaOBarreraPlastica: boolean): number {
  const r = LOSAS_TERRENO.recubrimientoInferiorMm;
  return subbaseEstabilizadaOBarreraPlastica ? r.subbaseEstabilizadaOBarrera : r.subbaseSinEstabilizar;
}

/** C.23-C.15.14.4.2: separación máxima de barras corrugadas en losas-membrana = mín(300 mm, 2 h). */
export function separacionMaximaBarrasMembrana(hMm: number): number {
  return Math.min(LOSAS_TERRENO.separacionBarrasMaxMm, 2 * hMm);
}

/** Módulo de elasticidad: reexportado para los ejemplos (C.8.5.1), evita repetir el import en el MDX. */
export { moduloElasticidad } from './concreto';
export { ES_ACERO_MPA };
