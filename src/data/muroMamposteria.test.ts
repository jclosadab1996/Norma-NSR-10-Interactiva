import { describe, expect, it } from 'vitest';
import {
  ALPHA_MCR,
  BANDA_MVD,
  BORDE,
  D_SOBRE_LW,
  EPS_MU,
  ESBELTEZ_MAXIMA_MURO,
  ETA_REFUERZO,
  PHI,
  SEPARACION_ARTICULACION,
  TABLA_D581,
  TABLA_D582,
  TABLA_D583,
} from './muroMamposteria';

describe('constantes de D.5.1, D.5.5–D.5.8 (valores literales de la norma)', () => {
  it('εmu = 0.003; h′/t máximo 25', () => {
    expect(EPS_MU).toBe(0.003);
    expect(ESBELTEZ_MAXIMA_MURO).toBe(25);
  });
  it('φ de D.5.1.5', () => {
    expect(PHI.perpendicular).toEqual({ flexionYFlexoCompresion: 0.8, cortante: 0.6 });
    expect(PHI.paralelo.flexion).toBe(0.85);
    expect(PHI.paralelo.compresionYFlexoCompresion).toBe(0.6);
    expect(PHI.paralelo.cortante).toBe(0.6);
    expect(PHI.paralelo.cortanteMayorQueFlexion).toBe(0.85);
    expect(PHI.aplastamiento).toBe(0.6);
  });
  it('α de D.5.8-1 y η de D.5.8.4.3', () => {
    expect(ALPHA_MCR).toEqual({ 'inyectada-total': 1.8, 'inyectada-solo-refuerzo': 3, 'cavidad-reforzada': 3 });
    expect(ETA_REFUERZO).toEqual({ embebido: 0.7, junta: 0.35 });
  });
  it('articulación plástica y elementos de borde', () => {
    expect(SEPARACION_ARTICULACION).toEqual({ veces_t: 3, maxMm: 600 });
    expect(BORDE.reforzada).toBe(0.2);
    expect(BORDE['cavidad-reforzada']).toBe(0.2);
    expect(BORDE['parcialmente-reforzada']).toBe(0.3);
    expect(BORDE.suspension).toBe(0.15);
    expect(BORDE.separacionEstribosMm).toBe(200);
    expect(BORDE.celdaMinMm).toBe(100);
  });
  it('d = 0.8 ℓw y bandas de Mu/(Vud)', () => {
    expect(D_SOBRE_LW).toBe(0.8);
    expect(BANDA_MVD).toEqual({ inferior: 0.25, superior: 1 });
  });
});

describe('Tablas D.5.8-1, D.5.8-2 y D.5.8-3', () => {
  it('Tabla D.5.8-1: 6 filas con valores monótonos H/M/S ≥ N', () => {
    expect(TABLA_D581).toHaveLength(6);
    for (const f of TABLA_D581) {
      expect(f.cementoCal.HMS).toBeGreaterThanOrEqual(f.cementoCal.N);
      expect(f.cementoMamposteria.HMS).toBeGreaterThanOrEqual(f.cementoMamposteria.N);
    }
  });
  it('Tabla D.5.8-1: unidades macizas, junta vertical, cemento-cal H/M/S = 1.38 y rellenas = 1.12 / 1.09 / 1.06 / 1.00 (horizontal)', () => {
    expect(TABLA_D581.find((f) => f.clave === 'vertical-maciza')!.cementoCal.HMS).toBe(1.38);
    const f = TABLA_D581.find((x) => x.clave === 'horizontal-vp-rellena')!;
    expect([f.cementoCal.HMS, f.cementoCal.N, f.cementoMamposteria.HMS, f.cementoMamposteria.N]).toEqual([1.12, 1.09, 1.06, 1.0]);
  });
  it('Tabla D.5.8-2: 0.30 · 0.33 − 0.13 · 0.20; Tabla D.5.8-3: 0.50 · 0.56 − 0.23 · 0.33', () => {
    expect(TABLA_D582.bajo).toBe(0.3);
    expect(TABLA_D582.intermedio).toEqual({ a: 0.33, b: 0.13 });
    expect(TABLA_D582.alto).toBe(0.2);
    expect(TABLA_D582.coefPu).toBe(0.25);
    expect(TABLA_D583.bajo).toBe(0.5);
    expect(TABLA_D583.intermedio).toEqual({ a: 0.56, b: 0.23 });
    expect(TABLA_D583.alto).toBe(0.33);
  });
});
