import GlosarioBase from './GlosarioBase';
import { TEMAS_GLOSARIO, definiciones, simbolos } from '@/data/glosario';

/** Glosario del Título A (Capítulo A.13). */
export default function Glosario() {
  return (
    <GlosarioBase
      definiciones={definiciones}
      simbolos={simbolos}
      temas={TEMAS_GLOSARIO}
      notaSimbolos="Variables usadas en el Título A (A.13.2), en el orden de la norma. Las remisiones «§» llevan al capítulo donde se define cada una."
      pie="Textos tomados del Capítulo A.13 de la NSR-10 (págs. A-125 a A-138); el tema y los enlaces son una organización didáctica de esta web."
      mostrarSI
    />
  );
}
