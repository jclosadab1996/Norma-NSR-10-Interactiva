/**
 * Tablas del Capítulo B.4 (Cargas vivas) de la NSR-10 transcritas del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página de la norma "B-n" = página PDF n + 219.
 *
 *   Tabla B.4.2.1-1  cargas vivas mínimas uniformemente distribuidas ... PDF p.234 (B-15)
 *   Tabla B.4.2.1-2  cargas vivas mínimas en cubiertas ................. PDF p.235 (B-16)
 *   B.4.2.2          empuje en pasamanos y antepechos ................... PDF p.235 (B-16)
 *   B.4.4            impacto ............................................ PDF p.235-236 (B-16, B-17)
 *   B.4.5            reducción de la carga viva ......................... PDF p.236 (B-17)
 *   B.4.6 / B.4.7    puente grúas, efectos dinámicos .................... PDF p.236-237 (B-17, B-18)
 *   B.4.8.3          granizo ............................................ PDF p.237 (B-18)
 *
 * Las columnas de la norma son kN/m² y kgf/m² (kgf/m² = 100 · kN/m² en todas las filas).
 */

/** Grupos de ocupación de la Tabla B.4.2.1-1 (primera columna). */
export type GrupoOcupacion =
  | 'Reunión'
  | 'Oficinas'
  | 'Educativos'
  | 'Fábricas'
  | 'Institucional'
  | 'Comercio'
  | 'Residencial'
  | 'Almacenamiento'
  | 'Garajes'
  | 'Coliseos y Estadios';

export interface UsoCargaViva {
  id: string;
  ocupacion: GrupoOcupacion;
  /** Uso tal como aparece en la segunda columna de la tabla. */
  uso: string;
  /** Carga uniforme en kN/m² de área en planta. */
  kNm2: number;
  /** Carga uniforme en kgf/m² de área en planta (columna de la norma). */
  kgfm2: number;
}

/** Tabla B.4.2.1-1 — Cargas vivas mínimas uniformemente distribuidas. PDF p.234 (B-15). 32 filas. */
export const CARGAS_VIVAS: readonly UsoCargaViva[] = [
  // Reunión
  { id: 'reunion-balcones', ocupacion: 'Reunión', uso: 'Balcones', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-corredores', ocupacion: 'Reunión', uso: 'Corredores y escaleras', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-silleteria-fija', ocupacion: 'Reunión', uso: 'Silletería fija (fijada al piso)', kNm2: 3.0, kgfm2: 300 },
  { id: 'reunion-gimnasios', ocupacion: 'Reunión', uso: 'Gimnasios', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-vestibulos', ocupacion: 'Reunión', uso: 'Vestíbulos', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-silleteria-movil', ocupacion: 'Reunión', uso: 'Silletería móvil', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-areas-recreativas', ocupacion: 'Reunión', uso: 'Áreas recreativas', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-plataformas', ocupacion: 'Reunión', uso: 'Plataformas', kNm2: 5.0, kgfm2: 500 },
  { id: 'reunion-escenarios', ocupacion: 'Reunión', uso: 'Escenarios', kNm2: 7.5, kgfm2: 750 },
  // Oficinas
  { id: 'oficinas-corredores', ocupacion: 'Oficinas', uso: 'Corredores y escaleras', kNm2: 3.0, kgfm2: 300 },
  { id: 'oficinas-oficinas', ocupacion: 'Oficinas', uso: 'Oficinas', kNm2: 2.0, kgfm2: 200 },
  { id: 'oficinas-restaurantes', ocupacion: 'Oficinas', uso: 'Restaurantes', kNm2: 5.0, kgfm2: 500 },
  // Educativos
  { id: 'educativos-salones', ocupacion: 'Educativos', uso: 'Salones de clase', kNm2: 2.0, kgfm2: 200 },
  { id: 'educativos-corredores', ocupacion: 'Educativos', uso: 'Corredores y escaleras', kNm2: 5.0, kgfm2: 500 },
  { id: 'educativos-biblioteca-lectura', ocupacion: 'Educativos', uso: 'Bibliotecas — salones de lectura', kNm2: 2.0, kgfm2: 200 },
  { id: 'educativos-biblioteca-estanterias', ocupacion: 'Educativos', uso: 'Bibliotecas — estanterías', kNm2: 7.0, kgfm2: 700 },
  // Fábricas
  { id: 'fabricas-livianas', ocupacion: 'Fábricas', uso: 'Industrias livianas', kNm2: 5.0, kgfm2: 500 },
  { id: 'fabricas-pesadas', ocupacion: 'Fábricas', uso: 'Industrias pesadas', kNm2: 10.0, kgfm2: 1000 },
  // Institucional
  { id: 'institucional-cirugia', ocupacion: 'Institucional', uso: 'Cuartos de cirugía, laboratorios', kNm2: 4.0, kgfm2: 400 },
  { id: 'institucional-cuartos', ocupacion: 'Institucional', uso: 'Cuartos privados', kNm2: 2.0, kgfm2: 200 },
  { id: 'institucional-corredores', ocupacion: 'Institucional', uso: 'Corredores y escaleras', kNm2: 5.0, kgfm2: 500 },
  // Comercio
  { id: 'comercio-minorista', ocupacion: 'Comercio', uso: 'Minorista', kNm2: 5.0, kgfm2: 500 },
  { id: 'comercio-mayorista', ocupacion: 'Comercio', uso: 'Mayorista', kNm2: 6.0, kgfm2: 600 },
  // Residencial
  { id: 'residencial-balcones', ocupacion: 'Residencial', uso: 'Balcones', kNm2: 5.0, kgfm2: 500 },
  { id: 'residencial-cuartos', ocupacion: 'Residencial', uso: 'Cuartos privados y sus corredores', kNm2: 1.8, kgfm2: 180 },
  { id: 'residencial-escaleras', ocupacion: 'Residencial', uso: 'Escaleras', kNm2: 3.0, kgfm2: 300 },
  // Almacenamiento
  { id: 'almacenamiento-liviano', ocupacion: 'Almacenamiento', uso: 'Liviano', kNm2: 6.0, kgfm2: 600 },
  { id: 'almacenamiento-pesado', ocupacion: 'Almacenamiento', uso: 'Pesado', kNm2: 12.0, kgfm2: 1200 },
  // Garajes
  { id: 'garajes-pasajeros', ocupacion: 'Garajes', uso: 'Garajes para automóviles de pasajeros', kNm2: 2.5, kgfm2: 250 },
  { id: 'garajes-carga', ocupacion: 'Garajes', uso: 'Garajes para vehículos de carga de hasta 2.000 kg de capacidad', kNm2: 5.0, kgfm2: 500 },
  // Coliseos y estadios
  { id: 'coliseos-graderias', ocupacion: 'Coliseos y Estadios', uso: 'Graderías', kNm2: 5.0, kgfm2: 500 },
  { id: 'coliseos-escaleras', ocupacion: 'Coliseos y Estadios', uso: 'Escaleras', kNm2: 5.0, kgfm2: 500 },
] as const;

export function buscarUso(id: string): UsoCargaViva | undefined {
  return CARGAS_VIVAS.find((u) => u.id === id);
}

export const GRUPOS_OCUPACION: readonly GrupoOcupacion[] = [
  'Reunión',
  'Oficinas',
  'Educativos',
  'Fábricas',
  'Institucional',
  'Comercio',
  'Residencial',
  'Almacenamiento',
  'Garajes',
  'Coliseos y Estadios',
];

export interface CargaCubierta {
  id: string;
  tipo: string;
  /** kN/m²; `null` cuando la norma remite a "la misma del resto de la edificación" (Nota-1). */
  kNm2: number | null;
  kgfm2: number | null;
  /** Fila que remite a la carga del resto de la edificación (Nota-1). */
  igualRestoEdificacion?: boolean;
}

/** Tabla B.4.2.1-2 — Cargas vivas mínimas en cubiertas. PDF p.235 (B-16). */
export const CARGAS_CUBIERTA: readonly CargaCubierta[] = [
  { id: 'azotea-terraza', tipo: 'Cubiertas, azoteas y terrazas', kNm2: null, kgfm2: null, igualRestoEdificacion: true },
  { id: 'jardin-reunion', tipo: 'Cubiertas usadas para jardines de cubierta o para reuniones', kNm2: 5.0, kgfm2: 500 },
  {
    id: 'inclinada-mayor-15',
    tipo: 'Cubiertas inclinadas con más de 15° de pendiente en estructura metálica o de madera con imposibilidad física de verse sometidas a cargas superiores a la aquí estipulada',
    kNm2: 0.35,
    kgfm2: 35,
  },
  {
    id: 'inclinada-menor-15',
    tipo: 'Cubiertas inclinadas con pendiente de 15° o menos en estructura metálica o de madera con imposibilidad física de verse sometidas a cargas superiores a la aquí estipulada',
    kNm2: 0.5,
    kgfm2: 50,
  },
] as const;

/** Nota-1 de la Tabla B.4.2.1-2 (resumida). */
export const NOTA_CUBIERTA =
  'La carga viva de la cubierta no debe ser menor que el máximo valor de las cargas vivas usadas en el resto de la edificación y, cuando esta tenga uso mixto, debe ser la mayor de las cargas vivas correspondientes a los diferentes usos.';

/**
 * Carga viva de una cubierta (Tabla B.4.2.1-2). Para `azotea-terraza` es la mayor de las cargas vivas
 * del resto de la edificación (Nota-1), que se pasa en `cargasResto`.
 */
export function cargaVivaCubierta(id: string, cargasResto: readonly number[] = []): number {
  const fila = CARGAS_CUBIERTA.find((c) => c.id === id);
  if (!fila) return NaN;
  if (fila.igualRestoEdificacion) return cargasResto.length ? Math.max(...cargasResto) : NaN;
  return fila.kNm2 as number;
}

/** Empuje horizontal en pasamanos, antepechos y barreras (B.4.2.2). PDF p.235 (B-16). */
export const PASAMANOS = {
  /** Fuerza horizontal en la parte superior de baranda, pasamanos o antepecho (kN/m). */
  general: 1.0,
  /** Mínimo para viviendas unifamiliares (kN/m). */
  viviendaUnifamiliar: 0.4,
  /** Mínimo en estadios y coliseos (kN/m). */
  estadiosColiseos: 2.5,
  /** Barandas intermedias y paneles de relleno: carga normal sobre un área de hasta 0.3 m de lado (kN). */
  intermedias: { cargaKn: 0.25, ladoMaxM: 0.3 },
  /** Barreras para vehículos (automóviles de pasajeros): carga única horizontal (kN) a una altura mínima. */
  barreraVehiculos: { cargaKn: 30, alturaMinM: 0.5, ladoMaxM: 0.3 },
} as const;

export interface IncrementoImpacto {
  id: string;
  literal: 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
  elemento: string;
  /** Incremento de la carga viva en porcentaje. */
  porcentaje: number;
  /** "no menos de" (literal e). */
  minimo?: boolean;
}

/** B.4.4 — Incrementos de la carga viva por impacto. PDF p.235-236 (B-16, B-17). */
export const IMPACTO: readonly IncrementoImpacto[] = [
  { id: 'ascensores', literal: 'a', elemento: 'Soportes de elevadores y ascensores', porcentaje: 100 },
  { id: 'puente-grua-cabina', literal: 'b', elemento: 'Vigas de puentes grúas con cabina de operación y sus conexiones', porcentaje: 25 },
  { id: 'puente-grua-remoto', literal: 'c', elemento: 'Vigas de puentes grúas operados por control remoto y sus conexiones', porcentaje: 10 },
  { id: 'maquinaria-liviana', literal: 'd', elemento: 'Apoyos de maquinaria liviana, movida mediante motor eléctrico o por un eje', porcentaje: 20 },
  { id: 'maquinaria-embolo', literal: 'e', elemento: 'Apoyos de maquinaria de émbolo o movida por motor a pistón', porcentaje: 50, minimo: true },
  { id: 'tensores', literal: 'f', elemento: 'Tensores que sirvan de apoyo a pisos o balcones suspendidos y escaleras', porcentaje: 33 },
] as const;

/** B.4.5.1 — Condiciones y límites de la reducción por área aferente. PDF p.236 (B-17). */
export const REDUCCION_AREA = {
  /** Área de influencia mínima (m²): "mayor o igual a 35 m²". */
  areaMinM2: 35,
  /** La carga viva debe ser superior a este valor (kN/m²). */
  l0MinExcl: 1.8,
  /** ... e inferior a este valor (kN/m²). */
  l0MaxExcl: 3.0,
  /** Fracción mínima de L0 en elementos que soportan un piso (B.4.5.1.1). */
  fraccionMinUnPiso: 0.5,
  /** Fracción mínima de L0 en elementos que soportan dos o más pisos (B.4.5.1.1). */
  fraccionMinVariosPisos: 0.4,
} as const;

/** Paneles de placa que definen el área de influencia (B.4.5.1.2). PDF p.236 (B-17). */
export const PANELES_INFLUENCIA = {
  'viga-central': { etiqueta: 'Viga central', paneles: 2 },
  'viga-borde': { etiqueta: 'Viga de borde', paneles: 1 },
  'columna-central': { etiqueta: 'Columna central', paneles: 4 },
  'columna-borde': { etiqueta: 'Columna de borde', paneles: 2 },
  'columna-esquina': { etiqueta: 'Columna de esquina', paneles: 1 },
} as const;

export type TipoElemento = keyof typeof PANELES_INFLUENCIA;

/** B.4.5.2 — Reducción por número de pisos. PDF p.236 (B-17). */
export const REDUCCION_PISOS = {
  /** Aplica a edificios de cinco pisos o más. */
  pisosMin: 5,
  /** Cantidad de pisos superiores con r = 1.0 (i = n … i = n − 4). */
  pisosSuperioresR1: 5,
  /** r constante desde i = n − 9 hacia abajo. */
  rMinimo: 0.5,
} as const;

/** Otras prescripciones del capítulo (valores explícitos de la norma). */
export const OTRAS_CARGAS = {
  /** B.4.6 — Fuerza horizontal transversal en vigas carrilera: fracción de (peso de la grúa + carga levantada). PDF p.236 (B-17). */
  puenteGruaTransversal: 0.2,
  /** B.4.6 — Fuerza horizontal longitudinal: fracción de las cargas máximas de rueda. PDF p.236 (B-17). */
  puenteGruaLongitudinal: 0.1,
  /** B.4.7 — Frecuencia natural vertical mínima (Hz) en edificaciones con excitación dinámica del público. PDF p.237 (B-18). */
  frecuenciaVerticalMinHz: 5,
  /** B.4.7 — Período natural vertical máximo equivalente (s). */
  periodoVerticalMaxS: 0.2,
} as const;

/** B.4.8.3 — Carga de granizo. PDF p.237 (B-18). */
export const GRANIZO = {
  /** Altura sobre el nivel del mar (m) por encima de la cual se debe considerar (B.4.8.3.1). */
  alturaMsnmM: 2000,
  /** Carga de granizo G (kN/m²) (B.4.8.3.2). */
  g: 1.0,
  /** Inclinación (grados) por encima de la cual se admite reducir G. */
  inclinacionReduccionGrados: 15,
  /** Carga reducida para cubiertas con inclinación mayor a 15° (kN/m²). */
  gReducida: 0.5,
} as const;
