/**
 * Materiales del concreto estructural — Capítulo C.3 de la NSR-10, transcrito del PDF
 * (Norma/Norma-Sismo-Resistente-NSR-10.pdf). Página PDF = página impresa "C-n" + 302.
 * Las tablas se transcribieron contra la imagen de la página.
 *
 *   Tabla C.3.5.3-1   barras de refuerzo, diámetros en mm ......... PDF p.329 (C-27)
 *   Tabla C.3.5.3-2   barras de refuerzo, octavos de pulgada ....... PDF p.329 (C-27)
 *   Normas por material (C.3.2 a C.3.6) ............................ PDF p.327-332 (C-25 a C-30)
 *   Normas NTC citadas (C.3.8.1) ................................... PDF p.332-334 (C-30 a C-32)
 *   Normas ASTM sin NTC equivalente (C.3.8.1) ...................... PDF p.334-335 (C-32 a C-33)
 */

// ---------------------------------------------------------------------------------------------
// Tabla C.3.5.3-1 — Dimensiones nominales de las barras (diámetros en mm). PDF p.329 (C-27)
// ---------------------------------------------------------------------------------------------

export interface BarraMetrica {
  /** Designación, p. ej. "10M" (la M indica diámetro nominal en mm). */
  designacion: string;
  /** Diámetro nominal (mm). */
  diametro: number;
  /** Área nominal (mm²). */
  area: number;
  /** Perímetro nominal (mm). */
  perimetro: number;
  /** Masa por metro (kg/m). */
  masa: number;
}

export const BARRAS_METRICAS: readonly BarraMetrica[] = [
  { designacion: '6M', diametro: 6.0, area: 28.3, perimetro: 18.85, masa: 0.222 },
  { designacion: '8M', diametro: 8.0, area: 50.3, perimetro: 25.14, masa: 0.394 },
  { designacion: '10M', diametro: 10.0, area: 78.5, perimetro: 31.42, masa: 0.616 },
  { designacion: '12M', diametro: 12.0, area: 113.1, perimetro: 37.7, masa: 0.887 },
  { designacion: '16M', diametro: 16.0, area: 201.1, perimetro: 50.27, masa: 1.577 },
  { designacion: '18M', diametro: 18.0, area: 254.5, perimetro: 56.55, masa: 1.996 },
  { designacion: '20M', diametro: 20.0, area: 314.2, perimetro: 62.83, masa: 2.465 },
  { designacion: '22M', diametro: 22.0, area: 380.1, perimetro: 69.12, masa: 2.982 },
  { designacion: '25M', diametro: 25.0, area: 490.9, perimetro: 78.54, masa: 3.851 },
  { designacion: '30M', diametro: 30.0, area: 706.9, perimetro: 94.25, masa: 5.544 },
  { designacion: '32M', diametro: 32.0, area: 804.2, perimetro: 100.53, masa: 6.309 },
  { designacion: '36M', diametro: 36.0, area: 1017.9, perimetro: 113.1, masa: 7.985 },
  { designacion: '45M', diametro: 45.0, area: 1590.4, perimetro: 141.37, masa: 12.477 },
  { designacion: '55M', diametro: 55.0, area: 2375.8, perimetro: 172.79, masa: 18.638 },
];

// ---------------------------------------------------------------------------------------------
// Tabla C.3.5.3-2 — Dimensiones nominales de las barras (octavos de pulgada). PDF p.329 (C-27)
// ---------------------------------------------------------------------------------------------

export interface BarraPulgada {
  /** Designación, p. ej. "No. 4" (número de octavos de pulgada del diámetro de referencia). */
  designacion: string;
  /** Diámetro de referencia en pulgadas, tal como aparece en la tabla (texto). */
  diametroPulgadas: string;
  /** Diámetro nominal (mm). */
  diametro: number;
  /** Área nominal (mm²). */
  area: number;
  /** Perímetro nominal (mm). */
  perimetro: number;
  /** Masa por metro (kg/m). */
  masa: number;
}

export const BARRAS_PULGADA: readonly BarraPulgada[] = [
  { designacion: 'No. 2', diametroPulgadas: '1/4"', diametro: 6.4, area: 32, perimetro: 20.0, masa: 0.25 },
  { designacion: 'No. 3', diametroPulgadas: '3/8"', diametro: 9.5, area: 71, perimetro: 30.0, masa: 0.56 },
  { designacion: 'No. 4', diametroPulgadas: '1/2"', diametro: 12.7, area: 129, perimetro: 40.0, masa: 0.994 },
  { designacion: 'No. 5', diametroPulgadas: '5/8"', diametro: 15.9, area: 199, perimetro: 50.0, masa: 1.552 },
  { designacion: 'No. 6', diametroPulgadas: '3/4"', diametro: 19.1, area: 284, perimetro: 60.0, masa: 2.235 },
  { designacion: 'No. 7', diametroPulgadas: '7/8"', diametro: 22.2, area: 387, perimetro: 70.0, masa: 3.042 },
  { designacion: 'No. 8', diametroPulgadas: '1"', diametro: 25.4, area: 510, perimetro: 80.0, masa: 3.973 },
  { designacion: 'No. 9', diametroPulgadas: '1-1/8"', diametro: 28.7, area: 645, perimetro: 90.0, masa: 5.06 },
  { designacion: 'No. 10', diametroPulgadas: '1-1/4"', diametro: 32.3, area: 819, perimetro: 101.3, masa: 6.404 },
  { designacion: 'No. 11', diametroPulgadas: '1-3/8"', diametro: 35.8, area: 1006, perimetro: 112.5, masa: 7.907 },
  { designacion: 'No. 14', diametroPulgadas: '1-3/4"', diametro: 43.0, area: 1452, perimetro: 135.1, masa: 11.38 },
  { designacion: 'No. 18', diametroPulgadas: '2-1/4"', diametro: 57.3, area: 2581, perimetro: 180.1, masa: 20.24 },
];

/** Busca una barra métrica o de pulgada por su designación ("10M", "No. 4"). */
export function buscarBarra(designacion: string): BarraMetrica | BarraPulgada | undefined {
  return [...BARRAS_METRICAS, ...BARRAS_PULGADA].find((b) => b.designacion === designacion);
}

// ---------------------------------------------------------------------------------------------
// Normas por material (C.3.2 a C.3.6)
// ---------------------------------------------------------------------------------------------

export interface NormaMaterial {
  /** Numeral de la norma (p. ej. "C.3.2.1(b)"). */
  seccion: string;
  /** Página impresa de la norma. */
  pag: string;
  /** Familia de materiales. */
  familia: 'cementante' | 'agregado' | 'agua' | 'acero-refuerzo' | 'acero-preesfuerzo' | 'acero-estructural' | 'aditivo';
  /** Material o producto. */
  material: string;
  /** Norma NTC (ICONTEC), si el texto la cita. */
  ntc?: string;
  /** Norma extranjera equivalente (ASTM, AWS, BS), si la hay. */
  astm?: string;
  /** Observación del texto (exclusiones, condiciones). */
  nota?: string;
}

export const NORMAS_MATERIALES: readonly NormaMaterial[] = [
  // --- Materiales cementantes (C.3.2.1, PDF p.327, C-25) ---
  { seccion: 'C.3.2.1(a)', pag: 'C-25', familia: 'cementante', material: 'Cemento (pórtland)', ntc: 'NTC 121 y NTC 321', astm: 'ASTM C150', nota: 'También se permite el cemento fabricado bajo ASTM C150.' },
  { seccion: 'C.3.2.1(b)', pag: 'C-25', familia: 'cementante', material: 'Cementos hidráulicos adicionados', astm: 'ASTM C595', nota: 'Se excluyen los Tipos IS (≥70): no pueden ser el constituyente cementante principal del concreto estructural.' },
  { seccion: 'C.3.2.1(c)', pag: 'C-25', familia: 'cementante', material: 'Cemento hidráulico expansivo', ntc: 'NTC 4578', astm: 'ASTM C845' },
  { seccion: 'C.3.2.1(d)', pag: 'C-25', familia: 'cementante', material: 'Cemento hidráulico (por desempeño)', astm: 'ASTM C1157' },
  { seccion: 'C.3.2.1(e)', pag: 'C-25', familia: 'cementante', material: 'Ceniza volante, puzolana natural y materiales calcinados', ntc: 'NTC 3493', astm: 'ASTM C618' },
  { seccion: 'C.3.2.1(f)', pag: 'C-25', familia: 'cementante', material: 'Escoria granulada molida de alto horno', ntc: 'NTC 4018', astm: 'ASTM C989' },
  { seccion: 'C.3.2.1(g)', pag: 'C-25', familia: 'cementante', material: 'Humo de sílice', ntc: 'NTC 4637', astm: 'ASTM C1240' },
  { seccion: 'C.3.2.1(h)', pag: 'C-25', familia: 'cementante', material: 'Cemento blanco', ntc: 'NTC 1362' },
  // --- Agregados (C.3.3.1, PDF p.328, C-26) ---
  { seccion: 'C.3.3.1(a)', pag: 'C-26', familia: 'agregado', material: 'Agregado de peso normal', ntc: 'NTC 174', astm: 'ASTM C33' },
  { seccion: 'C.3.3.1(b)', pag: 'C-26', familia: 'agregado', material: 'Agregado liviano', ntc: 'NTC 4045', astm: 'ASTM C330' },
  // --- Agua (C.3.4.1, PDF p.328, C-26) ---
  { seccion: 'C.3.4.1', pag: 'C-26', familia: 'agua', material: 'Agua de mezclado', ntc: 'NTC 3459', astm: 'BS 3148 (o ASTM C1602M si es menos exigente que NTC 3459)' },
  // --- Acero de refuerzo (C.3.5, PDF p.328-331, C-26 a C-29) ---
  { seccion: 'C.3.5.2', pag: 'C-26', familia: 'acero-refuerzo', material: 'Soldadura de barras de refuerzo', ntc: 'NTC 4040', astm: 'AWS D1.4' },
  { seccion: 'C.3.5.3.1', pag: 'C-26', familia: 'acero-refuerzo', material: 'Barras corrugadas de acero de baja aleación', ntc: 'NTC 2289', astm: 'ASTM A706M' },
  { seccion: 'C.3.5.3.1', pag: 'C-26', familia: 'acero-refuerzo', material: 'Barras corrugadas de acero inoxidable (si además cumplen NTC 2289)', astm: 'ASTM A955M' },
  { seccion: 'C.3.5.3.3', pag: 'C-27', familia: 'acero-refuerzo', material: 'Barras de acero de bajo carbono y cromo (solo como refuerzo transversal en C.21.6.4 o espiral en C.10.9.3)', astm: 'ASTM A1035M' },
  { seccion: 'C.3.5.3.4', pag: 'C-27', familia: 'acero-refuerzo', material: 'Parrillas de refuerzo', ntc: 'NTC 2043', astm: 'ASTM A184M', nota: 'Sus barras deben cumplir NTC 2289 (ASTM A706M).' },
  { seccion: 'C.3.5.3.5', pag: 'C-28', familia: 'acero-refuerzo', material: 'Alambre corrugado (MD25 a MD200)', ntc: 'NTC 1907', astm: 'ASTM A496M' },
  { seccion: 'C.3.5.3.6', pag: 'C-28', familia: 'acero-refuerzo', material: 'Refuerzo electrosoldado de alambre liso', ntc: 'NTC 1925', astm: 'ASTM A185M' },
  { seccion: 'C.3.5.3.7', pag: 'C-28', familia: 'acero-refuerzo', material: 'Refuerzo electrosoldado de alambre corrugado', ntc: 'NTC 2310', astm: 'ASTM A497M' },
  { seccion: 'C.3.5.3.8', pag: 'C-28', familia: 'acero-refuerzo', material: 'Barras galvanizadas', ntc: 'NTC 4013', astm: 'ASTM A767M' },
  { seccion: 'C.3.5.3.8', pag: 'C-28', familia: 'acero-refuerzo', material: 'Barras con recubrimiento epóxico', ntc: 'NTC 4004', astm: 'ASTM A775M o ASTM A934M' },
  { seccion: 'C.3.5.3.9', pag: 'C-28', familia: 'acero-refuerzo', material: 'Alambres y refuerzo electrosoldado recubiertos con epóxico', astm: 'ASTM A884M' },
  { seccion: 'C.3.5.3.10', pag: 'C-28', familia: 'acero-refuerzo', material: 'Alambre y refuerzo electrosoldado de acero inoxidable (liso y corrugado)', astm: 'ASTM A1022M' },
  { seccion: 'C.3.5.4.1', pag: 'C-28', familia: 'acero-refuerzo', material: 'Refuerzo liso (solo estribos, retracción y temperatura o espiral; mallas electrosoldadas)', ntc: 'NTC 161', astm: 'ASTM A615M' },
  { seccion: 'C.3.5.4.2', pag: 'C-28', familia: 'acero-refuerzo', material: 'Alambre liso para refuerzo en espiral', ntc: 'NTC 4002', astm: 'ASTM A82M' },
  { seccion: 'C.3.5.5.1', pag: 'C-28', familia: 'acero-refuerzo', material: 'Pernos con cabeza para refuerzo de cortante', astm: 'ASTM A1044M' },
  { seccion: 'C.3.5.8', pag: 'C-29', familia: 'acero-refuerzo', material: 'Fibras de acero para concreto reforzado con fibras (l/d entre 50 y 100)', ntc: 'NTC 5214', astm: 'ASTM A820M' },
  { seccion: 'C.3.5.9', pag: 'C-29', familia: 'acero-refuerzo', material: 'Barras corrugadas con cabeza', astm: 'ASTM A970M' },
  // --- Acero de preesfuerzo (C.3.5.6.1, PDF p.330-331, C-28 y C-29) ---
  { seccion: 'C.3.5.6.1(a)', pag: 'C-29', familia: 'acero-preesfuerzo', material: 'Alambre', ntc: 'NTC 159', astm: 'ASTM A421M' },
  { seccion: 'C.3.5.6.1(b)', pag: 'C-29', familia: 'acero-preesfuerzo', material: 'Alambre de baja relajación', ntc: 'NTC 159', astm: 'ASTM A421M' },
  { seccion: 'C.3.5.6.1(c)', pag: 'C-29', familia: 'acero-preesfuerzo', material: 'Torón', ntc: 'NTC 2010', astm: 'ASTM A416M' },
  { seccion: 'C.3.5.6.1(d)', pag: 'C-29', familia: 'acero-preesfuerzo', material: 'Barras de alta resistencia', ntc: 'NTC 2142', astm: 'ASTM A722M' },
  // --- Acero estructural, tubos (C.3.5.7, PDF p.331, C-29) ---
  { seccion: 'C.3.5.7.1(a)', pag: 'C-29', familia: 'acero-estructural', material: 'Acero al carbón', ntc: 'NTC 1920', astm: 'ASTM A36M' },
  { seccion: 'C.3.5.7.1(b)', pag: 'C-29', familia: 'acero-estructural', material: 'Acero de alta resistencia y baja aleación', ntc: 'NTC 1950', astm: 'ASTM A242M' },
  { seccion: 'C.3.5.7.1(c)', pag: 'C-29', familia: 'acero-estructural', material: 'Acero de alta resistencia y baja aleación al Columbio-Vanadio', ntc: 'NTC 1985', astm: 'ASTM A572M' },
  { seccion: 'C.3.5.7.1(d)', pag: 'C-29', familia: 'acero-estructural', material: 'Acero de alta resistencia y baja aleación de 345 MPa', ntc: 'NTC 2012', astm: 'ASTM A588M' },
  { seccion: 'C.3.5.7.1(e)', pag: 'C-29', familia: 'acero-estructural', material: 'Perfiles estructurales', astm: 'ASTM A992M' },
  { seccion: 'C.3.5.7.2(a)', pag: 'C-29', familia: 'acero-estructural', material: 'Tubos de acero negro, por inmersión en caliente, recubiertos de cinc, Grado B', ntc: 'NTC 3470', astm: 'ASTM A53M' },
  { seccion: 'C.3.5.7.2(b)', pag: 'C-29', familia: 'acero-estructural', material: 'Tubos formados en frío, soldados, sin costura', ntc: 'NTC 4526', astm: 'ASTM A500M' },
  { seccion: 'C.3.5.7.2(c)', pag: 'C-29', familia: 'acero-estructural', material: 'Tubos formados en caliente, soldados, sin costura', ntc: 'NTC 2374', astm: 'ASTM A501' },
  // --- Aditivos (C.3.6, PDF p.332, C-30) ---
  { seccion: 'C.3.6.1', pag: 'C-30', familia: 'aditivo', material: 'Aditivos reductores de agua y modificadores del tiempo de fraguado', ntc: 'NTC 1299', astm: 'ASTM C494M' },
  { seccion: 'C.3.6.1', pag: 'C-30', familia: 'aditivo', material: 'Aditivos para producir concreto fluido', ntc: 'NTC 4023', astm: 'ASTM C1017M' },
  { seccion: 'C.3.6.2', pag: 'C-30', familia: 'aditivo', material: 'Aditivos incorporadores de aire', ntc: 'NTC 3502', astm: 'ASTM C260' },
];

// ---------------------------------------------------------------------------------------------
// C.3.8.1 — Normas NTC citadas en el Título C (PDF p.332-334, C-30 a C-32)
// ---------------------------------------------------------------------------------------------

export interface NormaNTC {
  /** Número NTC. */
  numero: number;
  /** Título tal como aparece en la norma. */
  titulo: string;
  /** Designación ASTM (o BS) entre paréntesis en la norma, si la hay. */
  astm?: string;
  /** Observación entre paréntesis de la norma (p. ej. prohibiciones). */
  nota?: string;
  /** Página impresa. */
  pag: 'C-30' | 'C-31' | 'C-32';
}

export const NORMAS_NTC: readonly NormaNTC[] = [
  { numero: 1, titulo: 'Ensayo de doblamiento para productos metálicos', astm: 'ASTM A370', pag: 'C-30' },
  { numero: 2, titulo: 'Ensayo de tracción para productos de acero', astm: 'ASTM A370', pag: 'C-30' },
  { numero: 30, titulo: 'Cemento Portland – Clasificación y nomenclatura', pag: 'C-30' },
  { numero: 121, titulo: 'Cemento Portland – Especificaciones físicas y mecánicas', astm: 'ASTM C150', pag: 'C-30' },
  { numero: 159, titulo: 'Alambres de acero, sin recubrimiento, liberados de esfuerzos, para concreto preesforzado', astm: 'ASTM A421', pag: 'C-30' },
  { numero: 161, titulo: 'Barras lisas de acero al carbono para concreto armado', astm: 'ASTM A615', nota: 'La norma anota que C.3.5.5 impone limitaciones a este tipo de acero de refuerzo.', pag: 'C-30' },
  { numero: 174, titulo: 'Especificaciones de los agregados para concreto', astm: 'ASTM C33', pag: 'C-30' },
  { numero: 220, titulo: 'Método para determinar la resistencia a la compresión de morteros de cemento hidráulico usando cubos de 50 mm de lado', astm: 'ASTM C109', pag: 'C-30' },
  { numero: 245, titulo: 'Barras de acero al carbono trabajadas en frío para concreto reforzado armado', nota: 'La norma anota que C.3.5.3 prohíbe el uso de este tipo de acero.', pag: 'C-30' },
  { numero: 248, titulo: 'Barras corrugadas de acero al carbono para concreto reforzado armado', astm: 'ASTM A615', nota: 'La norma anota que C.3.5.3 prohíbe el uso de este tipo de acero como acero corrugado.', pag: 'C-31' },
  { numero: 321, titulo: 'Cemento Portland – Especificaciones químicas', pag: 'C-31' },
  { numero: 396, titulo: 'Método de ensayo para determinar el asentamiento del concreto', astm: 'ASTM C143', pag: 'C-31' },
  { numero: 423, titulo: 'Barras de acero al carbono, terminadas en frío de calidad estándar', astm: 'ASTM A108', pag: 'C-31' },
  { numero: 454, titulo: 'Hormigón fresco, toma de muestras', astm: 'ASTM C172', pag: 'C-31' },
  { numero: 504, titulo: 'Refrentado de especímenes cilíndricos de concreto', astm: 'ASTM C617', pag: 'C-31' },
  { numero: 550, titulo: 'Elaboración y curado de especímenes de concreto en obra', astm: 'ASTM C31', pag: 'C-31' },
  { numero: 673, titulo: 'Ensayo de resistencia a la compresión de cilindros de concreto', astm: 'ASTM C39', pag: 'C-31' },
  { numero: 722, titulo: 'Ensayo de tracción indirecta de cilindros de concreto', astm: 'ASTM C496', pag: 'C-31' },
  { numero: 1032, titulo: 'Método de ensayo para la determinación del contenido de aire en el concreto fresco. Método de presión', astm: 'ASTM 231 (sic)', pag: 'C-31' },
  { numero: 1299, titulo: 'Aditivos químicos para el concreto', astm: 'ASTM C494', pag: 'C-31' },
  { numero: 1377, titulo: 'Elaboración y curado de especímenes de concreto para ensayo de laboratorio', astm: 'ASTM C192', pag: 'C-31' },
  { numero: 1907, titulo: 'Alambre de acero para concreto armado', astm: 'ASTM A496', pag: 'C-31' },
  { numero: 1920, titulo: 'Acero estructural', astm: 'ASTM A36', pag: 'C-31' },
  { numero: 1925, titulo: 'Mallas soldadas fabricadas con alambre liso de acero para concreto reforzado', astm: 'ASTM A185', pag: 'C-31' },
  { numero: 1950, titulo: 'Acero estructural de baja aleación y alta resistencia', astm: 'ASTM A242', pag: 'C-31' },
  { numero: 1985, titulo: 'Acero de calidad estructural de alta resistencia y baja aleación al Columbio (Nionio)', astm: 'ASTM A572', pag: 'C-31' },
  { numero: 2010, titulo: 'Cordones de acero de siete alambres, sin recubrimiento, para concreto preesforzado', astm: 'ASTM A416', pag: 'C-31' },
  { numero: 2012, titulo: 'Acero estructural de baja aleación y alta resistencia con punto de fluencia mínimo de 345 MPa, en espesores hasta 100 mm', astm: 'ASTM A588', pag: 'C-31' },
  { numero: 2240, titulo: 'Agregados usados en morteros de mampostería', astm: 'ASTM C144', pag: 'C-31' },
  { numero: 2043, titulo: 'Mallas fabricadas con barras corrugadas de acero para hormigón reforzado', astm: 'ASTM A184', pag: 'C-31' },
  { numero: 2142, titulo: 'Barras de acero de alta resistencia, sin revestimiento, para concreto pretensado', astm: 'ASTM A722', pag: 'C-31' },
  { numero: 2289, titulo: 'Barras y rollos corrugados de acero de baja aleación y/o termotratados para concreto reforzado en construcciones de diseño sismo resistente', astm: 'ASTM A706', pag: 'C-31' },
  { numero: 2310, titulo: 'Mallas soldadas fabricadas con alambre corrugado para refuerzo de concreto', astm: 'ASTM A497', pag: 'C-31' },
  { numero: 2374, titulo: 'Tubos redondos, rectangulares y cuadrados de acero al carbono con o sin costura, formados en caliente para propósitos estructurales', astm: 'ASTM A501', pag: 'C-31' },
  { numero: 3318, titulo: 'Concreto premezclado', astm: 'ASTM C94', pag: 'C-31' },
  { numero: 3330, titulo: 'Método de ensayo para determinar el cambio longitudinal de morteros de cemento hidráulico expuestos a una solución de sulfatos', astm: 'ASTM C1012', pag: 'C-31' },
  { numero: 3353, titulo: 'Definiciones y métodos para los ensayos mecánicos de productos de acero', astm: 'ASTM A370', pag: 'C-31' },
  { numero: 3459, titulo: 'Agua para la elaboración de concreto', astm: 'BS 3148', pag: 'C-32' },
  { numero: 3470, titulo: 'Tubos de acero soldados o sin costura recubiertos de cinc por inmersión en caliente, o pavonados', astm: 'ASTM A53', pag: 'C-32' },
  { numero: 3493, titulo: 'Cenizas volantes y puzolanas naturales, calcinadas o crudas, utilizadas como aditivos minerales en el concreto de cemento Portland', astm: 'ASTM C618', pag: 'C-32' },
  { numero: 3502, titulo: 'Aditivos incorporadores de aire para concreto', astm: 'ASTM C260', pag: 'C-32' },
  { numero: 3658, titulo: 'Método de la obtención y ensayo de núcleos extraídos y vigas de concreto aserradas', astm: 'ASTM C42', pag: 'C-32' },
  { numero: 4002, titulo: 'Siderurgia. Alambre liso de acero para refuerzo de concreto', astm: 'ASTM A82', pag: 'C-32' },
  { numero: 4004, titulo: 'Barras de acero de refuerzo con recubrimiento epóxico para refuerzo de concreto', astm: 'ASTM A775', pag: 'C-32' },
  { numero: 4013, titulo: 'Barras de acero recubiertas con cinc (galvanizadas) para refuerzo de concreto', astm: 'ASTM A767', pag: 'C-32' },
  { numero: 4018, titulo: 'Escoria de alto horno, granulada y molida, para ser uso en concreto y morteros', astm: 'ASTM C989', pag: 'C-32' },
  { numero: 4022, titulo: 'Masa unitaria de concreto liviano estructural', astm: 'ASTM C567', pag: 'C-32' },
  { numero: 4023, titulo: 'Especificaciones para aditivos químicos usados en la producción de concreto fluido', astm: 'ASTM C1017', pag: 'C-32' },
  { numero: 4025, titulo: 'Método de ensayo para determinar el módulo de elasticidad estático y la relación de Poisson en concreto a compresión', astm: 'ASTM C469', pag: 'C-32' },
  { numero: 4027, titulo: 'Concreto hecho por bachada volumétrica y mezclado continuo', astm: 'ASTM C685', pag: 'C-32' },
  { numero: 4034, titulo: 'Elementos de fijación. Especificación para tornillos y pernos de acero al carbono, con 60 000 psi de resistencia a la tensión', astm: 'ASTM A307', pag: 'C-32' },
  { numero: 4040, titulo: 'Procedimientos de soldadura aplicables al acero para refuerzo de concreto', astm: 'ANSI/AWS D1.4', pag: 'C-32' },
  { numero: 4045, titulo: 'Agregados livianos para concreto estructural', astm: 'ASTM C330', pag: 'C-32' },
  { numero: 4049, titulo: 'Método para determinar los cloruros solubles en agua presentes en el concreto', astm: 'ASTM C1218', pag: 'C-32' },
  { numero: 4526, titulo: 'Mallas electrosoldadas de acero, fabricadas con alambre corrugado, para refuerzo de concreto', astm: 'ASTM A500', pag: 'C-32' },
  { numero: 4578, titulo: 'Cemento hidráulico expansivo', astm: 'ASTM C845', pag: 'C-32' },
  { numero: 4637, titulo: 'Especificaciones para el uso de microsílica como adición en mortero y concreto de cemento hidráulico', astm: 'ASTM 1240 (sic)', pag: 'C-32' },
  { numero: 5214, titulo: 'Fibras de acero para refuerzo de concreto', astm: 'ASTM A820', pag: 'C-32' },
  { numero: 5541, titulo: 'Concretos reforzados con fibra', astm: 'ASTM C1116', pag: 'C-32' },
];

/** Busca una norma NTC por su número. */
export function buscarNTC(numero: number): NormaNTC | undefined {
  return NORMAS_NTC.find((n) => n.numero === numero);
}

// ---------------------------------------------------------------------------------------------
// C.3.8.1 — Normas ASTM sin NTC equivalente al adoptar la NSR-10 (PDF p.334-335, C-32 y C-33)
// ---------------------------------------------------------------------------------------------

export interface NormaASTM {
  /** Designación con año, tal como aparece en la norma. */
  designacion: string;
  titulo: string;
  pag: 'C-32' | 'C-33';
}

export const NORMAS_ASTM_SIN_NTC: readonly NormaASTM[] = [
  { designacion: 'ASTM C150-05', titulo: 'Standard Specification for Portland Cement', pag: 'C-32' },
  { designacion: 'ASTM A421/A421M-05', titulo: 'Standard Specification for Uncoated Stress-Relieved Steel Wire for Prestressed Concrete', pag: 'C-32' },
  { designacion: 'ASTM A884/A884M-06', titulo: 'Standard Specification for Epoxy-Coated Steel Wire and Welded Wire Reinforcement', pag: 'C-32' },
  { designacion: 'ASTM A934/A934M-07', titulo: 'Standard Specification for Epoxy-Coated Prefabricated Steel Reinforcing Bars', pag: 'C-33' },
  { designacion: 'ASTM A955/A955M-07a', titulo: 'Standard Specification for Deformed and Plain Stainless-Steel Bars for Concrete Reinforcement', pag: 'C-33' },
  { designacion: 'ASTM A970/A970M-06', titulo: 'Standard Specification for Headed Steel Bars for Concrete Reinforcement', pag: 'C-33' },
  { designacion: 'ASTM A992/A992M-06a', titulo: 'Standard Specification for Structural Steel Shapes', pag: 'C-33' },
  { designacion: 'ASTM A1022/A1022M-07', titulo: 'Standard Specification for Deformed and Plain Stainless-Steel Wire and Welded Wire for Concrete Reinforcement', pag: 'C-33' },
  { designacion: 'ASTM A1035/A1035M-07', titulo: 'Standard Specification for Deformed and Plain Low-Carbon, Chromium, Steel Bars for Concrete Reinforcement', pag: 'C-33' },
  { designacion: 'ASTM A1044/A1044M-05', titulo: 'Standard Specification for Steel Stud Assemblies for Shear Reinforcement of Concrete', pag: 'C-33' },
  { designacion: 'ASTM C29/C29M-97', titulo: 'Standard Test Method for Bulk Density ("Unit Weight") and Voids in Aggregates', pag: 'C-33' },
  { designacion: 'ASTM C595-07', titulo: 'Specification for Blended Hydraulic Cements', pag: 'C-33' },
  { designacion: 'ASTM C1157-03', titulo: 'Standard Performance Specification for Hydraulic Cement', pag: 'C-33' },
  { designacion: 'ASTM C1602/C1602M-06', titulo: 'Standard Specification for Mixing Water Used in the Production of Hydraulic Cement Concrete', pag: 'C-33' },
  { designacion: 'ASTM C1609/C1609M-06', titulo: 'Standard Test Method for Flexural Performance of Fiber-Reinforced Concrete (Using Beam With Third-Point Loading)', pag: 'C-33' },
];

// ---------------------------------------------------------------------------------------------
// Otras normas declaradas parte del Reglamento (C.3.8.2 a C.3.8.8, PDF p.335, C-33)
// ---------------------------------------------------------------------------------------------

export interface NormaDeclarada {
  seccion: string;
  designacion: string;
  /** Propósito citado en el texto, si lo hay. */
  proposito?: string;
}

export const NORMAS_DECLARADAS: readonly NormaDeclarada[] = [
  { seccion: 'C.3.8.2', designacion: 'NTC 4040 (Structural Welding Code — Reinforcing Steel, AWS D1.4/D1.4M:2005)' },
  { seccion: 'C.3.8.3', designacion: 'Specification for Unbonded Single Strand Tendons (ACI 423.7-07)' },
  { seccion: 'C.3.8.4', designacion: 'AASHTO Standard Specification for Highway Bridges (17ª ed., 2002): C.9.21.7.2 y C.9.21.7.3 (División I) y C.10.3.2.3 (División II)', proposito: 'Fines citados en C.18.15.1' },
  { seccion: 'C.3.8.5', designacion: 'Qualification of Post-Installed Mechanical Anchors in Concrete (ACI 355.2-07)', proposito: 'Fines citados en el Apéndice C-D' },
  { seccion: 'C.3.8.6', designacion: 'Structural Welding Code — Steel (AWS D1.1/D1.1M:2006)' },
  { seccion: 'C.3.8.7', designacion: 'Acceptance Criteria for Moment Frames Based on Structural Testing (ACI 374.1-05)' },
  { seccion: 'C.3.8.8', designacion: 'Acceptance Criteria for Special Unbonded Post-Tensioned Precast Structural Walls Based on Validation Testing (ACI ITG 5.1-07)' },
];

// ---------------------------------------------------------------------------------------------
// Límites numéricos del texto de C.3 (PDF p.328-330)
// ---------------------------------------------------------------------------------------------

/** C.3.3.2: tamaño máximo nominal del agregado grueso ≤ 1/5 menor separación del encofrado, 1/3 altura de losa, 3/4 separación libre entre barras. */
export const TMN_FRACCIONES = { encofrado: 1 / 5, alturaLosa: 1 / 3, separacionLibreBarras: 3 / 4 } as const;

/** C.3.5.3.2 (y siguientes): para fy > 420 MPa la fluencia se toma al 0.35 % de deformación unitaria. */
export const FY_UMBRAL_DEFORMACION_MPA = 420;
export const DEFORMACION_FLUENCIA_FY_ALTO = 0.0035;

/** C.3.5.3.5: tamaños de alambre corrugado permitidos (diámetro mm): MD25 = 5.6 mm … MD200 = 16 mm. */
export const ALAMBRE_CORRUGADO_DIAMETRO_MIN_MM = 5.6;
export const ALAMBRE_CORRUGADO_DIAMETRO_MAX_MM = 16;

/** C.3.5.3.6 / C.3.5.3.7: separación máxima de intersecciones soldadas (mm) en el sentido del esfuerzo. */
export const SEPARACION_SOLDADURAS_MAX_MM = { liso: 300, corrugado: 400 } as const;

/** C.3.5.8: relación longitud/diámetro de las fibras de acero. */
export const FIBRA_ACERO_RELACION_L_D = { min: 50, max: 100 } as const;
