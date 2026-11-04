import { describe, expect, it } from 'vitest';
import {
  anchoZonaA,
  cfMuroLibreAB,
  cpArco,
  cpCubiertaBarlovento,
  cpCubiertaParalela,
  cpCubiertaSotavento,
  cpMuroBarlovento,
  cpMuroLateral,
  cpMuroSotavento,
  excentricidadFlexible,
  factorEquipoCubierta,
  factorPorosidadValla,
  factorReduccionArea,
  fuerzaMuroLibre,
  fuerzaOtrasEstructuras,
  gcpf,
  gcpfTodas,
  gcpi,
  gcpMuro,
  interpolar,
  momentoTorsional,
  presionAbierto,
  presionAleroBarlovento,
  presionBajaAltura,
  presionComponentes,
  presionComponentesAltos,
  presionParapeto,
  presionSPRFV,
  presionesEdificioRigido,
  reduccionRi,
} from './vientoPresiones';

describe('GCpi y Ri (B.6.5.11.1)', () => {
  it('coeficientes de la Figura B.6.5-2', () => {
    expect(gcpi('abierto')).toEqual({ positivo: 0, negativo: 0 });
    expect(gcpi('parcial')).toEqual({ positivo: 0.55, negativo: -0.55 });
    expect(gcpi('cerrado')).toEqual({ positivo: 0.18, negativo: -0.18 });
  });
  it('Ri (B.6.5-14) vale 1 sin volumen y baja hacia 0.5 con volúmenes grandes', () => {
    expect(reduccionRi(10, 0)).toBeCloseTo(1, 12);
    // Vi/(11000·Aog) = 100 → 0.5·(1 + 1/√101)
    expect(reduccionRi(1, 1_100_000)).toBeCloseTo(0.5 * (1 + 1 / Math.sqrt(101)), 10);
    expect(reduccionRi(1, 1e12)).toBeGreaterThan(0.5);
    expect(reduccionRi(1, 1e12)).toBeLessThan(0.501);
    expect(() => reduccionRi(0, 100)).toThrow();
  });
});

describe('Cp de muros y cubiertas (Figura B.6.5-3)', () => {
  it('muros', () => {
    expect(cpMuroBarlovento()).toBe(0.8);
    expect(cpMuroLateral()).toBe(-0.7);
    expect(cpMuroSotavento(0.5)).toBe(-0.5);
    expect(cpMuroSotavento(1)).toBe(-0.5);
    expect(cpMuroSotavento(2)).toBe(-0.3);
    expect(cpMuroSotavento(3)).toBeCloseTo(-0.25, 12);
    expect(cpMuroSotavento(8)).toBe(-0.2);
  });
  it('cubierta a barlovento: valores tabulados e interpolación', () => {
    const t = cpCubiertaBarlovento(0.5, 20);
    expect(t.fila1).toBeCloseTo(-0.4, 12);
    expect(t.fila2).toBeCloseTo(0.0, 12);
    const m = cpCubiertaBarlovento(0.375, 20); // entre h/L = 0.25 y 0.5
    expect(m.fila1).toBeCloseTo(-0.35, 12);
    expect(m.fila2).toBeCloseTo(0.1, 12);
    expect(cpCubiertaBarlovento(0.5, 12.5).fila1).toBeCloseTo(-0.8, 12);
    expect(cpCubiertaBarlovento(2, 10).fila1).toBeCloseTo(-1.3, 12); // h/L ≥ 1 usa la columna 1.0
    expect(cpCubiertaBarlovento(0.1, 10).fila1).toBeCloseTo(-0.7, 12); // h/L ≤ 0.25 usa la columna 0.25
  });
  it('cubiertas muy inclinadas: 0.01θ y 0.8', () => {
    expect(cpCubiertaBarlovento(0.5, 60).fila1).toBeCloseTo(0.6, 12);
    expect(cpCubiertaBarlovento(0.5, 70).fila2).toBeCloseTo(0.7, 12);
    const alto = cpCubiertaBarlovento(0.5, 85);
    expect(alto.fila1).toBe(0.8);
    expect(alto.advertencias.length).toBe(1);
  });
  it('advierte de la errata del PDF en h/L ≤ 0.25, θ = 30°', () => {
    const r = cpCubiertaBarlovento(0.25, 30);
    expect(r.fila2).toBeCloseTo(-0.3, 12); // valor impreso
    expect(r.advertencias.length).toBe(1);
    expect(cpCubiertaBarlovento(1, 30).advertencias.length).toBe(0);
  });
  it('reduce el −1.3 con el área tributaria', () => {
    expect(cpCubiertaBarlovento(1, 10, 100).fila1).toBeCloseTo(-1.04, 12);
    expect(cpCubiertaBarlovento(1, 10, 5).fila1).toBeCloseTo(-1.3, 12);
    expect(cpCubiertaBarlovento(1, 15, 100).fila1).toBeCloseTo(-1.0, 12); // sin reducción: no es el −1.3
  });
  it('factor de reducción por área', () => {
    expect(factorReduccionArea(5)).toBe(1);
    expect(factorReduccionArea(15)).toBeCloseTo(0.95, 12);
    expect(factorReduccionArea(20)).toBeCloseTo(0.9, 12);
    expect(factorReduccionArea(60)).toBeCloseTo(0.85, 12);
    expect(factorReduccionArea(500)).toBe(0.8);
  });
  it('cubierta a sotavento', () => {
    expect(cpCubiertaSotavento(0.5, 15)).toBe(-0.5);
    expect(cpCubiertaSotavento(0.5, 30)).toBe(-0.6);
    expect(cpCubiertaSotavento(1, 10)).toBe(-0.7);
    expect(cpCubiertaSotavento(0.25, 12.5)).toBeCloseTo(-0.4, 12);
  });
  it('franjas con viento paralelo a la cumbrera o θ < 10°', () => {
    expect(cpCubiertaParalela(0.5).fila1).toEqual([-0.9, -0.9, -0.5, -0.3]);
    expect(cpCubiertaParalela(0.2).fila1).toEqual([-0.9, -0.9, -0.5, -0.3]);
    expect(cpCubiertaParalela(1).fila1).toEqual([-1.3, -0.7, -0.7, -0.7]);
    const m = cpCubiertaParalela(0.75).fila1;
    [-1.1, -0.8, -0.6, -0.5].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 12));
    expect(cpCubiertaParalela(1, 100).fila1[0]).toBeCloseTo(-1.04, 12);
    expect(cpCubiertaParalela(0.5).fila2).toEqual([-0.18, -0.18, -0.18, -0.18]);
  });
});

describe('Cubiertas en arco (Figura B.6.5-5)', () => {
  it('sobre estructura elevada', () => {
    const a = cpArco(0.15, false);
    expect(a.barlovento).toBe(-0.9);
    expect(a.medioCentral).toBeCloseTo(-0.85, 12);
    expect(a.sotavento).toBe(-0.5);
    expect(cpArco(0.25, false).barlovento).toBeCloseTo(0.075, 12);
    expect(cpArco(0.25, false, true).barlovento).toBeCloseTo(-0.6, 12); // alternativa 6r − 2.1
    expect(cpArco(0.4, false).barlovento).toBeCloseTo(0.4, 12);
  });
  it('con arranque desde el piso', () => {
    expect(cpArco(0.4, true).barlovento).toBeCloseTo(0.56, 12);
    expect(() => cpArco(0.7, true)).toThrow();
  });
});

describe('Ecuaciones de presión (B.6.5.12 a B.6.5.15)', () => {
  it('B.6.5-15: p = q·G·Cp − qi·GCpi', () => {
    expect(presionSPRFV({ q: 600, g: 0.85, cp: 0.8, qi: 600, gcpi: 0.18 })).toBeCloseTo(300, 9);
    expect(presionSPRFV({ q: 600, g: 0.85, cp: 0.8, qi: 600, gcpi: -0.18 })).toBeCloseTo(516, 9);
  });
  it('B.6.5-16, -20, -21, -22', () => {
    expect(presionBajaAltura({ qh: 700, gcpf: -1.07, gcpi: 0.18 })).toBeCloseTo(700 * (-1.25), 9);
    expect(presionComponentes({ qh: 700, gcp: -1.4, gcpi: -0.18 })).toBeCloseTo(700 * (-1.22), 9);
    expect(presionComponentesAltos({ q: 900, gcp: 0.9, qi: 800, gcpi: 0.18 })).toBeCloseTo(810 - 144, 9);
  });
  it('parapetos y alero', () => {
    expect(presionParapeto(500, 'barlovento')).toBe(750);
    expect(presionParapeto(500, 'sotavento')).toBe(-500);
    expect(presionAleroBarlovento(600)).toBeCloseTo(600 * 0.85 * 0.8, 9);
  });
  it('edificio abierto, muros libres y otras estructuras', () => {
    expect(presionAbierto({ qh: 500, g: 0.85, cn: -1.2 })).toBeCloseTo(-510, 9);
    expect(fuerzaMuroLibre({ qh: 500, g: 0.85, cf: 1.5, as: 20 })).toBeCloseTo(500 * 0.85 * 1.5 * 20, 9);
    expect(fuerzaOtrasEstructuras({ qz: 800, g: 0.85, cf: 1.4, af: 10 })).toBeCloseTo(9520, 9);
  });
  it('equipos sobre cubierta (B.6.5.15.1)', () => {
    expect(factorEquipoCubierta(5, 20, 10)).toBe(1.9);
    expect(factorEquipoCubierta(110, 20, 10)).toBeCloseTo(1.45, 12);
    expect(factorEquipoCubierta(300, 20, 10)).toBe(1);
  });
});

describe('Cf de muros libres y vallas (Figura B.6.5-17)', () => {
  it('valores tabulados', () => {
    expect(cfMuroLibreAB(1, 1)).toBeCloseTo(1.45, 12);
    expect(cfMuroLibreAB(0.5, 10)).toBeCloseTo(1.7, 12);
    expect(cfMuroLibreAB(0.1, 45)).toBeCloseTo(1.95, 12);
    expect(cfMuroLibreAB(1, 0.01)).toBeCloseTo(1.8, 12);
  });
  it('interpolación', () => {
    expect(cfMuroLibreAB(0.95, 1)).toBeCloseTo(1.5, 12);
    expect(cfMuroLibreAB(1, 1.5)).toBeCloseTo(1.425, 12);
  });
  it('factor por porosidad', () => {
    expect(factorPorosidadValla(0.7)).toBeCloseTo(1 - Math.pow(0.3, 1.5), 12);
    expect(factorPorosidadValla(1)).toBe(1);
    expect(() => factorPorosidadValla(1.2)).toThrow();
  });
});

describe('Edificios bajos (Figura B.6.5-7)', () => {
  it('ancho de zona a', () => {
    expect(anchoZonaA(20, 6)).toBe(2);
    expect(anchoZonaA(8, 4)).toBe(1); // 0.8 < 1.0 m mínimo
    expect(anchoZonaA(100, 5)).toBe(4); // mín(10, 2) = 2 pero no menos de 4 % de 100 m = 4 m
  });
  it('GCpf tabulados e interpolados', () => {
    expect(gcpf('1', 0)).toBe(0.4);
    expect(gcpf('1E', 5)).toBe(0.61);
    expect(gcpf('2E', 20)).toBe(-1.07);
    expect(gcpf('2', 35)).toBe(0.21);
    expect(gcpf('3', 90)).toBe(-0.37);
    expect(gcpf('2E', 25)).toBeCloseTo(-0.4, 12);
    expect(gcpf('1', 12.5)).toBeCloseTo((0.4 + 0.53) / 2, 12);
    expect(Object.keys(gcpfTodas(20)).length).toBe(10);
  });
});

describe('GCp de muros (Figura B.6.5-8A)', () => {
  it('extremos y punto medio log', () => {
    expect(gcpMuro(0.5, '4')).toEqual({ positivo: 1.0, negativo: -1.1 });
    expect(gcpMuro(1, '5')).toEqual({ positivo: 1.0, negativo: -1.4 });
    expect(gcpMuro(100, '4')).toEqual({ positivo: 0.7, negativo: -0.8 });
    const m = gcpMuro(Math.sqrt(50), '5');
    expect(m.positivo).toBeCloseTo(0.85, 10);
    expect(m.negativo).toBeCloseTo(-1.1, 10);
  });
  it('reducción 10 % si θ ≤ 10°', () => {
    const r = gcpMuro(1, '5', 5);
    expect(r.positivo).toBeCloseTo(0.9, 12);
    expect(r.negativo).toBeCloseTo(-1.26, 12);
  });
});

describe('Torsión y excentricidad (B.6.5.12.3)', () => {
  it('momento torsional de los casos 2 y 4', () => {
    expect(momentoTorsional(2, 500, 300, 20)).toBeCloseTo(0.75 * 800 * 20 * 3, 9);
    expect(momentoTorsional(4, 500, 300, 20)).toBeCloseTo(0.563 * 800 * 20 * 3, 9);
  });
  it('B.6.5-19: sin turbulencia e = eQ; con eR = eQ se mantiene entre ambos', () => {
    expect(excentricidadFlexible({ eQ: 2, eR: 0.5, iz: 0, gQ: 3.4, q: 0.9, gR: 4, r: 0.5 })).toBe(2);
    const e = excentricidadFlexible({ eQ: 2, eR: 2, iz: 0.2, gQ: 3.4, q: 0.9, gR: 4, r: 0.5 });
    expect(e).toBeCloseTo(2, 9);
    const e2 = excentricidadFlexible({ eQ: 2, eR: 0.5, iz: 0.2, gQ: 3.4, q: 0.9, gR: 4, r: 0.5 });
    expect(e2).toBeGreaterThan(0.5);
    expect(e2).toBeLessThan(2.5);
  });
});

describe('interpolar', () => {
  it('lineal por tramos y saturada', () => {
    expect(interpolar([0, 1, 3], [0, 10, 30], 2)).toBe(20);
    expect(interpolar([0, 1], [5, 6], -3)).toBe(5);
    expect(interpolar([0, 1], [5, 6], 9)).toBe(6);
  });
});

describe('presionesEdificioRigido', () => {
  const base = { qh: 600, g: 0.85, L: 20, B: 40, h: 10, theta: 20, direccion: 'normal' as const };
  it('edificio cerrado con cubierta a dos aguas, viento normal a la cumbrera', () => {
    const r = presionesEdificioRigido({ ...base, cerramiento: 'cerrado' });
    const f = (id: string) => r.filas.find((x) => x.clave === id)!;
    expect(r.gcpiPositivo).toBe(0.18);
    expect(f('barlovento').pMax).toBeCloseTo(516, 9);
    expect(f('barlovento').pMin).toBeCloseTo(300, 9);
    expect(f('sotavento').pMin).toBeCloseTo(-363, 9);
    expect(f('sotavento').pMax).toBeCloseTo(-147, 9);
    expect(f('lateral').pMin).toBeCloseTo(-465, 9);
    expect(f('cubierta-barlovento').cps.length).toBe(2);
    expect(f('cubierta-barlovento').pMax).toBeCloseTo(108, 9);
    expect(f('cubierta-barlovento').pMin).toBeCloseTo(-312, 9);
    expect(f('cubierta-sotavento').pMin).toBeCloseTo(-414, 9);
    expect(f('cubierta-sotavento').pMax).toBeCloseTo(-198, 9);
  });
  it('parcialmente cerrado: usa GCpi = ±0.55 y qi positiva en la abertura más alta', () => {
    const r = presionesEdificioRigido({ ...base, cerramiento: 'parcial', qiPositiva: 700 });
    const bar = r.filas.find((x) => x.clave === 'barlovento')!;
    // con +0.55: 600·0.85·0.8 − 700·0.55 = 408 − 385 = 23 ; con −0.55: 408 + 600·0.55 = 738
    expect(bar.casos[0].pConGcpiMas).toBeCloseTo(23, 9);
    expect(bar.casos[0].pConGcpiMenos).toBeCloseTo(738, 9);
    const sot = r.filas.find((x) => x.clave === 'sotavento')!;
    expect(sot.casos[0].pConGcpiMas).toBeCloseTo(-255 - 385, 9);
  });
  it('el factor Ri reduce el GCpi en parcialmente cerrado', () => {
    const sinRi = presionesEdificioRigido({ ...base, cerramiento: 'parcial' });
    const conRi = presionesEdificioRigido({ ...base, cerramiento: 'parcial', ri: 0.6 });
    expect(conRi.gcpiPositivo).toBeCloseTo(0.33, 12);
    expect(conRi.filas[0].pMax).toBeLessThan(sinRi.filas[0].pMax);
    // Ri no afecta a cerrados
    expect(presionesEdificioRigido({ ...base, cerramiento: 'cerrado', ri: 0.6 }).gcpiPositivo).toBe(0.18);
  });
  it('θ < 10° o viento paralelo: cubierta por franjas', () => {
    const r = presionesEdificioRigido({ ...base, theta: 5, cerramiento: 'cerrado' });
    const franjas = r.filas.filter((x) => x.clave.startsWith('cubierta-franja'));
    expect(franjas.length).toBe(4);
    // h/L = 0.5: primera franja −0.9 → −0.9·600·0.85 = −459 ; −459 − 108 = −567
    expect(franjas[0].pMin).toBeCloseTo(-567, 9);
    const par = presionesEdificioRigido({ ...base, direccion: 'paralela', cerramiento: 'cerrado' });
    expect(par.filas.filter((x) => x.clave.startsWith('cubierta-franja')).length).toBe(4);
  });
  it('edificio abierto: GCpi = 0 con advertencia', () => {
    const r = presionesEdificioRigido({ ...base, cerramiento: 'abierto' });
    expect(r.gcpiPositivo).toBe(0);
    expect(r.advertencias.length).toBeGreaterThan(0);
  });
  it('qz distinto de qh para el barlovento', () => {
    const r = presionesEdificioRigido({ ...base, cerramiento: 'cerrado', qzBarlovento: 400 });
    expect(r.filas[0].pMax).toBeCloseTo(400 * 0.85 * 0.8 + 108, 9);
  });
});
