import { describe, expect, it } from 'vitest';
import {
  GAMMA_AGUA_DULCE,
  GAMMA_AGUA_MARINA,
  areaInfluencia,
  areaParaFraccion,
  cargaConImpacto,
  cargaGranizo,
  coeficientePisos,
  curvaReduccion,
  empozamientoPorProfundidad,
  empozamientoPorVolumen,
  factorEcuacionB451,
  pesoAguaEmpozada,
  profundidadEquivalente,
  reduccionAreaAferente,
  reduccionPorPisos,
  reduccionPorPisosUniforme,
} from './cargasVivas';

describe('B.4.5.1 reducción por área aferente', () => {
  it('ecuación B.4.5-1: L/L0 = 0.25 + 4.6/√Ai', () => {
    expect(factorEcuacionB451(100)).toBeCloseTo(0.71, 10);
    expect(factorEcuacionB451(84)).toBeCloseTo(0.25 + 4.6 / Math.sqrt(84), 10);
    expect(factorEcuacionB451(21.16)).toBeCloseTo(1.25, 10); // √21.16 = 4.6
  });

  it('área de influencia por tipo de elemento (B.4.5.1.2)', () => {
    expect(areaInfluencia('viga-central', 42)).toBe(84);
    expect(areaInfluencia('viga-borde', 42)).toBe(42);
    expect(areaInfluencia('columna-central', 42)).toBe(168);
    expect(areaInfluencia('columna-borde', 42)).toBe(84);
    expect(areaInfluencia('columna-esquina', 42)).toBe(42);
    // columna central que soporta 3 pisos: se suman las áreas de los pisos
    expect(areaInfluencia('columna-central', 42, 3)).toBe(504);
  });

  it('reduce con L0 = 2.0 y Ai = 84 m²', () => {
    const r = reduccionAreaAferente(2.0, 84, 1);
    expect(r.aplica).toBe(true);
    expect(r.factorEcuacion).toBeCloseTo(0.25 + 4.6 / Math.sqrt(84), 10);
    expect(r.factor).toBeCloseTo(0.7519, 3);
    expect(r.l).toBeCloseTo(1.5038, 3);
    expect(r.gobiernaMinimo).toBe(false);
  });

  it('no aplica fuera de 35 m² o fuera de 1.80 < L0 < 3.00 (límites estrictos)', () => {
    expect(reduccionAreaAferente(2.0, 34.9).aplica).toBe(false);
    expect(reduccionAreaAferente(2.0, 34.9).l).toBe(2.0);
    expect(reduccionAreaAferente(1.8, 100).aplica).toBe(false); // no es superior a 1.80
    expect(reduccionAreaAferente(3.0, 100).aplica).toBe(false); // no es inferior a 3.00
    expect(reduccionAreaAferente(5.0, 100).aplica).toBe(false);
    expect(reduccionAreaAferente(2.5, 35).aplica).toBe(true);
    expect(reduccionAreaAferente(1.8, 10).motivos).toHaveLength(2);
  });

  it('mínimo de 50 % (un piso) y 40 % (dos o más pisos)', () => {
    const a = reduccionAreaAferente(2.0, 600, 1); // ecuación: 0.25 + 4.6/24.49 = 0.438 < 0.5
    expect(a.gobiernaMinimo).toBe(true);
    expect(a.factor).toBe(0.5);
    expect(a.l).toBe(1.0);
    const b = reduccionAreaAferente(2.0, 600, 3); // 0.438 > 0.4
    expect(b.gobiernaMinimo).toBe(false);
    expect(b.factor).toBeCloseTo(0.25 + 4.6 / Math.sqrt(600), 10);
    const c = reduccionAreaAferente(2.0, 2000, 3); // 0.353 < 0.4
    expect(c.gobiernaMinimo).toBe(true);
    expect(c.factor).toBe(0.4);
  });

  it('áreas en que la ecuación alcanza 100 %, 50 % y 40 %', () => {
    expect(areaParaFraccion(1)).toBeCloseTo((4.6 / 0.75) ** 2, 8);
    expect(areaParaFraccion(1)).toBeCloseTo(37.62, 2);
    expect(areaParaFraccion(0.5)).toBeCloseTo(338.56, 2);
    expect(areaParaFraccion(0.4)).toBeCloseTo(940.44, 2);
  });

  it('entre 35 y 37.6 m² la ecuación excede L0 y se limita a L0', () => {
    const r = reduccionAreaAferente(2.0, 36);
    expect(r.factorEcuacion).toBeGreaterThan(1);
    expect(r.ecuacionExcedeL0).toBe(true);
    expect(r.factor).toBe(1);
    expect(r.l).toBe(2.0);
  });

  it('curva de reducción', () => {
    const c = curvaReduccion(1000, 200);
    expect(c[0]).toEqual({ ai: 0, unPiso: 1, variosPisos: 1 });
    const fin = c[c.length - 1];
    expect(fin.ai).toBe(1000);
    expect(fin.unPiso).toBe(0.5);
    expect(fin.variosPisos).toBe(0.4); // 0.395 < 0.4 (Ai > 940 m²)
    // monótona no creciente
    for (let k = 1; k < c.length; k++) expect(c[k].unPiso).toBeLessThanOrEqual(c[k - 1].unPiso + 1e-12);
  });
});

describe('B.4.5.2 reducción por número de pisos', () => {
  it('coeficiente r en un edificio de 12 pisos', () => {
    const n = 12;
    const esperado: Record<number, number> = { 12: 1, 11: 1, 10: 1, 9: 1, 8: 1, 7: 0.9, 6: 0.8, 5: 0.7, 4: 0.6, 3: 0.5, 2: 0.5, 1: 0.5 };
    for (const [i, r] of Object.entries(esperado)) expect(coeficientePisos(Number(i), n)).toBeCloseTo(r, 10);
  });

  it('no aplica en edificios de menos de 5 pisos', () => {
    for (let i = 1; i <= 4; i++) expect(coeficientePisos(i, 4)).toBe(1);
    expect(reduccionPorPisosUniforme(4, 2).aplica).toBe(false);
    expect(reduccionPorPisosUniforme(4, 2).reducida).toBe(8);
  });

  it('cinco pisos: todos r = 1.0; seis pisos: el piso 1 tiene r = 0.9', () => {
    expect(reduccionPorPisosUniforme(5, 2).reducida).toBe(10);
    expect(coeficientePisos(1, 6)).toBeCloseTo(0.9, 10);
    expect(coeficientePisos(1, 6)).toBeLessThan(coeficientePisos(2, 6) + 1e-12);
  });

  it('r continuo y no creciente hacia abajo; mínimo 0.5', () => {
    const n = 30;
    for (let i = n; i > 1; i--) expect(coeficientePisos(i - 1, n)).toBeLessThanOrEqual(coeficientePisos(i, n) + 1e-12);
    expect(coeficientePisos(1, n)).toBe(0.5);
    expect(coeficientePisos(n - 9, n)).toBe(0.5);
  });

  it('Σ r·Li para 12 pisos de 72 kN: 9.5 · 72', () => {
    const r = reduccionPorPisosUniforme(12, 72);
    expect(r.aplica).toBe(true);
    expect(r.sinReducir).toBe(864);
    expect(r.reducida).toBeCloseTo(9.5 * 72, 8);
    expect(r.factorGlobal).toBeCloseTo(9.5 / 12, 10);
    expect(reduccionPorPisos([72, 72, 72, 72, 72, 72]).reducida).toBeCloseTo((5 + 0.9) * 72, 8);
  });
});

describe('B.4.4 impacto', () => {
  it('incrementa la carga viva', () => {
    expect(cargaConImpacto(10, 100)).toBe(20);
    expect(cargaConImpacto(10, 25)).toBeCloseTo(12.5, 10);
    expect(cargaConImpacto(10, 33)).toBeCloseTo(13.3, 10);
  });
});

describe('B.4.8 empozamiento de agua', () => {
  it('peso unitario del agua según la Tabla B.3.2-1', () => {
    expect(GAMMA_AGUA_DULCE).toBe(9.8);
    expect(GAMMA_AGUA_MARINA).toBeCloseTo(10.094, 6);
  });

  it('Le = γw·h y por volumen', () => {
    expect(empozamientoPorProfundidad(0.1)).toBeCloseTo(0.98, 10);
    expect(empozamientoPorProfundidad(0.25)).toBeCloseTo(2.45, 10);
    expect(pesoAguaEmpozada(30)).toBeCloseTo(294, 8);
    expect(empozamientoPorVolumen(30, 300)).toBeCloseTo(0.98, 10);
    expect(profundidadEquivalente(30, 300)).toBeCloseTo(0.1, 10);
  });
});

describe('B.4.8.3 granizo', () => {
  it('aplica solo por encima de 2 000 m o por exigencia de la autoridad', () => {
    expect(cargaGranizo({ alturaMsnm: 2000, inclinacionGrados: 5 }).aplica).toBe(false);
    expect(cargaGranizo({ alturaMsnm: 1500, inclinacionGrados: 5 }).g).toBe(0);
    const bog = cargaGranizo({ alturaMsnm: 2600, inclinacionGrados: 5 });
    expect(bog).toEqual({ aplica: true, motivo: 'altura', g: 1.0, reducida: false });
    const baja = cargaGranizo({ alturaMsnm: 500, inclinacionGrados: 5, exigidoPorAutoridad: true });
    expect(baja).toEqual({ aplica: true, motivo: 'autoridad', g: 1.0, reducida: false });
  });

  it('se reduce a 0.5 kN/m² si la inclinación es mayor de 15°', () => {
    expect(cargaGranizo({ alturaMsnm: 2600, inclinacionGrados: 15 }).g).toBe(1.0);
    expect(cargaGranizo({ alturaMsnm: 2600, inclinacionGrados: 15.1 }).g).toBe(0.5);
    expect(cargaGranizo({ alturaMsnm: 2600, inclinacionGrados: 20 }).reducida).toBe(true);
  });
});
