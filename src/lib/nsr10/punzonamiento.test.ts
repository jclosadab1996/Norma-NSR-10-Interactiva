import { describe, expect, it } from 'vitest';
import {
  areaSeccionCritica,
  betaColumna,
  cortanteZapata,
  gammaV,
  perimetroCritico,
  perimetroExteriorMinimo,
  separacionMaxLineasPernos,
  vcDosDirecciones,
  vcDosDireccionesPreesforzado,
  verificarPunzonamiento,
} from './punzonamiento';

const R28 = Math.sqrt(28);
const R21 = Math.sqrt(21);

describe('perímetro de la sección crítica (C.11.11.1.2)', () => {
  it('interior: 2(c1 + d) + 2(c2 + d)', () => {
    expect(perimetroCritico({ c1: 400, c2: 400, d: 300, ubicacion: 'interior' })).toBe(2800);
    expect(perimetroCritico({ c1: 300, c2: 900, d: 250, ubicacion: 'interior' })).toBe(3400);
  });
  it('borde: 2(c1 + d/2) + (c2 + d); esquina: (c1 + d/2) + (c2 + d/2)', () => {
    expect(perimetroCritico({ c1: 400, c2: 400, d: 300, ubicacion: 'borde' })).toBe(1800);
    expect(perimetroCritico({ c1: 400, c2: 400, d: 300, ubicacion: 'esquina' })).toBe(1100);
  });
  it('áreas encerradas', () => {
    expect(areaSeccionCritica({ c1: 400, c2: 400, d: 300, ubicacion: 'interior' })).toBe(700 * 700);
    expect(areaSeccionCritica({ c1: 400, c2: 400, d: 300, ubicacion: 'borde' })).toBe(550 * 700);
    expect(areaSeccionCritica({ c1: 400, c2: 400, d: 300, ubicacion: 'esquina' })).toBe(550 * 550);
  });
  it('β es lado largo / lado corto', () => {
    expect(betaColumna(300, 900)).toBe(3);
    expect(betaColumna(500, 500)).toBe(1);
  });
});

describe('Vc en dos direcciones: el menor de C.11-31, C.11-32 y C.11-33', () => {
  it('columna cuadrada interior 400×400, d = 300, f′c = 28: gobierna C.11-33 (1466.8 kN)', () => {
    const r = vcDosDirecciones({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'interior' });
    const base = R28 * 2800 * 300;
    expect(r.bo).toBe(2800);
    expect(r.beta).toBe(1);
    expect(r.alphaS).toBe(40);
    expect(r.vcA).toBeCloseTo((0.17 * 3 * base) / 1000, 6); // 2266.9
    expect(r.vcB).toBeCloseTo((0.083 * ((40 * 300) / 2800 + 2) * base) / 1000, 6); // 2318.9
    expect(r.vcC).toBeCloseTo((0.33 * base) / 1000, 6); // 1466.8
    expect(r.Vc).toBeCloseTo(1466.8, 1);
    expect(r.gobierna).toBe('C.11-33');
  });
  it('columna alargada 300×900 (β = 3): gobierna C.11-31', () => {
    const r = vcDosDirecciones({ fc: 28, d: 250, c1: 300, c2: 900, ubicacion: 'interior' });
    const base = R28 * 3400 * 250;
    expect(r.vcA).toBeCloseTo((0.17 * (1 + 2 / 3) * base) / 1000, 6); // 1274.4
    expect(r.Vc).toBeCloseTo(r.vcA, 9);
    expect(r.gobierna).toBe('C.11-31');
  });
  it('columna muy grande respecto a d (bo/d > 20): gobierna C.11-32', () => {
    const r = vcDosDirecciones({ fc: 28, d: 200, c1: 1200, c2: 1200, ubicacion: 'interior' });
    const base = R28 * 5600 * 200;
    expect(r.vcB).toBeCloseTo((0.083 * ((40 * 200) / 5600 + 2) * base) / 1000, 6);
    expect(r.gobierna).toBe('C.11-32');
  });
  it('columna de borde (αs = 30) y de esquina (αs = 20)', () => {
    const b = vcDosDirecciones({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'borde' });
    expect(b.bo).toBe(1800);
    expect(b.alphaS).toBe(30);
    expect(b.vcB).toBeCloseTo((0.083 * ((30 * 300) / 1800 + 2) * R28 * 1800 * 300) / 1000, 6);
    const e = vcDosDirecciones({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'esquina' });
    expect(e.alphaS).toBe(20);
    expect(e.vcC).toBeCloseTo((0.33 * R28 * 1100 * 300) / 1000, 6);
  });
  it('λ = 0.75 reduce todas las expresiones y √f′c se limita a 8.3 MPa', () => {
    const n = vcDosDirecciones({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'interior' });
    const l = vcDosDirecciones({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'interior', lambda: 0.75 });
    expect(l.Vc).toBeCloseTo(0.75 * n.Vc, 6);
    const alto = vcDosDirecciones({ fc: 100, d: 300, c1: 400, c2: 400, ubicacion: 'interior' });
    expect(alto.vcC).toBeCloseTo((0.33 * 8.3 * 2800 * 300) / 1000, 6);
  });
});

describe('Vc preesforzado en dos direcciones (C.11-34)', () => {
  it('βp = menor de 0.29 y 0.083(αs d/bo + 1.5)', () => {
    // αs d/bo = 40·200/2800 = 2.857 → 0.083·4.357 = 0.3616 > 0.29 → βp = 0.29
    const r = vcDosDireccionesPreesforzado({ fc: 35, d: 200, bo: 2800, ubicacion: 'interior', fpc: 1.5, Vp: 20 });
    expect(r.betaP).toBe(0.29);
    expect(r.Vc).toBeCloseTo(((0.29 * Math.sqrt(35) + 0.3 * 1.5) * 2800 * 200) / 1000 + 20, 6);
  });
});

describe('verificación de punzonamiento φVn ≥ Vu', () => {
  it('sin refuerzo: φVc = 0.75·1466.8 = 1100.1 kN', () => {
    const r = verificarPunzonamiento({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'interior', Vu: 1000 });
    expect(r.phiVn).toBeCloseTo(0.75 * 1466.8, 0);
    expect(r.cumple).toBe(true);
    expect(r.relacion).toBeCloseTo(1000 / r.phiVn, 9);
    expect(verificarPunzonamiento({ fc: 28, d: 300, c1: 400, c2: 400, ubicacion: 'interior', Vu: 1200 }).cumple).toBe(false);
  });
  it('con estribos: Vc ≤ 0.17 √f′c bo d, Vs = Av fyt d / s y Vn ≤ 0.5 √f′c bo d', () => {
    // losa d = 180, columna 350×350 interior: bo = 2·530·2 = 2120
    const r = verificarPunzonamiento({ fc: 28, d: 180, c1: 350, c2: 350, ubicacion: 'interior', Vu: 520, refuerzo: 'estribos', Av: 568, fyt: 420, s: 90 });
    const Vc = (0.17 * R28 * 2120 * 180) / 1000; // 343.3
    const Vs = (568 * 420 * 180) / 90 / 1000; // 477.1
    expect(r.bo).toBe(2120);
    expect(r.VcUsado).toBeCloseTo(Vc, 6);
    expect(r.Vs).toBeCloseTo(Vs, 6);
    expect(r.VnMax).toBeCloseTo((0.5 * R28 * 2120 * 180) / 1000, 6); // 1009.6
    expect(r.phiVn).toBeCloseTo(0.75 * (Vc + Vs), 6); // 615.3
    expect(r.cumple).toBe(true);
    // sin refuerzo no pasa: φVc = 0.75 · 666.4 = 499.8 < 520
    expect(verificarPunzonamiento({ fc: 28, d: 180, c1: 350, c2: 350, ubicacion: 'interior', Vu: 520 }).cumple).toBe(false);
  });
  it('el máximo Vn limita el aporte del refuerzo', () => {
    const r = verificarPunzonamiento({ fc: 28, d: 180, c1: 350, c2: 350, ubicacion: 'interior', Vu: 900, refuerzo: 'estribos', Av: 2000, fyt: 420, s: 90 });
    expect(r.Vn).toBeCloseTo(r.VnMax, 9);
    expect(r.avisos.some((a) => a.includes('limitado'))).toBe(true);
  });
  it('con pernos: Vc ≤ 0.25 √f′c bo d, Vn ≤ 0.66 √f′c bo d y Av fy/(bo s) ≥ 0.17 √f′c', () => {
    const r = verificarPunzonamiento({ fc: 28, d: 180, c1: 350, c2: 350, ubicacion: 'interior', Vu: 520, refuerzo: 'pernos', Av: 568, fyt: 420, s: 90 });
    // Vc = min(Vc de 3 expresiones = 666.4, 0.25 √f′c bo d = 505.9)
    expect(r.VcUsado).toBeCloseTo((0.25 * R28 * 2120 * 180) / 1000, 6);
    expect(r.VnMax).toBeCloseTo((0.66 * R28 * 2120 * 180) / 1000, 6);
    expect(r.avFySobreBoS).toBeCloseTo((568 * 420) / (2120 * 90), 9);
    expect(r.avFySobreBoSMin).toBeCloseTo(0.17 * R28, 9);
  });
  it('avisos: d < 150 mm y d < 16 db', () => {
    const r = verificarPunzonamiento({ fc: 28, d: 140, c1: 350, c2: 350, ubicacion: 'interior', Vu: 300, refuerzo: 'estribos', Av: 142, fyt: 420, s: 70, dbCortante: 9.5 });
    expect(r.avisos.some((a) => a.includes('150'))).toBe(true);
    const r2 = verificarPunzonamiento({ fc: 28, d: 150, c1: 350, c2: 350, ubicacion: 'interior', Vu: 300, refuerzo: 'estribos', Av: 142, fyt: 420, s: 70, dbCortante: 12.7 });
    expect(r2.avisos.some((a) => a.includes('16'))).toBe(true); // 16·12.7 = 203 > 150
  });
  it('exige Av, s y fyt con refuerzo', () => {
    expect(() => verificarPunzonamiento({ fc: 28, d: 180, c1: 350, c2: 350, ubicacion: 'interior', Vu: 520, refuerzo: 'estribos' })).toThrow();
  });
});

describe('utilidades de C.11.11', () => {
  it('perímetro exterior mínimo: Vu / (φ 0.17 √f′c d)', () => {
    expect(perimetroExteriorMinimo({ Vu: 520, d: 180, fc: 28 })).toBeCloseTo(520000 / (0.75 * 0.17 * R28 * 180), 6); // ≈ 4282 mm
  });
  it('separación entre líneas de pernos: 0.75d o 0.5d según el esfuerzo', () => {
    // 0.5 φ √f′c = 0.5·0.75·5.2915 = 1.984 MPa
    expect(separacionMaxLineasPernos({ d: 180, fc: 28, vuMPa: 1.5 })).toBeCloseTo(135, 6);
    expect(separacionMaxLineasPernos({ d: 180, fc: 28, vuMPa: 2.5 })).toBeCloseTo(90, 6);
  });
  it('γv = 1 − γf', () => {
    expect(gammaV(0.6)).toBeCloseTo(0.4, 12);
  });
  it('cortante de zapata: Vu = Pu − qu·A, con qu = Pu/(B L)', () => {
    // Zapata 2.2 × 2.2 m, columna 400, d = 350, Pu = 1200 kN: qu = 247.93 kPa; A = 0.75² = 0.5625 m²
    const z = cortanteZapata({ Pu: 1200, B: 2.2, L: 2.2, c1: 400, c2: 400, d: 350 });
    expect(z.qu).toBeCloseTo(1200 / 4.84, 6);
    expect(z.area).toBeCloseTo(0.5625, 9);
    expect(z.Vu).toBeCloseTo(1200 - (1200 / 4.84) * 0.5625, 6); // 1060.5
    // φVc con bo = 3000: 0.33 √21 · 3000 · 350 = 1587.9 kN → φVc = 1190.9
    const r = verificarPunzonamiento({ fc: 21, d: 350, c1: 400, c2: 400, ubicacion: 'interior', Vu: z.Vu });
    expect(r.bo).toBe(3000);
    expect(r.Vc).toBeCloseTo((0.33 * R21 * 3000 * 350) / 1000, 6);
    expect(r.cumple).toBe(true);
  });
});
