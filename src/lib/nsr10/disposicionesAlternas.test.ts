import { describe, expect, it } from 'vitest';
import { beta1 } from './concreto';
import { phiPorCargaAxial } from './resistenciaServicio';
import {
  aplicaLimiteRho,
  epsilonBalanceada,
  epsilonTDesdeRho,
  indiceCombinado,
  omegaPreesfuerzo,
  omegaRefuerzo,
  phiAlternoPorCargaAxial,
  redistribucionMaximaCB,
  redistribucionPreesforzado,
  resistenciaMinimaFisuracion,
  rhoBalanceada,
  rhoDesdeEpsilonT,
  rhoMaxima,
  rhoMaximaConCompresion,
  umbralCargaAxial,
  verificarLimiteFlexionPreesforzado,
} from './disposicionesAlternas';

describe('Apéndice C-B: ρb (C-B-1) y ρ máxima (C-B.10.3.3)', () => {
  it('f′c = 28, fy = 420: ρb = 0.85·0.85·28/420 · 600/1020 = 0.028333', () => {
    expect(rhoBalanceada(28, 420)).toBeCloseTo(0.0283333, 7);
    expect(rhoMaxima(28, 420)).toBeCloseTo(0.02125, 7);
  });
  it('f′c = 35: β1 = 0.80, ρb = 0.85·0.80·35/420 · 600/1020 = 0.033333', () => {
    expect(beta1(35)).toBeCloseTo(0.8, 12);
    expect(rhoBalanceada(35, 420)).toBeCloseTo(0.0333333, 7);
  });
  it('con refuerzo de compresión se suma ρ′ (lectura del autor)', () => {
    expect(rhoMaximaConCompresion(28, 420, 0.005)).toBeCloseTo(0.02625, 7);
  });
  it('el límite solo aplica si φPn < min(0.10 f′c Ag, φPb)', () => {
    expect(umbralCargaAxial(28, 160000)).toBeCloseTo(448, 9);
    expect(umbralCargaAxial(28, 160000, 300)).toBe(300);
    expect(aplicaLimiteRho(224, 28, 160000)).toBe(true);
    expect(aplicaLimiteRho(448, 28, 160000)).toBe(false);
    expect(aplicaLimiteRho(350, 28, 160000, 300)).toBe(false);
  });
});

describe('Apéndice C-B: redistribución en elementos no preesforzados (C-B.8.4)', () => {
  it('ρ = 0.01, ρ′ = 0: 20 (1 − 0.01/0.028333) = 12.94 %', () => {
    const r = redistribucionMaximaCB(0.01, 0, 28, 420);
    expect(r.permitida).toBe(true);
    expect(r.relacion).toBeCloseTo(0.352941, 6);
    expect(r.porcentaje).toBeCloseTo(12.9412, 3);
  });
  it('si ρ − ρ′ > 0.50 ρb (0.014167) no se permite', () => {
    const r = redistribucionMaximaCB(0.015, 0, 28, 420);
    expect(r.permitida).toBe(false);
    expect(r.porcentaje).toBe(0);
    expect(r.porcentajeFormula).toBeCloseTo(9.4118, 3);
  });
  it('en el límite ρ − ρ′ = 0.50 ρb la reducción es 10 %', () => {
    const r = redistribucionMaximaCB(0.5 * rhoBalanceada(28, 420), 0, 28, 420);
    expect(r.permitida).toBe(true);
    expect(r.porcentaje).toBeCloseTo(10, 4);
  });
  it('con ρ′: ρ = 0.018, ρ′ = 0.005 → ρ − ρ′ = 0.013 → 20(1 − 0.458824) = 10.82 %', () => {
    const r = redistribucionMaximaCB(0.018, 0.005, 28, 420);
    expect(r.permitida).toBe(true);
    expect(r.porcentaje).toBeCloseTo(10.8235, 3);
  });
});

describe('Apéndice C-B: preesforzado (C-B18.8.1, C-B18.10.4)', () => {
  it('índices ω = ρ fy/f′c y ωp = ρp fps/f′c', () => {
    expect(omegaRefuerzo(0.01, 420, 28)).toBeCloseTo(0.15, 12);
    expect(omegaPreesfuerzo(0.004, 1700, 28)).toBeCloseTo(0.242857, 6);
  });
  it('índice combinado ωp + (d/dp)(ω − ω′) = 0.12 + (500/450)(0.10) = 0.231111', () => {
    expect(indiceCombinado(0.12, 0.15, 0.05, 500, 450)).toBeCloseTo(0.231111, 6);
  });
  it('límite de flexión 0.36 β1 = 0.306 con f′c = 28', () => {
    const v = verificarLimiteFlexionPreesforzado(0.231111, 28);
    expect(v.limite).toBeCloseTo(0.306, 12);
    expect(v.cumple).toBe(true);
    expect(verificarLimiteFlexionPreesforzado(0.32, 28).cumple).toBe(false);
  });
  it('redistribución con índice 0.15: 20 (1 − 0.15/0.306) = 10.20 %; límite 0.24 β1 = 0.204', () => {
    const r = redistribucionPreesforzado(0.15, 28);
    expect(r.limiteRedistribucion).toBeCloseTo(0.204, 12);
    expect(r.permitida).toBe(true);
    expect(r.porcentaje).toBeCloseTo(10.196, 3);
  });
  it('con índice 0.231111 > 0.204 no se permite redistribuir', () => {
    const r = redistribucionPreesforzado(0.231111, 28);
    expect(r.permitida).toBe(false);
    expect(r.porcentaje).toBe(0);
    expect(r.porcentajeFormula).toBeCloseTo(4.8947, 3);
  });
  it('en el límite 0.24 β1 la variación es 20 (1 − 0.24/0.36) = 6.67 %', () => {
    expect(redistribucionPreesforzado(0.204, 28).porcentaje).toBeCloseTo(20 / 3, 6);
  });
  it('resistencia mínima: 1.2 veces la carga de fisuración', () => {
    expect(resistenciaMinimaFisuracion(150)).toBeCloseTo(180, 12);
  });
});

describe('Apéndice C-B: φ alternativo por carga axial', () => {
  it('cumple condiciones: φPn = 224, umbral 448 → φ = 0.90 − 0.25 (224/448) = 0.775', () => {
    const r = phiAlternoPorCargaAxial({ phiPn: 224, fc: 28, ag: 160000, fy: 420, simetrico: true, relDsMenosDPrimaSobreH: 0.75 });
    expect(r.cumpleCondiciones).toBe(true);
    expect(r.umbral).toBeCloseTo(448, 9);
    expect(r.phi).toBeCloseTo(0.775, 12);
    expect(r.phi).toBeCloseTo(phiPorCargaAxial(224, 28, 160000), 12);
  });
  it('con espiral: 0.90 − 0.15 · 0.5 = 0.825', () => {
    expect(
      phiAlternoPorCargaAxial({ phiPn: 224, fc: 28, ag: 160000, fy: 420, simetrico: true, relDsMenosDPrimaSobreH: 0.8, tipoEstribo: 'espiral' }).phi,
    ).toBeCloseTo(0.825, 12);
  });
  it('sin cumplir condiciones se usa el menor entre 0.10 f′c Ag y φPb', () => {
    const r = phiAlternoPorCargaAxial({ phiPn: 100, fc: 28, ag: 160000, fy: 500, simetrico: true, relDsMenosDPrimaSobreH: 0.8, phiPb: 200 });
    expect(r.cumpleCondiciones).toBe(false);
    expect(r.umbral).toBe(200);
    expect(r.phi).toBeCloseTo(0.9 - 0.25 * 0.5, 12);
    expect(() => phiAlternoPorCargaAxial({ phiPn: 100, fc: 28, ag: 160000, fy: 500, simetrico: false, relDsMenosDPrimaSobreH: 0.8 })).toThrow();
  });
  it('por encima del umbral φ es el de compresión (0.65) y sin carga es 0.90', () => {
    expect(phiAlternoPorCargaAxial({ phiPn: 500, fc: 28, ag: 160000, fy: 420, simetrico: true, relDsMenosDPrimaSobreH: 0.8 }).phi).toBe(0.65);
    expect(phiAlternoPorCargaAxial({ phiPn: 0, fc: 28, ag: 160000, fy: 420, simetrico: true, relDsMenosDPrimaSobreH: 0.8 }).phi).toBe(0.9);
  });
});

describe('Apéndice C-B: comparación con C.10.3.5 y C.8.4 (auxiliar)', () => {
  it('con ρ = 0.75 ρb la deformación es εt = 0.0038 (f′c = 28, fy = 420)', () => {
    expect(epsilonTDesdeRho(rhoMaxima(28, 420), 28, 420)).toBeCloseTo(0.0038, 7);
  });
  it('εt = 0.004 ↔ ρ = 0.020643; εt = 0.0075 ↔ ρ = 0.013762', () => {
    expect(rhoDesdeEpsilonT(0.004, 28, 420)).toBeCloseTo(0.0206429, 6);
    expect(rhoDesdeEpsilonT(0.0075, 28, 420)).toBeCloseTo(0.0137619, 6);
  });
  it('con εt = fy/Es se recupera ρb (la constante 600 es 0.003 × 200 000)', () => {
    expect(rhoDesdeEpsilonT(epsilonBalanceada(420), 28, 420)).toBeCloseTo(rhoBalanceada(28, 420), 12);
    expect(rhoDesdeEpsilonT(epsilonBalanceada(500), 35, 500)).toBeCloseTo(rhoBalanceada(35, 500), 12);
  });
  it('ida y vuelta ρ ↔ εt', () => {
    expect(epsilonTDesdeRho(rhoDesdeEpsilonT(0.006, 28, 420), 28, 420)).toBeCloseTo(0.006, 12);
  });
});
