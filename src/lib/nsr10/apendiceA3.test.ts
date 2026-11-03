import { describe, expect, it } from 'vitest';
import {
  ajusteBilineal,
  areaBajoCurva,
  coeficienteC0,
  coeficienteC1,
  desplazamientoObjetivo,
  desplazamientoParaFuerza,
  factorRd,
  fuerzaEnDesplazamiento,
  periodoEfectivoPushover,
  procedimientoPushover,
  type PuntoCurva,
} from './apendiceA3';
import { periodosEspectro, sa } from './espectro';

/** Curva de capacidad de un pórtico de 8 pisos (V en N, δ en m del punto de control). */
const CURVA_EJEMPLO: PuntoCurva[] = [
  [0, 0], [0.04, 1200], [0.08, 2300], [0.12, 3000], [0.18, 3500], [0.25, 3800], [0.35, 3900], [0.5, 3900], [0.7, 3700],
].map(([d, v]) => ({ d, v: v * 1000 }));

describe('Apéndice A-3 — ecuaciones sueltas', () => {
  it('A-3.2-3: C0 con masas iguales y modo lineal de 8 pisos', () => {
    const phi = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => i / 8);
    // Σφ = 4.5; Σφ² = 204/64 = 3.1875 → 1.41176
    expect(coeficienteC0(Array(8).fill(1), phi)).toBeCloseTo(4.5 / 3.1875, 10);
  });

  it('C0 = 1 para un sistema de un solo nivel', () => {
    expect(coeficienteC0([100], [1])).toBe(1);
  });

  it('A-3.2-1: Te = T1 si la rigidez efectiva es igual a la inicial; mayor si se degrada', () => {
    expect(periodoEfectivoPushover(1.2, 1000, 0.05, 2000, 0.1)).toBeCloseTo(1.2, 10);
    expect(periodoEfectivoPushover(1.2, 1000, 0.05, 1500, 0.15)).toBeCloseTo(1.2 * Math.sqrt(20000 / 10000), 10);
  });

  it('A-3.2-5 y A-3.2-4: Rd y C1', () => {
    // Sa = 0.4 g, M = 1.2e6 kg, Vy = 2.8e6 N → Rd = 0.4·1.2e6·9.8/2.8e6 = 1.68
    expect(factorRd(0.4, 1.2e6, 2.8e6)).toBeCloseTo(1.68, 10);
    // Te > TC → C1 = 1
    expect(coeficienteC1(1.0, 0.85, 3)).toBe(1);
    // Te ≤ TC: C1 = (1 + (Rd−1)·TC/Te)/Rd = (1 + 2·0.8/0.4)/3 = 5/3
    expect(coeficienteC1(0.4, 0.8, 3)).toBeCloseTo(5 / 3, 10);
    // Rd = 1 (estructura que no fluye): C1 = 1
    expect(coeficienteC1(0.4, 0.8, 1)).toBeCloseTo(1, 10);
  });

  it('A-3.2-2: δT = C0·C1·Sa·(Te/2π)²·g', () => {
    // C0 = 1.4, C1 = 1, Sa = 0.4, Te = 2π → (Te/2π)² = 1 → 1.4·0.4·9.8 = 5.488
    expect(desplazamientoObjetivo(1.4, 1, 0.4, 2 * Math.PI)).toBeCloseTo(5.488, 10);
  });
});

describe('Apéndice A-3 — curva de capacidad y ajuste bilineal (A-3.2.3)', () => {
  it('interpola la fuerza y el desplazamiento', () => {
    expect(fuerzaEnDesplazamiento(CURVA_EJEMPLO, 0.06)).toBeCloseTo(1750e3, 6);
    expect(fuerzaEnDesplazamiento(CURVA_EJEMPLO, 0.04)).toBe(1200e3);
    expect(fuerzaEnDesplazamiento(CURVA_EJEMPLO, 10)).toBe(3700e3);
    expect(desplazamientoParaFuerza(CURVA_EJEMPLO, 1750e3)).toBeCloseTo(0.06, 10);
    expect(desplazamientoParaFuerza(CURVA_EJEMPLO, 9e9)).toBeNull();
  });

  it('el área bajo la curva suma trapecios', () => {
    // hasta 0.04: 0.5·1200e3·0.04 = 24000
    expect(areaBajoCurva(CURVA_EJEMPLO, 0.04)).toBeCloseTo(24000, 6);
    // hasta 0.06: 24000 + 0.5·(1200e3 + 1750e3)·0.02 = 53500
    expect(areaBajoCurva(CURVA_EJEMPLO, 0.06)).toBeCloseTo(53500, 6);
  });

  it('una curva elastoplástica se recupera exactamente (Vy = Vp, δy = Vp/k)', () => {
    const k = 3e7;
    const vp = 3e6;
    const curva: PuntoCurva[] = [{ d: 0, v: 0 }, { d: vp / k, v: vp }, { d: 1, v: vp }];
    const aj = ajusteBilineal(curva, 0.4)!;
    expect(aj.vy).toBeCloseTo(vp, -1);
    expect(aj.dy).toBeCloseTo(vp / k, 6);
    expect(aj.ke).toBeCloseTo(k, -3);
  });

  it('la bilineal ajustada conserva el área y pasa por el 60 % de Vy sobre la curva', () => {
    const dT = 0.2;
    const aj = ajusteBilineal(CURVA_EJEMPLO, dT)!;
    const vT = fuerzaEnDesplazamiento(CURVA_EJEMPLO, dT);
    const areaBilineal = 0.5 * aj.vy * aj.dy + 0.5 * (aj.vy + vT) * (dT - aj.dy);
    expect(areaBilineal).toBeCloseTo(areaBajoCurva(CURVA_EJEMPLO, dT), -1);
    expect(fuerzaEnDesplazamiento(CURVA_EJEMPLO, 0.6 * aj.dy)).toBeCloseTo(0.6 * aj.vy, -2);
    expect(aj.vy).toBeGreaterThan(0);
    expect(aj.vy).toBeLessThanOrEqual(3900e3);
  });
});

describe('Apéndice A-3 — procedimiento completo (ejemplo de 8 pisos en Bogotá, perfil D)', () => {
  const p = { aa: 0.15, av: 0.2, fa: 1.5, fv: 2.0, i: 1.0 };
  const phi = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => i / 8);
  const r = procedimientoPushover({
    curva: CURVA_EJEMPLO,
    t1: 1.25,
    v1: 1200e3,
    d1: 0.04,
    masas: Array(8).fill(150000),
    formaModo: phi,
    sa: (t) => sa(t, p),
    tc: periodosEspectro(p).tc,
  })!;

  it('converge en pocas iteraciones', () => {
    expect(r.convergio).toBe(true);
    expect(r.iteraciones).toBeLessThanOrEqual(10);
  });

  it('valores de referencia', () => {
    expect(r.c0).toBeCloseTo(1.41176, 4);
    expect(r.vy / 1000).toBeCloseTo(2829.2, 0);
    expect(r.dy).toBeCloseTo(0.09682, 4);
    expect(r.te).toBeCloseTo(1.2665, 3);
    expect(r.saTe).toBeCloseTo(0.37898, 4);
    expect(r.rd).toBeCloseTo(1.5753, 3);
    expect(r.c1).toBe(1); // Te > TC = 0.853 s
    expect(r.dT).toBeCloseTo(0.2131, 3);
  });

  it('consistencia: δT satisface A-3.2-2 con los valores finales y la resistencia no cae hasta 125 % δT', () => {
    expect(r.dT).toBeCloseTo(desplazamientoObjetivo(r.c0, r.c1, r.saTe, r.te), 6);
    expect(r.te).toBeGreaterThan(1.25); // la fluencia alarga el período
    expect(r.v125).toBeGreaterThanOrEqual(r.vT);
    expect(r.v150).toBeGreaterThanOrEqual(r.vT);
  });
});
