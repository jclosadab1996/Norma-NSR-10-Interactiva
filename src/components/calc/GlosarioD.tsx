import GlosarioBase from './GlosarioBase';
import { TEMAS_GLOSARIO_D, definicionesD, simbolosD } from '@/data/glosarioD';

/** Glosario del Título D (notación D.2.4 y definiciones D.2.5). */
export default function GlosarioD() {
  return (
    <GlosarioBase
      definiciones={definicionesD}
      simbolos={simbolosD}
      temas={TEMAS_GLOSARIO_D}
      placeholder="Ej.: f′m, Ae, mampostería parcialmente reforzada, unidad de perforación vertical…"
      notaSimbolos="Notación de D.2.4, en el orden de la norma. Las remisiones «§» llevan al capítulo donde se desarrolla cada símbolo."
      pie="Textos tomados del Capítulo D.2 de la NSR-10 (notación D.2.4, págs. D-8 a D-10; definiciones D.2.5, págs. D-11 y D-12; se conservan las erratas del original); el tema y los enlaces son una organización didáctica de esta web."
    />
  );
}
