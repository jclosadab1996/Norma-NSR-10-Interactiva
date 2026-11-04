import { describe, expect, it } from 'vitest';
import {
  alfaCMuro,
  anchoEfectivoNudo,
  areaEfectivaNudo,
  ashRequerido,
  avSobreS,
  bordePorDesplazamiento,
  bordePorEsfuerzo,
  clasificarVigaAcople,
  cortanteDisenoViga,
  cortanteJuntaDiafragma,
  cortanteNominalAcopleDiagonal,
  cortanteNominalDiafragma,
  cortanteNominalMuro,
  cortanteNudo,
  cuantiaVolumetricaEspiral,
  dimensionColumnaMinimaNudo,
  extensionElementoBorde,
  geometriaNucleo,
  limitesColector,
  longitudConfinamientoViga,
  longitudGanchoNudo,
  longitudLoColumna,
  longitudRectaConFueraDeNucleo,
  longitudRectaNudo,
  momentoProbable,
  relacionColumnaViga,
  separacionEstribosTraslapoViga,
  separacionEstribosViga,
  separacionFueraDeLo,
  separacionMaximaColumna,
  separacionPorAshProvisto,
  separacionSoDES,
  vcEsCeroViga,
  vnMaximoMachon,
  vnMaximoNudo,
  vuLimiteDosCapas,
  vuLimiteReduccionCuantia,
} from './sismoConcreto';

describe('Mpr y cortante de diseño Ve de vigas DES (C.21.5.4)', () => {
  it('Mpr con α = 1.25 fy y φ = 1: forma cerrada de la viga simplemente armada', () => {
    const r = momentoProbable({ b: 350, d: 540, fc: 28, fy: 420, As: 2040 });
    const T = 1.25 * 420 * 2040;
    const a = T / (0.85 * 28 * 350);
    expect(r.a).toBeCloseTo(a, 6);
    expect(r.Mpr).toBeCloseTo((T * (540 - a / 2)) / 1e6, 6);
    expect(r.Mpr).toBeCloseTo(509.48, 1);
    expect(r.fsTraccion).toBe(525);
  });

  it('Mpr es 1.25 veces mayor que el Mn con fy cuando el brazo cambia poco', () => {
    const mn = (() => {
      const a = (420 * 2040) / (0.85 * 28 * 350);
      return (420 * 2040 * (540 - a / 2)) / 1e6;
    })();
    const mpr = momentoProbable({ b: 350, d: 540, fc: 28, fy: 420, As: 2040 }).Mpr;
    expect(mpr / mn).toBeGreaterThan(1.2);
    expect(mpr / mn).toBeLessThan(1.25);
  });

  it('el refuerzo de compresión aumenta Mpr respecto a la sección simple', () => {
    const simple = momentoProbable({ b: 350, d: 540, fc: 28, fy: 420, As: 2040 });
    const doble = momentoProbable({ b: 350, d: 540, fc: 28, fy: 420, As: 2040, Aprime: 1020, dPrime: 60 });
    expect(doble.Mpr).toBeGreaterThan(simple.Mpr * 0.999);
    expect(doble.c).toBeLessThan(simple.c);
    expect(doble.fsCompresion).toBeGreaterThan(0);
    expect(doble.fsCompresion).toBeLessThanOrEqual(420);
  });

  it('Ve = (Mpr1 + Mpr2)/ln + wu ln/2', () => {
    const r = cortanteDisenoViga({ mprNegIzq: 509.5, mprPosIzq: 395, mprNegDer: 509.5, mprPosDer: 395, luzLibre: 5.6, wu: 45 });
    expect(r.vgravedad).toBeCloseTo(126, 6);
    expect(r.vsismoSentido1).toBeCloseTo((509.5 + 395) / 5.6, 6);
    expect(r.ve).toBeCloseTo(161.518 + 126, 2);
    expect(r.fraccionSismica).toBeGreaterThan(0.5);
  });

  it('Ve toma el sentido de giro más desfavorable cuando los extremos son distintos', () => {
    const r = cortanteDisenoViga({ mprNegIzq: 600, mprPosIzq: 300, mprNegDer: 400, mprPosDer: 200, luzLibre: 5, wu: 20 });
    expect(r.vsismoSentido1).toBeCloseTo(160, 6);
    expect(r.vsismoSentido2).toBeCloseTo(140, 6);
    expect(r.ve).toBeCloseTo(160 + 50, 6);
    expect(r.veDer).toBeCloseTo(140 + 50, 6);
  });

  it('Vc = 0 solo si el cortante sísmico es ≥ ½ Ve y Pu < Ag f′c/20', () => {
    expect(vcEsCeroViga(160, 280, 0, 210000, 28)).toBe(true);
    expect(vcEsCeroViga(100, 280, 0, 210000, 28)).toBe(false);
    // Ag f′c / 20 = 210000×28/20/1000 = 294 kN
    expect(vcEsCeroViga(160, 280, 300, 210000, 28)).toBe(false);
  });

  it('Av/s con Vc = 0: Vs = Ve/φ', () => {
    // Ve = 287.5, φ = 0.75 → Vs = 383.33 kN; Av/s = 383333/(420×540)
    expect(avSobreS(287.5, 0.75, 0, 420, 540)).toBeCloseTo(383333.33 / (420 * 540), 4);
  });

  it('separación de estribos de viga: menor de d/4, 8 db, 24 dbe y 300', () => {
    const r = separacionEstribosViga('DES', 540, 25.4, 9.5);
    expect(r.s).toBeCloseTo(135, 6);
    expect(r.gobierna).toBe('d/4');
    const r2 = separacionEstribosViga('DMO', 540, 12.7, 9.5);
    expect(r2.s).toBeCloseTo(101.6, 6); // 8 db
    expect(r2.gobierna).toBe('8 db longitudinal');
    expect(r.limites).toHaveLength(4);
  });

  it('longitud de confinamiento 2h y separación en traslapos', () => {
    expect(longitudConfinamientoViga(600)).toBe(1200);
    expect(separacionEstribosTraslapoViga(540)).toBe(100);
    expect(separacionEstribosTraslapoViga(320)).toBe(80);
  });
});

describe('Columna fuerte–viga débil (C.21-4)', () => {
  it('ΣMnc ≥ 1.2 ΣMnb', () => {
    const ok = relacionColumnaViga(1000, 800);
    expect(ok.relacion).toBeCloseTo(1.25, 6);
    expect(ok.sumMncMinimo).toBeCloseTo(960, 6);
    expect(ok.cumple).toBe(true);
    expect(relacionColumnaViga(900, 800).cumple).toBe(false);
    expect(relacionColumnaViga(960, 800).cumple).toBe(true);
  });
});

describe('Refuerzo de confinamiento de columnas (C.21.3.5 y C.21.6.4)', () => {
  const base = { s: 100, bc: 420, fc: 28, fyt: 420, Ag: 250000, Ach: 176400 };
  const k = 250000 / 176400 - 1;

  it('DES: Ec. C.21-7 y C.21-8, rige la mayor', () => {
    const r = ashRequerido('DES', base);
    expect(r.ashConAg).toBeCloseTo(0.3 * 2800 * k, 6);
    expect(r.ashMinimo).toBeCloseTo(0.09 * 2800, 6);
    expect(r.ash).toBeCloseTo(350.48, 1);
    expect(r.gobierna).toBe('Ag/Ach');
  });

  it('DMO: Ec. C.21-2 y C.21-3', () => {
    const r = ashRequerido('DMO', base);
    expect(r.ashConAg).toBeCloseTo(0.2 * 2800 * k, 6);
    expect(r.ashMinimo).toBeCloseTo(0.06 * 2800, 6);
    expect(r.ash).toBeCloseTo(233.65, 1);
  });

  it('con Ag/Ach pequeño rige la Ec. C.21-8 (mínimo)', () => {
    const r = ashRequerido('DES', { ...base, Ach: 235000 });
    // k = 250000/235000 − 1 = 0.0638; 0.3·k = 0.0191 < 0.09
    expect(r.gobierna).toBe('mínimo');
    expect(r.ash).toBeCloseTo(0.09 * 2800, 6);
  });

  it('Ash,req es proporcional a s y fyt se limita a 700 MPa', () => {
    const a = ashRequerido('DES', base).ash;
    expect(ashRequerido('DES', { ...base, s: 50 }).ash).toBeCloseTo(a / 2, 6);
    const alto = ashRequerido('DES', { ...base, fyt: 900 });
    expect(alto.fytUsado).toBe(700);
    expect(alto.ash).toBeCloseTo(ashRequerido('DES', { ...base, fyt: 700 }).ash, 6);
  });

  it('separación que iguala Ash provisto con Ash requerido', () => {
    const { s: _s, ...sin } = base;
    const sMax = separacionPorAshProvisto('DES', 387, sin); // 3 ramas de No.4 (129 mm²)
    expect(ashRequerido('DES', { ...base, s: sMax }).ash).toBeCloseTo(387, 6);
  });

  it('cuantía volumétrica: Ec. C.21-6 y C.10-5', () => {
    const des = cuantiaVolumetricaEspiral('DES', 28, 420, 250000, 176400);
    expect(des.rhoGrado).toBeCloseTo(0.12 * (28 / 420), 8);
    expect(des.rhoC105).toBeCloseTo(0.45 * k * (28 / 420), 8);
    expect(des.rhoS).toBeCloseTo(Math.max(des.rhoGrado, des.rhoC105), 10);
    const dmo = cuantiaVolumetricaEspiral('DMO', 28, 420, 250000, 176400);
    expect(dmo.rhoGrado).toBeCloseTo(0.08 * (28 / 420), 8);
  });

  it('so (Ec. C.21-5) = 100 + (350 − hx)/3 acotado entre 100 y 150', () => {
    expect(separacionSoDES(200)).toBe(150);
    expect(separacionSoDES(250)).toBeCloseTo(133.333, 3);
    expect(separacionSoDES(350)).toBe(100);
    expect(separacionSoDES(400)).toBe(100);
    expect(separacionSoDES(100)).toBe(150);
  });

  it('separación máxima en ℓo: DES (lado/4, 6 db, so) y DMO (8 db, 16 dbe, lado/3, 150)', () => {
    const des = separacionMaximaColumna('DES', { dimensionMenor: 500, dbLongMenor: 25.4, hx: 200 });
    expect(des.s).toBe(125);
    expect(des.gobierna).toBe('lado menor/4');
    const desPeque = separacionMaximaColumna('DES', { dimensionMenor: 600, dbLongMenor: 19.1, hx: 250 });
    expect(desPeque.s).toBeCloseTo(114.6, 1); // 6 db
    const dmo = separacionMaximaColumna('DMO', { dimensionMenor: 500, dbLongMenor: 25.4, dbEstribo: 9.5, hx: 200 });
    expect(dmo.s).toBe(150); // 16 dbe = 152, 8 db = 203.2, 500/3 = 166.7, 150
    expect(dmo.gobierna).toBe('150 mm');
  });

  it('ℓo: mayor de dimensión, luz libre/6 y 450 (DES) o 500 (DMO)', () => {
    expect(longitudLoColumna('DES', 500, 3000).lo).toBe(500);
    expect(longitudLoColumna('DES', 400, 3000).lo).toBe(500);
    expect(longitudLoColumna('DES', 400, 3000).gobierna).toBe('luz libre/6');
    expect(longitudLoColumna('DES', 400, 2400).lo).toBe(450);
    expect(longitudLoColumna('DMO', 400, 2400).lo).toBe(500);
    expect(longitudLoColumna('DES', 500, 4200).lo).toBe(700);
  });

  it('separación fuera de ℓo: DES min(6 db, 150); DMO 2 so', () => {
    expect(separacionFueraDeLo('DES', 25.4, 125)).toBeCloseTo(150, 6);
    expect(separacionFueraDeLo('DES', 19.1, 100)).toBeCloseTo(114.6, 6);
    expect(separacionFueraDeLo('DMO', 25.4, 100)).toBe(200);
  });

  it('geometría del núcleo: Ach y bc a los bordes externos del estribo', () => {
    const g = geometriaNucleo(500, 500, 40, 12.7);
    expect(g.Ach).toBe(420 * 420);
    expect(g.bcB).toBe(420);
    expect(g.ejeB).toBeCloseTo(407.3, 6);
  });
});

describe('Nudos viga–columna (C.21.7)', () => {
  it('Vn máximo: 1.7, 1.2 y 1.0 √f′c Aj', () => {
    const Aj = 500 * 500;
    expect(vnMaximoNudo(28, Aj, 'cuatro-caras')).toBeCloseTo((1.7 * Math.sqrt(28) * Aj) / 1000, 6);
    expect(vnMaximoNudo(28, Aj, 'tres-caras-o-dos-opuestas')).toBeCloseTo((1.2 * Math.sqrt(28) * Aj) / 1000, 6);
    expect(vnMaximoNudo(28, Aj, 'otros')).toBeCloseTo((Math.sqrt(28) * Aj) / 1000, 6);
    expect(vnMaximoNudo(28, Aj, 'otros', true)).toBeCloseTo(0.75 * vnMaximoNudo(28, Aj, 'otros'), 6);
    expect(vnMaximoNudo(28, Aj, 'cuatro-caras')).toBeCloseTo(2248.9, 1);
  });

  it('ancho efectivo y Aj', () => {
    expect(anchoEfectivoNudo(500, 500, 500, 0)).toBe(500);
    expect(anchoEfectivoNudo(600, 350, 600, 125)).toBe(250); // 2x = 250 < b+h = 950 < 600
    expect(anchoEfectivoNudo(600, 350, 600, 300)).toBe(600); // 2x = 600; b+h = 950; bc = 600
    expect(areaEfectivaNudo(500, 450)).toBe(225000);
  });

  it('cortante en el nudo T1 + T2 − Vcol con 1.25 fy', () => {
    // 1.25·420·(2040 + 1530)/1000 = 1874.25 kN
    expect(cortanteNudo(2040, 1530, 420, 200)).toBeCloseTo(1874.25 - 200, 6);
  });

  it('dimensión mínima de la columna: 20 db (26 db en liviano)', () => {
    expect(dimensionColumnaMinimaNudo(25.4)).toBeCloseTo(508, 6);
    expect(dimensionColumnaMinimaNudo(25.4, true)).toBeCloseTo(660.4, 6);
  });

  it('ℓdh (Ec. C.21-9) y barras rectas', () => {
    const r = longitudGanchoNudo(420, 25.4, 28);
    expect(r.requerida).toBeCloseTo((420 * 25.4) / (5.4 * Math.sqrt(28)), 6);
    expect(r.ldh).toBeCloseTo(373.35, 1);
    // barra pequeña: gobierna el mínimo 150 mm
    expect(longitudGanchoNudo(420, 9.5, 28).ldh).toBe(150);
    // 8 db > requerida
    expect(longitudGanchoNudo(420, 12.7, 60).ldh).toBe(150);
    // liviano: 1.25 × requerida, 10 db y 190 mm
    const l = longitudGanchoNudo(420, 25.4, 28, true);
    expect(l.ldh).toBeCloseTo(1.25 * l.requerida, 6);
    expect(longitudRectaNudo(373.35, 250)).toBeCloseTo(2.5 * 373.35, 6);
    expect(longitudRectaNudo(373.35, 350)).toBeCloseTo(3.25 * 373.35, 6);
    expect(longitudRectaConFueraDeNucleo(900, 100)).toBeCloseTo(960, 6);
  });
});

describe('Muros estructurales especiales (C.21.9)', () => {
  it('αc: 0.25 hasta 1.5, 0.17 desde 2.0 y lineal entre ambos', () => {
    expect(alfaCMuro(1)).toBe(0.25);
    expect(alfaCMuro(1.5)).toBe(0.25);
    expect(alfaCMuro(1.75)).toBeCloseTo(0.21, 10);
    expect(alfaCMuro(2)).toBe(0.17);
    expect(alfaCMuro(4)).toBe(0.17);
  });

  it('Ec. C.21-10: Vn = Acv (αc λ √f′c + ρt fy)', () => {
    const Acv = 300 * 6000;
    const r = cortanteNominalMuro({ Acv, fc: 28, rhoT: 0.0025, fy: 420, hwSobreLw: 4 });
    expect(r.alfaC).toBe(0.17);
    expect(r.vn).toBeCloseTo((Acv * (0.17 * Math.sqrt(28) + 0.0025 * 420)) / 1000, 6);
    expect(r.vn).toBeCloseTo(3509.2, 0);
    expect(r.vnTope).toBeCloseTo((0.66 * Acv * Math.sqrt(28)) / 1000, 6);
    expect(r.gobiernaTope).toBe(false);
    expect(r.vnDiseno).toBe(r.vn);
  });

  it('el tope 0.66 Acv √f′c gobierna con cuantías altas', () => {
    const r = cortanteNominalMuro({ Acv: 1.8e6, fc: 28, rhoT: 0.01, fy: 420, hwSobreLw: 1 });
    expect(r.gobiernaTope).toBe(true);
    expect(r.vnDiseno).toBe(r.vnTope);
  });

  it('el factor λ del concreto liviano reduce el término de concreto', () => {
    const n = cortanteNominalMuro({ Acv: 1e6, fc: 28, rhoT: 0.0025, fy: 420, hwSobreLw: 1, lambda: 1 });
    const l = cortanteNominalMuro({ Acv: 1e6, fc: 28, rhoT: 0.0025, fy: 420, hwSobreLw: 1, lambda: 0.75 });
    expect(n.vn - l.vn).toBeCloseTo((1e6 * 0.25 * 0.25 * Math.sqrt(28)) / 1000, 6);
  });

  it('límites de Vu: reducción de cuantía (0.083) y dos capas (0.17)', () => {
    const Acv = 1.8e6;
    expect(vuLimiteReduccionCuantia(Acv, 28)).toBeCloseTo((0.083 * Acv * Math.sqrt(28)) / 1000, 6);
    expect(vuLimiteDosCapas(Acv, 28)).toBeCloseTo((0.17 * Acv * Math.sqrt(28)) / 1000, 6);
    expect(vuLimiteDosCapas(Acv, 28)).toBeCloseTo(1619.1, 0);
    expect(vnMaximoMachon(Acv, 28)).toBeCloseTo((0.83 * Acv * Math.sqrt(28)) / 1000, 6);
  });

  it('Ec. C.21-11: c ≥ ℓw / (600 δu/hw), con δu/hw ≥ 0.007 (0.0035 en DMO)', () => {
    const r = bordePorDesplazamiento(1450, 6000, 0.01);
    expect(r.cLimite).toBeCloseTo(1000, 6);
    expect(r.requiere).toBe(true);
    // deriva menor que 0.007 → se usa 0.007
    const r2 = bordePorDesplazamiento(1200, 6000, 0.004);
    expect(r2.derivaUsada).toBe(0.007);
    expect(r2.cLimite).toBeCloseTo(6000 / (600 * 0.007), 6);
    expect(r2.requiere).toBe(false);
    const dmo = bordePorDesplazamiento(1200, 6000, 0.002, 'DMO');
    expect(dmo.derivaUsada).toBe(0.0035);
  });

  it('bordes por esfuerzo: 0.2/0.15 f′c (DES) y 0.3/0.22 f′c (DMO)', () => {
    const des = bordePorEsfuerzo(7, 28);
    expect(des.limiteInicio).toBeCloseTo(5.6, 6);
    expect(des.limiteFin).toBeCloseTo(4.2, 6);
    expect(des.requiere).toBe(true);
    const dmo = bordePorEsfuerzo(7, 28, 'DMO');
    expect(dmo.limiteInicio).toBeCloseTo(8.4, 6);
    expect(dmo.requiere).toBe(false);
    expect(bordePorEsfuerzo(4, 28).puedeDescontinuar).toBe(true);
  });

  it('extensión del borde: horizontal max(c − 0.1ℓw, c/2); vertical max(ℓw, Mu/4Vu)', () => {
    const e = extensionElementoBorde(1450, 6000, 38000, 2400);
    expect(e.horizontal).toBeCloseTo(850, 6);
    expect(e.vertical).toBe(6000); // Mu/4Vu = 3958 mm < 6000
    const e2 = extensionElementoBorde(500, 6000, 38000, 2400);
    expect(e2.horizontal).toBe(250); // c − 0.1 ℓw = −100 < c/2 = 250
    const e3 = extensionElementoBorde(1450, 3000, 38000, 2400);
    expect(e3.vertical).toBeCloseTo(3958.33, 1);
  });

  it('vigas de acople: clasificación y Ec. C.21-12', () => {
    const Acw = 300 * 800;
    expect(clasificarVigaAcople(3.2, 0.8, 500, Acw, 28)).toBe('porticoEspecial');
    // ln/h = 1.5; 0.33 √28 Acw = 419 kN
    expect(clasificarVigaAcople(1.2, 0.8, 500, Acw, 28)).toBe('diagonalesObligatorias');
    expect(clasificarVigaAcople(1.2, 0.8, 300, Acw, 28)).toBe('opcional');
    expect(clasificarVigaAcople(2.0, 0.8, 900, Acw, 28)).toBe('opcional');
    const r = cortanteNominalAcopleDiagonal(1200, 420, 30, Acw, 28);
    expect(r.vn).toBeCloseTo((2 * 1200 * 420 * 0.5) / 1000, 6);
    expect(r.tope).toBeCloseTo((0.83 * Math.sqrt(28) * Acw) / 1000, 6);
  });
});

describe('Diafragmas (C.21.11)', () => {
  it('Ec. C.21-13, tope 0.66 y Ec. C.21-14', () => {
    const Acv = 1e5 * 100; // 100 mm de espesor × 100 m... (mm²)
    const r = cortanteNominalDiafragma(Acv, 28, 0.0025, 420);
    expect(r.vn).toBeCloseTo((Acv * (0.17 * Math.sqrt(28) + 0.0025 * 420)) / 1000, 6);
    expect(r.gobiernaTope).toBe(false);
    expect(cortanteNominalDiafragma(Acv, 28, 0.02, 420).gobiernaTope).toBe(true);
    expect(cortanteJuntaDiafragma(1000, 420)).toBeCloseTo(420, 6);
    expect(cortanteJuntaDiafragma(1000, 420, 0.75)).toBeCloseTo(315, 6);
  });

  it('colectores: 0.2/0.15 f′c y, con sobrerresistencia, 0.5/0.4 f′c', () => {
    const a = limitesColector(28);
    expect(a.inicio).toBeCloseTo(5.6, 6);
    expect(a.fin).toBeCloseTo(4.2, 6);
    const b = limitesColector(28, true);
    expect(b.inicio).toBeCloseTo(14, 6);
    expect(b.fin).toBeCloseTo(11.2, 6);
  });
});
