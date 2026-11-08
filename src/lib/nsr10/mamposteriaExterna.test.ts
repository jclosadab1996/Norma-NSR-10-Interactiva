import { describe, expect, it } from 'vitest';
import {
  EXTERNA,
  areaAlambresPorMetro,
  areaMinimaMalla,
  conectoresMinimos,
  disenoSimplificadoCortante,
  esfuerzosSeccionTransformada,
  espesorMinimoRevoqueParaMalla,
  espesorTransformadoEnPlano,
  moduloElasticidadRevoque,
  relacionModulosExterna,
  seccionTransformada,
  subcapasRevoque,
  verificarEspesoresExterna,
  verificarMalla,
  verificarMaterialesExterna,
} from './mamposteriaExterna';

describe('constantes de D.12 (valores literales)', () => {
  it('espesores, resistencias, cuantías, conectores y recubrimientos', () => {
    expect(EXTERNA.espesorTotalMin).toBe(130);
    expect(EXTERNA.espesorMamposteriaMin).toBe(90);
    expect(EXTERNA.espesorRevoqueMinCara).toBe(20);
    expect(EXTERNA.fmMin).toBe(8);
    expect(EXTERNA.fcreMin).toBe(12.5);
    expect(EXTERNA.capaRevoque).toEqual({ min: 15, max: 45 });
    expect(EXTERNA.subcapa).toEqual({ min: 10, max: 15 });
    expect(EXTERNA.cuantiaMin).toEqual({ vertical: 0.00035, horizontal: 0.00035 });
    expect(EXTERNA.separacionMaxMalla).toBe(300);
    expect(EXTERNA.clavos).toEqual({ porM2: 9, diametroMin: 3, sobresaleMin: 10 });
    expect(EXTERNA.barras).toEqual({ porM2: 4, diametroMin: 4.5, ganchoGrados: 90 });
    expect(EXTERNA.prolongacionBordeMin).toBe(200);
    expect(EXTERNA.recubrimiento).toEqual({ aMamposteria: 5, externo: 10 });
    expect(EXTERNA.curadoDias).toBe(7);
    expect(EXTERNA.coefEcre).toBe(2000);
  });
});

describe('materiales y espesores', () => {
  it('Ecre = 2000 √f′cre', () => {
    expect(moduloElasticidadRevoque(12.5)).toBeCloseTo(7071.0678, 3);
    expect(moduloElasticidadRevoque(16)).toBe(8000);
  });
  it('f′m ≥ 8 y f′cre ≥ 12.5', () => {
    expect(verificarMaterialesExterna(8, 12.5).cumple).toBe(true);
    expect(verificarMaterialesExterna(7.9, 12.5).fmCumple).toBe(false);
    expect(verificarMaterialesExterna(8, 12).fcreCumple).toBe(false);
  });
  it('relación de módulos: ensayos si > 2 o < 0.5', () => {
    expect(relacionModulosExterna(6000, 7071).requiereEnsayos).toBe(false);
    expect(relacionModulosExterna(6000, 12001).requiereEnsayos).toBe(true);
    expect(relacionModulosExterna(6000, 2999).requiereEnsayos).toBe(true);
    expect(relacionModulosExterna(6000, 3000).requiereEnsayos).toBe(false);
  });
  it('espesores: 90 + 2 × 20 = 130 mm cumple; 15 mm por cara incumple D.12.1.3', () => {
    const a = verificarEspesoresExterna(90, 20, 20);
    expect(a.total).toBe(130);
    expect(a.cumple).toBe(true);
    const b = verificarEspesoresExterna(100, 15, 15);
    expect(b.total).toBe(130);
    expect(b.revoque1Cumple).toBe(false);
    expect(b.capasEnRango).toBe(true);
    expect(b.cumple).toBe(false);
    expect(verificarEspesoresExterna(100, 50, 20).capasEnRango).toBe(false);
  });
  it('sub-capas de 10 a 15 mm', () => {
    expect(subcapasRevoque(15)).toEqual({ nMin: 1, nMax: 1, factible: true, unaSolaCapa: true });
    expect(subcapasRevoque(20)).toEqual({ nMin: 2, nMax: 2, factible: true, unaSolaCapa: false });
    expect(subcapasRevoque(45)).toMatchObject({ nMin: 3, nMax: 4, factible: true });
    expect(subcapasRevoque(17).factible).toBe(false);
  });
});

describe('malla electrosoldada', () => {
  it('área mínima: 0.00035 × 140 mm × 1000 mm = 49 mm²/m', () => {
    expect(areaMinimaMalla(140)).toBeCloseTo(49, 10);
  });
  it('alambre de 4 mm cada 150 mm: 12.566 × 6.667 = 83.78 mm²/m', () => {
    expect(areaAlambresPorMetro(4, 150)).toBeCloseTo(83.7758, 3);
  });
  it('verificación: 4 mm @ 150 cumple; 3 mm @ 300 cumple en separación pero no en área', () => {
    const a = verificarMalla(4, 150, 140);
    expect(a.cumple).toBe(true);
    expect(a.separacionPorArea).toBeCloseTo(256.4, 0);
    const b = verificarMalla(3, 300, 140); // 7.0686 × 3.333 = 23.56 < 49
    expect(b.separacionCumple).toBe(true);
    expect(b.areaCumple).toBe(false);
    expect(verificarMalla(8, 350, 140).separacionCumple).toBe(false);
  });
  it('conectores: 9/m² con clavos y 4/m² con barras', () => {
    expect(conectoresMinimos(12, 'clavos')).toBe(108);
    expect(conectoresMinimos(12, 'barras')).toBe(48);
    expect(conectoresMinimos(2.1, 'barras')).toBe(9);
  });
  it('espesor mínimo de revoque para la malla: 5 + 10 + dH + dV', () => {
    expect(espesorMinimoRevoqueParaMalla(2.5, 2.5)).toBe(20);
    expect(espesorMinimoRevoqueParaMalla(4, 4)).toBe(23);
  });
});

describe('sección transformada (D.12.4.4)', () => {
  const Em = 6000;
  const Ere = moduloElasticidadRevoque(12.5);
  const capas = [
    { nombre: 'Revoque 1', espesor: 20, E: Ere },
    { nombre: 'Mampostería', espesor: 100, E: Em },
    { nombre: 'Revoque 2', espesor: 20, E: Ere },
  ];
  const sec = seccionTransformada(capas, 1000, 1);
  it('relación modular n = 1.1785 y espesor total sin cambio', () => {
    expect(sec.capas[0].n).toBeCloseTo(1.1785113, 6);
    expect(sec.capas[1].n).toBe(1);
    expect(sec.espesorTotal).toBe(140);
    expect(sec.capas[0].anchoTransformado).toBeCloseTo(1178.5113, 3);
  });
  it('At, ȳ e It (valores calculados a mano)', () => {
    expect(sec.At).toBeCloseTo(147140.452, 2);
    expect(sec.yBarra).toBeCloseTo(70, 9);
    expect(sec.It).toBeCloseTo(254610309.22, 0);
  });
  it('esfuerzos con P = 20 kN y M = 1.5 kN·m por metro', () => {
    const s = esfuerzosSeccionTransformada(sec, 20, 1.5);
    expect(s[0].sigmaSup).toBeCloseTo(0.6462, 3);
    expect(s[0].sigmaInf).toBeCloseTo(0.5073, 3);
    expect(s[1].sigmaSup).toBeCloseTo(0.4305, 3);
    expect(s[1].sigmaInf).toBeCloseTo(-0.1586, 3);
    expect(s[2].sigmaSup).toBeCloseTo(-0.187, 3);
    expect(s[2].sigmaInf).toBeCloseTo(-0.3258, 3);
  });
  it('sin momento el esfuerzo en la mampostería es P/At y en el revoque n P/At', () => {
    const s = esfuerzosSeccionTransformada(sec, 20, 0);
    expect(s[1].sigmaSup).toBeCloseTo(20000 / 147140.452, 6);
    expect(s[0].sigmaSup).toBeCloseTo((1.1785113 * 20000) / 147140.452, 6);
  });
  it('espesor transformado en el plano = 2 × 1.1785 × 20 + 100', () => {
    expect(espesorTransformadoEnPlano(capas, 1)).toBeCloseTo(147.1405, 3);
  });
  it('con la capa de revoque como base la transformación es equivalente (σ real no cambia)', () => {
    const sec2 = seccionTransformada(capas, 1000, 0);
    expect(sec2.base).toBe(0);
    const s1 = esfuerzosSeccionTransformada(sec, 20, 1.5);
    const s2 = esfuerzosSeccionTransformada(sec2, 20, 1.5);
    // el esfuerzo real no depende del material base elegido
    s1.forEach((x, i) => {
      expect(s2[i].sigmaSup).toBeCloseTo(x.sigmaSup, 9);
      expect(s2[i].sigmaInf).toBeCloseTo(x.sigmaInf, 9);
    });
  });
});

describe('diseño simplificado (D.12.4.6)', () => {
  it('h = 40 mm, f′c = 12.5 MPa, ℓw = 3000 mm: Vc = 0.17 √12.5 × 40 × 2400 = 57.7 kN', () => {
    const r = disenoSimplificadoCortante(20, 20, 12.5, 3000);
    expect(r.h).toBe(40);
    expect(r.d).toBe(2400);
    expect(r.Vc).toBeCloseTo(0.17 * Math.sqrt(12.5) * 40 * 2400 / 1000, 6);
    expect(r.Vc).toBeCloseTo(57.70, 1);
    expect(r.phi).toBe(0.75);
    expect(r.phiVc).toBeCloseTo(43.28, 1);
  });
});
