import { describe, expect, it } from 'vitest';
import {
  DIVISOR_ANCHO_BIELA,
  FACTOR_CARGA_COLUMNA_FUERA_PLANO,
  FC_MINIMO_CONFINAMIENTO,
  FRACCION_CORTANTE_ELEMENTO,
  PHI_CONFINADO,
  PHI_CORTANTE_TITULO_C,
  PND,
  PNC,
  VN_CONFINADO,
} from './muroConfinadoDiseno';

describe('constantes de D.10.7 (muros confinados)', () => {
  it('φ de D.10.7.2 (D-57)', () => {
    expect(PHI_CONFINADO).toEqual({ compresion: 0.65, traccion: 0.85, flexion: 0.85, cortante: 0.5 });
  });
  it('φ de cortante del Título C (C.9.3.2.3) como alternativa', () => {
    expect(PHI_CORTANTE_TITULO_C).toBe(0.75);
  });
  it('coeficientes de las Ecs. D.10.7-1 y D.10.7-3', () => {
    expect(PNC).toEqual({ factorExterno: 0.8, factorFc: 0.85 });
    expect(PND).toEqual({ factorExterno: 0.8, factorFm: 0.8 });
  });
  it('coeficientes de la Ec. D.10.7-18 (1/12, 3 y 1/6)', () => {
    expect(VN_CONFINADO).toEqual({ divisorRaiz: 12, divisorPu: 3, divisorTope: 6 });
  });
  it('biela de un quinto, mitad de la componente y doble de carga en la columna fuera del plano', () => {
    expect(DIVISOR_ANCHO_BIELA).toBe(5);
    expect(FRACCION_CORTANTE_ELEMENTO).toBe(0.5);
    expect(FACTOR_CARGA_COLUMNA_FUERA_PLANO).toBe(2);
  });
  it('f′c mínimo de elementos de confinamiento (D.10.4.1)', () => {
    expect(FC_MINIMO_CONFINAMIENTO).toBe(17.5);
  });
});
