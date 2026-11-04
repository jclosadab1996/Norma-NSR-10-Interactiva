import { describe, expect, it } from 'vitest';
import {
  anchoEfectivoAla,
  epsilonT,
  espesorMinimoLoseta,
  espesorMinimoLosetaRemovible,
  espesorMinimoSobreDucto,
  factorRigidezLateral,
  lambdaInterpolado,
  luzElementoNoMonolitico,
  luzLosaLuzCorta,
  momentoPositivoPorEquilibrio,
  momentoRedistribuido,
  redistribucionMaxima,
  relacionModular,
  separacionMaximaNervios,
  separacionMaximaRefuerzoAla,
  separacionMaximaViguetasReparticion,
  verificarNervadas,
} from './analisisConcreto';
import { moduloElasticidad } from './concreto';

describe('redistribución de momentos (C.8.4)', () => {
  it('1000·εt por ciento con tope de 20 %', () => {
    expect(redistribucionMaxima(0.009)).toEqual({ permitida: true, porcentaje: 9 });
    expect(redistribucionMaxima(0.0075).porcentaje).toBeCloseTo(7.5, 9);
    expect(redistribucionMaxima(0.02).porcentaje).toBe(20);
    expect(redistribucionMaxima(0.05).porcentaje).toBe(20);
  });
  it('no se permite si εt < 0.0075', () => {
    expect(redistribucionMaxima(0.005)).toEqual({ permitida: false, porcentaje: 0 });
    expect(momentoRedistribuido(100, 0.005)).toBe(100);
  });
  it('momento reducido y equilibrio estático en viga empotrada con carga uniforme', () => {
    const wu = 40;
    const L = 6;
    const M0 = (wu * L * L) / 8; // 180
    const Mneg = (wu * L * L) / 12; // 120
    const reducido = momentoRedistribuido(Mneg, 0.012); // 12 %
    expect(reducido).toBeCloseTo(105.6, 9);
    expect(momentoPositivoPorEquilibrio(M0, reducido, reducido)).toBeCloseTo(74.4, 9);
    // sin redistribuir se recupera el momento positivo elástico wL²/24 = 60
    expect(momentoPositivoPorEquilibrio(M0, Mneg, Mneg)).toBeCloseTo(60, 9);
  });
  it('εt = 0.003 (dt − c)/c', () => {
    expect(epsilonT(100, 400)).toBeCloseTo(0.009, 9);
  });
});

describe('módulo de elasticidad y λ (C.8.5, C.8.6)', () => {
  it('relación modular Es/Ec', () => {
    expect(relacionModular(28)).toBeCloseTo(200000 / moduloElasticidad(28), 9);
    expect(relacionModular(28, 2300)).toBeCloseTo(200000 / moduloElasticidad(28, 2300), 9);
  });
  it('interpolaciones de λ', () => {
    expect(lambdaInterpolado('fino-liviano', 0)).toBe(0.75);
    expect(lambdaInterpolado('fino-liviano', 1)).toBeCloseTo(0.85, 12);
    expect(lambdaInterpolado('fino-liviano', 0.5)).toBeCloseTo(0.8, 12);
    expect(lambdaInterpolado('grueso-mixto', 0)).toBeCloseTo(0.85, 12);
    expect(lambdaInterpolado('grueso-mixto', 1)).toBeCloseTo(1, 12);
    expect(lambdaInterpolado('grueso-mixto', 3)).toBeCloseTo(1, 12);
  });
});

describe('rigidez efectiva (C.8.8)', () => {
  it('0.5 EIg con cargas mayoradas; 0.7 EIg con cargas de servicio', () => {
    expect(factorRigidezLateral('mayoradas')).toBe(0.5);
    expect(factorRigidezLateral('servicio')).toBeCloseTo(0.7, 12);
  });
});

describe('longitud del vano (C.8.9)', () => {
  it('luz libre + h sin exceder la distancia entre centros', () => {
    expect(luzElementoNoMonolitico(5.6, 0.4, 6.2).luz).toBeCloseTo(6.0, 12);
    expect(luzElementoNoMonolitico(5.9, 0.5, 6.2).luz).toBe(6.2);
  });
  it('losas con luz libre ≤ 3 m', () => {
    expect(luzLosaLuzCorta(2.8)?.luz).toBe(2.8);
    expect(luzLosaLuzCorta(3)?.luz).toBe(3);
    expect(luzLosaLuzCorta(3.1)).toBeNull();
  });
});

describe('vigas T (C.8.12)', () => {
  it('ambos lados: voladizo ≤ 8hf y libre/2; be ≤ L/4', () => {
    // hf = 100, bw = 300, libre = 2000: voladizo = mín(800, 1000) = 800 → be = 1900; L/4 = 1500 (L = 6000) gobierna
    const a = anchoEfectivoAla({ tipo: 'ambos-lados', luz: 6000, hf: 100, bw: 300, libreAlmas: 2000 });
    expect(a.be).toBe(1500);
    expect(a.gobierna).toContain('L/4');
    // L = 10 000: L/4 = 2500 > 1900 → be = 1900
    const b = anchoEfectivoAla({ tipo: 'ambos-lados', luz: 10000, hf: 100, bw: 300, libreAlmas: 2000 });
    expect(b.be).toBe(1900);
    expect(b.voladizo).toBe(800);
    // libre pequeña: libre/2 gobierna
    const c = anchoEfectivoAla({ tipo: 'ambos-lados', luz: 10000, hf: 150, bw: 300, libreAlmas: 1000 });
    expect(c.voladizo).toBe(500);
  });
  it('un solo lado: mín(L/12, 6hf, libre/2)', () => {
    const a = anchoEfectivoAla({ tipo: 'un-lado', luz: 6000, hf: 100, bw: 300, libreAlmas: 2000 });
    expect(a.voladizo).toBe(500); // L/12 = 500; 6hf = 600; 1000
    expect(a.be).toBe(800);
  });
  it('viga aislada: hf ≥ bw/2 y be ≤ 4bw', () => {
    expect(anchoEfectivoAla({ tipo: 'aislada', luz: 5000, hf: 150, bw: 300 })).toMatchObject({ be: 1200, cumpleEspesorAislada: true });
    expect(anchoEfectivoAla({ tipo: 'aislada', luz: 5000, hf: 100, bw: 300 }).cumpleEspesorAislada).toBe(false);
  });
  it('refuerzo transversal del ala: 5hf y 450 mm', () => {
    expect(separacionMaximaRefuerzoAla(80)).toBe(400);
    expect(separacionMaximaRefuerzoAla(120)).toBe(450);
  });
});

describe('losas nervadas (C.8.13)', () => {
  it('separación máxima entre nervios', () => {
    expect(separacionMaximaNervios(400, 1)).toBe(1000);
    expect(separacionMaximaNervios(600, 1)).toBe(1200);
    expect(separacionMaximaNervios(400, 2)).toBe(1400);
    expect(separacionMaximaNervios(600, 2)).toBe(1500);
  });
  it('viguetas transversales de repartición', () => {
    expect(separacionMaximaViguetasReparticion(300)).toBe(3000);
    expect(separacionMaximaViguetasReparticion(500)).toBe(4000);
  });
  it('loseta: 45 mm o 1/20 de la luz libre; removibles: 1/12 y 50 mm', () => {
    expect(espesorMinimoLoseta(600)).toBe(45);
    expect(espesorMinimoLoseta(1000)).toBe(50);
    expect(espesorMinimoLoseta(600, true)).toBe(40);
    expect(espesorMinimoLosetaRemovible(500)).toBe(50);
    expect(espesorMinimoLosetaRemovible(900)).toBe(75);
  });
  it('espesor sobre ductos', () => {
    expect(espesorMinimoSobreDucto(25)).toBe(50);
  });
  it('verificación geométrica', () => {
    const ok = verificarNervadas({ direcciones: 1, h: 400, separacion: 800, anchoSuperior: 120, anchoPromedio: 100, alturaNervio: 350 });
    expect(ok.cumple).toBe(true);
    expect(ok.separacionMaxima).toBe(1000);
    expect(ok.alturaMaximaNervio).toBe(500);
    const mal = verificarNervadas({ direcciones: 1, h: 400, separacion: 1100, anchoSuperior: 90, anchoPromedio: 70, alturaNervio: 400 });
    expect(mal.cumpleSeparacion).toBe(false);
    expect(mal.cumpleAnchoSuperior).toBe(false);
    expect(mal.cumpleAnchoPromedio).toBe(false);
    expect(mal.cumpleAlturaNervio).toBe(false);
    expect(mal.cumple).toBe(false);
  });
});
