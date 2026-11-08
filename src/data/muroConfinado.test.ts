import { describe, expect, it } from 'vitest';
import {
  BLOQUE_HORIZONTAL,
  CINTA_AMARRE,
  COLUMNA_CONFINAMIENTO,
  DIAMETROS_MINIMOS,
  DIVISOR_DENSIDAD_MUROS,
  ESBELTEZ_MAX_MURO_CONFINADO,
  ESPESOR_MIN_MURO_CONFINADO,
  FC_MIN_CONFINAMIENTO,
  MORTERO_MIN_UNIDAD_U,
  TABLA_D10_3_1,
  VIGA_CONFINAMIENTO,
} from './muroConfinado';

describe('constantes de D.10.0 a D.10.6 (verificadas contra las páginas D-53 a D-57)', () => {
  it('Tabla D.10.3-1: tolete 15, bloque horizontal de arcilla 3, bloque vertical 5 MPa', () => {
    expect(TABLA_D10_3_1.map((f) => [f.id, f.fcuMin])).toEqual([
      ['tolete-arcilla', 15],
      ['bloque-horizontal-arcilla', 3],
      ['bloque-vertical', 5],
    ]);
  });

  it('muros: esbeltez 25, espesor 110 mm, divisor 20, Pu/Ae ≤ 0.15 f′m', () => {
    expect(ESBELTEZ_MAX_MURO_CONFINADO).toBe(25);
    expect(ESPESOR_MIN_MURO_CONFINADO).toBe(110);
    expect(DIVISOR_DENSIDAD_MUROS).toBe(20);
    expect(BLOQUE_HORIZONTAL.factorFm).toBe(0.15);
    expect(BLOQUE_HORIZONTAL.pisosSuperiores).toBe(2);
  });

  it('materiales y diámetros mínimos', () => {
    expect(FC_MIN_CONFINAMIENTO).toBe(17.5);
    expect(MORTERO_MIN_UNIDAD_U).toBe(14);
    expect(DIAMETROS_MINIMOS).toEqual({ n2_6M: 6, n3_10M: 9.5, n4_12M: 12 });
  });

  it('columnas de confinamiento (D.10.5)', () => {
    const c = COLUMNA_CONFINAMIENTO;
    expect(c.areaMin).toBe(20000);
    expect(c.factorEspesor).toBe(35);
    expect(c.factorAlturaEntreVigas).toBe(1.5);
    expect(c.separacionTope).toBe(4000);
    expect(c.nBarrasMin).toBe(3);
    expect(c.cuantiaMin).toBe(0.0075);
    expect(c.estribosFactorMenorDimension).toBe(1.5);
    expect(c.estribosSeparacionMax).toBe(200);
    expect(c.zonaConfinada.separacion).toBe(100);
    expect(c.zonaConfinada.separacionRamasMax).toBe(150);
    expect(c.zonaConfinada.longitudMin).toBe(450);
    expect(c.zonaConfinada.factorMayorDimension).toBe(3);
    expect(c.zonaConfinada.fraccionLuz).toBeCloseTo(1 / 6, 12);
  });

  it('vigas de confinamiento (D.10.6) y cintas', () => {
    const w = VIGA_CONFINAMIENTO;
    expect(w.areaMin).toBe(20000);
    expect(w.losaMacizaEspesorMin).toBe(100);
    expect(w.reduccionAnchoEnchape).toBe(75);
    expect(w.distanciaVerticalMaxFactor).toBe(25);
    expect(w.nBarrasMin).toBe(3);
    expect(w.cuantiaMin).toBe(0.0075);
    expect(w.anchoAngosto).toBe(110);
    expect(w.nBarrasAngosta).toBe(2);
    expect(w.estribosSeparacionMax).toBe(200);
    expect(w.estribosFactorMenorDimension).toBe(1.5);
    expect(CINTA_AMARRE.concreto).toEqual({ alturaMin: 100, nBarrasMin: 2 });
    expect(CINTA_AMARRE.unidadU).toEqual({ nBarrasN3: 2, nBarrasN4: 1, morteroMin: 14 });
  });
});
