import { describe, expect, it } from 'vitest';
import {
  FC_MINIMO_MPA,
  columnaOPedestal,
  cuantia,
  cumpleFcMinimo,
  esfuerzoAMpa,
  esfuerzoDesdeMpa,
  kNAN,
  kNmANmm,
  terminoRaizFc,
  tipoSeccion,
} from './concretoGenerales';

describe('C.1.1.1 — f′c mínimo', () => {
  it('17 MPa es el mínimo', () => {
    expect(FC_MINIMO_MPA).toBe(17);
    expect(cumpleFcMinimo(17)).toBe(true);
    expect(cumpleFcMinimo(16.9)).toBe(false);
    expect(cumpleFcMinimo(70)).toBe(true); // no hay máximo
  });
});

describe('Apéndice C-F — esfuerzos', () => {
  it('1 MPa = 10 kgf/cm² = 142.2 psi', () => {
    expect(esfuerzoDesdeMpa(1, 'mks')).toBe(10);
    expect(esfuerzoDesdeMpa(1, 'ingles')).toBeCloseTo(142.2, 9);
    expect(esfuerzoDesdeMpa(1, 'SI')).toBe(1);
  });
  it('f′c = 21 MPa → 210 kgf/cm² (fila de la tabla C-F)', () => {
    expect(esfuerzoDesdeMpa(21, 'mks')).toBe(210);
    expect(esfuerzoDesdeMpa(28, 'mks')).toBe(280);
    expect(esfuerzoDesdeMpa(35, 'mks')).toBe(350);
  });
  it('fy = 420 MPa → 4 200 kgf/cm²', () => expect(esfuerzoDesdeMpa(420, 'mks')).toBe(4200));
  it('ida y vuelta', () => {
    for (const s of ['SI', 'mks', 'ingles'] as const) expect(esfuerzoAMpa(esfuerzoDesdeMpa(24.5, s), s)).toBeCloseTo(24.5, 9);
  });
});

describe('Apéndice C-F — términos con √f′c', () => {
  it('0.17√f′c (MPa) para f′c = 21', () => {
    const t = terminoRaizFc(21, '0.17', 'SI');
    expect(t.valorEnSistema).toBeCloseTo(0.17 * Math.sqrt(21), 9);
    expect(t.valorMpa).toBe(t.valorEnSistema);
  });
  it('las tres versiones coinciden con tolerancia por redondeo de los coeficientes', () => {
    for (const id of ['raiz', '0.313', '0.083', '0.17'] as const) {
      const si = terminoRaizFc(21, id, 'SI').valorMpa;
      const mks = terminoRaizFc(21, id, 'mks').valorMpa;
      const ing = terminoRaizFc(21, id, 'ingles').valorMpa;
      expect(Math.abs(mks - si) / si).toBeLessThan(0.03);
      expect(Math.abs(ing - si) / si).toBeLessThan(0.03);
    }
  });
  it('0.53√f′c en kgf/cm² para f′c = 210 kgf/cm²', () => {
    const t = terminoRaizFc(21, '0.17', 'mks');
    expect(t.fcEnSistema).toBe(210);
    expect(t.valorEnSistema).toBeCloseTo(0.53 * Math.sqrt(210), 9);
  });
  it('rechaza f′c no positiva', () => expect(() => terminoRaizFc(0, 'raiz', 'SI')).toThrow(RangeError));
});

describe('Unidades de fuerzas y momentos', () => {
  it('kN → N y kN·m → N·mm', () => {
    expect(kNAN(120)).toBe(120_000);
    expect(kNmANmm(150)).toBe(150_000_000);
  });
  it('un esfuerzo N/mm² es MPa: 120 kN sobre 300×500 mm = 0.8 MPa', () => {
    expect(kNAN(120) / (300 * 500)).toBeCloseTo(0.8, 12);
  });
});

describe('Definiciones geométricas de C.2', () => {
  it('cuantía ρ = As/(b d)', () => expect(cuantia(1200, 300, 500)).toBeCloseTo(0.008, 12));
  it('cuantía rechaza dimensiones nulas', () => expect(() => cuantia(100, 0, 500)).toThrow(RangeError));
  it('columna si h/menor dimensión > 3, pedestal si ≤ 3', () => {
    expect(columnaOPedestal(3000, 400)).toBe('columna');
    expect(columnaOPedestal(1200, 400)).toBe('pedestal');
    expect(columnaOPedestal(1000, 400)).toBe('pedestal');
    expect(columnaOPedestal(1201, 400)).toBe('columna');
  });
  it('tipo de sección por εt', () => {
    expect(tipoSeccion(0.005, 0.002)).toBe('controlada por tracción');
    expect(tipoSeccion(0.004, 0.002)).toBe('transición');
    expect(tipoSeccion(0.002, 0.002)).toBe('controlada por compresión');
  });
});
