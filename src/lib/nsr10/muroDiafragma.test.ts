import { describe, expect, it } from 'vitest';
import {
  areaNetaHorizontal,
  aplastamientoDiagonal,
  cortanteMinimoMiembroPortico,
  cortanteResistente,
  cumpleEspesorMinimo,
  longitudDiagonal,
  r0Admisible,
  verificarMuroDiafragma,
  vmMaximo,
  zonaCortanteMiembro,
} from './muroDiafragma';

describe('Tabla D.11.1-1 y Ec. D.11.4-1', () => {
  it('vm máximo por tipo de unidad', () => {
    expect(vmMaximo('maciza')).toBe(0.35);
    expect(vmMaximo('perforacion-vertical')).toBe(0.25);
    expect(vmMaximo('perforacion-horizontal')).toBe(0.15);
  });
  it('Am = ℓ t (con fracción neta opcional)', () => {
    expect(areaNetaHorizontal(3600, 120)).toBe(432000);
    expect(areaNetaHorizontal(3600, 120, 0.5)).toBe(216000);
  });
  it('φ vm Am: 0.5 × 0.35 × 432 000 N = 75.6 kN', () => {
    const r = cortanteResistente({ tipo: 'maciza', Am: 432000 });
    expect(r.phi).toBe(0.5);
    expect(r.vm).toBe(0.35);
    expect(r.Vr).toBeCloseTo(75.6, 10);
    expect(r.usaEnsayo).toBe(false);
    expect(r.superaTabla).toBe(false);
  });
  it('perforación horizontal: 0.5 × 0.15 × 432 000 = 32.4 kN', () => {
    expect(cortanteResistente({ tipo: 'perforacion-horizontal', Am: 432000 }).Vr).toBeCloseTo(32.4, 10);
  });
  it('un vm ensayado reemplaza a la tabla y se marca si la supera', () => {
    const r = cortanteResistente({ tipo: 'perforacion-vertical', Am: 400000, vmEnsayado: 0.3 });
    expect(r.vm).toBe(0.3);
    expect(r.superaTabla).toBe(true);
    expect(r.Vr).toBeCloseTo(60, 10);
    const r2 = cortanteResistente({ tipo: 'perforacion-vertical', Am: 400000, vmEnsayado: 0.2 });
    expect(r2.superaTabla).toBe(false);
    expect(r2.Vr).toBeCloseTo(40, 10);
  });
});

describe('aplastamiento diagonal (D.11.4.1 b)', () => {
  it('diagonal 3-4-5: 3600 × 2700 → 4500 mm', () => {
    expect(longitudDiagonal(3600, 2700)).toBeCloseTo(4500, 9);
  });
  it('f′m = 5 MPa, t = 120 mm', () => {
    const a = aplastamientoDiagonal({ L: 3600, h: 2700, t: 120, fm: 5 });
    expect(a.Ae).toBeCloseTo(108000, 6);
    expect(a.hPrime).toBeCloseTo(4500, 9);
    expect(a.esbeltez).toBeCloseTo(37.5, 9);
    expect(a.esbeltezAdmisible).toBe(false);
    expect(a.Re).toBeCloseTo(0.3136, 10); // (21/37.5)^2
    expect(a.Po).toBeCloseTo(432, 9); // 0.80 · 5 · 108 000 N
    expect(a.Pn).toBeCloseTo(108.38016, 6);
    expect(a.phi).toBe(0.6);
    expect(a.phiPn).toBeCloseTo(65.028096, 6);
    expect(a.cosTheta).toBeCloseTo(0.8, 12);
    expect(a.anguloGrados).toBeCloseTo(36.8699, 3);
    expect(a.Vh).toBeCloseTo(52.0224768, 6);
  });
  it('fracción neta 0.5 reduce Ae y la resistencia a la mitad (misma esbeltez)', () => {
    const a = aplastamientoDiagonal({ L: 3600, h: 2700, t: 120, fm: 5, fraccionNeta: 0.5 });
    expect(a.Ae).toBeCloseTo(54000, 6);
    expect(a.Po).toBeCloseTo(216, 9);
    expect(a.Re).toBeCloseTo(0.3136, 10);
    expect(a.Vh).toBeCloseTo(26.0112384, 6);
  });
  it('con h′/t ≤ 30 usa la rama parabólica de Re', () => {
    // diagonal 5000 (3000 × 4000), t = 200 → h′/t = 25, Re = 1 − (25/42)² = 0.645692
    const a = aplastamientoDiagonal({ L: 4000, h: 3000, t: 200, fm: 8 });
    expect(a.esbeltez).toBeCloseTo(25, 9);
    expect(a.esbeltezAdmisible).toBe(true);
    expect(a.Re).toBeCloseTo(1 - (25 / 42) ** 2, 10);
  });
});

describe('D.11.4.3, D.11.1.4, D.11.2.2', () => {
  it('un cuarto del cortante del muro en el 25 % de la longitud del miembro', () => {
    expect(cortanteMinimoMiembroPortico(48)).toBe(12);
    expect(zonaCortanteMiembro(3600)).toBe(900);
  });
  it('espesor ≥ 120 mm y R0 ≤ 2.0', () => {
    expect(cumpleEspesorMinimo(120)).toBe(true);
    expect(cumpleEspesorMinimo(119.9)).toBe(false);
    expect(r0Admisible(2)).toBe(true);
    expect(r0Admisible(2.1)).toBe(false);
  });
});

describe('verificarMuroDiafragma', () => {
  const base = { tipo: 'maciza' as const, L: 3600, h: 2700, t: 120, fm: 5, Vu: 40 };
  it('gobierna el aplastamiento (52.0 kN < 75.6 kN)', () => {
    const r = verificarMuroDiafragma(base);
    expect(r.Am).toBe(432000);
    expect(r.cortante.Vr).toBeCloseTo(75.6, 9);
    expect(r.aplastamiento.Vh).toBeCloseTo(52.0224768, 6);
    expect(r.Vmax).toBeCloseTo(52.0224768, 6);
    expect(r.gobierna).toBe('aplastamiento');
    expect(r.cortante.razon).toBeCloseTo(40 / 75.6, 9);
    expect(r.aplastamiento.razon).toBeCloseTo(40 / 52.0224768, 9);
    expect(r.Vminimo).toBe(10);
    expect(r.espesorCumple).toBe(true);
    expect(r.r0Cumple).toBeNull();
    expect(r.cumple).toBe(true);
  });
  it('Vu = 60 kN excede la resistencia de aplastamiento', () => {
    const r = verificarMuroDiafragma({ ...base, Vu: 60 });
    expect(r.aplastamiento.cumple).toBe(false);
    expect(r.cortante.cumple).toBe(true);
    expect(r.cumple).toBe(false);
  });
  it('unidades de perforación horizontal: gobierna el cortante', () => {
    const r = verificarMuroDiafragma({ ...base, tipo: 'perforacion-horizontal', Vu: 30 });
    expect(r.cortante.Vr).toBeCloseTo(32.4, 9);
    expect(r.gobierna).toBe('cortante');
  });
  it('R0 = 2.5 incumple D.11.2.2', () => {
    const r = verificarMuroDiafragma({ ...base, R0: 2.5 });
    expect(r.r0Cumple).toBe(false);
    expect(r.cumple).toBe(false);
  });
});
