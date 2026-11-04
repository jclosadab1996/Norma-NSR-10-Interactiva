import { describe, expect, it } from 'vitest';
import {
  alMin,
  alTorsion,
  atSobreS,
  avMas2AtMin,
  diametroMinLongitudinalTorsion,
  disenoTorsionYCortante,
  propiedadesRectangular,
  separacionMaxTorsion,
  thetaPorDefecto,
  tnTorsion,
  torsionMaximaRedistribuida,
  umbralTorsion,
  verificarSeccionTorsion,
} from './torsion';

const R28 = Math.sqrt(28);

// Viga 300 × 500, recubrimiento libre 40 mm, estribo No. 3 (9.5 mm), f′c = 28 MPa.
const geo = propiedadesRectangular({ b: 300, h: 500, recubrimiento: 40, dEstribo: 9.5 });

describe('propiedades geométricas', () => {
  it('Acp, pcp, x0, y0, Aoh, ph y Ao = 0.85 Aoh', () => {
    expect(geo.Acp).toBe(150000);
    expect(geo.pcp).toBe(1600);
    expect(geo.x0).toBeCloseTo(210.5, 9);
    expect(geo.y0).toBeCloseTo(410.5, 9);
    expect(geo.Aoh).toBeCloseTo(210.5 * 410.5, 6); // 86 410.25
    expect(geo.ph).toBeCloseTo(1242, 9);
    expect(geo.Ao).toBeCloseTo(0.85 * 86410.25, 6);
  });
  it('rechaza recubrimientos imposibles', () => {
    expect(() => propiedadesRectangular({ b: 100, h: 500, recubrimiento: 60, dEstribo: 10 })).toThrow();
  });
});

describe('umbral de torsión (C.11.5.1)', () => {
  it('no preesforzado: φ 0.083 √f′c Acp²/pcp = 4.63 kN·m', () => {
    const t = umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp });
    expect(t).toBeCloseTo((0.75 * 0.083 * R28 * (150000 ** 2 / 1600)) / 1e6, 9);
    expect(t).toBeCloseTo(4.632, 2);
  });
  it('preesforzado: se multiplica por √(1 + fpc/(0.33 √f′c))', () => {
    const base = umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp });
    const t = umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp, tipo: 'preesforzado', fpc: 3 });
    expect(t).toBeCloseTo(base * Math.sqrt(1 + 3 / (0.33 * R28)), 9);
  });
  it('con fuerza axial: √(1 + Nu/(0.33 Ag √f′c)); tracción grande lo anula', () => {
    const base = umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp });
    const t = umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp, tipo: 'axial', Nu: 300, Ag: 150000 });
    expect(t).toBeCloseTo(base * Math.sqrt(1 + 2 / (0.33 * R28)), 9);
    expect(umbralTorsion({ fc: 28, Acp: geo.Acp, pcp: geo.pcp, tipo: 'axial', Nu: -3000, Ag: 150000 })).toBe(0);
  });
  it('redistribución: φ 0.33 √f′c Acp²/pcp = 18.4 kN·m', () => {
    const t = torsionMaximaRedistribuida({ fc: 28, Acp: geo.Acp, pcp: geo.pcp });
    expect(t).toBeCloseTo((0.75 * 0.33 * R28 * (150000 ** 2 / 1600)) / 1e6, 9);
    expect(t).toBeCloseTo(18.41, 1);
  });
});

describe('resistencia y refuerzo por torsión (C.11.5.3)', () => {
  it('At/s = Tu / (φ 2 Ao fyt cot θ) para Tu = 12 kN·m, θ = 45° → 0.2593 mm²/mm', () => {
    const ats = atSobreS({ Tu: 12, Ao: geo.Ao, fyt: 420 });
    expect(ats).toBeCloseTo(12e6 / (0.75 * 2 * 0.85 * 86410.25 * 420), 9);
    expect(ats).toBeCloseTo(0.2593, 3);
    // con s = 100 mm, At = 25.9 mm² por rama: Tn reproduce Tu/φ
    expect(tnTorsion({ Ao: geo.Ao, At: ats * 100, s: 100, fyt: 420 })).toBeCloseTo(12 / 0.75, 9);
  });
  it('θ fuera de 30°–60° se rechaza; defaults 45° y 37.5°', () => {
    expect(() => atSobreS({ Tu: 12, Ao: geo.Ao, fyt: 420, thetaGrados: 25 })).toThrow();
    expect(thetaPorDefecto(false)).toBe(45);
    expect(thetaPorDefecto(true)).toBe(37.5);
  });
  it('Aℓ = (At/s) ph (fyt/fy) cot²θ (C.11-22)', () => {
    const ats = atSobreS({ Tu: 12, Ao: geo.Ao, fyt: 420 });
    expect(alTorsion({ atSobreS: ats, ph: geo.ph, fyt: 420, fy: 420 })).toBeCloseTo(ats * 1242, 6); // ≈ 322 mm²
    // θ = 30°: cot² = 3
    expect(alTorsion({ atSobreS: 0.2, ph: 1000, fyt: 420, fy: 420, thetaGrados: 30 })).toBeCloseTo(0.2 * 1000 * 3, 6);
  });
  it('mínimos: Av + 2At (C.11-23) y Aℓ,min (C.11-24)', () => {
    expect(avMas2AtMin({ fc: 28, bw: 300, s: 100, fyt: 420 })).toBeCloseTo(Math.max((0.062 * R28 * 300 * 100) / 420, (0.35 * 300 * 100) / 420), 9);
    // At/s calculado muy pequeño → se usa 0.175 bw/fyt = 0.125 mm²/mm
    const a = alMin({ fc: 28, Acp: 150000, fy: 420, fyt: 420, ph: 1242, atSobreS: 0.05, bw: 300 });
    expect(a).toBeCloseTo(Math.max(0, (0.42 * R28 * 150000) / 420 - 0.125 * 1242), 6);
    // At/s grande → Aℓ,min = 0 (no negativo)
    expect(alMin({ fc: 28, Acp: 150000, fy: 420, fyt: 420, ph: 1242, atSobreS: 0.7, bw: 300 })).toBe(0);
  });
  it('separación máxima ph/8 y 300 mm; diámetro longitudinal ≥ 0.042 s y ≥ 10 mm', () => {
    expect(separacionMaxTorsion(1242)).toBeCloseTo(155.25, 9);
    expect(separacionMaxTorsion(3000)).toBe(300);
    expect(diametroMinLongitudinalTorsion(150)).toBe(10);
    expect(diametroMinLongitudinalTorsion(300)).toBeCloseTo(12.6, 9);
  });
});

describe('verificación de la sección (C.11-18 y C.11-19)', () => {
  it('sección maciza: √[(Vu/bw d)² + (Tu ph/1.7 Aoh²)²] ≤ φ(Vc/bw d + 0.66 √f′c)', () => {
    const Vc = (0.17 * R28 * 300 * 450) / 1000; // 121.4 kN
    const r = verificarSeccionTorsion({ Vu: 80, Tu: 12, bw: 300, d: 450, Vc, fc: 28, ph: geo.ph, Aoh: geo.Aoh });
    const tauV = 80000 / (300 * 450);
    const tauT = (12e6 * geo.ph) / (1.7 * geo.Aoh ** 2);
    expect(r.izquierdo).toBeCloseTo(Math.hypot(tauV, tauT), 9); // ≈ 1.315 MPa
    expect(r.derecho).toBeCloseTo(0.75 * ((Vc * 1000) / 135000 + 0.66 * R28), 9); // ≈ 3.294 MPa
    expect(r.cumple).toBe(true);
  });
  it('sección hueca suma los esfuerzos (C.11-19) y es más exigente', () => {
    const args = { Vu: 80, Tu: 12, bw: 300, d: 450, Vc: 121.4, fc: 28, ph: geo.ph, Aoh: geo.Aoh };
    const maciza = verificarSeccionTorsion(args);
    const hueca = verificarSeccionTorsion({ ...args, hueca: true });
    expect(hueca.izquierdo).toBeGreaterThan(maciza.izquierdo);
    expect(hueca.izquierdo).toBeCloseTo(80000 / 135000 + (12e6 * geo.ph) / (1.7 * geo.Aoh ** 2), 9);
  });
  it('detecta una sección insuficiente', () => {
    const r = verificarSeccionTorsion({ Vu: 250, Tu: 60, bw: 300, d: 450, Vc: 121.4, fc: 28, ph: geo.ph, Aoh: geo.Aoh });
    expect(r.cumple).toBe(false);
  });
});

describe('diseño combinado cortante + torsión', () => {
  it('flujo completo para Vu = 80 kN y Tu = 12 kN·m', () => {
    const Vc = (0.17 * R28 * 300 * 450) / 1000;
    const r = disenoTorsionYCortante({ b: 300, h: 500, d: 450, recubrimiento: 40, dEstribo: 9.5, fc: 28, fy: 420, fyt: 420, Vu: 80, Tu: 12, Vc });
    expect(r.requiereTorsion).toBe(true); // 12 > 4.63
    expect(r.AtS).toBeCloseTo(0.2593, 3);
    expect(r.AvS).toBeCloseTo(Math.max(0, (80 / 0.75 - Vc) * 1000) / (420 * 450), 9); // Vu/φ = 106.7 < Vc = 121.4 → 0
    expect(r.AvS).toBe(0);
    expect(r.totalPorS).toBeCloseTo(2 * r.AtS, 9);
    expect(r.minimoPorS).toBeCloseTo(0.35 * 300 / 420, 9); // 0.25 mm²/mm
    expect(r.disenoPorS).toBeCloseTo(Math.max(2 * r.AtS, 0.25), 9);
    expect(r.sMax).toBeCloseTo(155.25, 9);
    expect(r.Al).toBeGreaterThanOrEqual(r.AlReq);
  });
  it('sin torsión relevante: no se pide At ni Aℓ', () => {
    const r = disenoTorsionYCortante({ b: 300, h: 500, d: 450, recubrimiento: 40, dEstribo: 9.5, fc: 28, fy: 420, fyt: 420, Vu: 80, Tu: 3, Vc: 121.4 });
    expect(r.requiereTorsion).toBe(false);
    expect(r.AtS).toBe(0);
    expect(r.Al).toBe(0);
  });
});
