/**
 * Lógica del Capítulo C.4 (Requisitos de durabilidad) de la NSR-10.
 * Datos en `src/data/durabilidad.ts`. Página PDF = página impresa "C-n" + 302.
 */
import {
  AIRE_INCORPORADO,
  CLASES_EXPOSICION,
  EXPANSION_SULFATOS,
  FC_MINIMO_NSR10_MPA,
  FC_UMBRAL_REDUCCION_AIRE_MPA,
  LIMITES_F3,
  REDUCCION_AIRE_FC_ALTO,
  TOLERANCIA_AIRE,
  requisitoDeClase,
  type CategoriaExposicion,
  type ClaseExposicion,
  type LimiteF3,
  type RequisitoExposicion,
} from '../../data/durabilidad';

const EPS = 1e-9;

/** Categoría de una clase ('F3' → 'F'). */
export function categoriaDe(clase: ClaseExposicion): CategoriaExposicion {
  return clase[0] as CategoriaExposicion;
}

/**
 * Clase de sulfato (S0 a S3) a partir del SO4 soluble en agua del suelo (% en peso) y/o del SO4 disuelto en el agua (ppm)
 * (Tabla C.4.2.1, C-35). Si se dan ambos, gobierna la clase más severa. Límites: S0 < 0.10 %; S1 0.10 ≤ SO4 < 0.20;
 * S2 0.20 ≤ SO4 ≤ 2.00; S3 > 2.00 (agua: < 150; 150 ≤ x < 1500; 1500 ≤ x ≤ 10 000; > 10 000).
 * Las cotas 0.20 % (S1/S2) y 2.00 % (S2/S3) salen de la secuencia de la tabla, cuya columna está cortada en el PDF.
 */
export function claseSulfato(sulfatoSueloPct?: number, sulfatoAguaPpm?: number): 'S0' | 'S1' | 'S2' | 'S3' {
  const orden = ['S0', 'S1', 'S2', 'S3'] as const;
  let nivel = 0;
  if (sulfatoSueloPct !== undefined && Number.isFinite(sulfatoSueloPct)) {
    if (sulfatoSueloPct < 0) throw new RangeError('El contenido de sulfato no puede ser negativo');
    nivel = Math.max(nivel, sulfatoSueloPct < 0.1 ? 0 : sulfatoSueloPct < 0.2 ? 1 : sulfatoSueloPct <= 2 ? 2 : 3);
  }
  if (sulfatoAguaPpm !== undefined && Number.isFinite(sulfatoAguaPpm)) {
    if (sulfatoAguaPpm < 0) throw new RangeError('El contenido de sulfato no puede ser negativo');
    nivel = Math.max(nivel, sulfatoAguaPpm < 150 ? 0 : sulfatoAguaPpm < 1500 ? 1 : sulfatoAguaPpm <= 10000 ? 2 : 3);
  }
  return orden[nivel];
}

/** Resultado de combinar las clases de exposición asignadas a un elemento (C.4.3.1: "requisitos más restrictivos"). */
export interface RequisitosCombinados {
  clases: ClaseExposicion[];
  /** a/mc máxima (la menor de las clases que la limitan); null si ninguna clase la limita (N/A). */
  aMcMax: number | null;
  /** Clase que fija la a/mc máxima. */
  claseAMc: ClaseExposicion | null;
  /** f′c mínimo por durabilidad (el mayor de las clases), MPa. */
  fcMin: number;
  /** Clase que fija f′c mínimo. */
  claseFc: ClaseExposicion;
  /** Hay aire incorporado obligatorio (F1, F2 o F3). */
  aireRequerido: boolean;
  /** Clase F de la que depende la columna de aire de la Tabla C.4.4.1 ('F1' o 'F2/F3'), si aplica. */
  claseAire: 'F1' | 'F2/F3' | null;
  /** Aplican los límites de puzolanas y escoria de la Tabla C.4.4.2 (solo F3). */
  limitesF3: boolean;
  /** Clase de sulfato (la más severa asignada) o null si no se asignó ninguna S. */
  claseSulfato: 'S0' | 'S1' | 'S2' | 'S3' | null;
  /** Requisitos de cementantes de la clase S gobernante (null si S0/ninguna: sin restricción). */
  cementos: RequisitoExposicion['cementos'] | null;
  /** Se permite el cloruro de calcio como aditivo (false si S2 o S3). */
  cloruroCalcioPermitido: boolean;
  /** Clase C asignada y límites de ion cloruro soluble (% por peso de cemento): el menor de las clases asignadas. */
  claseCloruro: 'C0' | 'C1' | 'C2' | null;
  cloruroMaxReforzado: number | null;
  cloruroMaxPreesforzado: number | null;
  /** Requisitos relacionados (C2). */
  relacionados: string[];
}

/** Combina las clases asignadas (una por categoría o más) y devuelve los requisitos más restrictivos de la Tabla C.4.3.1. */
export function requisitosExposicion(clases: readonly ClaseExposicion[]): RequisitosCombinados {
  if (clases.length === 0) throw new RangeError('Debe asignarse al menos una clase de exposición');
  const reqs = clases.map(requisitoDeClase);

  let aMcMax: number | null = null;
  let claseAMc: ClaseExposicion | null = null;
  let fcMin = -Infinity;
  let claseFc: ClaseExposicion = clases[0];
  for (const r of reqs) {
    if (r.aMcMax !== null && (aMcMax === null || r.aMcMax < aMcMax - EPS)) {
      aMcMax = r.aMcMax;
      claseAMc = r.clase;
    }
    if (r.fcMin > fcMin + EPS) {
      fcMin = r.fcMin;
      claseFc = r.clase;
    }
  }

  const tieneF2F3 = clases.some((c) => c === 'F2' || c === 'F3');
  const tieneF1 = clases.includes('F1');
  const aireRequerido = tieneF1 || tieneF2F3;

  const sulfatos = clases.filter((c) => categoriaDe(c) === 'S').sort();
  const claseS = (sulfatos.length ? sulfatos[sulfatos.length - 1] : null) as RequisitosCombinados['claseSulfato'];
  const cementos = claseS && claseS !== 'S0' ? (requisitoDeClase(claseS).cementos ?? null) : null;

  const cloruros = clases.filter((c) => categoriaDe(c) === 'C').sort();
  // el menor límite de cloruro es el de la clase C de mayor severidad
  const claseC = (cloruros.length ? cloruros[cloruros.length - 1] : null) as RequisitosCombinados['claseCloruro'];
  const rc = claseC ? requisitoDeClase(claseC) : null;

  return {
    clases: [...clases],
    aMcMax,
    claseAMc,
    fcMin,
    claseFc,
    aireRequerido,
    claseAire: tieneF2F3 ? 'F2/F3' : tieneF1 ? 'F1' : null,
    limitesF3: clases.includes('F3'),
    claseSulfato: claseS,
    cementos,
    cloruroCalcioPermitido: !(claseS === 'S2' || claseS === 'S3'),
    claseCloruro: claseC,
    cloruroMaxReforzado: rc?.cloruro?.reforzado ?? null,
    cloruroMaxPreesforzado: rc?.cloruro?.preesforzado ?? null,
    relacionados: rc?.relacionados ? [rc.relacionados] : [],
  };
}

/**
 * f′c de diseño según C.4.1.1: el mayor entre (a) el de C.1.1.1 / estructural, (b) el de durabilidad (Tabla C.4.3.1) y
 * (c) el mínimo general de 17 MPa de C.5.1.1.
 */
export function fcDeDiseno(fcEstructural: number, fcMinDurabilidad: number): { fc: number; gobierna: 'estructural' | 'durabilidad' | 'minimo-general' } {
  const fc = Math.max(fcEstructural, fcMinDurabilidad, FC_MINIMO_NSR10_MPA);
  const gobierna = Math.abs(fc - fcEstructural) < EPS ? 'estructural' : Math.abs(fc - fcMinDurabilidad) < EPS ? 'durabilidad' : 'minimo-general';
  return { fc, gobierna };
}

/** Tamaños nominales listados en la Tabla C.4.4.1 (mm). */
export const TAMANOS_AIRE_MM: readonly number[] = AIRE_INCORPORADO.map((f) => f.tamanoMm);

export interface ContenidoAire {
  /** Contenido total de aire de la Tabla C.4.4.1 (%). */
  tabla: number;
  /** Aire objetivo: la tabla, o la tabla − 1 punto si f′c > 35 MPa y se usa la reducción permitida (%). */
  objetivo: number;
  /** Si se aplicó la reducción de 1 punto por f′c > 35 MPa. */
  reducido: boolean;
  /** Mínimo y máximo aceptables (objetivo ± 1.5). */
  minimo: number;
  maximo: number;
}

/**
 * Contenido total de aire para F1, F2 o F3 (Tabla C.4.4.1 y C.4.4.1). `tamanoMm` debe ser uno de los listados en la tabla.
 * Si `fc > 35` y `aplicarReduccion` es true, la norma permite reducir 1 punto ("se puede reducir").
 */
export function contenidoAire(tamanoMm: number, clase: 'F1' | 'F2' | 'F3', fc?: number, aplicarReduccion = false): ContenidoAire {
  const fila = AIRE_INCORPORADO.find((f) => Math.abs(f.tamanoMm - tamanoMm) < EPS);
  if (!fila) throw new RangeError(`Tamaño máximo nominal ${tamanoMm} mm no está en la Tabla C.4.4.1 (${TAMANOS_AIRE_MM.join(', ')})`);
  const tabla = clase === 'F1' ? fila.f1 : fila.f2f3;
  const reducido = aplicarReduccion && fc !== undefined && fc > FC_UMBRAL_REDUCCION_AIRE_MPA;
  const objetivo = reducido ? tabla - REDUCCION_AIRE_FC_ALTO : tabla;
  return { tabla, objetivo, reducido, minimo: objetivo - TOLERANCIA_AIRE, maximo: objetivo + TOLERANCIA_AIRE };
}

export interface MezclaCementantes {
  /** Masas (kg/m³) de cada componente cementante. Los no indicados se toman como 0. */
  cemento?: number;
  ceniza?: number;
  escoria?: number;
  humoSilice?: number;
}

export interface VerificacionF3 {
  limite: LimiteF3;
  /** Porcentaje real del material (o suma) sobre el total de materiales cementantes. */
  pct: number;
  cumple: boolean;
}

/** Verifica una mezcla clase F3 contra la Tabla C.4.4.2 (porcentajes sobre el total de materiales cementantes en peso). */
export function verificarLimitesF3(m: MezclaCementantes): { total: number; filas: VerificacionF3[]; cumple: boolean } {
  const c = m.cemento ?? 0;
  const f = m.ceniza ?? 0;
  const s = m.escoria ?? 0;
  const h = m.humoSilice ?? 0;
  const total = c + f + s + h;
  if (!(total > 0)) throw new RangeError('El total de materiales cementantes debe ser positivo');
  const pct: Record<LimiteF3['id'], number> = {
    ceniza: (100 * f) / total,
    escoria: (100 * s) / total,
    'humo-silice': (100 * h) / total,
    'total-ceniza-escoria-humo': (100 * (f + s + h)) / total,
    'total-ceniza-humo': (100 * (f + h)) / total,
  };
  const filas = LIMITES_F3.map((limite) => ({ limite, pct: pct[limite.id], cumple: pct[limite.id] <= limite.maxPct + EPS }));
  return { total, filas, cumple: filas.every((x) => x.cumple) };
}

/**
 * Evaluación de la expansión a sulfatos de una combinación cementante alternativa (Tabla C.4.5.1).
 * Expansiones en % (ASTM C1012 / NTC 3330). S2: el límite de 12 meses solo se aplica cuando el de 6 meses no se alcanza
 * (se interpreta "no es alcanzado" como superado, como en el texto original ACI 318).
 */
export function cumpleExpansionSulfatos(clase: 'S1' | 'S2' | 'S3', exp: { seis?: number; doce?: number; dieciocho?: number }): { cumple: boolean; criterio: string } {
  const f = EXPANSION_SULFATOS.find((x) => x.clase === clase)!;
  if (clase === 'S1') {
    if (exp.seis === undefined) return { cumple: false, criterio: 'Falta la expansión a 6 meses' };
    return { cumple: exp.seis <= (f.seis as number) + EPS, criterio: `≤ ${f.seis} % a 6 meses` };
  }
  if (clase === 'S2') {
    if (exp.seis === undefined) return { cumple: false, criterio: 'Falta la expansión a 6 meses' };
    if (exp.seis <= (f.seis as number) + EPS) return { cumple: true, criterio: `≤ ${f.seis} % a 6 meses` };
    if (exp.doce === undefined) return { cumple: false, criterio: `Supera ${f.seis} % a 6 meses; falta el dato a 12 meses` };
    return { cumple: exp.doce <= (f.doce as number) + EPS, criterio: `> ${f.seis} % a 6 meses, entonces ≤ ${f.doce} % a 12 meses` };
  }
  if (exp.dieciocho === undefined) return { cumple: false, criterio: 'Falta la expansión a 18 meses' };
  return { cumple: exp.dieciocho <= (f.dieciocho as number) + EPS, criterio: `≤ ${f.dieciocho} % a 18 meses` };
}

/**
 * Contenido de ion cloruro soluble en agua, como porcentaje del peso de cemento (C.4.3.1, nota ‼):
 * suma de los aportes de agua, agregados, cementantes y aditivos (kg de Cl⁻ por m³) entre la masa de cemento (kg/m³) × 100.
 * Se toma como base la masa de materiales cementantes de la mezcla (interpretación: la tabla dice "por peso de cemento").
 */
export function cloruroPorcentajeCemento(aportesClKgM3: readonly number[], cementoKgM3: number): number {
  if (!(cementoKgM3 > 0)) throw new RangeError('La masa de cemento debe ser positiva');
  if (aportesClKgM3.some((x) => x < 0 || !Number.isFinite(x))) throw new RangeError('Los aportes de cloruro deben ser números no negativos');
  return (100 * aportesClKgM3.reduce((a, b) => a + b, 0)) / cementoKgM3;
}

export interface VerificacionMezcla {
  aMcOk: boolean | null;
  fcOk: boolean;
  aMcMax: number | null;
  fcMin: number;
}

/**
 * Verifica a/mc y f′c de una mezcla contra los requisitos combinados. `liviano` = concreto de peso liviano:
 * los límites de a/mc no aplican (C.4.1.2) y aMcOk = null.
 */
export function verificarMezcla(req: RequisitosCombinados, aMc: number, fc: number, liviano = false): VerificacionMezcla {
  const aMcOk = liviano || req.aMcMax === null ? null : aMc <= req.aMcMax + EPS;
  return { aMcOk, fcOk: fc >= req.fcMin - EPS, aMcMax: req.aMcMax, fcMin: req.fcMin };
}

/** Todas las clases de exposición, ordenadas, para selectores. */
export const TODAS_LAS_CLASES: readonly ClaseExposicion[] = CLASES_EXPOSICION.map((c) => c.clase);
