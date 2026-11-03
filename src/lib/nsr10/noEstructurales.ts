import type { GrupoUso } from '../../data/tablas';
import type { ZonaAmenaza } from './zonaAmenaza';
import { G } from './fuerzaHorizontal';
import { aceleracionNivel, type ParametrosAceleracionNivel } from './elementosNoSismicos';

/**
 * Capítulo A.9 — Elementos no estructurales (NSR-10, PDF p.130-139, A-87 a A-96).
 * Tablas A.9.2-1, A.9.5-1 y A.9.6-1 transcritas y verificadas contra la imagen de la página.
 */

export type GradoDesempeno = 'Superior' | 'Bueno' | 'Bajo';

/** Tabla A.9.2-1 — Grado de desempeño mínimo requerido por grupo de uso (A-88). */
export const GRADO_MINIMO: Record<GrupoUso, GradoDesempeno> = {
  IV: 'Superior',
  III: 'Superior',
  II: 'Bueno',
  I: 'Bajo',
};

export function gradoMinimo(grupo: GrupoUso): GradoDesempeno {
  return GRADO_MINIMO[grupo];
}

/** A.9.1.3 — Exención: grupos de uso I y II en zona de amenaza sísmica baja. */
export function exentoPorA913(grupo: GrupoUso, zona: ZonaAmenaza): boolean {
  return zona === 'Baja' && (grupo === 'I' || grupo === 'II');
}

/** Tipos de anclaje de A.9.4.9 y valor de Rp asociado. */
export type TipoAnclaje = 'especiales' | 'ductiles' | 'no-ductiles' | 'humedos';

/** A.9.4.9.1 a A.9.4.9.4 — Rp según el tipo de anclaje (A-91). */
export const RP_ANCLAJE: Record<TipoAnclaje, number> = {
  especiales: 6,
  ductiles: 6,
  'no-ductiles': 1.5,
  humedos: 0.5,
};

/** Lo que pide una celda de las tablas A.9.5-1 y A.9.6-1 para un grado de desempeño. */
export type ExigenciaAnclaje = TipoAnclaje | 'no-requerido' | 'no-permitido';

export type NotaCelda = 1 | 2;

export type ElementoNoEstructural = {
  id: string;
  tabla: 'A.9.5-1' | 'A.9.6-1';
  nombre: string;
  /** Coeficiente de amplificación dinámica ap (componente horizontal). `null` = celda vacía en el PDF. */
  ap: number | null;
  superior: ExigenciaAnclaje;
  bueno: ExigenciaAnclaje;
  bajo: ExigenciaAnclaje;
  /** Nota (1) o (2) de la tabla A.9.5-1 en la celda del grado Bajo. */
  notaBajo?: NotaCelda;
};

const E = (
  id: string,
  tabla: 'A.9.5-1' | 'A.9.6-1',
  nombre: string,
  ap: number | null,
  superior: ExigenciaAnclaje,
  bueno: ExigenciaAnclaje,
  bajo: ExigenciaAnclaje,
  notaBajo?: NotaCelda,
): ElementoNoEstructural => ({ id, tabla, nombre, ap, superior, bueno, bajo, ...(notaBajo ? { notaBajo } : {}) });

const D = 'ductiles' as const;
const N = 'no-ductiles' as const;
const H = 'humedos' as const;
const NR = 'no-requerido' as const;
const NP = 'no-permitido' as const;

/** Tabla A.9.5-1 — Acabados y elementos arquitectónicos (A-93). */
export const ELEMENTOS_ARQUITECTONICOS: readonly ElementoNoEstructural[] = [
  E('fachada-paneles-prefabricados', 'A.9.5-1', 'Fachada: paneles prefabricados apoyados arriba y abajo', 1.0, D, N, N),
  E('fachada-vidrio', 'A.9.5-1', 'Fachada: en vidrio apoyadas arriba y abajo', 1.0, D, N, N),
  E('fachada-lamina-yeso', 'A.9.5-1', 'Fachada: lámina en yeso con costillas de acero', 1.0, N, N, N),
  E('fachada-mamp-reforzada-arriba-abajo', 'A.9.5-1', 'Fachada: mampostería reforzada, separada lateralmente, apoyada arriba y abajo', 1.0, D, N, N),
  E('fachada-mamp-reforzada-solo-abajo', 'A.9.5-1', 'Fachada: mampostería reforzada, separada lateralmente, apoyada solo abajo', 2.5, D, N, N),
  E('fachada-mamp-no-reforzada-arriba-abajo', 'A.9.5-1', 'Fachada: mampostería no reforzada, separada lateralmente, apoyada arriba y abajo', 1.0, NP, NP, N, 1),
  E('fachada-mamp-no-reforzada-solo-abajo', 'A.9.5-1', 'Fachada: mampostería no reforzada, separada lateralmente, apoyada solo abajo', 2.5, NP, NP, N, 1),
  E('fachada-mamp-no-reforzada-confinada', 'A.9.5-1', 'Fachada: mampostería no reforzada, confinada por la estructura', 1.0, NP, NP, N, 2),
  E('muros-puntos-fijos', 'A.9.5-1', 'Muros que encierran puntos fijos y ductos de escaleras, ascensores y otros', 1.0, D, N, H, 1),
  E('particion-corredores', 'A.9.5-1', 'Muros divisorios: corredores en áreas públicas', 1.0, D, N, H, 1),
  E('particion-altura-total', 'A.9.5-1', 'Muros divisorios de altura total', 1.0, N, N, H, 1),
  E('particion-altura-parcial', 'A.9.5-1', 'Muros divisorios de altura parcial', 2.5, N, N, H, 1),
  E('voladizo-parapetos', 'A.9.5-1', 'Elementos en voladizo vertical: áticos, parapetos y chimeneas', 2.5, D, N, N),
  E('enchapes-fachada', 'A.9.5-1', 'Anclaje de enchapes de fachada', 1.0, D, N, H),
  E('altillos', 'A.9.5-1', 'Altillos', 1.5, D, N, N),
  E('cielos-rasos', 'A.9.5-1', 'Cielos rasos', 1.0, N, N, NR),
  E('estanterias-titulo-f', 'A.9.5-1', 'Anaqueles, estanterías y bibliotecas de más de 2.50 m (diseñadas según Título F)', 2.5, 'especiales', D, NR),
  E('estanterias-otras', 'A.9.5-1', 'Anaqueles, estanterías y bibliotecas de más de 2.50 m (otras)', 2.5, D, N, NR),
  E('tejas', 'A.9.5-1', 'Tejas', 1.0, N, N, NR),
];

/**
 * Tabla A.9.6-1 — Elementos hidráulicos, mecánicos y eléctricos (A-95).
 * Anomalía del PDF: la celda ap de "Paneles de control y gabinetes eléctricos" está vacía (`null`).
 */
export const ELEMENTOS_INSTALACIONES: readonly ElementoNoEstructural[] = [
  E('proteccion-fuego', 'A.9.6-1', 'Sistemas de protección contra el fuego', 2.5, D, N, N),
  E('plantas-emergencia', 'A.9.6-1', 'Plantas eléctricas de emergencia', 1.0, N, N, NR),
  E('maquinaria-ascensores', 'A.9.6-1', 'Maquinaria de ascensores, guías y rieles del ascensor y del contrapeso', 1.0, D, N, NR),
  E('equipo-general', 'A.9.6-1', 'Equipo en general: calderas, comunicación, ductos eléctricos, equipo eléctrico, bombas, tanques, empates con redes', 1.0, D, N, NR),
  E('maquinaria-industrial', 'A.9.6-1', 'Maquinaria de producción industrial', 1.0, D, N, H),
  E('tuberias-gases', 'A.9.6-1', 'Tuberías de gases y combustibles', 2.5, D, N, N),
  E('tuberias-incendio', 'A.9.6-1', 'Tuberías del sistema contra incendio', 2.5, D, N, N),
  E('tuberias-otras', 'A.9.6-1', 'Otros sistemas de tuberías', 2.5, N, NR, NR),
  E('hvac', 'A.9.6-1', 'Aire acondicionado, calefacción y ventilación, y sus ductos', 1.0, D, N, NR),
  E('paneles-control', 'A.9.6-1', 'Paneles de control y gabinetes eléctricos', null, N, N, NR),
  E('luminarias', 'A.9.6-1', 'Luminarias y sistemas de iluminación', 1.0, N, N, NR),
];

export const ELEMENTOS_NO_ESTRUCTURALES: readonly ElementoNoEstructural[] = [
  ...ELEMENTOS_ARQUITECTONICOS,
  ...ELEMENTOS_INSTALACIONES,
];

export function elementoNoEstructural(id: string): ElementoNoEstructural {
  const el = ELEMENTOS_NO_ESTRUCTURALES.find((e) => e.id === id);
  if (!el) throw new Error(`Elemento no estructural desconocido: ${id}`);
  return el;
}

/** Exigencia de la celda (elemento × grado de desempeño). */
export function exigenciaAnclaje(el: ElementoNoEstructural, grado: GradoDesempeno): ExigenciaAnclaje {
  return grado === 'Superior' ? el.superior : grado === 'Bueno' ? el.bueno : el.bajo;
}

/**
 * Rp mínimo requerido para el elemento y el grado (anclaje de la celda → A.9.4.9).
 * `null` si no se requiere diseño sísmico ("No requerido") o si el elemento no se permite en ese grado.
 */
export function rpRequerido(el: ElementoNoEstructural, grado: GradoDesempeno): number | null {
  const x = exigenciaAnclaje(el, grado);
  if (x === 'no-requerido' || x === 'no-permitido') return null;
  return RP_ANCLAJE[x];
}

export type ParametrosFuerzaNoEstructural = ParametrosAceleracionNivel & {
  /** Aa de la zona (A.2.2). */
  aa: number;
  /** Coeficiente de importancia (A.2.5). */
  i: number;
  /** Altura del punto de soporte hx (m). */
  hx: number;
  ap: number;
  rp: number;
  /** Masa del elemento (kg). */
  mp: number;
};

export type ResultadoFuerzaNoEstructural = {
  /** ax como fracción de g (A.9.4-2). */
  ax: number;
  /** Fp calculada con ax·ap/Rp, en N (primer miembro de A.9.4-1). */
  fpCalculada: number;
  /** Cota mínima Aa·I/2·g·Mp, en N (segundo miembro de A.9.4-1). */
  fpMinima: number;
  /** Fp de diseño = máx(calculada, mínima), en N. */
  fp: number;
  /** `true` si gobierna la cota mínima. */
  gobiernaMinima: boolean;
  /** Fuerza vertical adicional ±(1/3)·peso para equipo mecánico y eléctrico (A.9.4.4), en N. */
  fuerzaVertical: number;
};

/**
 * A.9.4-1 — Fp = (ax·ap/Rp)·g·Mp ≥ (Aa·I/2)·g·Mp, con ax de A.9.4-2.
 * Para elementos en la base, por debajo de ella o fuera de la estructura ax = Aa·I (A.9.4.8):
 * use `fuerzaNoEstructuralConAx` pasando ese valor.
 */
export function fuerzaNoEstructural(p: ParametrosFuerzaNoEstructural): ResultadoFuerzaNoEstructural {
  return fuerzaNoEstructuralConAx(aceleracionNivel(p.hx, p), p);
}

/** Igual que `fuerzaNoEstructural` pero con `ax` dado (p. ej. ax = Aa·I según A.9.4.8). */
export function fuerzaNoEstructuralConAx(
  ax: number,
  p: Pick<ParametrosFuerzaNoEstructural, 'aa' | 'i' | 'ap' | 'rp' | 'mp'>,
): ResultadoFuerzaNoEstructural {
  const peso = G * p.mp;
  const fpCalculada = ((ax * p.ap) / p.rp) * peso;
  const fpMinima = ((p.aa * p.i) / 2) * peso;
  return {
    ax,
    fpCalculada,
    fpMinima,
    fp: Math.max(fpCalculada, fpMinima),
    gobiernaMinima: fpMinima > fpCalculada,
    fuerzaVertical: peso / 3,
  };
}

/** A.9.4.8 — ax = Aa·I para elementos en la base, por debajo de ella o fuera de la estructura. */
export function axEnBase(aa: number, i: number): number {
  return aa * i;
}

/** A.9.4.7 — Con esfuerzos de trabajo la fuerza E se multiplica por 0.7. */
export function fuerzaEsfuerzosTrabajo(e: number): number {
  return 0.7 * e;
}

export type FuerzasConexionFachada = {
  /** Elemento de conexión en sí: 1.33·Fp (A.9.4.10). */
  elementoConexion: number;
  /** Pernos, tornillos, soldaduras y espigos del sistema de conexión: 3.0·Fp (A.9.4.10). */
  sujetadores: number;
};

/** A.9.4.10 — Fuerzas de diseño de la conexión de fachadas (en las mismas unidades que `fp`). */
export function fuerzasConexionFachada(fp: number): FuerzasConexionFachada {
  return { elementoConexion: 1.33 * fp, sujetadores: 3.0 * fp };
}

/**
 * A.9.5.4 — ¿Gobierna el viento sobre un muro de fachada? Si el viento (positivo o negativo)
 * supera 0.7·Fp se usa el viento y los anclajes se diseñan para 1.4 veces la fuerza de viento.
 */
export function gobiernaVientoFachada(
  fuerzaViento: number,
  fp: number,
): { gobierna: boolean; fuerzaAnclajes: number } {
  const gobierna = fuerzaViento > 0.7 * fp;
  return { gobierna, fuerzaAnclajes: gobierna ? 1.4 * fuerzaViento : fp };
}
