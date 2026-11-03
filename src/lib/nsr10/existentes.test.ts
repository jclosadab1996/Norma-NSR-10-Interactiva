import { describe, expect, it } from 'vitest';
import {
  indiceFlexibilidad,
  indiceSobreesfuerzo,
  modificacionSinRevalidar,
  nivelRehabilitacion,
  parametrosSeguridadLimitada,
  resistenciaEfectiva,
  rPrimaReferencia,
} from './existentes';
import { instrumentacionConjunto, instrumentacionEdificacion } from './instrumentacion';
import { mesetaSa, sa } from './espectro';

describe('A.10 — evaluación de edificaciones existentes', () => {
  it('Nef = φc·φe·Nex (A.10-1, Tabla A.10.4-1)', () => {
    expect(resistenciaEfectiva(100, 'buena', 'buena')).toBeCloseTo(100);
    expect(resistenciaEfectiva(100, 'regular', 'regular')).toBeCloseTo(64);
    expect(resistenciaEfectiva(100, 'mala', 'regular')).toBeCloseTo(48);
    expect(resistenciaEfectiva(100, 'mala', 'mala')).toBeCloseTo(36);
  });

  it('índices de sobreesfuerzo y flexibilidad', () => {
    expect(indiceSobreesfuerzo(410, 520, 'regular', 'regular')).toBeCloseTo(410 / 332.8, 6);
    expect(indiceFlexibilidad(0.012, 0.01)).toBeCloseTo(1.2);
  });

  it('espectro con seguridad limitada usa Ae en lugar de Aa y Av', () => {
    const p = parametrosSeguridadLimitada(0.15, 'D', 1)!;
    expect(p.aa).toBe(0.15);
    expect(p.av).toBe(0.15);
    expect(p.fa).toBeCloseTo(1.5, 6); // interpolando 1.6 (0.1) y 1.4 (0.2)
    expect(p.fv).toBeCloseTo(2.2, 6); // interpolando 2.4 y 2.0
    expect(mesetaSa(p)).toBeCloseTo(2.5 * 0.15 * 1.5, 6);
    expect(parametrosSeguridadLimitada(0.15, 'F')).toBeNull();
  });

  it('el espectro con Ae es menor que el de diseño en Cali', () => {
    const lim = parametrosSeguridadLimitada(0.15, 'D')!;
    const dis = { aa: 0.25, av: 0.25, fa: 1.3, fv: 1.9, i: 1 };
    expect(sa(0.5, lim)).toBeLessThan(sa(0.5, dis));
  });

  it('R′ de referencia (A.10.4.2.4)', () => {
    expect(rPrimaReferencia(5, 'buena')).toEqual({ valor: 5, maximo: true });
    expect(rPrimaReferencia(5, 'incompleta')).toEqual({ valor: 5, maximo: true });
    expect(rPrimaReferencia(5, 'ninguna')).toEqual({ valor: 3.75, maximo: false });
    expect(rPrimaReferencia(1.2, 'ninguna').valor).toBe(1);
    expect(rPrimaReferencia(2.5, 'mamposteria-no-reforzada').valor).toBe(1);
  });

  it('modificaciones con tope de 10 % (A.10.6.3)', () => {
    expect(modificacionSinRevalidar(0.08, 0.05)).toBe(true);
    expect(modificacionSinRevalidar(0.12, 0.05)).toBe(false);
    expect(modificacionSinRevalidar(0.05, 0.11)).toBe(false);
  });

  it('nivel de seguridad al rehabilitar según el grupo de uso y la época (A.10.9.2)', () => {
    expect(nivelRehabilitacion('IV', new Date(Date.UTC(1960, 0, 1))).nivel).toBe('nueva');
    expect(nivelRehabilitacion('III', new Date(Date.UTC(1990, 5, 1))).ref).toBe('A.10.9.2.1');
    expect(nivelRehabilitacion('I', new Date(Date.UTC(2003, 5, 1))).ref).toBe('A.10.9.2.2');
    const dec1400 = nivelRehabilitacion('I', new Date(Date.UTC(1991, 5, 1)));
    expect(dec1400.nivel).toBe('nueva-o-limitada');
    expect(dec1400.flexibilidadMax).toBe(1.5);
    const antes = nivelRehabilitacion('II', new Date(Date.UTC(1975, 5, 1)));
    expect(antes.nivel).toBe('limitada-minimo');
    expect(antes.memorialSiLimitada).toBe(true);
  });
});

describe('A.11 — instrumentación sísmica', () => {
  it('zona baja: sin obligación', () => {
    expect(instrumentacionEdificacion('Baja', 100000, 40).instrumentos).toBe(0);
  });

  it('zona alta', () => {
    expect(instrumentacionEdificacion('Alta', 25000, 6).instrumentos).toBe(1);
    expect(instrumentacionEdificacion('Alta', 20000, 6).instrumentos).toBe(0); // "más de 20 000 m²"
    expect(instrumentacionEdificacion('Alta', 25000, 2).instrumentos).toBe(0);
    expect(instrumentacionEdificacion('Alta', 25000, 15).instrumentos).toBe(2);
    expect(instrumentacionEdificacion('Alta', 5000, 15).instrumentos).toBe(0);
    const alta21 = instrumentacionEdificacion('Alta', 3000, 21);
    expect(alta21.instrumentos).toBe(3);
    expect(alta21.arreglo).toBe(true);
  });

  it('zona intermedia', () => {
    expect(instrumentacionEdificacion('Intermedia', 31000, 5).instrumentos).toBe(1);
    expect(instrumentacionEdificacion('Intermedia', 31000, 4).instrumentos).toBe(0);
    expect(instrumentacionEdificacion('Intermedia', 30000, 10).instrumentos).toBe(0);
    expect(instrumentacionEdificacion('Intermedia', 31000, 24).instrumentos).toBe(2);
    expect(instrumentacionEdificacion('Intermedia', 31000, 25).instrumentos).toBe(2);
    expect(instrumentacionEdificacion('Intermedia', 1000, 25).instrumentos).toBe(0);
    expect(instrumentacionEdificacion('Intermedia', 1000, 26).instrumentos).toBe(3);
  });

  it('conjuntos habitacionales', () => {
    expect(instrumentacionConjunto('Alta', 201, false)).toBe(true);
    expect(instrumentacionConjunto('Alta', 200, false)).toBe(false);
    expect(instrumentacionConjunto('Alta', 500, true)).toBe(false);
    expect(instrumentacionConjunto('Intermedia', 250, false)).toBe(false);
    expect(instrumentacionConjunto('Intermedia', 301, false)).toBe(true);
    expect(instrumentacionConjunto('Baja', 1000, false)).toBe(false);
  });
});
