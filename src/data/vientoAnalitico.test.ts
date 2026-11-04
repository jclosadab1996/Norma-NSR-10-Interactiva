import { describe, expect, it } from 'vitest';
import {
  PARAMETROS_TOPOGRAFIA,
  REGIONES_VELOCIDAD_BASICA,
  TABLA_B651_FACTOR_IMPORTANCIA,
  TABLA_B652_CONSTANTES,
  TABLA_B653_KZ,
  TABLA_B654_KD,
  TABLA_K1_EXPOSICION_C,
  TABLA_K2,
  TABLA_K3,
} from './vientoAnalitico';

const creciente = (xs: readonly number[]) => xs.every((v, i) => i === 0 || v > xs[i - 1]);
const noDecreciente = (xs: readonly number[]) => xs.every((v, i) => i === 0 || v >= xs[i - 1]);

describe('vientoAnalitico: integridad de las tablas transcritas', () => {
  it('Figura B.6.4-1: 5 regiones con velocidades crecientes y km/h ≈ 3.6·m/s', () => {
    expect(REGIONES_VELOCIDAD_BASICA.map((r) => r.ms)).toEqual([17, 22, 28, 33, 36]);
    for (const r of REGIONES_VELOCIDAD_BASICA) expect(Math.abs(r.ms * 3.6 - r.kmh)).toBeLessThan(5);
  });

  it('Tabla B.6.5-1: 4 grupos; I ≤ II ≤ III = IV', () => {
    const t = TABLA_B651_FACTOR_IMPORTANCIA;
    expect(Object.keys(t)).toEqual(['I', 'II', 'III', 'IV']);
    expect(t.I.noHuracanes).toBeLessThan(t.II.noHuracanes);
    expect(t.III.noHuracanes).toBe(t.IV.noHuracanes);
    expect(t.II.huracanes).toBe(1);
  });

  it('Tabla B.6.5-2: 3 exposiciones, α y ᾱ coherentes con â y 1/α, zmin decreciente', () => {
    expect(Object.keys(TABLA_B652_CONSTANTES)).toEqual(['B', 'C', 'D']);
    for (const c of Object.values(TABLA_B652_CONSTANTES)) {
      expect(c.aHat).toBeCloseTo(1 / c.alfa, 12);
      expect(c.zg).toBeGreaterThan(200);
    }
    const { B, C, D } = TABLA_B652_CONSTANTES;
    expect([B.zmin, C.zmin, D.zmin]).toEqual([9, 4.5, 2]);
    expect([B.c, C.c, D.c]).toEqual([0.3, 0.2, 0.15]);
    expect([B.ell, C.ell, D.ell]).toEqual([97.5, 152.4, 198.1]);
    expect([B.alfaBar, C.alfaBar, D.alfaBar]).toEqual([1 / 4, 1 / 6.5, 1 / 9]);
    expect([B.bBar, C.bBar, D.bBar]).toEqual([0.45, 0.65, 0.8]);
  });

  it('Tabla B.6.5-3: 22 filas, alturas crecientes y valores no decrecientes', () => {
    expect(TABLA_B653_KZ).toHaveLength(22);
    expect(creciente(TABLA_B653_KZ.map((f) => f.z))).toBe(true);
    for (const col of ['B1', 'B2', 'C', 'D'] as const) expect(noDecreciente(TABLA_B653_KZ.map((f) => f[col]))).toBe(true);
    for (const f of TABLA_B653_KZ) {
      expect(f.B2).toBeLessThanOrEqual(f.B1);
      expect(f.B1).toBeLessThan(f.C);
      expect(f.C).toBeLessThan(f.D);
    }
    const ult = TABLA_B653_KZ[TABLA_B653_KZ.length - 1];
    expect([ult.z, ult.B1, ult.C, ult.D]).toEqual([152, 1.56, 1.77, 1.89]);
  });

  it('Tabla B.6.5-4: 10 filas, valores entre 0.85 y 0.95', () => {
    expect(TABLA_B654_KD).toHaveLength(10);
    expect(new Set(TABLA_B654_KD.map((f) => f.id)).size).toBe(10);
    for (const f of TABLA_B654_KD) {
      expect(f.kd).toBeGreaterThanOrEqual(0.85);
      expect(f.kd).toBeLessThanOrEqual(0.95);
    }
  });

  it('Figura B.6.5-1: tablas K1, K2, K3 con filas y monotonía correctas', () => {
    expect(TABLA_K1_EXPOSICION_C).toHaveLength(7);
    expect(TABLA_K2).toHaveLength(9);
    expect(TABLA_K3).toHaveLength(13);
    expect(creciente(TABLA_K1_EXPOSICION_C.map((f) => f[0]))).toBe(true);
    expect(creciente(TABLA_K2.map((f) => f[0]))).toBe(true);
    expect(creciente(TABLA_K3.map((f) => f[0]))).toBe(true);
    for (let col = 1; col <= 3; col++) {
      expect(noDecreciente(TABLA_K1_EXPOSICION_C.map((f) => f[col]))).toBe(true);
      expect(noDecreciente(TABLA_K3.map((f) => -f[col]))).toBe(true);
    }
    expect(noDecreciente(TABLA_K2.map((f) => -f[1]))).toBe(true);
    expect(noDecreciente(TABLA_K2.map((f) => -f[2]))).toBe(true);
  });

  it('Figura B.6.5-1: K1 de la tabla = coeficiente exposición C × H/Lh (±0.006)', () => {
    const forma = ['loma2D', 'escarpe2D', 'colina3D'] as const;
    for (const [hlh, ...vals] of TABLA_K1_EXPOSICION_C) {
      vals.forEach((v, i) => expect(Math.abs(v - PARAMETROS_TOPOGRAFIA[forma[i]].k1PorHLh.C * hlh)).toBeLessThan(0.006));
    }
  });

  it('Figura B.6.5-1: parámetros de colinas (γ, μ, K1/(H/Lh) crecientes B<C<D)', () => {
    for (const p of Object.values(PARAMETROS_TOPOGRAFIA)) {
      expect(p.k1PorHLh.B).toBeLessThan(p.k1PorHLh.C);
      expect(p.k1PorHLh.C).toBeLessThan(p.k1PorHLh.D);
    }
    expect(PARAMETROS_TOPOGRAFIA.loma2D.gamma).toBe(3);
    expect(PARAMETROS_TOPOGRAFIA.escarpe2D.gamma).toBe(2.5);
    expect(PARAMETROS_TOPOGRAFIA.colina3D.gamma).toBe(4);
    expect(PARAMETROS_TOPOGRAFIA.escarpe2D.muSotavento).toBe(4);
  });
});
