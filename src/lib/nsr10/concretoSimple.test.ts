import { describe, expect, it } from 'vitest';
import {
  alturaEfectivaSimple,
  cargaNominalCompresion,
  cargaNominalMuroEmpirico,
  cortanteNominalDosDirecciones,
  cortanteNominalViga,
  esbeltezPedestal,
  espesorMinimoMuroSimple,
  excentricidadDisenoMuro,
  longitudEfectivaMuro,
  momentoNominalCompresion,
  momentoNominalTraccion,
  moduloSeccionRectangular,
  resistenciaAplastamiento,
  resistenciaFlexionSimple,
  resultanteEnTercioCentral,
  verificarFlexoCompresion,
  verificarMuroSimple,
  verificarPedestal,
  verificarZapataAislada,
  verificarZapataCorrida,
} from './concretoSimple';

describe('C.22 flexión (C.22-1 a C.22-3), verificada a mano', () => {
  // Franja de 1 m, h = 250 mm → Sm = 1000·250²/6 = 10 416 667 mm³
  const sm = moduloSeccionRectangular(1000, 250);
  it('Sm = b h²/6', () => expect(sm).toBeCloseTo(10_416_666.67, 1));
  it('Mn de tracción = 0.42 √21 Sm = 20.049 kN·m', () => {
    // 0.42·4.582576 = 1.924682; ×10 416 667 = 20.0488e6 N·mm
    expect(momentoNominalTraccion(21, sm)).toBeCloseTo(20.0488, 3);
  });
  it('φMn = 0.60 Mn = 12.029 kN·m', () => expect(resistenciaFlexionSimple(21, sm)).toBeCloseTo(12.0293, 3));
  it('Mn de compresión = 0.85·21·Sm = 185.94 kN·m', () => expect(momentoNominalCompresion(21, sm)).toBeCloseTo(185.9375, 3));
  it('λ = 0.85 reduce el Mn de tracción proporcionalmente', () => {
    expect(momentoNominalTraccion(21, sm, 0.85)).toBeCloseTo(0.85 * momentoNominalTraccion(21, sm), 9);
  });
  it('contra el suelo h se reduce 50 mm (C.22.4.7)', () => {
    expect(alturaEfectivaSimple(300, true)).toBe(250);
    expect(alturaEfectivaSimple(300, false)).toBe(300);
    expect(() => alturaEfectivaSimple(40, true)).toThrow();
  });
});

describe('C.22 compresión (C.22-5, C.22-14)', () => {
  it('Pn de un elemento 400×400, ℓc = 2400, f′c = 21 → 1945.1 kN', () => {
    // factor = 1 − (2400/(32·400))² = 1 − 0.1875² = 0.964844; Pn = 0.6·21·0.964844·160 000 N
    expect(cargaNominalCompresion(21, 160_000, 2400, 400)).toBeCloseTo(1945.125, 2);
  });
  it('Pn empírico de muro h = 200, ℓc = 3000, f′c = 21 → 1474.7 kN/m', () => {
    // factor = 1 − (3000/6400)² = 0.780273; 0.45·21·200 000·0.780273 = 1 474 716 N
    expect(cargaNominalMuroEmpirico(21, 200_000, 3000, 200)).toBeCloseTo(1474.716, 2);
  });
  it('el método empírico (0.45) es menor que C.22-5 (0.60) para el mismo A', () => {
    expect(cargaNominalMuroEmpirico(21, 100_000, 2000, 200)).toBeLessThan(cargaNominalCompresion(21, 100_000, 2000, 200));
  });
});

describe('C.22 flexo-compresión (C.22-6 y C.22-7)', () => {
  it('con carga nula se reduce a C.22-7: Mu/Sm ≤ φ0.42√f′c', () => {
    const sm = moduloSeccionRectangular(1000, 250);
    const r = verificarFlexoCompresion({ fc: 21, bMm: 1000, hMm: 250, puKn: 0, muKnm: 10, lcMm: 2000 });
    expect(r.esfuerzoTraccion).toBeCloseTo(10e6 / sm, 6);
    expect(r.limiteTraccion).toBeCloseTo(0.6 * 0.42 * Math.sqrt(21), 9);
    expect(r.cumple).toBe(true);
  });
  it('la compresión axial descuenta tracción: Mu/Sm − Pu/Ag', () => {
    const r = verificarFlexoCompresion({ fc: 21, bMm: 1000, hMm: 250, puKn: 100, muKnm: 10, lcMm: 2000 });
    expect(r.esfuerzoTraccion).toBeCloseTo(0.96 - 0.4, 6);
  });
});

describe('C.22 cortante y aplastamiento', () => {
  it('Vn viga = 0.11√21·1000·250 = 126.02 kN', () => expect(cortanteNominalViga(21, 1000, 250)).toBeCloseTo(126.021, 2));
  it('dos direcciones, β = 1: manda el tope 0.22', () => {
    const r = cortanteNominalDosDirecciones(21, 2000, 250, 1);
    expect(r.sinTope).toBeCloseTo(0.33 * 4.582576 * 2000 * 250 * 1e-3, 2);
    expect(r.tope).toBeCloseTo(504.084, 2);
    expect(r.vn).toBeCloseTo(r.tope, 9);
    expect(r.gobiernaTope).toBe(true);
  });
  it('β = 2 coincide con el tope y β = 4 queda por debajo', () => {
    const r2 = cortanteNominalDosDirecciones(21, 2000, 250, 2);
    expect(r2.sinTope).toBeCloseTo(r2.tope, 9);
    const r4 = cortanteNominalDosDirecciones(21, 2000, 250, 4);
    expect(r4.gobiernaTope).toBe(false);
    expect(r4.vn).toBeCloseTo(0.165 * 4.582576 * 2000 * 250 * 1e-3, 2);
  });
  it('Bn = 0.85 f′c A1 = 2856 kN; con A2 = 4 A1 se duplica y con 9 A1 sigue en 2', () => {
    expect(resistenciaAplastamiento(21, 160_000).bn).toBeCloseTo(2856, 6);
    const r4 = resistenciaAplastamiento(21, 160_000, 640_000);
    expect(r4.bn).toBeCloseTo(5712, 6);
    expect(r4.factor).toBe(2);
    expect(resistenciaAplastamiento(21, 160_000, 1_440_000).factor).toBe(2);
    expect(resistenciaAplastamiento(21, 160_000, 360_000).factor).toBeCloseTo(1.5, 9);
  });
});

describe('C.22 muros', () => {
  it('e mín = 0.10 h y tercio central e ≤ h/6', () => {
    expect(excentricidadDisenoMuro(0, 100, 200)).toBe(20);
    expect(excentricidadDisenoMuro(10, 100, 200)).toBe(100); // 10 kN·m / 100 kN = 100 mm
    expect(resultanteEnTercioCentral(33, 200)).toBe(true);
    expect(resultanteEnTercioCentral(34, 200)).toBe(false);
  });
  it('espesor mínimo: máx(menor/24, 140); sótano 190', () => {
    expect(espesorMinimoMuroSimple([3000, 6000])).toBe(140); // 3000/24 = 125 < 140
    expect(espesorMinimoMuroSimple([4800])).toBe(200); // 4800/24
    expect(espesorMinimoMuroSimple([3000], true)).toBe(190);
  });
  it('longitud efectiva = mín(distancia entre ejes, apoyo + 4 t)', () => {
    expect(longitudEfectivaMuro(2000, 300, 200)).toBe(1100);
    expect(longitudEfectivaMuro(900, 300, 200)).toBe(900);
  });
  it('muro h = 200, ℓc = 3000, Pu = 300 kN/m, Mu = 0: empírico aplica y cumple', () => {
    const r = verificarMuroSimple({ fc: 21, hMm: 200, puKnPorM: 300, muKnmPorM: 0, lcMm: 3000 });
    expect(r.tercioCentral).toBe(true);
    expect(r.empirico.phiPn).toBeCloseTo(0.6 * 1474.716, 2);
    expect(r.empirico.cumple).toBe(true);
    expect(r.espesorMinimoMm).toBe(140);
    expect(r.cumple).toBe(true);
  });
  it('un muro delgado por debajo del espesor mínimo no cumple', () => {
    expect(verificarMuroSimple({ fc: 21, hMm: 120, puKnPorM: 50, muKnmPorM: 0, lcMm: 2000 }).cumpleEspesor).toBe(false);
  });
});

describe('C.22 zapatas y pedestales', () => {
  it('zapata corrida B = 1000, t = 200, h = 300 contra suelo, qu = 140 kPa', () => {
    const r = verificarZapataCorrida({ fc: 21, anchoMm: 1000, espesorMuroMm: 200, hMm: 300, quKpa: 140 });
    expect(r.hEfMm).toBe(250);
    expect(r.muKnm).toBeCloseTo(11.2, 9); // 140·0.4²/2
    expect(r.phiMnKnm).toBeCloseTo(12.0293, 3);
    expect(r.vuViga).toBeCloseTo(21, 9); // 140·(0.4 − 0.25)
    expect(r.phiVnViga).toBeCloseTo(75.613, 2);
    expect(r.cumple).toBe(true);
  });
  it('con h = 250 (hEf = 200) la flexión ya no cumple', () => {
    const r = verificarZapataCorrida({ fc: 21, anchoMm: 1000, espesorMuroMm: 200, hMm: 250, quKpa: 140 });
    expect(r.phiMnKnm).toBeCloseTo((0.6 * 0.42 * Math.sqrt(21) * (1000 * 200 * 200)) / 6 * 1e-6, 4);
    expect(r.cumple).toBe(false);
  });
  it('espesor de zapata < 200 mm no cumple C.22.7.4 aunque resista', () => {
    expect(verificarZapataCorrida({ fc: 28, anchoMm: 600, espesorMuroMm: 200, hMm: 190, quKpa: 50 }).espesorCumple).toBe(false);
  });
  it('zapata aislada 1.2×1.2, columna 300, h = 350 contra suelo', () => {
    const r = verificarZapataAislada({ fc: 21, ladoMm: 1200, ladoColumnaMm: 300, hMm: 350, quKpa: 200 });
    expect(r.hEfMm).toBe(300);
    // vuelo = 0.45 m; Mu = 200·1.2·0.45²/2 = 24.3 kN·m
    expect(r.muKnm).toBeCloseTo(24.3, 9);
    // bo = 4(300 + 300) = 2400 mm; Vu = 200(1.44 − 0.36) = 216 kN; φVn = 0.6·0.22·√21·2400·300
    expect(r.vuPunz).toBeCloseTo(216, 9);
    expect(r.phiVnPunz).toBeCloseTo(0.6 * 0.22 * 4.582576 * 2400 * 300 * 1e-3, 3);
  });
  it('pedestal: esbeltez ≤ 3 y Pu ≤ φBn', () => {
    expect(esbeltezPedestal(900, 300)).toEqual({ relacion: 3, cumple: true });
    expect(esbeltezPedestal(1000, 300).cumple).toBe(false);
    const r = verificarPedestal({ fc: 21, a1Mm2: 160_000, puKn: 1500 });
    expect(r.phiBn).toBeCloseTo(0.6 * 2856, 6);
    expect(r.cumple).toBe(true);
    expect(verificarPedestal({ fc: 21, a1Mm2: 160_000, puKn: 1800 }).cumple).toBe(false);
  });
});
