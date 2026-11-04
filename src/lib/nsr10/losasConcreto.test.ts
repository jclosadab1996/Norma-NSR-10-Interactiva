import { describe, expect, it } from 'vitest';
import {
  alfaF,
  anchoFranjaColumna,
  betaT,
  coeficientesC139,
  constanteTorsion,
  disenoDirectoPanel,
  fraccionDeVigas,
  gammaF,
  gammaFAumentado,
  ladoCuadradoEquivalente,
  momentoColumnaInterior,
  momentoEstaticoTotal,
  momentosC139,
  momentoUnaDireccion,
  pctFranjaColumnaNegExterior,
  pctFranjaColumnaNegInterior,
  pctFranjaColumnaPositivo,
  puedeUsarCoeficientesUnaDireccion,
  repartoVanoFinal,
  repartoVanoInterior,
  semianchoFranjaColumna,
  verificarLimitesDisenoDirecto,
} from './losasConcreto';

describe('C.13.2 — franjas', () => {
  it('semiancho de franja de columna = 0.25 × menor luz', () => {
    expect(semianchoFranjaColumna(8, 6)).toBeCloseTo(1.5, 12);
    expect(anchoFranjaColumna(6, 8)).toBeCloseTo(3, 12);
  });
});

describe('Ec. C.13-4 — momento estático total', () => {
  it('Mo = qu ℓ2 ℓn² / 8 con qu = 12, ℓ2 = 6, ℓn = 5.5 → 272.25 kN·m (a mano: 12·6·30.25/8)', () => {
    const r = momentoEstaticoTotal({ qu: 12, l2: 6, ln: 5.5 });
    expect(r.Mo).toBeCloseTo(272.25, 10);
    expect(r.limitadoPor065).toBe(false);
  });

  it('ℓn no puede ser menor que 0.65 ℓ1 (C.13.6.2.5)', () => {
    const r = momentoEstaticoTotal({ qu: 10, l2: 4, ln: 4, l1: 8 });
    expect(r.lnUsado).toBeCloseTo(5.2, 12);
    expect(r.limitadoPor065).toBe(true);
    expect(r.Mo).toBeCloseTo((10 * 4 * 5.2 ** 2) / 8, 10);
  });

  it('apoyo circular D = 500 mm ≈ cuadrado de 443 mm', () => {
    expect(ladoCuadradoEquivalente(500)).toBeCloseTo(443.113, 2);
  });
});

describe('C.13.6.3 — reparto de Mo', () => {
  it('vano interior: 0.65 / 0.35', () => {
    const r = repartoVanoInterior(272.25);
    expect(r.negInterior).toBeCloseTo(176.9625, 8);
    expect(r.positivo).toBeCloseTo(95.2875, 8);
    expect(r.negExterior).toBeNull();
  });

  it('vano final sin vigas ni viga de borde: 0.70 / 0.52 / 0.26', () => {
    const r = repartoVanoFinal(100, 'sin-vigas-sin-borde');
    expect(r.negInterior).toBeCloseTo(70, 10);
    expect(r.positivo).toBeCloseTo(52, 10);
    expect(r.negExterior).toBeCloseTo(26, 10);
  });

  it('borde no restringido: exterior 0, positivo 0.63, interior 0.75', () => {
    const r = repartoVanoFinal(100, 'borde-no-restringido');
    expect([r.negInterior, r.positivo, r.negExterior]).toEqual([75, 63, 0]);
  });
});

describe('C.13.6.4 — porcentajes a la franja de columna (interpolación)', () => {
  it('valores de la tabla en los nodos', () => {
    expect(pctFranjaColumnaNegInterior(1, 0)).toBe(75);
    expect(pctFranjaColumnaNegInterior(0.5, 1)).toBe(90);
    expect(pctFranjaColumnaNegInterior(1, 1)).toBe(75);
    expect(pctFranjaColumnaNegInterior(2, 1)).toBe(45);
    expect(pctFranjaColumnaNegInterior(2, 5)).toBe(45); // ≥ 1.0 usa la fila ≥ 1.0
    expect(pctFranjaColumnaPositivo(0.5, 1)).toBe(90);
    expect(pctFranjaColumnaPositivo(2, 0)).toBe(60);
  });

  it('interpolación a mano: ℓ2/ℓ1 = 1.2, αf1ℓ2/ℓ1 = 0.5 → fila ≥1: 75 − 30·0.2 = 69; fila 0: 75; punto medio = 72', () => {
    expect(pctFranjaColumnaNegInterior(1.2, 0.5)).toBeCloseTo(72, 10);
  });

  it('positivo: ℓ2/ℓ1 = 1.5, αf1ℓ2/ℓ1 ≥ 1 → (75+45)/2 = 60; con αf = 0.5 → (60+60)/2 = 60', () => {
    expect(pctFranjaColumnaPositivo(1.5, 1)).toBeCloseTo(60, 10);
    expect(pctFranjaColumnaPositivo(1.5, 0.5)).toBeCloseTo(60, 10);
  });

  it('positivo: ℓ2/ℓ1 = 0.75, αf1ℓ2/ℓ1 = 1 → entre 90 y 75 = 82.5', () => {
    expect(pctFranjaColumnaPositivo(0.75, 1)).toBeCloseTo(82.5, 10);
  });

  it('negativo exterior: interpolación en βt (100 → 75 entre 0 y 2.5)', () => {
    expect(pctFranjaColumnaNegExterior(1, 0, 0)).toBe(100);
    expect(pctFranjaColumnaNegExterior(1, 0, 2.5)).toBe(75);
    expect(pctFranjaColumnaNegExterior(1, 0, 10)).toBe(75);
    expect(pctFranjaColumnaNegExterior(1, 1, 1.25)).toBeCloseTo(87.5, 10);
    expect(pctFranjaColumnaNegExterior(1.5, 1, 2.5)).toBeCloseTo(60, 10);
    expect(pctFranjaColumnaNegExterior(1.5, 0.5, 0)).toBe(100);
  });

  it('fuera del rango 0.5–2.0 lanza error', () => {
    expect(() => pctFranjaColumnaNegInterior(0.4, 0)).toThrow(RangeError);
    expect(() => pctFranjaColumnaPositivo(2.1, 0)).toThrow(RangeError);
  });

  it('fracción de las vigas: 0.85 si αf1ℓ2/ℓ1 ≥ 1; lineal hasta 0', () => {
    expect(fraccionDeVigas(1.7)).toBeCloseTo(0.85, 12);
    expect(fraccionDeVigas(0.5)).toBeCloseTo(0.425, 12);
    expect(fraccionDeVigas(0)).toBe(0);
  });
});

describe('Ecs. C.13-3, C.13-5, C.13-6', () => {
  it('αf = Ecb Ib / (Ecs Is)', () => {
    expect(alfaF(24000, 4e9, 24000, 2e9)).toBeCloseTo(2, 12);
    expect(alfaF(30000, 1e9, 20000, 1e9)).toBeCloseTo(1.5, 12);
  });

  it('C de una viga 300 × 500: (1 − 0.63·0.6)·300³·500/3 = 0.622 · 4.5×10⁹ = 2.799×10⁹ mm⁴', () => {
    expect(constanteTorsion([{ x: 300, y: 500 }])).toBeCloseTo(0.622 * 4.5e9, -3);
    expect(constanteTorsion([{ x: 500, y: 300 }])).toBeCloseTo(0.622 * 4.5e9, -3);
  });

  it('C de una sección L se obtiene sumando rectángulos', () => {
    const a = constanteTorsion([{ x: 300, y: 500 }]);
    const b = constanteTorsion([{ x: 150, y: 400 }]);
    expect(constanteTorsion([{ x: 300, y: 500 }, { x: 150, y: 400 }])).toBeCloseTo(a + b, 3);
  });

  it('βt = Ecb C / (2 Ecs Is)', () => {
    expect(betaT(24000, 2.8e9, 24000, 1.4e9)).toBeCloseTo(1, 12);
  });
});

describe('Diseño directo completo de un panel (a mano)', () => {
  it('vano interior, ℓ1 = ℓ2 = 6 m, ℓn = 5.5 m, qu = 12 kPa, sin vigas', () => {
    const r = disenoDirectoPanel({ qu: 12, l1: 6, l2: 6, ln: 5.5, vano: 'interior', alfaF1: 0 });
    expect(r.Mo).toBeCloseTo(272.25, 8);
    expect(r.total.negInterior).toBeCloseTo(176.9625, 8);
    expect(r.total.positivo).toBeCloseTo(95.2875, 8);
    // αf = 0, ℓ2/ℓ1 = 1 → 75 % negativo, 60 % positivo en la franja de columna
    expect(r.pct.negInterior).toBe(75);
    expect(r.pct.positivo).toBe(60);
    expect(r.franjaColumna.negInterior).toBeCloseTo(0.75 * 176.9625, 8);
    expect(r.franjaCentral.negInterior).toBeCloseTo(0.25 * 176.9625, 8);
    expect(r.franjaColumna.positivo).toBeCloseTo(0.6 * 95.2875, 8);
    expect(r.franjaCentral.positivo).toBeCloseTo(0.4 * 95.2875, 8);
    expect(r.vigas.fraccion).toBe(0);
    expect(r.anchoColumna).toBeCloseTo(3, 12);
    expect(r.anchoCentral).toBeCloseTo(3, 12);
  });

  it('suma de franjas = total en todas las secciones', () => {
    const r = disenoDirectoPanel({ qu: 15, l1: 7, l2: 5.5, ln: 6.4, vano: 'sin-vigas-con-borde', alfaF1: 1.4, betaT: 1 });
    expect(r.franjaColumna.negInterior + r.franjaCentral.negInterior).toBeCloseTo(r.total.negInterior, 8);
    expect(r.franjaColumna.positivo + r.franjaCentral.positivo).toBeCloseTo(r.total.positivo, 8);
    expect((r.franjaColumna.negExterior as number) + (r.franjaCentral.negExterior as number)).toBeCloseTo(r.total.negExterior as number, 8);
    expect(r.vigas.momentos.positivo + r.losaEnFranjaColumna.positivo).toBeCloseTo(r.franjaColumna.positivo, 8);
  });

  it('panel con vigas αf1ℓ2/ℓ1 = 1.2·(5.5/7): viga toma 85 %', () => {
    const r = disenoDirectoPanel({ qu: 15, l1: 7, l2: 5.5, ln: 6.4, vano: 'losa-con-vigas', alfaF1: 1.5 });
    expect(r.alfaL).toBeCloseTo((1.5 * 5.5) / 7, 12);
    expect(r.vigas.fraccion).toBeCloseTo(0.85, 12);
  });
});

describe('C.13.6.1 — limitaciones', () => {
  const base = { vanosDireccion1: 3, vanosDireccion2: 3, luzMayor: 7, luzMenor: 6, D: 5, L: 3 };
  it('panel que cumple todo', () => {
    const r = verificarLimitesDisenoDirecto({ ...base, lucesContiguas: [7, 6.5, 7], desalineamientoFraccion: 0.05 });
    expect(r.cumple).toBe(true);
  });
  it('relación de luces > 2 no cumple', () => {
    const r = verificarLimitesDisenoDirecto({ ...base, luzMayor: 13 });
    expect(r.chequeos.find((c) => c.numeral === 'C.13.6.1.2')?.cumple).toBe(false);
  });
  it('menos de tres vanos no cumple', () => {
    expect(verificarLimitesDisenoDirecto({ ...base, vanosDireccion2: 2 }).cumple).toBe(false);
  });
  it('luces contiguas 9 y 5.5: diferencia 3.5/9 = 0.389 > 1/3 no cumple', () => {
    const r = verificarLimitesDisenoDirecto({ ...base, lucesContiguas: [9, 5.5] });
    expect(r.chequeos.find((c) => c.numeral === 'C.13.6.1.3')?.cumple).toBe(false);
  });
  it('L/D = 2.2 > 2 no cumple', () => {
    expect(verificarLimitesDisenoDirecto({ ...base, D: 5, L: 11 }).cumple).toBe(false);
  });
  it('Ec. C.13-2: αf1ℓ2²/(αf2ℓ1²) = 6 > 5 no cumple', () => {
    const r = verificarLimitesDisenoDirecto({ ...base, vigas: { alfaF1: 6, alfaF2: 1, l1: 6, l2: 6 } });
    expect(r.chequeos.find((c) => c.numeral.startsWith('C.13.6.1.6'))?.cumple).toBe(false);
  });
});

describe('Ec. C.13-7 — momento en columna interior', () => {
  it('M = 0.07[(8 + 0.5·4.8)·6·5.5² − 8·5·4.5²] = 0.07·1077.6 = 75.432 kN·m', () => {
    expect(momentoColumnaInterior({ qDu: 8, qLu: 4.8, l2: 6, ln: 5.5, qDuP: 8, l2P: 5, lnP: 4.5 })).toBeCloseTo(75.432, 8);
  });
});

describe('Ec. C.13-1 y C.13.5.3.3 — γf', () => {
  it('γf = 1/(1 + 2/3) = 0.6 con b1 = b2; 0.5 con b1/b2 = 2.25', () => {
    expect(gammaF(500, 500)).toBeCloseTo(0.6, 12);
    expect(gammaF(900, 400)).toBeCloseTo(0.5, 12);
  });
  it('interior con Vu ≤ 0.4φVc y εt ≥ 0.010: 1.25 × 0.6 = 0.75', () => {
    const r = gammaFAumentado({ b1: 500, b2: 500, caso: 'interior-o-borde-perpendicular', VuSobrePhiVc: 0.35, epsilonT: 0.012 });
    expect(r.gammaF).toBeCloseTo(0.75, 12);
    expect(r.aumentado).toBe(true);
  });
  it('interior con Vu > 0.4φVc: no aumenta', () => {
    const r = gammaFAumentado({ b1: 500, b2: 500, caso: 'interior-o-borde-perpendicular', VuSobrePhiVc: 0.5, epsilonT: 0.012 });
    expect(r.gammaF).toBeCloseTo(0.6, 12);
    expect(r.aumentado).toBe(false);
  });
  it('1.25 γf no pasa de 1.0: γf = 0.85 → 1.0', () => {
    // b1/b2 muy pequeño: γf cercano a 1
    const base = gammaF(1, 10000);
    const r = gammaFAumentado({ b1: 1, b2: 10000, caso: 'interior-o-borde-perpendicular', VuSobrePhiVc: 0.1, epsilonT: 0.02 });
    expect(base).toBeGreaterThan(0.98);
    expect(r.gammaF).toBe(1);
  });
  it('borde con eje paralelo: γf = 1 si Vu ≤ 0.75φVc; esquina si ≤ 0.5φVc', () => {
    expect(gammaFAumentado({ b1: 500, b2: 500, caso: 'borde-paralelo', VuSobrePhiVc: 0.7 }).gammaF).toBe(1);
    expect(gammaFAumentado({ b1: 500, b2: 500, caso: 'esquina', VuSobrePhiVc: 0.6 }).aumentado).toBe(false);
  });
});

describe('C.13.5.5.3 — losas en una dirección', () => {
  it('wu ℓn²/11 con wu = 14, ℓn = 4 → 20.364 kN·m', () => {
    expect(momentoUnaDireccion(14, 4, 11)).toBeCloseTo(20.3636, 3);
  });
  it('condiciones', () => {
    expect(puedeUsarCoeficientesUnaDireccion({ vanos: 3, lucesLibres: [4, 4.6], L: 3, D: 4 }).cumple).toBe(true);
    expect(puedeUsarCoeficientesUnaDireccion({ vanos: 3, lucesLibres: [4, 4.9], L: 3, D: 4 }).cumple).toBe(false);
    expect(puedeUsarCoeficientesUnaDireccion({ vanos: 1, L: 3, D: 4 }).cumple).toBe(false);
    expect(puedeUsarCoeficientesUnaDireccion({ vanos: 3, L: 13, D: 4 }).cumple).toBe(false);
  });
});

describe('C.13.9 — método de coeficientes', () => {
  it('lectura directa y celdas vacías', () => {
    expect(coeficientesC139('negativo', 2, 1)).toEqual({ a: 0.045, b: 0.045 });
    expect(coeficientesC139('negativo', 1, 0.8)).toEqual({ a: null, b: null });
    expect(coeficientesC139('negativo', 5, 0.5)).toEqual({ a: 0.09, b: null });
    expect(coeficientesC139('positivo-L', 9, 0.5).a).toBeCloseTo(0.067, 12);
    expect(coeficientesC139('reparto', 3, 0.8).b).toBeCloseTo(0.67, 12);
  });

  it('interpolación lineal en m: caso 2, m = 0.975 → (0.045 + 0.050)/2 = 0.0475', () => {
    expect(coeficientesC139('negativo', 2, 0.975).a).toBeCloseTo(0.0475, 10);
    expect(coeficientesC139('negativo', 2, 0.975).b).toBeCloseTo(0.043, 10);
  });

  it('m fuera de 0.5–1.0 o caso inválido lanza error', () => {
    expect(() => coeficientesC139('negativo', 2, 0.45)).toThrow(RangeError);
    expect(() => coeficientesC139('negativo', 10, 0.8)).toThrow(RangeError);
  });

  it('panel interior caso 2, ℓna = ℓnb = 5, qDu = 6, qLu = 4.8: neg 0.045·10.8·25 = 12.15; pos 0.018·6·25 + 0.027·4.8·25 = 5.94', () => {
    const r = momentosC139({ caso: 2, lna: 5, lnb: 5, qDu: 6, qLu: 4.8 });
    expect(r.negativoA).toBeCloseTo(12.15, 10);
    expect(r.negativoB).toBeCloseTo(12.15, 10);
    expect(r.positivoA).toBeCloseTo(5.94, 10);
    expect(r.positivoB).toBeCloseTo(5.94, 10);
    expect(r.qa).toBe(0.5);
  });

  it('caso 9, m = 0.8 (ℓna = 4, ℓnb = 5): Ca,neg = 0.075 → 0.075·qu·16', () => {
    const r = momentosC139({ caso: 9, lna: 4, lnb: 5, qDu: 5, qLu: 5 });
    expect(r.negativoA).toBeCloseTo(0.075 * 10 * 16, 10);
    expect(r.negativoB).toBeCloseTo(0.017 * 10 * 25, 10);
  });
});
