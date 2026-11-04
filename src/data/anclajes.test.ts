import { describe, expect, it } from 'vitest';
import {
  BORDE_MIN_POST_FACTOR_DA,
  CAC_FACTOR_HEF,
  COEF_ANCO,
  COEF_AVCO,
  FACTOR_PROYECCION_N,
  FUTA_FACTOR_FYA,
  FUTA_MAX_MPA,
  INTERACCION_LIMITE,
  INTERACCION_UMBRAL,
  KC_MAX,
  KC_POSTINSTALADO,
  KC_PREINSTALADO,
  MODOS_FALLA,
  PHI_ACERO,
  PHI_CONCRETO,
  SEPARACION_MIN_FACTOR_DA,
} from './anclajes';

describe('constantes del Apéndice C-D', () => {
  it('kc, ANco y proyección (C-D.5.2)', () => {
    expect([KC_PREINSTALADO, KC_POSTINSTALADO, KC_MAX]).toEqual([10, 7, 10]);
    expect(COEF_ANCO).toBe(9);
    expect(FACTOR_PROYECCION_N).toBe(1.5);
    expect(COEF_ANCO).toBe((2 * FACTOR_PROYECCION_N) ** 2);
    expect(COEF_AVCO).toBe(4.5);
    expect(COEF_AVCO).toBe(2 * FACTOR_PROYECCION_N * FACTOR_PROYECCION_N);
  });
  it('límites de futa: 1.9 fya o 860 MPa', () => {
    expect(FUTA_FACTOR_FYA).toBe(1.9);
    expect(FUTA_MAX_MPA).toBe(860);
  });
  it('interacción: 0.2 y 1.2', () => {
    expect(INTERACCION_UMBRAL).toBe(0.2);
    expect(INTERACCION_LIMITE).toBe(1.2);
  });
  it('separaciones, bordes y distancia crítica (C-D.8)', () => {
    expect(SEPARACION_MIN_FACTOR_DA).toEqual({ sinTorsion: 4, conTorsion: 6 });
    expect(BORDE_MIN_POST_FACTOR_DA).toEqual({ 'post-sobreperforacion': 6, 'post-torque': 8, 'post-desplazamiento': 10 });
    expect(CAC_FACTOR_HEF).toEqual({ 'post-sobreperforacion': 2.5, 'post-torque': 4, 'post-desplazamiento': 4 });
  });
  it('lista de modos de falla con 7 modos', () => {
    expect(MODOS_FALLA.map((m) => m.clave)).toEqual(['Nsa', 'Ncb', 'Npn', 'Nsb', 'Vsa', 'Vcb', 'Vcp']);
  });
});

describe('φ de C-D.4.4 y C-D.4.5', () => {
  it('acero con combinaciones de C.9.2', () => {
    expect(PHI_ACERO['C.9.2'].ductil).toEqual({ traccion: 0.75, cortante: 0.65 });
    expect(PHI_ACERO['C.9.2'].fragil).toEqual({ traccion: 0.65, cortante: 0.6 });
  });
  it('acero con combinaciones del Apéndice C-C', () => {
    expect(PHI_ACERO['apendice-C'].ductil).toEqual({ traccion: 0.8, cortante: 0.75 });
    expect(PHI_ACERO['apendice-C'].fragil).toEqual({ traccion: 0.7, cortante: 0.65 });
  });
  it('concreto con C.9.2: cortante 0.75/0.70; tracción preinstalados 0.75/0.70; cat. 1 0.75/0.65, 2 0.65/0.55, 3 0.55/0.45', () => {
    const t = PHI_CONCRETO['C.9.2'];
    expect(t.cortante).toEqual({ A: 0.75, B: 0.7 });
    expect(t.traccion.preinstalado).toEqual({ A: 0.75, B: 0.7 });
    expect(t.traccion.categoria1).toEqual({ A: 0.75, B: 0.65 });
    expect(t.traccion.categoria2).toEqual({ A: 0.65, B: 0.55 });
    expect(t.traccion.categoria3).toEqual({ A: 0.55, B: 0.45 });
  });
  it('concreto con Apéndice C-C: cortante 0.85/0.75; preinstalados 0.85/0.75; cat. 1 0.85/0.75, 2 0.75/0.65, 3 0.65/0.55', () => {
    const t = PHI_CONCRETO['apendice-C'];
    expect(t.cortante).toEqual({ A: 0.85, B: 0.75 });
    expect(t.traccion.preinstalado).toEqual({ A: 0.85, B: 0.75 });
    expect(t.traccion.categoria1).toEqual({ A: 0.85, B: 0.75 });
    expect(t.traccion.categoria2).toEqual({ A: 0.75, B: 0.65 });
    expect(t.traccion.categoria3).toEqual({ A: 0.65, B: 0.55 });
  });
});
