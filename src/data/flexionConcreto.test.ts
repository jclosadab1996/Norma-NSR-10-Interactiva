import { describe, expect, it } from 'vitest';
import {
  BARRAS_MIN_COLUMNA,
  CUANTIA_MAX_COLUMNA,
  CUANTIA_MIN_COLUMNA,
  EPS_CU,
  EPS_T_CONTROLADA_TRACCION,
  EPS_T_MIN_FLEXION,
  PHI_COMPRESION_ESPIRAL,
  PHI_COMPRESION_ESTRIBOS,
  PHI_TRACCION,
  PROPIEDADES_ANALISIS_SEGUNDO_ORDEN,
} from './flexionConcreto';

describe('constantes del Capítulo C.10', () => {
  it('deformaciones límite (C.10.2.3, C.10.3.4, C.10.3.5)', () => {
    expect(EPS_CU).toBe(0.003);
    expect(EPS_T_CONTROLADA_TRACCION).toBe(0.005);
    expect(EPS_T_MIN_FLEXION).toBe(0.004);
  });
  it('φ de C.9.3.2', () => {
    expect([PHI_TRACCION, PHI_COMPRESION_ESPIRAL, PHI_COMPRESION_ESTRIBOS]).toEqual([0.9, 0.75, 0.65]);
  });
  it('columnas: 1 % a 4 % y barras mínimas 4/3/6', () => {
    expect(CUANTIA_MIN_COLUMNA).toBe(0.01);
    expect(CUANTIA_MAX_COLUMNA).toBe(0.04);
    expect(BARRAS_MIN_COLUMNA).toEqual({ 'estribos-rectangulares-o-circulares': 4, 'estribos-triangulares': 3, espiral: 6 });
  });
  it('tabla C.10.10.4.1(b): columnas 0.70, muros 0.70/0.35, vigas 0.35, placas 0.25', () => {
    const f = Object.fromEntries(PROPIEDADES_ANALISIS_SEGUNDO_ORDEN.map((p) => [p.elemento, p.factorI]));
    expect(f).toEqual({
      Columnas: 0.7,
      'Muros no agrietados': 0.7,
      'Muros agrietados': 0.35,
      Vigas: 0.35,
      'Placas planas y losas planas': 0.25,
    });
  });
});
