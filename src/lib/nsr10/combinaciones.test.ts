import { describe, expect, it } from 'vitest';
import {
  cargaCubierta,
  coeficienteRDiseno,
  combinacionesResistencia,
  combinacionesTrabajo,
  envolvente,
  expresionDe,
  gobernante,
  puedeReducirFactorL,
  sismoReducido,
} from './combinaciones';

const base = { D: 100, L: 50, Lr: 10, G: 0, Le: 0, W: 30, E: 60, H: 20, F: 5, T: 8 };
const val = (lista: ReturnType<typeof combinacionesResistencia>, id: string, variante?: boolean) =>
  lista.find((c) => c.id === id && (variante ? c.variante : !c.variante))!.valor;

describe('Método de la resistencia (B.2.4)', () => {
  const lista = combinacionesResistencia(base);
  it('genera las 7 ecuaciones B.2.4-1 a B.2.4-7', () => {
    expect(lista.map((c) => c.id)).toEqual(['B.2.4-1', 'B.2.4-2', 'B.2.4-3', 'B.2.4-4', 'B.2.4-5', 'B.2.4-6', 'B.2.4-7']);
    expect(lista.every((c) => c.pag === 'B-6')).toBe(true);
  });
  it('B.2.4-1: 1.4(D + F)', () => expect(val(lista, 'B.2.4-1')).toBeCloseTo(1.4 * 105, 9));
  it('B.2.4-2: 1.2(D+F+T) + 1.6(L+H) + 0.5 Lr', () =>
    expect(val(lista, 'B.2.4-2')).toBeCloseTo(1.2 * 113 + 1.6 * 70 + 0.5 * 10, 9));
  it('B.2.4-3: 1.2D + 1.6 Lr + (L ó 0.8W) toma L si es mayor', () => {
    expect(val(lista, 'B.2.4-3')).toBeCloseTo(120 + 16 + 50, 9);
    const c = lista.find((x) => x.id === 'B.2.4-3')!;
    expect(c.terminos.map((x) => x.carga)).toEqual(['D', 'Lr', 'L']);
  });
  it('B.2.4-3: toma 0.8W cuando 0.8W > L', () => {
    const l = combinacionesResistencia({ D: 100, L: 10, Lr: 5, W: 100 });
    expect(val(l, 'B.2.4-3')).toBeCloseTo(120 + 8 + 80, 9);
  });
  it('B.2.4-4, -5, -6, -7', () => {
    expect(val(lista, 'B.2.4-4')).toBeCloseTo(120 + 48 + 50 + 5, 9);
    expect(val(lista, 'B.2.4-5')).toBeCloseTo(120 + 60 + 50, 9);
    expect(val(lista, 'B.2.4-6')).toBeCloseTo(90 + 48 + 32, 9);
    expect(val(lista, 'B.2.4-7')).toBeCloseTo(90 + 60 + 32, 9);
  });
  it('la gobernante y la mínima son las de mayor y menor valor', () => {
    const e = envolvente(lista)!;
    expect(e.maxima.id).toBe('B.2.4-2');
    expect(e.maxima.valor).toBeCloseTo(1.2 * 113 + 112 + 5, 9);
    expect(e.minima.id).toBe('B.2.4-1');
    expect(e.minima.valor).toBeCloseTo(147, 9);
    expect(gobernante(lista)!.id).toBe('B.2.4-2');
    expect(envolvente([])).toBeNull();
  });
  it('B.2.4.2.2: factor 0.5 para L en B.2.4-3, -4 y -5 (no afecta B.2.4-2)', () => {
    const l = combinacionesResistencia(base, { reducirFactorL: true });
    expect(val(l, 'B.2.4-3')).toBeCloseTo(120 + 16 + 25, 9);
    expect(val(l, 'B.2.4-4')).toBeCloseTo(120 + 48 + 25 + 5, 9);
    expect(val(l, 'B.2.4-5')).toBeCloseTo(120 + 60 + 25, 9);
    expect(val(l, 'B.2.4-2')).toBeCloseTo(val(lista, 'B.2.4-2'), 9);
  });
  it('B.2.4.2.3: 1.3W en B.2.4-4 y B.2.4-6', () => {
    const l = combinacionesResistencia(base, { viento13: true });
    expect(val(l, 'B.2.4-4')).toBeCloseTo(120 + 39 + 50 + 5, 9);
    expect(val(l, 'B.2.4-6')).toBeCloseTo(90 + 39 + 32, 9);
  });
  it('B.2.4.2.4: 1.4E en B.2.4-5 y B.2.4-7', () => {
    const l = combinacionesResistencia(base, { sismoNivelServicio: true });
    expect(val(l, 'B.2.4-5')).toBeCloseTo(120 + 84 + 50, 9);
    expect(val(l, 'B.2.4-7')).toBeCloseTo(90 + 84 + 32, 9);
  });
  it('B.2.4.2.5: H = 0 en B.2.4-6 y B.2.4-7 si neutraliza W o E', () => {
    const l = combinacionesResistencia(base, { hNeutralizaWE: true });
    expect(val(l, 'B.2.4-6')).toBeCloseTo(90 + 48, 9);
    expect(val(l, 'B.2.4-7')).toBeCloseTo(90 + 60, 9);
    expect(l.find((c) => c.id === 'B.2.4-6')!.expresion).toBe('0.9D + 1.6W');
  });
  it('elige la carga de cubierta más desfavorable entre Lr, G y Le', () => {
    expect(cargaCubierta({ Lr: 5, G: 8, Le: 2 })).toEqual({ carga: 'G', valor: 8 });
    expect(cargaCubierta({ Lr: 5, G: 5, Le: 5 }).carga).toBe('Lr');
    const l = combinacionesResistencia({ D: 100, Le: 12, Lr: 4 });
    expect(l.find((c) => c.id === 'B.2.4-2')!.cubierta).toBe('Le');
    expect(val(l, 'B.2.4-2')).toBeCloseTo(1.2 * 100 + 0.5 * 12, 9);
  });
  it('sentidos "ambos" añade la variante con W y E de signo contrario', () => {
    const l = combinacionesResistencia({ D: 100, W: 30, E: 60 }, { sentidos: 'ambos' });
    // Con L = 0, B.2.4-3 elige 0.8W; usan W o E: B.2.4-3, -4, -5, -6 y -7 → 5 variantes adicionales.
    expect(l.length).toBe(7 + 5);
    expect(val(l, 'B.2.4-6', true)).toBeCloseTo(90 - 48, 9);
    expect(val(l, 'B.2.4-7', true)).toBeCloseTo(90 - 60, 9);
  });
});

describe('Método de esfuerzos de trabajo (B.2.3)', () => {
  const lista = combinacionesTrabajo(base);
  it('genera las 10 ecuaciones B.2.3-1 a B.2.3-10', () => {
    expect(lista.map((c) => c.id)).toEqual(Array.from({ length: 10 }, (_, i) => `B.2.3-${i + 1}`));
    expect(lista.every((c) => c.pag === 'B-5')).toBe(true);
  });
  it('B.2.3-1 a B.2.3-5', () => {
    expect(val(lista, 'B.2.3-1')).toBeCloseTo(105, 9);
    expect(val(lista, 'B.2.3-2')).toBeCloseTo(100 + 20 + 5 + 50 + 8, 9);
    expect(val(lista, 'B.2.3-3')).toBeCloseTo(100 + 20 + 5 + 10, 9);
    expect(val(lista, 'B.2.3-4')).toBeCloseTo(125 + 0.75 * 58 + 0.75 * 10, 9);
    expect(val(lista, 'B.2.3-5')).toBeCloseTo(125 + 30, 9);
  });
  it('B.2.3-6 a B.2.3-10 con 0.7E', () => {
    expect(val(lista, 'B.2.3-6')).toBeCloseTo(125 + 0.7 * 60, 9);
    expect(val(lista, 'B.2.3-7')).toBeCloseTo(125 + 0.75 * 30 + 0.75 * 50 + 0.75 * 10, 9);
    expect(val(lista, 'B.2.3-8')).toBeCloseTo(125 + 0.75 * 0.7 * 60 + 0.75 * 50 + 0.75 * 10, 9);
    expect(val(lista, 'B.2.3-9')).toBeCloseTo(60 + 30 + 20, 9);
    expect(val(lista, 'B.2.3-10')).toBeCloseTo(60 + 0.7 * 60 + 20, 9);
  });
  it('B.2.3.2.1: derivas con 1.0E en lugar de 0.7E', () => {
    const l = combinacionesTrabajo(base, { verificacionDerivas: true });
    expect(val(l, 'B.2.3-6')).toBeCloseTo(125 + 60, 9);
    expect(val(l, 'B.2.3-8')).toBeCloseTo(125 + 0.75 * 60 + 0.75 * 50 + 0.75 * 10, 9);
    expect(val(l, 'B.2.3-10')).toBeCloseTo(60 + 60 + 20, 9);
  });
  it('gobernante del ejemplo base (B.2.3-8)', () => {
    expect(gobernante(lista)!.id).toBe('B.2.3-8');
    expect(gobernante(lista)!.valor).toBeCloseTo(201.5, 9);
  });
});

describe('Utilidades', () => {
  it('E = Fs / R y R = φa·φp·φr·R0', () => {
    expect(sismoReducido(840, 6)).toBeCloseTo(140, 9);
    expect(coeficienteRDiseno(7, 0.9, 0.9, 1)).toBeCloseTo(5.67, 9);
  });
  it('B.2.4.2.2: cuándo se permite reducir el factor de L', () => {
    expect(puedeReducirFactorL('general', 1.8)).toBe(true);
    expect(puedeReducirFactorL('general', 4.8)).toBe(true);
    expect(puedeReducirFactorL('general', 5)).toBe(false);
    expect(puedeReducirFactorL('estacionamiento', 2.5)).toBe(false);
    expect(puedeReducirFactorL('reunion-publica', 2.5)).toBe(false);
  });
  it('expresionDe formatea factores', () => {
    expect(expresionDe([{ carga: 'D', factor: 1.2 }, { carga: 'L', factor: 1 }, { carga: 'H', factor: 0 }])).toBe('1.2D + L');
  });
});
