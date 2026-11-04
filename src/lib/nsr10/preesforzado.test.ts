import { describe, expect, it } from 'vitest';
import { beta1, moduloRotura } from './concreto';
import {
  alfaParabolaMitad,
  amarreVerticalColumna,
  asLosaMomentoNegativo,
  asLosaMomentoPositivo,
  asMinimoNoAdherido,
  claseFlexion,
  distanciaMinimaApoyo,
  esfuerzosFibras,
  esfuerzosPermisiblesAcero,
  esfuerzosPermisiblesConcreto,
  flexionNominalPreesforzada,
  fpsAdherido,
  fpsNoAdherido,
  friccionPostensado,
  gammaP,
  longitudesRefuerzoAdherido,
  losaRequiereAdheridoPositivo,
  momentoFisuracionPreesforzado,
  refuerzoMinimoMuroPrefabricado,
  relacionFisuracion,
  verificarSeccionPreesforzada,
} from './preesforzado';

// Sección rectangular 400 × 800 mm: A = 320 000 mm², I = 400·800³/12 = 1.70667e10 mm⁴, S = I/400 = 4.26667e7 mm³.
const SEC = { A: 320_000, I: (400 * 800 ** 3) / 12, yt: 400, yb: 400 };

describe('Clases de flexión (C.18.3.3)', () => {
  it('límites con f′c = 35 MPa: 0.62√35 = 3.668 y 1.0√35 = 5.916', () => {
    expect(claseFlexion(3.6, 35)).toBe('U');
    expect(claseFlexion(3.7, 35)).toBe('T');
    expect(claseFlexion(5.9, 35)).toBe('T');
    expect(claseFlexion(5.95, 35)).toBe('C');
    expect(claseFlexion(0, 35)).toBe('U');
  });
  it('losa en dos direcciones: Clase U con ft ≤ 0.50√f′c = 2.958', () => {
    expect(claseFlexion(2.9, 35, { losaDosDirecciones: true })).toBe('U');
    expect(claseFlexion(3.0, 35, { losaDosDirecciones: true })).toBe('C');
  });
});

describe('Esfuerzos admisibles (C.18.4, C.18.5)', () => {
  it('concreto f′c = 35, f′ci = 28 (a mano)', () => {
    const p = esfuerzosPermisiblesConcreto(35, 28);
    expect(p.transferencia.compresion).toBeCloseTo(16.8, 10); // 0.60·28
    expect(p.transferencia.compresionExtremos).toBeCloseTo(19.6, 10); // 0.70·28
    expect(p.transferencia.traccionRefuerzo).toBeCloseTo(0.25 * Math.sqrt(35), 10); // 1.479
    expect(p.transferencia.traccionRefuerzoExtremos).toBeCloseTo(0.5 * Math.sqrt(35), 10); // 2.958
    expect(p.servicio.compresionSostenida).toBeCloseTo(15.75, 10); // 0.45·35
    expect(p.servicio.compresionTotal).toBeCloseTo(21, 10); // 0.60·35
    expect(p.servicio.traccionClaseU).toBeCloseTo(3.668, 3);
    expect(p.servicio.traccionClaseT).toBeCloseTo(5.916, 3);
  });
  it('acero fpu = 1860, fpy = 1675: gato 0.80fpu = 1488 (< 0.94fpy = 1574.5); transferencia 0.82fpy = 1373.5 (< 0.74fpu = 1376.4)', () => {
    const a = esfuerzosPermisiblesAcero(1675, 1860);
    expect(a.gato).toBeCloseTo(1488, 6);
    expect(a.gatoControla).toBe('0.80fpu');
    expect(a.transferencia).toBeCloseTo(1373.5, 6);
    expect(a.transferenciaControla).toBe('0.82fpy');
    expect(a.anclajes).toBeCloseTo(1302, 6);
  });
  it('acero fpy = 1517 (fpy/fpu = 0.82): 0.94fpy = 1426 controla en el gato y 0.82fpy en transferencia', () => {
    const a = esfuerzosPermisiblesAcero(1517, 1860); // 0.94·1517 = 1425.98 ; 0.80·1860 = 1488
    expect(a.gato).toBeCloseTo(1425.98, 2);
    expect(a.gatoControla).toBe('0.94fpy');
    expect(a.transferencia).toBeCloseTo(0.82 * 1517, 6); // 1243.9 < 0.74·1860 = 1376.4 → controla 0.82fpy
  });
  it('el máximo del fabricante puede gobernar en el gato', () => {
    const a = esfuerzosPermisiblesAcero(1675, 1860, 1400);
    expect(a.gato).toBe(1400);
    expect(a.gatoControla).toBe('fabricante');
  });
  it('rechaza fpy > fpu', () => {
    expect(() => esfuerzosPermisiblesAcero(1900, 1860)).toThrow();
  });
});

describe('Fricción en postensado (C.18-1, C.18-2)', () => {
  it('Ppj = 1000 kN, K = 0.005/m, μ = 0.20, ℓ = 10 m, α = 0.1 rad: exponente 0.07 → Ppx = 1000 e^−0.07 = 932.39 kN', () => {
    const r = friccionPostensado({ ppj: 1000, K: 0.005, mu: 0.2, lpx: 10, alpha: 0.1 });
    expect(r.exponente).toBeCloseTo(0.07, 12);
    expect(r.ppxExacta).toBeCloseTo(1000 * Math.exp(-0.07), 9);
    expect(r.ppxExacta).toBeCloseTo(932.394, 3);
    expect(r.ppxAproximada).toBeCloseTo(1000 / 1.07, 9); // 934.579
    expect(r.aproximadaValida).toBe(true);
    expect(r.perdidaPct).toBeCloseTo(6.76, 2);
  });
  it('la forma aproximada solo vale con exponente ≤ 0.3', () => {
    expect(friccionPostensado({ ppj: 1, K: 0.01, mu: 0.25, lpx: 40, alpha: 0.4 }).aproximadaValida).toBe(false); // 0.4 + 0.1 = 0.5
    const lim = friccionPostensado({ ppj: 1, K: 0, mu: 0.3, lpx: 0, alpha: 1 });
    expect(lim.exponente).toBeCloseTo(0.3, 12);
    expect(lim.aproximadaValida).toBe(true);
  });
  it('sin curvatura ni desviación no hay pérdida', () => {
    const r = friccionPostensado({ ppj: 500, K: 0, mu: 0, lpx: 25, alpha: 0 });
    expect(r.ppxExacta).toBe(500);
    expect(r.perdida).toBe(0);
  });
  it('α de la parábola: 4e/L', () => {
    expect(alfaParabolaMitad(0.5, 20)).toBeCloseTo(0.1, 12);
  });
});

describe('fps aproximado (C.18-3 a C.18-5)', () => {
  it('γp: 0.55 (fpy/fpu ≥ 0.80), 0.40 (≥ 0.85), 0.28 (≥ 0.90)', () => {
    expect(gammaP(0.8 * 1860, 1860)).toBe(0.55);
    expect(gammaP(0.85 * 1860, 1860)).toBe(0.4);
    expect(gammaP(0.9 * 1860, 1860)).toBe(0.28);
    expect(gammaP(0.87 * 1860, 1860)).toBe(0.4);
    expect(() => gammaP(0.75 * 1860, 1860)).toThrow();
  });
  it('torones: fpu = 1860, fpy = 1675, f′c = 35, ρp = 987/(400·650) = 0.0037962', () => {
    // β1 = 0.85 − 0.05(35−28)/7 = 0.80; corchete = 0.0037962·1860/35 = 0.201738; fps = 1860(1 − 0.28/0.80·0.201738)
    const rhoP = 987 / (400 * 650);
    const r = fpsAdherido({ fpu: 1860, fpy: 1675, fc: 35, rhoP, dp: 650 });
    expect(r.beta1).toBeCloseTo(0.8, 12);
    expect(r.gammaP).toBe(0.28);
    expect(r.corchete).toBeCloseTo(0.201738, 5);
    expect(r.fps).toBeCloseTo(1860 * (1 - 0.35 * 0.201738), 3);
    expect(r.fps).toBeCloseTo(1728.7, 1);
  });
  it('con refuerzo de compresión el corchete no baja de 0.17', () => {
    const r = fpsAdherido({ fpu: 1860, fpy: 1675, fc: 35, rhoP: 0.001, dp: 650, d: 650, omega: 0, omegaPrima: 0.1, conRefuerzoCompresion: true });
    expect(r.corcheteCalculado).toBeLessThan(0.17); // 0.001·1860/35 − 0.1 < 0
    expect(r.corchete).toBe(0.17);
    expect(r.corcheteLimitado).toBe(true);
    expect(r.fps).toBeCloseTo(1860 * (1 - (0.28 / 0.8) * 0.17), 6);
  });
  it('tendones no adheridos: C.18-4 con luz/altura 17.5, fse = 1100, ρp = 0.0037962', () => {
    // 1100 + 70 + 35/(100·0.0037962) = 1170 + 92.19 = 1262.19 ≤ min(1675, 1520) = 1520
    const r = fpsNoAdherido({ fse: 1100, fc: 35, rhoP: 987 / (400 * 650), fpy: 1675, luzAltura: 17.5 });
    expect(r.ecuacion).toBe('C.18-4');
    expect(r.fps).toBeCloseTo(1262.19, 1);
    expect(r.gobiernaTope).toBe(false);
  });
  it('C.18-5 (luz/altura > 35): divisor 300 y tope fse + 210', () => {
    const r = fpsNoAdherido({ fse: 1100, fc: 35, rhoP: 0.0037962, fpy: 1675, luzAltura: 40 });
    expect(r.ecuacion).toBe('C.18-5');
    expect(r.fpsSinTope).toBeCloseTo(1100 + 70 + 35 / (300 * 0.0037962), 4);
    expect(r.tope).toBe(1310);
  });
  it('el tope fse + 420 gobierna con cuantías muy bajas', () => {
    const r = fpsNoAdherido({ fse: 1100, fc: 35, rhoP: 0.0005, fpy: 1675, luzAltura: 20 });
    expect(r.gobiernaTope).toBe(true);
    expect(r.fps).toBe(1520);
  });
  it('exige fse ≥ 0.50 fpu', () => {
    expect(() => fpsNoAdherido({ fse: 800, fc: 35, rhoP: 0.004, fpy: 1675, fpu: 1860, luzAltura: 20 })).toThrow();
  });
});

describe('Flexión nominal de la viga pretensada (a mano)', () => {
  it('b = 400, dp = 650, Aps = 987: a = 143.4 mm, εt = 0.00788, φ = 0.90, Mn = 986.7 kN·m', () => {
    const r = flexionNominalPreesforzada({ b: 400, dp: 650, aps: 987, fpu: 1860, fpy: 1675, fc: 35 });
    const fps = r.fps.fps; // 1728.7
    expect(r.a).toBeCloseTo((987 * fps) / (0.85 * 35 * 400), 9);
    expect(r.a).toBeCloseTo(143.4, 1);
    expect(r.c).toBeCloseTo(r.a / 0.8, 9);
    expect(r.epsilonT).toBeCloseTo((0.003 * (650 - r.c)) / r.c, 12);
    expect(r.zona).toBe('traccion');
    expect(r.phi).toBe(0.9);
    expect(r.mn).toBeCloseTo((987 * fps * (650 - r.a / 2)) / 1e6, 6);
    expect(r.mn).toBeCloseTo(986.7, 0);
    expect(r.phiMn).toBeCloseTo(0.9 * r.mn, 9);
  });
  it('con refuerzo no preesforzado se suma As fy (C.18.7.3)', () => {
    const base = flexionNominalPreesforzada({ b: 400, dp: 650, aps: 987, fpu: 1860, fpy: 1675, fc: 35 });
    const con = flexionNominalPreesforzada({ b: 400, dp: 650, aps: 987, fpu: 1860, fpy: 1675, fc: 35, as: 600, fy: 420, d: 700 });
    expect(con.mn).toBeGreaterThan(base.mn);
    expect(con.a).toBeGreaterThan(base.a);
  });
  it('β1 de la sección es el de C.10.2.7.3', () => {
    expect(beta1(35)).toBeCloseTo(0.8, 12);
  });
});

describe('C.18.8.2 — carga de fisuración', () => {
  it('Mcr = fr S + Pe (e + S/A) con fr = 0.62√35, S = 4.26667e7 mm³, Pe = 1085.7 kN, e = 250 mm', () => {
    const fr = moduloRotura(35);
    const S = SEC.I / 400;
    const mcr = momentoFisuracionPreesforzado({ fr, P: 1085.7, excentricidad: 250, area: SEC.A, modulo: S });
    // fr S = 3.668·4.26667e7 = 156.5e6 N·mm ; Pe (e + S/A) = 1.0857e6·(250 + 133.33) = 416.2e6 → 572.7 kN·m
    expect(mcr).toBeCloseTo(572.7, 0);
    const rel = relacionFisuracion(888, mcr);
    expect(rel.requerido).toBeCloseTo(687.3, 0);
    expect(rel.cumple).toBe(true);
  });
});

describe('Esfuerzos de fibras y verificación (C.18.3.2, C.18.4)', () => {
  it('transferencia a mitad de luz: Pi = 1283.1 kN, e = 250, Mg = 188.16 kN·m', () => {
    // Pi/A = 4.0097 ; Pi e yt/I = 7.518 ; Mg yt/I = 4.410 → top = 0.902 ; bot = 7.118 (compresión positiva)
    const f = esfuerzosFibras(SEC, 1283.1, 250, 188.16);
    expect(f.superior).toBeCloseTo(0.902, 2);
    expect(f.inferior).toBeCloseTo(7.118, 2);
  });
  it('en el extremo (Mg = 0) con tendón recto la fibra superior queda en tracción −3.508 MPa', () => {
    const f = esfuerzosFibras(SEC, 1283.1, 250, 0);
    expect(f.superior).toBeCloseTo(-3.508, 2);
    expect(f.inferior).toBeCloseTo(11.528, 2);
  });
  it('verificación completa: viga de 14 m, f′c = 35, f′ci = 28, Clase T', () => {
    const r = verificarSeccionPreesforzada({
      fc: 35,
      fci: 28,
      seccion: SEC,
      e: 250,
      Pi: 1283.1,
      Pe: 1085.7,
      Mg: 188.16, // 7.68 kN/m · 14² / 8
      Md: 384.16, // (7.68 + 8) · 14² / 8
      Mt: 629.16, // (7.68 + 8 + 10) · 14² / 8
    });
    // servicio sostenido: top = 3.393 − 6.361 + 9.003 = 6.035 ; bot = 3.393 + 6.361 − 9.003 = 0.751
    expect(r.servicioSostenido.superior).toBeCloseTo(6.035, 2);
    expect(r.servicioSostenido.inferior).toBeCloseTo(0.751, 2);
    // total: top = 3.393 − 6.361 + 14.746 = 11.778 ; bot = 9.754 − 14.746 = −4.992 (tracción)
    expect(r.servicioTotal.superior).toBeCloseTo(11.778, 2);
    expect(r.servicioTotal.inferior).toBeCloseTo(-4.992, 2);
    expect(r.ft).toBeCloseTo(4.992, 2);
    expect(r.clase).toBe('T');
    expect(r.cumple).toBe(true);
    expect(r.requiereRefuerzoTransferencia).toBe(false);
  });
  it('si ft supera 1.0√f′c la sección es Clase C y la verificación de clase falla (como Clase U o T)', () => {
    const r = verificarSeccionPreesforzada({ fc: 35, fci: 28, seccion: SEC, e: 250, Pi: 1283.1, Pe: 1085.7, Mg: 188.16, Md: 384.16, Mt: 678.16 });
    expect(r.ft).toBeCloseTo(6.14, 2);
    expect(r.clase).toBe('C');
    expect(r.cumple).toBe(false);
  });
  it('extremo con tendón recto: tracción 3.508 > 0.5√f′c = 2.958 exige refuerzo adherido (C.18.4.1(c))', () => {
    const r = verificarSeccionPreesforzada({ fc: 35, fci: 28, seccion: SEC, e: 250, Pi: 1283.1, Pe: 1085.7, Mg: 0, Md: 0, Mt: 0, extremoSimple: true });
    expect(r.requiereRefuerzoTransferencia).toBe(true);
    expect(r.verificaciones[0].limite).toBeCloseTo(19.6, 10); // 0.70 f′ci en el extremo
  });
});

describe('Refuerzo mínimo adherido (C.18-6 a C.18-8)', () => {
  it('C.18-6: 0.004 Act', () => {
    expect(asMinimoNoAdherido(150_000)).toBeCloseTo(600, 9);
  });
  it('C.18-7: Nc/(0.5 fy) con fy limitado a 420 MPa', () => {
    expect(asLosaMomentoPositivo(84_000, 420)).toBeCloseTo(400, 9);
    expect(asLosaMomentoPositivo(84_000, 500)).toBeCloseTo(400, 9);
    expect(asLosaMomentoPositivo(84_000, 280)).toBeCloseTo(600, 9);
  });
  it('C.18-8: 0.00075 Acf', () => {
    expect(asLosaMomentoNegativo(2_000_000)).toBeCloseTo(1500, 9);
  });
  it('C.18.9.3.1: sin refuerzo adherido en momento positivo si ft ≤ 0.17√f′c', () => {
    expect(losaRequiereAdheridoPositivo(1.0, 35)).toBe(false); // 0.17·5.916 = 1.006
    expect(losaRequiereAdheridoPositivo(1.1, 35)).toBe(true);
  });
  it('C.18.9.4: ℓn/3 centrada y ℓn/6 a cada lado del apoyo', () => {
    const l = longitudesRefuerzoAdherido(7200);
    expect(l.positivo).toBeCloseTo(2400, 9);
    expect(l.negativoACadaLado).toBeCloseTo(1200, 9);
  });
});

describe('Prefabricados (C.16)', () => {
  it('C.16.6.2.2(a): ℓn/180 y mínimos de 50 mm (losas) y 75 mm (vigas)', () => {
    expect(distanciaMinimaApoyo(9000, 'losa').requerido).toBeCloseTo(50, 9); // 9000/180 = 50
    expect(distanciaMinimaApoyo(12000, 'losa').requerido).toBeCloseTo(66.67, 2);
    expect(distanciaMinimaApoyo(9000, 'viga').requerido).toBe(75);
    expect(distanciaMinimaApoyo(18000, 'viga').requerido).toBe(100);
  });
  it('C.16.5.1.3(a): 1.4 Ag en N; área efectiva ≥ la mitad', () => {
    expect(amarreVerticalColumna(160_000).tnKn).toBeCloseTo(224, 9);
    expect(amarreVerticalColumna(160_000, 60_000).agEfectivo).toBe(80_000);
    expect(amarreVerticalColumna(160_000, 100_000).tnKn).toBeCloseTo(140, 9);
  });
  it('C.16.4.2: 0.001 Ag y separación ≤ 5 t, 750 mm (interior) / 450 mm (exterior)', () => {
    const i = refuerzoMinimoMuroPrefabricado(150, false);
    expect(i.asPorMetro).toBeCloseTo(150, 9);
    expect(i.separacionMax).toBe(750);
    const e = refuerzoMinimoMuroPrefabricado(200, true);
    expect(e.separacionMax).toBe(450);
    expect(refuerzoMinimoMuroPrefabricado(80, false).separacionMax).toBe(400);
  });
});
