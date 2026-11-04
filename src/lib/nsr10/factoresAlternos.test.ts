import { describe, expect, it } from 'vitest';
import {
  c9IgualAB24,
  compararConjuntos,
  envolventeCC,
  filaComparada,
  fuerzaAnclajePostensadoCC,
  phiC9PorSolicitacion,
  phiCCPorSolicitacion,
  phiDeformacionCC,
  phiPorCargaAxialCC,
  resistenciaRequeridaCC,
} from './factoresAlternos';

const porId = (l: ReturnType<typeof resistenciaRequeridaCC>, id: string, accion?: 'W' | 'E') =>
  l.find((x) => x.id === id && x.accion === accion && !x.variante)!;

describe('Apéndice C-C: resistencia requerida (C-C.9.2)', () => {
  it('C-C.9-1: 1.4D + 1.7L con D = 40, L = 20 → 90', () => {
    const l = resistenciaRequeridaCC({ D: 40, L: 20 });
    expect(l).toHaveLength(1);
    expect(l[0].id).toBe('C-C.9-1');
    expect(l[0].valor).toBeCloseTo(90, 12);
  });
  it('sismo E = 30: C-C.9-2 = 0.75(56 + 34) + 30 = 97.5; C-C.9-3 = 36 + 30 = 66', () => {
    const l = resistenciaRequeridaCC({ D: 40, L: 20, E: 30 });
    expect(porId(l, 'C-C.9-2', 'E').valor).toBeCloseTo(97.5, 12);
    expect(porId(l, 'C-C.9-3', 'E').valor).toBeCloseTo(66, 12);
    expect(envolventeCC(l)!.maxima.id).toBe('C-C.9-2');
  });
  it('viento W = 25: 1.6W → 67.5 + 40; con 1.3W → 67.5 + 32.5', () => {
    expect(porId(resistenciaRequeridaCC({ D: 40, L: 20, W: 25 }), 'C-C.9-2', 'W').valor).toBeCloseTo(107.5, 12);
    expect(porId(resistenciaRequeridaCC({ D: 40, L: 20, W: 25 }, { viento13: true }), 'C-C.9-2', 'W').valor).toBeCloseTo(100, 12);
  });
  it('sismo a nivel de servicio: 1.4E', () => {
    expect(porId(resistenciaRequeridaCC({ D: 40, L: 20, E: 30 }, { sismoServicio: true }), 'C-C.9-3', 'E').valor).toBeCloseTo(36 + 42, 12);
  });
  it('ambos sentidos de E: C-C.9-3 con E = −30 → 36 − 30 = 6', () => {
    const l = resistenciaRequeridaCC({ D: 40, L: 20, E: 30 }, { sentidos: 'ambos' });
    const inv = l.find((x) => x.id === 'C-C.9-3' && x.variante)!;
    expect(inv.valor).toBeCloseTo(6, 12);
  });
  it('H: C-C.9-4 = 56 + 34 + 1.7·15 = 115.5; si D reduce H: 0.9D + 1.7H = 61.5 (L = 0)', () => {
    expect(porId(resistenciaRequeridaCC({ D: 40, L: 20, H: 15 }), 'C-C.9-4').valor).toBeCloseTo(115.5, 12);
    const r = porId(resistenciaRequeridaCC({ D: 40, L: 20, H: 15 }, { dReduceH: true }), 'C-C.9-4');
    expect(r.valor).toBeCloseTo(61.5, 12);
    expect(r.notas.length).toBeGreaterThan(0);
  });
  it('T: C-C.9-5 = 0.75(56 + 14 + 34) = 78; C-C.9-6 = 1.4(40 + 10) = 70', () => {
    const l = resistenciaRequeridaCC({ D: 40, L: 20, T: 10 });
    expect(porId(l, 'C-C.9-5').valor).toBeCloseTo(78, 12);
    expect(porId(l, 'C-C.9-6').valor).toBeCloseTo(70, 12);
  });
  it('F entra con 1.4 en las combinaciones con L: C-C.9-1 = 90 + 14 = 104', () => {
    expect(porId(resistenciaRequeridaCC({ D: 40, L: 20, F: 10 }), 'C-C.9-1').valor).toBeCloseTo(104, 12);
  });
  it('zonas de anclaje de postensado: 1.2 × fuerza del gato', () => {
    expect(fuerzaAnclajePostensadoCC(1000)).toBeCloseTo(1200, 12);
  });
  it('expresión resuelta', () => {
    expect(porId(resistenciaRequeridaCC({ D: 1, L: 1, W: 1 }), 'C-C.9-2', 'W').expresion).toBe('1.05D + 1.275L + 1.6W');
  });
});

describe('Apéndice C-C: factores φ (C-C.9.3.2)', () => {
  it('valores de C-C: 0.90, 0.75, 0.70, 0.85, 0.70, 0.85, 0.85, 0.65', () => {
    expect(phiCCPorSolicitacion('traccion')).toBe(0.9);
    expect(phiCCPorSolicitacion('compresion-espiral')).toBe(0.75);
    expect(phiCCPorSolicitacion('compresion-otros')).toBe(0.7);
    expect(phiCCPorSolicitacion('cortante-torsion')).toBe(0.85);
    expect(phiCCPorSolicitacion('aplastamiento')).toBe(0.7);
    expect(phiCCPorSolicitacion('anclaje-postensado')).toBe(0.85);
    expect(phiCCPorSolicitacion('puntal-tensor')).toBe(0.85);
    expect(phiCCPorSolicitacion('simple')).toBe(0.65);
  });
  it('valores del cuerpo de C.9: 0.90, 0.75, 0.65, 0.75, 0.65, 0.85, 0.75, 0.60', () => {
    expect(phiC9PorSolicitacion('traccion')).toBe(0.9);
    expect(phiC9PorSolicitacion('compresion-espiral')).toBe(0.75);
    expect(phiC9PorSolicitacion('compresion-otros')).toBe(0.65);
    expect(phiC9PorSolicitacion('cortante-torsion')).toBe(0.75);
    expect(phiC9PorSolicitacion('aplastamiento')).toBe(0.65);
    expect(phiC9PorSolicitacion('anclaje-postensado')).toBe(0.85);
    expect(phiC9PorSolicitacion('puntal-tensor')).toBe(0.75);
    expect(phiC9PorSolicitacion('simple')).toBe(0.6);
  });
  it('la tabla comparada coincide con las funciones', () => {
    expect(filaComparada('C-C.9.3.2.3')).toMatchObject({ phiCC: 0.85, phiC9: 0.75 });
    expect(filaComparada('C-C.9.3.2.7')).toMatchObject({ phiCC: 0.85, phiC9: 0.75, phiC9Final: 0.9 });
    expect(filaComparada('no existe')).toBeUndefined();
  });
  it('φ(εt) con φ de C-C: εt = 0.0035 → 0.70 + 0.20 · 0.5 = 0.80 (otros), 0.825 (espiral)', () => {
    expect(phiDeformacionCC(0.0035)).toBeCloseTo(0.8, 12);
    expect(phiDeformacionCC(0.0035, 'espiral')).toBeCloseTo(0.825, 12);
    expect(phiDeformacionCC(0.001)).toBe(0.7);
    expect(phiDeformacionCC(0.005)).toBeCloseTo(0.9, 12);
    expect(phiDeformacionCC(0.01)).toBeCloseTo(0.9, 12);
  });
  it('φ por carga axial con C-C: φPn = 224, umbral 448 → 0.90 − 0.20 · 0.5 = 0.80', () => {
    expect(phiPorCargaAxialCC(224, 28, 160000)).toBeCloseTo(0.8, 12);
    expect(phiPorCargaAxialCC(224, 28, 160000, 'espiral')).toBeCloseTo(0.825, 12);
    expect(phiPorCargaAxialCC(448, 28, 160000)).toBe(0.7);
    expect(phiPorCargaAxialCC(0, 28, 160000)).toBe(0.9);
    expect(phiPorCargaAxialCC(100, 28, 160000, 'otro', 200)).toBeCloseTo(0.9 - 0.2 * 0.5, 12);
  });
});

describe('Apéndice C-C frente a C.9 y B.2.4', () => {
  const cargas = { D: 40, L: 20 };
  it('gravedad, tracción: C.9 gobierna C.9-2 (80), C-C da 90; con φ = 0.90 → razón 1.125', () => {
    const c = compararConjuntos(cargas, 'traccion');
    expect(c.uC9).toBeCloseTo(80, 12);
    expect(c.ecuacionC9).toBe('C.9-2');
    expect(c.uCC).toBeCloseTo(90, 12);
    expect(c.reqC9).toBeCloseTo(88.8889, 4);
    expect(c.reqCC).toBeCloseTo(100, 12);
    expect(c.razon).toBeCloseTo(1.125, 12);
    expect(c.masExigente).toBe('C-C');
  });
  it('gravedad, columna con estribos: 80/0.65 = 123.08 frente a 90/0.70 = 128.57', () => {
    const c = compararConjuntos(cargas, 'compresion-otros');
    expect(c.reqC9).toBeCloseTo(123.0769, 4);
    expect(c.reqCC).toBeCloseTo(128.5714, 4);
    expect(c.razon).toBeCloseTo(1.04464, 4);
  });
  it('gravedad, cortante: 80/0.75 = 106.67 frente a 90/0.85 = 105.88 → C.9 apenas más exigente', () => {
    const c = compararConjuntos(cargas, 'cortante-torsion');
    expect(c.reqC9).toBeCloseTo(106.6667, 4);
    expect(c.reqCC).toBeCloseTo(105.8824, 4);
    expect(c.masExigente).toBe('C.9');
  });
  it('sismo E = 30: C.9-5 = 48 + 30 + 20 = 98 frente a C-C.9-2 = 97.5', () => {
    const c = compararConjuntos({ ...cargas, E: 30 }, 'traccion');
    expect(c.uC9).toBeCloseTo(98, 12);
    expect(c.ecuacionC9).toBe('C.9-5');
    expect(c.uCC).toBeCloseTo(97.5, 12);
    expect(c.ecuacionCC).toBe('C-C.9-2 (E)');
  });
  it('C.9-1 a C.9-7 dan lo mismo que B.2.4-1 a B.2.4-7', () => {
    expect(c9IgualAB24({ D: 40, L: 20, Lr: 5, W: 25, E: 30, H: 10, F: 3, T: 4 })).toBe(true);
    expect(c9IgualAB24({ D: 40, L: 20, Lr: 5, W: 25, E: 30, H: 10 }, { viento13: true, sismoServicio: true, reducirL: true, hNeutraliza: true })).toBe(true);
  });
});
