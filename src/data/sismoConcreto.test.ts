import { describe, expect, it } from 'vitest';
import {
  COEF_CORTANTE_NUDO,
  COMPARACION_DMO_DES,
  DES_COLUMNA,
  DES_VIGA,
  DIAFRAGMA,
  DMO_COLUMNA,
  DMO_VIGA,
  MATERIALES_C211,
  MURO_ESPECIAL,
  NUDO,
  NUMERALES_POR_GRADO,
  VIGA_ACOPLE,
} from './sismoConcreto';

describe('sismoConcreto: constantes del Capítulo C.21 (transcritas de la imagen del PDF)', () => {
  it('C.21.1: materiales', () => {
    expect(MATERIALES_C211.fcMin).toBe(21);
    expect(MATERIALES_C211.fcMaxLiviano).toBe(35);
    expect(MATERIALES_C211.excesoFluenciaMax).toBe(125);
    expect(MATERIALES_C211.relacionTraccionFluenciaMin).toBe(1.25);
    expect(MATERIALES_C211.fytMax).toBe(700);
  });

  it('C.21.1.1: numerales exigidos por grado', () => {
    expect(NUMERALES_POR_GRADO.DES.porticos).toBe('C.21.5 a C.21.8');
    expect(NUMERALES_POR_GRADO.DMO.porticos).toBe('C.21.3');
    expect(NUMERALES_POR_GRADO.DMI.porticos).toBe('C.21.2');
  });

  it('coeficientes de Ash: DES 0.3 y 0.09; DMO 0.2 y 0.06; espiral 0.12 y 0.08', () => {
    expect(DES_COLUMNA.ash).toEqual({ coefConAg: 0.3, coefMinimo: 0.09 });
    expect(DMO_COLUMNA.ash).toEqual({ coefConAg: 0.2, coefMinimo: 0.06 });
    expect(DES_COLUMNA.coefEspiral).toBe(0.12);
    expect(DMO_COLUMNA.coefEspiral).toBe(0.08);
  });

  it('Ec. C.21-5 (so) y límites geométricos de columnas', () => {
    expect(DES_COLUMNA.so).toEqual({ base: 100, hxReferencia: 350, divisor: 3, min: 100, max: 150 });
    expect(DES_COLUMNA.dimensionMin).toBe(300);
    expect(DMO_COLUMNA.dimensionMin).toBe(250);
    expect(DES_COLUMNA.relacionDimensionesMin).toBe(0.4);
    expect(DES_COLUMNA.relacionColumnaViga).toBe(1.2);
    expect(DMO_COLUMNA.relacionColumnaViga).toBe(1.2);
    expect(DES_COLUMNA.lo.minimo).toBe(450);
    expect(DMO_COLUMNA.lo.minimo).toBe(500);
  });

  it('vigas DES y DMO', () => {
    expect(DES_VIGA.bwMin).toBe(250);
    expect(DES_VIGA.bwFraccionH).toBe(0.3);
    expect(DMO_VIGA.bwMin).toBe(200);
    expect(DES_VIGA.rhoMax).toBe(0.025);
    expect(DES_VIGA.relacionMomentoPositivoNegativo).toBe(0.5);
    expect(DMO_VIGA.relacionMomentoPositivoNegativo).toBeCloseTo(1 / 3, 10);
    expect(DES_VIGA.alfaMpr).toBe(1.25);
    expect(DES_VIGA.separacion.maximo).toBe(300);
  });

  it('nudos: coeficientes de Vn y longitudes de desarrollo', () => {
    expect(COEF_CORTANTE_NUDO).toEqual({ 'cuatro-caras': 1.7, 'tres-caras-o-dos-opuestas': 1.2, otros: 1.0 });
    expect(NUDO.ldh.coef).toBe(5.4);
    expect(NUDO.ldFactor.hasta300).toBe(2.5);
    expect(NUDO.ldFactor.masDe300).toBe(3.25);
    expect(NUDO.factorFueraNucleo).toBe(1.6);
    expect(NUDO.dimensionColumnaVecesDb).toBe(20);
    expect(NUDO.dimensionColumnaVecesDbLiviano).toBe(26);
  });

  it('muros especiales y vigas de acople', () => {
    expect(MURO_ESPECIAL.rhoMin).toBe(0.0025);
    expect(MURO_ESPECIAL.separacionMax).toBe(450);
    expect(MURO_ESPECIAL.alfaC).toEqual({ alto: 0.25, bajo: 0.17, relacionInferior: 1.5, relacionSuperior: 2.0 });
    expect(MURO_ESPECIAL.vnMaxMachonesComunes).toBe(0.66);
    expect(MURO_ESPECIAL.vnMaxMachonIndividual).toBe(0.83);
    expect(MURO_ESPECIAL.bordeDesplazamiento).toEqual({ divisor: 600, derivaMin: 0.007 });
    expect(MURO_ESPECIAL.bordeEsfuerzo).toBe(0.2);
    expect(MURO_ESPECIAL.bordeEsfuerzoFin).toBe(0.15);
    expect(VIGA_ACOPLE.vuDiagonal).toBe(0.33);
    expect(VIGA_ACOPLE.phiCortante).toBe(0.85);
  });

  it('diafragmas', () => {
    expect(DIAFRAGMA.espesorMin).toBe(50);
    expect(DIAFRAGMA.espesorMinAfinadoNoCompuesto).toBe(65);
    expect(DIAFRAGMA.vnCoefConcreto).toBe(0.17);
    expect(DIAFRAGMA.vnMax).toBe(0.66);
    expect(DIAFRAGMA.colectorEsfuerzoSobrerresistencia).toBe(0.5);
  });

  it('tabla comparativa DMO/DES completa y con referencias', () => {
    expect(COMPARACION_DMO_DES.length).toBeGreaterThanOrEqual(12);
    for (const f of COMPARACION_DMO_DES) {
      expect(f.concepto.length).toBeGreaterThan(0);
      expect(f.refDes.length).toBeGreaterThan(0);
      expect(f.refDmo.length).toBeGreaterThan(0);
    }
  });
});
