import { describe, expect, it } from 'vitest';
import {
  beta1,
  lambdaConcreto,
  lambdaPorHendimiento,
  moduloElasticidad,
  moduloRotura,
  raizFcCortante,
} from './concreto';

describe('concreto: propiedades básicas (Título C)', () => {
  it('β1: 0.85 hasta 28 MPa, baja 0.05 cada 7 MPa y no menos de 0.65 (C.10.2.7.3)', () => {
    expect(beta1(17)).toBe(0.85);
    expect(beta1(28)).toBe(0.85);
    expect(beta1(35)).toBeCloseTo(0.8, 10);
    expect(beta1(42)).toBeCloseTo(0.75, 10);
    expect(beta1(56)).toBeCloseTo(0.65, 10);
    expect(beta1(100)).toBe(0.65);
  });

  it('Ec = 4700√f′c para densidad normal (C.8.5.1)', () => {
    expect(moduloElasticidad(21)).toBeCloseTo(4700 * Math.sqrt(21), 6);
    expect(moduloElasticidad(28)).toBeCloseTo(24870.06, 1);
  });

  it('Ec con wc: wc^1.5·0.043·√f′c y rango 1440–2560', () => {
    expect(moduloElasticidad(28, 2320)).toBeCloseTo(2320 ** 1.5 * 0.043 * Math.sqrt(28), 6);
    expect(moduloElasticidad(28, 2320)).toBeCloseTo(25_426, -1);
    expect(() => moduloElasticidad(28, 1000)).toThrow(RangeError);
    expect(() => moduloElasticidad(28, 3000)).toThrow(RangeError);
  });

  it('fr = 0.62 λ √f′c (C.9-10)', () => {
    expect(moduloRotura(28)).toBeCloseTo(0.62 * Math.sqrt(28), 10);
    expect(moduloRotura(28, 0.85)).toBeCloseTo(0.62 * 0.85 * Math.sqrt(28), 10);
  });

  it('λ por tipo de concreto y por hendimiento (C.8.6.1)', () => {
    expect(lambdaConcreto('normal')).toBe(1);
    expect(lambdaConcreto('liviano-arena-normal')).toBe(0.85);
    expect(lambdaConcreto('liviano-otros')).toBe(0.75);
    expect(lambdaPorHendimiento(2.0, 28)).toBeCloseTo(2.0 / (0.56 * Math.sqrt(28)), 10);
    expect(lambdaPorHendimiento(10, 28)).toBe(1);
  });

  it('√f′c se limita a 8.3 MPa en cortante (C.11.1.2)', () => {
    expect(raizFcCortante(28)).toBeCloseTo(Math.sqrt(28), 10);
    expect(raizFcCortante(100)).toBe(8.3);
  });
});
