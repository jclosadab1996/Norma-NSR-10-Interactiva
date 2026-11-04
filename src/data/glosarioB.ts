/**
 * Glosario del Título B de la NSR-10 (Cargas).
 *
 * - `definicionesB`: TODAS las definiciones de B.2.1.1 (págs. impresas B-3 y B-4; PDF 222–223) y de
 *   B.6.2 (B-21 a B-23; PDF 240–242), con el texto de la norma (solo se normalizaron espacios,
 *   puntuación y `m2`→`m²`; se conservan las erratas del original). Los términos de B.2.1.1 llevan la
 *   traducción al inglés entre paréntesis tal como la da la norma. El `tema` y la `seccionRelacionada`
 *   son aportes editoriales para filtrar y enlazar.
 * - `simbolosB`: TODA la nomenclatura de B.2.2 (B-4/B-5; PDF 223–224) y de B.6.3 (B-23 a B-25;
 *   PDF 242–244), en el orden de la norma (B.2.2 primero), verificada contra la imagen de las páginas
 *   (la extracción de texto del PDF pierde subíndices, letras griegas y barras).
 *
 * Notación tipográfica de `simbolo` y `significado` (igual que glosario.ts): `x_{sub}` subíndice,
 * `x^{sup}` superíndice; U+0304 (`̄`) tras la letra indica barra superior y U+0302 (`̂`) acento
 * circunflejo («sombrero»). Usa `textoPlano` para quitar el marcado.
 */
import type { Definicion, Simbolo } from './glosario';
import { inicialDe, textoPlano } from './glosario';

export { inicialDe, textoPlano };

export type TemaGlosarioB =
  | 'generales'
  | 'cargas-metodos'
  | 'integridad-servicio'
  | 'sistema-viento'
  | 'tipos-edificio-viento'
  | 'topografia-exposicion'
  | 'presion-fuerza';

export const TEMAS_GLOSARIO_B: readonly { id: TemaGlosarioB; nombre: string; descripcion: string }[] = [
  { id: 'generales', nombre: 'Términos generales', descripcion: 'Edificación, sistema estructural, curadurías y términos de aprobación y referencia.' },
  { id: 'cargas-metodos', nombre: 'Cargas, coeficientes y métodos de diseño', descripcion: 'Cargas nominales y mayoradas, coeficientes de carga y de reducción de resistencia, resistencias y métodos de diseño.' },
  { id: 'integridad-servicio', nombre: 'Integridad, durabilidad y servicio', descripcion: 'Integridad estructural, trayectoria de cargas, durabilidad, funcionamiento, mantenimiento, reparabilidad y vida de servicio.' },
  { id: 'sistema-viento', nombre: 'SPRFV, componentes y revestimiento', descripcion: 'Sistema principal resistente a cargas de viento, componentes, revestimiento, aberturas, vidriados y área efectiva.' },
  { id: 'tipos-edificio-viento', nombre: 'Clasificación de edificios y alturas', descripcion: 'Edificio abierto, cerrado, parcialmente cerrado, bajo, rígido, flexible, de forma regular, de diafragma simple, cubierta libre y alturas de cornisa y de cubierta.' },
  { id: 'topografia-exposicion', nombre: 'Topografía, velocidad e importancia', descripcion: 'Colina, escarpe, velocidad de viento y factor de importancia.' },
  { id: 'presion-fuerza', nombre: 'Presión y fuerza de diseño', descripcion: 'Presión estática y fuerza estática equivalente usadas para determinar las cargas de viento.' },
];

export type DefinicionB = Omit<Definicion, 'tema'> & {
  tema: TemaGlosarioB;
};

export type SimboloB = Simbolo & {
  /** Capítulo y sección de la norma de donde proviene el símbolo. */
  origen: 'B.2.2' | 'B.6.3';
};

const colador = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });

const DEFINICIONES_SIN_ORDEN: DefinicionB[] = [
  // ───────────── B.2.1.1 — Definiciones (Capítulo B.2) ─────────────
  { termino: "Cargas (Loads)", definicion: "Son fuerzas u otras solicitaciones que actúan sobre el sistema estructural y provienen del peso de todos los elementos permanentes en la construcción, los ocupantes y sus pertenencias, efectos ambientales, asentamientos diferenciales y restricción de cambios dimensionales. Las cargas permanentes son cargas que varían muy poco en el tiempo y cuyas variaciones son pequeñas en magnitud. Todas las otras cargas son cargas variables.", tema: "cargas-metodos" },
  { termino: "Cargas de servicio (Service loads)", definicion: "Véase cargas nominales.", tema: "cargas-metodos", seccionRelacionada: "B.2.3" },
  { termino: "Carga mayorada (Factored load)", definicion: "Es una carga que se obtiene como el producto de una carga nominal por un coeficiente de carga. Las fuerzas sísmicas dadas en el Título A de este Reglamento corresponden a fuerzas mayoradas, pues ya han sido afectadas por el coeficiente de carga, el cual va incluido en la probabilidad de ocurrencia del sismo de diseño.", tema: "cargas-metodos", seccionRelacionada: "B.2.4" },
  { termino: "Cargas nominales (Nominal loads)", definicion: "Son las magnitudes de las cargas especificadas en B.3 a B.6 de este Reglamento. Las cargas muertas, vivas y de viento que se dan en este Título son cargas nominales o reales, las cuales NO han sido multiplicadas por el coeficiente de carga.", tema: "cargas-metodos", seccionRelacionada: "B.3" },
  { termino: "Coeficiente de carga (Load factor)", definicion: "Es un coeficiente que tiene en cuenta las desviaciones inevitables de las cargas reales con respecto a las cargas nominales y las incertidumbres que se tienen en el análisis estructural. Es sinónimo de “factor de carga” para efectos del Reglamento NSR-10.", tema: "cargas-metodos", seccionRelacionada: "B.2.4" },
  { termino: "Coeficiente de reducción de resistencia (Strength reduction factor)", definicion: "Es un coeficiente que tiene en cuenta las desviaciones inevitables entre la resistencia real y la resistencia nominal del elemento y la forma y consecuencia de su tipo de falla. Es sinónimo de “factor de reducción de resistencia” para efectos del Reglamento NSR-10.", tema: "cargas-metodos" },
  { termino: "Curadurías", definicion: "Son, de acuerdo con la Ley 388 de 1997, las entidades encargadas de estudiar, tramitar y expedir las licencias de construcción en los casos que contempla la Ley. En aquellos casos en los cuales dentro del presente Reglamento NSR-10 se menciona la Curaduría, implica además de ellas la entidad que expide las licencias de construcción o urbanismo que cumplen sus funciones.", tema: "generales" },
  { termino: "Durabilidad (Durability)", definicion: "Capacidad de una estructura o elementos estructural para garantizar que no se presente deterioro perjudicial para el desempeño requerido en el ambiente para el cual se diseñó.", tema: "integridad-servicio" },
  { termino: "Edificación (Building)", definicion: "Es una construcción cuyo uso principal es la habitación o ocupación por seres humanos.", tema: "generales" },
  { termino: "Efectos de las cargas (Load effects)", definicion: "Son las deformaciones y fuerzas internas que producen las cargas en los elementos estructurales.", tema: "cargas-metodos" },
  { termino: "Estado límite (Limit state)", definicion: "Es una condición mas allá de la cual una estructura o uno de sus componentes deja de cumplir su función (estado límite de servicio) o se vuelve insegura (estado limite de resistencia).", tema: "cargas-metodos" },
  { termino: "Funcionamiento (Serviceability)", definicion: "Capacidad de la estructura, o de un elemento estructural, de tener un comportamiento adecuado en condiciones de servicio.", tema: "integridad-servicio" },
  { termino: "Integridad estructural (Structural integrity)", definicion: "Capacidad de la estructura para evitar colapso generalizado cuando ocurre daño localizado.", tema: "integridad-servicio" },
  { termino: "Mantenimiento (Maintenance)", definicion: "Conjunto total de actividades que se realizan durante la vida de servicio de diseño de la estructura para que sea capaz de cumplir con los requisitos de desempeño.", tema: "integridad-servicio" },
  { termino: "Método de la resistencia (Strength design method)", definicion: "Es un método de diseño para los elementos estructurales tal que las fuerzas internas calculadas producidas por las cargas mayoradas no excedan las resistencias de diseño de los mismos.", tema: "cargas-metodos", seccionRelacionada: "B.2.4" },
  { termino: "Método de los esfuerzos de trabajo (Allowable stress design method)", definicion: "Es un método para diseñar los elementos estructurales en el cual los esfuerzos calculados elásticamente, utilizando cargas reales, no deben exceder un valor límite especificado para cada material.", tema: "cargas-metodos", seccionRelacionada: "B.2.3" },
  { termino: "Método de los estados límites (Limit state design method)", definicion: "Es un método para diseñar estructuras de tal manera que la probabilidad de falla para ciertos estados límites considerados importantes esté dentro de valores aceptables. Por lo general se estudian los estados límites de servicio y de resistencia. Este último caso se conoce como método de la resistencia.", tema: "cargas-metodos" },
  { termino: "Reparabilidad (Restorability)", definicion: "Capacidad de la estructura, o de un elemento estructural, de poder ser reparada física y económicamente cuando sea dañada por los efectos de las solicitaciones consideradas.", tema: "integridad-servicio" },
  { termino: "Resistencia (Resistance)", definicion: "Capacidad de un elemento estructural para soportar las cargas o fuerzas que se le apliquen", tema: "cargas-metodos" },
  { termino: "Resistencia de diseño (Design strength)", definicion: "Es el producto de la resistencia nominal por un coeficiente de reducción de resistencia.", tema: "cargas-metodos" },
  { termino: "Resistencia nominal (Nominal strength)", definicion: "Es la capacidad de la estructura, o componente de ella, de resistir los efectos de las cargas, determinada por medio de cálculo en el cual se utilizan los valores nominales de las resistencias de los materiales, las dimensiones nominales del elemento y ecuaciones derivadas de principios aceptables de mecánica estructural. Estas ecuaciones provienen de ensayos de campo y ensayos de laboratorio con modelos a escala, teniendo en cuenta los efectos del modelaje y las diferencias entre las condiciones en el terreno y en laboratorio.", tema: "cargas-metodos" },
  { termino: "Sistema estructural (Structural system)", definicion: "Elementos estructurales interconectados que en conjunto cumplen una función específica.", tema: "generales" },
  { termino: "Trayectoria de cargas (Load path)", definicion: "Sucesión de elementos estructurales a lo largo de los cuales se transmiten las cargas desde su punto de aplicación hasta la cimentación.", tema: "integridad-servicio" },
  { termino: "Vida de servicio de diseño (Design service life)", definicion: "Período durante el cual la estructura o el elemento estructural sean utilizables para el propósito para el cual se diseñaron con los mantenimientos que se requieran pero sin que haya necesidad de realizarles reparaciones importantes.", tema: "integridad-servicio" },

  // ───────────── B.6.2 — Definiciones (Capítulo B.6, fuerzas de viento) ─────────────
  { termino: "Aberturas", definicion: "Vanos o espacios en el cerramiento del edificio, que permiten la circulación del aire a través del cerramiento y que se diseñan como “abiertos” durante vientos de diseño como se define en estas especificaciones.", tema: "sistema-viento" },
  { termino: "Altura de la cornisa, h", definicion: "La distancia desde la superficie del suelo adyacente al edificio hasta la cornisa en una determinada pared. Si la altura de la cornisa varía a lo largo de la pared, se tomará la altura promedio.", tema: "tipos-edificio-viento" },
  { termino: "Altura media de cubierta, h", definicion: "El promedio de la altura hasta la cornisa y la altura hasta el punto más elevado de la cubierta. Para cubiertas con ángulos de inclinación menores o iguales a 10°, la altura media de cubierta será la altura de la cornisa.", tema: "tipos-edificio-viento" },
  { termino: "Aprobado", definicion: "Aceptado por la autoridad competente.", tema: "generales" },
  { termino: "Área efectiva", definicion: "El área usada para determinar GCp. Para elementos de componentes y paneles de revestimiento, el área efectiva en las figs. B.6.5-8A a B.6.5-14 y en la Fig. B.6.5-16A, B, C y D y es la longitud de luz multiplicada por un ancho efectivo que no debe ser menor que un tercio de la longitud del tramo. Para los elementos de amarre de revestimientos, el área efectiva de viento no será mayor que el área tributaria de un amarre individual.", tema: "sistema-viento" },
  { termino: "Colina", definicion: "Con respecto a los efectos topográficos de la sección B.6.5.7, se refiere a una superficie de terreno caracterizada por un cambio notable de relieve en cualquier dirección horizontal.", tema: "topografia-exposicion", seccionRelacionada: "B.6.5.7" },
  { termino: "Componentes y revestimientos", definicion: "Aquellos elementos que no forman parte del sistema principal resistente a fuerzas de viento, SPRFV.", tema: "sistema-viento" },
  { termino: "Cubierta libre", definicion: "Cubierta con una configuración similar a la de las figs. B.6.5-15A a B.6.5-15D (a una, dos aguas o en artesa), en un edificio abierto sin paredes de cerramiento bajo la superficie del cubierta.", tema: "tipos-edificio-viento" },
  { termino: "Edificio abierto", definicion: "Un edificio con aberturas de al menos 80% del área en cada una de las paredes que conforman el cerramiento del edificio (fachadas y cubiertas). Se expresa esta condición mediante la siguiente ecuación Ao ≥ 0.8Ag, donde:\nAo = área total de aberturas en una pared que reciba presión positiva externa, en m².\nAg = área total de la pared a la cual Ao hace referencia.", tema: "tipos-edificio-viento" },
  { termino: "Edificio bajo", definicion: "Edificio cerrado o parcialmente cerrado que cumpla con las siguientes condiciones:\n(a) Altura media de la cubierta (h) menor o igual a 18 m (60ft).\n(b) Altura media de la cubierta (h) no excede la menor dimensión horizontal del edificio.", tema: "tipos-edificio-viento", seccionRelacionada: "B.6.4" },
  { termino: "Edificio cerrado", definicion: "Un edificio que no cumpla los requerimientos de edificios abiertos o parcialmente cerrados.", tema: "tipos-edificio-viento" },
  { termino: "Edificio de diafragma simple", definicion: "Un edificio en el cual las cargas de viento a barlovento y sotavento se trasmiten a través de los diafragmas de piso y cubierta hacia un mismo SPRFV, es decir no tiene separaciones estructurales.", tema: "tipos-edificio-viento", seccionRelacionada: "B.6.4" },
  { termino: "Estructura o edificio de forma regular", definicion: "Un edificio u otra estructura que no tenga geometría irregular en su forma espacial.", tema: "tipos-edificio-viento", seccionRelacionada: "B.6.4" },
  { termino: "Estructura o edificio rígido", definicion: "Un edificio u otra estructura cuya frecuencia fundamental sea mayor o igual a 1 Hz.", tema: "tipos-edificio-viento", seccionRelacionada: "B.6.5.8" },
  { termino: "Edificio parcialmente cerrado", definicion: "Un edificio que cumpla las siguientes condiciones:\n(a) El área total de aberturas en una pared que recibe presión externa positiva excede por más de 10% a la suma de las áreas de aberturas en el área restante del revestimiento del edificio (paredes y cubierta).\n(b) El área total de aberturas en una pared que soporta cargas positivas, excede de 0.37 m² o 1% del área de esa pared (la que sea menor), y el porcentaje de aberturas en el área restante del revestimiento del edificio no excede 20%.\nEstas condiciones se expresan mediante las siguientes condiciones:\nAo > 1.10Aoi\nAo > 0.37m² o Ao > 0.01Ag, el que sea menor, y Aoi/Agi ≤ 0.20\ndonde\nAo = área total de aberturas en una pared que reciba presión positiva externa, en m².\nAg = área total de la pared a la cual Ao hace referencia.\nAoi = la suma de las áreas de aberturas, sin incluir Ao, en la revestimiento del edificio (paredes y cubierta), en m².\nAgi = la suma de las áreas brutas, sin incluir Ag, del revestimiento del edificio (paredes y cubierta), en m²", tema: "tipos-edificio-viento" },
  { termino: "Edificio u otra estructura flexible", definicion: "Edificios u otras estructuras esbeltas con frecuencia natural fundamental menor a 1 Hz.", tema: "tipos-edificio-viento", seccionRelacionada: "B.6.5.8" },
  { termino: "Escarpe", definicion: "Con respecto a los efectos topográficos de la sección B.6.5.7, se refiere a un acantilado o pendiente fuerte que separa dos niveles de terreno (véase Fig. B.6.5-1).", tema: "topografia-exposicion", seccionRelacionada: "B.6.5.7" },
  { termino: "Factor de importancia, I", definicion: "Factor que tiene en cuenta el grado de amenaza a la vida humana y daño a la propiedad.", tema: "topografia-exposicion", seccionRelacionada: "B.6.5.5" },
  { termino: "Fuerza de diseño, F", definicion: "Fuerza estática equivalente usada para determinar las cargas de viento para edificios abiertos y otras estructuras.", tema: "presion-fuerza" },
  { termino: "Literatura reconocida", definicion: "Investigaciones publicadas o documentos técnicos que han sido aprobados.", tema: "generales" },
  { termino: "Material para vidriado", definicion: "Elementos de vidrio, incluyendo vidrio recocido, vidrio con recubrimiento orgánico, vidrio templado, vidrio laminado, vidrio armado, láminas de material plástico o combinaciones de éstos usados en vidriados (véase K.4.1.2).", tema: "sistema-viento", seccionRelacionada: "K.4.1.2" },
  { termino: "Presión de diseño, p", definicion: "Presión estática equivalente usada para determinar cargas de viento para edificios.", tema: "presion-fuerza" },
  { termino: "Revestimiento del edificio", definicion: "Componentes que cierren el edificio como cubiertas, claraboyas, paredes exteriores, puertas y ventanas.", tema: "sistema-viento" },
  { termino: "Revestimiento resistente a impactos", definicion: "Un cerramiento diseñado para proteger los materiales para vidriados.", tema: "sistema-viento" },
  { termino: "Sistema principal resistente a cargas de viento (SPRFV)", definicion: "Un conjunto de elementos estructurales destinado a brindar apoyo y estabilidad a la estructura en su totalidad. El sistema generalmente recibe las cargas de viento provenientes de mas de una superficie.", tema: "sistema-viento" },
  { termino: "Velocidad de viento, V", definicion: "Como se especifica en la sección B.6.5.4, es la velocidad de una ráfaga de 3 segundos medida 10 m por encima del suelo en la Exposición C (Véase sección B.6.5.6.3).", tema: "topografia-exposicion", seccionRelacionada: "B.6.5.4" },
  { termino: "Vidriera", definicion: "Vidrio o láminas traslucidas de plástico usado en ventanas, puertas, claraboyas o cerramientos.", tema: "sistema-viento" },
];

/** Definiciones de B.2.1.1 y B.6.2 (51 en total), ordenadas alfabéticamente. */
export const definicionesB: readonly DefinicionB[] = [...DEFINICIONES_SIN_ORDEN].sort((a, b) => colador.compare(a.termino, b.termino));

const BAR = '̄'; // barra superior combinada
const HAT = '̂'; // acento circunflejo combinado

/** Nomenclatura de B.2.2 (16 símbolos) seguida de la de B.6.3 (83 símbolos), en el orden de la norma. */
export const simbolosB: readonly SimboloB[] = [
  // ───────────── B.2.2 — Nomenclatura ─────────────
  { simbolo: "D", significado: "carga Muerta consistente en:\n(a) peso propio del elemento.\n(b) peso de todos los materiales de construcción incorporados a la edificación y que son permanentemente soportados por el elemento, incluyendo muros y particiones divisorias de espacios.\n(c) peso del equipo permanente.", origen: "B.2.2" },
  { simbolo: "E", significado: "fuerzas sísmicas reducidas de diseño (E = F_{s}/R) que se emplean para diseñar los miembros estructurales.", origen: "B.2.2" },
  { simbolo: "E_{d}", significado: "fuerza sísmica del umbral de daño.", origen: "B.2.2" },
  { simbolo: "F", significado: "cargas debidas al peso y presión de fluidos con densidades bien definidas y alturas máximas controlables.", origen: "B.2.2" },
  { simbolo: "F_{a}", significado: "carga debida a inundación.", origen: "B.2.2" },
  { simbolo: "F_{s}", significado: "fuerzas sísmicas calculadas de acuerdo con los requisitos del Título A del Reglamento.", origen: "B.2.2" },
  { simbolo: "G", significado: "carga debida al granizo, sin tener en cuenta la contribución del empozamiento.", origen: "B.2.2" },
  { simbolo: "L", significado: "cargas vivas debidas al uso y ocupación de la edificación, incluyendo cargas debidas a objetos móviles, particiones que se pueden cambiar de sitio. L incluye cualquier reducción que se permita. Si se toma en cuenta la resistencia a cargas de impacto este efecto debe tenerse en cuenta en la carga viva L.", origen: "B.2.2" },
  { simbolo: "L_{e}", significado: "carga de empozamiento de agua.", origen: "B.2.2" },
  { simbolo: "L_{r}", significado: "carga viva sobre la cubierta.", origen: "B.2.2" },
  { simbolo: "L_{0}", significado: "carga viva sin reducir, en kN/m². Véase B.4.5.1.", ref: "B.4.5.1", origen: "B.2.2" },
  { simbolo: "H", significado: "cargas debidas al empuje lateral del suelo, de agua freática o de materiales almacenados con restricción horizontal.", origen: "B.2.2" },
  { simbolo: "R_{0}", significado: "coeficiente de capacidad de disipación de energía básico definido para cada sistema estructural y cada grado de capacidad de disipación de energía del material estructural. Véase el Capítulo A.3.", ref: "A.3", origen: "B.2.2" },
  { simbolo: "R", significado: "coeficiente de capacidad de disipación de energía para ser empleado en el diseño, corresponde al coeficiente de disipación de energía básico multiplicado por los coeficientes de reducción de capacidad de disipación de energía por irregularidades en altura y en planta, y por ausencia de redundancia en el sistema estructural de resistencia sísmica (R = φ_{a}φ_{p}φ_{r}R_{0}). Véase el Capítulo A.3.", ref: "A.3", origen: "B.2.2" },
  { simbolo: "T", significado: "fuerzas y efectos causados por efectos acumulados de variación de temperatura, retracción de fraguado, flujo plástico, cambios de humedad, asentamiento diferencial o combinación de varios de estos efectos.", origen: "B.2.2" },
  { simbolo: "W", significado: "carga de Viento.", origen: "B.2.2" },

  // ───────────── B.6.3 — Nomenclatura (fuerzas de viento) ─────────────
  { simbolo: "A", significado: "área efectiva para viento, en m²", origen: "B.6.3" },
  { simbolo: "A_{f}", significado: "área de un edificio u otra estructura abierta. Puede referirse al área normal a la dirección de viento o al área proyectada en un plano normal a la dirección del viento, en m²", origen: "B.6.3" },
  { simbolo: "A_{g}", significado: "área bruta a la cual hace referencia A_{o}, en m²", origen: "B.6.3" },
  { simbolo: "A_{gi}", significado: "la suma de las áreas brutas de toda la superficie del envolvente (paredes y cubierta) sin incluir A_{g}, en m²", origen: "B.6.3" },
  { simbolo: "A_{o}", significado: "área total de aberturas en una pared que recibe presión positiva externa, en m²", origen: "B.6.3" },
  { simbolo: "A_{oi}", significado: "la suma del área de aberturas de toda la superficie del envolvente (paredes y cubierta) sin incluir A_{o}, en m²", origen: "B.6.3" },
  { simbolo: "A_{og}", significado: "área total de aberturas en toda la superficie del cerramiento (paredes y cubierta) del edificio, en m²", origen: "B.6.3" },
  // La norma imprime este símbolo también como A_g (se repite); posible errata por A_s del ASCE 7.
  { simbolo: "A_{g}", significado: "área bruta de la pared sólida libre o la valla rígida, en m²", origen: "B.6.3" },
  { simbolo: "a", significado: "ancho de la zona para coeficiente de presión, en m", origen: "B.6.3" },
  { simbolo: "B", significado: "dimensión horizontal del edificio medido en dirección normal a la dirección del viento, en m", origen: "B.6.3" },
  { simbolo: `b${BAR}`, significado: "factor de velocidad media de viento horaria en la ec. B.6.5-12 de la tabla B.6.5-2", ref: "B.6.5-12, B.6.5-2", origen: "B.6.3" },
  { simbolo: `b${HAT}`, significado: "factor de velocidad de ráfaga de 3 segundos, de la tabla B.6.5-2", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: "C_{f}", significado: "coeficiente de fuerza a usarse en el cálculo de cargas de viento para estructuras diferentes a edificios", origen: "B.6.3" },
  { simbolo: "C_{N}", significado: "coeficiente de presión neta a usarse en el cálculo de cargas de viento para edificios abiertos", origen: "B.6.3" },
  { simbolo: "C_{p}", significado: "coeficiente de presión externa a usarse en el cálculo de cargas de viento para edificios", origen: "B.6.3" },
  { simbolo: "c", significado: "factor de intensidad de turbulencia en la ec. B.6.5-3 de la tabla B.6.5-2", ref: "B.6.5-3, B.6.5-2", origen: "B.6.3" },
  { simbolo: "D", significado: "diámetro de estructura o miembro circular, en m", origen: "B.6.3" },
  { simbolo: "D′", significado: "profundidad de elementos sobresalientes como nervaduras y cornisas, en m", origen: "B.6.3" },
  { simbolo: "F", significado: "fuerza de viento de diseño para estructuras diferentes a edificios, en N", origen: "B.6.3" },
  { simbolo: "G", significado: "factor de efecto ráfaga", origen: "B.6.3" },
  { simbolo: "G_{f}", significado: "factor de efecto ráfaga para el SPRFV de edificios flexibles y otras estructuras", origen: "B.6.3" },
  { simbolo: "GC_{pn}", significado: "coeficiente de presión combinada para un parapeto", origen: "B.6.3" },
  { simbolo: "GC_{p}", significado: "producto del coeficiente de presión externa y el factor de efecto ráfaga a usarse en la determinación de cargas de viento para edificios", origen: "B.6.3" },
  { simbolo: "GC_{pf}", significado: "producto del coeficiente equivalente de presión externa y el factor de efecto ráfaga a usarse en la determinación de cargas de viento para el SPRFV de edificios bajos", origen: "B.6.3" },
  { simbolo: "GC_{pi}", significado: "producto del coeficiente de presión interna y el factor de efecto ráfaga a usarse en la determinación de cargas de viento para edificios", origen: "B.6.3" },
  { simbolo: "g_{Q}", significado: "factor pico para respuesta del entorno en las ecs. B.6.5-2 y B.6.5-6", ref: "B.6.5-2, B.6.5-6", origen: "B.6.3" },
  { simbolo: "g_{R}", significado: "factor pico para respuesta de resonancia en las ec. B.6.5-6", ref: "B.6.5-6", origen: "B.6.3" },
  { simbolo: "g_{ν}", significado: "factor pico para respuesta de viento en las ecs. B.6.5-2 y B.6.5-6", ref: "B.6.5-2, B.6.5-6", origen: "B.6.3" },
  { simbolo: "H", significado: "altura de la colina o escarpe en la fig. B.6.5-1, en m", ref: "B.6.5-1", origen: "B.6.3" },
  { simbolo: "h", significado: "altura media de un edificio o altura de cualquier otra estructura. Se debe usar la altura a la cornisa si el ángulo de inclinación θ es menor o igual a 10°, en m.", origen: "B.6.3" },
  { simbolo: "h_{e}", significado: "altura de la cornisa en una determinada pared o altura promedio de cornisa si esta varía a los largo de la estructura.", origen: "B.6.3" },
  { simbolo: "I", significado: "factor de importancia", origen: "B.6.3" },
  { simbolo: `I_{z${BAR}}`, significado: "intensidad de turbulencia de la ec. B.6.5-6", ref: "B.6.5-6", origen: "B.6.3" },
  { simbolo: "K_{1}, K_{2}, K_{3}", significado: "factores de multiplicación en la fig. B.6.5-1 usados para calcular K_{zt}", ref: "B.6.5-1", origen: "B.6.3" },
  { simbolo: "K_{d}", significado: "factor de direccionalidad de viento, en la tabla B.6.5-4", ref: "B.6.5-4", origen: "B.6.3" },
  { simbolo: "K_{h}", significado: "coeficiente de exposición de presión por velocidad evaluado en z = h", origen: "B.6.3" },
  { simbolo: "K_{z}", significado: "coeficiente de exposición de presión por velocidad evaluado a la altura z.", origen: "B.6.3" },
  { simbolo: "K_{zt}", significado: "factor topográfico definido en la sección B.6.5.7", ref: "B.6.5.7", origen: "B.6.3" },
  { simbolo: "L", significado: "dimensión horizontal del edificio medida en dirección paralela a la dirección del viento, en m", origen: "B.6.3" },
  { simbolo: "L_{h}", significado: "distancia viento arriba de la cresta de la colina o escarpe en la fig. B.6.5-1, donde la diferencia en elevación de terreno es la mitad de la altura de la colina o escarpe, en m", ref: "B.6.5-1", origen: "B.6.3" },
  { simbolo: `L_{z${BAR}}`, significado: "longitud integral a escala de la turbulencia (para modelos a escala en túnel de viento), en m", origen: "B.6.3" },
  { simbolo: "L_{r}", significado: "dimensión horizontal de esquina de retorno para un muro libre o valla maciza de la fig. B.6.5-17, en m", ref: "B.6.5-17", origen: "B.6.3" },
  { simbolo: "ℓ", significado: "factor de escala de longitud integral de la tabla B.6.5-2, en m", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: "N_{1}", significado: "frecuencia reducida de la ec. B.6.5-10", ref: "B.6.5-10", origen: "B.6.3" },
  { simbolo: "n_{1}", significado: "frecuencia natural del edificio, en Hz", origen: "B.6.3" },
  { simbolo: "p", significado: "presión de diseño a usarse en el cálculo de cargas de viento para edificios", origen: "B.6.3" },
  { simbolo: "p_{L}", significado: "presión de viento actuando en la cara a sotavento en la fig. B.6.5-6, en N/m²", ref: "B.6.5-6", origen: "B.6.3" },
  { simbolo: "p_{net}", significado: "presión neta de viento de diseño de la ec. B.6.4-2, en N/m²", ref: "B.6.4-2", origen: "B.6.3" },
  { simbolo: "p_{net10}", significado: "presión neta de viento de diseño para la categoría de exposición B a h=10.0 m", origen: "B.6.3" },
  { simbolo: "p_{s}", significado: "presión neta de viento de diseño de la ec. B.6.4-1, en N/m²", ref: "B.6.4-1", origen: "B.6.3" },
  { simbolo: "p_{s10}", significado: "presión de viento de diseño simplificada para la categoría de exposición B a h=10.0 m en la Fig. B.6.4-2", ref: "B.6.4-2", origen: "B.6.3" },
  { simbolo: "p_{w}", significado: "presión de viento actuando en la cara a barlovento en la fig. B.6.5-6, en N/m²", ref: "B.6.5-6", origen: "B.6.3" },
  { simbolo: "Q", significado: "factor de respuesta del entorno de la ec. B.6.5-4", ref: "B.6.5-4", origen: "B.6.3" },
  { simbolo: "q", significado: "presión por velocidad, en N/m²", origen: "B.6.3" },
  { simbolo: "q_{h}", significado: "presión por velocidad evaluada a la altura z = h, en N/m²", origen: "B.6.3" },
  { simbolo: "q_{i}", significado: "presión por velocidad para la determinación de la presión interna, en N/m²", origen: "B.6.3" },
  { simbolo: "q_{p}", significado: "presión por velocidad en la parte superior del parapeto, en N/m²", origen: "B.6.3" },
  { simbolo: "q_{z}", significado: "presión por velocidad evaluada a una altura z por encima del terreno, en N/m²", origen: "B.6.3" },
  { simbolo: "R", significado: "factor de respuesta de resonancia de la ec. B.6.5-8", ref: "B.6.5-8", origen: "B.6.3" },
  { simbolo: "R_{B}, R_{h}, R_{L}", significado: "valores de la ec. B.6.5-8", ref: "B.6.5-8", origen: "B.6.3" },
  { simbolo: "R_{i}", significado: "factor de reducción de la ec. B.6.5-14", ref: "B.6.5-14", origen: "B.6.3" },
  { simbolo: "R_{n}", significado: "valor de la ec. B.6.5-9", ref: "B.6.5-9", origen: "B.6.3" },
  { simbolo: "s", significado: "dimensión vertical de un muro libre o una valla maciza de la fig. B.6.5-17, en m", ref: "B.6.5-17", origen: "B.6.3" },
  { simbolo: "V", significado: "velocidad básica de viento de la fig. B.6.4-1 en m/s. La velocidad básica de viento corresponde a la velocidad de una ráfaga de 3 segundos a una altura de 10 m por encima del suelo en un terreno de categoría de exposición C", ref: "B.6.4-1", origen: "B.6.3" },
  { simbolo: "V_{i}", significado: "volumen interno sin particiones, en m³.", origen: "B.6.3" },
  { simbolo: `V${BAR}_{z${BAR}}`, significado: `velocidad de viento promedia por hora a una altura z${BAR}, en m/s`, origen: "B.6.3" },
  { simbolo: "W", significado: "ancho del edificio en las figs. B.6.5-9 y B.6.5-11A y B; y ancho de la luz en las figs. B.6.5-10 y B.6.5-12, en m", ref: "B.6.5-9, B.6.5-11A, B.6.5-11B, B.6.5-10, B.6.5-12", origen: "B.6.3" },
  { simbolo: "X", significado: "distancia hasta el centro de presión desde el borde a barlovento, en m", origen: "B.6.3" },
  { simbolo: "x", significado: "distancia tomada desde la cima en la dirección de barlovento o sotavento en la fig. B.6.5-1, en m", ref: "B.6.5-1", origen: "B.6.3" },
  { simbolo: "z", significado: "altura por encima del terreno, en m", origen: "B.6.3" },
  { simbolo: `z${BAR}`, significado: "altura equivalente de la estructura, en m", origen: "B.6.3" },
  { simbolo: "z_{g}", significado: "altura nominal de la capa atmosférica limite usada en este código. Los valores aparecen en la tabla B.6.5-2", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: "z_{min}", significado: "altura mínima de exposición de la tabla B.6.5-2", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: "α", significado: "exponente para la ley potencial de la velocidad de ráfaga de 3 seg, de la tabla B.6.5-2", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: `α${HAT}`, significado: "inversa de α de la Tabla B.6.5-2", ref: "B.6.5-2", origen: "B.6.3" },
  { simbolo: `α${BAR}`, significado: "exponente para la ley potencial de la velocidad media horaria del viento, ec. B.6.5-12 en la tabla B.6.5-2", ref: "B.6.5-12, B.6.5-2", origen: "B.6.3" },
  { simbolo: "β", significado: "coeficiente de amortiguamiento, porcentaje crítico para edificios y otras estructuras", origen: "B.6.3" },
  { simbolo: "ε", significado: "coeficiente de área sólida vs área bruta para muros libres, vallas macizas, vallas abiertas, torres de celosía y otras estructuras de celosía", origen: "B.6.3" },
  { simbolo: "λ", significado: "factor de ajuste por altura y exposición del edificio de las figs. B.6.4-2 y B.6.4-3.", ref: "B.6.4-2, B.6.4-3", origen: "B.6.3" },
  { simbolo: `ε${BAR}`, significado: "exponente para la ley potencial de la escala de longitud integral en la ec. B.6.5-5 obtenido de la tabla B.6.5-2", ref: "B.6.5-5, B.6.5-2", origen: "B.6.3" },
  { simbolo: "η", significado: "valor usado en la ec. B.6.5-11A (véase sección B.6.5.8.2)", ref: "B.6.5-11A, B.6.5.8.2", origen: "B.6.3" },
  { simbolo: "θ", significado: "ángulo de inclinación de la cubierta, en grados.", origen: "B.6.3" },
  { simbolo: "ν", significado: "cociente alto/ancho para vallas macizas", origen: "B.6.3" },
];
