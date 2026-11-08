import { describe, expect, it } from 'vitest';
import {
  ACEPTACION,
  CV_MAX_HISTORICO,
  FACTOR_MAX_SOBRE_MENOR,
  FRACCION_ESTADISTICA,
  FRECUENCIAS_MUESTREO,
  KP,
  KR,
  RELACION_MURETE,
  RELLENO_LIMITES,
  TABLA_D341,
  TABLA_D351,
  TABLA_D361,
  TABLA_D371,
} from './materialesMamposteria';

describe('constantes del Capítulo D.3 (verificadas contra las páginas D-13 a D-20)', () => {
  it('kp y kr (D.3.0)', () => {
    expect(KP).toEqual({ concreto: 1.4, arcilla: 0.8, silicocalcarea: 0.8 });
    expect(KR).toEqual({ concreto: 0.9, arcilla: 0.75, silicocalcarea: 0.75 });
  });

  it('Tabla D.3.7-1: factores de esbeltez', () => {
    expect(TABLA_D371.map((f) => f.relacion)).toEqual([1.5, 2.0, 2.5, 3.0, 4.0, 5.0]);
    expect(TABLA_D371.map((f) => f.factor)).toEqual([0.86, 1.0, 1.04, 1.07, 1.15, 1.22]);
    expect(RELACION_MURETE).toEqual({ min: 1.5, max: 5 });
    expect(FACTOR_MAX_SOBRE_MENOR).toBe(1.25);
  });

  it('fracciones estadísticas (D.3.7.3 y D.3.7.4)', () => {
    expect(CV_MAX_HISTORICO).toBe(0.3);
    expect(FRACCION_ESTADISTICA.historico).toEqual({ n30: 0.75, n10: 0.7 });
    expect(FRACCION_ESTADISTICA.previo).toEqual({ n30: 0.85, n10: 0.8, n3: 0.75 });
  });

  it('Tabla D.3.4-1: morteros de pega', () => {
    expect(TABLA_D341.map((m) => [m.tipo, m.fcpMin])).toEqual([
      ['H', 22.5],
      ['M', 17.5],
      ['S', 12.5],
      ['N', 7.5],
    ]);
    expect(TABLA_D341.map((m) => m.flujo)).toEqual([
      { min: 115, max: 125 },
      { min: 115, max: 125 },
      { min: 110, max: 120 },
      { min: 105, max: 115 },
    ]);
    expect(TABLA_D341.every((m) => m.retencionMin === 75)).toBe(true);
    expect(TABLA_D341.map((m) => m.dosificaciones.length)).toEqual([1, 2, 2, 2]);
    const [h, m, s, n] = TABLA_D341;
    expect(h.dosificaciones[0]).toEqual({ portland: 1, cal: { min: 0.25, max: 0.25 }, cementoMamposteria: null, arena: { min: 2.0, max: 2.5 } });
    expect(m.dosificaciones[0].arena).toEqual({ min: 2.25, max: 3.0 });
    expect(m.dosificaciones[1]).toEqual({ portland: 1, cal: null, cementoMamposteria: 1, arena: { min: 2.25, max: 2.5 } });
    expect(s.dosificaciones[0].cal).toEqual({ min: 0.25, max: 0.5 });
    expect(s.dosificaciones[0].arena).toEqual({ min: 2.5, max: 3.5 });
    expect(s.dosificaciones[1]).toMatchObject({ portland: 0.5, cementoMamposteria: 1, arena: { min: 2.5, max: 3.0 } });
    expect(n.dosificaciones[0].cal).toEqual({ min: 0.5, max: 1.25 });
    expect(n.dosificaciones[0].arena).toEqual({ min: 3.0, max: 4.5 });
    expect(n.dosificaciones[1]).toMatchObject({ portland: 0, cementoMamposteria: 1, arena: { min: 3.0, max: 4.0 } });
  });

  it('Tabla D.3.5-1: morteros de relleno', () => {
    expect(TABLA_D351[0]).toEqual({ tipo: 'Fino', portland: 1, fino: { min: 2.25, max: 3.5 }, grueso: null });
    expect(TABLA_D351[1]).toEqual({ tipo: 'Grueso', portland: 1, fino: { min: 2.25, max: 3.0 }, grueso: { min: 1.0, max: 2.0 } });
    expect(RELLENO_LIMITES).toEqual({ minSobreFm: 1.25, maxSobreFm: 1.5, absolutoMinMpa: 12.5 });
  });

  it('Tabla D.3.6-1: espesores mínimos de paredes', () => {
    expect(TABLA_D361.map((f) => [f.nominal, f.exteriorSin, f.exteriorCon, f.tabique])).toEqual([
      [80, 20, 30, 20],
      [100, 20, 30, 20],
      [120, 22, 32, 20],
      [150, 25, 35, 25],
      [200, 30, 40, 25],
      [250, 35, 45, 30],
      [300, 40, 50, 30],
    ]);
    // la pared exterior con perforaciones secundarias siempre exige 10 mm más
    expect(TABLA_D361.every((f) => f.exteriorCon - f.exteriorSin === 10)).toBe(true);
  });

  it('D.3.8: aceptación y frecuencias', () => {
    expect(ACEPTACION).toEqual({ minIndividualFraccion: 0.8, nucleosPorLote: 3, nucleosPromedioMinFraccion: 0.8 });
    expect(FRECUENCIAS_MUESTREO).toMatchObject({
      morteroPegaM2: 200,
      morteroRellenoM3: 10,
      unidadesPorLote: 5,
      unidadesLoteMax: 5000,
      unidadesM2: 200,
      muretesPorGrupo: 3,
      muretesM2: 500,
    });
  });
});
