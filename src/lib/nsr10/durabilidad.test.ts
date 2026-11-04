import { describe, expect, it } from 'vitest';
import {
  categoriaDe,
  claseSulfato,
  cloruroPorcentajeCemento,
  contenidoAire,
  cumpleExpansionSulfatos,
  fcDeDiseno,
  requisitosExposicion,
  verificarLimitesF3,
  verificarMezcla,
} from './durabilidad';

describe('durabilidad: clase de sulfato (Tabla C.4.2.1)', () => {
  it('por contenido en el suelo (% en peso)', () => {
    expect(claseSulfato(0.05)).toBe('S0');
    expect(claseSulfato(0.1)).toBe('S1');
    expect(claseSulfato(0.19)).toBe('S1');
    expect(claseSulfato(0.2)).toBe('S2');
    expect(claseSulfato(2)).toBe('S2');
    expect(claseSulfato(2.01)).toBe('S3');
  });
  it('por contenido en el agua (ppm)', () => {
    expect(claseSulfato(undefined, 149)).toBe('S0');
    expect(claseSulfato(undefined, 150)).toBe('S1');
    expect(claseSulfato(undefined, 1499)).toBe('S1');
    expect(claseSulfato(undefined, 1500)).toBe('S2');
    expect(claseSulfato(undefined, 10000)).toBe('S2');
    expect(claseSulfato(undefined, 10001)).toBe('S3');
  });
  it('si se dan ambos gobierna el más severo; sin datos → S0', () => {
    expect(claseSulfato(0.05, 2000)).toBe('S2');
    expect(claseSulfato(0.5, 100)).toBe('S2');
    expect(claseSulfato()).toBe('S0');
    expect(() => claseSulfato(-1)).toThrow();
  });
  it('categoría de una clase', () => {
    expect(categoriaDe('F3')).toBe('F');
    expect(categoriaDe('C2')).toBe('C');
  });
});

describe('durabilidad: requisitos combinados (Tabla C.4.3.1)', () => {
  it('una sola clase: S2 → a/mc 0.45, f′c 31, cemento V/HS, sin CaCl2', () => {
    const r = requisitosExposicion(['S2']);
    expect(r.aMcMax).toBe(0.45);
    expect(r.fcMin).toBe(31);
    expect(r.cementos?.c150).toMatch(/^V/);
    expect(r.cementos?.c1157).toBe('HS');
    expect(r.cloruroCalcioPermitido).toBe(false);
    expect(r.aireRequerido).toBe(false);
  });
  it('S2 + C1: gobierna S2 en a/mc y f′c; cloruro 0.30 %', () => {
    const r = requisitosExposicion(['S2', 'C1']);
    expect(r.aMcMax).toBe(0.45);
    expect(r.claseAMc).toBe('S2');
    expect(r.fcMin).toBe(31);
    expect(r.cloruroMaxReforzado).toBe(0.3);
    expect(r.cloruroMaxPreesforzado).toBe(0.06);
  });
  it('C2 + S1: a/mc 0.40, f′c 35, cemento tipo II; CaCl2 permitido por S1 (pero C2 lo limita por cloruros)', () => {
    const r = requisitosExposicion(['C2', 'S1']);
    expect(r.aMcMax).toBe(0.4);
    expect(r.fcMin).toBe(35);
    expect(r.claseFc).toBe('C2');
    expect(r.cementos?.c150).toMatch(/^II/);
    expect(r.cloruroMaxReforzado).toBe(0.15);
    expect(r.relacionados).toEqual(['7.7.6, 18.16 #']);
  });
  it('F2 + C2: aire columna F2/F3 y a/mc 0.40', () => {
    const r = requisitosExposicion(['F2', 'C2']);
    expect(r.aireRequerido).toBe(true);
    expect(r.claseAire).toBe('F2/F3');
    expect(r.aMcMax).toBe(0.4);
    expect(r.limitesF3).toBe(false);
  });
  it('F3 activa los límites de la Tabla C.4.4.2; F1 usa la columna F1', () => {
    expect(requisitosExposicion(['F3']).limitesF3).toBe(true);
    expect(requisitosExposicion(['F1']).claseAire).toBe('F1');
  });
  it('clases sin límite (F0, S0, P0, C0): a/mc = null y f′c = 17', () => {
    const r = requisitosExposicion(['F0', 'S0', 'P0', 'C0']);
    expect(r.aMcMax).toBeNull();
    expect(r.claseAMc).toBeNull();
    expect(r.fcMin).toBe(17);
    expect(r.cloruroMaxReforzado).toBe(1);
  });
  it('requiere al menos una clase', () => {
    expect(() => requisitosExposicion([])).toThrow();
  });
});

describe('durabilidad: f′c de diseño (C.4.1.1) y verificación de mezcla', () => {
  it('toma el mayor de estructural, durabilidad y 17 MPa', () => {
    expect(fcDeDiseno(28, 31)).toEqual({ fc: 31, gobierna: 'durabilidad' });
    expect(fcDeDiseno(35, 31)).toEqual({ fc: 35, gobierna: 'estructural' });
    expect(fcDeDiseno(14, 14)).toEqual({ fc: 17, gobierna: 'minimo-general' });
  });
  it('verificarMezcla: a/mc y f′c', () => {
    const req = requisitosExposicion(['S2']);
    expect(verificarMezcla(req, 0.45, 31)).toMatchObject({ aMcOk: true, fcOk: true });
    expect(verificarMezcla(req, 0.46, 30)).toMatchObject({ aMcOk: false, fcOk: false });
    expect(verificarMezcla(req, 0.6, 31, true).aMcOk).toBeNull(); // liviano: C.4.1.2
    expect(verificarMezcla(requisitosExposicion(['S0']), 0.7, 20).aMcOk).toBeNull();
  });
});

describe('durabilidad: aire incorporado (Tabla C.4.4.1)', () => {
  it('F2, agregado de 19 mm: 6 % ± 1.5 → 4.5 a 7.5 %', () => {
    const a = contenidoAire(19, 'F2');
    expect(a.tabla).toBe(6);
    expect(a.minimo).toBe(4.5);
    expect(a.maximo).toBe(7.5);
  });
  it('F1, 25 mm: 4.5 %; F3 igual que F2', () => {
    expect(contenidoAire(25, 'F1').tabla).toBe(4.5);
    expect(contenidoAire(25, 'F3').tabla).toBe(contenidoAire(25, 'F2').tabla);
  });
  it('reducción de 1 punto solo si f′c > 35 y se aplica', () => {
    expect(contenidoAire(19, 'F2', 40, true).objetivo).toBe(5);
    expect(contenidoAire(19, 'F2', 40, false).objetivo).toBe(6);
    expect(contenidoAire(19, 'F2', 35, true).objetivo).toBe(6);
  });
  it('tamaño fuera de la tabla → error', () => {
    expect(() => contenidoAire(20, 'F1')).toThrow();
  });
});

describe('durabilidad: F3, sulfatos alternativos y cloruros', () => {
  it('F3: ceniza 20 %, escoria 20 %, humo de sílice 5 % → totales 45 % y 25 % cumplen', () => {
    const v = verificarLimitesF3({ cemento: 55, ceniza: 20, escoria: 20, humoSilice: 5 });
    expect(v.cumple).toBe(true);
    expect(v.filas.find((f) => f.limite.id === 'total-ceniza-escoria-humo')!.pct).toBeCloseTo(45, 10);
    expect(v.filas.find((f) => f.limite.id === 'total-ceniza-humo')!.pct).toBeCloseTo(25, 10);
  });
  it('F3: 30 % de ceniza supera el 25 %', () => {
    const v = verificarLimitesF3({ cemento: 70, ceniza: 30 });
    expect(v.cumple).toBe(false);
    expect(v.filas.find((f) => f.limite.id === 'ceniza')!.cumple).toBe(false);
  });
  it('F3: ceniza 25 % + humo 10 % = 35 % cumple exactamente; 36 % no', () => {
    expect(verificarLimitesF3({ cemento: 65, ceniza: 25, humoSilice: 10 }).cumple).toBe(true);
    expect(verificarLimitesF3({ cemento: 64, ceniza: 25, humoSilice: 10, escoria: 1 }).filas.find((f) => f.limite.id === 'total-ceniza-humo')!.pct).toBeCloseTo(35, 10);
    expect(verificarLimitesF3({ cemento: 64, ceniza: 25, humoSilice: 11 }).cumple).toBe(false);
  });
  it('expansión a sulfatos (Tabla C.4.5.1)', () => {
    expect(cumpleExpansionSulfatos('S1', { seis: 0.1 }).cumple).toBe(true);
    expect(cumpleExpansionSulfatos('S1', { seis: 0.11 }).cumple).toBe(false);
    expect(cumpleExpansionSulfatos('S2', { seis: 0.05 }).cumple).toBe(true);
    expect(cumpleExpansionSulfatos('S2', { seis: 0.07, doce: 0.09 }).cumple).toBe(true);
    expect(cumpleExpansionSulfatos('S2', { seis: 0.07, doce: 0.11 }).cumple).toBe(false);
    expect(cumpleExpansionSulfatos('S2', { seis: 0.07 }).cumple).toBe(false);
    expect(cumpleExpansionSulfatos('S3', { dieciocho: 0.1 }).cumple).toBe(true);
    expect(cumpleExpansionSulfatos('S3', { seis: 0.01 }).cumple).toBe(false);
  });
  it('contenido de cloruros como % del cemento', () => {
    // 0.35 + 0.30 + 0.20 kg Cl- por m³ en 350 kg/m³ de cemento = 0.243 %
    expect(cloruroPorcentajeCemento([0.35 * 0.1, 0.3 * 0.1, 0.2 * 0.1], 350)).toBeCloseTo((100 * 0.085) / 350, 10);
    expect(cloruroPorcentajeCemento([0.85], 350)).toBeCloseTo(0.242857, 5);
    expect(() => cloruroPorcentajeCemento([1], 0)).toThrow();
    expect(() => cloruroPorcentajeCemento([-1], 300)).toThrow();
  });
});
