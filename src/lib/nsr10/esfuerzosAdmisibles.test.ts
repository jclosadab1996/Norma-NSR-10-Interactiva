import { describe, expect, it } from 'vitest';
import { fcAdmisible, fsAdmisible, kDoble, kSimple, relacionModularDesdeFc, seccionServicio } from './esfuerzosAdmisibles';

// Valores de referencia: ejemplos 1 a 3 de src/content/titulo-c/apendice-cg.mdx (viga 300×440, As = 1530 mm², f′c = 21, fy = 420).
const S = { b: 300, d: 440, As: 1530, fc: 21, fy: 420 };

describe('C-G.4.4 — relación modular', () => {
  it('entero más cercano a Es/Ec, con Ec = 4700√f′c', () => {
    expect([14, 17, 21, 28, 35].map(relacionModularDesdeFc)).toEqual([11, 10, 9, 8, 7]);
  });
  it('no es menor de 6', () => {
    expect(relacionModularDesdeFc(70)).toBe(6);
    expect(relacionModularDesdeFc(100)).toBe(6);
  });
  it('rechaza f′c no positivo', () => {
    expect(() => relacionModularDesdeFc(0)).toThrow();
  });
});

describe('C-G.3 — esfuerzos admisibles', () => {
  it('concreto: 0.45 f′c', () => {
    expect(fcAdmisible(21)).toBeCloseTo(9.45, 10);
  });
  it('acero: 120 (fy ≤ 240), 170 (fy ≥ 420) y sin valor entre 240 y 420', () => {
    expect(fsAdmisible(240)).toBe(120);
    expect(fsAdmisible(420)).toBe(170);
    expect(fsAdmisible(500)).toBe(170);
    expect(fsAdmisible(280)).toBeNull();
  });
  it('losas con barras pequeñas: el menor entre 0.50 fy y 210 MPa', () => {
    expect(fsAdmisible(420, { losaBarraPequena: true })).toBe(210);
    expect(fsAdmisible(240, { losaBarraPequena: true })).toBe(120);
  });
});

describe('C-G-5 y C-G-6 — eje neutro', () => {
  it('C-G-5: es la raíz positiva de k² + 2nρk − 2nρ = 0', () => {
    const n = 9;
    const rho = 1530 / (300 * 440);
    const k = kSimple(n, rho);
    expect(k * k + 2 * n * rho * k - 2 * n * rho).toBeCloseTo(0, 12);
    expect(k).toBeCloseTo(0.3642, 4);
  });
  it('C-G-6 con ρ′ = 0 coincide con C-G-5', () => {
    expect(kDoble(9, 0.011591, 0, 0.136)).toBeCloseTo(kSimple(9, 0.011591), 12);
  });
});

describe('seccionServicio — ejemplo 1 (momento admisible)', () => {
  const r = seccionServicio(S);
  it('n, ρ, k y j', () => {
    expect(r.n).toBe(9);
    expect(r.rho).toBeCloseTo(0.01159, 5);
    expect(r.k).toBeCloseTo(0.3642, 4);
    expect(r.j).toBeCloseTo(0.8786, 4);
  });
  it('esfuerzos admisibles', () => {
    expect(r.fsAdm).toBe(170);
    expect(r.fcAdm).toBeCloseTo(9.45, 10);
  });
  it('momentos admisibles: gobierna el concreto', () => {
    expect(r.MadmAcero).toBeCloseTo(100.6, 1);
    expect(r.MadmConcreto).toBeCloseTo(87.8, 1);
    expect(r.gobierna).toBe('concreto');
    expect(r.Madm).toBeCloseTo(87.8, 1);
  });
  it('sin M no hay esfuerzos actuantes', () => {
    expect(r.fs).toBeNull();
    expect(r.fcCalc).toBeNull();
    expect(r.fsPrima).toBeNull();
  });
});

describe('seccionServicio — ejemplo 2 (esfuerzos con M y regla del 75 %)', () => {
  it('M = 70 kN·m: fs = 118.3 y fc = 7.53 MPa', () => {
    const r = seccionServicio({ ...S, M: 70 });
    expect(r.fs).toBeCloseTo(118.3, 1);
    expect(r.fcCalc).toBeCloseTo(7.53, 2);
  });
  it('M = 75 kN·m: fs = 126.8 y fc = 8.07 MPa (≤ admisibles)', () => {
    const r = seccionServicio({ ...S, M: 75 });
    expect(r.fs).toBeCloseTo(126.8, 1);
    expect(r.fcCalc).toBeCloseTo(8.07, 2);
    expect(r.fs as number).toBeLessThanOrEqual(r.fsAdm);
    expect(r.fcCalc as number).toBeLessThanOrEqual(r.fcAdm);
  });
  it('el esfuerzo del concreto es proporcional a M', () => {
    const a = seccionServicio({ ...S, M: 40 });
    const b = seccionServicio({ ...S, M: 80 });
    expect((b.fcCalc as number) / (a.fcCalc as number)).toBeCloseTo(2, 10);
  });
});

describe('seccionServicio — ejemplo 3 (doble armadura)', () => {
  const simple = seccionServicio({ ...S, M: 80 });
  const doble = seccionServicio({ ...S, AsPrima: 600, dPrima: 60, M: 80 });
  it('sección simple con M = 80 kN·m: fc = 8.61 MPa', () => {
    expect(simple.fcCalc).toBeCloseTo(8.61, 2);
  });
  it('ρ′, k y j con acero de compresión', () => {
    expect(doble.rhoPrima).toBeCloseTo(0.00455, 5);
    expect(doble.k).toBeCloseTo(0.3456, 4);
    expect(doble.j).toBeCloseTo(0.8848, 4);
    expect(doble.k).toBeLessThan(simple.k);
  });
  it('esfuerzos: fs = 134.3, f′s = 85.9 y fc = 9.01 MPa', () => {
    expect(doble.fs).toBeCloseTo(134.3, 1);
    expect(doble.fsPrima).toBeCloseTo(85.9, 1);
    expect(doble.fcCalc).toBeCloseTo(9.01, 2);
  });
  it('exige dPrima si hay refuerzo en compresión', () => {
    expect(() => seccionServicio({ ...S, AsPrima: 600 })).toThrow();
  });
});

describe('seccionServicio — casos límite', () => {
  it('fy entre 240 y 420 usa 120 MPa por prudencia', () => {
    expect(seccionServicio({ ...S, fy: 280 }).fsAdm).toBe(120);
  });
  it('rechaza datos no positivos', () => {
    expect(() => seccionServicio({ ...S, b: 0 })).toThrow();
  });
});
