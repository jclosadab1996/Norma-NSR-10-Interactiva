import { describe, expect, it } from 'vitest';
import {
  MUROS,
  areaMinimaPorMetro,
  cuantiasMinimasMuro,
  deflexionAgrietamientoMuro,
  deflexionServicioIterativa,
  deflexionServicioMuro,
  deflexionUltimaMuro,
  espesorMinimoEmpiricoTotal,
  espesorMinimoMuroEmpirico,
  espesorMinimoNoPortante,
  factorKMuro,
  inerciaBrutaMuro,
  inerciaFisuradaMuro,
  largoEfectivoCargaConcentrada,
  mnMuroEsbelto,
  momentoAgrietamientoMuro,
  muAmplificadoMuro,
  phiPnMuroEmpirico,
  relacionModularMuro,
  requiereDosCapas,
  resultanteEnTercioCentral,
  separacionBarrasMuro,
  separacionMaximaRefuerzoMuro,
  ubicacionDosCapas,
  verificarMuroEsbelto,
  verticalSinEstribos,
} from './murosConcreto';

describe('C.14.3 — refuerzo mínimo', () => {
  it('(a) barra corrugada ≤ No. 5 (16M) con fy ≥ 420: ρℓ = 0.0012, ρt = 0.0020', () => {
    expect(cuantiasMinimasMuro('barra-corrugada', 15.9, 420)).toEqual({ rhoVertical: 0.0012, rhoHorizontal: 0.002, caso: 'a' });
    expect(cuantiasMinimasMuro('barra-corrugada', 16, 500).caso).toBe('a');
  });

  it('(b) otras barras corrugadas: 0.0015 y 0.0025 (mayores que No. 5 o fy < 420)', () => {
    expect(cuantiasMinimasMuro('barra-corrugada', 19.1, 420)).toEqual({ rhoVertical: 0.0015, rhoHorizontal: 0.0025, caso: 'b' });
    expect(cuantiasMinimasMuro('barra-corrugada', 12.7, 280)).toEqual({ rhoVertical: 0.0015, rhoHorizontal: 0.0025, caso: 'b' });
  });

  it('(c) malla de alambre ≤ 16 mm: 0.0012 y 0.0020', () => {
    expect(cuantiasMinimasMuro('malla', 8, 500)).toEqual({ rhoVertical: 0.0012, rhoHorizontal: 0.002, caso: 'c' });
  });

  it('muro de 150 mm con barras No. 4 fy = 420: 180 y 300 mm²/m', () => {
    const q = cuantiasMinimasMuro('barra-corrugada', 12.7, 420);
    expect(areaMinimaPorMetro(q.rhoVertical, 150)).toBeCloseTo(180, 10);
    expect(areaMinimaPorMetro(q.rhoHorizontal, 150)).toBeCloseTo(300, 10);
  });

  it('C.14.3.5: separación ≤ min(3h, 450): h = 150 → 450; h = 100 → 300', () => {
    expect(separacionMaximaRefuerzoMuro(150)).toBe(450);
    expect(separacionMaximaRefuerzoMuro(100)).toBe(300);
    expect(separacionMaximaRefuerzoMuro(200)).toBe(450);
  });

  it('separación de barras No. 4 (129 mm²): vertical 716.7 → gobierna 450; horizontal 430 mm', () => {
    const v = separacionBarrasMuro(129, 180, 150);
    expect(v.calculada).toBeCloseTo(716.67, 1);
    expect(v.adoptada).toBe(450);
    expect(v.gobierna).toBe('C.14.3.5');
    const hz = separacionBarrasMuro(129, 300, 150);
    expect(hz.calculada).toBeCloseTo(430, 10);
    expect(hz.adoptada).toBeCloseTo(430, 10);
    expect(hz.gobierna).toBe('area');
  });

  it('C.14.3.4: dos capas si h > 250 mm salvo sótanos; ubicación 50 mm a h/3 (exterior), 20 mm a h/3 (interior)', () => {
    expect(requiereDosCapas(250)).toBe(false);
    expect(requiereDosCapas(251)).toBe(true);
    expect(requiereDosCapas(300, true)).toBe(false);
    const u = ubicacionDosCapas(300);
    expect(u.capaExterior).toEqual([50, 100]);
    expect(u.capaInterior).toEqual([20, 100]);
    expect(u.fraccionExterior).toEqual([0.5, 2 / 3]);
  });

  it('C.14.3.6 y C.14.2.4', () => {
    expect(verticalSinEstribos(0.008, true)).toBe(true);
    expect(verticalSinEstribos(0.015, true)).toBe(false);
    expect(verticalSinEstribos(0.015, false)).toBe(true);
    expect(largoEfectivoCargaConcentrada(2500, 300, 200)).toBe(1100); // 300 + 4·200
    expect(largoEfectivoCargaConcentrada(900, 300, 200)).toBe(900);
  });
});

describe('C.14.5 — método empírico', () => {
  it('espesor mínimo: 1/25 de la menor entre altura y longitud, ≥ 100 mm; sótano ≥ 190 mm', () => {
    expect(espesorMinimoMuroEmpirico(3000, 6000)).toBe(120);
    expect(espesorMinimoMuroEmpirico(2000, 6000)).toBe(100); // 80 → 100
    expect(espesorMinimoMuroEmpirico(6000, 2000)).toBe(100);
    expect(espesorMinimoEmpiricoTotal(3000, 6000, true)).toBe(190);
    expect(espesorMinimoEmpiricoTotal(6000, 8000, true)).toBe(240);
    expect(espesorMinimoNoPortante(2400)).toBe(100); // 80 → 100
    expect(espesorMinimoNoPortante(4500)).toBe(150);
  });

  it('factor k: 0.8, 1.0, 2.0', () => {
    expect(factorKMuro('arriostrado-restringido')).toBe(0.8);
    expect(factorKMuro('arriostrado-libre')).toBe(1.0);
    expect(factorKMuro('no-arriostrado')).toBe(2.0);
  });

  it('tercio central: e ≤ h/6', () => {
    expect(resultanteEnTercioCentral(33, 200)).toBe(true);
    expect(resultanteEnTercioCentral(34, 200)).toBe(false);
  });

  // Cálculo a mano: h = 200, ℓc = 3000, f′c = 21, franja de 1 m (Ag = 200 000 mm²), φ = 0.65.
  // 0.55·0.65·21·200000 = 1 501 500 N.
  it('C.14-1, k = 0.8: factor 1 − (2400/6400)² = 0.859375 → φPn = 1290.4 kN/m', () => {
    const r = phiPnMuroEmpirico({ fc: 21, ag: 200000, k: 0.8, lc: 3000, h: 200 });
    expect(r.resistenciaBruta).toBeCloseTo(1501500, 6);
    expect(r.factorEsbeltez).toBeCloseTo(0.859375, 12);
    expect(r.phiPn / 1000).toBeCloseTo(1290.35, 1);
  });

  it('C.14-1, k = 1.0 y k = 2.0: 1171.6 kN/m y 181.8 kN/m', () => {
    expect(phiPnMuroEmpirico({ fc: 21, ag: 200000, k: 1, lc: 3000, h: 200 }).phiPn / 1000).toBeCloseTo(1171.62, 1);
    expect(phiPnMuroEmpirico({ fc: 21, ag: 200000, k: 2, lc: 3000, h: 200 }).phiPn / 1000).toBeCloseTo(181.81, 1);
  });

  it('con k ℓc = 32 h la resistencia se anula', () => {
    expect(phiPnMuroEmpirico({ fc: 21, ag: 200000, k: 2, lc: 3200, h: 200 }).phiPn).toBeCloseTo(0, 6);
  });
});

describe('C.14.8 — muros esbeltos (franja de 1 m, h = 200 mm, ℓc = 4.5 m, f′c = 28, fy = 420, As = 796 mm²/m centrada)', () => {
  const base = { fc: 28, fy: 420, lw: 1000, h: 200, d: 100, as: 796, lc: 4500, mua: 5.0625e6, pu: 60000, maa: 3.54375e6, ps: 40000 };

  it('propiedades de la sección: Ig = 666.7e6 mm⁴; Mcr = 0.62√28·Ig/100 = 21.87 kN·m; Ec = 24 870 MPa; Es/Ec = 8.04', () => {
    expect(inerciaBrutaMuro(1000, 200)).toBeCloseTo(666.667e6, -3);
    expect(momentoAgrietamientoMuro(28, 1000, 200) / 1e6).toBeCloseTo(21.8715, 3);
    const r = verificarMuroEsbelto(base);
    expect(r.ec).toBeCloseTo(24870.06, 1);
    expect(relacionModularMuro(r.ec)).toBeCloseTo(8.0418, 3);
    expect(relacionModularMuro(40000)).toBe(6); // 5 < 6 → 6
  });

  it('Mn: a = 16.57 mm, c = 19.49 mm, Mn = 36.17 kN·m, φMn = 32.55 kN·m', () => {
    const r = mnMuroEsbelto({ as: 796, fy: 420, fc: 28, lw: 1000, h: 200, d: 100, pu: 60000 });
    expect(r.a).toBeCloseTo(16.568, 3);
    expect(r.c).toBeCloseTo(19.4918, 3);
    expect(r.mn / 1e6).toBeCloseTo(36.1654, 3);
    // sin carga axial y refuerzo centrado: Mn = As fy (d − a/2) con a = As fy/(0.85 f′c ℓw)
    const s = mnMuroEsbelto({ as: 796, fy: 420, fc: 28, lw: 1000, h: 200, d: 100, pu: 0 });
    expect(s.a).toBeCloseTo((796 * 420) / (0.85 * 28 * 1000), 10);
    expect(s.mn).toBeCloseTo(796 * 420 * (100 - s.a / 2), 4);
  });

  it('C.14-7: Icr = 8.0418·(796 + 142.86)·(100 − 19.49)² + 1000·19.49³/3 = 51.40e6 mm⁴', () => {
    const icr = inerciaFisuradaMuro({ as: 796, pu: 60000, fy: 420, h: 200, d: 100, c: 19.4918, lw: 1000, ec: 24870.06 });
    expect(icr / 1e6).toBeCloseTo(51.405, 2);
  });

  it('C.14-6 y C.14-5: Mu = 5.0625/0.868 = 5.832 kN·m; Δu = 12.83 mm; Mu = Mua + Pu Δu (consistencia)', () => {
    const ec = 24870.06;
    const icr = 51.405e6;
    const mu = muAmplificadoMuro(5.0625e6, 60000, 4500, ec, icr);
    expect(mu / 1e6).toBeCloseTo(5.8323, 3);
    const du = deflexionUltimaMuro(mu, 4500, ec, icr);
    expect(du).toBeCloseTo(12.83, 2);
    expect(5.0625e6 + 60000 * du).toBeCloseTo(mu, -1); // Mu = Mua + Pu Δu
    expect(() => muAmplificadoMuro(5e6, 5e6, 4500, ec, icr)).toThrow(RangeError);
  });

  it('verificación completa: cumple Pu/Ag, φMn ≥ Mcr, φMn ≥ Mu y Δs ≤ ℓc/150', () => {
    const r = verificarMuroEsbelto(base);
    expect(r.esfuerzoVertical).toBeCloseTo(0.3, 10);
    expect(r.limiteEsfuerzoVertical).toBeCloseTo(1.68, 10);
    expect(r.cumpleEsfuerzoVertical).toBe(true);
    expect(r.phiMn / 1e6).toBeCloseTo(32.5489, 3);
    expect(r.cumpleMcr).toBe(true);
    expect(r.controladoPorTraccion).toBe(true); // c/d = 0.195 ≤ 0.375
    expect(r.mu / 1e6).toBeCloseTo(5.8323, 3);
    expect(r.cumpleMu).toBe(true);
    expect(r.deltaCr).toBeCloseTo(2.7826, 3);
    expect(r.deltaN).toBeCloseTo(59.671, 2);
  });

  it('servicio: Ma < (2/3)Mcr → C.14-9; Ma = 3.562 kN·m (con PΔ), Δs = 0.453 mm ≤ 30 mm', () => {
    const r = verificarMuroEsbelto(base);
    expect(r.servicio.ecuacion).toBe('C.14-9');
    expect(r.servicio.converge).toBe(true);
    expect(r.servicio.ma / 1e6).toBeCloseTo(3.5619, 3);
    expect(r.servicio.deltaS).toBeCloseTo(0.45316, 4);
    expect(r.servicio.limite).toBe(30);
    expect(r.servicio.cumple).toBe(true);
  });

  it('C.14-8 y C.14-9 son continuas en Ma = (2/3)Mcr y alcanzan Δn en Ma = Mn', () => {
    const mcr = 21.8715e6;
    const mn = 36.1654e6;
    const dcr = 2.7826;
    const dn = 59.671;
    const justoAntes = deflexionServicioMuro((2 / 3) * mcr, mcr, mn, dcr, dn);
    expect(justoAntes.ecuacion).toBe('C.14-9');
    expect(justoAntes.deltaS).toBeCloseTo((2 / 3) * dcr, 10);
    const despues = deflexionServicioMuro((2 / 3) * mcr + 1, mcr, mn, dcr, dn);
    expect(despues.ecuacion).toBe('C.14-8');
    expect(despues.deltaS).toBeCloseTo((2 / 3) * dcr, 4);
    expect(deflexionServicioMuro(mn, mcr, mn, dcr, dn).deltaS).toBeCloseTo(dn, 8);
    expect(deflexionAgrietamientoMuro(mcr, 4500, 24870.06, 666.667e6)).toBeCloseTo(2.7826, 3);
  });

  it('con Ma sobre (2/3)Mcr la iteración usa C.14-8 y converge', () => {
    const mcr = 21.8715e6;
    const ec = 24870.06;
    const r = deflexionServicioIterativa({ maa: 18e6, ps: 40000, lc: 4500, ec, ig: 666.667e6, icr: 51.405e6, mcr, mn: 36.1654e6 });
    expect(r.ecuacion).toBe('C.14-8');
    expect(r.converge).toBe(true);
    expect(Math.abs(r.ma - (18e6 + 40000 * r.deltaS))).toBeLessThan(10); // N·mm: convergido
    expect(r.deltaS).toBeGreaterThan((2 / 3) * 2.7826);
  });

  it('constantes de la norma', () => {
    expect(MUROS.esbelto.esfuerzoVerticalMaxFraccionFc).toBe(0.06);
    expect(MUROS.esbelto.factorRigidez).toBe(0.75);
    expect(MUROS.esbelto.limiteDeflexionDivisor).toBe(150);
    expect(MUROS.empirico.coef).toBe(0.55);
    expect(MUROS.empirico.divisorEsbeltez).toBe(32);
  });
});
