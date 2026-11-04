import { describe, expect, it } from 'vitest';
import {
  P0,
  PnMax,
  aplicaLimiteEpsT,
  armaduraPerimetral,
  curvaInteraccion,
  phiMnParaCarga,
  phiPnMax,
  puntoBalanceado,
  puntoControladoTraccion,
  puntoFlexionPura,
  puntoP0,
  verificarPunto,
  type EntradaColumna,
} from './columnaInteraccion';

// Columna 400×400, f′c = 28, fy = 420, 8 barras No. 7 (387 mm² c/u, Tabla C.3.5.3-2): 3 en cada cara de 400 mm y 2 intermedias; d′ = 60 mm.
const arm = armaduraPerimetral(400, 60, 3, 3, 387);
const col: EntradaColumna = { b: 400, h: 400, fc: 28, fy: 420, capas: arm.capas };

describe('Armadura perimetral', () => {
  it('3 filas con 3, 2 y 3 barras = 8 barras; Ast = 3096 mm²; filas en y = 60, 200, 340', () => {
    expect(arm.nBarras).toBe(8);
    expect(arm.Ast).toBe(3096);
    expect(arm.capas.map((c) => c.y)).toEqual([60, 200, 340]);
    expect(arm.capas.map((c) => c.area)).toEqual([1161, 774, 1161]);
  });
  it('4 filas: 3+2+2+3 = 10 barras', () => {
    expect(armaduraPerimetral(500, 60, 3, 4, 387).nBarras).toBe(10);
  });
});

describe('Resistencia axial (C.10.3.6, Ecs. C.10-1 y C.10-2)', () => {
  it('P0 = 0.85 f′c (Ag − Ast) + fy Ast = 5034.64 kN', () => {
    expect(P0(col)).toBeCloseTo((0.85 * 28 * (160000 - 3096) + 420 * 3096) / 1000, 6);
    expect(P0(col)).toBeCloseTo(5034.64, 2);
  });
  it('estribos: φPn,max = 0.75·0.65·P0 = 2454.38 kN', () => {
    expect(PnMax(col)).toBeCloseTo(0.75 * P0(col), 8);
    expect(phiPnMax(col)).toBeCloseTo(0.65 * 0.75 * P0(col), 8);
    expect(phiPnMax(col)).toBeCloseTo(2454.38, 2);
  });
  it('espiral: φPn,max = 0.75·0.80·P0 = 0.60 P0', () => {
    expect(phiPnMax({ ...col, espiral: true })).toBeCloseTo(0.6 * P0(col), 8);
  });
});

describe('Puntos de la curva por compatibilidad de deformaciones (verificados a mano)', () => {
  it('balanceado: c = 200 mm, Pn = 1590.77 kN, Mn = 318.78 kN·m', () => {
    // a = 170: Cc = 1 618 400 N; capa superior en fluencia (420 − 23.8 MPa netos × 1161); capa media ε = 0; capa inferior en −fy.
    const p = puntoBalanceado(col);
    expect(p.c).toBeCloseTo(200, 8);
    expect(p.epsT).toBeCloseTo(0.0021, 10);
    expect(p.Pn).toBeCloseTo((1_618_400 + 1161 * (420 - 23.8) - 1161 * 420) / 1000, 3);
    expect(p.Pn).toBeCloseTo(1590.77, 2);
    expect(p.Mn).toBeCloseTo(318.78, 2);
    expect(p.phi).toBeCloseTo(0.65 + (0.25 * (0.0021 - 0.002)) / 0.003, 8);
  });
  it('εt = 0.005: c = 127.5 mm y φ = 0.90', () => {
    const p = puntoControladoTraccion(col);
    expect(p.c).toBeCloseTo(127.5, 8);
    expect(p.phi).toBe(0.9);
    expect(p.Pn).toBeCloseTo(621.2, 1);
  });
  it('flexión pura: Pn = 0 y Mn ≈ 198.8 kN·m, φ = 0.90', () => {
    const p = puntoFlexionPura(col)!;
    expect(Math.abs(p.Pn)).toBeLessThan(1e-4);
    expect(p.Mn).toBeCloseTo(198.79, 1);
    expect(p.phi).toBe(0.9);
    expect(p.phiMn).toBeCloseTo(0.9 * p.Mn, 8);
  });
  it('P0 tiene Mn = 0 (sección simétrica) y φ = 0.65', () => {
    const p = puntoP0(col);
    expect(p.Mn).toBe(0);
    expect(p.phi).toBe(0.65);
  });
});

describe('Curva completa', () => {
  const cv = curvaInteraccion(col);
  it('empieza en P0 y termina en tracción pura (−fy Ast = −1300.3 kN)', () => {
    expect(cv.puntos[0].Pn).toBeCloseTo(P0(col), 6);
    expect(cv.puntos[cv.puntos.length - 1].Pn).toBeCloseTo(-1300.32, 2);
  });
  it('Pn no aumenta a lo largo de la curva y Mn máximo es cercano al punto balanceado', () => {
    for (let i = 1; i < cv.puntos.length; i++) expect(cv.puntos[i].Pn).toBeLessThanOrEqual(cv.puntos[i - 1].Pn + 1e-6);
    const mMax = Math.max(...cv.puntos.map((p) => p.Mn));
    expect(mMax).toBeGreaterThanOrEqual(cv.balanceado.Mn - 1e-6);
    expect(mMax).toBeLessThan(cv.balanceado.Mn * 1.15);
  });
  it('φ varía entre 0.65 y 0.90 y la curva de diseño se recorta en φPn,max', () => {
    for (const p of cv.puntos) {
      expect(p.phi).toBeGreaterThanOrEqual(0.65 - 1e-12);
      expect(p.phi).toBeLessThanOrEqual(0.9 + 1e-12);
      expect(p.phiPn).toBeLessThanOrEqual(cv.phiPnMax + 1e-9);
    }
    expect(cv.puntos[0].phiPn).toBeCloseTo(cv.phiPnMax, 6);
  });
  it('φMn con φPn = 0 coincide con la flexión pura', () => {
    expect(phiMnParaCarga(cv.puntos, 0)!).toBeCloseTo(0.9 * cv.flexionPura!.Mn, 2);
  });
  it('en la carga del punto balanceado la curva da al menos φ·Mn', () => {
    expect(phiMnParaCarga(cv.puntos, cv.balanceado.phiPn)!).toBeGreaterThanOrEqual(cv.balanceado.phiMn - 1e-6);
  });
});

describe('Verificación de (Pu, Mu)', () => {
  const cv = curvaInteraccion(col);
  it('(1500 kN, 150 kN·m) cumple; (1500, 250) no', () => {
    const ok = verificarPunto(cv, 1500, 150);
    expect(ok.cumple).toBe(true);
    expect(ok.excentricidad).toBeCloseTo(100, 8);
    expect(ok.razon).toBeLessThan(1);
    const mal = verificarPunto(cv, 1500, 250);
    expect(mal.cumple).toBe(false);
    expect(mal.motivo).toBe('Mu-excede');
    expect(mal.razon).toBeGreaterThan(1);
  });
  it('Pu mayor que φPn,max no cumple (C.10.3.6)', () => {
    const r = verificarPunto(cv, 3000, 10);
    expect(r.cumple).toBe(false);
    expect(r.motivo).toBe('Pu-excede-tope');
  });
  it('tracción mayor que la de diseño no cumple', () => {
    expect(verificarPunto(cv, -2000, 0).motivo).toBe('Pu-excede-traccion');
  });
  it('límite de εt solo si Pu < 0.10 f′c Ag (C.10.3.5)', () => {
    expect(aplicaLimiteEpsT(100, 28, 160000)).toBe(true);
    expect(aplicaLimiteEpsT(500, 28, 160000)).toBe(false);
  });
});
