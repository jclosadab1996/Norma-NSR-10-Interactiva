import { describe, expect, it } from 'vitest';
import {
  cargaPrueba,
  evaluarPrimeraPrueba,
  evaluarRepeticion,
  limiteDeflexionC201,
  luzPrueba,
  PHI_MAX_EVALUACION,
  puedeReducirLEnB,
} from './pruebaCarga';

describe('Intensidad de la carga de prueba (C.20.3.2)', () => {
  it('D = 4.0, L = 2.0 kN/m², sin cubierta: a = 1.15·4 + 1.5·2 = 7.6 ; b = 4.6 + 1.8 = 6.4 ; c = 5.2 → 7.6 (a)', () => {
    const r = cargaPrueba({ D: 4, L: 2 });
    expect(r.a).toBeCloseTo(7.6, 12);
    expect(r.b).toBeCloseTo(6.4, 12);
    expect(r.c).toBeCloseTo(5.2, 12);
    expect(r.total).toBeCloseTo(7.6, 12);
    expect(r.gobierna).toBe('a');
    expect(r.adicional).toBeCloseTo(3.6, 12);
  });
  it('con cubierta dominante gobierna (b): D = 3, L = 1, Lr = 1.5 → a = 3.45 + 1.5 + 0.6 = 5.55 ; b = 3.45 + 0.9 + 2.25 = 6.6', () => {
    const r = cargaPrueba({ D: 3, L: 1, cubierta: 1.5 });
    expect(r.a).toBeCloseTo(5.55, 12);
    expect(r.b).toBeCloseTo(6.6, 12);
    expect(r.gobierna).toBe('b');
  });
  it('(c) 1.3D gobierna si las cargas vivas son pequeñas: D = 10, L = 0.2', () => {
    const r = cargaPrueba({ D: 10, L: 0.2 });
    expect(r.c).toBeCloseTo(13, 12);
    expect(r.a).toBeCloseTo(11.5 + 0.3, 12);
    expect(r.gobierna).toBe('c');
  });
  it('el factor de L en (b) baja a 0.45 si se permite', () => {
    const r = cargaPrueba({ D: 3, L: 2, cubierta: 1, reducirLEnB: true });
    expect(r.factorLEnB).toBe(0.45);
    expect(r.b).toBeCloseTo(3.45 + 0.9 + 1.5, 12);
  });
  it('reducir L en (b) no es posible en estacionamientos, reuniones públicas ni con L > 4.8', () => {
    expect(puedeReducirLEnB('general', 2.4)).toBe(true);
    expect(puedeReducirLEnB('general', 4.8)).toBe(true);
    expect(puedeReducirLEnB('general', 5)).toBe(false);
    expect(puedeReducirLEnB('estacionamiento', 2)).toBe(false);
    expect(puedeReducirLEnB('reunion-publica', 2)).toBe(false);
  });
});

describe('Criterio de aceptación (C.20-1, C.20-2, C.20-3)', () => {
  it('C.20-1: ℓt = 6000, h = 400 → 6000²/(20000·400) = 4.5 mm', () => {
    expect(limiteDeflexionC201(6000, 400)).toBeCloseTo(4.5, 12);
  });
  it('Δ1 = 4.2 ≤ 4.5: aceptable por C.20-1 aunque Δr no cumpla C.20-2', () => {
    const r = evaluarPrimeraPrueba({ lt: 6000, h: 400, delta1: 4.2, deltaR: 2 });
    expect(r.cumple201).toBe(true);
    expect(r.limite202).toBeCloseTo(1.05, 12);
    expect(r.cumple202).toBe(false);
    expect(r.aceptable).toBe(true);
  });
  it('Δ1 = 6.0 > 4.5 y Δr = 1.2 ≤ 6.0/4 = 1.5: aceptable por C.20-2', () => {
    const r = evaluarPrimeraPrueba({ lt: 6000, h: 400, delta1: 6, deltaR: 1.2 });
    expect(r.cumple201).toBe(false);
    expect(r.cumple202).toBe(true);
    expect(r.aceptable).toBe(true);
  });
  it('ninguna se cumple: se puede repetir la prueba', () => {
    const r = evaluarPrimeraPrueba({ lt: 6000, h: 400, delta1: 6, deltaR: 2 });
    expect(r.aceptable).toBe(false);
    expect(r.puedeRepetir).toBe(true);
  });
  it('C.20-3: Δr ≤ Δ2/5', () => {
    expect(evaluarRepeticion({ delta2: 6.5, deltaR: 1.2 })).toEqual({ limite203: 1.3, cumple203: true });
    expect(evaluarRepeticion({ delta2: 6.5, deltaR: 1.5 }).cumple203).toBe(false);
  });
  it('luz ℓt: menor entre centros y libre + h; voladizo = 2 × distancia', () => {
    expect(luzPrueba({ entreCentros: 6000, libre: 5700, h: 400 })).toBe(6000); // 5700 + 400 = 6100 > 6000
    expect(luzPrueba({ entreCentros: 6000, libre: 5500, h: 400 })).toBe(5900);
    expect(luzPrueba({ voladizo: 1800 })).toBe(3600);
  });
});

describe('φ máximos de evaluación (C.20.2.5)', () => {
  it('valores de C-171', () => {
    expect(PHI_MAX_EVALUACION).toEqual({ traccion: 1.0, compresionEspiral: 0.9, compresionOtros: 0.8, cortanteTorsion: 0.8, aplastamiento: 0.8 });
  });
});
