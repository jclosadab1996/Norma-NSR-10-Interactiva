import { describe, expect, it } from 'vitest';
import {
  avMin,
  avMinPreesforzado,
  avfRequerido,
  cortanteEnX,
  dCircular,
  disenoMensula,
  mcre,
  muFriccion,
  rhoVerticalMuro,
  requiereAvMin,
  sMaxHorizontalMuro,
  sMaxVerticalMuro,
  separacionMaximaEstribos,
  separacionRequerida,
  vci,
  vcDetallado,
  vcMuro,
  vcMuro27,
  vcMuro28,
  vcMuroSimple,
  vcPreesforzadoC119,
  vcSimplificado,
  vcw,
  verificarCortanteViga,
  vnFriccion,
  vnFriccionInclinado,
  vnMaxFriccion,
  vsBarraDoblada,
  vsEstribos,
  vsEstribosInclinados,
  vsMaximo,
  vsRequerido,
} from './cortante';

// Viga de referencia: bw = 300 mm, d = 500 mm (bw·d = 150 000 mm²), f′c = 21 MPa, √21 = 4.582576.
const R21 = Math.sqrt(21);
const R28 = Math.sqrt(28);

describe('Vc simplificado (C.11.2.1, Ecs. C.11-3 y C.11-4)', () => {
  it('Ec. C.11-3: 0.17 √f′c bw d = 116.86 kN', () => {
    expect(vcSimplificado({ fc: 21, bw: 300, d: 500 })).toBeCloseTo((0.17 * R21 * 150000) / 1000, 6);
    expect(vcSimplificado({ fc: 21, bw: 300, d: 500 })).toBeCloseTo(116.856, 2);
  });
  it('λ = 0.85 reduce Vc proporcionalmente', () => {
    expect(vcSimplificado({ fc: 21, bw: 300, d: 500, lambda: 0.85 })).toBeCloseTo(116.856 * 0.85, 2);
  });
  it('Ec. C.11-4: compresión axial Nu = 200 kN, Ag = 165 000 mm² → factor 1 + 1.2121/14', () => {
    const f = 1 + 200000 / 165000 / 14;
    expect(vcSimplificado({ fc: 21, bw: 300, d: 500, Nu: 200, Ag: 165000 })).toBeCloseTo(116.856 * f, 2);
  });
  it('tracción axial significativa: Vc = 0 (C.11.2.1.3)', () => {
    expect(vcSimplificado({ fc: 21, bw: 300, d: 500, Nu: -50, Ag: 165000 })).toBe(0);
  });
  it('√f′c se limita a 8.3 MPa (C.11.1.2), salvo con sinLimiteRaiz (C.11.1.2.1)', () => {
    // f′c = 100 MPa → √f′c = 10 > 8.3
    expect(vcSimplificado({ fc: 100, bw: 300, d: 500 })).toBeCloseTo((0.17 * 8.3 * 150000) / 1000, 6);
    expect(vcSimplificado({ fc: 100, bw: 300, d: 500, sinLimiteRaiz: true })).toBeCloseTo((0.17 * 10 * 150000) / 1000, 6);
  });
  it('requiere Ag con fuerza axial', () => {
    expect(() => vcSimplificado({ fc: 21, bw: 300, d: 500, Nu: 100 })).toThrow();
  });
});

describe('Vc detallado (C.11.2.2, Ecs. C.11-5 a C.11-8)', () => {
  it('Ec. C.11-5 a mano: (0.16 √f′c + 17 ρw Vu d/Mu) bw d, ρw = 0.01, Vu d/Mu = 0.375', () => {
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 150, Mu: 200 });
    expect(r.vudSobreMu).toBeCloseTo(0.375, 9);
    expect(r.Vc).toBeCloseTo(((0.16 * R21 + 17 * 0.01 * 0.375) * 150000) / 1000, 6); // 119.54 kN
    expect(r.Vc).toBeCloseTo(119.54, 1);
    expect(r.gobiernaMaximo).toBe(false);
    expect(r.ecuacion).toBe('C.11-5');
  });
  it('Vu d/Mu no se toma mayor que 1.0', () => {
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 400, Mu: 100 }); // Vu d/Mu = 2 → 1
    expect(r.vudSobreMu).toBe(1);
    expect(r.Vc).toBeCloseTo(((0.16 * R21 + 17 * 0.01 * 1) * 150000) / 1000, 6);
  });
  it('el máximo 0.29 √f′c bw d gobierna con cuantías altas', () => {
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.05, Vu: 400, Mu: 100 });
    expect(r.gobiernaMaximo).toBe(true);
    expect(r.Vc).toBeCloseTo((0.29 * R21 * 150000) / 1000, 6); // 199.34 kN
  });
  it('compresión: Mm = Mu − Nu(4h − d)/8 y tope de la Ec. C.11-7', () => {
    // Nu = 200 kN, h = 550, d = 500, Ag = 165 000, Mu = 300 kN·m, Vu = 150 kN, ρw = 0.01
    const Mm = 300 - (200 * (4 * 550 - 500)) / 8 / 1000; // 300 − 42.5 = 257.5 kN·m
    const razon = (150 * 0.5) / Mm;
    const Vc5 = ((0.16 * R21 + 17 * 0.01 * razon) * 150000) / 1000;
    const Vc7 = (0.29 * R21 * 150000 * Math.sqrt(1 + (0.29 * 200000) / 165000)) / 1000;
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 150, Mu: 300, Nu: 200, Ag: 165000, h: 550 });
    expect(r.vudSobreMu).toBeCloseTo(razon, 9);
    expect(r.Vc).toBeCloseTo(Math.min(Vc5, Vc7), 6);
    expect(r.Vcmax).toBeCloseTo(Vc7, 6);
  });
  it('compresión con Mm negativo: se usa la Ec. C.11-7', () => {
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 50, Mu: 10, Nu: 2000, Ag: 165000, h: 550 });
    expect(r.ecuacion).toBe('C.11-7');
    expect(r.Vc).toBeCloseTo(r.Vcmax, 9);
  });
  it('tracción: Ec. C.11-8, 0.17 (1 + 0.29 Nu/Ag) √f′c bw d ≥ 0', () => {
    const r = vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 50, Mu: 100, Nu: -100, Ag: 165000 });
    expect(r.ecuacion).toBe('C.11-8');
    expect(r.Vc).toBeCloseTo((0.17 * (1 + (0.29 * -100000) / 165000) * R21 * 150000) / 1000, 6);
    // tracción muy grande → no menor que cero
    expect(vcDetallado({ fc: 21, bw: 300, d: 500, rhoW: 0.01, Vu: 50, Mu: 100, Nu: -1000, Ag: 165000 }).Vc).toBe(0);
  });
  it('elementos circulares: d = 0.8 D y área D·d (C.11.2.3)', () => {
    expect(dCircular(500)).toEqual({ d: 400, area: 200000 });
  });
});

describe('Vc de elementos preesforzados (C.11.3)', () => {
  it('Ec. C.11-9 con mínimo 0.17 y máximo 0.42', () => {
    const base = { fc: 35, bw: 300, d: 600, dp: 600 };
    const R = Math.sqrt(35);
    // Vu dp/Mu = 600·0.6 / 900 = 0.4 → 0.05 R + 4.8·0.4
    const r = vcPreesforzadoC119({ ...base, Vu: 600, Mu: 900 });
    expect(r.vudpSobreMu).toBeCloseTo(0.4, 9);
    expect(r.Vc).toBeCloseTo(((0.05 * R + 4.8 * 0.4) * 300 * 600) / 1000, 6);
    // con Vu dp/Mu muy bajo, se aplica el mínimo 0.17 √f′c bw d
    const bajo = vcPreesforzadoC119({ ...base, Vu: 10, Mu: 900 });
    expect(bajo.Vc).toBeCloseTo((0.17 * R * 180000) / 1000, 6);
    // y el máximo 0.42 √f′c bw d con Vu dp/Mu = 1
    const alto = vcPreesforzadoC119({ ...base, Vu: 2000, Mu: 100 });
    expect(alto.Vc).toBeCloseTo((0.42 * R * 180000) / 1000, 6);
  });
  it('Mcre, Vci y Vcw a mano (Ecs. C.11-10 a C.11-12)', () => {
    // I = 8.1e9 mm⁴, yt = 300 mm, f′c = 35, fpe = 5 MPa, fd = 3 MPa
    const m = mcre({ I: 8.1e9, yt: 300, fc: 35, fpe: 5, fd: 3 });
    expect(m).toBeCloseTo(((8.1e9 / 300) * (0.5 * Math.sqrt(35) + 5 - 3)) / 1e6, 6);
    const v = vci({ fc: 35, bw: 150, d: 600, dp: 600, Vd: 40, Vi: 100, Mcre: m, Mmax: 400 });
    const esperado = (0.05 * Math.sqrt(35) * 150 * 600) / 1000 + 40 + (100 * m) / 400;
    expect(v).toBeCloseTo(Math.max(esperado, (0.14 * Math.sqrt(35) * 150 * 600) / 1000), 6);
    const w = vcw({ fc: 35, bw: 150, dp: 600, fpc: 4, Vp: 10 });
    expect(w).toBeCloseTo(((0.29 * Math.sqrt(35) + 0.3 * 4) * 150 * 600) / 1000 + 10, 6);
  });
});

describe('Vs, refuerzo mínimo y separación (C.11.4)', () => {
  it('Ec. C.11-15: Vs = Av fyt d / s = 142·420·500/150 = 198.8 kN', () => {
    expect(vsEstribos({ Av: 142, fyt: 420, d: 500, s: 150 })).toBeCloseTo(198.8, 6);
  });
  it('estribos inclinados 45° (C.11-16) y barras dobladas (C.11-17)', () => {
    // sen45 + cos45 = √2
    expect(vsEstribosInclinados({ Av: 142, fyt: 420, d: 500, s: 150, alphaGrados: 45 })).toBeCloseTo(198.8 * Math.SQRT2, 6);
    expect(vsBarraDoblada({ Av: 600, fy: 420, alphaGrados: 30 })).toBeCloseTo((600 * 420 * 0.5) / 1000, 6);
  });
  it('Vs máximo 0.66 √f′c bw d y umbral 0.33 para reducir separación', () => {
    expect(vsMaximo(21, 300, 500)).toBeCloseTo((0.66 * R21 * 150000) / 1000, 6); // 453.68 kN
  });
  it('Av,min (C.11-13): el máximo entre 0.062 √f′c bw s/fyt y 0.35 bw s/fyt', () => {
    // s = 150, bw = 300, fyt = 420: 0.062·4.5826·300·150/420 = 30.44; 0.35·300·150/420 = 37.5
    expect(avMin({ fc: 21, bw: 300, s: 150, fyt: 420 })).toBeCloseTo(37.5, 6);
    // con f′c alto domina el primer término: f′c = 64 → √=8; 0.062·8·300·150/420 = 53.14 > 37.5
    expect(avMin({ fc: 64, bw: 300, s: 150, fyt: 420 })).toBeCloseTo((0.062 * 8 * 300 * 150) / 420, 6);
  });
  it('Av,min preesforzado (C.11-14)', () => {
    expect(avMinPreesforzado({ Aps: 1000, fpu: 1860, s: 200, fyt: 420, d: 600, bw: 150 })).toBeCloseTo(((1000 * 1860 * 200) / (80 * 420 * 600)) * Math.sqrt(600 / 150), 6);
  });
  it('se exige Av,min donde Vu > 0.5 φ Vc', () => {
    expect(requiereAvMin(40, 87.6)).toBe(false);
    expect(requiereAvMin(44, 87.6)).toBe(true);
  });
  it('separación máxima: d/2 y 600 mm; mitad si Vs > 0.33 √f′c bw d (C.11.4.5)', () => {
    // d = 500 → 250 mm; umbral 0.33·4.5826·150000 = 226.8 kN
    expect(separacionMaximaEstribos({ d: 500, fc: 21, bw: 300, Vs: 100 })).toEqual({ s: 250, reducida: false });
    expect(separacionMaximaEstribos({ d: 500, fc: 21, bw: 300, Vs: 250 })).toEqual({ s: 125, reducida: true });
    // d = 1400: d/2 = 700 → 600 mm
    expect(separacionMaximaEstribos({ d: 1400, fc: 21, bw: 300, Vs: 10 }).s).toBe(600);
    // preesforzado: 0.75h
    expect(separacionMaximaEstribos({ d: 500, h: 600, fc: 21, bw: 300, Vs: 10, preesforzado: true }).s).toBe(450);
  });
  it('Vs requerido y separación teórica', () => {
    expect(vsRequerido(300, 134.93)).toBeCloseTo(300 / 0.75 - 134.93, 6);
    expect(vsRequerido(50, 134.93)).toBe(0);
    expect(separacionRequerida({ Vs: 265.07, Av: 142, fyt: 420, d: 500 })).toBeCloseTo((142 * 420 * 500) / 265070, 6);
    expect(separacionRequerida({ Vs: 0, Av: 142, fyt: 420, d: 500 })).toBe(Infinity);
  });
});

describe('verificarCortanteViga (C-87 a C-92)', () => {
  it('φVn = φ(Vc + Vs) a mano para f′c = 21, 300×500, No. 3 de dos ramas cada 150 mm', () => {
    const r = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 142, s: 150, Vu: 200 });
    const Vc = 0.17 * R21 * 150;
    const Vs = 198.8;
    expect(r.Vc).toBeCloseTo(Vc, 6);
    expect(r.Vs).toBeCloseTo(Vs, 6);
    expect(r.phiVn).toBeCloseTo(0.75 * (Vc + Vs), 6); // 236.74 kN
    expect(r.cumpleResistencia).toBe(true);
    expect(r.requiereEstribos).toBe(true); // 200 > φVc = 87.6
    expect(r.requiereAvMin).toBe(true);
    expect(r.AvMin).toBeCloseTo(37.5, 6);
    expect(r.cumpleAvMin).toBe(true); // 142 ≥ 37.5
    expect(r.sMax).toBe(250);
    expect(r.cumpleSeparacion).toBe(true);
  });
  it('Vu = 300 kN con f′c = 28: Vs requerido > 0.33 √f′c bw d, así que sMax baja a 125 mm', () => {
    const r = verificarCortanteViga({ fc: 28, fyt: 420, bw: 300, d: 500, Av: 142, s: 110, Vu: 300 });
    expect(r.Vc).toBeCloseTo((0.17 * R28 * 150000) / 1000, 6); // 134.93
    expect(r.VsRequerido).toBeCloseTo(300 / 0.75 - 134.93, 1); // 265.07
    expect(r.sRequerida).toBeCloseTo((142 * 420 * 500) / (r.VsRequerido * 1000), 6); // 112.5 mm
    expect(r.sMax).toBe(125);
    expect(r.sMaxReducida).toBe(true);
    expect(r.sAdoptable).toBeCloseTo(112.5, 0);
    expect(r.cumpleResistencia).toBe(true);
  });
  it('detecta incumplimientos: separación excesiva, sección insuficiente y Vu mayor que φVn', () => {
    const mal = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 142, s: 300, Vu: 200 });
    expect(mal.cumpleSeparacion).toBe(false);
    const grande = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 400, s: 50, Vu: 200 });
    expect(grande.seccionSuficiente).toBe(false);
    const corto = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 142, s: 250, Vu: 400 });
    expect(corto.cumpleResistencia).toBe(false);
  });
  it('fyt mayor de 420 MPa se limita a 420 (C.11.4.2)', () => {
    const r = verificarCortanteViga({ fc: 21, fyt: 500, bw: 300, d: 500, Av: 142, s: 150, Vu: 100 });
    expect(r.fyt).toBe(420);
    expect(r.avisos.some((a) => a.includes('420'))).toBe(true);
  });
  it('sin estribos necesarios cuando Vu ≤ 0.5 φVc (no se exige Av,min)', () => {
    const r = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 142, s: 250, Vu: 40 });
    expect(r.requiereEstribos).toBe(false);
    expect(r.requiereAvMin).toBe(false);
  });
  it('método detallado usa C.11-5', () => {
    const r = verificarCortanteViga({ fc: 21, fyt: 420, bw: 300, d: 500, Av: 142, s: 150, Vu: 150, metodo: 'detallado', rhoW: 0.01, Mu: 200 });
    expect(r.Vc).toBeCloseTo(119.54, 1);
    expect(r.Vcdetalle?.ecuacion).toBe('C.11-5');
  });
  it('diagrama lineal de Vu para carga uniforme', () => {
    expect(cortanteEnX(200, 6, 0)).toBe(200);
    expect(cortanteEnX(200, 6, 3)).toBeCloseTo(0, 9);
    expect(cortanteEnX(200, 6, 1.5)).toBeCloseTo(100, 9);
  });
});

describe('cortante por fricción (C.11.6)', () => {
  it('μ = factor × λ (C.11.6.4.3)', () => {
    expect(muFriccion('monolitico')).toBe(1.4);
    expect(muFriccion('rugosa')).toBe(1.0);
    expect(muFriccion('no-rugosa')).toBe(0.6);
    expect(muFriccion('acero')).toBe(0.7);
    expect(muFriccion('rugosa', 0.75)).toBeCloseTo(0.75, 9);
  });
  it('Vn = Avf fy μ (C.11-25) y Avf requerido', () => {
    expect(vnFriccion({ Avf: 794, fy: 420, mu: 1 })).toBeCloseTo(333.48, 2);
    expect(avfRequerido({ Vu: 250, fy: 420, mu: 1 })).toBeCloseTo(793.65, 1);
    // compresión neta permanente de 40 kN suma a la fuerza del refuerzo
    expect(avfRequerido({ Vu: 250, fy: 420, mu: 1, Nc: 40 })).toBeCloseTo(((250 / 0.75 - 40) * 1000) / 420, 6);
  });
  it('refuerzo inclinado (C.11-26): (μ sen α + cos α)', () => {
    const f = Math.sin(Math.PI / 6) + Math.cos(Math.PI / 6);
    expect(vnFriccionInclinado({ Avf: 581, fy: 420, mu: 1, alphaGrados: 30 })).toBeCloseTo((581 * 420 * f) / 1000, 6);
  });
  it('límites de Vn (C.11.6.5): menor de 0.2 f′c Ac, (3.3 + 0.08 f′c) Ac y 11 Ac', () => {
    // f′c = 21, Ac = 120 000: 504; 597.6; 1320 → 504 kN
    expect(vnMaxFriccion({ fc: 21, Ac: 120000 })).toBeCloseTo(504, 6);
    // f′c = 35: 0.2·35 = 7; 3.3 + 2.8 = 6.1; 11 → 6.1 MPa
    expect(vnMaxFriccion({ fc: 35, Ac: 100000 })).toBeCloseTo(610, 6);
    // demás casos: menor de 0.2 f′c y 5.5
    expect(vnMaxFriccion({ fc: 35, Ac: 100000, monoliticoORugoso: false })).toBeCloseTo(550, 6);
  });
});

describe('ménsulas (C.11.8)', () => {
  it('Avf, An, Asc, Ah con φ = 0.75 y Nuc ≥ 0.2 Vu', () => {
    const r = disenoMensula({ Vu: 200, av: 150, bw: 300, h: 450, d: 400, fc: 28, fy: 420, mu: 1.4, Af: 700 });
    const Avf = 200000 / (0.75 * 420 * 1.4);
    const An = 40000 / (0.75 * 420); // Nuc = 0.2 Vu = 40 kN
    expect(r.Nuc).toBeCloseTo(40, 9);
    expect(r.Avf).toBeCloseTo(Avf, 6);
    expect(r.An).toBeCloseTo(An, 6);
    expect(r.Asc).toBeCloseTo(Math.max(700 + An, (2 * Avf) / 3 + An, (0.04 * 28 * 300 * 400) / 420), 6);
    expect(r.Ah).toBeCloseTo(0.5 * (r.Asc - An), 6);
    expect(r.aplicaC1183).toBe(true);
  });
});

describe('muros (C.11.9)', () => {
  const p = { fc: 28, h: 250, lw: 4000, Nu: 800, Mu: 9000, Vu: 1500 };
  it('Ec. C.11-27: 0.27 √f′c h d + Nu d/(4 ℓw), d = 0.8 ℓw', () => {
    const d = 3200;
    expect(vcMuro27(p)).toBeCloseTo((0.27 * R28 * 250 * d) / 1000 + (800 * d) / (4 * 4000), 6);
  });
  it('Ec. C.11-28 a mano', () => {
    const d = 3200;
    // Mu/Vu − ℓw/2 = 9000/1500 m − 2 m = 4 m = 4000 mm
    const termino = (4000 * (0.1 * R28 + (0.2 * 800000) / (4000 * 250))) / 4000;
    expect(vcMuro28(p)).toBeCloseTo(((0.05 * R28 + termino) * 250 * d) / 1000, 6);
  });
  it('C.11-28 no aplica si Mu/Vu − ℓw/2 ≤ 0 y entonces gobierna C.11-27', () => {
    const q = { ...p, Mu: 2000 }; // Mu/Vu = 1.33 m < 2 m
    expect(Number.isNaN(vcMuro28(q))).toBe(true);
    expect(vcMuro(q).Vc).toBeCloseTo(vcMuro27(q), 9);
  });
  it('Vc simplificado 0.17 √f′c h d', () => {
    expect(vcMuroSimple({ fc: 28, h: 250, lw: 4000 })).toBeCloseTo((0.17 * R28 * 250 * 3200) / 1000, 6);
  });
  it('cuantía vertical (C.11-30) y separaciones máximas', () => {
    // hw/ℓw = 3 → 2.5 − 3 < 0: la cuantía baja a 0.0025 (mínimo)
    expect(rhoVerticalMuro({ hw: 12000, lw: 4000, rhoT: 0.004 })).toBeCloseTo(0.0025, 9);
    // hw/ℓw = 1 → 0.0025 + 0.5·1.5·(0.004 − 0.0025) = 0.003625
    expect(rhoVerticalMuro({ hw: 4000, lw: 4000, rhoT: 0.004 })).toBeCloseTo(0.003625, 9);
    expect(sMaxHorizontalMuro(4000, 250)).toBe(450); // min(800, 750, 450)
    expect(sMaxHorizontalMuro(2000, 250)).toBe(400); // min(400, 750, 450)
    expect(sMaxVerticalMuro(4000, 250)).toBe(450); // min(1333, 750, 450)
    expect(sMaxVerticalMuro(900, 250)).toBe(300);
  });
});
