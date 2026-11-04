/**
 * Cargas muertas del Capítulo B.3 de la NSR-10, transcritas del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página de la norma "B-n" = página PDF n + 219.
 * Cada tabla se transcribió contra la imagen de la página (el texto extraído del PDF sale desordenado).
 *
 *   Tabla B.3.2-1     masas de los materiales ............. PDF p.228 (B-9)
 *   Tabla B.3.4.1-1   cielo raso ........................... PDF p.229 (B-10)
 *   Tabla B.3.4.1-2   relleno de pisos ..................... PDF p.229 (B-10)
 *   Tabla B.3.4.1-3   pisos y acabados ..................... PDF p.230 (B-11)
 *   Tabla B.3.4.1-4   cubiertas ............................ PDF p.230 (B-11)
 *   Tabla B.3.4.2-1   recubrimiento de muros ............... PDF p.231 (B-12)
 *   Tabla B.3.4.2-2   particiones livianas ................. PDF p.231 (B-12)
 *   Tabla B.3.4.2-3   enchapes ............................. PDF p.231 (B-12)
 *   Tabla B.3.4.2-4   muros (mampostería y paneles) ........ PDF p.232 (B-13)
 *   Tabla B.3.4.2-5   ventanas .............................. PDF p.232 (B-13)
 *   Tabla B.3.4.3-1   valores mínimos alternativos ......... PDF p.233 (B-14)
 *
 * Convenciones:
 *  - Las tablas B.3.4.x dan cada valor en dos unidades: kN/m² y kgf/m². En la norma las dos columnas
 *    se relacionan SIEMPRE con kgf = 100 · kN (se redondea g a 10 m/s²; el factor exacto sería 101.97).
 *  - `tipo: 'fijo'`: el valor es por m² (de planta en las tablas B.3.4.1, de superficie vertical en las
 *    B.3.4.2). `tipo: 'por-espesor'`: kN/m² POR MILÍMETRO de espesor (y kgf/m² por centímetro de espesor).
 *  - Los componentes verticales (B.3.4.2) se multiplican por la altura del elemento en m para obtener
 *    carga distribuida en kN/m.
 *  - Las densidades de la Tabla B.3.2-1 están en kg/m³; multiplicadas por g = 9.8 m/s² dan N/m³.
 */

// ---------------------------------------------------------------------------------------------
// Tabla B.3.2-1 — Masas de los materiales (PDF p.228, B-9)
// ---------------------------------------------------------------------------------------------

export interface MaterialDensidad {
  id: string;
  /** Agrupación tal como aparece en la tabla (p. ej. "Agua", "Tierra"); undefined si va suelto. */
  grupo?: string;
  material: string;
  /** Densidad de masa en kg/m³ (si la tabla da un rango, el valor mínimo). */
  densidad: number;
  /** Máximo del rango cuando la tabla da un rango (solo "Madera seca": 450-750). */
  densidadMax?: number;
}

/** Aceleración de la gravedad que usa B.3.2 para pasar de masa a peso (m/s²). */
export const G_B32 = 9.8;

export const MATERIALES: readonly MaterialDensidad[] = [
  // --- Columna izquierda de la tabla ---
  { id: 'acero', material: 'Acero', densidad: 7800 },
  { id: 'agua-dulce', grupo: 'Agua', material: 'Dulce', densidad: 1000 },
  { id: 'agua-marina', grupo: 'Agua', material: 'Marina', densidad: 1030 },
  { id: 'aluminio', material: 'Aluminio', densidad: 2700 },
  { id: 'arena-limpia-seca', grupo: 'Arena', material: 'Limpia y seca', densidad: 1440 },
  { id: 'arena-seca-rio', grupo: 'Arena', material: 'Seca de río', densidad: 1700 },
  { id: 'baldosa-ceramica', material: 'Baldosa cerámica', densidad: 2400 },
  { id: 'bronce', material: 'Bronce', densidad: 8850 },
  { id: 'cal-hidratada-suelta', grupo: 'Cal', material: 'Hidratada suelta', densidad: 500 },
  { id: 'cal-hidratada-compacta', grupo: 'Cal', material: 'Hidratada compacta', densidad: 730 },
  { id: 'carbon-apilado', material: 'Carbón, apilado', densidad: 800 },
  { id: 'carbon-vegetal', material: 'Carbón vegetal', densidad: 200 },
  { id: 'cemento-portland', material: 'Cemento pórtland, a granel', densidad: 1440 },
  { id: 'cobre', material: 'Cobre', densidad: 9000 },
  { id: 'concreto-simple', material: 'Concreto simple', densidad: 2300 },
  { id: 'concreto-reforzado', material: 'Concreto reforzado', densidad: 2400 },
  { id: 'corcho-comprimido', material: 'Corcho, comprimido', densidad: 250 },
  { id: 'estano', material: 'Estaño', densidad: 7360 },
  { id: 'grava-seca', material: 'Grava seca', densidad: 1660 },
  { id: 'hielo', material: 'Hielo', densidad: 920 },
  { id: 'hierro-fundido', grupo: 'Hierro', material: 'Fundido', densidad: 7200 },
  { id: 'hierro-forjado', grupo: 'Hierro', material: 'Forjado', densidad: 7700 },
  { id: 'laton', material: 'Latón', densidad: 8430 },
  { id: 'madera-laminada', material: 'Madera laminada', densidad: 600 },
  { id: 'madera-seca', material: 'Madera seca', densidad: 450, densidadMax: 750 },
  { id: 'mamposteria-concreto', material: 'Mampostería de concreto', densidad: 2150 },
  { id: 'mamposteria-ladrillo-macizo', material: 'Mampostería de ladrillo macizo', densidad: 1850 },
  { id: 'mamposteria-piedra', material: 'Mampostería de piedra', densidad: 2200 },
  // --- Columna derecha de la tabla ---
  { id: 'mortero-inyeccion', material: 'Mortero de inyección para mampostería', densidad: 2250 },
  { id: 'mortero-pega', material: 'Mortero de pega para mampostería', densidad: 2100 },
  { id: 'piedra-caliza-marmol-cuarzo', grupo: 'Piedra', material: 'Caliza, mármol, cuarzo', densidad: 2700 },
  { id: 'piedra-basalto-granito-gneis', grupo: 'Piedra', material: 'Basalto, granito, gneis', densidad: 2850 },
  { id: 'piedra-arenisca', grupo: 'Piedra', material: 'Arenisca', densidad: 2200 },
  { id: 'piedra-pizarra', grupo: 'Piedra', material: 'Pizarra', densidad: 2600 },
  { id: 'plomo', material: 'Plomo', densidad: 11400 },
  { id: 'bit-asfalto-alquitran', grupo: 'Productos bituminosos', material: 'Asfalto y alquitrán', densidad: 1300 },
  { id: 'bit-gasolina', grupo: 'Productos bituminosos', material: 'Gasolina', densidad: 700 },
  { id: 'bit-grafito', grupo: 'Productos bituminosos', material: 'Grafito', densidad: 2160 },
  { id: 'bit-parafina', grupo: 'Productos bituminosos', material: 'Parafina', densidad: 900 },
  { id: 'bit-petroleo', grupo: 'Productos bituminosos', material: 'Petróleo', densidad: 850 },
  { id: 'relleno-ceniza', material: 'Relleno de ceniza', densidad: 920 },
  { id: 'tableros-madera-aglutinada', material: 'Tableros de madera aglutinada', densidad: 750 },
  { id: 'terracota-poros-saturados', grupo: 'Terracota', material: 'Poros saturados', densidad: 1950 },
  { id: 'terracota-poros-no-saturados', grupo: 'Terracota', material: 'Poros no saturados', densidad: 1150 },
  { id: 'tierra-arcilla-humeda', grupo: 'Tierra', material: 'Arcilla húmeda', densidad: 1750 },
  { id: 'tierra-arcilla-seca', grupo: 'Tierra', material: 'Arcilla seca', densidad: 1100 },
  { id: 'tierra-arcilla-grava-seca', grupo: 'Tierra', material: 'Arcilla y grava seca', densidad: 1600 },
  { id: 'tierra-arena-grava-humeda', grupo: 'Tierra', material: 'Arena y grava húmeda', densidad: 1900 },
  { id: 'tierra-arena-grava-seca-apisonada', grupo: 'Tierra', material: 'Arena y grava seca apisonada', densidad: 1750 },
  { id: 'tierra-arena-grava-seca-suelta', grupo: 'Tierra', material: 'Arena y grava seca suelta', densidad: 1600 },
  { id: 'tierra-limo-humedo-consolidado', grupo: 'Tierra', material: 'Limo húmedo consolidado', densidad: 1550 },
  { id: 'tierra-limo-humedo-suelto', grupo: 'Tierra', material: 'Limo húmedo suelto', densidad: 1250 },
  { id: 'vidrio', material: 'Vidrio', densidad: 2600 },
  { id: 'yeso-tableros-muros', material: 'Yeso en tableros para muros', densidad: 800 },
  { id: 'yeso-suelto', material: 'Yeso suelto', densidad: 1150 },
  { id: 'zinc-laminas', material: 'Zinc en láminas enrolladas', densidad: 7200 },
];

// ---------------------------------------------------------------------------------------------
// Tablas B.3.4.1-1 a B.3.4.2-5 — Cargas muertas mínimas de elementos no estructurales
// ---------------------------------------------------------------------------------------------

export type TablaComponente =
  | 'B.3.4.1-1'
  | 'B.3.4.1-2'
  | 'B.3.4.1-3'
  | 'B.3.4.1-4'
  | 'B.3.4.2-1'
  | 'B.3.4.2-2'
  | 'B.3.4.2-3'
  | 'B.3.4.2-4'
  | 'B.3.4.2-5';

export type Orientacion = 'horizontal' | 'vertical';

export interface ComponenteCarga {
  id: string;
  tabla: TablaComponente;
  /** Subtítulo de la tabla bajo el cual aparece la fila (p. ej. "Cubiertas aislantes"). */
  grupo?: string;
  componente: string;
  /** horizontal: kN/m² de área en planta · vertical: kN/m² de superficie vertical. */
  orientacion: Orientacion;
  tipo: 'fijo' | 'por-espesor';
  /** fijo: kN/m² · por-espesor: kN/m² por mm de espesor. */
  kN: number;
  /** fijo: kgf/m² · por-espesor: kgf/m² por cm de espesor (columna de kgf de la norma). */
  kgf: number;
}

/** Encabezados oficiales de cada tabla. */
export const TITULOS_TABLAS: Readonly<Record<TablaComponente | 'B.3.4.3-1', string>> = {
  'B.3.4.1-1': 'Cielo raso',
  'B.3.4.1-2': 'Relleno de pisos',
  'B.3.4.1-3': 'Pisos y acabados',
  'B.3.4.1-4': 'Cubiertas',
  'B.3.4.2-1': 'Recubrimiento de muros',
  'B.3.4.2-2': 'Particiones livianas',
  'B.3.4.2-3': 'Enchapes',
  'B.3.4.2-4': 'Muros',
  'B.3.4.2-5': 'Ventanas',
  'B.3.4.3-1': 'Valores mínimos alternativos',
};

const fijo = (id: string, tabla: TablaComponente, componente: string, kN: number, kgf: number, grupo?: string): ComponenteCarga => ({
  id,
  tabla,
  grupo,
  componente,
  orientacion: tabla.startsWith('B.3.4.1') ? 'horizontal' : 'vertical',
  tipo: 'fijo',
  kN,
  kgf,
});

const porEsp = (id: string, tabla: TablaComponente, componente: string, kNmm: number, kgfCm: number, grupo?: string): ComponenteCarga => ({
  id,
  tabla,
  grupo,
  componente,
  orientacion: tabla.startsWith('B.3.4.1') ? 'horizontal' : 'vertical',
  tipo: 'por-espesor',
  kN: kNmm,
  kgf: kgfCm,
});

/** Tabla B.3.4.1-1 — Cielo raso. PDF p.229 (B-10). Carga por m² de área en planta. */
export const CIELO_RASO: readonly ComponenteCarga[] = [
  fijo('cr-canales-acero', 'B.3.4.1-1', 'Canales suspendidas de acero', 0.1, 10),
  fijo('cr-ductos-mecanicos', 'B.3.4.1-1', 'Ductos mecánicos', 0.2, 20),
  fijo('cr-entramado-cemento', 'B.3.4.1-1', 'Entramado metálico suspendido afinado en cemento', 0.7, 70),
  fijo('cr-entramado-yeso', 'B.3.4.1-1', 'Entramado metálico suspendido afinado en yeso', 0.5, 50),
  fijo('cr-fibras-acusticas', 'B.3.4.1-1', 'Fibras acústicas', 0.1, 10),
  fijo('cr-panete-yeso-concreto', 'B.3.4.1-1', 'Pañete en yeso o concreto', 0.25, 25),
  fijo('cr-panete-madera', 'B.3.4.1-1', 'Pañete en entramado de madera', 0.8, 80),
  porEsp('cr-tableros-yeso', 'B.3.4.1-1', 'Tableros de yeso', 0.008, 8),
  fijo('cr-suspension-madera', 'B.3.4.1-1', 'Sistema de suspensión de madera', 0.15, 15),
];

/** Tabla B.3.4.1-2 — Relleno de pisos. PDF p.229 (B-10). */
export const RELLENO_PISO: readonly ComponenteCarga[] = [
  porEsp('rp-arena', 'B.3.4.1-2', 'Arena', 0.015, 15),
  porEsp('rp-concreto-escoria', 'B.3.4.1-2', 'Concreto con escoria', 0.02, 20),
  porEsp('rp-concreto-piedra', 'B.3.4.1-2', 'Concreto con piedra', 0.025, 25),
  porEsp('rp-concreto-ligero', 'B.3.4.1-2', 'Concreto ligero', 0.015, 15),
];

/** Tabla B.3.4.1-3 — Pisos y acabados. PDF p.230 (B-11). */
export const PISOS: readonly ComponenteCarga[] = [
  porEsp('pi-acabado-concreto', 'B.3.4.1-3', 'Acabado de piso en concreto', 0.02, 20),
  fijo('pi-afinado-25-agregado-petreo', 'B.3.4.1-3', 'Afinado (25 mm) sobre concreto de agregado pétreo', 1.5, 150),
  fijo('pi-baldosa-20-mortero-12', 'B.3.4.1-3', 'Baldosa cerámica (20 mm) sobre 12 mm de mortero', 0.8, 80),
  fijo('pi-baldosa-20-mortero-25', 'B.3.4.1-3', 'Baldosa cerámica (20 mm) sobre 25 mm de mortero', 1.1, 110),
  fijo('pi-baldosa-mortero-25', 'B.3.4.1-3', 'Baldosa sobre 25 mm de mortero', 1.1, 110),
  fijo('pi-bloque-asfalto-50', 'B.3.4.1-3', 'Bloque de asfalto (50 mm), sobre 12 mm de mortero', 1.5, 150),
  fijo('pi-bloque-madera-75-sin-relleno', 'B.3.4.1-3', 'Bloque de madera (75 mm) sin relleno', 0.5, 50),
  fijo('pi-bloque-madera-75-mortero-12', 'B.3.4.1-3', 'Bloque de madera (75 mm) sobre 12 mm de mortero', 0.8, 80),
  fijo('pi-durmientes-madera-20', 'B.3.4.1-3', 'Durmientes de madera, 20 mm', 0.15, 15),
  fijo('pi-madera-densa-25', 'B.3.4.1-3', 'Madera densa, 25 mm', 0.2, 20),
  fijo('pi-marmol-mortero', 'B.3.4.1-3', 'Mármol y mortero sobre concreto de agregado pétreo', 1.6, 160),
  fijo('pi-asfaltico-linoleo-6', 'B.3.4.1-3', 'Piso asfáltico o linóleo, 6 mm', 0.05, 5),
  porEsp('pi-pizarra', 'B.3.4.1-3', 'Pizarra', 0.03, 30),
  fijo('pi-terrazzo-25-concreto-50', 'B.3.4.1-3', 'Terrazzo (25 mm), concreto 50 mm', 1.5, 150),
  fijo('pi-terrazzo-40-losa', 'B.3.4.1-3', 'Terrazzo (40 mm) directamente sobre la losa', 0.9, 90),
  fijo('pi-terrazzo-25-afinado', 'B.3.4.1-3', 'Terrazzo (25 mm) sobre afinado en concreto', 1.5, 150),
];

/** Tabla B.3.4.1-4 — Cubiertas. PDF p.230 (B-11). */
export const CUBIERTAS: readonly ComponenteCarga[] = [
  fijo('cu-cobre-laton', 'B.3.4.1-4', 'Cobre o latón', 0.05, 5),
  porEsp('cu-aislante-fibra-vidrio', 'B.3.4.1-4', 'Fibra de vidrio', 0.002, 2.0, 'Cubiertas aislantes'),
  porEsp('cu-aislante-tableros-fibra', 'B.3.4.1-4', 'Tableros de fibra', 0.003, 3.0, 'Cubiertas aislantes'),
  porEsp('cu-aislante-perlita', 'B.3.4.1-4', 'Perlita', 0.0015, 1.5, 'Cubiertas aislantes'),
  porEsp('cu-aislante-poliestireno', 'B.3.4.1-4', 'Espuma de poliestireno', 0.0005, 0.5, 'Cubiertas aislantes'),
  porEsp('cu-aislante-poliuretano', 'B.3.4.1-4', 'Espuma de poliuretano', 0.001, 1.0, 'Cubiertas aislantes'),
  fijo('cu-corrugada-asbesto-cemento', 'B.3.4.1-4', 'Cubiertas corrugadas de asbesto-cemento', 0.2, 20),
  porEsp('cu-entablado-madera', 'B.3.4.1-4', 'Entablado de madera', 0.006, 6.0),
  fijo('cu-laminas-yeso-12', 'B.3.4.1-4', 'Láminas de yeso, 12 mm', 0.1, 10),
  porEsp('cu-madera-laminada', 'B.3.4.1-4', 'Madera laminada (según el espesor)', 0.01, 10.0),
  fijo('cu-membrana-bituminosa-grava', 'B.3.4.1-4', 'Bituminosa, cubierta de grava', 0.25, 25, 'Membranas impermeables'),
  fijo('cu-membrana-bituminosa-lisa', 'B.3.4.1-4', 'Bituminosa, superficie lisa', 0.1, 10, 'Membranas impermeables'),
  fijo('cu-membrana-liquido', 'B.3.4.1-4', 'Líquido aplicado', 0.05, 5, 'Membranas impermeables'),
  fijo('cu-membrana-tela-asfaltica', 'B.3.4.1-4', 'Tela asfáltica de una capa', 0.03, 3, 'Membranas impermeables'),
  fijo('cu-marquesinas-vidrio-10', 'B.3.4.1-4', 'Marquesinas, marco metálico, vidrio de 10 mm', 0.4, 40),
  fijo('cu-tableros-fibra-12', 'B.3.4.1-4', 'Tableros de fibra, 12 mm', 0.05, 5),
  fijo('cu-tableros-madera-50', 'B.3.4.1-4', 'Tableros de madera, 50 mm', 0.25, 25),
  fijo('cu-tableros-madera-75', 'B.3.4.1-4', 'Tableros de madera, 75 mm', 0.4, 40),
  fijo('cu-tablero-metalico-cal20', 'B.3.4.1-4', 'Tablero metálico, calibre 20 (0.9 mm de espesor nominal)', 0.08, 8),
  fijo('cu-tablero-metalico-cal18', 'B.3.4.1-4', 'Tablero metálico, calibre 18 (1.2 mm de espesor nominal)', 0.08, 8),
  fijo('cu-tablillas-asbesto-cemento', 'B.3.4.1-4', 'Tablillas (shingles) de asbesto-cemento', 0.2, 20),
  fijo('cu-tablillas-asfalto', 'B.3.4.1-4', 'Tablillas (shingles) de asfalto', 0.1, 10),
  fijo('cu-tablillas-madera', 'B.3.4.1-4', 'Tablillas (shingles) de madera', 0.15, 15),
  fijo('cu-teja-arcilla', 'B.3.4.1-4', 'Teja de arcilla, incluyendo el mortero', 0.8, 80),
];

/** Tabla B.3.4.2-1 — Recubrimiento de muros. PDF p.231 (B-12). Carga por m² de superficie vertical. */
export const RECUBRIMIENTO_MUROS: readonly ComponenteCarga[] = [
  fijo('rm-baldosin-cemento', 'B.3.4.2-1', 'Baldosín de cemento', 0.8, 80),
  porEsp('rm-entablado-madera', 'B.3.4.2-1', 'Entablado de madera', 0.006, 6.0),
  porEsp('rm-madera-laminada', 'B.3.4.2-1', 'Madera laminada (según el espesor)', 0.01, 10.0),
  porEsp('rm-aislante-poliestireno', 'B.3.4.2-1', 'Espuma de poliestireno', 0.0005, 0.5, 'Tableros aislantes para muros'),
  porEsp('rm-aislante-poliuretano', 'B.3.4.2-1', 'Espuma de poliuretano', 0.001, 1.0, 'Tableros aislantes para muros'),
  porEsp('rm-aislante-fibra-acrilico', 'B.3.4.2-1', 'Fibra o acrílico', 0.002, 2.0, 'Tableros aislantes para muros'),
  porEsp('rm-aislante-perlita', 'B.3.4.2-1', 'Perlita', 0.0015, 1.5, 'Tableros aislantes para muros'),
  porEsp('rm-aislante-tableros-fibra', 'B.3.4.2-1', 'Tableros de fibra', 0.003, 3.0, 'Tableros aislantes para muros'),
  fijo('rm-tableros-fibra-12', 'B.3.4.2-1', 'Tableros de fibra, 12 mm', 0.05, 5),
  fijo('rm-tableros-yeso-12', 'B.3.4.2-1', 'Tableros de yeso, 12 mm', 0.1, 10),
];

/** Tabla B.3.4.2-2 — Particiones livianas. PDF p.231 (B-12). */
export const PARTICIONES_LIVIANAS: readonly ComponenteCarga[] = [
  fijo('pl-moviles-acero-parcial', 'B.3.4.2-2', 'Particiones móviles de acero (altura parcial)', 0.5, 50),
  fijo('pl-moviles-acero-total', 'B.3.4.2-2', 'Particiones móviles de acero (altura total)', 0.2, 20),
  fijo('pl-poste-yeso-12-ambos-lados', 'B.3.4.2-2', 'Poste en madera o acero, yeso de 12 mm a cada lado', 0.9, 90),
  fijo('pl-poste-madera-sin-panetar', 'B.3.4.2-2', 'Poste en madera, 50 x 100, sin pañetar', 0.3, 30),
  fijo('pl-poste-madera-panete-un-lado', 'B.3.4.2-2', 'Poste en madera, 50 x 100, pañete por un lado', 0.6, 60),
  fijo('pl-poste-madera-panete-ambos-lados', 'B.3.4.2-2', 'Poste en madera, 50 x 100, pañete por ambos lados', 2.0, 200),
];

/** Tabla B.3.4.2-3 — Enchapes. PDF p.231 (B-12). */
export const ENCHAPES: readonly ComponenteCarga[] = [
  porEsp('en-ceramico', 'B.3.4.2-3', 'Enchape cerámico', 0.015, 15),
  porEsp('en-arenisca', 'B.3.4.2-3', 'Enchape en arenisca', 0.013, 13),
  porEsp('en-caliza', 'B.3.4.2-3', 'Enchape en caliza', 0.015, 15),
  porEsp('en-granito', 'B.3.4.2-3', 'Enchape en granito', 0.017, 17),
];

/** Tabla B.3.4.2-5 — Ventanas. PDF p.232 (B-13). */
export const VENTANAS: readonly ComponenteCarga[] = [
  fijo('ve-muro-cortina', 'B.3.4.2-5', 'Muros cortina de vidrio, entramado y marco', 0.5, 50),
  fijo('ve-ventanas', 'B.3.4.2-5', 'Ventanas, vidrio, entramado y marco', 0.45, 45),
];

// ---------------------------------------------------------------------------------------------
// Tabla B.3.4.2-4 — Muros (PDF p.232, B-13)
// ---------------------------------------------------------------------------------------------

/** Muros de paneles (postes de acero o madera): valor único por m² de superficie vertical. */
export const MUROS_PANELES: readonly ComponenteCarga[] = [
  fijo('mu-panel-yeso-15', 'B.3.4.2-4', 'Yeso de 15 mm, aislado, entablado de 10 mm', 1.0, 100, 'Exteriores de paneles (postes de acero o madera)'),
  fijo('mu-panel-enchape-ladrillo', 'B.3.4.2-4', 'Exteriores con enchape en ladrillo', 2.5, 250, 'Exteriores de paneles (postes de acero o madera)'),
];

/** Espesores de muro (mm) de las columnas de la Tabla B.3.4.2-4. */
export const ESPESORES_MURO_MM = [100, 150, 200, 250, 300] as const;

export interface MuroMamposteria {
  id: string;
  tipo: 'bloque-arcilla' | 'bloque-concreto' | 'maciza-arcilla' | 'maciza-concreto';
  /** "Mampostería de bloque de arcilla", etc. */
  familia: string;
  /** "Pañetado en ambas caras", "Relleno cada 1.2 m", … */
  variante: string;
  /**
   * kN/m² de superficie vertical para cada espesor de `ESPESORES_MURO_MM` (100, 150, 200, 250, 300 mm);
   * `null` = la tabla deja la celda vacía (no hay valor para ese espesor).
   */
  kN: readonly (number | null)[];
  /** kgf/m² (columna de kgf de la norma) con los mismos índices. */
  kgf: readonly (number | null)[];
}

const muro = (
  id: string,
  tipo: MuroMamposteria['tipo'],
  familia: string,
  variante: string,
  kN: readonly (number | null)[],
): MuroMamposteria => ({
  id,
  tipo,
  familia,
  variante,
  kN,
  // En la norma la columna de kgf es exactamente 100 · kN (ver encabezado del archivo).
  kgf: kN.map((v) => (v === null ? null : Math.round(v * 100))),
});

/** Mampostería de la Tabla B.3.4.2-4 (espesor del muro en mm: 100, 150, 200, 250, 300). */
export const MUROS_MAMPOSTERIA: readonly MuroMamposteria[] = [
  muro('mb-arcilla-panetado', 'bloque-arcilla', 'Mampostería de bloque de arcilla', 'Pañetado en ambas caras', [1.8, 2.5, 3.1, 3.8, 4.4]),
  muro('mb-arcilla-sin-panetar', 'bloque-arcilla', 'Mampostería de bloque de arcilla', 'Sin pañetar', [1.3, 2.0, 2.6, 3.3, 3.9]),
  muro('mb-concreto-sin-relleno', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Sin relleno', [1.4, 1.45, 1.9, 2.25, 2.6]),
  muro('mb-concreto-relleno-1.2', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Relleno cada 1.2 m', [null, 1.7, 2.25, 2.7, 3.15]),
  muro('mb-concreto-relleno-1.0', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Relleno cada 1.0 m', [null, 1.8, 2.3, 2.8, 3.3]),
  muro('mb-concreto-relleno-0.8', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Relleno cada 0.8 m', [null, 1.8, 2.4, 3.0, 3.45]),
  muro('mb-concreto-relleno-0.6', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Relleno cada 0.6 m', [null, 2.0, 2.6, 3.2, 3.75]),
  muro('mb-concreto-relleno-0.4', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Relleno cada 0.4 m', [null, 2.2, 2.9, 3.6, 4.3]),
  muro('mb-concreto-celdas-llenas', 'bloque-concreto', 'Mampostería de bloque de concreto', 'Todas las celdas llenas', [null, 3.0, 4.0, 5.0, 6.1]),
  muro('mm-arcilla-sin-panetar', 'maciza-arcilla', 'Mampostería maciza de arcilla', 'Sin pañetar', [1.9, 2.9, 3.8, 4.7, 5.5]),
  muro('mm-concreto-sin-panetar', 'maciza-concreto', 'Mampostería maciza de concreto', 'Sin pañetar', [2.0, 3.1, 4.2, 5.3, 6.4]),
];

// ---------------------------------------------------------------------------------------------
// Tabla B.3.4.3-1 — Valores mínimos alternativos (PDF p.233, B-14)
// ---------------------------------------------------------------------------------------------

export interface ValorAlternativo {
  id: string;
  /** Tipo de ocupación (primera columna): "Reunión", "Oficinas", … */
  ocupacion: string;
  /** Descripción de la segunda columna. */
  descripcion: string;
  /** Fachada y particiones, kN/m² de área en planta. */
  fachadaParticionesKN: number;
  /** Afinado de piso y cubierta, kN/m² de área en planta. */
  afinadoKN: number;
  /** Fachada y particiones, kgf/m² de área en planta. */
  fachadaParticionesKgf: number;
  /** Afinado de piso y cubierta, kgf/m² de área en planta. */
  afinadoKgf: number;
}

const alt = (
  id: string,
  ocupacion: string,
  descripcion: string,
  fpKN: number,
  afKN: number,
  fpKgf: number,
  afKgf: number,
): ValorAlternativo => ({
  id,
  ocupacion,
  descripcion,
  fachadaParticionesKN: fpKN,
  afinadoKN: afKN,
  fachadaParticionesKgf: fpKgf,
  afinadoKgf: afKgf,
});

/** Altura entre pisos terminados por debajo de la cual se permiten los valores alternativos (B.3.4.3), en m. */
export const ALTURA_MAX_VALORES_ALTERNATIVOS_M = 3;

export const VALORES_ALTERNATIVOS: readonly ValorAlternativo[] = [
  alt('va-reunion-salon', 'Reunión', 'Edificaciones con un salón de reunión para menos de 100 personas y sin escenarios', 1.0, 1.8, 100, 180),
  alt('va-oficinas-moviles', 'Oficinas', 'Particiones móviles de altura total', 1.0, 1.8, 100, 180),
  alt('va-oficinas-fijas', 'Oficinas', 'Particiones fijas de mampostería', 2.0, 1.8, 200, 180),
  alt('va-educativos-salones', 'Educativos', 'Salones de clase', 2.0, 1.5, 200, 150),
  alt('va-fabricas-livianas', 'Fábricas', 'Industrias livianas', 0.8, 1.6, 80, 160),
  alt('va-institucional-internados', 'Institucional', 'Internados con atención a los residentes', 2.0, 1.6, 200, 160),
  alt('va-institucional-prisiones', 'Institucional', 'Prisiones, cárceles, reformatorios y centros de detención', 2.5, 1.8, 250, 180),
  alt('va-institucional-guarderias', 'Institucional', 'Guarderías', 2.0, 1.6, 200, 160),
  alt('va-comercio-exhibicion', 'Comercio', 'Exhibición y venta de mercancías', 1.5, 1.4, 150, 140),
  alt('va-residencial-mamposteria', 'Residencial', 'Fachada y particiones de mampostería', 3.0, 1.6, 300, 160),
  alt('va-residencial-livianas', 'Residencial', 'Fachada y particiones livianas', 2.0, 1.4, 200, 140),
  alt('va-almacenamiento-livianos', 'Almacenamiento', 'Almacenamiento de materiales livianos', 1.5, 1.5, 150, 150),
  alt('va-garajes-2000', 'Garajes', 'Garajes para vehículos con capacidad de hasta 2000 kg', 0.2, 1.0, 20, 100),
];

// ---------------------------------------------------------------------------------------------
// Utilidades de acceso
// ---------------------------------------------------------------------------------------------

/** Todos los componentes de las tablas con valor único o por espesor (sin la matriz de mampostería). */
export const COMPONENTES: readonly ComponenteCarga[] = [
  ...CIELO_RASO,
  ...RELLENO_PISO,
  ...PISOS,
  ...CUBIERTAS,
  ...RECUBRIMIENTO_MUROS,
  ...PARTICIONES_LIVIANAS,
  ...ENCHAPES,
  ...MUROS_PANELES,
  ...VENTANAS,
];

export function buscarComponente(id: string): ComponenteCarga | undefined {
  return COMPONENTES.find((c) => c.id === id);
}

export function buscarMaterial(id: string): MaterialDensidad | undefined {
  return MATERIALES.find((m) => m.id === id);
}

export function buscarMuro(id: string): MuroMamposteria | undefined {
  return MUROS_MAMPOSTERIA.find((m) => m.id === id);
}

export function buscarValorAlternativo(id: string): ValorAlternativo | undefined {
  return VALORES_ALTERNATIVOS.find((v) => v.id === id);
}
