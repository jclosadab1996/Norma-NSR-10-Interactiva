/**
 * Constantes y tablas del Apéndice C-D (Anclaje al concreto) de la NSR-10.
 * PDF = página impresa "C-n" + 302 (C-235 = PDF 537). Cada constante cita su numeral y página.
 * Unidades: mm, MPa, N (las funciones de lib/nsr10/anclajes.ts devuelven kN).
 */

/** Resistencia del acero: futa no debe ser mayor que el menor de 1.9 fya o 860 MPa (C-D.5.1.2 y C-D.6.1.2, PDF p.542 (C-240) y p.546 (C-244)). */
export const FUTA_FACTOR_FYA = 1.9;
export const FUTA_MAX_MPA = 860;

/** f′c máximo usable en el apéndice, MPa (C-D.3.5, PDF p.539 (C-237)). */
export const FC_MAX_PREINSTALADO = 70;
export const FC_MAX_POSTINSTALADO = 55;

/** Diámetro y embebido máximos para los que se considera satisfecho el arrancamiento del concreto con C-D.5.2 y C-D.6.2 (C-D.4.2.2, PDF p.540 (C-238)). */
export const DA_MAX_ARRANCAMIENTO_MM = 50;
export const HEF_MAX_ARRANCAMIENTO_MM = 635;

/** Coeficiente kc de la Ec. C-D-7: 10 preinstalados, 7 postinstalados; con ensayos ACI 355.2 puede subir sin pasar de 10 (C-D.5.2.2, PDF p.543 (C-241)). */
export const KC_PREINSTALADO = 10;
export const KC_POSTINSTALADO = 7;
export const KC_MAX = 10;

/** Ec. C-D-8 (alternativa para pernos con cabeza preinstalados): coeficiente 3.9, 280 ≤ hef ≤ 635 mm (C-D.5.2.2, PDF p.543 (C-241)). */
export const NB_ALT_COEF = 3.9;
export const NB_ALT_HEF_MIN_MM = 280;
export const NB_ALT_HEF_MAX_MM = 635;

/** El área proyectada se extiende 1.5 hef desde el eje del anclaje (C-D.5.2.1, PDF p.543 (C-241)); ANco = 9 hef² (Ec. C-D-6). */
export const FACTOR_PROYECCION_N = 1.5;
export const COEF_ANCO = 9;

/** Factor ψc,N (concreto no fisurado a nivel de servicio): 1.25 preinstalados; 1.4 postinstalados con kc = 7 (C-D.5.2.6, PDF p.544 (C-242)). */
export const PSI_CN_NO_FISURADO_PREINSTALADO = 1.25;
export const PSI_CN_NO_FISURADO_POSTINSTALADO = 1.4;

/** Factor ψc,P de la extracción por deslizamiento: 1.4 sin fisuración a nivel de servicio, 1.0 con fisuración (C-D.5.3.6, PDF p.545 (C-243)). */
export const PSI_CP_NO_FISURADO = 1.4;

/** Ec. C-D-15: Np = 8 Abrg f′c, pernos y tornillos con cabeza (C-D.5.3.4, PDF p.545 (C-243)). */
export const NP_COEF_CABEZA = 8;
/** Ec. C-D-16: Np = 0.9 f′c eh da, tornillos con gancho L o J; 3 da ≤ eh ≤ 4.5 da (C-D.5.3.5, PDF p.545 (C-243)). */
export const NP_COEF_GANCHO = 0.9;
export const EH_MIN_FACTOR_DA = 3;
export const EH_MAX_FACTOR_DA = 4.5;

/** Desprendimiento lateral: Ec. C-D-17 con coeficiente 13; aplica si hef > 2.5 ca1 (C-D.5.4.1, PDF p.545 (C-243)). */
export const NSB_COEF = 13;
export const NSB_RELACION_HEF_CA1 = 2.5;
/** Factor (1 + ca2/ca1)/4 cuando ca2 < 3 ca1, con 1.0 ≤ ca2/ca1 ≤ 3.0 (C-D.5.4.1). */
export const NSB_RELACION_CA2_MAX = 3;
/** Grupo: Nsbg = (1 + s/(6 ca1)) Nsb si s < 6 ca1 (Ec. C-D-18, C-D.5.4.2, PDF p.545 (C-243)). */
export const NSBG_RELACION_S_CA1 = 6;

/** Cortante del acero: 0.6 Ase,V futa para tornillos con cabeza o gancho y postinstalados con camisa fuera del plano de corte (Ec. C-D-20, PDF p.546 (C-244)). */
export const VSA_FACTOR_TORNILLO = 0.6;
/** Con platinas de apoyo inyectadas con mortero las resistencias de C-D.6.1.2 se multiplican por 0.80 (C-D.6.1.3, PDF p.546 (C-244)). */
export const FACTOR_MORTERO_INYECTADO = 0.8;

/** Vb (Ec. C-D-24): 0.6; con pernos soldados continuamente a un aditamento (Ec. C-D-25): 0.66 (C-D.6.2.2 y C-D.6.2.3, PDF p.547 (C-245)). */
export const VB_COEF = 0.6;
export const VB_COEF_SOLDADO = 0.66;
/** Espesor mínimo del aditamento soldado: el mayor entre 10 mm y la mitad del diámetro del anclaje; separación s ≥ 65 mm (C-D.6.2.3, PDF p.547–548 (C-245/C-246)). */
export const ESPESOR_MIN_ADITAMENTO_MM = 10;
export const SEPARACION_MIN_SOLDADO_MM = 65;
/** Longitud de apoyo ℓe: hef (rigidez constante), 2 da (torque controlado con camisa distanciadora), ≤ 8 da en los demás (C-D.6.2.2, PDF p.547 (C-245)). */
export const LE_FACTOR_TORQUE_CAMISA = 2;
export const LE_MAX_FACTOR_DA = 8;

/** AVco = 4.5 ca1² (Ec. C-D-23, PDF p.547 (C-245)): base de media pirámide de 3 ca1 por 1.5 ca1. */
export const COEF_AVCO = 4.5;

/** ψc,V (C-D.6.2.7, PDF p.548 (C-246)). */
export const PSI_CV = {
  noFisurado: 1.4,
  fisuradoSinRefuerzo: 1.0,
  fisuradoConBorde: 1.2,
  fisuradoConBordeYEstribos: 1.4,
} as const;
/** Barra mínima de borde para ψc,V = 1.2 o 1.4: No. 4 (1/2″) o 12M (12 mm); estribos a no más de 100 mm para 1.4 (C-D.6.2.7). */
export const BARRA_BORDE_MIN_MM = 12;
export const ESTRIBOS_MAX_SEPARACION_MM = 100;

/** Desprendimiento por cabeceo: kcp = 1.0 si hef < 65 mm; 2.0 si hef ≥ 65 mm (C-D.6.3.1, PDF p.549 (C-247)). */
export const KCP_HEF_LIMITE_MM = 65;
export const KCP_CORTO = 1.0;
export const KCP_LARGO = 2.0;

/** Interacción: umbral 0.2 y límite 1.2 de la Ec. C-D-32 (C-D.7, PDF p.549 (C-247)). */
export const INTERACCION_UMBRAL = 0.2;
export const INTERACCION_LIMITE = 1.2;

/** Refuerzo del anclaje: φ = 0.75 en el diseño del refuerzo (C-D.5.2.9 y C-D.6.2.9, PDF p.544 (C-242) y p.549 (C-247)). */
export const PHI_REFUERZO_ANCLAJE = 0.75;

/** Zonas sísmicas DMO/DES: factor 0.75 sobre φNn y φVn de modos del concreto; 0.4 (0.5 muros de carga de aporticamiento ligero) como alternativa (C-D.3.3.3 y C-D.3.3.6, PDF p.539 (C-237)). */
export const FACTOR_SISMICO_CONCRETO = 0.75;
export const FACTOR_SISMICO_ALTERNATIVO = 0.4;
export const FACTOR_SISMICO_ALTERNATIVO_MUROS_LIGEROS = 0.5;

/** Elementos de acero: dúctil si alargamiento > 14 % y reducción de área ≥ 30 % (C-D.1, PDF p.537 (C-235)). */
export const DUCTIL_ALARGAMIENTO_MIN = 0.14;
export const DUCTIL_REDUCCION_AREA_MIN = 0.3;

/* ------------------------------------------------------------------ */
/* Factores de reducción de resistencia φ (C-D.4.4 y C-D.4.5)          */
/* ------------------------------------------------------------------ */

export type CombinacionesCarga = 'C.9.2' | 'apendice-C';
export type CondicionRefuerzo = 'A' | 'B';
export type TipoAnclaje = 'preinstalado' | 'post-sobreperforacion' | 'post-torque' | 'post-desplazamiento';
export type CategoriaPost = 1 | 2 | 3;

/**
 * φ del acero (C-D.4.4 a y b, combinaciones de C.9.2, PDF p.541 (C-239)) y (C-D.4.5 a y b, combinaciones del Apéndice C-C,
 * PDF p.541 (C-239)).
 */
export const PHI_ACERO = {
  'C.9.2': {
    ductil: { traccion: 0.75, cortante: 0.65 },
    fragil: { traccion: 0.65, cortante: 0.6 },
  },
  'apendice-C': {
    ductil: { traccion: 0.8, cortante: 0.75 },
    fragil: { traccion: 0.7, cortante: 0.65 },
  },
} as const;

/**
 * φ de los modos de falla del concreto (arrancamiento, desprendimiento lateral, extracción por deslizamiento y cabeceo).
 * C-D.4.4 c (C.9.2, PDF p.541 (C-239) y p.542 (C-240)) y C-D.4.5 c (Apéndice C-C, PDF p.541–542 (C-239/C-240)).
 * Condición A: hay refuerzo suplementario (salvo extracción por deslizamiento o cabeceo). Condición B: no hay, o controla
 * la extracción por deslizamiento o el cabeceo.
 */
export const PHI_CONCRETO = {
  'C.9.2': {
    cortante: { A: 0.75, B: 0.7 },
    traccion: {
      preinstalado: { A: 0.75, B: 0.7 },
      categoria1: { A: 0.75, B: 0.65 },
      categoria2: { A: 0.65, B: 0.55 },
      categoria3: { A: 0.55, B: 0.45 },
    },
  },
  'apendice-C': {
    cortante: { A: 0.85, B: 0.75 },
    traccion: {
      preinstalado: { A: 0.85, B: 0.75 },
      categoria1: { A: 0.85, B: 0.75 },
      categoria2: { A: 0.75, B: 0.65 },
      categoria3: { A: 0.65, B: 0.55 },
    },
  },
} as const;

/** Categorías de anclajes postinstalados (ACI 355.2), tal como las describe C-D.4.4 (PDF p.541 (C-239)). */
export const CATEGORIAS_POST: { categoria: CategoriaPost; descripcion: string }[] = [
  { categoria: 1, descripcion: 'Baja sensibilidad a la instalación y confiabilidad alta' },
  { categoria: 2, descripcion: 'Sensibilidad media a la instalación y confiabilidad mediana' },
  { categoria: 3, descripcion: 'Alta sensibilidad y confiabilidad baja' },
];

/* ------------------------------------------------------------------ */
/* Distancias al borde, separaciones y espesores (C-D.8)               */
/* ------------------------------------------------------------------ */

/** Separación mínima centro a centro: 4 da preinstalados no torsionados; 6 da si se torsionan (C-D.8.1, PDF p.549 (C-247)). */
export const SEPARACION_MIN_FACTOR_DA = { sinTorsion: 4, conTorsion: 6 } as const;

/** Distancia mínima al borde de anclajes con cabeza preinstalados que se torsionan: 6 da (C-D.8.2, PDF p.550 (C-248)). */
export const BORDE_MIN_PREINSTALADO_TORSIONADO_FACTOR_DA = 6;

/** Distancia mínima al borde de postinstalados sin datos de ensayo específicos: 6 da / 8 da / 10 da (C-D.8.3, PDF p.550 (C-248)). */
export const BORDE_MIN_POST_FACTOR_DA = {
  'post-sobreperforacion': 6,
  'post-torque': 8,
  'post-desplazamiento': 10,
} as const;

/** Además no menor de 2.0 veces el tamaño máximo del agregado (C-D.8.3). */
export const BORDE_MIN_FACTOR_AGREGADO = 2.0;

/** hef de postinstalados no excede el mayor entre 2/3 del espesor y el espesor menos 100 mm (C-D.8.5, PDF p.550 (C-248)). */
export const HEF_MAX_FRACCION_ESPESOR = 2 / 3;
export const HEF_MAX_ESPESOR_MENOS_MM = 100;

/** Distancia crítica de borde cac mínima en múltiplos de hef (C-D.8.6, PDF p.550 (C-248)). */
export const CAC_FACTOR_HEF = {
  'post-sobreperforacion': 2.5,
  'post-torque': 4,
  'post-desplazamiento': 4,
} as const;

/** Una tabla-resumen de los modos de falla de C-D.4.1 con su ecuación (referencia para la documentación). */
export const MODOS_FALLA = [
  { clave: 'Nsa', nombre: 'Acero del anclaje a tracción', numeral: 'C-D.5.1', ecuacion: 'C-D-3', pag: 'C-240' },
  { clave: 'Ncb', nombre: 'Arrancamiento del concreto a tracción (anclaje o grupo)', numeral: 'C-D.5.2', ecuacion: 'C-D-4 / C-D-5', pag: 'C-240' },
  { clave: 'Npn', nombre: 'Extracción por deslizamiento a tracción', numeral: 'C-D.5.3', ecuacion: 'C-D-14', pag: 'C-242' },
  { clave: 'Nsb', nombre: 'Desprendimiento lateral del concreto (anclajes con cabeza)', numeral: 'C-D.5.4', ecuacion: 'C-D-17 / C-D-18', pag: 'C-243' },
  { clave: 'Vsa', nombre: 'Acero del anclaje a cortante', numeral: 'C-D.6.1', ecuacion: 'C-D-19 / C-D-20', pag: 'C-244' },
  { clave: 'Vcb', nombre: 'Arrancamiento del concreto a cortante', numeral: 'C-D.6.2', ecuacion: 'C-D-21 / C-D-22', pag: 'C-244' },
  { clave: 'Vcp', nombre: 'Desprendimiento por cabeceo a cortante', numeral: 'C-D.6.3', ecuacion: 'C-D-30 / C-D-31', pag: 'C-247' },
] as const;
