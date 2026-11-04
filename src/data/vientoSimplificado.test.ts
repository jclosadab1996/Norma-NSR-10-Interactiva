import { describe, expect, it } from 'vitest';
import {
  ANGULOS_TABULADOS,
  AREAS_CUBIERTA,
  AREAS_MURO,
  FACTOR_IMPORTANCIA_VIENTO,
  PNET10,
  PNET10_ALERO,
  PS10,
  REGIONES_VIENTO,
  TABLA_LAMBDA,
  VELOCIDADES_BASICAS,
  ZONAS_SPRFV,
} from './vientoSimplificado';

describe('Datos B.6.4 — integridad', () => {
  it('regiones 1 a 5 y velocidades del mapa (Figura B.6.4-1)', () => {
    expect(REGIONES_VIENTO.map((r) => r.v)).toEqual([17, 22, 28, 33, 36]);
    expect(REGIONES_VIENTO.map((r) => r.kmh)).toEqual([60, 80, 100, 120, 130]);
    expect([...VELOCIDADES_BASICAS]).toEqual([17, 22, 28, 33, 36]);
  });

  it('ps10: 5 velocidades × 8 filas, 10 zonas por fila', () => {
    expect(PS10).toHaveLength(40);
    for (const f of PS10) expect(f.p).toHaveLength(ZONAS_SPRFV.length);
    for (const v of VELOCIDADES_BASICAS) {
      const filas = PS10.filter((f) => f.v === v);
      expect(filas).toHaveLength(8);
      // caso 1 en 6 ángulos tabulados, caso 2 solo en 25° y 30° ("30 a 45")
      expect(filas.filter((f) => f.caso === 1).map((f) => f.ang)).toEqual([...ANGULOS_TABULADOS]);
      expect(filas.filter((f) => f.caso === 2).map((f) => f.ang)).toEqual([25, 30]);
    }
  });

  it('ps10: los "----" del caso 2 a 25° solo están en A–D, EOH y GOH', () => {
    for (const f of PS10.filter((r) => r.caso === 2 && r.ang === 25)) {
      f.p.forEach((x, k) => {
        const z = ZONAS_SPRFV[k];
        const sinDato = ['A', 'B', 'C', 'D', 'EOH', 'GOH'].includes(z);
        expect(x === null).toBe(sinDato);
      });
    }
    // El resto de filas no tiene nulos.
    for (const f of PS10.filter((r) => !(r.caso === 2 && r.ang === 25))) {
      expect(f.p.every((x) => x !== null)).toBe(true);
    }
  });

  it('ps10: la presión crece (en valor absoluto) con la velocidad en cada celda', () => {
    const celdas = PS10.filter((f) => f.v === 17);
    for (const c of celdas) {
      const serie = VELOCIDADES_BASICAS.map((v) => PS10.find((f) => f.v === v && f.ang === c.ang && f.caso === c.caso)!);
      c.p.forEach((_, k) => {
        const vals = serie.map((f) => f.p[k]);
        if (vals.some((x) => x === null)) return;
        const abs = (vals as number[]).map(Math.abs);
        for (let j = 1; j < abs.length; j++) expect(abs[j]).toBeGreaterThanOrEqual(abs[j - 1] - 1e-9);
      });
    }
  });

  it('ps10: signos — A y C positivas, D negativa a 0–20°, E–H y aleros negativas a 0–20°', () => {
    for (const f of PS10.filter((r) => r.ang <= 20)) {
      const [a, b, c, d, e, ff, g, h, eoh, goh] = f.p as number[];
      expect(a).toBeGreaterThan(0);
      expect(c).toBeGreaterThan(0);
      expect(b).toBeLessThan(0);
      expect(d).toBeLessThan(0);
      for (const x of [e, ff, g, h, eoh, goh]) expect(x).toBeLessThan(0);
    }
  });

  it('ps10: valores de referencia leídos en la imagen (PDF p.260)', () => {
    const get = (v: number, ang: number, caso: number) => PS10.find((f) => f.v === v && f.ang === ang && f.caso === caso)!.p;
    expect(get(17, 5, 1)).toEqual([0.11, -0.05, 0.07, -0.03, -0.13, -0.07, -0.09, -0.06, -0.18, -0.14]);
    expect(get(28, 15, 1)).toEqual([0.37, -0.12, 0.25, -0.07, -0.35, -0.23, -0.25, -0.18, -0.49, -0.39]);
    expect(get(33, 25, 2)).toEqual([null, null, null, null, -0.09, -0.17, -0.03, -0.11, null, null]);
    expect(get(36, 30, 2)).toEqual([0.56, 0.38, 0.44, 0.3, 0.22, -0.17, 0.19, -0.12, -0.19, -0.22]);
  });

  it('λ: 10 alturas de 4.5 a 18.0 m, crece con h y con la rugosidad B < C < D', () => {
    expect(TABLA_LAMBDA.map((f) => f.h)).toEqual([4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15, 16.5, 18]);
    for (let k = 0; k < TABLA_LAMBDA.length; k++) {
      const f = TABLA_LAMBDA[k];
      expect(f.B).toBeLessThan(f.C);
      expect(f.C).toBeLessThan(f.D);
      if (k > 0) {
        const p = TABLA_LAMBDA[k - 1];
        expect(f.B).toBeGreaterThanOrEqual(p.B);
        expect(f.C).toBeGreaterThan(p.C);
        expect(f.D).toBeGreaterThan(p.D);
      }
    }
    expect(TABLA_LAMBDA[0]).toEqual({ h: 4.5, B: 1.0, C: 1.21, D: 1.47 });
    expect(TABLA_LAMBDA[9]).toEqual({ h: 18, B: 1.22, C: 1.62, D: 1.87 });
  });

  it('pnet10: 3 grupos de cubierta × 3 zonas × 4 áreas + muros (2 zonas × 5 áreas) = 46 filas', () => {
    expect(PNET10).toHaveLength(46);
    for (const g of ['c0-7', 'c7-27', 'c27-45'] as const) {
      for (const z of [1, 2, 3] as const) {
        const filas = PNET10.filter((f) => f.grupo === g && f.zona === z);
        expect(filas.map((f) => f.area)).toEqual([...AREAS_CUBIERTA]);
      }
    }
    for (const z of [4, 5] as const) {
      expect(PNET10.filter((f) => f.grupo === 'muro' && f.zona === z).map((f) => f.area)).toEqual([...AREAS_MURO]);
    }
    for (const f of PNET10) {
      expect(f.p).toHaveLength(5);
      for (const [pos, neg] of f.p) {
        expect(pos).toBeGreaterThan(0);
        expect(neg).toBeLessThan(0);
      }
    }
  });

  it('pnet10: crece con la velocidad y no aumenta con el área efectiva', () => {
    for (const f of PNET10) {
      for (let j = 1; j < 5; j++) {
        expect(f.p[j][0]).toBeGreaterThanOrEqual(f.p[j - 1][0]);
        expect(f.p[j][1]).toBeLessThanOrEqual(f.p[j - 1][1]);
      }
    }
    const claves = new Set(PNET10.map((f) => `${f.grupo}|${f.zona}`));
    for (const clave of claves) {
      const [g, z] = clave.split('|');
      const filas = PNET10.filter((f) => f.grupo === g && f.zona === Number(z)).sort((a, b) => a.area - b.area);
      for (let k = 1; k < filas.length; k++) {
        for (let j = 0; j < 5; j++) {
          expect(filas[k].p[j][0]).toBeLessThanOrEqual(filas[k - 1].p[j][0] + 1e-9);
          expect(Math.abs(filas[k].p[j][1])).toBeLessThanOrEqual(Math.abs(filas[k - 1].p[j][1]) + 1e-9);
        }
      }
    }
  });

  it('pnet10: succión de zona 3 ≥ zona 2 ≥ zona 1 en cubiertas con θ ≤ 27°', () => {
    for (const g of ['c0-7', 'c7-27'] as const) {
      for (const a of AREAS_CUBIERTA) {
        const n = (z: 1 | 2 | 3) => PNET10.find((f) => f.grupo === g && f.zona === z && f.area === a)!.p;
        for (let j = 0; j < 5; j++) {
          expect(Math.abs(n(3)[j][1])).toBeGreaterThanOrEqual(Math.abs(n(2)[j][1]));
          expect(Math.abs(n(2)[j][1])).toBeGreaterThanOrEqual(Math.abs(n(1)[j][1]));
        }
      }
    }
  });

  it('pnet10: en 27<θ≤45 las zonas 2 y 3 coinciden (como en la norma); muros: zona 5 ≥ zona 4', () => {
    for (const a of AREAS_CUBIERTA) {
      const z2 = PNET10.find((f) => f.grupo === 'c27-45' && f.zona === 2 && f.area === a)!;
      const z3 = PNET10.find((f) => f.grupo === 'c27-45' && f.zona === 3 && f.area === a)!;
      expect(z3.p).toEqual(z2.p);
    }
    for (const a of AREAS_MURO) {
      const z4 = PNET10.find((f) => f.grupo === 'muro' && f.zona === 4 && f.area === a)!;
      const z5 = PNET10.find((f) => f.grupo === 'muro' && f.zona === 5 && f.area === a)!;
      for (let j = 0; j < 5; j++) {
        expect(z5.p[j][0]).toBeGreaterThanOrEqual(z4.p[j][0]);
        expect(Math.abs(z5.p[j][1])).toBeGreaterThanOrEqual(Math.abs(z4.p[j][1]));
      }
    }
    // A 50 m² las zonas 4 y 5 coinciden.
    expect(PNET10.find((f) => f.grupo === 'muro' && f.zona === 4 && f.area === 50)!.p).toEqual(
      PNET10.find((f) => f.grupo === 'muro' && f.zona === 5 && f.area === 50)!.p,
    );
  });

  it('pnet10: valores de referencia leídos en la imagen (PDF p.263–264)', () => {
    const get = (g: string, z: number, a: number) => PNET10.find((f) => f.grupo === g && f.zona === z && f.area === a)!.p;
    expect(get('c0-7', 1, 1)).toEqual([[0.05, -0.12], [0.09, -0.21], [0.14, -0.33], [0.2, -0.48], [0.23, -0.56]]);
    expect(get('c0-7', 3, 1)[4]).toEqual([0.23, -1.42]);
    expect(get('c7-27', 3, 1)[2]).toEqual([0.19, -0.78]);
    expect(get('c27-45', 1, 10)[4]).toEqual([0.47, -0.47]);
    expect(get('muro', 5, 1)[4]).toEqual([0.56, -0.75]);
    expect(get('muro', 4, 50)[0]).toEqual([0.09, -0.1]);
  });

  it('erratas de impresión corregidas (valores sin punto decimal)', () => {
    const get = (g: string, z: number, a: number) => PNET10.find((f) => f.grupo === g && f.zona === z && f.area === a)!.p;
    expect(get('c0-7', 1, 5)[1][1]).toBe(-0.2); // "-020"
    expect(get('c7-27', 1, 2)[1][0]).toBe(0.11); // ".011"
    const al = (g: string, z: number, a: number) => PNET10_ALERO.find((f) => f.grupo === g && f.zona === z && f.area === a)!.p;
    expect(al('c0-7', 2, 2)[0]).toBe(-0.17); // "-017"
    expect(al('c0-7', 2, 5)[0]).toBe(-0.17); // "-017"
    expect(al('c7-27', 2, 2)[1]).toBe(-0.4); // ".0.40"
    expect(al('c7-27', 3, 2)[0]).toBe(-0.34); // "-034"
    expect(al('c27-45', 3, 2)[0]).toBe(-0.2); // "-020"
  });

  it('aleros: 3 grupos × 2 zonas × 4 áreas = 24 filas, todas con succión, crecen con V', () => {
    expect(PNET10_ALERO).toHaveLength(24);
    for (const f of PNET10_ALERO) {
      expect(f.p).toHaveLength(5);
      for (let j = 0; j < 5; j++) expect(f.p[j]).toBeLessThan(0);
      for (let j = 1; j < 5; j++) expect(f.p[j]).toBeLessThanOrEqual(f.p[j - 1]);
    }
  });

  it('factor de importancia de viento (Tabla B.6.5-1)', () => {
    expect(FACTOR_IMPORTANCIA_VIENTO.I).toEqual({ normal: 0.87, huracan: 0.77 });
    expect(FACTOR_IMPORTANCIA_VIENTO.II.normal).toBe(1);
    expect(FACTOR_IMPORTANCIA_VIENTO.III.normal).toBe(1.15);
    expect(FACTOR_IMPORTANCIA_VIENTO.IV.normal).toBe(1.15);
  });
});
