import { describe, expect, it } from 'vitest';
import {
  fcAdmisible,
  fcConcreto,
  fsAdmisible,
  fsCompresion,
  fsTraccion,
  jBrazo,
  kDoble,
  kSimple,
  relacionModular,
  relacionModularCompresion,
  relacionModularDesdeFc,
  seccionServicio,
} from './esfuerzosAdmisibles';

describe('relación modular (C-G.4.4 y C-G.4.5)', () => {
  it('entero más cercano, mínimo 6', () => {
    expect(relacionModular(21538)).toBe(9); // 200000/21538 = 9.29
    expect(relacionModular(40000)).toBe(6); // 5 → 6
    expect(relacionModularDesdeFc(21)).toBe(9);
    expect(relacionModularDesdeFc(28)).toBe(8); // Ec = 24870, 8.04
  });
  it('compresión: 2 Es/Ec', () => {
    expect(relacionModularCompresion(25000)).toBeCloseTo(16, 10);
  });
});

describe('esfuerzos admisibles (C-G.3)', () => {
  it('fs admisible', () => {
    expect(fsAdmisible(240)).toBe(120);
    expect(fsAdmisible(420)).toBe(170);
    expect(fsAdmisible(280)).toBeNull();
    expect(fsAdmisible(240, { mallaSoldada: true })).toBe(170);
    expect(fsAdmisible(420, { losaUnaDireccionCorta: true })).toBe(210);
    expect(fsAdmisible(240, { losaUnaDireccionCorta: true })).toBe(120);
  });
  it('fc admisible 0.45 f′c', () => expect(fcAdmisible(21)).toBeCloseTo(9.45, 10));
});

describe('ecuaciones C-G-1 a C-G-6', () => {
  it('C-G-5 con n = 9, ρ = 0.01159: nρ = 0.10432, k = 0.3642, j = 0.8786 (a mano)', () => {
    const rho = 1530 / (300 * 440);
    const nr = 9 * rho;
    expect(nr).toBeCloseTo(0.104318, 5);
    const k = kSimple(9, rho);
    expect(k).toBeCloseTo(Math.sqrt(nr * nr + 2 * nr) - nr, 12);
    expect(k).toBeCloseTo(0.3642, 3);
    expect(jBrazo(k)).toBeCloseTo(0.8786, 3);
  });
  it('C-G-6 se reduce a C-G-5 si ρ′ = 0', () => {
    expect(kDoble(9, 0.0116, 0, 0.1)).toBeCloseTo(kSimple(9, 0.0116), 12);
  });
  it('C-G-6 con ρ′ da un k positivo y menor que 1', () => {
    const k = kDoble(9, 0.0116, 0.005, 0.1);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(1);
  });
  it('C-G-1, C-G-2, C-G-3', () => {
    const j = 0.8786;
    expect(fsTraccion(87.8e6, 1530, j, 440)).toBeCloseTo(87.8e6 / (1530 * j * 440), 10);
    expect(fsCompresion(170, 0.4, 0.2)).toBeCloseTo((2 * 170 * 0.2) / 0.6, 10);
    expect(fcConcreto(87.8e6, 300, 440, j, 0.3642)).toBeCloseTo((2 * 87.8e6) / (300 * 440 ** 2 * j * 0.3642), 10);
  });
});

describe('sección en servicio', () => {
  const e = { b: 300, d: 440, As: 1530, fc: 21, fy: 420 };
  it('b = 300, d = 440, As = 1530, f′c = 21, fy = 420: gobierna el concreto, Madm ≈ 87.8 kN·m', () => {
    const r = seccionServicio(e);
    expect(r.n).toBe(9);
    expect(r.fsAdm).toBe(170);
    expect(r.fcAdm).toBeCloseTo(9.45, 10);
    expect(r.MadmAcero).toBeCloseTo((170 * 1530 * r.j * 440) / 1e6, 8);
    expect(r.MadmAcero).toBeCloseTo(100.55, 1);
    expect(r.MadmConcreto).toBeCloseTo(87.8, 1);
    expect(r.gobierna).toBe('concreto');
    expect(r.Madm).toBeCloseTo(r.MadmConcreto, 10);
  });
  it('con M = 80 kN·m se calculan fs y fc, consistentes con las ecuaciones', () => {
    const r = seccionServicio({ ...e, M: 80 });
    expect(r.fs).toBeCloseTo(80e6 / (1530 * r.j * 440), 8);
    expect(r.fcCalc).toBeCloseTo((2 * 80e6) / (300 * 440 * 440 * r.j * r.k), 8);
    expect(r.fcCalc!).toBeLessThan(r.fcAdm);
  });
  it('con acero de compresión cambia k y aparece f′s', () => {
    const r = seccionServicio({ ...e, AsPrima: 600, dPrima: 60, M: 80 });
    expect(r.rhoPrima).toBeCloseTo(600 / (300 * 440), 10);
    expect(r.fsPrima).toBeCloseTo((2 * r.fs! * (r.k - 60 / 440)) / (1 - r.k), 8);
    expect(r.MadmCompresion).not.toBeNull();
  });
});
