import { describe, expect, it } from 'vitest';
import { TABLA_B653_KZ, TABLA_B652_CONSTANTES } from '../../data/vientoAnalitico';
import {
  alturaEquivalente,
  factorDireccionalidad,
  factorImportanciaViento,
  factorRafagaFlexible,
  factorRafagaRigido,
  factorTopografico,
  k1TablaExposicionC,
  k2Tabla,
  k3Tabla,
  kz,
  kzTabla,
  kztDesdeMultiplicadores,
  perfilKz,
  presionVelocidad,
  presionVelocidadKN,
  respuestaResonanciaRl,
  velocidadBasicaRegion,
} from './viento';

describe('Kz (Tabla B.6.5-3 y ecuaciones de la nota 2)', () => {
  it('la ecuación reproduce la Tabla B.6.5-3 con diferencias ≤ 0.01 (salvo las filas anómalas del PDF)', () => {
    for (const f of TABLA_B653_KZ) {
      // Fila "20.0": sus valores corresponden a ~21.3 m, no a 20.0 m (diferencia de 0.008–0.014): anomalía del PDF.
      if (f.z === 20.0) continue;
      const tol = 0.0101;
      expect(Math.abs(kz('B', f.z, 1) - f.B1), `B1 z=${f.z}`).toBeLessThan(tol);
      if (f.z >= 9) expect(Math.abs(kz('B', f.z, 2) - f.B2), `B2 z=${f.z}`).toBeLessThan(tol);
      // Fila 36.5 m: el PDF imprime C = 1.36 y D = 1.52 (los mismos de 42.5 m); la ecuación da 1.31 y 1.48.
      if (f.z === 36.5) continue;
      expect(Math.abs(kz('C', f.z) - f.C), `C z=${f.z}`).toBeLessThan(tol);
      expect(Math.abs(kz('D', f.z) - f.D), `D z=${f.z}`).toBeLessThan(tol);
    }
  });

  it('anomalías documentadas de la Tabla B.6.5-3 (se transcribe lo impreso, pero la ecuación difiere)', () => {
    expect(kz('C', 36.5)).toBeCloseTo(1.31, 2);
    expect(kz('D', 36.5)).toBeCloseTo(1.48, 2);
    expect(kz('C', 36.5)).toBeLessThan(TABLA_B653_KZ.find((f) => f.z === 36.5)!.C - 0.04);
    expect(kz('C', 21.3)).toBeCloseTo(1.17, 2);
  });

  it('valores puntuales verificados contra la tabla (±0.01)', () => {
    const cerca = (x: number, t: number) => expect(Math.abs(x - t)).toBeLessThan(0.0101);
    cerca(kz('C', 9), 0.98);
    cerca(kz('C', 30.5), 1.26);
    cerca(kz('D', 60), 1.61);
    cerca(kz('B', 60), 1.2);
    cerca(kz('B', 152), 1.56);
    cerca(kz('C', 152), 1.77);
    cerca(kz('D', 152), 1.89);
  });

  it('para z < 4.0 m se evalúa con z = 4.0 m (nota 2)', () => {
    expect(kz('C', 0)).toBeCloseTo(kz('C', 4), 12);
    expect(kz('C', 2.5)).toBeCloseTo(kz('C', 4), 12);
    expect(kz('C', 4)).toBeCloseTo(2.01 * Math.pow(4 / 274.3, 2 / 9.5), 12);
  });

  it('caso 1 en exposición B no baja de z = 9.0 m; el caso 2 sí', () => {
    expect(kz('B', 3, 1)).toBeCloseTo(kz('B', 9, 1), 12);
    expect(kz('B', 3, 1)).toBeCloseTo(0.7, 2);
    expect(kz('B', 6, 2)).toBeLessThan(kz('B', 6, 1));
    expect(kz('B', 6, 2)).toBeCloseTo(0.62, 2);
    expect(kz('B', 12, 1)).toBeCloseTo(kz('B', 12, 2), 12);
  });

  it('es monótona creciente con la altura y mayor al pasar de B a C a D', () => {
    for (const e of ['B', 'C', 'D'] as const) {
      let prev = 0;
      for (let z = 0; z <= 150; z += 5) {
        const k = kz(e, z);
        expect(k).toBeGreaterThanOrEqual(prev);
        prev = k;
      }
    }
    expect(kz('B', 30)).toBeLessThan(kz('C', 30));
    expect(kz('C', 30)).toBeLessThan(kz('D', 30));
  });

  it('alcanza 2.01 en z = zg', () => {
    for (const e of ['B', 'C', 'D'] as const) expect(kz(e, TABLA_B652_CONSTANTES[e].zg)).toBeCloseTo(2.01, 10);
  });

  it('rechaza alturas inválidas', () => {
    expect(() => kz('C', -1)).toThrow(RangeError);
    expect(() => kz('C', Number.NaN)).toThrow(RangeError);
    expect(() => kz('D', 300)).toThrow(RangeError);
  });

  it('kzTabla reproduce las filas e interpola', () => {
    expect(kzTabla('C', 60)).toBe(1.46);
    expect(kzTabla('B', 6, 1)).toBe(0.7);
    expect(kzTabla('B', 6, 2)).toBe(0.62);
    expect(kzTabla('D', 0)).toBe(1.03);
    expect(kzTabla('C', 13.5)).toBeCloseTo((1.04 + 1.09) / 2, 10);
    expect(() => kzTabla('C', 153)).toThrow(RangeError);
  });

  it('perfilKz devuelve puntos coherentes', () => {
    const p = perfilKz('C', 100, { V: 28, n: 10 });
    expect(p).toHaveLength(11);
    expect(p[0].z).toBe(0);
    expect(p[10].z).toBe(100);
    expect(p[10].qz).toBeCloseTo(0.613 * p[10].kz * 28 * 28, 8);
  });
});

describe('presión por velocidad qz (B.6.5-13)', () => {
  it('qz = 0.613·Kz·Kzt·Kd·V²·I en N/m²', () => {
    expect(presionVelocidad({ V: 28, Kz: 1 })).toBeCloseTo(0.613 * 784, 8);
    expect(presionVelocidad({ V: 28, Kz: 0.98, Kzt: 1.2, Kd: 0.85, I: 1.15 })).toBeCloseTo(0.613 * 0.98 * 1.2 * 0.85 * 784 * 1.15, 8);
  });
  it('valores por defecto Kzt = Kd = I = 1', () => {
    expect(presionVelocidad({ V: 20, Kz: 1.1 })).toBeCloseTo(0.613 * 1.1 * 400, 10);
  });
  it('referencia numérica: V = 28 m/s, exposición C, z = 9 m (Kz tabla 0.98) ≈ 471 N/m²', () => {
    expect(presionVelocidad({ V: 28, Kz: 0.98 })).toBeCloseTo(471.2, 0);
  });
  it('conversión a kN/m²', () => {
    expect(presionVelocidadKN({ V: 28, Kz: 1 })).toBeCloseTo(0.480592, 6);
  });
});

describe('tablas B.6.5-1, B.6.5-4 y Figura B.6.4-1', () => {
  it('factor de importancia', () => {
    expect(factorImportanciaViento('I')).toBe(0.87);
    expect(factorImportanciaViento('II')).toBe(1.0);
    expect(factorImportanciaViento('III')).toBe(1.15);
    expect(factorImportanciaViento('IV')).toBe(1.15);
    expect(factorImportanciaViento('I', true)).toBe(0.77);
    expect(factorImportanciaViento('IV', true)).toBe(1.15);
  });
  it('Kd', () => {
    expect(factorDireccionalidad('edificio-sprfv')).toBe(0.85);
    expect(factorDireccionalidad('chimenea-cuadrada')).toBe(0.9);
    expect(factorDireccionalidad('torre-otras')).toBe(0.95);
    expect(() => factorDireccionalidad('nada')).toThrow(RangeError);
  });
  it('velocidad básica por región', () => {
    expect([1, 2, 3, 4, 5].map((r) => velocidadBasicaRegion(r as 1))).toEqual([17, 22, 28, 33, 36]);
  });
});

describe('Kzt (B.6.5-1 y Figura B.6.5-1)', () => {
  it('Kzt = (1 + K1K2K3)²', () => {
    expect(kztDesdeMultiplicadores(0.29, 1, 1)).toBeCloseTo(1.29 ** 2, 12);
    expect(kztDesdeMultiplicadores(0, 0.5, 0.5)).toBe(1);
  });

  it('las ecuaciones reproducen los multiplicadores tabulados para exposición C', () => {
    const base = { exposicion: 'C' as const, H: 50, x: 0, z: 0 };
    // K1 = coef·(H/Lh): se compara con la tabla (B-47) para H/Lh = 0.2…0.5
    for (const hlh of [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]) {
      for (const forma of ['loma2D', 'escarpe2D', 'colina3D'] as const) {
        const r = factorTopografico({ ...base, forma, Lh: 50 / hlh });
        expect(Math.abs(r.k1 - k1TablaExposicionC(forma, hlh)), `${forma} ${hlh}`).toBeLessThan(0.006);
      }
    }
    // K3 = exp(−γ z/Lh) contra la tabla
    for (const zlh of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0]) {
      for (const forma of ['loma2D', 'escarpe2D', 'colina3D'] as const) {
        const r = factorTopografico({ ...base, forma, Lh: 100, z: zlh * 100 });
        expect(Math.abs(r.k3 - k3Tabla(zlh, forma)), `${forma} z/Lh=${zlh}`).toBeLessThan(0.0105);
      }
    }
    // K2 = 1 − |x|/(μ Lh): escarpe sotavento (μ = 4) y otros casos (μ = 1.5)
    for (const xlh of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]) {
      const sot = factorTopografico({ ...base, forma: 'escarpe2D', lado: 'sotavento', Lh: 100, x: xlh * 100 });
      expect(Math.abs(sot.k2 - k2Tabla(xlh, true)), `escarpe sot x/Lh=${xlh}`).toBeLessThan(0.006);
      const otro = factorTopografico({ ...base, forma: 'loma2D', Lh: 100, x: xlh * 100 });
      expect(Math.abs(otro.k2 - k2Tabla(xlh, false)), `otro x/Lh=${xlh}`).toBeLessThan(0.006);
    }
  });

  it('loma 2D, exposición C, en la cresta y a z = 0: Kzt = (1 + 1.45·H/Lh)²', () => {
    const r = factorTopografico({ forma: 'loma2D', exposicion: 'C', H: 60, Lh: 200, x: 0, z: 0 });
    expect(r.k1).toBeCloseTo(1.45 * 0.3, 10);
    expect(r.k2).toBe(1);
    expect(r.k3).toBe(1);
    expect(r.kzt).toBeCloseTo((1 + 1.45 * 0.3) ** 2, 10);
    expect(r.cumpleCondiciones).toBe(true);
  });

  it('H/Lh > 0.5: K1 con 0.5 y Lh = 2H para K2 y K3 (nota 2)', () => {
    const r = factorTopografico({ forma: 'loma2D', exposicion: 'C', H: 100, Lh: 100, x: 100, z: 50 });
    expect(r.hLhK1).toBe(0.5);
    expect(r.lhEfectivo).toBe(200);
    expect(r.k1).toBeCloseTo(0.725, 10);
    expect(r.k2).toBeCloseTo(1 - 100 / (1.5 * 200), 10);
    expect(r.k3).toBeCloseTo(Math.exp((-3 * 50) / 200), 10);
  });

  it('Kzt = 1 si no se cumplen (d) o (e), salvo que se ignoren las condiciones', () => {
    const poco = factorTopografico({ forma: 'loma2D', exposicion: 'C', H: 30, Lh: 300, x: 0, z: 0 }); // H/Lh = 0.1
    expect(poco.cumpleCondiciones).toBe(false);
    expect(poco.kzt).toBe(1);
    expect(poco.kztCalculado).toBeGreaterThan(1);
    const baja = factorTopografico({ forma: 'loma2D', exposicion: 'B', H: 10, Lh: 20, x: 0, z: 0 }); // H < 18 m en B
    expect(baja.cumpleCondiciones).toBe(false);
    expect(baja.kzt).toBe(1);
    const forzado = factorTopografico({ forma: 'loma2D', exposicion: 'B', H: 10, Lh: 20, x: 0, z: 0, ignorarCondiciones: true });
    expect(forzado.kzt).toBeGreaterThan(1);
  });

  it('K2 se anula lejos de la cresta y Kzt tiende a 1', () => {
    const r = factorTopografico({ forma: 'colina3D', exposicion: 'D', H: 40, Lh: 100, x: 1000, z: 0 });
    expect(r.k2).toBe(0);
    expect(r.kzt).toBe(1);
  });

  it('el escarpe usa μ = 4 solo hacia sotavento', () => {
    const bar = factorTopografico({ forma: 'escarpe2D', exposicion: 'C', H: 40, Lh: 100, x: 100, z: 0 });
    const sot = factorTopografico({ forma: 'escarpe2D', exposicion: 'C', H: 40, Lh: 100, x: 100, z: 0, lado: 'sotavento' });
    expect(bar.k2).toBeCloseTo(1 - 1 / 1.5, 10);
    expect(sot.k2).toBeCloseTo(1 - 1 / 4, 10);
  });

  it('rechaza H o Lh no positivos', () => {
    expect(() => factorTopografico({ forma: 'loma2D', exposicion: 'C', H: 0, Lh: 10, x: 0, z: 0 })).toThrow(RangeError);
  });
});

describe('Factor de efecto ráfaga (B.6.5.8)', () => {
  it('altura equivalente: 0.6h pero no menor que zmin', () => {
    expect(alturaEquivalente('B', 10)).toBe(9);
    expect(alturaEquivalente('B', 30)).toBeCloseTo(18, 12);
    expect(alturaEquivalente('C', 5)).toBe(4.5);
    expect(alturaEquivalente('D', 2)).toBe(2);
  });

  it('G rígido: coincide con el cálculo manual de B.6.5-2 a B.6.5-5 (exposición C, h = 20 m, B = 30 m)', () => {
    const r = factorRafagaRigido({ exposicion: 'C', h: 20, B: 30 });
    expect(r.zBarra).toBe(12);
    expect(r.Iz).toBeCloseTo(0.2 * Math.pow(10 / 12, 1 / 6), 12);
    expect(r.Lz).toBeCloseTo(152.4 * Math.pow(1.2, 1 / 5), 10);
    expect(r.Q).toBeCloseTo(1 / Math.sqrt(1 + 0.62 * Math.pow(50 / r.Lz, 0.63)), 12);
    const g = 0.925 * ((1 + 1.7 * 3.4 * r.Iz * r.Q) / (1 + 1.7 * 3.4 * r.Iz));
    expect(r.G).toBeCloseTo(g, 12);
    // Para edificios corrientes G ronda 0.85–0.95 (la norma permite usar 0.85)
    expect(r.G).toBeGreaterThan(0.8);
    expect(r.G).toBeLessThan(1.0);
  });

  it('G rígido nunca supera 0.925 (Q ≤ 1) y crece cuando Q → 1', () => {
    const chico = factorRafagaRigido({ exposicion: 'B', h: 10, B: 5 });
    const grande = factorRafagaRigido({ exposicion: 'B', h: 10, B: 100 });
    expect(chico.G).toBeLessThanOrEqual(0.925);
    expect(chico.Q).toBeGreaterThan(grande.Q);
    expect(chico.G).toBeGreaterThan(grande.G);
  });

  it('Rℓ: límites y continuidad', () => {
    expect(respuestaResonanciaRl(0)).toBe(1);
    expect(respuestaResonanciaRl(1e-4)).toBeCloseTo(1, 3);
    expect(respuestaResonanciaRl(1)).toBeCloseTo(1 - (1 - Math.exp(-2)) / 2, 12);
    expect(respuestaResonanciaRl(10)).toBeCloseTo(0.1 - (1 - Math.exp(-20)) / 200, 12);
  });

  it('Gf flexible: es finito, mayor que el G rígido y crece al bajar el amortiguamiento', () => {
    const base = { exposicion: 'C' as const, h: 120, B: 30, L: 30, n1: 0.4, V: 28 };
    const a = factorRafagaFlexible({ ...base, beta: 0.01 });
    const b = factorRafagaFlexible({ ...base, beta: 0.05 });
    const rig = factorRafagaRigido({ exposicion: 'C', h: 120, B: 30 });
    expect(Number.isFinite(a.Gf)).toBe(true);
    expect(a.Gf).toBeGreaterThan(rig.G);
    expect(a.Gf).toBeGreaterThan(b.Gf);
    expect(a.R).toBeGreaterThan(b.R);
    // gR = √(2 ln(3600 n1)) + 0.577/√(2 ln(3600 n1))
    const r = Math.sqrt(2 * Math.log(3600 * 0.4));
    expect(a.gR).toBeCloseTo(r + 0.577 / r, 12);
    // Vz̄ = b̄ (z̄/10)^ᾱ V
    expect(a.Vz).toBeCloseTo(0.65 * Math.pow(7.2, 1 / 6.5) * 28, 10);
  });

  it('Gf rechaza parámetros no positivos', () => {
    expect(() => factorRafagaFlexible({ exposicion: 'C', h: 50, B: 20, L: 20, n1: 0, beta: 0.01, V: 28 })).toThrow(RangeError);
  });
});
