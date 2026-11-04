import { describe, expect, it } from 'vitest';
import {
  ALTURA_MIN_SOBRE_REFUERZO_MM,
  AS_MIN_INTERFAZ_FRACCION_AG,
  PHI_APLASTAMIENTO,
  PILOTE_LIMITES_AXIALES,
  PILOTES_OTROS,
  TABLA_C15111,
  VIGA_AMARRE_DIVISOR_LUZ,
} from './cimentacionesConcreto';

describe('Constantes del Capítulo C.15 (PDF p.443–448)', () => {
  it('C.15.7: alturas mínimas', () => {
    expect(ALTURA_MIN_SOBRE_REFUERZO_MM).toEqual({ suelo: 150, pilotes: 300 });
  });
  it('C.15.8 y C.9.3.2.4', () => {
    expect(AS_MIN_INTERFAZ_FRACCION_AG).toBe(0.005);
    expect(PHI_APLASTAMIENTO).toBe(0.65);
  });
  it('Ecs. C.15-2 a C.15-6', () => {
    const L = PILOTE_LIMITES_AXIALES;
    expect(L.c152.limite).toBe(0.25);
    expect(L.c153).toMatchObject({ factorD: 1.2, factorL: 1.6, limite: 0.35 });
    expect(L.c154).toMatchObject({ factorE: 0.7, limite: 0.33 });
    expect(L.c155).toMatchObject({ factorD: 1.2, factorE: 1, limite: 0.35 });
    expect(L.c156).toMatchObject({ factorD: -1, coefAst: 0.9 });
  });
  it('Tabla C.15.11-1', () => {
    expect(TABLA_C15111.DMI.cuantiaLongitudinalMin).toBe(0.0025);
    expect(TABLA_C15111['DMO-DES'].cuantiaLongitudinalMin).toBe(0.005);
    expect(TABLA_C15111.DMI.barrasLongitudinalesMin).toBe(4);
    expect(TABLA_C15111.DMI.estriboSeparacionZonaSuperiorMm).toBe(100);
    expect(TABLA_C15111['DMO-DES'].estriboZonaSuperiorMm).toBe(1200);
    expect(TABLA_C15111.DMI.longitudRefuerzoMinM).toBe(4);
    expect(TABLA_C15111['DMO-DES'].longitudRefuerzoMinM).toBe(6);
    expect(TABLA_C15111.DMI.fcMinMPa).toBe(17.5);
  });
  it('C.15.11.5 y C.15.13', () => {
    expect(PILOTES_OTROS.prefabricadoReforzado.fcHincadoMinMPa).toBe(21);
    expect(PILOTES_OTROS.prefabricadoPreesforzado.fcHincadoMinMPa).toBe(28);
    expect(VIGA_AMARRE_DIVISOR_LUZ).toEqual({ DES: 20, DMO: 30, DMI: 40 });
  });
});
