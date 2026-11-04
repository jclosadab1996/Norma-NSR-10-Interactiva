import { describe, expect, it } from 'vitest';
import {
  anchoDistribucionAlaTraccion,
  areaCircularEquivalente,
  asMinimo,
  asMinimoAlaTraccion,
  barrasMinimasColumna,
  cargaCritica,
  clasificarSeccion,
  cParaCarga,
  cuantiaEspiralMinima,
  deltaSDesdeCargas,
  deltaSDesdeQ,
  disenarFlexion,
  ecParaEsbeltez,
  epsilonLimiteCompresion,
  esVigaGranAltura,
  espesorMinimoConfinamiento,
  estadoEnC,
  exentoDeAsMinimo,
  FC_CAMBIO_ASMIN,
  factorCm,
  fcEfectivoNudo,
  flexionViga,
  fsServicioPermitido,
  indiceEstabilidadQ,
  inerciaBruta,
  limiteEsbeltez,
  limitesRefuerzoColumna,
  magnificarSinDesplazamiento,
  momentoConDesplazamiento,
  momentoMinimoM2,
  phiPorDeformacion,
  pisoArriostrado,
  puedeIgnorarEsbeltez,
  radioGiro,
  radioGiroCompuesto,
  relacionInerciaColumnaC108,
  relacionInerciaVigaC109,
  requiereRefuerzoSuperficial,
  requiereTransmisionEspecial,
  resistenciaAplastamiento,
  rigidezEI,
  rigidezEICompuesto,
  rigidezEIDesdeI,
  separacionMaximaApoyosLaterales,
  separacionMaximaFisuracion,
  seccionDeViga,
  vigaSimplementeArmada,
} from './flexionConcreto';

describe('φ por deformación (C.9.3.2) y clasificación de la sección (C.10.3)', () => {
  it('límite de compresión: 0.002 para Grado 420 (C.10.3.3) y fy/Es para otros', () => {
    expect(epsilonLimiteCompresion(420)).toBe(0.002);
    expect(epsilonLimiteCompresion(500)).toBeCloseTo(0.0025, 10);
    expect(epsilonLimiteCompresion(280)).toBeCloseTo(0.0014, 10);
  });
  it('φ = 0.65 / 0.90 en los extremos y lineal entre 0.002 y 0.005', () => {
    expect(phiPorDeformacion(0.001, 420)).toBe(0.65);
    expect(phiPorDeformacion(0.002, 420)).toBe(0.65);
    expect(phiPorDeformacion(0.005, 420)).toBe(0.9);
    expect(phiPorDeformacion(0.01, 420)).toBe(0.9);
    expect(phiPorDeformacion(0.0035, 420)).toBeCloseTo(0.65 + 0.25 * 0.5, 12);
  });
  it('con espiral φ de compresión es 0.75', () => {
    expect(phiPorDeformacion(0.001, 420, true)).toBe(0.75);
    expect(phiPorDeformacion(0.0035, 420, true)).toBeCloseTo(0.75 + 0.15 * 0.5, 12);
  });
  it('clasifica compresión / transición / tracción', () => {
    expect(clasificarSeccion(0.0015, 420)).toBe('compresion');
    expect(clasificarSeccion(0.004, 420)).toBe('transicion');
    expect(clasificarSeccion(0.005, 420)).toBe('traccion');
  });
});

describe('Equilibrio de la sección rectangular (C.10.2) — verificación a mano', () => {
  // Viga 300×500, d = 440, f′c = 28, fy = 420, As = 3 No. 8 = 1530 mm².
  const e = { b: 300, h: 500, d: 440, fc: 28, fy: 420, As: 1530 };
  it('a = As fy/(0.85 f′c b) = 90.0 mm; c = a/β1 = 105.88 mm; εt = 0.003 (d − c)/c = 0.009467', () => {
    const r = flexionViga(e)!;
    expect(r.a).toBeCloseTo(90, 6);
    expect(r.c).toBeCloseTo(90 / 0.85, 6);
    expect(r.epsT).toBeCloseTo((0.003 * (440 - 90 / 0.85)) / (90 / 0.85), 8);
    expect(r.epsT).toBeCloseTo(0.009467, 6);
    expect(r.clase).toBe('traccion');
    expect(r.phi).toBe(0.9);
  });
  it('Mn = As fy (d − a/2) = 253.83 kN·m; φMn = 228.44 kN·m', () => {
    const r = flexionViga(e)!;
    expect(r.Mn).toBeCloseTo((1530 * 420 * (440 - 45)) / 1e6, 5);
    expect(r.Mn).toBeCloseTo(253.827, 3);
    expect(r.phiMn).toBeCloseTo(228.4443, 3);
  });
  it('la solución cerrada y el equilibrio general coinciden', () => {
    const cerrada = vigaSimplementeArmada(e.b, e.d, e.fc, e.fy, e.As);
    const gen = flexionViga(e)!;
    expect(gen.Mn).toBeCloseTo(cerrada.Mn, 4);
    expect(gen.c).toBeCloseTo(cerrada.c, 4);
  });
  it('el equilibrio de fuerzas se cumple: N = 0 en el c hallado', () => {
    const sec = seccionDeViga(e);
    const c = cParaCarga(sec, 0)!;
    expect(Math.abs(estadoEnC(sec, c).Pn)).toBeLessThan(1e-6);
  });
  it('f′c = 42 MPa: β1 = 0.75 (C.10.2.7.3)', () => {
    const r = flexionViga({ ...e, fc: 42 })!;
    expect(r.beta1).toBeCloseTo(0.75, 12);
    expect(r.c).toBeCloseTo((1530 * 420) / (0.85 * 42 * 300) / 0.75, 6);
  });
  it('sección con mucho acero: controlada por compresión, φ = 0.65 y εt < 0.004', () => {
    const r = flexionViga({ b: 300, h: 500, d: 440, fc: 28, fy: 420, As: 6120 })!;
    expect(r.epsT).toBeLessThan(0.002);
    expect(r.phi).toBe(0.65);
    expect(r.cumpleEpsMin).toBe(false);
  });
  it('doblemente armada: referencia a mano (c = 165 mm, εt = 0.005, Mn = 500 kN·m)', () => {
    const r = flexionViga({ b: 300, h: 500, d: 440, fc: 28, fy: 420, As: 3196.3598, Aprime: 952.7061, dPrime: 60 })!;
    expect(r.c).toBeCloseTo(165, 2);
    expect(r.epsT).toBeCloseTo(0.005, 6);
    expect(r.fsPrime).toBeCloseTo((200000 * 0.003 * (165 - 60)) / 165, 3);
    expect(r.Mn).toBeCloseTo(500, 2);
  });
  it('entradas inválidas devuelven null', () => {
    expect(flexionViga({ ...e, As: 0 })).toBeNull();
  });
});

describe('Diseño de As para un Mu dado (autoría del proyecto)', () => {
  it('simplemente armada: φMn = Mu = 300 kN·m con εt ≥ 0.005 (As ≈ 2098 mm²)', () => {
    const d = disenarFlexion(300, 300, 440, 28, 420, 60, 500)!;
    expect(d.doble).toBe(false);
    expect(d.phiMn).toBeCloseTo(300, 4);
    expect(d.As).toBeCloseTo(2097.97, 1);
    expect(d.epsT).toBeGreaterThanOrEqual(0.005);
    expect(d.cumpleAsmin).toBe(true);
    const a = 440 - Math.sqrt(440 ** 2 - (2 * 300e6) / (0.9 * 0.85 * 28 * 300));
    expect(d.a).toBeCloseTo(a, 6);
  });
  it('doblemente armada para Mu = 450 kN·m: εt = 0.005, A′s ≈ 953 mm², As ≈ 3196 mm²', () => {
    const d = disenarFlexion(450, 300, 440, 28, 420, 60, 500)!;
    expect(d.doble).toBe(true);
    expect(d.epsT).toBeCloseTo(0.005, 6);
    expect(d.phiMn).toBeCloseTo(450, 3);
    expect(d.Aprime).toBeCloseTo(952.71, 1);
    expect(d.As).toBeCloseTo(3196.36, 1);
  });
  it('sin d′ válido no inventa solución', () => {
    expect(disenarFlexion(450, 300, 440, 28, 420, 0, 500)).toBeNull();
  });
});

describe('Refuerzo mínimo y fisuración (C.10.5, C.10.6)', () => {
  it('Ec. C.10-3: gobierna 1.4/fy para f′c = 28 y 0.25√f′c/fy para f′c = 42', () => {
    expect(asMinimo(28, 420, 300, 440)).toBeCloseTo((1.4 * 300 * 440) / 420, 9);
    expect(asMinimo(28, 420, 300, 440)).toBeCloseTo(440, 9);
    expect(asMinimo(42, 420, 300, 440)).toBeCloseTo(((0.25 * Math.sqrt(42)) / 420) * 300 * 440, 9);
    expect(asMinimo(42, 420, 300, 440)).toBeCloseTo(509.2, 1);
    expect(FC_CAMBIO_ASMIN).toBeCloseTo(31.36, 10);
  });
  it('C.10.5.2: ala en tracción usa min(2bw, bf)', () => {
    expect(asMinimoAlaTraccion(28, 420, 300, 500, 440)).toBeCloseTo((1.4 * 500 * 440) / 420, 9);
    expect(asMinimoAlaTraccion(28, 420, 300, 900, 440)).toBeCloseTo((1.4 * 600 * 440) / 420, 9);
  });
  it('C.10.5.3: exento si As ≥ 4/3 del requerido', () => {
    expect(exentoDeAsMinimo(1400, 1050)).toBe(true);
    expect(exentoDeAsMinimo(1399, 1050)).toBe(false);
  });
  it('Ec. C.10-4: s = 380(280/fs) − 2.5cc, máximo 300(280/fs)', () => {
    expect(fsServicioPermitido(420)).toBe(280);
    expect(separacionMaximaFisuracion(280, 50)).toBe(255);
    expect(separacionMaximaFisuracion(280, 30)).toBe(300);
    expect(separacionMaximaFisuracion(200, 50)).toBeCloseTo(380 * 1.4 - 125, 9);
    expect(separacionMaximaFisuracion(200, 20)).toBeCloseTo(420, 9);
  });
  it('C.10.4.1, C.10.6.6, C.10.6.7, C.10.7.1', () => {
    expect(separacionMaximaApoyosLaterales(250)).toBe(12500);
    expect(anchoDistribucionAlaTraccion(2400, 6000)).toBe(600);
    expect(anchoDistribucionAlaTraccion(500, 6000)).toBe(500);
    expect(requiereRefuerzoSuperficial(900)).toBe(false);
    expect(requiereRefuerzoSuperficial(901)).toBe(true);
    expect(esVigaGranAltura(2000, 500)).toBe(true);
    expect(esVigaGranAltura(2001, 500)).toBe(false);
    expect(esVigaGranAltura(5000, 500, true)).toBe(true);
  });
});

describe('Columnas: límites del refuerzo (C.10.9)', () => {
  it('1 % a 4 % de Ag y número mínimo de barras', () => {
    const l = limitesRefuerzoColumna(160000);
    expect(l.min).toBe(1600);
    expect(l.max).toBe(6400);
    expect(barrasMinimasColumna('estribos-rectangulares-o-circulares')).toBe(4);
    expect(barrasMinimasColumna('estribos-triangulares')).toBe(3);
    expect(barrasMinimasColumna('espiral')).toBe(6);
  });
  it('Ec. C.10-5: ρs = 0.45 (Ag/Ach − 1) f′c/fyt, con fyt ≤ 700', () => {
    const Ag = (Math.PI * 500 ** 2) / 4;
    const Ach = (Math.PI * 400 ** 2) / 4;
    expect(cuantiaEspiralMinima(Ag, Ach, 28, 420)).toBeCloseTo(0.45 * (1.5625 - 1) * (28 / 420), 10);
    expect(cuantiaEspiralMinima(Ag, Ach, 28, 420)).toBeCloseTo(0.016875, 6);
    expect(cuantiaEspiralMinima(Ag, Ach, 28, 800)).toBeCloseTo(0.45 * 0.5625 * (28 / 700), 10);
  });
  it('C.10.8.3: sección circular equivalente', () => {
    expect(areaCircularEquivalente(400)).toBeCloseTo(125663.7, 1);
  });
});

describe('Esbeltez (C.10.10)', () => {
  it('radio de giro 0.3 h o 0.25 D', () => {
    expect(radioGiro(400)).toBeCloseTo(120, 10);
    expect(radioGiro(400, true)).toBeCloseTo(100, 10);
  });
  it('límites 22 (no arriostrada) y 34 − 12 M1/M2 ≤ 40 (arriostrada)', () => {
    expect(limiteEsbeltez(false, 0.5)).toBe(22);
    expect(limiteEsbeltez(true, 0.5)).toBeCloseTo(28, 10);
    expect(limiteEsbeltez(true, 1)).toBeCloseTo(22, 10);
    expect(limiteEsbeltez(true, -0.5)).toBeCloseTo(40, 10);
    expect(limiteEsbeltez(true, -1)).toBe(40);
    expect(puedeIgnorarEsbeltez(21.9, false)).toBe(true);
    expect(puedeIgnorarEsbeltez(22.1, false)).toBe(false);
  });
  it('inercia de la Ec. C.10-8 con sus topes 0.875 y 0.35', () => {
    const r = relacionInerciaColumnaC108(3096, 160000, 120, 1500, 400, 5034.6352);
    const esperado = (0.8 + 25 * (3096 / 160000)) * (1 - 120e6 / (1500e3 * 400) - 0.5 * (1500 / 5034.6352));
    expect(r).toBeCloseTo(esperado, 10);
    expect(r).toBeCloseTo(0.8358, 3);
    expect(relacionInerciaColumnaC108(3096, 160000, 0, 100, 400, 5034.6352)).toBe(0.875);
    expect(relacionInerciaColumnaC108(3096, 160000, 800, 3000, 400, 5034.6352)).toBe(0.35);
  });
  it('inercia de la Ec. C.10-9 para vigas', () => {
    const r = relacionInerciaVigaC109(0.01, 300, 440);
    expect(r).toBeCloseTo(0.35 * (1.2 - 0.2 * (300 / 440)), 10);
    expect(r).toBeCloseTo(0.3723, 3);
    expect(relacionInerciaVigaC109(0.05, 300, 440)).toBe(0.5);
  });
  it('EI de C.10-15 y C.10-14, Pc de C.10-13', () => {
    const Ec = ecParaEsbeltez(28);
    const Ig = inerciaBruta(400, 400);
    expect(Ig).toBeCloseTo(2.1333e9, -5);
    const EI = rigidezEI(Ec, Ig, 0.6);
    expect(EI).toBeCloseTo((0.4 * Ec * Ig) / 1.6, 3);
    expect(rigidezEI(Ec, Ig, 2)).toBeCloseTo((0.4 * Ec * Ig) / 2, 3);
    expect(rigidezEI(Ec, Ig, 0.6, 1e12)).toBeCloseTo((0.2 * Ec * Ig + 1e12) / 1.6, 3);
    expect(rigidezEIDesdeI(Ec, 0.8 * Ig, 0)).toBeCloseTo(Ec * 0.8 * Ig, 3);
    expect(cargaCritica(EI, 1, 5000)).toBeCloseTo((Math.PI ** 2 * EI) / 5000 ** 2 / 1000, 6);
    expect(cargaCritica(EI, 1, 5000)).toBeCloseTo(5236.4, 1);
  });
  it('Cm (C.10-16) y M2,min (C.10-17)', () => {
    expect(factorCm(0.6)).toBeCloseTo(0.84, 12);
    expect(factorCm(-1)).toBeCloseTo(0.2, 12);
    expect(factorCm(0.6, true)).toBe(1);
    expect(momentoMinimoM2(1500, 400)).toBeCloseTo((1500 * (15 + 12)) / 1000, 12);
  });
  it('momentos magnificados sin desplazamiento (400×400, ℓu = 5 m, Pu = 1500 kN, M1 = 60, M2 = 100)', () => {
    const EI = rigidezEI(ecParaEsbeltez(28), inerciaBruta(400, 400), 0.6);
    const r = magnificarSinDesplazamiento({ Pu: 1500, M1: 60, M2: 100, lu: 5000, h: 400, EI });
    expect(r.M1M2).toBeCloseTo(0.6, 12);
    expect(r.Cm).toBeCloseTo(0.84, 12);
    expect(r.Pc).toBeCloseTo(5236.43, 1);
    expect(r.delta).toBeCloseTo(0.84 / (1 - 1500 / (0.75 * r.Pc)), 10);
    expect(r.delta).toBeCloseTo(1.359, 3);
    expect(r.Mc).toBeCloseTo(135.91, 1);
    expect(r.usaM2min).toBe(false);
    expect(r.excede14).toBe(false);
    expect(r.inestable).toBe(false);
  });
  it('si M2,min excede a M2 se usa Cm = 1.0 y M2 = M2,min', () => {
    const EI = rigidezEI(ecParaEsbeltez(28), inerciaBruta(400, 400), 0.6);
    const r = magnificarSinDesplazamiento({ Pu: 1500, M1: 5, M2: 10, lu: 5000, h: 400, EI });
    expect(r.usaM2min).toBe(true);
    expect(r.M2usado).toBeCloseTo(40.5, 10);
    expect(r.Cm).toBe(1);
  });
  it('detecta inestabilidad (Pu ≥ 0.75 Pc) y amplificación mayor de 1.4', () => {
    const EI = rigidezEI(ecParaEsbeltez(28), inerciaBruta(400, 400), 0.6);
    const inest = magnificarSinDesplazamiento({ Pu: 4000, M1: 60, M2: 100, lu: 5000, h: 400, EI });
    expect(inest.inestable).toBe(true);
    expect(inest.delta).toBe(Infinity);
    const alto = magnificarSinDesplazamiento({ Pu: 2000, M1: 100, M2: 100, lu: 5000, h: 400, EI });
    expect(alto.excede14).toBe(true);
  });
  it('estructuras desplazables: Q, δs (C.10-20, C.10-21) y M = Mns + δs Ms', () => {
    const Q = indiceEstabilidadQ(10000, 12, 500, 3500);
    expect(Q).toBeCloseTo((10000 * 12) / (500 * 3500), 12);
    expect(Q).toBeCloseTo(0.0686, 4);
    expect(pisoArriostrado(Q)).toBe(false);
    expect(pisoArriostrado(0.05)).toBe(true);
    const d = deltaSDesdeQ(Q);
    expect(d.delta).toBeCloseTo(1 / (1 - Q), 12);
    expect(d.excede15).toBe(false);
    expect(deltaSDesdeQ(0.4).excede15).toBe(true);
    expect(deltaSDesdeCargas(10000, 40000)).toBeCloseTo(1.5, 12);
    expect(deltaSDesdeCargas(0, 40000)).toBe(1);
    expect(momentoConDesplazamiento(30, 50, 1.2)).toBeCloseTo(90, 12);
  });
});

describe('Transmisión columna–losa, compuestos y aplastamiento (C.10.12–C.10.14)', () => {
  it('C.10.12: cuándo aplica', () => {
    expect(requiereTransmisionEspecial('interior', 56, 28)).toBe(true);
    expect(requiereTransmisionEspecial('interior', 39, 28)).toBe(false);
    expect(requiereTransmisionEspecial('esquinera', 34, 28)).toBe(true);
    expect(requiereTransmisionEspecial('esquinera', 33, 28)).toBe(false);
  });
  it('Ecs. C.10-22 a C.10-24', () => {
    expect(fcEfectivoNudo('interior', 56, 28, 200, 500)).toBeCloseTo(49.7, 10);
    expect(fcEfectivoNudo('interior', 56, 28, 100, 600)).toBeCloseTo(51.8, 10);
    expect(fcEfectivoNudo('borde', 56, 28)).toBeCloseTo(39.2, 10);
    expect(fcEfectivoNudo('esquinera', 56, 28)).toBeCloseTo(33.6, 10);
    expect(fcEfectivoNudo('borde', 35, 28)).toBe(35);
  });
  it('C.10.13: r, EI y espesores mínimos del acero de confinamiento', () => {
    const Ec = 24870;
    const Es = 200000;
    expect(radioGiroCompuesto(Ec, 1000, 100, Es, 10, 1)).toBeCloseTo(Math.sqrt((Ec * 200 + Es * 10) / (Ec * 20 + Es * 1)), 9);
    expect(rigidezEICompuesto(Ec, 1000, Es, 10, 0.5)).toBeCloseTo((Ec * 200) / 1.5 + Es * 10, 6);
    expect(espesorMinimoConfinamiento(300, 250)).toBeCloseTo(300 * Math.sqrt(250 / 600000), 9);
    expect(espesorMinimoConfinamiento(300, 250)).toBeCloseTo(6.124, 3);
    expect(espesorMinimoConfinamiento(300, 250, true)).toBeCloseTo(3.75, 3);
  });
  it('C.10.14.1: aplastamiento φ(0.85 f′c A1) × √(A2/A1) ≤ 2', () => {
    expect(resistenciaAplastamiento(28, 100000).phiBn).toBeCloseTo(1547, 6);
    expect(resistenciaAplastamiento(28, 100000, 225000).factor).toBeCloseTo(1.5, 12);
    expect(resistenciaAplastamiento(28, 100000, 400000).factor).toBe(2);
    expect(resistenciaAplastamiento(28, 100000, 1_000_000).phiBn).toBeCloseTo(3094, 6);
  });
});
