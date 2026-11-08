import { describe, expect, it } from 'vitest';
import {
  ESPESOR_MIN_DIAFRAGMA_MM,
  FRACCION_CORTANTE_MIEMBROS,
  FRACCION_DIAGONAL_APLASTAMIENTO,
  FRACCION_LONGITUD_ZONA_MIEMBRO,
  PHI_CORTANTE_DIAFRAGMA,
  R0_MAX_DIAFRAGMA,
  TABLA_D1111,
  VM_MAX_MPA,
} from './muroDiafragma';

describe('constantes de D.11 (valores literales de la norma)', () => {
  it('Tabla D.11.1-1: 0.35, 0.25 y 0.15 MPa', () => {
    expect(TABLA_D1111.map((f) => f.vm)).toEqual([0.35, 0.25, 0.15]);
    expect(VM_MAX_MPA.maciza).toBe(0.35);
    expect(VM_MAX_MPA['perforacion-vertical']).toBe(0.25);
    expect(VM_MAX_MPA['perforacion-horizontal']).toBe(0.15);
  });
  it('la tabla y el mapa coinciden', () => {
    for (const f of TABLA_D1111) expect(VM_MAX_MPA[f.clave]).toBe(f.vm);
  });
  it('φ = 0.50, espesor mínimo 120 mm, R0 ≤ 2.0', () => {
    expect(PHI_CORTANTE_DIAFRAGMA).toBe(0.5);
    expect(ESPESOR_MIN_DIAFRAGMA_MM).toBe(120);
    expect(R0_MAX_DIAFRAGMA).toBe(2);
  });
  it('fracciones de D.11.4.1(b) y D.11.4.3', () => {
    expect(FRACCION_DIAGONAL_APLASTAMIENTO).toBeCloseTo(0.2, 12);
    expect(FRACCION_CORTANTE_MIEMBROS).toBe(0.25);
    expect(FRACCION_LONGITUD_ZONA_MIEMBRO).toBe(0.25);
  });
});
