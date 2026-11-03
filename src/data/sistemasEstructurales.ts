/**
 * Sistemas estructurales de resistencia sísmica del Capítulo A.3 de la NSR-10, transcritos
 * del PDF (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página de la norma "A-n" = página PDF n + 43.
 *
 *   Tabla A.3-1  muros de carga ......... PDF p.95  (A-52)
 *   Tabla A.3-2  combinado .............. PDF p.96-97 (A-53, A-54)
 *   Tabla A.3-3  pórtico ................ PDF p.98  (A-55)
 *   Tabla A.3-4  dual ................... PDF p.99-100 (A-56, A-57)
 *   Tabla A.3-5  mezcla en la altura ..... PDF p.101 (A-58)
 *   Tabla A.3-6  irregularidades en planta  PDF p.102 (A-59)
 *   Tabla A.3-7  irregularidades en altura  PDF p.103 (A-60)
 *   Texto A.3.2 / A.3.3 ................. PDF p.84-87 (A-41 a A-44)
 *
 * Convenciones:
 *  - `r0` y `omega0` son los de la tabla; para estructuras irregulares R = φa·φp·φr·R0 (A.3.3-1).
 *  - Las notas que van en los encabezados de columna (R0 -> nota 2, Ω0 -> nota 4 o 3 en A.3-4) aplican
 *    a TODAS las filas y NO se repiten en `notas`; `notas` solo lista las notas citadas en celdas de la fila.
 *  - `material` es el del sistema de resistencia sísmica (primera columna de la tabla).
 *  - `capacidadDisipacion` es el grado (DES/DMO/DMI) que la primera columna declara en su texto o en el
 *    encabezado de su sección; `null` si la tabla no lo declara. `capacidadVertical` es lo análogo para la
 *    columna de "sistema de resistencia para cargas verticales".
 *  - En cada zona, `tipoLimite` desambigua: 'sin-limite' (alturaMaxM = null), 'metros', 'pisos'
 *    (alturaMaxPisos; alturaMaxM = null NO significa "sin límite" en ese caso) o 'no-permitido'.
 */

export type TablaSistema = 'A.3-1' | 'A.3-2' | 'A.3-3' | 'A.3-4';
export type TipoSistema = 'muros-de-carga' | 'combinado' | 'porticos' | 'dual';
export type MaterialSistema = 'concreto' | 'acero' | 'mamposteria' | 'madera' | 'mixto';
export type CapacidadDisipacion = 'DES' | 'DMO' | 'DMI';
export type ZonaAmenaza = 'alta' | 'intermedia' | 'baja';

export interface LimiteZona {
  /** false = "no se permite" (puede haber una excepción por nota: ver `alturaExcepcionM`). */
  permitido: boolean;
  /** Altura máxima en metros; null = "sin límite" (si tipoLimite es 'sin-limite') o no aplica. */
  alturaMaxM: number | null;
  tipoLimite: 'sin-limite' | 'metros' | 'pisos' | 'no-permitido';
  /** Límite en número de pisos cuando la tabla lo da así (p. ej. "2 pisos"). */
  alturaMaxPisos?: number;
  /** El uso solo se permite para edificaciones del grupo de uso I. */
  soloGrupoI?: boolean;
  /** Condición textual de la celda tal como la trae la tabla. */
  condicion?: string;
  /** Notas citadas en la celda. */
  notas?: number[];
  /** Altura permitida por nota para edificios de un piso (naves industriales o similares) no del grupo IV. */
  alturaExcepcionM?: number;
}

export interface SistemaEstructural {
  id: string;
  tabla: TablaSistema;
  tipoSistema: TipoSistema;
  /** Número de fila dentro de la tabla, p. ej. "2a", "1", "3.g no". */
  numero: string;
  /** Sección (agrupación) de la tabla donde aparece la fila. */
  subsistema: string;
  sistemaSismico: string;
  sistemaVertical: string;
  material: MaterialSistema;
  capacidadDisipacion: CapacidadDisipacion | null;
  capacidadVertical: CapacidadDisipacion | null;
  r0: number;
  omega0: number;
  zonas: Record<ZonaAmenaza, LimiteZona>;
  notas: number[];
  /** Condiciones textuales de la fila (grupo de uso, nº de pisos, etc.). */
  condiciones?: string;
  /** Ajuste de R0 indicado por nota en la celda de R0 (A.3-3, nota 3: soldadura en obra, x0.90). */
  ajusteR0?: { nota: number; factor: number; condicion: string };
}

// ---------------------------------------------------------------------------
// Constructores de celdas de zona
// ---------------------------------------------------------------------------
const SIN = (): LimiteZona => ({ permitido: true, alturaMaxM: null, tipoLimite: 'sin-limite' });
const NO = (notas?: number[], alturaExcepcionM?: number): LimiteZona => ({
  permitido: false,
  alturaMaxM: null,
  tipoLimite: 'no-permitido',
  ...(notas ? { notas } : {}),
  ...(alturaExcepcionM !== undefined ? { alturaExcepcionM } : {}),
});
const M = (m: number): LimiteZona => ({ permitido: true, alturaMaxM: m, tipoLimite: 'metros' });
const GI_M = (m: number): LimiteZona => ({ ...M(m), soloGrupoI: true, condicion: 'Grupo I' });
const GI_PISOS = (p: number, notas?: number[]): LimiteZona => ({
  permitido: true,
  alturaMaxM: null,
  tipoLimite: 'pisos',
  alturaMaxPisos: p,
  soloGrupoI: true,
  condicion: `Grupo I, ${p} pisos`,
  ...(notas ? { notas } : {}),
});

type Zonas = [LimiteZona, LimiteZona, LimiteZona];
interface FilaSpec {
  tabla: TablaSistema;
  tipoSistema: TipoSistema;
  numero: string;
  subsistema: string;
  sistemaSismico: string;
  sistemaVertical: string;
  material: MaterialSistema;
  cap: CapacidadDisipacion | null;
  capV: CapacidadDisipacion | null;
  r0: number;
  omega0: number;
  z: Zonas;
  notas?: number[];
  condiciones?: string;
  ajusteR0?: SistemaEstructural['ajusteR0'];
}

function fila(s: FilaSpec): SistemaEstructural {
  return {
    id: `${s.tabla.toLowerCase().replace('.', '')}-${s.numero}`, // p. ej. "a3-1-2a"
    tabla: s.tabla,
    tipoSistema: s.tipoSistema,
    numero: s.numero,
    subsistema: s.subsistema,
    sistemaSismico: s.sistemaSismico,
    sistemaVertical: s.sistemaVertical,
    material: s.material,
    capacidadDisipacion: s.cap,
    capacidadVertical: s.capV,
    r0: s.r0,
    omega0: s.omega0,
    zonas: { alta: s.z[0], intermedia: s.z[1], baja: s.z[2] },
    notas: s.notas ?? [],
    ...(s.condiciones ? { condiciones: s.condiciones } : {}),
    ...(s.ajusteR0 ? { ajusteR0: s.ajusteR0 } : {}),
  };
}

const SOLDADURA_OBRA: NonNullable<SistemaEstructural['ajusteR0']> = {
  nota: 3,
  factor: 0.9,
  condicion:
    'Cuando se trate de estructuras de acero donde las uniones del sistema de resistencia sísmica son soldadas en obra, el valor de R0 debe multiplicarse por 0.90.',
};

// ---------------------------------------------------------------------------
// Tabla A.3-1 — Sistema estructural de muros de carga (PDF p.95, A-52)
// ---------------------------------------------------------------------------
const T1 = 'A.3-1' as const;
const MC = 'muros-de-carga' as const;
const MURO_EST = '2. Muros estructurales';
const PORT_DIAG = '3. Pórticos con diagonales (las diagonales llevan fuerza vertical)';

const A31: SistemaEstructural[] = [
  fila({ tabla: T1, tipoSistema: MC, numero: '1', subsistema: '1. Paneles de cortante de madera',
    sistemaSismico: 'Paneles de cortante de madera', sistemaVertical: 'muros ligeros de madera laminada',
    material: 'madera', cap: null, capV: null, r0: 3.0, omega0: 2.5, z: [M(6), M(9), M(12)] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2a', subsistema: MURO_EST,
    sistemaSismico: 'Muros de concreto con capacidad especial de disipación de energía (DES)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 5.0, omega0: 2.5, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2b', subsistema: MURO_EST,
    sistemaSismico: 'Muros de concreto con capacidad moderada de disipación de energía (DMO)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 4.0, omega0: 2.5, z: [NO(), M(50), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2c', subsistema: MURO_EST,
    sistemaSismico: 'Muros de concreto con capacidad mínima de disipación de energía (DMI)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMI', capV: 'DMI', r0: 2.5, omega0: 2.5, z: [NO(), NO(), M(50)] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2d', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DES) con todas las celdas rellenas', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: 'DES', capV: 'DES', r0: 3.5, omega0: 2.5, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2e', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: 'DMO', capV: 'DMO', r0: 2.5, omega0: 2.5, z: [M(30), M(50), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2f', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería parcialmente reforzada de bloque de perforación vertical', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: null, capV: null, r0: 2.0, omega0: 2.5, z: [GI_PISOS(2), M(12), M(18)],
    condiciones: 'En zona de amenaza alta: Grupo I, 2 pisos.' }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2g', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería confinada', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: null, capV: null, r0: 2.0, omega0: 2.5, z: [GI_PISOS(2), GI_M(12), GI_M(18)],
    condiciones: 'Solo Grupo I en las tres zonas; en zona alta además 2 pisos.' }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2h', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería de cavidad reforzada', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: null, capV: null, r0: 4.0, omega0: 2.5, z: [M(45), M(60), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '2i', subsistema: MURO_EST,
    sistemaSismico: 'Muros de mampostería no reforzada (no tiene capacidad de disipación de energía)', sistemaVertical: 'el mismo',
    material: 'mamposteria', cap: null, capV: null, r0: 1.0, omega0: 2.5, z: [NO(), NO(), GI_PISOS(2, [3])], notas: [3],
    condiciones: 'Solo en zona de amenaza baja, Grupo I, 1 o 2 pisos, en regiones con Aa ≤ 0.05 (Nota 3).' }),
  fila({ tabla: T1, tipoSistema: MC, numero: '3a', subsistema: PORT_DIAG,
    sistemaSismico: 'Pórticos de acero estructural con diagonales concéntricas (DES)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DES', capV: 'DES', r0: 5.0, omega0: 2.5, z: [M(24), M(30), SIN()] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '3b', subsistema: PORT_DIAG,
    sistemaSismico: 'Pórticos con diagonales de concreto con capacidad moderada de disipación de energía (DMO)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 3.5, omega0: 2.5, z: [NO(), M(30), M(30)] }),
  fila({ tabla: T1, tipoSistema: MC, numero: '3c', subsistema: PORT_DIAG,
    sistemaSismico: 'Pórticos de madera con diagonales', sistemaVertical: 'el mismo',
    material: 'madera', cap: null, capV: null, r0: 2.0, omega0: 2.5, z: [M(12), M(15), M(18)] }),
];

// ---------------------------------------------------------------------------
// Tabla A.3-2 — Sistema estructural combinado (PDF p.96-97, A-53 y A-54)
// ---------------------------------------------------------------------------
const T2 = 'A.3-2' as const;
const CB = 'combinado' as const;
const EXC = '1. Pórticos de acero con diagonales excéntricas';
const MEST2 = '2. Muros estructurales';
const CONC2 = '3. Pórticos con diagonales concéntricas';
const V_ACERO_DMI = 'pórticos de acero resistentes a momentos con capacidad mínima de disipación de energía (DMI)';
const V_ACERO_RESIST_O_NO = 'pórticos de acero resistente o no a momentos';
const V_ACERO_RESIST_O_NO_PL = 'pórticos de acero resistentes o no a momentos';
const V_ACERO_NO_RESIST = 'pórticos de acero no resistentes a momentos';

const A32: SistemaEstructural[] = [
  fila({ tabla: T2, tipoSistema: CB, numero: '1a', subsistema: EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo son resistentes a momento',
    sistemaVertical: V_ACERO_DMI, material: 'acero', cap: null, capV: 'DMI', r0: 7.0, omega0: 2.0, z: [M(45), M(60), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '1b', subsistema: EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo no son resistentes a momento',
    sistemaVertical: V_ACERO_DMI, material: 'acero', cap: null, capV: 'DMI', r0: 6.0, omega0: 2.0, z: [M(45), M(60), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '1c', subsistema: EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si el vínculo no se conecta a la columna',
    sistemaVertical: V_ACERO_NO_RESIST, material: 'acero', cap: null, capV: null, r0: 6.0, omega0: 2.0, z: [M(30), M(45), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '1d', subsistema: EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si el vínculo tiene conexión resistente a momento con la columna',
    sistemaVertical: V_ACERO_DMI, material: 'acero', cap: null, capV: 'DMI', r0: 5.0, omega0: 2.0, z: [M(30), M(45), SIN()] }),

  fila({ tabla: T2, tipoSistema: CB, numero: '2a', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto con capacidad especial de disipación de energía (DES)',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 7.0, omega0: 2.5, z: [M(72), SIN(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2b', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 5.0, omega0: 2.5, z: [NO(), M(72), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2c', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos losa-columna (Nota 3) con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 3.5, omega0: 2.5, z: [NO(), M(18), M(27)], notas: [3] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2d', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto con capacidad mínima de disipación de energía (DMI)',
    sistemaVertical: 'pórticos de concreto con capacidad mínima de disipación de energía (DMI)',
    material: 'concreto', cap: 'DMI', capV: 'DMI', r0: 2.5, omega0: 2.5, z: [NO(), NO(), M(72)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2e', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto con capacidad mínima de disipación de energía (DMI)',
    sistemaVertical: 'pórticos losa-columna (Nota 3) con capacidad mínima de disipación de energía (DMI)',
    material: 'concreto', cap: 'DMI', capV: 'DMI', r0: 2.0, omega0: 2.5, z: [NO(), NO(), M(18)], notas: [3] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2f', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DES) con todas las celdas rellenas',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DES', capV: 'DES', r0: 4.5, omega0: 2.5, z: [M(30), M(45), M(45)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2g', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DMO', capV: 'DES', r0: 3.5, omega0: 2.5, z: [M(30), M(45), M(45)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2h', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'mamposteria', cap: 'DMO', capV: 'DMO', r0: 2.5, omega0: 2.5, z: [NO(), M(30), M(45)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2i', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería confinada (DMO — capacidad moderada de disipación de energía)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'mamposteria', cap: 'DMO', capV: 'DMO', r0: 2.0, omega0: 2.5, z: [NO(), GI_M(18), GI_M(21)],
    condiciones: 'Solo Grupo I en zonas de amenaza intermedia y baja.' }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2j', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería confinada (DMO — capacidad moderada de disipación de energía)',
    sistemaVertical: 'pórticos de concreto con capacidad mínima de disipación de energía (DMI)',
    material: 'mamposteria', cap: 'DMO', capV: 'DMI', r0: 2.0, omega0: 2.5, z: [NO(), NO(), GI_M(18)],
    condiciones: 'Solo Grupo I en zona de amenaza baja.' }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2k', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería de cavidad reforzada (DES — capacidad especial de disipación de energía)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'mamposteria', cap: 'DES', capV: 'DMO', r0: 4.0, omega0: 2.5, z: [NO(), M(30), M(45)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2l', subsistema: MEST2,
    sistemaSismico: 'Muros de mampostería de cavidad reforzada (DES — capacidad especial de disipación de energía)',
    sistemaVertical: 'pórticos de concreto con capacidad mínima de disipación de energía (DMI)',
    material: 'mamposteria', cap: 'DES', capV: 'DMI', r0: 2.0, omega0: 2.5, z: [NO(), NO(), M(45)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2m', subsistema: MEST2,
    sistemaSismico: 'Muros de cortante con placa de acero (DES)', sistemaVertical: V_ACERO_RESIST_O_NO,
    material: 'acero', cap: 'DES', capV: null, r0: 7.0, omega0: 2.0, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2n', subsistema: MEST2,
    sistemaSismico: 'Muros de cortante compuestos con placa de acero y concreto', sistemaVertical: V_ACERO_RESIST_O_NO,
    material: 'mixto', cap: null, capV: null, r0: 6.5, omega0: 2.5, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2o', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto reforzado (DES) mixtos con elementos de acero', sistemaVertical: V_ACERO_RESIST_O_NO,
    material: 'mixto', cap: 'DES', capV: null, r0: 6.0, omega0: 2.5, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2p', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto reforzado (DMO) mixtos con elementos de acero', sistemaVertical: V_ACERO_RESIST_O_NO,
    material: 'mixto', cap: 'DMO', capV: null, r0: 5.5, omega0: 2.5, z: [NO(), NO(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '2q', subsistema: MEST2,
    sistemaSismico: 'Muros de concreto reforzado (DMI) mixtos con elementos de acero', sistemaVertical: V_ACERO_RESIST_O_NO_PL,
    material: 'mixto', cap: 'DMI', capV: null, r0: 5.0, omega0: 2.5, z: [NO(), NO(), M(45)] }),

  fila({ tabla: T2, tipoSistema: CB, numero: '3a', subsistema: CONC2,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas (DES)', sistemaVertical: V_ACERO_NO_RESIST,
    material: 'acero', cap: 'DES', capV: null, r0: 5.0, omega0: 2.5, z: [M(30), M(45), M(60)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3b', subsistema: CONC2,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas (DMI)', sistemaVertical: V_ACERO_NO_RESIST,
    material: 'acero', cap: 'DMI', capV: null, r0: 4.0, omega0: 2.5, z: [NO(), M(10), M(60)] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3c', subsistema: CONC2,
    sistemaSismico: 'Pórticos mixtos con diagonales concéntricas (DES)', sistemaVertical: V_ACERO_RESIST_O_NO_PL,
    material: 'mixto', cap: 'DES', capV: null, r0: 5.0, omega0: 2.0, z: [M(50), SIN(), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3d', subsistema: CONC2,
    sistemaSismico: 'Pórticos mixtos con diagonales concéntricas (DMI)', sistemaVertical: V_ACERO_RESIST_O_NO_PL,
    material: 'mixto', cap: 'DMI', capV: null, r0: 3.0, omega0: 2.0, z: [NO([5], 20), NO([5], 20), SIN()], notas: [5],
    condiciones: 'En zonas alta e intermedia solo se permite una altura de 20 m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV (Nota 5).' }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3e', subsistema: CONC2,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas restringidas a pandeo, con conexiones viga-columna resistentes a momento',
    sistemaVertical: V_ACERO_NO_RESIST, material: 'acero', cap: null, capV: null, r0: 7.0, omega0: 2.5, z: [M(30), M(45), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3f', subsistema: CONC2,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas restringidas a pandeo, con conexiones viga-columna no resistentes a momento',
    sistemaVertical: V_ACERO_NO_RESIST, material: 'acero', cap: null, capV: null, r0: 6.0, omega0: 2.5, z: [M(30), M(45), SIN()] }),
  fila({ tabla: T2, tipoSistema: CB, numero: '3g', subsistema: CONC2,
    sistemaSismico: 'Pórticos de concreto con diagonales concéntricas con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 3.5, omega0: 2.5, z: [NO(), M(24), M(30)] }),
];

// ---------------------------------------------------------------------------
// Tabla A.3-3 — Sistema estructural de pórtico resistente a momentos (PDF p.98, A-55)
// ---------------------------------------------------------------------------
const T3 = 'A.3-3' as const;
const PO = 'porticos' as const;
const P_DES = '1. Pórticos resistentes a momentos con capacidad especial de disipación de energía (DES)';
const P_DMO = '2. Pórticos resistentes a momentos con capacidad moderada de disipación de energía (DMO)';
const P_DMI = '3. Pórticos resistentes a momentos con capacidad mínima de disipación de energía (DMI)';
const P_LC = '4. Pórticos losa-columna (incluye reticular celulado)';
const P_PI = '5. Estructuras de péndulo invertido';
const V_ACERO_MIXTOS = 'Pórticos de acero o mixtos resistentes o no a momentos';

const A33: SistemaEstructural[] = [
  fila({ tabla: T3, tipoSistema: PO, numero: '1a', subsistema: P_DES,
    sistemaSismico: 'De concreto (DES)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 7.0, omega0: 3.0, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '1b', subsistema: P_DES,
    sistemaSismico: 'De acero (DES)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DES', capV: 'DES', r0: 7.0, omega0: 3.0, z: [SIN(), SIN(), SIN()], notas: [3], ajusteR0: SOLDADURA_OBRA }),
  fila({ tabla: T3, tipoSistema: PO, numero: '1c', subsistema: P_DES,
    sistemaSismico: 'Mixtos (DES)', sistemaVertical: V_ACERO_MIXTOS,
    material: 'mixto', cap: 'DES', capV: null, r0: 7.0, omega0: 3.0, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '1d', subsistema: P_DES,
    sistemaSismico: 'De acero con cerchas dúctiles (DES)', sistemaVertical: 'Pórticos de acero resistentes o no a momentos',
    material: 'acero', cap: 'DES', capV: null, r0: 6.0, omega0: 3.0, z: [M(30), M(45), SIN()] }),

  fila({ tabla: T3, tipoSistema: PO, numero: '2a', subsistema: P_DMO,
    sistemaSismico: 'De concreto (DMO)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 5.0, omega0: 3.0, z: [NO(), SIN(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '2b', subsistema: P_DMO,
    sistemaSismico: 'De acero (DMO)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DMO', capV: 'DMO', r0: 5.0, omega0: 3.0, z: [NO(), SIN(), SIN()], notas: [3], ajusteR0: SOLDADURA_OBRA }),
  fila({ tabla: T3, tipoSistema: PO, numero: '2c', subsistema: P_DMO,
    sistemaSismico: 'Mixtos con conexiones rígidas (DMO)', sistemaVertical: V_ACERO_MIXTOS,
    material: 'mixto', cap: 'DMO', capV: null, r0: 5.0, omega0: 3.0, z: [NO(), SIN(), SIN()] }),

  fila({ tabla: T3, tipoSistema: PO, numero: '3a', subsistema: P_DMI,
    sistemaSismico: 'De concreto (DMI)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMI', capV: 'DMI', r0: 2.5, omega0: 3.0, z: [NO(), NO(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '3b', subsistema: P_DMI,
    sistemaSismico: 'De acero (DMI)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DMI', capV: 'DMI', r0: 3.0, omega0: 2.5, z: [NO(), NO(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '3c', subsistema: P_DMI,
    sistemaSismico: 'Mixtos con conexiones totalmente restringidas a momento (DMI)', sistemaVertical: V_ACERO_MIXTOS,
    material: 'mixto', cap: 'DMI', capV: null, r0: 3.0, omega0: 3.0, z: [NO(), NO(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '3d', subsistema: P_DMI,
    sistemaSismico: 'Mixtos con conexiones parcialmente restringidas a momento', sistemaVertical: V_ACERO_MIXTOS,
    material: 'mixto', cap: 'DMI', capV: null, r0: 6.0, omega0: 3.0, z: [NO(), M(30), M(50)] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '3e', subsistema: P_DMI,
    sistemaSismico: 'De acero con cerchas no dúctiles', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DMI', capV: null, r0: 1.5, omega0: 1.5, z: [NO([5], 12), NO([5], 12), M(12)], notas: [5],
    condiciones: 'En zonas alta e intermedia solo se permite hasta 12 m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV (Nota 5).' }),
  fila({ tabla: T3, tipoSistema: PO, numero: '3f', subsistema: P_DMI,
    sistemaSismico: 'De acero con perfiles de lámina doblada en frío y perfiles tubulares estructurales PTE que no cumplen los requisitos de F.2.2.4 para perfiles no esbeltos (nota 6)',
    sistemaVertical: 'el mismo', material: 'acero', cap: 'DMI', capV: null, r0: 1.5, omega0: 1.5,
    z: [NO([5], 12), NO([5], 12), SIN()], notas: [5, 6],
    condiciones: 'En zonas alta e intermedia solo se permite hasta 12 m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV (Nota 5).' }),

  fila({ tabla: T3, tipoSistema: PO, numero: '4a', subsistema: P_LC,
    sistemaSismico: 'De concreto con capacidad moderada de disipación de energía (DMO)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 2.5, omega0: 3.0, z: [NO(), M(15), M(21)] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '4b', subsistema: P_LC,
    sistemaSismico: 'De concreto con capacidad mínima de disipación de energía (DMI)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DMI', capV: 'DMI', r0: 1.5, omega0: 3.0, z: [NO(), NO(), M(15)] }),

  fila({ tabla: T3, tipoSistema: PO, numero: '5a', subsistema: P_PI,
    sistemaSismico: 'Pórticos de acero resistentes a momento con capacidad especial de disipación de energía (DES)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DES', capV: 'DES', r0: 2.5, omega0: 2.0, z: [SIN(), SIN(), SIN()], notas: [3], ajusteR0: SOLDADURA_OBRA }),
  fila({ tabla: T3, tipoSistema: PO, numero: '5b', subsistema: P_PI,
    sistemaSismico: 'Pórticos de concreto con capacidad especial de disipación de energía (DES)', sistemaVertical: 'el mismo',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 2.5, omega0: 2.0, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T3, tipoSistema: PO, numero: '5c', subsistema: P_PI,
    sistemaSismico: 'Pórticos de acero resistentes a momento con capacidad moderada de disipación de energía (DMO)', sistemaVertical: 'el mismo',
    material: 'acero', cap: 'DMO', capV: 'DMO', r0: 1.5, omega0: 2.0, z: [NO(), SIN(), SIN()], notas: [3], ajusteR0: SOLDADURA_OBRA }),
];

/**
 * Fila 3.g de la Tabla A.3-3 (sin valores de R0/Ω0): "Otras estructuras de celosía tales como vigas y
 * cerchas" -> "No se pueden usar como parte del sistema de resistencia sísmica, a no ser que tengan
 * conexiones rígidas a columnas, en cuyo caso serán tratadas como pórticos de celosía".
 * Se exporta aparte porque no tiene R0/Ω0 numéricos.
 */
export const FILA_A33_3G_SIN_VALORES = {
  id: 'a3-3-3g',
  tabla: 'A.3-3' as const,
  numero: '3g',
  subsistema: P_DMI,
  sistemaSismico: 'Otras estructuras de celosía tales como vigas y cerchas',
  texto:
    'No se pueden usar como parte del sistema de resistencia sísmica, a no ser que tengan conexiones rígidas a columnas, en cuyo caso serán tratadas como pórticos de celosía',
  r0: null,
  omega0: null,
} as const;

// ---------------------------------------------------------------------------
// Tabla A.3-4 — Sistema estructural dual (PDF p.99-100, A-56 y A-57)
// OJO: en la norma impresa la numeración de 1. salta de "k" a "m" (no existe "l").
// ---------------------------------------------------------------------------
const T4 = 'A.3-4' as const;
const DU = 'dual' as const;
const D_MEST = '1. Muros estructurales';
const D_EXC = '2. Pórticos de acero con diagonales excéntricas';
const D_CONC = '3. Pórticos con diagonales concéntricas';
const V_ALMA_DES = 'pórticos de acero con alma llena, con conexiones rígidas (DES)';
const V_ALMA_DMO = 'pórticos de acero con alma llena, con conexiones rígidas (DMO)';

const A34: SistemaEstructural[] = [
  fila({ tabla: T4, tipoSistema: DU, numero: '1a', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto con capacidad especial de disipación de energía (DES)',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 8.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1b', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto con capacidad especial de disipación de energía (DES)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'concreto', cap: 'DES', capV: 'DES', r0: 8.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1c', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 6.0, omega0: 2.5, z: [NO(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1d', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 6.0, omega0: 2.5, z: [NO(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1e', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DES) con todas las celdas rellenas',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DES', capV: 'DES', r0: 5.5, omega0: 3.0, z: [M(45), M(45), M(45)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1f', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DES) con todas las celdas rellenas',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DES', capV: 'DES', r0: 5.5, omega0: 3.0, z: [M(45), M(45), M(45)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1g', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DMO', capV: 'DES', r0: 4.5, omega0: 2.5, z: [M(35), M(35), M(35)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1h', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'mamposteria', cap: 'DMO', capV: 'DES', r0: 4.5, omega0: 2.5, z: [M(35), M(35), M(35)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1i', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad moderada de disipación de energía (DMO)',
    material: 'mamposteria', cap: 'DMO', capV: 'DMO', r0: 3.5, omega0: 2.5, z: [NO(), M(30), M(30)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1j', subsistema: D_MEST,
    sistemaSismico: 'Muros de mampostería reforzada de bloque de perforación vertical (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'mamposteria', cap: 'DMO', capV: 'DMO', r0: 3.5, omega0: 2.5, z: [NO(), M(30), M(30)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1k', subsistema: D_MEST,
    sistemaSismico: 'Muros de cortante con placa de acero (DES)', sistemaVertical: V_ALMA_DES,
    material: 'acero', cap: 'DES', capV: 'DES', r0: 7.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1m', subsistema: D_MEST,
    sistemaSismico: 'Muros de cortante mixtos con placa de acero', sistemaVertical: V_ALMA_DES,
    material: 'mixto', cap: null, capV: 'DES', r0: 6.5, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1n', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto reforzado (DES) mixtos con elementos de acero', sistemaVertical: V_ALMA_DES,
    material: 'mixto', cap: 'DES', capV: 'DES', r0: 6.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1o', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto reforzado (DMI) mixtos con elementos de acero', sistemaVertical: V_ALMA_DES,
    material: 'mixto', cap: 'DMI', capV: 'DES', r0: 5.0, omega0: 2.5, z: [NO(), NO(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '1p', subsistema: D_MEST,
    sistemaSismico: 'Muros de concreto reforzado (DMI) mixtos con elementos de acero', sistemaVertical: V_ALMA_DMO,
    material: 'mixto', cap: 'DMI', capV: 'DMO', r0: 4.0, omega0: 3.0, z: [NO(), NO(), SIN()] }),

  fila({ tabla: T4, tipoSistema: DU, numero: '2a', subsistema: D_EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo son resistentes a momento',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'acero', cap: null, capV: 'DES', r0: 8.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '2b', subsistema: D_EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo no son resistentes a momento',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'acero', cap: null, capV: 'DES', r0: 7.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '2c', subsistema: D_EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo son resistentes a momento',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad moderada de disipación de energía (DMO)',
    material: 'acero', cap: null, capV: 'DMO', r0: 6.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '2d', subsistema: D_EXC,
    sistemaSismico: 'Pórticos de acero con diagonales excéntricas si las conexiones con las columnas por fuera del vínculo no son resistentes a momento',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad moderada de disipación de energía (DMO)',
    material: 'acero', cap: null, capV: 'DMO', r0: 5.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),

  fila({ tabla: T4, tipoSistema: DU, numero: '3a', subsistema: D_CONC,
    sistemaSismico: 'De acero con capacidad especial de disipación de energía (DES)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad especial de disipación de energía (DES)',
    material: 'acero', cap: 'DES', capV: 'DES', r0: 6.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3b', subsistema: D_CONC,
    sistemaSismico: 'De acero con capacidad mínima de disipación de energía (DMI)',
    sistemaVertical: 'pórticos de acero resistentes a momentos con capacidad moderada de disipación de energía (DMO)',
    material: 'acero', cap: 'DMI', capV: 'DMO', r0: 3.0, omega0: 2.5, z: [NO(), M(60), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3c', subsistema: D_CONC,
    sistemaSismico: 'De concreto con capacidad moderada de disipación de energía (DMO)',
    sistemaVertical: 'pórticos de concreto con capacidad moderada de disipación de energía (DMO)',
    material: 'concreto', cap: 'DMO', capV: 'DMO', r0: 4.0, omega0: 2.5, z: [NO(), M(24), M(30)] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3d', subsistema: D_CONC,
    sistemaSismico: 'Pórticos mixtos con diagonales concéntricas (DES)', sistemaVertical: V_ALMA_DES,
    material: 'mixto', cap: 'DES', capV: 'DES', r0: 6.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3e', subsistema: D_CONC,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas restringidas al pandeo', sistemaVertical: V_ALMA_DES,
    material: 'acero', cap: null, capV: 'DES', r0: 7.0, omega0: 2.5, z: [SIN(), SIN(), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3f', subsistema: D_CONC,
    sistemaSismico: 'Pórticos de acero con diagonales concéntricas (DES)', sistemaVertical: V_ALMA_DMO,
    material: 'acero', cap: 'DES', capV: 'DMO', r0: 6.0, omega0: 2.5, z: [NO(), M(10), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3g', subsistema: D_CONC,
    sistemaSismico: 'Pórticos mixtos con diagonales concéntricas (DES)', sistemaVertical: V_ALMA_DMO,
    material: 'mixto', cap: 'DES', capV: 'DMO', r0: 5.5, omega0: 2.5, z: [M(50), M(30), SIN()] }),
  fila({ tabla: T4, tipoSistema: DU, numero: '3h', subsistema: D_CONC,
    sistemaSismico: 'Pórticos con diagonales concéntricas que resistan solo a tensión', sistemaVertical: 'El mismo',
    material: 'acero', cap: null, capV: null, r0: 3.0, omega0: 2.5, z: [NO([4], 12), NO([4], 12), NO([4], 12)], notas: [4],
    condiciones: 'No se permite en ninguna zona (celda combinada "no se permite (nota 4)"); la nota 4 permite hasta 12 m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV.' }),
];

// ---------------------------------------------------------------------------
// Exportaciones principales
// ---------------------------------------------------------------------------
export const SISTEMAS_A31 = A31;
export const SISTEMAS_A32 = A32;
export const SISTEMAS_A33 = A33;
export const SISTEMAS_A34 = A34;

/** Todas las filas de las tablas A.3-1 a A.3-4 con R0 y Ω0 (excluye la fila sin valores A.3-3 3.g). */
export const SISTEMAS: SistemaEstructural[] = [...A31, ...A32, ...A33, ...A34];

export const TITULOS_TABLAS: Record<TablaSistema, string> = {
  'A.3-1': 'Sistema estructural de muros de carga',
  'A.3-2': 'Sistema estructural combinado',
  'A.3-3': 'Sistema estructural de pórtico resistente a momentos',
  'A.3-4': 'Sistema estructural dual',
};

/** Página PDF de cada tabla (página impresa "A-n" = PDF - 43). */
export const PAGINAS_PDF_TABLAS: Record<string, number[]> = {
  'A.3-1': [95],
  'A.3-2': [96, 97],
  'A.3-3': [98],
  'A.3-4': [99, 100],
  'A.3-5': [101],
  'A.3-6': [102],
  'A.3-7': [103],
};

export function buscarSistema(id: string): SistemaEstructural | undefined {
  return SISTEMAS.find((s) => s.id === id);
}

export function sistemasPorTabla(tabla: TablaSistema): SistemaEstructural[] {
  return SISTEMAS.filter((s) => s.tabla === tabla);
}

export function limiteEnZona(s: SistemaEstructural, zona: ZonaAmenaza): LimiteZona {
  return s.zonas[zona];
}

/** Texto legible de la restricción de una zona, p. ej. "hasta 50 m", "sin límite", "no se permite". */
export function describirLimite(l: LimiteZona): string {
  let base: string;
  switch (l.tipoLimite) {
    case 'sin-limite':
      base = 'sin límite de altura';
      break;
    case 'metros':
      base = `hasta ${l.alturaMaxM} m`;
      break;
    case 'pisos':
      base = `hasta ${l.alturaMaxPisos} pisos`;
      break;
    default:
      base = 'no se permite';
  }
  if (l.soloGrupoI && l.tipoLimite !== 'no-permitido') base += ' (solo Grupo I)';
  if (!l.permitido && l.alturaExcepcionM !== undefined) {
    base += ` (excepción por nota: ${l.alturaExcepcionM} m en edificios de un piso que no sean del grupo IV)`;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Notas de cada tabla (texto fiel del PDF)
// ---------------------------------------------------------------------------
export const NOTAS_TABLAS: Record<TablaSistema, Record<number, string>> = {
  'A.3-1': {
    1: 'El sistema de muros de carga es un sistema estructural que no dispone de un pórtico esencialmente completo, en el cual las cargas verticales son resistidas por los muros de carga y las fuerzas horizontales son resistidas por muros estructurales o pórticos con diagonales.',
    2: 'Para edificaciones clasificadas como irregulares el valor de R0 debe multiplicarse por φa, φp y φr para obtener R = φaφpφrR0 (Véase A.3.3.3).',
    3: 'La mampostería no reforzada sólo se permite en las regiones de las zonas de amenaza sísmica baja donde Aa sea menor o igual a 0.05 cuando se trata de edificaciones del grupo de uso I, de uno y dos pisos.',
    4: 'El valor de Ω0 puede reducirse restándole 0.5 en estructuras con diafragma flexible, pero no debe ser menos de 2.0 para cualquier estructura.',
  },
  'A.3-2': {
    1: 'El sistema combinado es un sistema estructural en el cual: (a) las cargas verticales son resistidas por un pórtico no resistente a momentos, esencialmente completo, y las fuerzas horizontales son resistidas por muros estructurales o pórticos con diagonales, o (b) las cargas verticales y horizontales son resistidas por un pórtico resistente a momentos, esencialmente completo, combinado con muros estructurales o pórticos con diagonales, y que no cumple los requisitos de un sistema dual.',
    2: 'Para edificaciones clasificadas como irregulares el valor de R0 debe multiplicarse por φa, φp y φr, para obtener R = φaφpφrR0 (Véase A.3.3.3).',
    3: 'Los pórticos losa-columna incluyen el reticular celulado.',
    4: 'El valor de Ω0 puede reducirse restándole 0.5 en estructuras con diafragma flexible, pero no debe ser menos de 2.0 para cualquier estructura.',
    5: 'Se permite una altura de 20m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV.',
  },
  'A.3-3': {
    1: 'El sistema de pórtico es un sistema estructural compuesto por un pórtico espacial, resistente a momentos, esencialmente completo, sin diagonales, que resiste todas las cargas verticales y las fuerzas horizontales.',
    2: 'Para edificaciones clasificadas como irregulares el valor de R0 debe multiplicarse por φa, φp y φr, para obtener R = φaφpφrR0 (Véase A.3.3.3).',
    3: 'Cuando se trate de estructuras de acero donde las uniones del sistema de resistencia sísmica son soldadas en obra, el valor de R0 debe multiplicarse por 0.90.',
    4: 'El valor de Ω0 puede reducirse restándole 0.5 en estructuras con diafragma flexible, pero no debe ser menos de 2.0 para cualquier estructura.',
    5: 'Se permite hasta una altura de 12m en edificios de un piso (naves industriales o similares) que no sean del grupo de Uso IV.',
    6: 'Los perfiles de lámina doblada y los perfiles tubulares estructurales que cumplen con los requisitos de F.2.2.4 para miembros no esbeltos que se diseñan con conexiones dúctiles calificadas de acuerdo a F.3.1.8 se podrán diseñar como pórticos resistentes a momentos convencionales.',
  },
  'A.3-4': {
    1: 'El sistema dual es un sistema estructural que tiene un pórtico espacial resistente a momentos y sin diagonales, combinado con muros estructurales o pórticos con diagonales. Para que el sistema estructural se pueda clasificar como sistema dual se deben cumplir los siguientes requisitos: (a) El pórtico espacial resistente a momentos, sin diagonales, esencialmente completo, debe ser capaz de soportar las cargas verticales. (b) Las fuerzas horizontales son resistidas por la combinación de muros estructurales o pórticos con diagonales, con el pórtico resistente a momentos, el cual puede ser un pórtico de capacidad especial de disipación de energía (DES), cuando se trata de concreto reforzado o acero estructural, un pórtico con capacidad moderada de disipación de energía de concreto reforzado, o un pórtico con capacidad mínima de disipación de energía de acero estructural. El pórtico resistente a momentos, actuando independientemente, debe diseñarse para que sea capaz de resistir como mínimo el 25 por ciento del cortante sísmico en la base. (c) Los dos sistemas deben diseñarse de tal manera que en conjunto sean capaces de resistir la totalidad del cortante sísmico en la base, en proporción a sus rigideces relativas, considerando la interacción del sistema dual en todos los niveles de la edificación, pero en ningún caso la responsabilidad de los muros estructurales o los pórticos con diagonales puede ser menor del 75 por ciento del cortante sísmico en la base.',
    2: 'Para edificaciones clasificadas como irregulares el valor de R0 debe multiplicarse por φa, φp y φr, para obtener R = φaφpφrR0 (Véase A.3.3.3).',
    3: 'El valor de Ω0 puede reducirse restándole 0.5 en estructuras con diafragma flexible, pero no debe ser menos de 2.0 para cualquier estructura.',
    4: 'Se permite hasta una altura de 12m en edificios de un piso (naves industriales o similares) que no sean del grupo de uso IV.',
  },
};

// ---------------------------------------------------------------------------
// Reglas numéricas generales de A.3.1 - A.3.3 (PDF p.83-87)
// ---------------------------------------------------------------------------

/** A.3.3.9 / notas de A.3-1 a A.3-4: reducción de Ω0 en estructuras con diafragma flexible. */
export const OMEGA0_REDUCCION_DIAFRAGMA_FLEXIBLE = 0.5;
/** "pero no debe ser menos de 2.0 para cualquier estructura" (ver anomalía: algunas filas de A.3-3 traen Ω0 = 1.5). */
export const OMEGA0_MINIMO_TRAS_REDUCCION = 2.0;
/** A.3.1.7: R0 de sistemas prefabricados (salvo demostración experimental/analítica, Ley 400 Art. 10 y 12). */
export const R0_SISTEMA_PREFABRICADO = 1.5;
/** A.3.1.8: coeficiente de carga para fuerzas sísmicas reducidas al nivel de esfuerzos de trabajo. */
export const COEF_CARGA_ESFUERZOS_TRABAJO = 0.7;
/** A.3.2.5 (b), (c), (d): límite de relación entre valores de R al combinar sistemas en planta. */
export const FACTOR_MAX_R_COMBINACION_PLANTA = 1.25;
/** A.3.2.4.2: pisos livianos; no se aplica A.3.2.4.1 si la masa por encima del cambio de sistema < 10 % de la masa total. */
export const FRACCION_MASA_PISOS_LIVIANOS = 0.1;
/** A.3.2.1.4 (b), (c): sistema dual. */
export const SISTEMA_DUAL = {
  porticoMinimoFraccionCortanteBase: 0.25,
  murosOPorticosDiagonalesMinimoFraccionCortanteBase: 0.75,
} as const;
/** A.3.3.5.1: si la deriva de todo piso es < 1.3 veces la del piso siguiente hacia arriba, φa = 1 (no 1aA, 1bA, 2A, 3A). */
export const RELACION_DERIVA_EXCEPCION_ALTURA = 1.3;

/** Ecuación A.3.3-1: R = φa·φp·φr·R0. No hay en A.3.3.3 un límite mínimo de R ni un tope inferior para el producto. */
export function calcularR(r0: number, phiA = 1, phiP = 1, phiR = 1): number {
  return phiA * phiP * phiR * r0;
}

/** R0 efectivo aplicando la nota 3 de A.3-3 (soldadura en obra, x0.90) cuando la fila lo tiene. */
export function r0Efectivo(s: SistemaEstructural, soldaduraEnObra = false): number {
  return soldaduraEnObra && s.ajusteR0 ? s.r0 * s.ajusteR0.factor : s.r0;
}

/**
 * Ω0 con la reducción de las notas (4 o 3 en A.3-4): resta 0.5 con diafragma flexible pero "no debe ser menos
 * de 2.0". Interpretación aquí adoptada: el resultado es max(Ω0 - 0.5, 2.0), sin superar nunca el Ω0 de la tabla
 * (las filas con Ω0 = 1.5 ya están por debajo de 2.0 y no se modifican).
 */
export function omega0Efectivo(omega0: number, diafragmaFlexible = false): number {
  if (!diafragmaFlexible) return omega0;
  return Math.min(omega0, Math.max(omega0 - OMEGA0_REDUCCION_DIAFRAGMA_FLEXIBLE, OMEGA0_MINIMO_TRAS_REDUCCION));
}

// ---------------------------------------------------------------------------
// A.3.4.2 — Método de análisis mínimo requerido (PDF p.88, A-45) — umbrales numéricos
// ---------------------------------------------------------------------------
export const METODO_ANALISIS_A342 = {
  fuerzaHorizontalEquivalente: [
    'A.3.4.2.1 (a): todas las edificaciones, regulares e irregulares, en zonas de amenaza sísmica baja.',
    'A.3.4.2.1 (b): todas las edificaciones, regulares e irregulares, del grupo de uso I, en zonas de amenaza sísmica intermedia.',
    'A.3.4.2.1 (c): edificaciones regulares de 20 niveles o menos y 60 m de altura o menos medidos desde la base, en cualquier zona de amenaza sísmica, exceptuando edificaciones localizadas en lugares que tengan un perfil de suelo tipo D, E o F, con periodos de vibración mayores de 2TC.',
    'A.3.4.2.1 (d): edificaciones irregulares que no tengan más de 6 niveles ni más de 18 m de altura medidos a partir de la base.',
    'A.3.4.2.1 (e): estructuras flexibles apoyadas sobre estructuras más rígidas que cumplan los requisitos de A.3.2.4.3.',
  ],
  dinamicoElasticoObligatorio: [
    'A.3.4.2.2 (a): edificaciones de más de 20 niveles o de más de 60 m de altura, exceptuando las mencionadas en A.3.4.2.1 (a) y (b).',
    'A.3.4.2.2 (b): edificaciones con irregularidades verticales de los tipos 1aA, 1bA, 2A y 3A.',
    'A.3.4.2.2 (c): edificaciones con irregularidades que no estén descritas en A.3.3.4 y A.3.3.5, exceptuando el caso de A.3.2.4.3.',
    'A.3.4.2.2 (d): edificaciones de más de 5 niveles o de más de 20 m de altura, en zonas de amenaza sísmica alta, que no tengan el mismo sistema estructural en toda su altura, con la excepción de lo prescrito en A.3.2.4.3.',
    'A.3.4.2.2 (e): estructuras, regulares o irregulares, en sitios con perfil de suelo D, E o F y período mayor de 2TC (incluir interacción suelo-estructura, Capítulo A.7).',
  ],
  umbrales: {
    regularMaxNiveles: 20,
    regularMaxAlturaM: 60,
    irregularMaxNiveles: 6,
    irregularMaxAlturaM: 18,
    dinamicoMasDeNivelesSistemaVariableZonaAlta: 5,
    dinamicoMasDeAlturaMSistemaVariableZonaAlta: 20,
  },
} as const;

// ---------------------------------------------------------------------------
// A.3.2.4 / A.3.2.5 — combinación de sistemas (texto)
// ---------------------------------------------------------------------------
export const COMBINACION_SISTEMAS = {
  enAltura: {
    'A.3.2.4.1':
      'Con la excepción de lo dispuesto en A.3.2.4.2 a A.3.2.4.4, la estructura que combine en la altura diferentes sistemas estructurales se clasifica como irregular del tipo 5aA o 5bA (tabla A.3-7), y el valor del coeficiente de capacidad de disipación de energía, R, en cualquier dirección y en cualquier nivel, como máximo debe ser el menor valor de R de los sistemas estructurales que se estén combinando por encima de ese nivel y en la dirección considerada. Deben cumplirse los requisitos de diseño exigidos para cada sistema estructural y para cada grado de capacidad de disipación de energía del material estructural.',
    'A.3.2.4.2':
      'No hay necesidad de aplicar los requisitos de A.3.2.4.1 cuando la masa de los pisos localizados por encima del nivel donde se inicia un sistema estructural sea menor del 10 por ciento de la masa total, M, de la edificación.',
    'A.3.2.4.3':
      'En estructuras que tengan una parte superior flexible apoyada en una con mayor rigidez y que cumplan los requisitos de la tabla A.3-5, puede utilizarse el procedimiento de diseño indicado allí.',
    'A.3.2.4.4':
      'Estructura rígida apoyada sobre una estructura con menor rigidez: este tipo de combinación presenta inconvenientes en su comportamiento sísmico, por lo que para este Reglamento no es un sistema estructural aceptable.',
  },
  enPlanta: {
    intro:
      'Pueden combinarse sistemas estructurales en planta, sin que esto dé pie a que la estructura se clasifique como irregular, con las siguientes limitaciones:',
    a: 'Los dos sistemas deben coexistir en toda la altura de la edificación, a menos que se cumplan los requisitos de A.3.2.4.',
    b: 'Cuando la estructura tiene un sistema de muros de carga únicamente en una dirección, el valor de R para diseñar la dirección ortogonal no puede ser mayor que 1.25 veces el valor de R del sistema estructural de muros de carga.',
    c: 'Cuando la estructura tiene dos sistemas de muros de carga diferentes en la misma dirección, para el sistema que tiene el mayor valor de R el valor a emplear no puede ser mayor que 1.25 veces el valor de R del sistema con el menor valor de R.',
    d: 'Cuando la estructura tiene sistemas diferentes al de muros de carga en ambas direcciones, para el sistema que tiene un mayor valor de R, el valor a emplear no puede ser mayor que 1.25 veces el valor de R del sistema con el menor valor de R.',
  },
} as const;

// ---------------------------------------------------------------------------
// Tabla A.3-5 — Mezcla de sistemas estructurales en la altura (PDF p.101, A-58)
// ---------------------------------------------------------------------------
export interface MezclaSistemasAltura {
  id: string;
  titulo: string;
  descripcion: string;
  condiciones: string[];
  siNoCumple?: string;
  requisitos: string[];
  /** Valores numéricos clave. */
  umbrales?: Record<string, number>;
  aceptable: boolean;
}

export const MEZCLA_SISTEMAS_ALTURA: MezclaSistemasAltura[] = [
  {
    id: 'flexible-sobre-rigido',
    titulo: 'Estructura flexible apoyada sobre una estructura con mayor rigidez',
    descripcion: 'Puede utilizarse los requisitos dados aquí si la estructura cumple las siguientes condiciones:',
    condiciones: [
      '(a) Ambas partes de la estructura, consideradas separadamente, puedan ser clasificadas como regulares de acuerdo con los requisitos de A.3.3,',
      '(b) El promedio de las rigideces de piso de la parte baja sea por lo menos 10 veces el promedio de las rigideces de piso de la parte alta y',
      '(c) El período de la estructura, considerada como un todo, no sea mayor al 1.1 veces el período de la parte superior, al ser considerada como una estructura independiente empotrada en la base.',
    ],
    siNoCumple: 'Si no se cumplen las condiciones anteriores la estructura se considera irregular y deben seguirse los requisitos de A.3.3.',
    requisitos: [
      'Se permite que esta combinación de sistemas estructurales no se considere irregular (φp = φa = 1.0), y el sistema puede diseñarse sísmicamente utilizando el método de la fuerza horizontal equivalente, tal como lo prescribe el Capítulo A.4, de la siguiente manera:',
      '(1) La parte superior flexible puede ser analizada y diseñada como una estructura separada, apoyada para efecto de las fuerzas horizontales por la parte más rígida inferior, usando el valor apropiado de R0 para su sistema estructural.',
      '(2) La parte rígida inferior debe ser analizada y diseñada como una estructura separada, usando el valor apropiado de R0 para su sistema estructural, y las reacciones de la parte superior, obtenidas de su análisis, deben ser amplificadas por la relación entre el valor de R0 para la parte superior y el valor de R0 de la parte inferior.',
    ],
    umbrales: { relacionRigidezPisoInferiorSuperiorMin: 10, relacionPeriodoTotalSuperiorMax: 1.1, phiP: 1.0, phiA: 1.0 },
    aceptable: true,
  },
  {
    id: 'rigido-sobre-flexible',
    titulo: 'Estructura rígida apoyada sobre una estructura con menor rigidez',
    descripcion:
      'Corresponde a edificaciones en las cuales se suspende antes de llegar a la base de la estructura, parcial o totalmente, un sistema estructural más rígido que el que llega a la base de la estructura. Este tipo de combinación de sistemas estructurales en la altura presenta inconvenientes en su comportamiento sísmico. No es aceptable como una solución estructural para el presente Reglamento.',
    condiciones: [],
    requisitos: ['(1) No es aceptable como solución estructural para el presente Reglamento.'],
    aceptable: false,
  },
];

// ---------------------------------------------------------------------------
// Tabla A.3-6 — Irregularidades en planta (PDF p.102, A-59)
// ---------------------------------------------------------------------------
export type TipoIrregularidadPlanta = '1aP' | '1bP' | '2P' | '3P' | '4P' | '5P';
export type TipoIrregularidadAltura = '1aA' | '1bA' | '2A' | '3A' | '4A' | '5aA' | '5bA';

export interface Irregularidad<T extends string> {
  tipo: T;
  nombre: string;
  descripcion: string;
  /** φp (planta) o φa (altura). */
  phi: number;
  referencias: string[];
}

export const IRREGULARIDADES_PLANTA: Irregularidad<TipoIrregularidadPlanta>[] = [
  {
    tipo: '1aP', nombre: 'Irregularidad torsional', phi: 0.9,
    descripcion: 'La irregularidad torsional existe cuando en una edificación con diafragma rígido, la máxima deriva de piso de un extremo de la estructura, calculada incluyendo la torsión accidental y medida perpendicularmente a un eje determinado, es más de 1.2 y menor o igual a 1.4 veces la deriva promedio de los dos extremos de la estructura, con respecto al mismo eje de referencia.',
    referencias: ['A.3.3.6', 'A.3.4.2', 'A.3.6.3.1', 'A.3.6.7.1', 'A.3.6.8.4', 'A.5.2.1'],
  },
  {
    tipo: '1bP', nombre: 'Irregularidad torsional extrema', phi: 0.8,
    descripcion: 'La irregularidad torsional extrema existe cuando en una edificación con diafragma rígido, la máxima deriva de piso de un extremo de la estructura, calculada incluyendo la torsión accidental y medida perpendicularmente a un eje determinado, es más de 1.4 veces la deriva promedio de los dos extremos de la estructura, con respecto al mismo eje de referencia.',
    referencias: ['A.3.3.6', 'A.3.4.2', 'A.3.6.3.1', 'A.3.6.7.1', 'A.3.6.8.4', 'A.5.2.1'],
  },
  {
    tipo: '2P', nombre: 'Retrocesos excesivos en las esquinas', phi: 0.9,
    descripcion: 'La configuración de una estructura se considera irregular cuando ésta tiene retrocesos excesivos en sus esquinas. Un retroceso en una esquina se considera excesivo cuando las proyecciones de la estructura, a ambos lados del retroceso, son mayores que el 15 por ciento de la dimensión de la planta de la estructura en la dirección del retroceso.',
    referencias: ['A.3.4.2', 'A.3.6.8.4', 'A.3.6.8.5', 'A.5.2.1'],
  },
  {
    tipo: '3P', nombre: 'Discontinuidades en el diafragma', phi: 0.9,
    descripcion: 'Cuando el diafragma tiene discontinuidades apreciables o variaciones en su rigidez, incluyendo las causadas por aberturas, entradas, retrocesos o huecos con áreas mayores al 50 por ciento del área bruta del diafragma o existen cambios en la rigidez efectiva del diafragma de más del 50 por ciento, entre niveles consecutivos, la estructura se considera irregular.',
    referencias: ['A.3.3.7', 'A.3.4.2', 'A.3.6.8.4', 'A.5.2.1'],
  },
  {
    tipo: '4P', nombre: 'Desplazamientos del plano de acción de elementos verticales', phi: 0.8,
    descripcion: 'La estructura se considera irregular cuando existen discontinuidades en las trayectorias de las fuerzas inducidas por los efectos sísmicos, tales como cuando se traslada el plano que contiene a un grupo de elementos verticales del sistema de resistencia sísmica, en una dirección perpendicular a él, generando un nuevo plano. Los altillos o manzardas de un solo piso se eximen de este requisito en la consideración de irregularidad.',
    referencias: ['A.3.3.7', 'A.3.4.2', 'A.3.6.8.4', 'A.3.6.12', 'A.5.2.1'],
  },
  {
    tipo: '5P', nombre: 'Sistemas no paralelos', phi: 0.9,
    descripcion: 'Cuando las direcciones de acción horizontal de los elementos verticales del sistema de resistencia sísmica no son paralelas o simétricas con respecto a los ejes ortogonales horizontales principales del sistema de resistencia sísmica, la estructura se considera irregular.',
    referencias: ['A.3.4.2', 'A.3.6.3.1', 'A.5.2.1'],
  },
];

export const NOTAS_A36: Record<number, string> = {
  1: 'En zonas de amenaza sísmica intermedia para edificaciones pertenecientes al grupo de uso I, la evaluación de irregularidad se puede limitar a las irregularidades de los tipos 1aP, 1bP, 3P y 4P (Véase A.3.3.7).',
  2: 'En zonas de amenaza sísmica baja para edificaciones pertenecientes a los grupos de uso I y II, la evaluación de irregularidad se puede limitar a las irregularidades tipo 1aP e 1bP (Véase A.3.3.6).',
};

// ---------------------------------------------------------------------------
// Tabla A.3-7 — Irregularidades en la altura (PDF p.103, A-60)
// ---------------------------------------------------------------------------
export const IRREGULARIDADES_ALTURA: Irregularidad<TipoIrregularidadAltura>[] = [
  {
    tipo: '1aA', nombre: 'Piso flexible (Irregularidad en rigidez)', phi: 0.9,
    descripcion: 'Cuando la rigidez ante fuerzas horizontales de un piso es menor del 70 por ciento pero superior o igual al 60 por ciento de la rigidez del piso superior o menor del 80 por ciento pero superior o igual al 70 por ciento del promedio de la rigidez de los tres pisos superiores, la estructura se considera irregular.',
    referencias: ['A.3.3.5.1', 'A.3.4.2'],
  },
  {
    tipo: '1bA', nombre: 'Piso flexible (Irregularidad extrema en rigidez)', phi: 0.8,
    descripcion: 'Cuando la rigidez ante fuerzas horizontales de un piso es menor del 60 por ciento de la rigidez del piso superior o menor del 70 por ciento del promedio de la rigidez de los tres pisos superiores, la estructura se considera irregular.',
    referencias: ['A.3.3.5.1', 'A.3.4.2'],
  },
  {
    tipo: '2A', nombre: 'Irregularidad en la distribución de las masas', phi: 0.9,
    descripcion: 'Cuando la masa, mi, de cualquier piso es mayor que 1.5 veces la masa de uno de los pisos contiguos, la estructura se considera irregular. Se exceptúa el caso de cubiertas que sean más livianas que el piso de abajo.',
    referencias: ['A.3.3.5.1', 'A.3.4.2'],
  },
  {
    tipo: '3A', nombre: 'Irregularidad geométrica', phi: 0.9,
    descripcion: 'Cuando la dimensión horizontal del sistema de resistencia sísmica en cualquier piso es mayor que 1.3 veces la misma dimensión en un piso adyacente, la estructura se considera irregular. Se exceptúa el caso de los altillos de un solo piso.',
    referencias: ['A.3.4.2'],
  },
  {
    tipo: '4A', nombre: 'Desplazamientos dentro del plano de acción', phi: 0.8,
    descripcion: 'La estructura se considera irregular cuando existen desplazamientos en el alineamiento de elementos verticales del sistema de resistencia sísmica, dentro del mismo plano que los contiene, y estos desplazamientos son mayores que la dimensión horizontal del elemento. Cuando los elementos desplazados solo sostienen la cubierta de la edificación sin otras cargas adicionales de tanques o equipos, se eximen de esta consideración de irregularidad.',
    referencias: ['A.3.3.7', 'A.3.4.2', 'A.3.6.12'],
  },
  {
    tipo: '5aA', nombre: 'Piso débil — Discontinuidad en la resistencia', phi: 0.9,
    descripcion: 'Cuando la resistencia del piso es menor del 80 por ciento de la del piso inmediatamente superior pero superior o igual al 65 por ciento, entendiendo la resistencia del piso como la suma de las resistencias de todos los elementos que comparten el cortante del piso para la dirección considerada, la estructura se considera irregular.',
    referencias: ['A.3.2.4.1', 'A.3.3.6', 'A.3.3.7', 'A.3.4.2'],
  },
  {
    tipo: '5bA', nombre: 'Piso débil — Discontinuidad extrema en la resistencia', phi: 0.8,
    descripcion: 'Cuando la resistencia del piso es menor del 65 por ciento de la del piso inmediatamente superior, entendiendo la resistencia del piso como la suma de las resistencias de todos los elementos que comparten el cortante del piso para la dirección considerada, la estructura se considera irregular.',
    referencias: ['A.3.2.4.1', 'A.3.3.6', 'A.3.3.7', 'A.3.4.2'],
  },
];

export const NOTAS_A37: Record<number, string> = {
  1: 'Cuando la deriva de cualquier piso es menor de 1.3 veces la deriva del piso siguiente hacia arriba, puede considerarse que no existen irregularidades de los tipos 1aA, 1bA, 2A, ó 3A (Véase A.3.3.5.1).',
  2: 'En zonas de amenaza sísmica intermedia para edificaciones pertenecientes al grupo de uso I, la evaluación de irregularidad se puede limitar a las irregularidades de los tipos 4A, 5aA y 5bA (Véase A.3.3.7).',
  3: 'En zonas de amenaza sísmica baja para edificaciones pertenecientes a los grupos de usos I y II, la evaluación de irregularidad se puede limitar a la irregularidad tipo 5aA y 5bA (Véase A.3.3.6).',
};

/**
 * Irregularidades que deben evaluarse según zona y grupo de uso (A.3.3.6 y A.3.3.7; notas de A.3-6 y A.3-7).
 * Para cualquier otra combinación zona/grupo deben evaluarse todas.
 */
export const IRREGULARIDADES_A_EVALUAR = {
  /** Zona intermedia, grupo de uso I (A.3.3.7). */
  intermedia_grupoI: {
    planta: ['1aP', '1bP', '3P', '4P'] as TipoIrregularidadPlanta[],
    altura: ['4A', '5aA', '5bA'] as TipoIrregularidadAltura[],
  },
  /** Zona baja, grupos de uso I y II (A.3.3.6). */
  baja_grupoI_II: {
    planta: ['1aP', '1bP'] as TipoIrregularidadPlanta[],
    altura: ['5aA', '5bA'] as TipoIrregularidadAltura[],
  },
} as const;

export function buscarIrregularidadPlanta(tipo: TipoIrregularidadPlanta) {
  return IRREGULARIDADES_PLANTA.find((i) => i.tipo === tipo);
}
export function buscarIrregularidadAltura(tipo: TipoIrregularidadAltura) {
  return IRREGULARIDADES_ALTURA.find((i) => i.tipo === tipo);
}

/** A.3.3.3: con varios tipos simultáneos se aplica el menor φ (en planta y, por separado, en altura). Sin irregularidades = 1.0. */
export function phiPlanta(tipos: TipoIrregularidadPlanta[]): number {
  return tipos.reduce((min, t) => Math.min(min, buscarIrregularidadPlanta(t)?.phi ?? 1), 1);
}
export function phiAltura(tipos: TipoIrregularidadAltura[]): number {
  return tipos.reduce((min, t) => Math.min(min, buscarIrregularidadAltura(t)?.phi ?? 1), 1);
}

// ---------------------------------------------------------------------------
// A.3.3.8 — Ausencia de redundancia, φr (PDF p.86-87, A-43 y A-44)
// ---------------------------------------------------------------------------
export const REDUNDANCIA = {
  /** φr = 1.0 si hay redundancia (o DMI); φr = 0.75 si hay ausencia de redundancia. */
  phiRRedundante: 1.0,
  phiRAusenciaRedundancia: 0.75,
  /** Pisos a evaluar: los que resisten más del 35 % del corte basal en la dirección bajo estudio. */
  fraccionCorteBasalPisosEvaluados: 0.35,
  /** Reducción máxima admisible de la resistencia horizontal del piso al fallar un elemento: 33 %. */
  reduccionMaximaResistenciaPiso: 0.33,
  /** Vanos mínimos en periferia, a ambos lados de la planta y en ambas direcciones (alternativa a las condiciones (a)-(d)). */
  vanosMinimosPeriferia: 2,
  /** Relación altura de piso / longitud del muro mayor que la unidad (condición (d)). */
  relacionAlturaLongitudMuro: 1,
  reglas: {
    'A.3.3.8':
      'Debe asignarse un factor de reducción de resistencia por ausencia de redundancia en el sistema estructural de resistencia sísmica, φr, en las dos direcciones principales en planta de la siguiente manera:',
    'A.3.3.8.1':
      'En edificaciones con un sistema estructural con capacidad de disipación de energía mínima (DMI): para edificaciones cuyo sistema estructural de resistencia sísmica es de un material que cumple los requisitos de capacidad de disipación de energía mínima (DMI) el valor de φr se le asigna un valor de la unidad (φr = 1.0).',
    'A.3.3.8.2':
      'En edificaciones con un sistema estructural con capacidad de disipación de energía moderada (DMO) y especial (DES): φr se le puede asignar un valor de la unidad (φr = 1.0) cuando en todos los pisos que resistan más del 35 por ciento del corte basal en la dirección bajo estudio el sistema estructural de resistencia sísmica cumpla las condiciones de redundancia (a) a (e).',
    '(a)':
      'En sistemas compuestos por pórticos con arriostramientos concéntricos — La falla de cualquiera de las diagonales o sus conexiones al pórtico no resulta en una reducción de más del 33 por ciento de la resistencia ante fuerzas horizontales del piso ni produce una irregularidad torsional en planta extrema (Tipo 1bP).',
    '(b)':
      'En sistemas compuestos por pórticos con arriostramientos excéntricos — La pérdida de resistencia a momento (si se trata de vínculos a momento), o a cortante (para el caso de vínculos a corte), de los dos extremos de un vínculo no resulta en una reducción de más del 33 por ciento de la resistencia ante fuerzas horizontales del piso ni produce una irregularidad torsional en planta extrema (Tipo 1bP).',
    '(c)':
      'En sistemas de pórtico resistente a momentos — La pérdida de la resistencia a momento en la conexión viga-columna de los dos extremos de una viga no resulta en una reducción de más del 33 por ciento de la resistencia ante fuerzas horizontales del piso ni produce una irregularidad torsional en planta extrema (Tipo 1bP).',
    '(d)':
      'En sistemas con muros estructurales de concreto estructural — La falla de un muro estructural o de una porción de él que tengan una relación de la altura del piso a su longitud horizontal mayor de la unidad, o de los elementos colectores que lo conectan al diafragma, no resulta en una reducción de más del 33 por ciento de la resistencia ante fuerzas horizontales del piso ni produce una irregularidad torsional en planta extrema (Tipo 1bP).',
    '(e)': 'Para otros sistemas — No hay requisitos especiales.',
    incumplimiento:
      'En los sistemas estructurales que no cumplan las condiciones enunciadas en (a) a (d) el factor de reducción de resistencia por ausencia de redundancia en el sistema estructural de resistencia sísmica, φr, se le debe asignar un valor de φr = 0.75.',
    excepcionIncumplimiento:
      'Aunque no se cumplan las condiciones enunciadas en (a) a (d) el factor φr se le debe asignar un valor igual a la unidad (φr = 1.0) si todos los pisos que resistan más del 35 por ciento del corte basal en la dirección bajo estudio del sistema estructural de resistencia sísmica sean regulares en planta y tengan al menos dos vanos compuestos por elementos que sean parte del sistema de resistencia sísmica localizados en la periferia a ambos lados de la planta en las dos direcciones principales. Cuando se trate de muros estructurales para efectos de contar el número de vanos equivalentes se calcula como la longitud horizontal del muro dividida por la altura del piso.',
  },
} as const;

/** φr según A.3.3.8 (para los casos decididos por el calculista). */
export function phiRedundancia(
  capacidad: CapacidadDisipacion,
  cumpleCondicionesRedundancia: boolean,
  regularConDosVanosPeriferia = false,
): number {
  if (capacidad === 'DMI') return REDUNDANCIA.phiRRedundante;
  if (cumpleCondicionesRedundancia || regularConDosVanosPeriferia) return REDUNDANCIA.phiRRedundante;
  return REDUNDANCIA.phiRAusenciaRedundancia;
}
