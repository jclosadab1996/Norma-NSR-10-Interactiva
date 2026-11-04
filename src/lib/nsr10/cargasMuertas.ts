/**
 * Capítulo B.3 — Cargas muertas. Lógica pura (sin React) compartida por el capítulo MDX y la calculadora.
 * Datos transcritos en `src/data/cargasMuertas.ts`.
 */
import {
  ALTURA_MAX_VALORES_ALTERNATIVOS_M,
  ESPESORES_MURO_MM,
  G_B32,
  buscarValorAlternativo,
  type ComponenteCarga,
  type MaterialDensidad,
  type MuroMamposteria,
} from '../../data/cargasMuertas';

/** Factor kgf/m² por kN/m² que usan las tablas de B.3.4 (g redondeada a 10 m/s²). */
export const FACTOR_KGF_TABLAS = 100;
/** Factor exacto: 1 kN = 1000 N / 9.80665 N/kgf. */
export const FACTOR_KGF_EXACTO = 1000 / 9.80665;

/** kN/m² → kgf/m² con el criterio de las tablas de la norma (× 100). */
export const kNm2AKgfm2 = (kN: number): number => kN * FACTOR_KGF_TABLAS;
/** kgf/m² → kN/m² con el criterio de las tablas de la norma (÷ 100). */
export const kgfm2AKNm2 = (kgf: number): number => kgf / FACTOR_KGF_TABLAS;
/** kN/m² → kgf/m² con la conversión física exacta (× 101.97). */
export const kNm2AKgfm2Exacto = (kN: number): number => kN * FACTOR_KGF_EXACTO;
/** kgf/m² → kN/m² con la conversión física exacta (÷ 101.97). */
export const kgfm2AKNm2Exacto = (kgf: number): number => kgf / FACTOR_KGF_EXACTO;

/** Peso específico en kN/m³ a partir de la densidad de masa en kg/m³ (B.3.2: γ = ρ·g, g = 9.8 m/s²). */
export function pesoEspecifico(densidadKgM3: number): number {
  return (densidadKgM3 * G_B32) / 1000;
}

/** Carga por m² de una capa de material: γ · espesor, en kN/m² (B.3.4.1 nota: ρ·g·e). */
export function cargaPorEspesor(densidadKgM3: number, espesorM: number): number {
  return pesoEspecifico(densidadKgM3) * espesorM;
}

/** Carga muerta de una placa maciza de concreto reforzado (ρ = 2400 kg/m³, Tabla B.3.2-1), kN/m². */
export function pesoPropioLosaMaciza(espesorM: number, densidadKgM3 = 2400): number {
  return cargaPorEspesor(densidadKgM3, espesorM);
}

/** Densidad que se usa en cálculo: para rangos (p. ej. madera seca 450-750) se toma el máximo, del lado conservador. */
export function densidadDeCalculo(m: MaterialDensidad): number {
  return m.densidadMax ?? m.densidad;
}

/**
 * Carga de un componente de las tablas B.3.4.x en kN/m² (por m² de planta o de superficie vertical).
 * - `fijo`: el valor de la tabla (el espesor se ignora).
 * - `por-espesor`: valor por mm × espesor en mm.
 * Devuelve NaN si es por espesor y no se da un espesor válido.
 */
export function cargaComponente(c: ComponenteCarga, espesorMm?: number): number {
  if (c.tipo === 'fijo') return c.kN;
  if (espesorMm === undefined || !Number.isFinite(espesorMm) || espesorMm < 0) return NaN;
  return c.kN * espesorMm;
}

/** Igual que `cargaComponente` pero en kgf/m² con la columna de kgf de la norma (por cm de espesor). */
export function cargaComponenteKgf(c: ComponenteCarga, espesorMm?: number): number {
  if (c.tipo === 'fijo') return c.kgf;
  if (espesorMm === undefined || !Number.isFinite(espesorMm) || espesorMm < 0) return NaN;
  return c.kgf * (espesorMm / 10);
}

/** Carga de un muro de mampostería de la Tabla B.3.4.2-4 en kN/m² de superficie vertical; null si el espesor no existe/está vacío. */
export function cargaMuroMamposteria(m: MuroMamposteria, espesorMm: number): number | null {
  const i = (ESPESORES_MURO_MM as readonly number[]).indexOf(espesorMm);
  if (i < 0) return null;
  return m.kN[i];
}

/** Espesores (mm) para los que la tabla da valor en ese muro. */
export function espesoresDisponibles(m: MuroMamposteria): number[] {
  return ESPESORES_MURO_MM.filter((_, i) => m.kN[i] !== null);
}

/** Carga lineal (kN/m) de un elemento vertical: valor por m² de superficie × altura del elemento en m. */
export function cargaLineal(kNm2: number, alturaM: number): number {
  return kNm2 * alturaM;
}

/**
 * Reparte un elemento vertical interior (muro o partición) como carga uniforme en planta (B.3.4.2, 2.ª nota):
 * q = (kN/m² de superficie × altura × longitud) / área de planta, en kN/m².
 * Solo es válido si el sistema de piso resiste las cargas concentradas/lineales sin afectar su resistencia o servicio.
 */
export function repartirEnPlanta(kNm2: number, alturaM: number, longitudM: number, areaPlantaM2: number): number {
  if (!(areaPlantaM2 > 0)) return NaN;
  return (kNm2 * alturaM * longitudM) / areaPlantaM2;
}

/** Un aporte a la carga muerta (kN/m²). */
export interface Aporte {
  nombre: string;
  /** Categoría para agrupar en gráficos: 'estructura' | 'horizontales' | 'verticales' | 'otras', etc. */
  categoria?: string;
  /** kN/m² */
  valor: number;
}

export interface DesgloseCarga {
  /** Suma en kN/m² (los aportes no finitos se ignoran y se listan en `invalidos`). */
  total: number;
  totalKgf: number;
  filas: (Aporte & { fraccion: number })[];
  invalidos: string[];
}

/** Suma los aportes de una placa/entrepiso y devuelve el desglose con la fracción de cada uno. */
export function sumarCargasMuertas(aportes: readonly Aporte[]): DesgloseCarga {
  const validos = aportes.filter((a) => Number.isFinite(a.valor));
  const invalidos = aportes.filter((a) => !Number.isFinite(a.valor)).map((a) => a.nombre);
  const total = validos.reduce((s, a) => s + a.valor, 0);
  return {
    total,
    totalKgf: kNm2AKgfm2(total),
    filas: validos.map((a) => ({ ...a, fraccion: total > 0 ? a.valor / total : 0 })),
    invalidos,
  };
}

export type CargaAlternativa = {
  fachadaParticiones: number;
  afinado: number;
  /** Fachada y particiones + afinado de piso y cubierta, kN/m². */
  total: number;
};

/** Valores de la Tabla B.3.4.3-1 en kN/m² de planta. Solo aplicable con altura entre pisos terminados menor de 3 m. */
export function cargaAlternativa(id: string): CargaAlternativa | undefined {
  const v = buscarValorAlternativo(id);
  if (!v) return undefined;
  return { fachadaParticiones: v.fachadaParticionesKN, afinado: v.afinadoKN, total: v.fachadaParticionesKN + v.afinadoKN };
}

/** B.3.4.3: los valores alternativos solo valen si la altura entre pisos terminados es menor de 3 m. */
export function puedeUsarValoresAlternativos(alturaEntrePisosM: number): boolean {
  return Number.isFinite(alturaEntrePisosM) && alturaEntrePisosM < ALTURA_MAX_VALORES_ALTERNATIVOS_M;
}
