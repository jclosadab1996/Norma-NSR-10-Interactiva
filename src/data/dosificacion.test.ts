import { describe, expect, it } from 'vitest';
import {
  COEF_FCR,
  COEF_FCR_SIN_DATOS,
  CURADO,
  FACTOR_MODIFICACION_DESVIACION,
  FCR_SIN_DATOS,
  FRECUENCIA_MUESTREO,
  MARGEN_RESULTADO_INDIVIDUAL,
  NUCLEOS,
} from './dosificacion';

describe('dosificacion: tablas de C.5', () => {
  it('Tabla C.5.3.1.2: 15 → 1.16, 20 → 1.08, 25 → 1.03, 30 → 1.00 (decrece con n)', () => {
    expect(FACTOR_MODIFICACION_DESVIACION.map((f) => [f.n, f.factor])).toEqual([
      [15, 1.16],
      [20, 1.08],
      [25, 1.03],
      [30, 1.0],
    ]);
    for (let i = 1; i < FACTOR_MODIFICACION_DESVIACION.length; i++) {
      expect(FACTOR_MODIFICACION_DESVIACION[i].factor).toBeLessThan(FACTOR_MODIFICACION_DESVIACION[i - 1].factor);
    }
  });

  it('Ecuaciones C.5-1 a C.5-3: 1.34 ss; 2.33 ss − 3.5; 0.90 f′c + 2.33 ss', () => {
    expect(COEF_FCR.c51.k).toBe(1.34);
    expect(COEF_FCR.c52).toEqual({ k: 2.33, resta: 3.5 });
    expect(COEF_FCR.c53).toEqual({ factorFc: 0.9, k: 2.33 });
  });

  it('Tabla C.5.3.2.2: +7.0 (< 21), +8.3 (21 a 35), 1.10 f′c + 5.0 (> 35)', () => {
    expect(COEF_FCR_SIN_DATOS.bajo).toEqual({ suma: 7.0, limite: 21 });
    expect(COEF_FCR_SIN_DATOS.medio.suma).toBe(8.3);
    expect(COEF_FCR_SIN_DATOS.alto).toEqual({ factorFc: 1.1, suma: 5.0, limite: 35 });
    expect(FCR_SIN_DATOS).toHaveLength(3);
  });

  it('criterios de aceptación, muestreo y curado', () => {
    expect(MARGEN_RESULTADO_INDIVIDUAL).toEqual({ mpa: 3.5, fraccion: 0.1, limiteFc: 35 });
    expect(NUCLEOS).toMatchObject({ cantidad: 3, fraccionPromedio: 0.85, fraccionMinima: 0.75 });
    expect(FRECUENCIA_MUESTREO).toEqual({ porDia: 1, m3: 40, m2: 200, tandas: 50 });
    expect(CURADO).toEqual({ temperaturaMinC: 10, diasNormal: 7, diasAltaResistenciaInicial: 3 });
  });
});
