import { describe, expect, it } from 'vitest';
import {
  CASOS_C139,
  COEF_UNA_DIRECCION,
  TABLA_C13633_VANO_FINAL,
  TABLA_C13641_NEG_INTERIOR,
  TABLA_C13642_NEG_EXTERIOR,
  TABLA_C13644_POSITIVO,
  TABLA_C1391_MOMENTO_NEGATIVO,
  TABLA_C1392_POSITIVO_CARGA_MUERTA,
  TABLA_C1393_POSITIVO_CARGA_VIVA,
  TABLA_C1394_REPARTO_CARGA,
} from './losasConcreto';

describe('Tablas C.13.9-1 a C.13.9-4 (PDF p.435–438)', () => {
  const tablas = [TABLA_C1391_MOMENTO_NEGATIVO, TABLA_C1392_POSITIVO_CARGA_MUERTA, TABLA_C1393_POSITIVO_CARGA_VIVA, TABLA_C1394_REPARTO_CARGA];

  it('tienen 11 filas de m = 1.00 a 0.50 y 9 casos por dirección', () => {
    for (const t of tablas) {
      expect(t).toHaveLength(11);
      t.forEach((f, i) => {
        expect(f.m).toBeCloseTo(1 - 0.05 * i, 10);
        expect(f.a).toHaveLength(9);
        expect(f.b).toHaveLength(9);
      });
    }
  });

  it('hay 9 casos descritos', () => {
    expect(CASOS_C139.map((c) => c.caso)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('Tabla C.13.9-1: celdas vacías según los bordes continuos de cada caso', () => {
    const f = TABLA_C1391_MOMENTO_NEGATIVO[0];
    // caso 1 sin momento negativo; caso 3 y 7 solo Cb; casos 5 y 6 solo Ca.
    expect(f.a[0]).toBeNull();
    expect(f.b[0]).toBeNull();
    expect(f.a[2]).toBeNull();
    expect(f.b[2]).toBe(0.076);
    expect(f.a[6]).toBeNull();
    expect(f.b[6]).toBe(0.071);
    expect(f.a[4]).toBe(0.075);
    expect(f.b[4]).toBeNull();
    expect(f.a[5]).toBe(0.071);
    expect(f.b[5]).toBeNull();
    // valores de las esquinas de la tabla
    expect(TABLA_C1391_MOMENTO_NEGATIVO[10].a[1]).toBe(0.086);
    expect(TABLA_C1391_MOMENTO_NEGATIVO[10].b[8]).toBe(0.003);
  });

  it('Tabla C.13.9-1: casos 8 y 9 son simétricos (Ca ↔ Cb) en m = 1.00', () => {
    const f = TABLA_C1391_MOMENTO_NEGATIVO[0];
    expect(f.a[7]).toBe(f.b[8]);
    expect(f.b[7]).toBe(f.a[8]);
  });

  it('Tabla C.13.9-2 y -3: valores de verificación del PDF', () => {
    expect(TABLA_C1392_POSITIVO_CARGA_MUERTA[0].a[1]).toBe(0.018);
    expect(TABLA_C1392_POSITIVO_CARGA_MUERTA[10].a[0]).toBe(0.095);
    expect(TABLA_C1392_POSITIVO_CARGA_MUERTA[10].b[4]).toBe(0.001);
    expect(TABLA_C1393_POSITIVO_CARGA_VIVA[0].a[1]).toBe(0.027);
    expect(TABLA_C1393_POSITIVO_CARGA_VIVA[5].a[6]).toBe(0.056);
    expect(TABLA_C1393_POSITIVO_CARGA_VIVA[10].b[8]).toBe(0.004);
  });

  it('Tabla C.13.9-4: qa + qb = 1 (±0.01 por redondeo) en todas las celdas', () => {
    for (const f of TABLA_C1394_REPARTO_CARGA) {
      for (let c = 0; c < 9; c++) {
        expect(Math.abs((f.a[c] as number) + (f.b[c] as number) - 1)).toBeLessThanOrEqual(0.0101);
      }
    }
    expect(TABLA_C1394_REPARTO_CARGA[0].a).toEqual([0.5, 0.5, 0.17, 0.5, 0.83, 0.71, 0.29, 0.33, 0.67]);
  });

  it('coherencia estática (autor): positivo(D) + negativo/2 ≈ qa·(1/8) en el caso 2, m = 1.00 con q = D', () => {
    // Para el panel interior con carga total uniforme: 0.018 + 0.045 = 0.063 ≈ 0.5 · 1/8 = 0.0625.
    const suma = TABLA_C1392_POSITIVO_CARGA_MUERTA[0].a[1]! + (TABLA_C1391_MOMENTO_NEGATIVO[0].a[1] as number);
    expect(suma).toBeCloseTo(0.0625, 2);
  });
});

describe('Tablas del método de diseño directo (PDF p.428–429)', () => {
  it('C.13.6.3.3: filas de las cinco columnas', () => {
    expect(TABLA_C13633_VANO_FINAL.map((c) => c.negInterior)).toEqual([0.75, 0.7, 0.7, 0.7, 0.65]);
    expect(TABLA_C13633_VANO_FINAL.map((c) => c.positivo)).toEqual([0.63, 0.57, 0.52, 0.5, 0.35]);
    expect(TABLA_C13633_VANO_FINAL.map((c) => c.negExterior)).toEqual([0, 0.16, 0.26, 0.3, 0.65]);
  });

  it('C.13.6.3.3: positivo + promedio de negativos ≈ 1 (1.005 en la columna 1 por redondeo)', () => {
    for (const c of TABLA_C13633_VANO_FINAL) {
      expect(c.positivo + (c.negInterior + c.negExterior) / 2).toBeCloseTo(1, 1);
    }
  });

  it('C.13.6.4: tablas de porcentajes', () => {
    expect(TABLA_C13641_NEG_INTERIOR).toEqual({ alfa0: [75, 75, 75], alfa1: [90, 75, 45] });
    expect(TABLA_C13644_POSITIVO).toEqual({ alfa0: [60, 60, 60], alfa1: [90, 75, 45] });
    expect(TABLA_C13642_NEG_EXTERIOR.alfa0.bt0).toEqual([100, 100, 100]);
    expect(TABLA_C13642_NEG_EXTERIOR.alfa1.bt25).toEqual([90, 75, 45]);
  });

  it('C.13.5.5.3: coeficientes de losas en una dirección', () => {
    expect(COEF_UNA_DIRECCION.positivoExtremoNoRestringido).toBe(11);
    expect(COEF_UNA_DIRECCION.positivoInterior).toBe(16);
    expect(COEF_UNA_DIRECCION.negativoExteriorVigaBorde).toBe(24);
    expect(COEF_UNA_DIRECCION.cortantePrimerApoyoInterior).toBe(1.15);
  });
});
