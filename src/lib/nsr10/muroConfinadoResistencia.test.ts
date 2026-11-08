import { describe, expect, it } from 'vitest';
import {
  analizarMuroConfinado,
  cargaColumnaFueraPlano,
  cortanteEnElementosConfinamiento,
  cortanteMuroConfinado,
  diagonalPano,
  flexoCompresionConMamposteria,
  fuerzasColumnasEnPlano,
  fuerzasDosColumnas,
  geometriaMuroConfinado,
  phiConfinadoFn,
  resistenciaAxialMuroConfinado,
  resistenciaColumnaConfinamiento,
  resistenciaCortanteElemento,
  resistenciaMamposteriaSola,
  tensionVigaConfinamiento,
  verificarAceroViga,
  verificarAplastamientoBiela,
  verificarColumnaFueraPlano,
  verificarColumnasEnPlano,
} from './muroConfinadoResistencia';

/** Muro del ejemplo: t = 150, ℓw = 3000 (c-c), columnas 200 × 150 con 4 No. 4 (516 mm²), f′m = 6, f′c = 21, fy = 420. */
const geo = geometriaMuroConfinado({ t: 150, lw: 3000, bc: 200 });

describe('φ y geometría', () => {
  it('φ de D.10.7.2: 0.65 en compresión, 0.85 en flexión pura y tracción', () => {
    const f = phiConfinadoFn();
    expect(f(100)).toBe(0.65);
    expect(f(0)).toBe(0.85);
    expect(f(-50)).toBe(0.85);
  });
  it('áreas efectivas con dos columnas de 200 × 150', () => {
    expect(geo.Ltotal).toBe(3200);
    expect(geo.Aci).toBe(30000);
    expect(geo.Amamposteria).toBe(420000);
    expect(geo.Ae).toBe(480000);
    expect(geo.b).toBe(150);
    expect(geo.Amv).toBe(450000);
  });
  it('la fracción de área efectiva reduce solo la mampostería', () => {
    const g = geometriaMuroConfinado({ t: 150, lw: 3000, bc: 200, fraccionAe: 0.5 });
    expect(g.Amamposteria).toBe(210000);
    expect(g.Ae).toBe(270000);
    expect(g.b).toBeCloseTo(84.375, 6);
  });
});

describe('D.10.7.4 — carga axial', () => {
  it('Pnc y Pnt de la columna (Ecs. D.10.7-1 y D.10.7-2)', () => {
    const c = resistenciaColumnaConfinamiento({ fc: 21, Aci: 30000, Ast: 516, fy: 420 });
    expect(c.Pnc).toBeCloseTo(594.40752, 4);
    expect(c.Pnt).toBeCloseTo(-216.72, 6);
    expect(c.phiPnc).toBeCloseTo(386.364888, 4);
    expect(c.phiPnt).toBeCloseTo(-184.212, 6);
  });
  it('Pnd de la mampostería sola y Re (Ecs. D.10.7-3 y D.10.7-4)', () => {
    const s = resistenciaMamposteriaSola({ fm: 6, Amd: 420000, hPrime: 2400, t: 150 });
    expect(s.esbeltez).toBe(16);
    expect(s.Re).toBeCloseTo(0.8548753, 6);
    expect(s.Pnd).toBeCloseTo(1378.74286, 4);
    expect(s.phiPnd).toBeCloseTo(896.18286, 4);
  });
  it('rama de Euler de Re cuando h′/t > 30', () => {
    const s = resistenciaMamposteriaSola({ fm: 6, Amd: 100000, hPrime: 4500, t: 120 });
    expect(s.Re).toBeCloseTo((21 / 37.5) ** 2, 8);
  });
  it('muro global con φ = 0.65 y Ast = acero de las columnas', () => {
    const r = resistenciaAxialMuroConfinado({ fm: 6, Ae: 480000, Ast: 1032, fy: 420, hPrime: 2400, t: 150, Pu: 600 });
    expect(r.Po).toBeCloseTo(2732.4864, 4);
    expect(r.Pn).toBeCloseTo(1868.74807, 4);
    expect(r.phiPn).toBeCloseTo(1214.68624, 4);
    expect(r.cumple).toBe(true);
    expect(r.razon).toBeCloseTo(0.493955, 5);
  });
});

describe('D.10.7.5 — fuera del plano', () => {
  it('carga en la columna: el doble de la proporcional a las áreas', () => {
    expect(cargaColumnaFueraPlano(600, 30000, 420000, 2)).toBeCloseTo(75, 8);
    expect(cargaColumnaFueraPlano(600, 30000, 420000, 1)).toBeCloseTo((2 * 600 * 30000) / 450000, 8);
  });
  it('flexo-compresión de la columna con el diagrama del Título C', () => {
    const r = verificarColumnaFueraPlano({ fc: 21, fy: 420, bc: 200, t: 150, Ast: 516, dPrime: 40, Pu: 80, Mu: 1.17 });
    expect(r.cumple).toBe(true);
    expect(r.phiMnDisponible).toBeCloseTo(10.0153, 3);
    expect(r.razon).toBeCloseTo(0.116821, 5);
    const mal = verificarColumnaFueraPlano({ fc: 21, fy: 420, bc: 200, t: 150, Ast: 516, dPrime: 40, Pu: 80, Mu: 15 });
    expect(mal.cumple).toBe(false);
  });
});

describe('D.10.7.6.1 — flexo-compresión despreciando la mampostería', () => {
  it('dos columnas: Ecs. D.10.7-13 a D.10.7-15', () => {
    const r = fuerzasDosColumnas(150, 360, 3000);
    expect(r.deltaPu).toBeCloseTo(120, 8);
    expect(r.Puc).toBeCloseTo(195, 8);
    expect(r.Put).toBeCloseTo(-45, 8);
  });
  it('Put se limita a 0 cuando la ecuación da positivo (no hay tracción)', () => {
    const r = fuerzasDosColumnas(300, 100, 3000);
    expect(r.deltaPu).toBeCloseTo(33.3333333, 6);
    expect(r.Puc).toBeCloseTo(183.333333, 6);
    expect(r.Put).toBe(0);
  });
  it('el caso general con dos columnas iguales reproduce el simplificado', () => {
    const g = fuerzasColumnasEnPlano([{ Aci: 30000, xi: 100 }, { Aci: 30000, xi: 3100 }], 150, 360);
    expect(g.Act).toBe(60000);
    expect(g.xBarra).toBe(1600);
    expect(g.Ict).toBe(135000000000);
    for (const f of g.filas) {
      expect(f.deltaPui).toBeCloseTo(120, 8);
      expect(f.Puc).toBeCloseTo(195, 8);
      expect(f.Put).toBeCloseTo(-45, 8);
    }
  });
  it('tres columnas iguales (muro de 6.0 m): la central no cambia de carga por flexión', () => {
    const g = fuerzasColumnasEnPlano([{ Aci: 30000, xi: 100 }, { Aci: 30000, xi: 3100 }, { Aci: 30000, xi: 6100 }], 300, 1500);
    expect(g.xBarra).toBe(3100);
    expect(g.Ict).toBe(540000000000);
    expect(g.filas[0].deltaPui).toBeCloseTo(250, 8);
    expect(g.filas[0].Puc).toBeCloseTo(350, 8);
    expect(g.filas[0].Put).toBeCloseTo(-150, 8);
    expect(g.filas[1].deltaPui).toBeCloseTo(0, 8);
    expect(g.filas[1].Puc).toBeCloseTo(100, 8);
    expect(g.filas[1].Put).toBe(0);
  });
  it('usa valores absolutos de Pu y Mu (la norma los toma positivos)', () => {
    expect(fuerzasDosColumnas(-150, -360, 3000).Puc).toBeCloseTo(195, 8);
  });
  it('verificación D.10.7-11 y D.10.7-12', () => {
    const col = resistenciaColumnaConfinamiento({ fc: 21, Aci: 30000, Ast: 516, fy: 420 });
    const f = fuerzasColumnasEnPlano([{ Aci: 30000, xi: 100 }, { Aci: 30000, xi: 3100 }], 150, 360).filas;
    const v = verificarColumnasEnPlano(f, [col, col]);
    expect(v.cumple).toBe(true);
    expect(v.razonCompresion).toBeCloseTo(195 / 386.364888, 5);
    expect(v.razonTraccion).toBeCloseTo(45 / 184.212, 5);
    const f2 = fuerzasColumnasEnPlano([{ Aci: 30000, xi: 100 }, { Aci: 30000, xi: 3100 }], 150, 1000).filas;
    const v2 = verificarColumnasEnPlano(f2, [col, col]);
    expect(v2.cumpleCompresion).toBe(false);
    expect(v2.cumpleTraccion).toBe(false);
    // Mu = 700 kN·m: las columnas aún cumplen (Puc = 308.3 kN, Put = −158.3 kN)
    const f3 = fuerzasColumnasEnPlano([{ Aci: 30000, xi: 100 }, { Aci: 30000, xi: 3100 }], 150, 700).filas;
    expect(verificarColumnasEnPlano(f3, [col, col]).cumple).toBe(true);
  });
});

describe('D.10.7.6.2 — con la mampostería', () => {
  const base = { fm: 6, fy: 420, b: 150, L: 3200, dPrime: 100, AstColumna: 516, Pu: 150, esbeltez: { hPrime: 2400, t: 150 } };
  it('Mu = 360 kN·m cumple con φMn = 638.6 kN·m para Pu = 150 kN', () => {
    const r = flexoCompresionConMamposteria({ ...base, Mu: 360 }).verificacion;
    expect(r.cumple).toBe(true);
    expect(r.phiMnDisponible).toBeCloseTo(638.5655, 2);
    expect(r.razon).toBeCloseTo(0.563764, 4);
    expect(r.detalle?.phi).toBe(0.65);
  });
  it('Mu = 700 kN·m no cumple', () => {
    const r = flexoCompresionConMamposteria({ ...base, Mu: 700 }).verificacion;
    expect(r.cumple).toBe(false);
    expect(r.motivo).toBe('Mu-excede');
    expect(r.razon).toBeCloseTo(1.096207, 4);
  });
});

describe('D.10.7.7 — cortante', () => {
  it('Vn = (√f′m/12 + Pu/3Ae) Amv con Pu = 150 kN', () => {
    const r = cortanteMuroConfinado({ fm: 6, Amv: 450000, Ae: 480000, Pu: 150, Vu: 60 });
    expect(r.VnSinTope).toBeCloseTo(138.730865, 4);
    expect(r.tope).toBeCloseTo(183.711731, 4);
    expect(r.Vn).toBeCloseTo(138.730865, 4);
    expect(r.topeRige).toBe(false);
    expect(r.phiVn).toBeCloseTo(69.365433, 4);
    expect(r.razon).toBeCloseTo(0.864984, 5);
    expect(r.cumple).toBe(true);
  });
  it('con Pu = 300 kN rige el tope √f′m Amv/6', () => {
    const r = cortanteMuroConfinado({ fm: 6, Amv: 450000, Ae: 480000, Pu: 300 });
    expect(r.VnSinTope).toBeCloseTo(185.605865, 4);
    expect(r.topeRige).toBe(true);
    expect(r.Vn).toBeCloseTo(183.711731, 4);
    expect(r.razon).toBeNull();
  });
  it('Vu = 80 kN no cumple (φVn = 69.4 kN)', () => {
    expect(cortanteMuroConfinado({ fm: 6, Amv: 450000, Ae: 480000, Pu: 150, Vu: 80 }).cumple).toBe(false);
  });
});

describe('D.10.7.8 — aplastamiento de la biela', () => {
  it('paño de 3.0 × 2.5 m', () => {
    expect(diagonalPano(3000, 2500)).toBeCloseTo(3905.12484, 4);
    const r = verificarAplastamientoBiela({ fm: 6, Vu: 60, lw: 3000, lc: 3000, hp: 2500, t: 150, b: 150 });
    expect(r.anchoBiela).toBeCloseTo(781.024968, 4);
    expect(r.Amd).toBeCloseTo(117153.745, 2);
    expect(r.Pud).toBeCloseTo(78.1024968, 4);
    expect(r.esbeltez).toBeCloseTo(26.0341656, 5);
    expect(r.Re).toBeCloseTo(0.6157722, 5);
    expect(r.Pnd).toBeCloseTo(277.01769, 3);
    expect(r.phiPnd).toBeCloseTo(180.0615, 3);
    expect(r.razon).toBeCloseTo(0.433755, 5);
    expect(r.cumple).toBe(true);
  });
  it('acepta la diagonal dada por el usuario', () => {
    const r = verificarAplastamientoBiela({ fm: 6, Vu: 60, lw: 3000, lc: 3000, hp: 2500, t: 150, b: 150, hDiagonal: 4000 });
    expect(r.hDiagonal).toBe(4000);
    expect(r.Pud).toBeCloseTo(80, 8);
  });
});

describe('D.10.7.9 y D.10.7.10 — elementos de confinamiento', () => {
  it('cortante en columna y viga: ℓc/2ℓw Vu y hp/2ℓw Vu', () => {
    const v = cortanteEnElementosConfinamiento({ Vu: 60, lw: 3000, lc: 3000, hp: 2500 });
    expect(v.columna).toBeCloseTo(30, 10);
    expect(v.viga).toBeCloseTo(25, 10);
  });
  it('Vnc = Vc + Vs con φ = 0.50 (columna 150 × 160, 2 No. 2 a 100 mm)', () => {
    const r = resistenciaCortanteElemento({ fc: 21, bw: 150, d: 160, Av: 64, s: 100, fyt: 420, Vuc: 30 });
    expect(r.Vc).toBeCloseTo(18.696909, 5);
    expect(r.Vs).toBeCloseTo(43.008, 6);
    expect(r.Vnc).toBeCloseTo(61.704909, 5);
    expect(r.phiVnc).toBeCloseTo(30.852454, 5);
    expect(r.razon).toBeCloseTo(0.97237, 4);
    expect(r.cumple).toBe(true);
  });
  it('viga con estribos a 200 mm no cumple con φ = 0.50 y sí con φ = 0.75', () => {
    const a = resistenciaCortanteElemento({ fc: 21, bw: 150, d: 160, Av: 64, s: 200, fyt: 420, Vuc: 25 });
    expect(a.Vs).toBeCloseTo(21.504, 6);
    expect(a.phiVnc).toBeCloseTo(20.100454, 5);
    expect(a.cumple).toBe(false);
    expect(resistenciaCortanteElemento({ fc: 21, bw: 150, d: 160, Av: 64, s: 200, fyt: 420, Vuc: 25, phi: 0.75 }).cumple).toBe(true);
  });
  it('sin estribos solo cuenta Vc', () => {
    expect(resistenciaCortanteElemento({ fc: 21, bw: 150, d: 160 }).Vs).toBe(0);
  });
  it('tracción en la viga: Put = −(ℓc/ℓw) Vu', () => {
    expect(tensionVigaConfinamiento({ Vu: 60, lc: 3000, lw: 3000 })).toBeCloseTo(-60, 10);
    expect(tensionVigaConfinamiento({ Vu: 60, lc: 1500, lw: 3000 })).toBeCloseTo(-30, 10);
  });
  it('acero longitudinal de la viga (Ec. D.10.7-25)', () => {
    const r = verificarAceroViga({ Vu: 60, lc: 3000, lw: 3000, fy: 420, Ast: 284 });
    expect(r.AsRequerida).toBeCloseTo(168.067227, 5);
    expect(r.Pnt).toBeCloseTo(-119.28, 6);
    expect(r.phiPnt).toBeCloseTo(-101.388, 6);
    expect(r.razon).toBeCloseTo(0.591786, 5);
    expect(r.cumple).toBe(true);
    expect(verificarAceroViga({ Vu: 60, lc: 3000, lw: 3000, fy: 420, Ast: 142 }).cumple).toBe(false);
    expect(verificarAceroViga({ Vu: 60, lc: 3000, lw: 3000, fy: 420 }).cumple).toBeNull();
  });
});

describe('analizarMuroConfinado', () => {
  const e = {
    fm: 6, fc: 21, fy: 420, t: 150, lw: 3000, bc: 200, hp: 2500, hPrime: 2400, AstColumna: 516,
    Pu: 600, PuSimultanea: 150, Mu: 360, Vu: 60,
    columnaCortante: { d: 160, Av: 64, s: 100, fyt: 420 },
    vigaCortante: { bw: 150, d: 160, Av: 64, s: 100, fyt: 420 },
    AstViga: 284,
  };
  it('el muro del ejemplo cumple todas las verificaciones', () => {
    const r = analizarMuroConfinado(e);
    expect(r.filas).toHaveLength(9);
    expect(r.cumpleTodo).toBe(true);
    expect(r.lc).toBe(3000);
  });
  it('estribos de viga a 200 mm: solo falla el cortante de la viga', () => {
    const r = analizarMuroConfinado({ ...e, vigaCortante: { ...e.vigaCortante, s: 200 } });
    expect(r.cumpleTodo).toBe(false);
    expect(r.filas.filter((f) => !f.cumple).map((f) => f.id)).toEqual(['vucViga']);
  });
  it('Mu = 700 kN·m: solo falla la flexo-compresión con mampostería (φ = 0.65), no el método de las columnas', () => {
    const r = analizarMuroConfinado({ ...e, Mu: 700 });
    expect(r.filas.filter((f) => !f.cumple).map((f) => f.id)).toEqual(['flexo']);
  });
  it('Mu = 1000 kN·m: fallan compresión, tracción y flexo-compresión', () => {
    const r = analizarMuroConfinado({ ...e, Mu: 1000 });
    expect(r.filas.filter((f) => !f.cumple).map((f) => f.id)).toEqual(['colComp', 'colTrac', 'flexo']);
  });
});
