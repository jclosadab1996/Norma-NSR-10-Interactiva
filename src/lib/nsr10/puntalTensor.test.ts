import { describe, expect, it } from 'vitest';
import {
  anchoPuntalEnNodo,
  anguloPermitido,
  areaTensorRequerida,
  areaZonaNodal,
  betaN,
  betaS,
  cerchaVigaAltaCargaCentral,
  deltaFpPermitido,
  fceEfectiva,
  phiPuntalTensor,
  resistenciaPuntal,
  resistenciaPuntalReforzado,
  resistenciaTensor,
  resistenciaZonaNodal,
  sumatoriaRefuerzoPuntal,
  verificarRefuerzoPuntal,
  verificarResistencia,
} from './puntalTensor';

describe('Apéndice C-A: factores βs y βn', () => {
  it('βs de C-A.3.2.1 a C-A.3.2.4 (C-224)', () => {
    expect(betaS('uniforme')).toBe(1.0);
    expect(betaS('botella-con-refuerzo')).toBe(0.75);
    expect(betaS('botella-sin-refuerzo')).toBe(0.6);
    expect(betaS('traccion')).toBe(0.4);
    expect(betaS('otros')).toBe(0.6);
  });
  it('0.60λ solo en los casos (b) y 3.2.4; λ no afecta a 0.75 ni a 0.40', () => {
    expect(betaS('botella-sin-refuerzo', 0.75)).toBeCloseTo(0.45, 12);
    expect(betaS('otros', 0.85)).toBeCloseTo(0.51, 12);
    expect(betaS('botella-con-refuerzo', 0.75)).toBe(0.75);
    expect(betaS('traccion', 0.75)).toBe(0.4);
    expect(() => betaS('otros', 1.2)).toThrow();
  });
  it('βn de C-A.5.2.1 a C-A.5.2.3 (C-226)', () => {
    expect(betaN('puntales-apoyos')).toBe(1.0);
    expect(betaN('un-tensor')).toBe(0.8);
    expect(betaN('dos-o-mas-tensores')).toBe(0.6);
  });
  it('Ecs. C-A-3 y C-A-8: fce = 0.85 β f′c', () => {
    expect(fceEfectiva(28, 0.75)).toBeCloseTo(17.85, 12); // 0.85·0.75·28 a mano
    expect(fceEfectiva(28, 0.8)).toBeCloseTo(19.04, 12);
    expect(fceEfectiva(28, 1)).toBeCloseTo(23.8, 12);
    expect(fceEfectiva(21, 0.6)).toBeCloseTo(10.71, 12);
  });
});

describe('Apéndice C-A: resistencia de puntales (C-A-2, C-A-5)', () => {
  it('puntal de botella con refuerzo, Acs = 75 000 mm², f′c = 28: Fns = 17.85 × 75 = 1338.75 kN', () => {
    const r = resistenciaPuntal({
      fc: 28,
      tipo: 'botella-con-refuerzo',
      extremos: [
        { Acs: 75000, nodo: 'puntales-apoyos' },
        { Acs: 75000, nodo: 'un-tensor' },
      ],
    });
    expect(r.fceCuerpo).toBeCloseTo(17.85, 12);
    expect(r.fceNodos[0]).toBeCloseTo(23.8, 12);
    expect(r.fceNodos[1]).toBeCloseTo(19.04, 12);
    expect(r.Fns).toBeCloseTo(1338.75, 9);
    expect(r.gobiernaNodo).toBe(false);
  });
  it('si un nodo ancla dos tensores, gobierna la zona nodal (βn = 0.60): fce = 14.28', () => {
    const r = resistenciaPuntal({
      fc: 28,
      tipo: 'botella-con-refuerzo',
      extremos: [
        { Acs: 75000, nodo: 'puntales-apoyos' },
        { Acs: 75000, nodo: 'dos-o-mas-tensores' },
      ],
    });
    expect(r.fceExtremos[1]).toBeCloseTo(14.28, 12);
    expect(r.Fns).toBeCloseTo(1071, 9);
    expect(r.extremoGobierna).toBe(1);
    expect(r.gobiernaNodo).toBe(true);
  });
  it('toma el extremo de menor área', () => {
    const r = resistenciaPuntal({
      fc: 28,
      tipo: 'uniforme',
      extremos: [
        { Acs: 90000, nodo: 'puntales-apoyos' },
        { Acs: 60000, nodo: 'puntales-apoyos' },
      ],
    });
    expect(r.Fns).toBeCloseTo(23.8 * 60, 9);
    expect(r.extremoGobierna).toBe(1);
  });
  it('Ec. C-A-5: Fns = fce Acs + A′s f′s', () => {
    // 1338.75 + 1020 mm² × 420 MPa / 1000 = 1338.75 + 428.4
    expect(resistenciaPuntalReforzado(1338.75, 1020, 420)).toBeCloseTo(1767.15, 9);
  });
});

describe('Apéndice C-A: refuerzo del puntal de botella (C-A-4)', () => {
  const capas = [
    { Asi: 258, si: 200, alfa: 60 },
    { Asi: 258, si: 250, alfa: 30 },
  ];
  it('Σ (Asi/(bs si)) sen αi con bs = 300 mm', () => {
    // 258/60000·sen60 + 258/75000·sen30 = 0.003723909 + 0.00172
    expect(sumatoriaRefuerzoPuntal(capas, 300)).toBeCloseTo(0.005443909, 8);
  });
  it('cumple 0.003 con f′c ≤ 40 MPa y dos direcciones', () => {
    const v = verificarRefuerzoPuntal(capas, 300, 28);
    expect(v.cumpleSuma).toBe(true);
    expect(v.cumple).toBe(true);
    expect(v.alfaUnaDireccionOk).toBeNull();
  });
  it('una sola dirección exige α ≥ 40°; f′c > 40 invalida la Ec. C-A-4', () => {
    const una = verificarRefuerzoPuntal([{ Asi: 600, si: 100, alfa: 35 }], 300, 28); // 600/30000·sen35 = 0.01147
    expect(una.cumpleSuma).toBe(true);
    expect(una.alfaUnaDireccionOk).toBe(false);
    expect(una.cumple).toBe(false);
    expect(verificarRefuerzoPuntal([{ Asi: 600, si: 100, alfa: 45 }], 300, 28).cumple).toBe(true);
    expect(verificarRefuerzoPuntal(capas, 300, 45).cumple).toBe(false);
  });
  it('no cumple si la suma es menor de 0.003', () => {
    const v = verificarRefuerzoPuntal(
      [
        { Asi: 100, si: 300, alfa: 45 },
        { Asi: 100, si: 300, alfa: 45 },
      ],
      300,
      28,
    ); // 2·(100/90000)·0.7071 = 0.001571
    expect(v.suma).toBeCloseTo(0.0015713, 6);
    expect(v.cumple).toBe(false);
  });
});

describe('Apéndice C-A: tensores (C-A-6) y zonas nodales (C-A-7)', () => {
  it('Δfp permitido: 420 adherido, 70 no adherido', () => {
    expect(deltaFpPermitido(true)).toBe(420);
    expect(deltaFpPermitido(false)).toBe(70);
  });
  it('tensor no preesforzado: 8 No. 8 = 4080 mm², fy = 420 → 1713.6 kN', () => {
    expect(resistenciaTensor({ Ats: 4080, fy: 420 }).Fnt).toBeCloseTo(1713.6, 9);
  });
  it('tensor con preesfuerzo: (fse + Δfp) no excede fpy', () => {
    const a = resistenciaTensor({ Ats: 0, fy: 420, Atp: 1000, fse: 1000, dfp: 420, fpy: 1520 });
    expect(a.esfuerzoPreesfuerzo).toBe(1420);
    expect(a.Fnt).toBeCloseTo(1420, 9);
    const b = resistenciaTensor({ Ats: 500, fy: 420, Atp: 1000, fse: 1000, dfp: 420, fpy: 1300 });
    expect(b.esfuerzoPreesfuerzo).toBe(1300);
    expect(b.Fnt).toBeCloseTo(210 + 1300, 9);
    expect(() => resistenciaTensor({ Ats: 0, fy: 420, Atp: 1000 })).toThrow();
  });
  it('área de tensor requerida: Fu = 1260 kN, φ = 0.75, fy = 420 → 4000 mm²', () => {
    expect(areaTensorRequerida(1260, 0.75, 420)).toBeCloseTo(4000, 9);
  });
  it('zona nodal que ancla un tensor: fce = 19.04, Anz = 60 000 mm² → Fnn = 1142.4 kN', () => {
    const r = resistenciaZonaNodal(28, 'un-tensor', 60000);
    expect(r.fce).toBeCloseTo(19.04, 12);
    expect(r.Fnn).toBeCloseTo(1142.4, 9);
    expect(areaZonaNodal(80000, 60000)).toBe(60000);
  });
});

describe('Apéndice C-A: verificación y geometría', () => {
  it('Ec. C-A-1: φFn ≥ Fu', () => {
    const v = verificarResistencia(0.75, 1000, 700);
    expect(v.phiFn).toBe(750);
    expect(v.razon).toBeCloseTo(700 / 750, 12);
    expect(v.cumple).toBe(true);
    expect(verificarResistencia(0.75, 1000, 800).cumple).toBe(false);
  });
  it('φ del modelo: 0.75 (C.9.3.2.6) o 0.85 (C-C.9.3.2.6)', () => {
    expect(phiPuntalTensor()).toBe(0.75);
    expect(phiPuntalTensor('apendiceCC')).toBe(0.85);
  });
  it('ángulo mínimo 25° (C-A.2.5)', () => {
    expect(anguloPermitido(25)).toBe(true);
    expect(anguloPermitido(24.9)).toBe(false);
  });
  it('ancho del puntal en el nodo (auxiliar): lb = 200, wt = 150, θ = 45° → 350·0.7071 = 247.49 mm', () => {
    expect(anchoPuntalEnNodo(200, 150, 45)).toBeCloseTo(350 * Math.SQRT1_2, 9);
    expect(anchoPuntalEnNodo(300, 0, 90)).toBeCloseTo(300, 9); // puntal vertical: todo el apoyo
  });
  it('cercha de viga alta (auxiliar): P = 1800 kN, L = 2800 mm, z = 1000 mm', () => {
    const c = cerchaVigaAltaCargaCentral(1800, 2800, 1000);
    expect(c.reaccion).toBe(900);
    expect(c.theta).toBeCloseTo(35.5377, 3); // atan(1000/1400)
    expect(c.tensor).toBeCloseTo(1260, 9); // P L /(4 z) = 1800·2800/4000
    expect(c.puntal).toBeCloseTo((900 * Math.hypot(1400, 1000)) / 1000, 9); // 1548.42
    expect(c.anguloOk).toBe(true);
    expect(cerchaVigaAltaCargaCentral(1000, 4000, 500).anguloOk).toBe(false); // atan(500/2000) = 14°
  });
});
