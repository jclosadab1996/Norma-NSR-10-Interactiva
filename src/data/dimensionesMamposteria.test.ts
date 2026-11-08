import { describe, expect, it } from 'vitest';
import {
  ANGULO_DISPERSION_GRADOS,
  COEF_EM_ARCILLA,
  COEF_EM_CONCRETO,
  COEF_ER,
  DIVISOR_FLECHA_VIGA,
  EM_MAX_MPA,
  EPSILON_MU,
  ER_MAX_MPA,
  ES_ACERO_MPA,
  FACTOR_ALETA,
  FACTOR_ANCHO_EFECTIVO,
  FACTOR_DISTANCIA_APOYOS_VIGA,
  PHI_MAMPOSTERIA,
  RAZON_GM_EM,
  RAZON_GR_ER,
  RELACION_ESBELTEZ_MAX,
  RELACION_VIGA_ALTA,
  TABLA_D54_1,
} from './dimensionesMamposteria';

describe('constantes de D.5.1 a D.5.4 (verificadas contra las páginas D-31 a D-37)', () => {
  it('φ de D.5.1.5', () => {
    expect(PHI_MAMPOSTERIA.perpendicularFlexion).toBe(0.8);
    expect(PHI_MAMPOSTERIA.perpendicularCortante).toBe(0.6);
    expect(PHI_MAMPOSTERIA.enPlanoFlexion).toBe(0.85);
    expect(PHI_MAMPOSTERIA.enPlanoCompresion).toBe(0.6);
    expect(PHI_MAMPOSTERIA.enPlanoCortante).toBe(0.6);
    expect(PHI_MAMPOSTERIA.enPlanoCortanteMaximo).toBe(0.85);
    expect(PHI_MAMPOSTERIA.aplastamiento).toBe(0.6);
    expect(EPSILON_MU).toBe(0.003);
  });

  it('módulos D.5.2', () => {
    expect(ES_ACERO_MPA).toBe(200000);
    expect(COEF_EM_CONCRETO).toBe(900);
    expect(COEF_EM_ARCILLA).toBe(750);
    expect(EM_MAX_MPA).toBe(20000);
    expect(COEF_ER).toBe(2500);
    expect(ER_MAX_MPA).toBe(20000);
    expect(RAZON_GM_EM).toBe(0.4);
    expect(RAZON_GR_ER).toBe(0.5);
  });

  it('Tabla D.5.4-1 transcrita tal como está en la página D-36', () => {
    expect(TABLA_D54_1.relEspaciamiento).toEqual([6, 8, 10, 15, 20]);
    expect(TABLA_D54_1.relEspesor).toEqual([1, 2, 3]);
    expect(TABLA_D54_1.coeficientes).toEqual([
      [1.0, 1.4, 2.0],
      [1.0, 1.3, 1.7],
      [1.0, 1.2, 1.4],
      [1.0, 1.1, 1.2],
      [1.0, 1.0, 1.0],
    ]);
  });

  it('la tabla es monótona: crece con el espesor del machón y decrece con el espaciamiento', () => {
    const c = TABLA_D54_1.coeficientes;
    for (let i = 0; i < c.length; i++) {
      for (let j = 1; j < c[i].length; j++) expect(c[i][j]).toBeGreaterThanOrEqual(c[i][j - 1]);
      expect(c[i][0]).toBe(1);
    }
    for (let j = 0; j < 3; j++) for (let i = 1; i < c.length; i++) expect(c[i][j]).toBeLessThanOrEqual(c[i - 1][j]);
  });

  it('límites dimensionales', () => {
    expect(RELACION_ESBELTEZ_MAX).toBe(25);
    expect(FACTOR_ANCHO_EFECTIVO).toEqual({ trabado: 6, petaca: 3 });
    expect(FACTOR_ALETA).toBe(6);
    expect(FACTOR_DISTANCIA_APOYOS_VIGA).toBe(32);
    expect(DIVISOR_FLECHA_VIGA).toBe(500);
    expect(RELACION_VIGA_ALTA).toEqual({ simple: 1.25, continua: 2.5 });
    expect(ANGULO_DISPERSION_GRADOS).toEqual({ trabado: 45, petaca: 30 });
  });
});
