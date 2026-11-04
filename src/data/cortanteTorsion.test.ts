import { describe, expect, it } from 'vitest';
import {
  ALPHA_S,
  COEF_VC_SIMPLE,
  EXCEPCIONES_AV_MIN,
  FYT_MAX_CORTANTE,
  LIMITES_VN_FRICCION,
  LIMITES_VS,
  MENSULAS,
  MUROS,
  PHI_CORTANTE_TORSION,
  RAIZ_FC_LIMITE,
  TABLA_MU_FRICCION,
  TORSION,
  VC_DETALLADO,
  VIGAS_ALTAS,
} from './cortanteTorsion';
import { RAIZ_FC_MAX_CORTANTE_MPA } from '../lib/nsr10/concreto';

describe('constantes del Capítulo C.11 (verificadas contra las páginas C-87 a C-105)', () => {
  it('φ y límites generales', () => {
    expect(PHI_CORTANTE_TORSION).toBe(0.75);
    expect(RAIZ_FC_LIMITE).toBe(RAIZ_FC_MAX_CORTANTE_MPA);
    expect(FYT_MAX_CORTANTE).toBe(420);
  });
  it('coeficientes de Vc', () => {
    expect(COEF_VC_SIMPLE).toBe(0.17);
    expect(VC_DETALLADO).toMatchObject({ coefRaiz: 0.16, coefRho: 17, maximo: 0.29 });
    expect(LIMITES_VS.maximo).toBe(0.66);
    expect(LIMITES_VS.umbralReduccionSeparacion).toBe(0.33);
  });
  it('αs por ubicación de columna: 40, 30 y 20', () => {
    expect(ALPHA_S).toEqual({ interior: 40, borde: 30, esquina: 20 });
  });
  it('tabla de μ de cortante por fricción', () => {
    expect(TABLA_MU_FRICCION.map((f) => f.mu)).toEqual([1.4, 1.0, 0.6, 0.7]);
    expect(new Set(TABLA_MU_FRICCION.map((f) => f.id)).size).toBe(4);
  });
  it('límites de Vn por fricción', () => {
    expect(LIMITES_VN_FRICCION.rugosoNormal).toEqual({ a: 0.2, b0: 3.3, b1: 0.08, c: 11 });
    expect(LIMITES_VN_FRICCION.otros).toEqual({ a: 0.2, c: 5.5 });
  });
  it('torsión', () => {
    expect(TORSION.umbral).toBe(0.083);
    expect(TORSION.redistribucion).toBe(0.33);
    expect(TORSION.divisorAoh).toBe(1.7);
    expect(TORSION.aoSobreAoh).toBe(0.85);
    expect([TORSION.thetaMinGrados, TORSION.thetaMaxGrados]).toEqual([30, 60]);
    expect(TORSION.separacionMaxMm).toBe(300);
  });
  it('vigas altas, ménsulas y muros', () => {
    expect(VIGAS_ALTAS.vnMaxCoef).toBe(0.83);
    expect(VIGAS_ALTAS.avMinCuantia).toBe(0.0025);
    expect(VIGAS_ALTAS.avhMinCuantia).toBe(0.0015);
    expect(MENSULAS.cuantiaMinCoef).toBe(0.04);
    expect(MENSULAS.nucMinFraccionVu).toBe(0.2);
    expect(MUROS.rhoHorizontalMin).toBe(0.0025);
    expect(MUROS.vnMaxCoef).toBe(0.83);
    expect(MUROS.dFraccionLw).toBe(0.8);
  });
  it('seis excepciones de refuerzo mínimo (a–f)', () => {
    expect(EXCEPCIONES_AV_MIN.map((x) => x.literal)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
