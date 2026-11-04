import { describe, expect, it } from 'vitest';
import {
  areaA2Zapata,
  areaBaseRequerida,
  armaduraMinimaPilote,
  asFlexionZapata,
  astTraccionPilote,
  cortanteDosDireccionesZapata,
  cortanteUnaDireccion,
  dMinimoDosDirecciones,
  dMinimoUnaDireccion,
  dimensionMinimaVigaAmarre,
  disenarZapataCuadrada,
  fraccionReaccionPilote,
  gammaS,
  interfazColumnaZapata,
  ladoCuadradoEquivalente,
  ladoZapataCuadrada,
  momentoZapataCara,
  phiVcUnaDireccion,
  presionesConMomento,
  repartoRefuerzoCorto,
  resistenciaAplastamiento,
  separacionMaximaEstribosAmarre,
  verificarEsfuerzosPilote,
  voladizoZapata,
} from './cimentaciones';

// Caso base (a mano): columna 400×400, D = 1000 kN, L = 500 kN → P = 1500 kN; Pu = 1.2·1000 + 1.6·500 = 2000 kN;
// qa neta = 200 kPa; f′c = 21 MPa; fy = 420 MPa.
const P = 1500;
const Pu = 1.2 * 1000 + 1.6 * 500;
const qa = 200;

describe('C.15.2 — área de base con cargas de servicio', () => {
  it('A = 1500/200 = 7.5 m² → B = 2.7386 m', () => {
    expect(areaBaseRequerida(P, qa)).toBeCloseTo(7.5, 12);
    expect(ladoZapataCuadrada(P, qa)).toBeCloseTo(2.73861, 5);
  });
  it('presión neta nula o negativa lanza error', () => {
    expect(() => areaBaseRequerida(P, 0)).toThrow(RangeError);
  });
  it('presiones con momento: e = 0.2 m, L = 2.75 → q = q0 (1 ± 6·0.2/2.75)', () => {
    const r = presionesConMomento(1000, 200, 2.75, 2.75);
    const q0 = 1000 / (2.75 * 2.75);
    expect(r.e).toBeCloseTo(0.2, 12);
    expect(r.qMax).toBeCloseTo(q0 * (1 + 1.2 / 2.75), 10);
    expect(r.qMin).toBeCloseTo(q0 * (1 - 1.2 / 2.75), 10);
    expect(r.despegue).toBe(false);
    expect(presionesConMomento(1000, 600, 2.75, 2.75).despegue).toBe(true);
  });
});

describe('C.15.3 y C.15.4 — momentos y refuerzo', () => {
  it('columna circular D = 450 mm → cuadrado de 398.8 mm', () => {
    expect(ladoCuadradoEquivalente(450)).toBeCloseTo(398.80, 1);
  });
  it('voladizo y Mu en la cara: B = 2.75, c = 400 → v = 1.175 m; Mu = qu B v²/2', () => {
    const qu = Pu / 2.75 ** 2;
    const v = voladizoZapata(2.75, 400);
    expect(v).toBeCloseTo(1.175, 12);
    expect(momentoZapataCara({ qu, ancho: 2.75, voladizo: v })).toBeCloseTo((qu * 2.75 * 1.175 ** 2) / 2, 8);
    expect(qu).toBeCloseTo(264.4628, 3);
  });
  it('Ec. 15-1: γs = 2/(β+1): β = 2 → 0.6667; β = 1 → 1', () => {
    expect(gammaS(2)).toBeCloseTo(2 / 3, 12);
    expect(gammaS(1)).toBe(1);
    expect(() => gammaS(0.8)).toThrow(RangeError);
  });
  it('reparto: As = 3000 mm², β = 1.5 → γs = 0.8 → 2400 en la franja central y 600 afuera', () => {
    const r = repartoRefuerzoCorto(3000, 1.5);
    expect(r.gammaS).toBeCloseTo(0.8, 12);
    expect(r.franjaCentral).toBeCloseTo(2400, 8);
    expect(r.extremos).toBeCloseTo(600, 8);
  });
  it('As por flexión: φMn = Mu con a de despeje y mínimo C.7.12.2.1 (0.0018)', () => {
    const Mu = 500; // kN·m
    const r = asFlexionZapata({ Mu, b: 2750, d: 470, h: 553, fc: 21, fy: 420 });
    // φ Mn = 0.9 As fy (d − a/2) debe igualar Mu
    const phiMn = (0.9 * r.AsFlexion * 420 * (470 - r.a / 2)) / 1e6;
    expect(phiMn).toBeCloseTo(Mu, 4);
    expect(r.AsMin).toBeCloseTo(0.0018 * 2750 * 553, 6);
    expect(r.As).toBeCloseTo(Math.max(r.AsFlexion, r.AsMin), 8);
    expect(r.controladaPorTraccion).toBe(true);
  });
  it('si el mínimo gobierna se devuelve ρ·b·h', () => {
    const r = asFlexionZapata({ Mu: 10, b: 1000, d: 300, h: 380, fc: 21, fy: 420 });
    expect(r.As).toBeCloseTo(0.0018 * 1000 * 380, 6);
  });
  it('momento excesivo lanza error', () => {
    expect(() => asFlexionZapata({ Mu: 5000, b: 1000, d: 200, h: 280, fc: 21, fy: 420 })).toThrow(RangeError);
  });
});

describe('C.15.5 — cortante (C.11.11)', () => {
  const qu = Pu / 2.75 ** 2;
  const v = 1.175;

  it('φVc una dirección = 0.75·0.17·√21·b·d (kN) con b = 2.75 m, d = 470 mm', () => {
    const esperado = (0.75 * 0.17 * Math.sqrt(21) * 2750 * 470) / 1000;
    expect(phiVcUnaDireccion({ fc: 21, ancho: 2.75, d: 470 })).toBeCloseTo(esperado, 8);
    expect(esperado).toBeCloseTo(755.2, 0);
  });

  it('Vu una dirección = qu B (v − d) con d = 0.47 m → 264.46·2.75·0.705 = 512.7 kN', () => {
    expect(cortanteUnaDireccion({ qu, ancho: 2.75, voladizo: v, d: 470 })).toBeCloseTo(qu * 2.75 * 0.705, 8);
  });

  it('d mínimo una dirección = qu v / (φ0.17√f′c + qu/1000) = 366.1 mm y en ese d Vu = φVc', () => {
    const d = dMinimoUnaDireccion({ qu, voladizo: v, fc: 21 });
    expect(d).toBeCloseTo(366.1, 0);
    expect(cortanteUnaDireccion({ qu, ancho: 2.75, voladizo: v, d })).toBeCloseTo(phiVcUnaDireccion({ fc: 21, ancho: 2.75, d }), 6);
  });

  it('dos direcciones a mano con d = 470: bo = 4(400+470) = 3480; gobierna C.11-33; φVc = 0.75·0.33·√21·3480·470/1000', () => {
    const r = cortanteDosDireccionesZapata({ Pu, B: 2.75, L: 2.75, c1: 400, c2: 400, d: 470, fc: 21 });
    const phiVc = (0.75 * 0.33 * Math.sqrt(21) * 3480 * 470) / 1000;
    const Vu = Pu - qu * 0.87 * 0.87;
    expect(r.bo).toBe(3480);
    expect(r.gobierna).toBe('C.11-33');
    expect(r.phiVc).toBeCloseTo(phiVc, 6);
    expect(r.Vu).toBeCloseTo(Vu, 6);
    expect(r.cumple).toBe(true);
    expect(phiVc).toBeCloseTo(1855.1, 0);
    expect(Vu).toBeCloseTo(1799.8, 0);
  });

  it('d mínimo dos direcciones ≈ 461 mm: cumple en d, no cumple 5 mm antes', () => {
    const d = dMinimoDosDirecciones({ Pu, B: 2.75, L: 2.75, c1: 400, c2: 400, fc: 21 });
    expect(d).toBeGreaterThan(455);
    expect(d).toBeLessThan(466);
    expect(cortanteDosDireccionesZapata({ Pu, B: 2.75, L: 2.75, c1: 400, c2: 400, d: d + 0.01, fc: 21 }).cumple).toBe(true);
    expect(cortanteDosDireccionesZapata({ Pu, B: 2.75, L: 2.75, c1: 400, c2: 400, d: d - 5, fc: 21 }).cumple).toBe(false);
  });

  it('pilotes: fracción de la reacción que produce cortante (interpolación)', () => {
    expect(fraccionReaccionPilote(0.3, 0.4)).toBe(1);
    expect(fraccionReaccionPilote(-0.2, 0.4)).toBe(0);
    expect(fraccionReaccionPilote(0, 0.4)).toBeCloseTo(0.5, 12);
    expect(fraccionReaccionPilote(0.1, 0.4)).toBeCloseTo(0.75, 12);
  });
});

describe('Zapata completa', () => {
  const r = disenarZapataCuadrada({ Pservicio: P, Pu, qaNeta: qa, c: 400, fc: 21, fy: 420 });

  it('lado B = 2.75 m (2.7386 redondeado a 0.05) y qu = 264.46 kPa', () => {
    expect(r.Bcalculado).toBeCloseTo(2.73861, 5);
    expect(r.B).toBeCloseTo(2.75, 12);
    expect(r.qu).toBeCloseTo(264.4628, 3);
    expect(r.quServicio).toBeCloseTo(1500 / 7.5625, 8);
    expect(r.quServicio).toBeLessThanOrEqual(qa);
  });

  it('gobierna el punzonamiento: d requerido ≈ 461 mm, adoptado 470 mm, h = 470 + 83 = 553 mm', () => {
    expect(r.dDosDirecciones).toBeGreaterThan(r.dUnaDireccion);
    expect(r.dRequerido).toBeCloseTo(r.dDosDirecciones, 8);
    expect(r.d).toBe(470);
    expect(r.h).toBe(553);
    expect(r.cortanteUna.cumple).toBe(true);
    expect(r.cortanteDos.cumple).toBe(true);
  });

  it('Mu y As', () => {
    expect(r.Mu).toBeCloseTo((r.qu * 2.75 * 1.175 ** 2) / 2, 8);
    expect(r.flexion.As).toBeGreaterThanOrEqual(r.flexion.AsFlexion);
    expect(r.flexion.epsilonT).toBeGreaterThan(0.005);
  });

  it('una zapata más pequeña que la columna lanza error', () => {
    expect(() => disenarZapataCuadrada({ Pservicio: 100, Pu: 140, qaNeta: 1000, c: 600, fc: 21, fy: 420 })).toThrow(RangeError);
  });

  it('con d ≥ 150 mm incluso para cargas pequeñas (C.15.7)', () => {
    const p = disenarZapataCuadrada({ Pservicio: 100, Pu: 140, qaNeta: 200, c: 300, fc: 21, fy: 420 });
    expect(p.d).toBeGreaterThanOrEqual(150);
  });
});

describe('C.15.8 — aplastamiento y dowels', () => {
  it('φBn columna = 0.65·0.85·21·400²/1000 = 1856.4 kN', () => {
    expect(resistenciaAplastamiento(21, 160000).phiBn).toBeCloseTo(0.65 * 0.85 * 21 * 160000 / 1000, 8);
    expect(resistenciaAplastamiento(21, 160000).phiBn).toBeCloseTo(1856.4, 1);
  });
  it('factor √(A2/A1) máximo 2: A2/A1 = 9 → 2; A2/A1 = 2.25 → 1.5', () => {
    expect(resistenciaAplastamiento(21, 100, 900).factor).toBe(2);
    expect(resistenciaAplastamiento(21, 100, 225).factor).toBeCloseTo(1.5, 12);
  });
  it('A2: h = 553, B = 2750, c = 400 → Δ = min(1106, 1175) = 1106 → A2 = 2612² mm²', () => {
    expect(areaA2Zapata({ c1: 400, c2: 400, h: 553, B: 2750, L: 2750 })).toBeCloseTo(2612 * 2612, 6);
    // zapata angosta: limitado por (B − c)/2
    expect(areaA2Zapata({ c1: 400, c2: 400, h: 553, B: 1000, L: 1000 })).toBeCloseTo(1000 * 1000, 6);
  });
  it('interfaz con Pu = 2000: gobierna la columna (1856.4); exceso 143.6 kN; As por exceso 526 mm² < mínimo 800 mm²', () => {
    const r = interfazColumnaZapata({ Pu, c1: 400, c2: 400, h: 553, B: 2750, L: 2750, fcColumna: 21, fcZapata: 21, fy: 420 });
    expect(r.phiBnColumna).toBeCloseTo(1856.4, 1);
    expect(r.factorZapata).toBe(2);
    expect(r.phiBnZapata).toBeCloseTo(2 * 1856.4, 1);
    expect(r.phiBn).toBeCloseTo(1856.4, 1);
    expect(r.cumpleAplastamiento).toBe(false);
    expect(r.exceso).toBeCloseTo(2000 - 1856.4, 1);
    expect(r.AsPorExceso).toBeCloseTo((r.exceso * 1000) / (0.65 * 420), 6);
    expect(r.AsPorExceso).toBeCloseTo(526, -1);
    expect(r.AsMinimo).toBeCloseTo(800, 8);
    expect(r.As).toBeCloseTo(800, 8);
  });
  it('con carga baja solo rige el mínimo 0.005 Ag', () => {
    const r = interfazColumnaZapata({ Pu: 1000, c1: 400, c2: 400, h: 553, B: 2750, L: 2750, fcColumna: 21, fcZapata: 21, fy: 420 });
    expect(r.cumpleAplastamiento).toBe(true);
    expect(r.exceso).toBe(0);
    expect(r.As).toBeCloseTo(800, 8);
  });
});

describe('C.15.11 y C.15.13', () => {
  const Ag = (Math.PI * 400 * 400) / 4; // pilote Ø400
  it('C.15-2 y C.15-3: capacidades 0.25 f′c Ag y 0.35 f′c Ag para f′c = 21 MPa', () => {
    const r = verificarEsfuerzosPilote({ D: 300, L: 150 }, 21, Ag);
    expect(r[0].limite).toBeCloseTo((0.25 * 21 * Ag) / 1000, 8);
    expect(r[0].demanda).toBe(450);
    expect(r[1].demanda).toBeCloseTo(1.2 * 300 + 1.6 * 150, 8);
    expect(r[1].limite).toBeCloseTo((0.35 * 21 * Ag) / 1000, 8);
    expect(r).toHaveLength(2);
  });
  it('con sismo se agregan C.15-4 (0.33) y C.15-5 (0.35)', () => {
    const r = verificarEsfuerzosPilote({ D: 300, L: 150, E: 200 }, 21, Ag);
    expect(r).toHaveLength(4);
    expect(r[2].demanda).toBeCloseTo(300 + 150 + 0.7 * 200, 8);
    expect(r[2].limite).toBeCloseTo((0.33 * 21 * Ag) / 1000, 8);
    expect(r[3].demanda).toBeCloseTo(1.2 * 300 + 150 + 200, 8);
  });
  it('C.15-6: −D + E = −300 + 500 = 200 kN → Ast = 200000/(0.9·420) = 529 mm²; sin tracción → 0', () => {
    expect(astTraccionPilote(300, 500, 420)).toBeCloseTo(529.1, 1);
    expect(astTraccionPilote(300, 200, 420)).toBe(0);
  });
  it('Tabla C.15.11-1: Ø400 DMI → 0.0025 Ag y longitud máx(L/3, 4 m); DES → 0.005 Ag y máx(L/2, 6 m)', () => {
    const a = armaduraMinimaPilote('DMI', 9, Ag);
    expect(a.asMin).toBeCloseTo(0.0025 * Ag, 8);
    expect(a.longitudArmada).toBeCloseTo(4, 12); // 9/3 = 3 < 4
    const b = armaduraMinimaPilote('DMO-DES', 20, Ag);
    expect(b.asMin).toBeCloseTo(0.005 * Ag, 8);
    expect(b.longitudArmada).toBeCloseTo(10, 12);
    expect(armaduraMinimaPilote('DMO-DES', 8, Ag).longitudArmada).toBe(6);
  });
  it('viga de amarre: luz 6 m → ≥ 300 mm (DES), 200 (DMO), 150 (DMI); estribos mín(½ b, 300)', () => {
    expect(dimensionMinimaVigaAmarre(6000, 'DES')).toBe(300);
    expect(dimensionMinimaVigaAmarre(6000, 'DMO')).toBe(200);
    expect(dimensionMinimaVigaAmarre(6000, 'DMI')).toBe(150);
    expect(separacionMaximaEstribosAmarre(500)).toBe(250);
    expect(separacionMaximaEstribosAmarre(800)).toBe(300);
  });
});
