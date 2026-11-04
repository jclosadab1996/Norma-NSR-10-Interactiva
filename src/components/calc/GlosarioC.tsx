import GlosarioBase from './GlosarioBase';
import { TEMAS_GLOSARIO_C, definicionesC, simbolosC } from '@/data/glosarioC';

/** Glosario del Título C (notación C.2.1 y definiciones C.2.2). */
export default function GlosarioC() {
  return (
    <GlosarioBase
      definiciones={definicionesC}
      simbolos={simbolosC}
      temas={TEMAS_GLOSARIO_C}
      placeholder="Ej.: f′c, As, recubrimiento, muro estructural, capacidad de disipación…"
      notaSimbolos="Notación de C.2.1, en el orden de la norma. Las remisiones «§» llevan al capítulo donde se desarrolla cada símbolo."
      pie="Textos tomados del Capítulo C.2 de la NSR-10 (págs. C-5 a C-24); el tema y los enlaces son una organización didáctica de esta web."
    />
  );
}
