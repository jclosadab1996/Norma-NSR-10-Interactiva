/**
 * Glosario del Título D de la NSR-10 (Mampostería estructural).
 *
 * - `definicionesD`: TODAS las definiciones de D.2.5 (págs. impresas D-11 y D-12; PDF 576–577), con el texto
 *   de la norma (solo se normalizaron espacios y puntuación; se conservan las erratas del original, p. ej.
 *   «cavidad continúa», «junta de control … separación continúa»). A diferencia del Título C, la norma no
 *   traduce los términos al inglés. «Murete o prisma» y «Prisma — Murete» son dos entradas distintas en el
 *   original y así se conservan. El `tema` es un aporte editorial para filtrar; la `seccionRelacionada` solo
 *   se da cuando la sección es evidente por otro artículo del Título D que cita el término (D.1.2.1 remite
 *   a D.3.4 para el mortero de pega, a D.3.5 para el de relleno y a D.3.6 para las unidades; la notación
 *   remite a D.3.7 para fm′).
 * - `simbolosD`: TODA la notación de D.2.4 (págs. impresas D-8 a D-10; PDF 573–575), en el orden de la
 *   norma, verificada contra la imagen de las páginas (la extracción de texto pierde subíndices, letras
 *   griegas y el radical de √f′m). En `significado` se conservan las unidades y la referencia a capítulos
 *   que imprime la norma; `ref` recoge las secciones que la norma cita con «véase» o por el número de
 *   ecuación [(D.3.7-1) → D.3.7, (D.5.1-2) → D.5.1, (D.5.8-1) → D.5.8].
 *
 * Erratas y rarezas del original conservadas:
 *  - ρn: la norma da su unidad como «mm²» aunque es una cuantía (adimensional).
 *  - ρ: la norma imprime «ρ = As (bd)» sin la barra de división; aquí se escribe As/(bd), que es la
 *    definición de cuantía.
 *  - d′: «centroide del refuerzo en compresión flexión» (sobra «flexión»).
 *  - K, kp, kr, h, ℓ: se usan con el mismo símbolo en varios capítulos; el significado remite a cada uno.
 *
 * Notación tipográfica de `simbolo` y `significado` (igual que glosario.ts y glosarioC.ts): `x_{sub}`
 * subíndice, `x^{sup}` superíndice; un `̄` (U+0304) tras la letra indica barra superior. El apóstrofo de f′c,
 * f′m, d′ se escribe con U+2032 (′) y la ele cursiva de la norma, con ℓ (U+2113). Usa `textoPlano` para
 * quitar el marcado. En los términos y definiciones (texto corrido) las variables van en texto plano.
 */
import type { Definicion, Simbolo } from './glosario';
import { inicialDe, textoPlano } from './glosario';

export { inicialDe, textoPlano };

export type TemaGlosarioD =
  | 'unidades-piezas'
  | 'morteros-cementantes'
  | 'aparejo-juntas'
  | 'muros-elementos'
  | 'secciones-resistencia';

export const TEMAS_GLOSARIO_D: readonly { id: TemaGlosarioD; nombre: string; descripcion: string }[] = [
  { id: 'unidades-piezas', nombre: 'Unidades y piezas de mampostería', descripcion: 'Ladrillos, bloques, toletes, celdas, absorción, tasa inicial de absorción, dimensiones nominales y reales y posición normal de la unidad.' },
  { id: 'morteros-cementantes', nombre: 'Morteros, cementantes y aditivos', descripcion: 'Mortero de pega, de relleno y de revoque, cemento de mampostería, aditivos, adherencia, plasticidad, trabajabilidad y retención de agua.' },
  { id: 'aparejo-juntas', nombre: 'Aparejo, juntas y colocación', descripcion: 'Aparejos trabado y de petaca, juntas de pega y de control, traba entre muros y conectores.' },
  { id: 'muros-elementos', nombre: 'Muros y elementos', descripcion: 'Muros estructurales y no estructurales, antepechos, cabezales, elementos compuestos y de borde y altura libre efectiva.' },
  { id: 'secciones-resistencia', nombre: 'Secciones, refuerzo y resistencia', descripcion: 'Área bruta y neta, cuantía, barras de empalme, acción compuesta, muretes o prismas y resistencia a la compresión de la mampostería (f′m).' },
];

export type DefinicionD = Omit<Definicion, 'tema'> & {
  tema: TemaGlosarioD;
};

export type SimboloD = Simbolo & {
  /** Sección de la norma de donde proviene el símbolo. */
  origen: 'D.2.4';
};

const colador = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });

const DEFINICIONES_SIN_ORDEN: DefinicionD[] = [
  // ───────────── D.2.5 — Definiciones ─────────────
  { termino: "Absorción", definicion: "Cantidad de agua que penetra en los poros de la unidad en relación al peso seco.", tema: "unidades-piezas" },
  { termino: "Acción compuesta", definicion: "Transferencia de esfuerzos entre los componentes de un elemento diseñado para resistir las cargas de tal manera que los componentes actúan en conjunto como un solo elemento.", tema: "secciones-resistencia" },
  { termino: "Adherencia", definicion: "Adhesión y enlace del concreto ó el mortero al refuerzo ó a otras superficies junto a las cuales es colocado. Capacidad del mortero para atender esfuerzos normales y tangenciales a la superficie que lo une en la estructura.", tema: "morteros-cementantes" },
  { termino: "Aditivo", definicion: "Es toda substancia, diferente al agua, los agregados, el cemento y los refuerzos, usada como ingrediente del concreto o mortero y que se agrega a la mezcla inmediatamente antes o después del mezclado.", tema: "morteros-cementantes" },
  { termino: "Altura libre efectiva", definicion: "Distancia libre entre elementos que proveen apoyo lateral y que se emplea para calcular la relación de esbeltez del muro o columna.", tema: "muros-elementos" },
  { termino: "Antepecho", definicion: "Muro de altura inferior a la de piso que configura la parte inferior de una ventana, de un balcón.", tema: "muros-elementos" },
  { termino: "Aparejo", definicion: "Patrón de colocación de las unidades de mampostería.", tema: "aparejo-juntas" },
  { termino: "Aparejo trabado", definicion: "Patrón de colocación de las unidades de mampostería traslapadas con las unidades superiores e inferiores al menos en un cuarto de la longitud de la pieza.", tema: "aparejo-juntas" },
  { termino: "Aparejo de petaca", definicion: "Patrón de colocación de las unidades de mampostería alineadas verticalmente sin traslapos.", tema: "aparejo-juntas" },
  { termino: "Arcilla cocida (cerámica)", definicion: "Mezcla de arcilla, sílice y otros componentes menores, moldeada y que ha sido sometida a temperaturas altas por tiempo prolongado.", tema: "unidades-piezas" },
  { termino: "Área bruta de la sección", definicion: "Área delimitada por los bordes externos de la mampostería en el plano bajo consideración.", tema: "secciones-resistencia" },
  { termino: "Área neta de la sección", definicion: "Es el área de la unidad de mampostería incluyendo los morteros de relleno y excluyendo las cavidades, medida en el plano bajo consideración, desde los bordes externos de la mampostería.", tema: "secciones-resistencia" },
  { termino: "Barra de empalme", definicion: "Refuerzo que transfiere por adherencia el esfuerzo entre el refuerzo longitudinal de un muro y el elemento de soporte, en el cual se ancla adecuadamente.", tema: "secciones-resistencia" },
  { termino: "Bloque", definicion: "Es un tipo de pieza de mampostería que tiene huecos.", tema: "unidades-piezas" },
  { termino: "Bloque de perforación horizontal", definicion: "Es un bloque de concreto o arcilla cuyas perforaciones son horizontales y se asienta sobre la cara que no tiene huecos.", tema: "unidades-piezas" },
  { termino: "Bloque de perforación vertical", definicion: "Es un bloque, de concreto o de arcilla cocida, que tiene perforaciones verticales que forman celdas donde se coloca el refuerzo. En las celdas donde haya refuerzo vertical debe colocarse mortero de relleno.", tema: "unidades-piezas" },
  { termino: "Cabezal", definicion: "Parte extrema de un elemento estructural.", tema: "muros-elementos" },
  { termino: "Celda", definicion: "Cavidad continúa interior en la mampostería.", tema: "unidades-piezas" },
  { termino: "Cemento de mampostería", definicion: "Cemento hidráulico producido para usarse en mortero de pega y que genera mayor plasticidad y retención de agua que los obtenidos usando solo cemento Portland.", tema: "morteros-cementantes" },
  { termino: "Conector", definicion: "Elemento mecánico para unir dos o más piezas, partes o miembros.", tema: "aparejo-juntas" },
  { termino: "Cuantía", definicion: "Relación entre el área transversal del refuerzo y el área bruta de la sección considerada.", tema: "secciones-resistencia" },
  { termino: "Dimensiones nominales", definicion: "Son las dimensiones modulares de la unidad de mampostería incluyendo los espesores de pega y/o acabados. No deben exceder en más de 10 mm a las dimensiones reales.", tema: "unidades-piezas" },
  { termino: "Dimensiones reales", definicion: "Son las dimensiones externas de fabricación de la pieza.", tema: "unidades-piezas" },
  { termino: "Elemento compuesto", definicion: "Muros con aletas de sección transversal en forma de L, T, C, H, Z, I, Y, etc. que trabajan con acción compuesta.", tema: "muros-elementos" },
  { termino: "Elemento de borde", definicion: "Regiones extremas de muros que soportan cargas en su plano, y que son reforzadas y confinadas para cumplir con requisitos específicos y pueden ser del mismo o de mayor espesor que el muro.", tema: "muros-elementos" },
  { termino: "Junta de control", definicion: "Cualquier separación continúa que reduzca la transferencia de esfuerzos. Se coloca para permitir desplazamientos controlados relativos dentro de los elementos, o para suspender o controlar constructivamente los tamaños de los elementos.", tema: "aparejo-juntas" },
  { termino: "Junta de pega", definicion: "Capa de mortero en cualquier dirección, utilizada para adherir las unidades de mampostería", tema: "aparejo-juntas" },
  { termino: "Mortero de pega", definicion: "Mezcla plástica de materiales cementantes, agregado fino y agua, usado para unir las unidades de mampostería.", tema: "morteros-cementantes", seccionRelacionada: "D.3.4" },
  { termino: "Mortero de recubrimiento o revoque (pañete)", definicion: "Mezcla plástica de materiales cementantes, agregado fino y agua, usado para dar acabado liso (enlucir) los muros de mampostería.", tema: "morteros-cementantes" },
  { termino: "Mortero de relleno", definicion: "Mezcla fluida de materiales cementantes, agregados y agua, con la consistencia apropiada para ser colocado sin segregación en las celdas o cavidades de la mampostería.", tema: "morteros-cementantes", seccionRelacionada: "D.3.5" },
  { termino: "Murete o prisma", definicion: "Ensamble de piezas de mampostería con mortero de pega inyectadas o no de mortero de relleno usado como espécimen de ensayo para determinar las propiedades de la mampostería", tema: "secciones-resistencia", seccionRelacionada: "D.3.7" },
  { termino: "Muro estructural", definicion: "Elemento estructural de longitud considerable con relación a su espesor, que atiende cargas en su plano adicionales a su peso propio.", tema: "muros-elementos" },
  { termino: "Muro no estructural", definicion: "Elemento dispuesto para separar espacios, que atiende cargas únicamente debidas a su peso propio.", tema: "muros-elementos" },
  { termino: "Plasticidad (mortero de pega)", definicion: "Facilidad con que se extiende el mortero de pega sobre una superficie, sin pérdida de su uniformidad.", tema: "morteros-cementantes" },
  { termino: "Posición Normal", definicion: "Forma típica de colocación de la unidad de mampostería en el muro de que hace parte.", tema: "unidades-piezas" },
  { termino: "Prisma", definicion: "Murete.", tema: "secciones-resistencia", seccionRelacionada: "D.3.7" },
  { termino: "Resistencia a la compresión de la mampostería (f′m)", definicion: "Mínima resistencia nominal de la mampostería a compresión, medida sobre el área transversal neta y sobre la cual se basa su diseño.", tema: "secciones-resistencia", seccionRelacionada: "D.3.7" },
  { termino: "Retención de agua", definicion: "Capacidad del mortero de pega para evitar la pérdida de humedad, manteniendo su estado plástico.", tema: "morteros-cementantes" },
  { termino: "Tasa inicial de absorción", definicion: "Medida de la cantidad de agua que absorbe una unidad de mampostería de arcilla en contacto con el agua por unidad de área, durante un minuto.", tema: "unidades-piezas" },
  { termino: "Tolete", definicion: "Es una unidad de mampostería sólida. Puede ser de arcilla cocida, de concreto o sílico-calcárea.", tema: "unidades-piezas" },
  { termino: "Traba", definicion: "Intersección continúa y traslapada de dos muros.", tema: "aparejo-juntas" },
  { termino: "Trabajabilidad (mortero de pega)", definicion: "Medida de la plasticidad de una mezcla.", tema: "morteros-cementantes" },
  { termino: "Unidad de mampostería", definicion: "Elemento de colocación manual, de características pétreas y estabilidad dimensional, que unida con mortero configura el muro de mampostería.", tema: "unidades-piezas", seccionRelacionada: "D.3.6" },
];

/** Definiciones de D.2.5 (43 en total), ordenadas alfabéticamente. */
export const definicionesD: readonly DefinicionD[] = [...DEFINICIONES_SIN_ORDEN].sort((a, b) => colador.compare(a.termino, b.termino));

/** Notación de D.2.4, en el orden de la norma (letras latinas, luego las griegas). */
export const simbolosD: readonly SimboloD[] = [
  { simbolo: "A_{a}", significado: "coeficiente de aceleración pico efectiva, véase el Título A", origen: "D.2.4" },
  { simbolo: "A_{ci}", significado: "área de la sección de la columna de confinamiento i, en mm². Capítulo D.10", origen: "D.2.4" },
  { simbolo: "A_{ct}", significado: "área total de las columnas de confinamiento del muro, en mm². Capítulo D.10", origen: "D.2.4" },
  { simbolo: "A_{e}", significado: "área efectiva de la sección de mampostería, mm². Véase D.5.4.1", ref: "D.5.4.1", origen: "D.2.4" },
  { simbolo: "A_{m}", significado: "área mínima de los muros del piso, que actúan en la misma dirección en planta. Dentro del área de los muros se incluyen las columnas de confinamiento, en m². Capítulo D.10", origen: "D.2.4" },
  { simbolo: "A_{md}", significado: "área efectiva de mampostería para verificación por aplastamiento, en mm². Capítulo D.10", origen: "D.2.4" },
  { simbolo: "A_{mv}", significado: "área efectiva para determinar esfuerzos cortantes, mm². Véase D.5.4.5", ref: "D.5.4.5", origen: "D.2.4" },
  { simbolo: "A_{p}", significado: "área del piso en el nivel considerado, en m². Capítulo D.10", origen: "D.2.4" },
  { simbolo: "A_{se}", significado: "área efectiva de refuerzo en tracción, mm²", origen: "D.2.4" },
  { simbolo: "A_{st}", significado: "área total de acero de refuerzo en la sección de muro, o área total del acero de refuerzo longitudinal del elemento de confinamiento, en mm²", origen: "D.2.4" },
  { simbolo: "A_{s1}", significado: "área del refuerzo a tracción equilibrado por la compresión en la mampostería, mm²", origen: "D.2.4" },
  { simbolo: "A_{s2}", significado: "área del refuerzo a tracción equilibrado por el refuerzo a compresión, mm²", origen: "D.2.4" },
  { simbolo: "A_{v}", significado: "área de refuerzo horizontal que resiste cortante espaciado a una separación s medida verticalmente, mm²", origen: "D.2.4" },
  { simbolo: "a", significado: "profundidad del bloque equivalente de compresión (tomar como 0.85c), mm", origen: "D.2.4" },
  { simbolo: "a_{b}", significado: "profundidad del bloque equivalente de compresión en condiciones balanceadas, ecuación (D.5.1-2), mm", ref: "D.5.1", origen: "D.2.4" },
  { simbolo: "b", significado: "ancho efectivo de la sección, mm. Véase D.5.4.4", ref: "D.5.4.4", origen: "D.2.4" },
  { simbolo: "c", significado: "profundidad del eje neutro en la zona de compresión, mm", origen: "D.2.4" },
  { simbolo: "d", significado: "distancia de la cara de compresión al centroide del refuerzo en tracción, mm", origen: "D.2.4" },
  { simbolo: "d′", significado: "distancia desde el centroide del refuerzo en compresión flexión hasta la fibra extrema en compresión", origen: "D.2.4" },
  { simbolo: "E", significado: "efectos sísmicos reducidos", origen: "D.2.4" },
  { simbolo: "E_{cre}", significado: "módulo de elasticidad del mortero de revoque o pañete, MPa", origen: "D.2.4" },
  { simbolo: "E_{m}", significado: "módulo de elasticidad de la mampostería, MPa", origen: "D.2.4" },
  { simbolo: "E_{r}", significado: "módulo de elasticidad del mortero de relleno, MPa", origen: "D.2.4" },
  { simbolo: "E_{s}", significado: "módulo de elasticidad del acero de refuerzo, MPa", origen: "D.2.4" },
  { simbolo: "F_{s}", significado: "fuerzas sísmicas", origen: "D.2.4" },
  { simbolo: "f′_{c}", significado: "resistencia especificada a la compresión del concreto de los elementos de confinamiento, en MPa", origen: "D.2.4" },
  { simbolo: "f′_{cp}", significado: "resistencia especificada a la compresión del mortero de pega, MPa", origen: "D.2.4" },
  { simbolo: "f′_{cr}", significado: "resistencia especificada a la compresión del mortero de relleno, MPa", origen: "D.2.4" },
  { simbolo: "f′_{cre}", significado: "resistencia especificada a la compresión del mortero de recubrimiento ó revoque, MPa", origen: "D.2.4" },
  { simbolo: "f′_{cu}", significado: "resistencia especificada a la compresión de la unidad de mampostería medida sobre área neta, MPa", origen: "D.2.4" },
  { simbolo: "f′_{m}", significado: "resistencia especificada a la compresión de la mampostería, MPa", ref: "D.3.7", origen: "D.2.4" },
  { simbolo: "√f′_{m}", significado: "raíz cuadrada de la resistencia a la compresión de la mampostería, en MPa", origen: "D.2.4" },
  { simbolo: "f_{r}", significado: "módulo de ruptura de la mampostería, MPa", origen: "D.2.4" },
  { simbolo: "f_{y}", significado: "resistencia a la fluencia del acero de refuerzo, MPa", origen: "D.2.4" },
  { simbolo: "G_{m}", significado: "módulo de cortante de la mampostería, MPa", origen: "D.2.4" },
  { simbolo: "G_{r}", significado: "módulo de cortante del mortero de relleno, MPa", origen: "D.2.4" },
  { simbolo: "h", significado: "altura de la unidad de mampostería, en mm, para ser empleada en la ecuación (D.3.7-1)", ref: "D.3.7", origen: "D.2.4" },
  { simbolo: "h′", significado: "altura efectiva del elemento para evaluar efectos de pandeo, mm, véase D.5.4.3, o longitud de la diagonal del paño de muro entre elementos de confinamiento, o altura efectiva del elemento para evaluar efectos de pandeo en el Capítulo D.10", ref: "D.5.4.3", origen: "D.2.4" },
  { simbolo: "h_{p}", significado: "altura del piso localizado por encima del elemento bajo estudio, medida centro a centro entre vigas de confinamiento, en mm. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "I_{ct}", significado: "momento de inercia de las columnas de confinamiento del muro, con respecto a su centroide, en mm⁴. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "K", significado: "recubrimiento del refuerzo medido desde el extremo exterior de la unidad de mampostería, mm", origen: "D.2.4" },
  { simbolo: "k_{p}", significado: "factor de corrección por absorción de la unidad, adimensional, en la determinación de la resistencia a la compresión de la mampostería no inyectada; k_{p} = 1.4 para unidades de concreto y k_{p} = 0.8 para unidades de arcilla o sílico-calcáreas", origen: "D.2.4" },
  { simbolo: "k_{r}", significado: "factor de corrección por absorción de la unidad, adimensional, en la determinación de la resistencia a la compresión de la mampostería inyectada; k_{r} = 0.90 para unidades de concreto y k_{r} = 0.75 para unidades de arcilla o sílico-calcáreas", origen: "D.2.4" },
  { simbolo: "ℓ", significado: "luz de una viga o dintel, mm", origen: "D.2.4" },
  { simbolo: "ℓ_{c}", significado: "distancia horizontal entre columnas de confinamiento, medida centro a centro, para el paño de muro confinado bajo estudio, en mm. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "ℓ_{w}", significado: "longitud horizontal del muro, mm, o longitud horizontal total del muro, medida centro a centro entre columnas de confinamiento de borde, en el Capítulo D.10", origen: "D.2.4" },
  { simbolo: "M", significado: "momento actuante que ocurre simultáneamente con V", origen: "D.2.4" },
  { simbolo: "M_{n}", significado: "resistencia nominal a flexión", origen: "D.2.4" },
  { simbolo: "M_{cr}", significado: "momento de agrietamiento del muro de mampostería", origen: "D.2.4" },
  { simbolo: "M_{u}", significado: "momento mayorado solicitado de diseño del muro", origen: "D.2.4" },
  { simbolo: "N", significado: "número de niveles por encima del nivel considerado, Capítulo D.10", origen: "D.2.4" },
  { simbolo: "P_{b}", significado: "carga axial nominal balanceada, N", origen: "D.2.4" },
  { simbolo: "P_{n}", significado: "resistencia nominal a carga axial, N", origen: "D.2.4" },
  { simbolo: "P_{nc}", significado: "fuerza axial resistente nominal en compresión sobre la columna de confinamiento, siempre positiva, en N", origen: "D.2.4" },
  { simbolo: "P_{nt}", significado: "fuerza axial resistente nominal en tracción sobre la columna de confinamiento, siempre negativa, en N", origen: "D.2.4" },
  { simbolo: "P_{o}", significado: "máxima resistencia axial teórica, N", origen: "D.2.4" },
  { simbolo: "P_{u}", significado: "fuerza axial de diseño solicitada sobre el muro, en N", origen: "D.2.4" },
  { simbolo: "P_{uc}", significado: "fuerza axial de diseño solicitada en compresión sobre la columna de confinamiento, siempre positiva, en N", origen: "D.2.4" },
  { simbolo: "P_{ud}", significado: "fuerza axial que actúa sobre la biela diagonal del muro, en N. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "P_{ut}", significado: "fuerza axial de diseño solicitada en tracción sobre la columna de confinamiento, siempre negativa, en N. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "ΔP_{ui}", significado: "valor absoluto del incremento de la fuerza axial sobre la columna de confinamiento i, causada por el momento solicitado de diseño, M_{u}, en N. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "R", significado: "coeficiente de capacidad de disipación de energía", origen: "D.2.4" },
  { simbolo: "R_{e}", significado: "coeficiente utilizado para tener en cuenta los efectos de esbeltez en elementos a compresión", origen: "D.2.4" },
  { simbolo: "R_{m}", significado: "parámetro definido por medio de la ecuación (D.3.7-1)", ref: "D.3.7", origen: "D.2.4" },
  { simbolo: "R_{0}", significado: "coeficiente básico de capacidad de disipación de energía", origen: "D.2.4" },
  { simbolo: "r", significado: "relación entre el área neta y el área bruta de las unidades de mampostería, adimensional", origen: "D.2.4" },
  { simbolo: "s", significado: "separación del refuerzo de cortante medida a lo largo del eje vertical del muro, mm", origen: "D.2.4" },
  { simbolo: "t", significado: "espesor efectivo de la sección para evaluar efectos de pandeo, mm. Véase D.5.4.2", ref: "D.5.4.2", origen: "D.2.4" },
  { simbolo: "V", significado: "fuerza cortante actuante que ocurre simultáneamente con M", origen: "D.2.4" },
  { simbolo: "V_{n}", significado: "fuerza cortante resistente nominal del muro, en N", origen: "D.2.4" },
  { simbolo: "V_{nc}", significado: "fuerza cortante resistente nominal para una sección de concreto reforzado, calculada de acuerdo con los requisitos del Título C del Reglamento, en N. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "V_{m}", significado: "resistencia nominal para fuerza cortante contribuida por la mampostería, N", origen: "D.2.4" },
  { simbolo: "V_{u}", significado: "fuerza cortante mayorada solicitada de diseño del muro, en N", origen: "D.2.4" },
  { simbolo: "V_{uc}", significado: "fuerza cortante mayorada solicitada de diseño que actúa sobre las columnas de confinamiento cerca a la intersección con la viga de confinamiento, en N. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "V_{s}", significado: "resistencia nominal para fuerza cortante contribuida por el refuerzo de cortante, N", origen: "D.2.4" },
  { simbolo: "x_{i}", significado: "distancia de la columna de confinamiento i al borde del muro, en mm. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "x̄", significado: "distancia al borde del muro del centroide de las áreas de todas las columnas de confinamiento del muro, en mm. Capítulo D.10", origen: "D.2.4" },
  { simbolo: "α", significado: "coeficiente para ser empleado en la ecuación (D.5.8-1)", ref: "D.5.8", origen: "D.2.4" },
  { simbolo: "ε_{mu}", significado: "máxima deformación unitaria permisible de compresión en la mampostería (ε_{mu} = 0.003)", origen: "D.2.4" },
  { simbolo: "ε_{y}", significado: "deformación unitaria de fluencia del acero de refuerzo", origen: "D.2.4" },
  { simbolo: "φ", significado: "coeficiente de reducción de resistencia", origen: "D.2.4" },
  { simbolo: "ρ", significado: "cuantía de refuerzo a tracción por flexión, ρ = A_{s}/(bd)", origen: "D.2.4" },
  { simbolo: "ρ_{b}", significado: "cuantía correspondiente a las condiciones de flexión balanceada", origen: "D.2.4" },
  { simbolo: "ρ_{n}", significado: "cuantía de refuerzo horizontal que resiste cortante en un muro en un plano perpendicular al plano A_{mv}, mm²", origen: "D.2.4" },
  { simbolo: "η", significado: "factor de eficiencia del refuerzo horizontal", origen: "D.2.4" },
];
