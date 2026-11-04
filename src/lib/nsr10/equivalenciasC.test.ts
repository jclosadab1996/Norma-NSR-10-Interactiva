import { describe, expect, it } from 'vitest';
import {
  aMpa,
  CONVERSION_EXACTA,
  CONVERSION_NORMA,
  COEFICIENTES_C_F,
  coeficienteEsperado,
  desdeMpa,
  desviacionRelativa,
  ESFUERZOS_REFERENCIA,
  nbEnSistema,
  vcSimpleEnSistema,
} from './equivalenciasC';

describe('conversión de esfuerzos', () => {
  it('norma: 1 MPa = 10 kgf/cm² = 142.2 psi', () => {
    expect(desdeMpa(1, 'mks', false)).toBe(10);
    expect(desdeMpa(1, 'ing', false)).toBe(142.2);
    expect(CONVERSION_NORMA.mpaAKgfCm2).toBe(10);
  });
  it('exacta: 28 MPa ≈ 285.5 kgf/cm² ≈ 4061 psi', () => {
    expect(desdeMpa(28, 'mks')).toBeCloseTo(285.52, 1);
    expect(desdeMpa(28, 'ing')).toBeCloseTo(4061.1, 0);
    expect(aMpa(desdeMpa(28, 'ing'), 'ing')).toBeCloseTo(28, 10);
    expect(CONVERSION_EXACTA.mpaAPsi).toBeGreaterThan(CONVERSION_NORMA.mpaAPsi);
  });
  it('tabla de esfuerzos de C-251: todas las filas salvo f′c = 40 MPa coinciden con la conversión (±3 %)', () => {
    for (const f of ESFUERZOS_REFERENCIA) {
      const dKgf = f.kgfCm2 / desdeMpa(f.mpa, 'mks') - 1;
      const dPsi = f.psi / desdeMpa(f.mpa, 'ing') - 1;
      if (f.mpa === 40) {
        expect(Math.abs(dPsi)).toBeGreaterThan(0.03); // 6000 psi son 41.4 MPa y 420 kgf/cm² son 42 MPa (con 10 kgf/cm² por MPa), no 40 MPa
        continue;
      }
      expect(Math.abs(dKgf)).toBeLessThan(0.03);
      expect(Math.abs(dPsi)).toBeLessThan(0.03);
    }
  });
});

describe('coeficientes de C-F: las columnas mks e inglés equivalen a SI salvo redondeo', () => {
  it('hay más de 100 coeficientes registrados', () => {
    expect(COEFICIENTES_C_F.length).toBeGreaterThan(100);
  });
  it('cada coeficiente impreso difiere menos de 6 % del convertido', () => {
    for (const c of COEFICIENTES_C_F) {
      for (const s of ['mks', 'ing'] as const) {
        const d = desviacionRelativa(c, s);
        expect(Math.abs(d), `${c.ref} ${c.termino} (${s}) desviación ${(d * 100).toFixed(1)} %`).toBeLessThan(0.06);
      }
    }
  });
  it('desviación mediana menor de 1.5 %', () => {
    const ds = COEFICIENTES_C_F.flatMap((c) => [Math.abs(desviacionRelativa(c, 'mks')), Math.abs(desviacionRelativa(c, 'ing'))]).sort((a, b) => a - b);
    expect(ds[Math.floor(ds.length / 2)]).toBeLessThan(0.015);
  });
  it('verificaciones a mano: 0.17 → 0.17 × √10.197 = 0.543 (mks) y 0.17 × √145.04 = 2.047 (ing)', () => {
    const c = COEFICIENTES_C_F.find((x) => x.ref === 'C.11-3')!;
    expect(coeficienteEsperado(c, 'mks')).toBeCloseTo(0.17 * Math.sqrt(10.19716), 10);
    expect(coeficienteEsperado(c, 'mks')).toBeCloseTo(0.543, 3);
    expect(coeficienteEsperado(c, 'ing')).toBeCloseTo(2.047, 3);
  });
  it('anomalías conocidas: 0.66√f′c aparece como 2.2, 2.1 y 2.12 kgf/cm²', () => {
    const vals = COEFICIENTES_C_F.filter((c) => c.si === 0.66 && c.ing === 8).map((c) => c.mks);
    expect(new Set(vals)).toEqual(new Set([2.2, 2, 2.1, 2.12]));
  });
  it('anomalía: √f′c ≤ 27 (C.11.1.2) frente a 26.5 (C.12.1.2) para el mismo 100 psi', () => {
    const a = COEFICIENTES_C_F.find((c) => c.ref === 'C.11.1.2')!;
    const b = COEFICIENTES_C_F.find((c) => c.ref === 'C.12.1.2')!;
    expect([a.mks, b.mks]).toEqual([27, 26.5]);
    expect(a.ing).toBe(b.ing);
  });
});

describe('evaluación de una misma ecuación en los tres sistemas', () => {
  it('Vc = 0.17λ√f′c bw d con f′c = 28 MPa, bw = 300, d = 500: SI 134.9 kN (0.17 × 5.2915 × 150000)', () => {
    expect(vcSimpleEnSistema('si', 28, 300, 500)).toBeCloseTo(0.17 * Math.sqrt(28) * 150000 / 1000, 6);
    expect(vcSimpleEnSistema('si', 28, 300, 500)).toBeCloseTo(134.93, 2);
  });
  it('los tres sistemas coinciden en 5 % (diferencia por redondeo de coeficientes)', () => {
    const si = vcSimpleEnSistema('si', 28, 300, 500);
    for (const s of ['mks', 'ing'] as const) {
      expect(Math.abs(vcSimpleEnSistema(s, 28, 300, 500) / si - 1)).toBeLessThan(0.05);
    }
  });
  it('Nb de C-D-7 con kc = 10 (SI y mks) y 24 (inglés): coinciden en 3 %', () => {
    const si = nbEnSistema('si', 28, 200);
    expect(si).toBeCloseTo(149.666, 3);
    expect(Math.abs(nbEnSistema('mks', 28, 200) / si - 1)).toBeLessThan(0.03);
    expect(Math.abs(nbEnSistema('ing', 28, 200) / si - 1)).toBeLessThan(0.03);
  });
});
