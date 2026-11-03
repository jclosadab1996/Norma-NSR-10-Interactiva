import { describe, expect, it } from 'vitest';
import {
  TABLA_A2_1_1,
  alturaEfectivaModo1,
  beta0EstratoBlando,
  cortanteBaseA2,
  deflexionModificada,
  interaccionFHE,
  longitudCaracteristica,
  moduloCortantePequenasDeformaciones,
  parametroAlfa,
  periodoEfectivoLosaSuperficial,
  radioPorArea,
  radioPorInercia,
  relacionesDeformacionApreciable,
  rigidecesCimentacionCircular,
} from './apendiceA2';
import { coeficienteFa, coeficienteFv } from './efectosLocales';
import { periodoAproximado } from './periodo';

/**
 * Caso de referencia (calculado también con una hoja independiente):
 * Bogotá (Aa 0.15, Av 0.20), perfil D (Fa 1.5, Fv 2.0), grupo I; edificio de concreto de 30 m,
 * M = 3.0e6 kg, T = 1.1 s; losa de 30 × 30 m; γ = 1800 kg/m³, vso = 200 m/s, ν = 0.35, βo = 0.01.
 */
const aa = 0.15;
const av = 0.2;
const espectro = { aa, av, fa: coeficienteFa('D', aa)!, fv: coeficienteFv('D', av)!, i: 1 };
const cimentacion = (() => {
  const ao = 900;
  const lo = 30;
  const io = (lo * 30 ** 3) / 12;
  const ra = radioPorArea(ao);
  const rm = radioPorInercia(io);
  const rel = relacionesDeformacionApreciable(aa)!;
  const go = moduloCortantePequenasDeformaciones(1800, 200);
  return { ao, lo, io, ra, rm, rel, go, g: rel.gGo * go, ...rigidecesCimentacionCircular(rel.gGo * go, 0.35, ra, rm) };
})();

describe('Apéndice A-2 — Tabla A-2.1-1', () => {
  it('transcribe las cuatro columnas del PDF', () => {
    expect(TABLA_A2_1_1.map((f) => [f.gGo, f.vsVso])).toEqual([
      [0.81, 0.9],
      [0.64, 0.8],
      [0.49, 0.7],
      [0.42, 0.65],
    ]);
  });

  it('selecciona la columna según Aa y no cubre 0.20 < Aa < 0.30', () => {
    expect(relacionesDeformacionApreciable(0.05)).toEqual({ gGo: 0.81, vsVso: 0.9 });
    expect(relacionesDeformacionApreciable(0.1)).toEqual({ gGo: 0.81, vsVso: 0.9 });
    expect(relacionesDeformacionApreciable(0.15)).toEqual({ gGo: 0.64, vsVso: 0.8 });
    expect(relacionesDeformacionApreciable(0.2)).toEqual({ gGo: 0.49, vsVso: 0.7 });
    expect(relacionesDeformacionApreciable(0.25)).toBeNull();
    expect(relacionesDeformacionApreciable(0.3)).toEqual({ gGo: 0.42, vsVso: 0.65 });
    expect(relacionesDeformacionApreciable(0.4)).toEqual({ gGo: 0.42, vsVso: 0.65 });
  });
});

describe('Apéndice A-2 — geometría de la cimentación', () => {
  it('ra, rm y Go (A-2-7, A-2-8, Go = γ·vso²)', () => {
    expect(cimentacion.ra).toBeCloseTo(16.9257, 4);
    expect(cimentacion.rm).toBeCloseTo(17.1220, 4);
    expect(cimentacion.go).toBe(72e6);
    expect(cimentacion.g).toBeCloseTo(46.08e6, 0);
  });

  it('para un círculo, ra = rm = el radio', () => {
    const r = 5;
    expect(radioPorArea(Math.PI * r * r)).toBeCloseTo(r, 10);
    expect(radioPorInercia(Math.PI * r ** 4 / 4)).toBeCloseTo(r, 10);
  });

  it('longitud característica: ra, rm o interpolación según h̄/Lo', () => {
    expect(longitudCaracteristica(10, 30, 16, 18)).toBe(16); // 0.33 ≤ 0.5
    expect(longitudCaracteristica(30, 30, 16, 18)).toBe(18); // 1.0
    expect(longitudCaracteristica(45, 30, 16, 18)).toBe(18); // 1.5 ≥ 1.0
    expect(longitudCaracteristica(22.5, 30, 16, 18)).toBeCloseTo(17, 10); // 0.75, a medio camino
  });

  it('Ky y Kθ de una cimentación circular rígida (Gazetas)', () => {
    expect(cimentacion.ky).toBeCloseTo(3.7815e9, -6);
    expect(cimentacion.ktheta).toBeCloseTo(9.4892e11, -8);
  });
});

describe('Apéndice A-2 — método de la fuerza horizontal equivalente (A-2.2)', () => {
  const ta = periodoAproximado('porticos-concreto', 30);
  const r = interaccionFHE({ espectro, t: 1.1, ta, masaTotal: 3.0e6, hn: 30, ky: cimentacion.ky, ktheta: cimentacion.ktheta, beta0: 0.01 });

  it('masa y altura efectivas (A-2.0) y rigidez empotrada (A-2-4)', () => {
    expect(r.mBarra).toBeCloseTo(2.1e6, 3);
    expect(r.hBarra).toBeCloseTo(21, 10);
    expect(r.kBarra).toBeCloseTo(6.8516e7, -3);
  });

  it('período efectivo T̄ (A-2-3) es mayor que T', () => {
    expect(r.tBarra).toBeCloseTo(1.12714, 4);
    expect(r.razonPeriodos).toBeCloseTo(1.02468, 4);
    expect(r.tBarra).toBeGreaterThan(1.1);
  });

  it('amortiguamiento efectivo β̄ (A-2-9) dentro de 0.05–0.20', () => {
    expect(r.betaBarra).toBeCloseTo(0.056474, 5);
    expect(r.betaBarra).toBeGreaterThanOrEqual(0.05);
    expect(r.betaBarra).toBeLessThanOrEqual(0.2);
  });

  it('Sa, Vs y la reducción ΔVs (A-2-2)', () => {
    expect(r.sa).toBeCloseTo(0.436364, 5);
    expect(r.saBarra).toBeCloseTo(0.425855, 5);
    expect(r.vs).toBeCloseTo(12829090.9, 0);
    expect(r.deltaVs).toBeCloseTo(632874.6, 0);
  });

  it('V̄s = Vs − ΔVs (A-2-1) y no baja del piso 0.7·Vs′', () => {
    expect(r.vsBarra).toBeCloseTo(12196216.3, 0);
    expect(r.vsPrima).toBeCloseTo(11073320.2, 0);
    expect(r.piso).toBeCloseTo(7751324.2, 0);
    expect(r.gobiernaPiso).toBe(false);
    expect(r.reduccionPorcentaje).toBeCloseTo(4.933, 3);
    expect(r.vsBarra).toBeLessThan(r.vs);
    expect(r.vsBarra).toBeGreaterThanOrEqual(r.piso);
  });

  it('con un suelo muy blando gobierna el piso 0.7·Vs′', () => {
    const blando = interaccionFHE({ espectro, t: 1.1, ta, masaTotal: 3.0e6, hn: 30, ky: 2e8, ktheta: 2e10, beta0: 0.2 });
    expect(blando.tBarra).toBeGreaterThan(r.tBarra);
    expect(blando.vsBarra).toBeGreaterThanOrEqual(blando.piso - 1e-6);
  });
});

describe('Apéndice A-2 — otras ecuaciones', () => {
  it('A-2-5: período efectivo para losa superficial, cercano al de A-2-3', () => {
    const alpha = parametroAlfa(2.1e6, 1800, 900, 21);
    expect(alpha).toBeCloseTo(0.061728, 6);
    const t = periodoEfectivoLosaSuperficial({ t: 1.1, alpha, ra: cimentacion.ra, rm: cimentacion.rm, hBarra: 21, vs: 160, alphaTheta: 1 });
    expect(t).toBeCloseTo(1.12566, 4);
    expect(Math.abs(t - 1.12714)).toBeLessThan(0.005);
  });

  it('A-2-10: βo′ solo se aplica si 4Ds/(vs·T̄) < 1', () => {
    expect(beta0EstratoBlando(0.1, 10, 160, 1.0)).toBeCloseTo(0.1 * (40 / 160) ** 2, 10);
    expect(beta0EstratoBlando(0.1, 80, 160, 1.0)).toBe(0.1);
  });

  it('A-2-14: altura efectiva del primer modo', () => {
    // masas iguales (1), φ = [1/3, 2/3, 1] y h = [3, 6, 9]: Σφh = 1 + 4 + 9 = 14; Σφ = 2 → h̄ = 7 m
    const h = [3, 6, 9];
    const phi = [1 / 3, 2 / 3, 1];
    expect(alturaEfectivaModo1([1, 1, 1], phi, h)).toBeCloseTo(7, 10);
  });

  it('A-2-11: deflexión modificada con balanceo', () => {
    // (V̄s/Vs)·(δx + Mo·hx/Kθ) con V̄s/Vs = 0.95, δx = 0.02 m, Mo = 5e7 N·m, hx = 10 m, Kθ = 1e10 N·m/rad
    expect(deflexionModificada(0.95, 1, 0.02, 5e7, 10, 1e10)).toBeCloseTo(0.95 * (0.02 + 0.05), 10);
  });

  it('cortanteBaseA2 aplica el piso de 0.7·Vs′', () => {
    expect(cortanteBaseA2(100, 10, 120)).toEqual({ vsBarra: 90, piso: 84, gobiernaPiso: false });
    expect(cortanteBaseA2(100, 30, 120)).toEqual({ vsBarra: 84, piso: 84, gobiernaPiso: true });
  });
});
