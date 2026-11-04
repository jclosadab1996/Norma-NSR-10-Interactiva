import { describe, expect, it } from 'vitest';
import { empujeMuro, gammaSumergido, presionesEnProfundidad, puntosCriticos, subpresion, type ParametrosEmpuje } from './empuje';

const base: ParametrosEmpuje = { alturaM: 3.5, k: 0.5, gamma: 18, gammaSat: 20, nivelFreaticoM: 1.5, sobrecarga: 10, gammaW: 9.8 };

describe('B.5.1 empuje sobre muro de sótano', () => {
  it('peso unitario sumergido γ′ = γsat − γw', () => {
    expect(gammaSumergido(20, 9.8)).toBeCloseTo(10.2, 10);
    expect(gammaSumergido(20)).toBeCloseTo(10.2, 10);
  });

  it('presiones a profundidades notables (caso con nivel freático a 1.5 m)', () => {
    const s = presionesEnProfundidad(0, base);
    expect(s.porSobrecarga).toBeCloseTo(5, 10);
    expect(s.total).toBeCloseTo(5, 10);
    const nf = presionesEnProfundidad(1.5, base);
    expect(nf.porSuelo).toBeCloseTo(0.5 * 18 * 1.5, 10);
    expect(nf.hidrostatica).toBe(0);
    const b = presionesEnProfundidad(3.5, base);
    expect(b.porSuelo).toBeCloseTo(13.5 + 0.5 * 10.2 * 2, 10); // 23.7
    expect(b.hidrostatica).toBeCloseTo(19.6, 10);
    expect(b.total).toBeCloseTo(5 + 23.7 + 19.6, 10);
    expect(b.sigmaVEfectiva).toBeCloseTo(10 + 27 + 20.4, 10);
  });

  it('resultantes por componente y total (cálculo a mano)', () => {
    const r = empujeMuro(base);
    expect(r.sobrecarga.fuerza).toBeCloseTo(17.5, 8);
    expect(r.sobrecarga.alturaDesdeBase).toBeCloseTo(1.75, 8);
    expect(r.suelo.fuerza).toBeCloseTo(47.325, 8);
    expect(r.suelo.momentoBase).toBeCloseTo(25.3125 + 27 + 6.8, 8);
    expect(r.agua.fuerza).toBeCloseTo(19.6, 8);
    expect(r.agua.alturaDesdeBase).toBeCloseTo(2 / 3, 8);
    expect(r.total.fuerza).toBeCloseTo(84.425, 8);
    expect(r.total.momentoBase).toBeCloseTo(30.625 + 59.1125 + 13.0666667, 5);
    expect(r.total.alturaDesdeBase).toBeCloseTo(r.total.momentoBase / r.total.fuerza, 10);
    expect(r.base.total).toBeCloseTo(48.3, 8);
  });

  it('sin nivel freático: K·q·H + K·γ·H²/2 y brazo coherente', () => {
    const p = { ...base, nivelFreaticoM: null };
    const r = empujeMuro(p);
    expect(r.agua.fuerza).toBe(0);
    expect(r.sobrecarga.fuerza).toBeCloseTo(0.5 * 10 * 3.5, 8);
    expect(r.suelo.fuerza).toBeCloseTo(0.5 * 0.5 * 18 * 3.5 ** 2, 8);
    expect(r.suelo.alturaDesdeBase).toBeCloseTo(3.5 / 3, 8);
    // nivel freático por debajo de la base equivale a no tenerlo
    expect(empujeMuro({ ...base, nivelFreaticoM: 5 }).total.fuerza).toBeCloseTo(r.total.fuerza, 10);
  });

  it('nivel freático en la superficie: todo sumergido', () => {
    const p = { ...base, nivelFreaticoM: 0 };
    expect(puntosCriticos(p)).toEqual([0, 3.5]);
    const r = empujeMuro(p);
    expect(r.agua.fuerza).toBeCloseTo(0.5 * 9.8 * 3.5 ** 2, 8);
    expect(r.suelo.fuerza).toBeCloseTo(0.5 * 0.5 * 10.2 * 3.5 ** 2, 8);
  });

  it('puntos críticos con nivel freático dentro del muro', () => {
    expect(puntosCriticos(base)).toEqual([0, 1.5, 3.5]);
  });

  it('el empuje total crece con K y con la profundidad del agua', () => {
    const k1 = empujeMuro({ ...base, k: 0.4 }).total.fuerza;
    const k2 = empujeMuro({ ...base, k: 0.6 }).total.fuerza;
    expect(k2).toBeGreaterThan(k1);
    const seco = empujeMuro({ ...base, nivelFreaticoM: null }).total.fuerza;
    const humedo = empujeMuro({ ...base, nivelFreaticoM: 1.5 }).total.fuerza;
    expect(humedo).toBeGreaterThan(seco);
  });
});

describe('B.5.2 subpresión', () => {
  it('u = γw·(profundidad de la losa − nivel freático)', () => {
    expect(subpresion(3.5, 1.5)).toBeCloseTo(19.6, 10);
    expect(subpresion(3.5, 1.5, 10)).toBe(20);
    expect(subpresion(3.5, 4)).toBe(0);
  });
});
