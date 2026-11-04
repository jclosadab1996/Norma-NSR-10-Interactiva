import { describe, expect, it } from 'vitest';
import {
  CASO_MINIMO_SPRFV,
  alturaCumbreraDosAguas,
  alturaMediaCubierta,
  anchoZonaBorde,
  aplicarMinimoComponentes,
  cargaMinimaSprfv,
  casosAplicables,
  factorImportanciaViento,
  factorLambda,
  fuerzaHorizontalTotal,
  grupoCubierta,
  pnet10,
  pnet10Alero,
  presionNetaComponentes,
  presionesSprfv,
  ps10,
  verificarAlcance,
  zonaCubiertaEfectiva,
} from './vientoSimplificado';

describe('λ — factor de ajuste por altura y exposición', () => {
  it('valores tabulados', () => {
    expect(factorLambda(4.5, 'B')).toBe(1);
    expect(factorLambda(10.5, 'B')).toBe(1.05);
    expect(factorLambda(9, 'C')).toBe(1.4);
    expect(factorLambda(18, 'D')).toBe(1.87);
  });
  it('interpola linealmente entre alturas tabuladas', () => {
    // h = 6.8 m, exposición C: entre 6.0 (1.29) y 7.5 (1.35)
    expect(factorLambda(6.8, 'C')).toBeCloseTo(1.29 + 0.06 * (0.8 / 1.5), 10);
    expect(factorLambda(11.25, 'B')).toBeCloseTo((1.05 + 1.09) / 2, 10);
  });
  it('modo conservador usa la siguiente altura tabulada', () => {
    expect(factorLambda(6.8, 'C', 'superior')).toBe(1.35);
    expect(factorLambda(6.0, 'C', 'superior')).toBe(1.29);
  });
  it('por debajo de 4.5 m usa el valor de 4.5 m; por encima de 18 m es error', () => {
    expect(factorLambda(3, 'D')).toBe(1.47);
    expect(() => factorLambda(18.5, 'B')).toThrow(RangeError);
    expect(() => factorLambda(0, 'B')).toThrow(RangeError);
  });
});

describe('importancia, geometría y alcance', () => {
  it('I de viento (Tabla B.6.5-1)', () => {
    expect(factorImportanciaViento('I')).toBe(0.87);
    expect(factorImportanciaViento('II')).toBe(1);
    expect(factorImportanciaViento('III')).toBe(1.15);
    expect(factorImportanciaViento('I', true)).toBe(0.77);
  });
  it('altura media de cubierta (B.6.2): cornisa si θ ≤ 10°, promedio en otro caso', () => {
    expect(alturaMediaCubierta(6, 7.2, 10)).toBe(6);
    expect(alturaMediaCubierta(6, 8, 15)).toBe(7);
    const cumbrera = alturaCumbreraDosAguas(6, 12, 15);
    expect(cumbrera).toBeCloseTo(6 + 6 * Math.tan((15 * Math.PI) / 180), 10);
  });
  it('ancho a de las zonas de borde', () => {
    // 10 % de 12 m = 1.2; 0.4h con h = 6.8 -> 2.72; menor = 1.2; mínimos 0.48 y 0.9 -> 1.2
    expect(anchoZonaBorde(12, 6.8)).toBeCloseTo(1.2, 10);
    // edificio pequeño: 10 % de 6 = 0.6 -> sube al mínimo de 0.9 m
    expect(anchoZonaBorde(6, 5)).toBe(0.9);
    // 0.4h menor que 10 %: h = 3 -> 1.2 vs 10 % de 20 = 2
    expect(anchoZonaBorde(20, 3)).toBeCloseTo(1.2, 10);
  });
  it('verificarAlcance', () => {
    expect(verificarAlcance({ uso: 'sprfv', h: 7, theta: 15, tipo: 'dos-aguas' })).toEqual([]);
    expect(verificarAlcance({ uso: 'sprfv', h: 19, theta: 15, tipo: 'dos-aguas' })).toHaveLength(1);
    expect(verificarAlcance({ uso: 'sprfv', h: 7, theta: 46, tipo: 'dos-aguas' })).toHaveLength(1);
    expect(verificarAlcance({ uso: 'componentes', h: 7, theta: 30, tipo: 'cuatro-aguas' })).toHaveLength(1);
    expect(verificarAlcance({ uso: 'componentes', h: 7, theta: 30, tipo: 'dos-aguas' })).toEqual([]);
  });
});

describe('ps10 — SPRFV (Figura B.6.4-2)', () => {
  it('valores tabulados', () => {
    const p = ps10(28, 15);
    expect(p.A).toBe(0.37);
    expect(p.B).toBe(-0.12);
    expect(p.E).toBe(-0.35);
    expect(p.GOH).toBe(-0.39);
    expect(ps10(17, 3).A).toBe(0.11); // fila "0 a 5"
    expect(ps10(36, 40).A).toBe(0.56); // fila "30 a 45"
  });
  it('interpola linealmente en θ (nota 6)', () => {
    // V = 28, θ = 12°: entre 10° y 15° -> t = 0.4
    const p = ps10(28, 12);
    expect(p.A).toBeCloseTo(0.33 + (0.37 - 0.33) * 0.4, 10);
    expect(p.B).toBeCloseTo(-0.14 + (-0.12 + 0.14) * 0.4, 10);
    // entre "0 a 5" y 10°: θ = 7.5 -> t = 0.5
    expect(ps10(28, 7.5).A).toBeCloseTo((0.29 + 0.33) / 2, 10);
  });
  it('θ = 27° entre 25° y 30°: caso 1 y caso 2', () => {
    const c1 = ps10(22, 27, 1);
    expect(c1.A).toBeCloseTo(0.24 + (0.21 - 0.24) * 0.4, 10);
    expect(c1.E).toBeCloseTo(-0.1 + (0.02 + 0.1) * 0.4, 10);
    const c2 = ps10(22, 27, 2);
    expect(c2.E).toBeCloseTo(-0.04 + (0.08 + 0.04) * 0.4, 10);
    // A–D del caso 2 se toman iguales al caso 1 (en la norma "----" a 25° y valores idénticos a 30°)
    expect(c2.A).toBeCloseTo(c1.A, 10);
  });
  it('casos de carga aplicables', () => {
    expect(casosAplicables(20)).toEqual([1]);
    expect(casosAplicables(25)).toEqual([1]);
    expect(casosAplicables(26)).toEqual([1, 2]);
    expect(() => ps10(22, 20, 2)).toThrow(RangeError);
  });
  it('rechaza velocidades no tabuladas y ángulos fuera de rango', () => {
    expect(() => ps10(30, 15)).toThrow(RangeError);
    expect(() => ps10(28, 50)).toThrow(RangeError);
    expect(() => ps10(28, -1)).toThrow(RangeError);
  });
});

describe('Ecuación B.6.4-1: ps = λ·Kzt·I·ps10', () => {
  it('aplica el factor a todas las zonas', () => {
    const r = presionesSprfv({ v: 28, theta: 15, h: 6.8, exposicion: 'C', i: 1, kzt: 1 });
    const lam = factorLambda(6.8, 'C');
    expect(r.lambda).toBeCloseTo(lam, 10);
    expect(r.factor).toBeCloseTo(lam, 10);
    expect(r.casos).toHaveLength(1);
    expect(r.casos[0].ps.A).toBeCloseTo(lam * 0.37, 10);
    expect(r.casos[0].ps.E).toBeCloseTo(lam * -0.35, 10);
  });
  it('incluye Kzt e I', () => {
    const r = presionesSprfv({ v: 22, theta: 10, h: 9, exposicion: 'B', i: 1.15, kzt: 1.2 });
    expect(r.factor).toBeCloseTo(1.0 * 1.2 * 1.15, 10);
    expect(r.casos[0].ps.C).toBeCloseTo(1.38 * 0.14, 10);
  });
  it('θ > 25° devuelve los dos casos de carga', () => {
    const r = presionesSprfv({ v: 22, theta: 35, h: 9, exposicion: 'B', i: 1 });
    expect(r.casos.map((c) => c.caso)).toEqual([1, 2]);
    expect(r.casos[0].ps.E).toBeCloseTo(0.02, 10);
    expect(r.casos[1].ps.E).toBeCloseTo(0.08, 10);
  });
  it('caso mínimo B.6.4.2.1.1 y fuerza mínima B.6.1.3.1', () => {
    expect(CASO_MINIMO_SPRFV).toEqual({ A: 0.4, B: 0.4, C: 0.4, D: 0.4, E: 0, F: 0, G: 0, H: 0 });
    expect(cargaMinimaSprfv(100)).toBeCloseTo(40, 10);
  });
  it('fuerza horizontal total y opción ps = 0 en B y D (nota 7)', () => {
    const r = presionesSprfv({ v: 28, theta: 5, h: 5, exposicion: 'B', i: 1 }).casos[0].ps;
    const areas = { A: 10, B: 4, C: 30, D: 8 };
    const f = fuerzaHorizontalTotal(r, areas);
    expect(f).toBeCloseTo(r.A * 10 + r.B * 4 + r.C * 30 + r.D * 8, 10);
    const f0 = fuerzaHorizontalTotal(r, areas, { ceroEnBD: true });
    expect(f0).toBeCloseTo(r.A * 10 + r.C * 30, 10);
    // B y D son negativas a 0–5°: ignorarlas aumenta la fuerza horizontal neta
    expect(f0).toBeGreaterThan(f);
  });
});

describe('pnet10 — componentes y revestimientos (Figura B.6.4-3)', () => {
  it('grupos de cubierta por ángulo', () => {
    expect(grupoCubierta(0)).toBe('c0-7');
    expect(grupoCubierta(7)).toBe('c0-7');
    expect(grupoCubierta(7.1)).toBe('c7-27');
    expect(grupoCubierta(27)).toBe('c7-27');
    expect(grupoCubierta(27.5)).toBe('c27-45');
  });
  it('valores tabulados', () => {
    expect(pnet10(28, 'muro', 5, 1)).toMatchObject({ pos: 0.33, neg: -0.45 });
    expect(pnet10(28, 'c7-27', 3, 2)).toMatchObject({ pos: 0.17, neg: -0.73 });
  });
  it('interpola con el área efectiva (nota 4) o usa el área menor', () => {
    const i = pnet10(28, 'c7-27', 3, 3);
    expect(i.pos).toBeCloseTo(0.17 + (0.15 - 0.17) / 3, 10);
    expect(i.neg).toBeCloseTo(-0.73 + (-0.67 + 0.73) / 3, 10);
    const m = pnet10(28, 'c7-27', 3, 3, 'menor');
    expect(m.pos).toBe(0.17);
    expect(m.neg).toBe(-0.73);
    // el valor del área menor es siempre el más desfavorable (succión mayor)
    expect(Math.abs(m.neg)).toBeGreaterThan(Math.abs(i.neg));
  });
  it('fuera del rango tabulado usa el extremo y lo avisa', () => {
    expect(pnet10(28, 'c0-7', 1, 0.5)).toMatchObject({ pos: 0.14, neg: -0.33, fuera: 'menor' });
    expect(pnet10(28, 'c0-7', 1, 20)).toMatchObject({ pos: 0.11, neg: -0.3, fuera: 'mayor' });
    expect(pnet10(28, 'c0-7', 1, 5).fuera).toBeNull();
  });
  it('aleros', () => {
    expect(pnet10Alero(28, 'c0-7', 3, 1).neg).toBe(-0.79);
    expect(pnet10Alero(28, 'c0-7', 3, 1.5).neg).toBeCloseTo((-0.79 + -0.62) / 2, 10);
  });
  it('nota 3: cuatro aguas con θ ≤ 25° trata la zona 3 como zona 2', () => {
    expect(zonaCubiertaEfectiva('cuatro-aguas', 20, 3)).toBe(2);
    expect(zonaCubiertaEfectiva('cuatro-aguas', 26, 3)).toBe(3);
    expect(zonaCubiertaEfectiva('dos-aguas', 20, 3)).toBe(3);
  });
  it('mínimos de B.6.4.2.2.1: ±0.40 kN/m²', () => {
    expect(aplicarMinimoComponentes({ pos: 0.2, neg: -0.3 })).toEqual({ pos: 0.4, neg: -0.4 });
    expect(aplicarMinimoComponentes({ pos: 0.6, neg: -0.9 })).toEqual({ pos: 0.6, neg: -0.9 });
  });
  it('Ecuación B.6.4-2 con mínimos', () => {
    const lam = factorLambda(6.8, 'C');
    const r = presionNetaComponentes({
      v: 28, superficie: 'cubierta', zona: 3, area: 3, h: 6.8, exposicion: 'C', i: 1,
      theta: 15, tipo: 'dos-aguas',
    });
    expect(r.factor).toBeCloseTo(lam, 10);
    expect(r.pnet.neg).toBeCloseTo(lam * (-0.73 + 0.06 / 3), 10);
    expect(r.pnet.pos).toBeLessThan(0.4);
    expect(r.diseno.pos).toBe(0.4);
    expect(r.diseno.neg).toBeCloseTo(r.pnet.neg, 10);
  });
  it('cuatro aguas θ = 20°, zona 3 -> usa zona 2', () => {
    const r = presionNetaComponentes({
      v: 28, superficie: 'cubierta', zona: 3, area: 1, h: 6, exposicion: 'B', i: 1, theta: 20, tipo: 'cuatro-aguas',
    });
    expect(r.zonaUsada).toBe(2);
    expect(r.pnet10.neg).toBe(-0.53);
  });
  it('muro, alero y errores', () => {
    const m = presionNetaComponentes({ v: 28, superficie: 'muro', zona: 5, area: 2, h: 7.5, exposicion: 'C', i: 1.15, kzt: 1 });
    expect(m.pnet.pos).toBeCloseTo(1.35 * 1.15 * 0.32, 10);
    const al = presionNetaComponentes({
      v: 28, superficie: 'cubierta', zona: 3, area: 1, h: 7.5, exposicion: 'B', i: 1, theta: 5, tipo: 'plana', alero: true,
    });
    expect(al.pnet.neg).toBeCloseTo(-0.79, 10);
    expect(al.diseno.pos).toBe(0);
    expect(() => presionNetaComponentes({ v: 28, superficie: 'muro', zona: 2, area: 1, h: 5, exposicion: 'B', i: 1 })).toThrow(RangeError);
    expect(() => presionNetaComponentes({ v: 28, superficie: 'cubierta', zona: 1, area: 1, h: 5, exposicion: 'B', i: 1, alero: true })).toThrow(RangeError);
    expect(() => presionNetaComponentes({ v: 30, superficie: 'muro', zona: 4, area: 1, h: 5, exposicion: 'B', i: 1 })).toThrow(RangeError);
  });
});
