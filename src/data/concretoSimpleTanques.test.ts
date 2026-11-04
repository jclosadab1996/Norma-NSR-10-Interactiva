import { describe, expect, it } from 'vitest';
import {
  COEF_C22,
  FS_DURABILIDAD_MPA,
  LIMITES_C22,
  PHI_CONCRETO_SIMPLE,
  TABLA_CEMENTANTE_MIN,
  TABLA_EXPOSICION_AMBIENTAL,
  TABLA_MEZCLA_AMBIENTAL,
  TABLA_RECUBRIMIENTO_AMBIENTAL,
  TABLA_RETRACCION_AMBIENTAL,
} from './concretoSimpleTanques';

describe('Datos de C.22 y C.23: integridad de las tablas transcritas', () => {
  it('C.22: φ = 0.60 y coeficientes de las ecuaciones', () => {
    expect(PHI_CONCRETO_SIMPLE).toBe(0.6);
    expect(COEF_C22.flexionTraccion).toBe(0.42);
    expect(COEF_C22.flexionCompresion).toBe(0.85);
    expect(COEF_C22.cortanteViga).toBe(0.11);
    expect(COEF_C22.cortanteDosDireccionesMax).toBe(0.22);
    expect(LIMITES_C22.espesorMinimoZapataMm).toBe(200);
    expect(LIMITES_C22.espesorMinimoMuroMm).toBe(140);
    expect(LIMITES_C22.espesorMinimoMuroSotanoMm).toBe(190);
  });
  it('Tabla C.23-C.4.1.1: cinco tamaños, el cementante crece al bajar el tamaño', () => {
    expect(TABLA_CEMENTANTE_MIN).toHaveLength(5);
    for (let i = 1; i < TABLA_CEMENTANTE_MIN.length; i++) {
      expect(TABLA_CEMENTANTE_MIN[i].tamanoMm).toBeLessThan(TABLA_CEMENTANTE_MIN[i - 1].tamanoMm);
      expect(TABLA_CEMENTANTE_MIN[i].kgM3).toBeGreaterThan(TABLA_CEMENTANTE_MIN[i - 1].kgM3);
    }
  });
  it('Tabla C.23-C.4.2.1: 15 clases', () => {
    expect(TABLA_EXPOSICION_AMBIENTAL.map((f) => f.clase)).toEqual(['F0', 'F1', 'F2', 'F3', 'S0', 'S1', 'S2', 'S3', 'P0', 'P1', 'C0', 'C1', 'C2', 'Q0', 'Q1']);
  });
  it('Tabla C.23-C.4.3.1: a/mc baja y f′c sube con la agresividad de sulfatos', () => {
    const f = (c: string) => TABLA_MEZCLA_AMBIENTAL.find((x) => x.clase === c)!;
    expect(f('S0').aMcMax).toBeGreaterThan(f('S1').aMcMax);
    expect(f('S1').aMcMax).toBeGreaterThan(f('S2').aMcMax);
    expect(f('S2').fcMin).toBeGreaterThan(f('S1').fcMin);
    expect(TABLA_MEZCLA_AMBIENTAL.map((x) => x.clase)).toEqual(['F3', 'S0', 'S1', 'S2', 'S3', 'P1', 'Q1']);
  });
  it('Tabla C.23-C.7.7.1: 16 filas; el concreto contra el suelo lleva 75 mm', () => {
    expect(TABLA_RECUBRIMIENTO_AMBIENTAL).toHaveLength(16);
    const a = TABLA_RECUBRIMIENTO_AMBIENTAL.filter((f) => f.condicion === 'a');
    expect(a).toHaveLength(1);
    expect(a[0].enSitio).toBe(75);
    expect(a[0].preesforzado).toBe(75);
  });
  it('Tabla C.23-C.7.12.2.1: cuantías no decrecientes con la distancia; fy 420 ≤ fy 240', () => {
    const t = TABLA_RETRACCION_AMBIENTAL;
    for (let i = 1; i < t.length; i++) {
      expect(t[i].fy240).toBeGreaterThanOrEqual(t[i - 1].fy240);
      expect(t[i].fy420).toBeGreaterThanOrEqual(t[i - 1].fy420);
      expect(t[i].desdeM).toBe(t[i - 1].hastaM);
    }
    for (const f of t) expect(f.fy420).toBeLessThanOrEqual(f.fy240);
    expect(t[3]).toMatchObject({ fy240: 0.006, fy420: 0.005 });
  });
  it('fs de durabilidad: severa < normal', () => {
    expect(FS_DURABILIDAD_MPA.traccionDirecta.severa).toBeLessThan(FS_DURABILIDAD_MPA.traccionDirecta.normal);
    expect(FS_DURABILIDAD_MPA.cortante.severa).toBeLessThan(FS_DURABILIDAD_MPA.cortante.normal);
  });
});
