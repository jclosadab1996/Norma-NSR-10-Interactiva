import { describe, expect, it } from 'vitest';
import {
  alturaEquivalente,
  aceleracionSuperficie,
  aceleracionNivel,
  fuerzaElementoNoSismico,
  coeficienteFuerzaNoSismico,
  deformacionImpuesta,
} from './elementosNoSismicos';
import { sa, mesetaSa } from './espectro';

// Caso: colegio (I = 1.25) en Bogotá, perfil D: Aa = 0.15, Fa = 1.5, Av = 0.20, Fv = 2.0; hn = 18 m.
const p = { aa: 0.15, av: 0.2, fa: 1.5, fv: 2.0, i: 1.25 };
const saMeseta = mesetaSa(p); // 0.703125
const as = aceleracionSuperficie(p.aa, p.fa, p.i); // 0.28125
const par = { as, sa: saMeseta, hn: 18 };

describe('A.8 — aceleración y fuerza sobre elementos que no hacen parte del sistema sísmico', () => {
  it('heq = 0.75·hn', () => {
    expect(alturaEquivalente(18)).toBeCloseTo(13.5, 10);
  });

  it('As = Sa(T = 0) de la rama ascendente A.2.6-7 = Aa·Fa·I', () => {
    expect(as).toBeCloseTo(0.28125, 10);
    expect(sa(0, p, { ramaInicialT0: true })).toBeCloseTo(as, 10);
  });

  it('ai en la base es As y en hi = heq es Sa (continuidad)', () => {
    expect(aceleracionNivel(0, par)).toBeCloseTo(as, 10);
    expect(aceleracionNivel(13.5, par)).toBeCloseTo(saMeseta, 10);
    expect(aceleracionNivel(13.5 - 1e-9, par)).toBeCloseTo(saMeseta, 6);
  });

  it('valores a mano: hi = 9 m (rama lineal) y hi = 18 m (rama Sa·hi/heq)', () => {
    // 0.28125 + (0.703125 − 0.28125)·9/13.5 = 0.28125 + 0.421875·(2/3) = 0.5625
    expect(aceleracionNivel(9, par)).toBeCloseTo(0.5625, 10);
    // 0.703125·18/13.5 = 0.9375
    expect(aceleracionNivel(18, par)).toBeCloseTo(0.9375, 10);
  });

  it('Fp = ax·g·Mp/R0 (A.8.2-2)', () => {
    // 0.9375 · 9.8 · 2500 / 2.5 = 9187.5 N
    expect(fuerzaElementoNoSismico(0.9375, 2500, 2.5)).toBeCloseTo(9187.5, 6);
    expect(coeficienteFuerzaNoSismico(0.9375, 2.5)).toBeCloseTo(0.375, 10);
  });

  it('deformación impuesta = deriva × altura de piso (A.8.3.1)', () => {
    expect(deformacionImpuesta(0.01, 3)).toBeCloseTo(0.03, 12);
    expect(deformacionImpuesta(0.008, 3)).toBeCloseTo(0.024, 12);
  });
});
