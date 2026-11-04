import { describe, expect, it } from 'vitest';
import {
  avMinimoC11463,
  dCortanteHorizontal,
  resistenciaCortanteHorizontal,
  rhoEstribosInterfaz,
  separacionMaximaEstribosInterfaz,
  separacionRequeridaInterfaz,
  verificarCortanteHorizontal,
} from './compuestos';

describe('Cortante horizontal C.17.5.3', () => {
  it('superficie rugosa sin estribos: 0.55 bv d. bv = 300, d = 500 → 82.5 kN', () => {
    const r = resistenciaCortanteHorizontal({ caso: 'rugosa', bv: 300, d: 500 });
    expect(r.vnh).toBeCloseTo(0.55 * 300 * 500, 6); // 82 500 N
    expect(r.phiVnh).toBeCloseTo(0.75 * 82_500, 6); // 61 875 N
    expect(r.gobiernaTope).toBe(false);
  });
  it('lisa con estribos mínimos: también 0.55 bv d', () => {
    expect(resistenciaCortanteHorizontal({ caso: 'lisa-con-estribos-minimos', bv: 300, d: 500 }).vnh).toBeCloseTo(82_500, 6);
  });
  it('rugosa con estribos: ρv = 2·71/(300·200) = 0.0023667; (1.8 + 0.6·0.0023667·420) = 2.3964 → 359.5 kN', () => {
    const rho = rhoEstribosInterfaz(142, 300, 200);
    expect(rho).toBeCloseTo(0.0023667, 6);
    const r = resistenciaCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: rho, fy: 420, lambda: 1 });
    expect(r.vnhSinTope).toBeCloseTo((1.8 + 0.6 * rho * 420) * 150_000, 4);
    expect(r.vnhSinTope).toBeCloseTo(359_460, -1);
    expect(r.tope).toBeCloseTo(525_000, 6); // 3.5·300·500
    expect(r.vnh).toBe(r.vnhSinTope);
    expect(r.gobiernaTope).toBe(false);
  });
  it('el tope 3.5 bv d gobierna con estribos abundantes', () => {
    const r = resistenciaCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: 0.01, fy: 420 }); // 1.8 + 2.52 = 4.32 > 3.5
    expect(r.gobiernaTope).toBe(true);
    expect(r.vnh).toBeCloseTo(525_000, 6);
  });
  it('λ reduce el término con estribos (concreto liviano λ = 0.75)', () => {
    const a = resistenciaCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: 0.0023667, fy: 420, lambda: 0.75 });
    expect(a.vnhSinTope).toBeCloseTo(0.75 * (1.8 + 0.6 * 0.0023667 * 420) * 150_000, 3);
  });
  it('verificación: Vu = 250 kN con φVnh = 0.75·359.46 = 269.6 kN → cumple (relación 0.927)', () => {
    const v = verificarCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: rhoEstribosInterfaz(142, 300, 200), fy: 420, vu: 250_000 });
    expect(v.cumple).toBe(true);
    expect(v.relacion).toBeCloseTo(250_000 / (0.75 * 359_460), 3);
    expect(v.requiereC1164).toBe(false);
  });
  it('C.17.5.3.4: Vu > φ(3.5 bv d) = 393.75 kN obliga a C.11.6.4', () => {
    const v = verificarCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: 0.01, fy: 420, vu: 400_000 });
    expect(v.requiereC1164).toBe(true);
    expect(v.cumple).toBe(false);
  });
  it('requiere bv y d positivos', () => {
    expect(() => resistenciaCortanteHorizontal({ caso: 'rugosa', bv: 0, d: 500 })).toThrow();
    expect(() => resistenciaCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500 })).toThrow();
  });
});

describe('Auxiliares de C.17', () => {
  it('d ≥ 0.8h en preesforzados (C.17.5.2)', () => {
    expect(dCortanteHorizontal(500, 800, true)).toBe(640);
    expect(dCortanteHorizontal(700, 800, true)).toBe(700);
    expect(dCortanteHorizontal(500, 800, false)).toBe(500);
  });
  it('separación máxima: min(4·dim. menor, 600 mm)', () => {
    expect(separacionMaximaEstribosInterfaz(100)).toBe(400);
    expect(separacionMaximaEstribosInterfaz(200)).toBe(600);
    expect(separacionMaximaEstribosInterfaz(300)).toBe(600);
  });
  it('Av,min de C.11.4.6.3: f′c = 28, bw = 300, s = 200, fyt = 420', () => {
    // 0.062·5.2915·300·200/420 = 46.87 mm² ; 0.35·300·200/420 = 50 mm² → rige 50
    const a = avMinimoC11463(28, 300, 200, 420);
    expect(a.porRaiz).toBeCloseTo(46.87, 1);
    expect(a.porMinimo).toBeCloseTo(50, 9);
    expect(a.avMin).toBeCloseTo(50, 9);
  });
  it('separación requerida: Vu = 300 kN, Av = 142 mm², fy = 420 → ρv = 0.0034392 → s ≈ 137.6 mm', () => {
    // Vnh necesario = 400 000 N; 400000/150000 = 2.6667; (2.6667 − 1.8)/252 = 0.0034392 → s = 142/(300·0.0034392) = 137.6 mm
    const s = separacionRequeridaInterfaz({ vu: 300_000, bv: 300, d: 500, av: 142, fy: 420 });
    expect(s).not.toBeNull();
    expect(s as number).toBeCloseTo(137.6, 0);
    // con esa separación φVnh ≈ Vu
    const v = verificarCortanteHorizontal({ caso: 'rugosa-con-estribos', bv: 300, d: 500, rhoV: rhoEstribosInterfaz(142, 300, s as number), fy: 420, vu: 300_000 });
    expect(v.relacion).toBeCloseTo(1, 6);
  });
  it('separación requerida: Infinity si 1.8 bv d basta; null si excede φ·3.5 bv d', () => {
    expect(separacionRequeridaInterfaz({ vu: 100_000, bv: 300, d: 500, av: 142, fy: 420 })).toBe(Infinity);
    expect(separacionRequeridaInterfaz({ vu: 400_000, bv: 300, d: 500, av: 142, fy: 420 })).toBeNull();
  });
});
