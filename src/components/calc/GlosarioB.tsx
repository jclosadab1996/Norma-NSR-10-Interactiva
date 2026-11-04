import GlosarioBase from './GlosarioBase';
import { TEMAS_GLOSARIO_B, definicionesB, simbolosB } from '@/data/glosarioB';

/** Glosario del Título B (definiciones y nomenclatura de B.2 y B.6). */
export default function GlosarioB() {
  return (
    <GlosarioBase
      definiciones={definicionesB}
      simbolos={simbolosB}
      temas={TEMAS_GLOSARIO_B}
      placeholder="Ej.: carga mayorada, SPRFV, edificio cerrado, Kz, GCpi…"
      notaSimbolos="Variables de B.2.2 (combinaciones de carga) y B.6.3 (viento), en el orden de la norma. Las remisiones «§» llevan al capítulo donde se desarrolla cada una."
      pie="Textos tomados de B.2.1.1, B.2.2, B.6.2 y B.6.3 de la NSR-10 (págs. B-3 a B-5 y B-21 a B-25); el tema y los enlaces son una organización didáctica de esta web."
    />
  );
}
