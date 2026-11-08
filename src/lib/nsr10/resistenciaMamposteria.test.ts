import { describe, expect, it } from 'vitest';
import {
  esfuerzoMurete,
  estadisticos,
  factorEsbeltezMurete,
  fmDesdeRm,
  fmEstadistico,
  fmInyectado,
  fmMuestraMuretes,
  frecuenciasMuestreo,
  kpPorUnidad,
  krPorUnidad,
  limitesMorteroRelleno,
  relacionMureteValida,
  resistenciaRm,
  verificarAceptacion,
  verificarNucleos,
} from './resistenciaMamposteria';

describe('Tabla D.3.7-1: factor de esbeltez del murete', () => {
  it('valores tabulados exactos', () => {
    expect(factorEsbeltezMurete(1.5)).toBe(0.86);
    expect(factorEsbeltezMurete(2)).toBe(1.0);
    expect(factorEsbeltezMurete(2.5)).toBe(1.04);
    expect(factorEsbeltezMurete(3)).toBe(1.07);
    expect(factorEsbeltezMurete(4)).toBe(1.15);
    expect(factorEsbeltezMurete(5)).toBe(1.22);
  });
  it('interpolación lineal entre valores tabulados', () => {
    expect(factorEsbeltezMurete(1.75)).toBeCloseTo(0.93, 10);
    expect(factorEsbeltezMurete(2.25)).toBeCloseTo(1.02, 10);
    expect(factorEsbeltezMurete(3.5)).toBeCloseTo(1.11, 10);
    expect(factorEsbeltezMurete(4.5)).toBeCloseTo(1.185, 10);
  });
  it('fuera de 1.5–5 no hay factor', () => {
    expect(factorEsbeltezMurete(1.4)).toBeNaN();
    expect(factorEsbeltezMurete(5.1)).toBeNaN();
    expect(relacionMureteValida(1.5)).toBe(true);
    expect(relacionMureteValida(5)).toBe(true);
    expect(relacionMureteValida(NaN)).toBe(false);
  });
});

describe('D.3.7.2: f′m de una muestra de 3 muretes', () => {
  it('esfuerzo = carga / área neta', () => {
    expect(esfuerzoMurete(200, 40000)).toBeCloseTo(5.0, 10);
  });
  it('promedio por el factor de esbeltez', () => {
    const r = fmMuestraMuretes([5.0, 5.5, 6.0], 3);
    expect(r.promedio).toBeCloseTo(5.5, 10);
    expect(r.menor).toBe(5.0);
    expect(r.tope).toBeCloseTo(6.25, 10);
    expect(r.limitado).toBe(false);
    expect(r.factor).toBe(1.07);
    expect(r.fm).toBeCloseTo(5.885, 10);
    expect(r.completa).toBe(true);
  });
  it('el promedio se limita al 125 % del menor valor', () => {
    const r = fmMuestraMuretes([4, 6, 6], 2);
    expect(r.promedio).toBeCloseTo(16 / 3, 10);
    expect(r.tope).toBe(5);
    expect(r.limitado).toBe(true);
    expect(r.fm).toBeCloseTo(5.0, 10);
  });
  it('relación fuera de rango deja f′m sin definir', () => {
    const r = fmMuestraMuretes([5, 5, 5], 6);
    expect(r.relacionValida).toBe(false);
    expect(r.fm).toBeNaN();
  });
});

describe('D.3.7.3 y D.3.7.4: determinación estadística', () => {
  const rep = (x: number, n: number) => Array.from({ length: n }, () => x);
  it('estadísticos', () => {
    const e = estadisticos([4, 6]);
    expect(e.promedio).toBe(5);
    expect(e.desviacion).toBeCloseTo(Math.SQRT2, 10);
    expect(e.cv).toBeCloseTo(Math.SQRT2 / 5, 10);
  });
  it('históricos: 75 % con ≥ 30, 70 % con 10 a 29, no aplicable con < 10', () => {
    expect(fmEstadistico(rep(10, 30), 'historico').fm).toBeCloseTo(7.5, 10);
    expect(fmEstadistico(rep(10, 30), 'historico').numeral).toBe('D.3.7.3.1');
    expect(fmEstadistico(rep(10, 12), 'historico').fm).toBeCloseTo(7.0, 10);
    expect(fmEstadistico(rep(10, 12), 'historico').numeral).toBe('D.3.7.3.2');
    const r = fmEstadistico(rep(10, 9), 'historico');
    expect(r.aplicable).toBe(false);
    expect(r.fm).toBeNull();
  });
  it('históricos: CV > 30 % impide usar el registro', () => {
    const v = [...rep(5, 6), ...rep(15, 6)]; // promedio 10, CV cercano a 0.52
    const r = fmEstadistico(v, 'historico');
    expect(r.cv).toBeGreaterThan(0.3);
    expect(r.aplicable).toBe(false);
  });
  it('previos: 85 % con ≥ 30, 80 % con 11 a 29, 75 % con 3 a 9', () => {
    expect(fmEstadistico(rep(10, 30), 'previo').fm).toBeCloseTo(8.5, 10);
    expect(fmEstadistico(rep(10, 20), 'previo').fm).toBeCloseTo(8.0, 10);
    expect(fmEstadistico(rep(10, 9), 'previo').fm).toBeCloseTo(7.5, 10);
    expect(fmEstadistico(rep(10, 3), 'previo').fm).toBeCloseTo(7.5, 10);
    expect(fmEstadistico(rep(10, 2), 'previo').aplicable).toBe(false);
  });
  it('previos: n = 10 es un vacío del texto, se adopta 80 % y se marca como interpretación', () => {
    const r = fmEstadistico(rep(10, 10), 'previo');
    expect(r.fraccion).toBe(0.8);
    expect(r.interpretacion).toBe(true);
  });
});

describe('D.3.7.5 y D.3.7.6: f′m por calidad de los materiales', () => {
  it('kp y kr', () => {
    expect(kpPorUnidad('concreto')).toBe(1.4);
    expect(kpPorUnidad('arcilla')).toBe(0.8);
    expect(krPorUnidad('silicocalcarea')).toBe(0.75);
  });
  it('Rm de un bloque de concreto de h = 190 mm (Ec. D.3.7-1)', () => {
    const r = resistenciaRm({ h: 190, fcu: 10, fcp: 12.5, kp: 1.4 });
    expect(r.terminoUnidad).toBeCloseTo((380 / 645) * 10, 10);
    expect(r.terminoMortero).toBeCloseTo((70 / 645) * 12.5, 10);
    expect(r.Rm).toBeCloseTo(7.248062, 5);
    expect(r.gobiernaLimite).toBe(false);
    expect(fmDesdeRm(r.Rm)).toBeCloseTo(5.436047, 5);
  });
  it('el límite 0.8 f′cu puede gobernar', () => {
    const r = resistenciaRm({ h: 190, fcu: 10, fcp: 22.5, kp: 1.4 });
    expect(r.sinLimite).toBeCloseTo(8.3333, 3);
    expect(r.gobiernaLimite).toBe(true);
    expect(r.Rm).toBe(8);
    expect(fmDesdeRm(r.Rm)).toBe(6);
  });
  it('mampostería inyectada (Ec. D.3.7-3): gobierna el valor sin tope o el tope 0.94 Rm', () => {
    const base = { h: 190, fcu: 10, fcp: 12.5, kp: 1.4, r: 0.55, kr: 0.9 };
    const a = fmInyectado({ ...base, fcr: 12.5 });
    expect(a.sinTope).toBeCloseTo(0.75 * (0.55 * 7.248062 + 0.9 * 0.9 * 0.45 * 12.5), 5);
    expect(a.sinTope).toBeCloseTo(6.40701, 4);
    expect(a.gobiernaTope).toBe(false);
    expect(a.fm).toBeCloseTo(a.sinTope, 10);
    const b = fmInyectado({ ...base, fcr: 17.5 });
    expect(b.sinTope).toBeCloseTo(7.773888, 4);
    expect(b.tope).toBeCloseTo(0.94 * 7.248062, 5);
    expect(b.gobiernaTope).toBe(true);
    expect(b.fm).toBeCloseTo(6.813178, 4);
  });
});

describe('D.3.5.3: límites de f′cr del mortero de relleno', () => {
  it('rango 1.25–1.5 f′m con piso de 12.5 MPa', () => {
    expect(limitesMorteroRelleno(14)).toMatchObject({ minimo: 17.5, maximo: 21, contradiccion: false });
    expect(limitesMorteroRelleno(10)).toMatchObject({ minimo: 12.5, maximo: 15, contradiccion: false });
  });
  it('con f′m < 8.33 MPa el piso supera al tope (texto contradictorio)', () => {
    const l = limitesMorteroRelleno(8);
    expect(l.minimo).toBe(12.5);
    expect(l.maximo).toBe(12);
    expect(l.contradiccion).toBe(true);
  });
});

describe('D.3.8.2: aceptación', () => {
  it('cumple con promedio ≥ especificada y ningún valor < 80 %', () => {
    const r = verificarAceptacion([10, 11, 12], 10);
    expect(r.cumple).toBe(true);
    expect(r.umbralIndividual).toBe(8);
  });
  it('falla por promedio', () => {
    const r = verificarAceptacion([9, 10, 9.5], 10);
    expect(r.cumplePromedio).toBe(false);
    expect(r.cumpleIndividual).toBe(true);
    expect(r.cumple).toBe(false);
    expect(r.requiereD3823).toBe(false);
  });
  it('falla por un valor individual bajo aunque el promedio cumpla (activa D.3.8.2.3)', () => {
    const r = verificarAceptacion([14, 14, 7], 10);
    expect(r.cumplePromedio).toBe(true);
    expect(r.cumpleIndividual).toBe(false);
    expect(r.nBajos).toBe(1);
    expect(r.requiereD3823).toBe(true);
  });
  it('el valor exactamente en 80 % no es inferior', () => {
    expect(verificarAceptacion([8, 12, 10], 10).cumpleIndividual).toBe(true);
  });
  it('núcleos: promedio ≥ 80 % de la especificada', () => {
    expect(verificarNucleos([8.5, 9, 7.8], 10).cumple).toBe(true);
    expect(verificarNucleos([7, 7.5, 8], 10).cumple).toBe(false);
    expect(verificarNucleos([8, 8], 10).completo).toBe(false);
  });
});

describe('D.3.8.1: frecuencias mínimas', () => {
  it('1200 m², 45 m³ inyectados, 12 000 unidades', () => {
    const f = frecuenciasMuestreo({ areaMuroM2: 1200, volumenInyectadoM3: 45, unidades: 12000 });
    expect(f.morteroPega).toBe(6);
    expect(f.morteroRelleno).toBe(5);
    expect(f.unidades).toBe(15);
    expect(f.muretes).toBe(9);
    expect(f.muretesInyectadosMin).toBe(5);
  });
  it('el criterio por día puede superar al de área', () => {
    const f = frecuenciasMuestreo({ areaMuroM2: 300, volumenInyectadoM3: 20, unidades: 3000, diasPega: 8, diasInyeccion: 1 });
    expect(f.morteroPega).toBe(8);
    expect(f.morteroRelleno).toBe(2);
    expect(f.muretes).toBe(3);
    expect(f.unidades).toBe(5);
  });
  it('sin relleno no se exige ensayo de mortero de relleno', () => {
    expect(frecuenciasMuestreo({ areaMuroM2: 100, volumenInyectadoM3: 0, unidades: 500, diasInyeccion: 3 }).morteroRelleno).toBe(0);
  });
});
