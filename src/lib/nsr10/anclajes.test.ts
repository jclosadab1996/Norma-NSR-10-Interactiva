import { describe, expect, it } from 'vitest';
import {
  areaNco,
  areaProyectadaCortante,
  areaProyectadaTraccion,
  arrancamientoCortante,
  arrancamientoTraccion,
  bordeMinimoPostinstalado,
  cabeceo,
  desprendimientoLateral,
  desprendimientoLateralGrupo,
  distanciaCriticaBorde,
  futaEfectiva,
  hefMaximoPostinstalado,
  hefTresBordes,
  interaccionTraccionCortante,
  kcAnclaje,
  kcpCabeceo,
  longitudApoyoCortante,
  Npn,
  NpCabeza,
  NpGancho,
  phiAcero,
  phiConcreto,
  psiCN,
  psiCpN,
  psiCV,
  psiEcN,
  psiEcV,
  psiEdN,
  psiEdV,
  psiHV,
  resistenciaAceroCortante,
  resistenciaAceroTraccion,
  resistenciaBasicaArrancamiento,
  resistenciaBasicaArrancamientoAlt,
  resistenciaBasicaCortante,
  resistenciaCortanteAnclaje,
  resistenciaTraccionAnclaje,
  separacionMinima,
  type EntradaAnclaje,
  type GeometriaGrupo,
} from './anclajes';

const LEJOS = Infinity;
const unico = (c: Partial<GeometriaGrupo> = {}): GeometriaGrupo => ({ nx: 1, ny: 1, sx: 0, sy: 0, cIzq: LEJOS, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS, ...c });

describe('acero (C-D.5.1 y C-D.6.1)', () => {
  it('futa efectiva = min(futa, 1.9 fya, 860)', () => {
    expect(futaEfectiva(400, 250)).toBe(400);
    expect(futaEfectiva(500, 250)).toBe(475); // 1.9 × 250
    expect(futaEfectiva(1000, 800)).toBe(860);
  });
  it('Nsa = n Ase futa: 4 × 245 × 400 = 392 kN', () => {
    expect(resistenciaAceroTraccion(1, 245, 400, 250)).toBeCloseTo(98.0, 6);
    expect(resistenciaAceroTraccion(4, 245, 400, 250)).toBeCloseTo(392.0, 6);
  });
  it('Vsa: 0.6 n Ase futa; conector soldado sin 0.6; mortero × 0.8', () => {
    expect(resistenciaAceroCortante({ n: 1, Ase: 245, futa: 400, fya: 250, tipo: 'tornillo' })).toBeCloseTo(58.8, 6);
    expect(resistenciaAceroCortante({ n: 1, Ase: 245, futa: 400, fya: 250, tipo: 'conector-soldado' })).toBeCloseTo(98, 6);
    expect(resistenciaAceroCortante({ n: 1, Ase: 245, futa: 400, fya: 250, tipo: 'tornillo', morteroInyectado: true })).toBeCloseTo(47.04, 6);
  });
});

describe('φ (C-D.4.4 y C-D.4.5)', () => {
  it('acero', () => {
    expect(phiAcero('C.9.2', true, 'traccion')).toBe(0.75);
    expect(phiAcero('C.9.2', true, 'cortante')).toBe(0.65);
    expect(phiAcero('C.9.2', false, 'traccion')).toBe(0.65);
    expect(phiAcero('C.9.2', false, 'cortante')).toBe(0.6);
    expect(phiAcero('apendice-C', true, 'traccion')).toBe(0.8);
  });
  it('concreto: condición A con refuerzo suplementario, B sin él o con extracción/cabeceo', () => {
    const base = { combinaciones: 'C.9.2' as const, carga: 'traccion' as const, tipo: 'preinstalado' as const };
    expect(phiConcreto({ ...base, modo: 'arrancamiento', refuerzoSuplementario: true })).toBe(0.75);
    expect(phiConcreto({ ...base, modo: 'arrancamiento', refuerzoSuplementario: false })).toBe(0.7);
    expect(phiConcreto({ ...base, modo: 'extraccion', refuerzoSuplementario: true })).toBe(0.7);
    expect(phiConcreto({ ...base, carga: 'cortante', modo: 'cabeceo', refuerzoSuplementario: true })).toBe(0.7);
    expect(phiConcreto({ ...base, tipo: 'post-torque', categoria: 2, modo: 'arrancamiento', refuerzoSuplementario: false })).toBe(0.55);
    expect(phiConcreto({ ...base, combinaciones: 'apendice-C', tipo: 'post-torque', categoria: 3, modo: 'arrancamiento', refuerzoSuplementario: true })).toBe(0.65);
  });
});

describe('arrancamiento en tracción (C-D.5.2)', () => {
  it('ANco = 9 hef²', () => expect(areaNco(200)).toBe(360000));
  it('kc: 10 preinstalado, 7 postinstalado, ensayos ≤ 10', () => {
    expect(kcAnclaje('preinstalado')).toBe(10);
    expect(kcAnclaje('post-torque')).toBe(7);
    expect(kcAnclaje('post-torque', 9)).toBe(9);
    expect(kcAnclaje('post-torque', 12)).toBe(10);
  });
  it('Nb = 10 √28 · 200^1.5 = 149.666 kN', () => {
    expect(resistenciaBasicaArrancamiento(28, 200, 10)).toBeCloseTo(149.666, 3);
    expect(resistenciaBasicaArrancamiento(28, 200, 10, 0.75)).toBeCloseTo(0.75 * 149.666, 3);
  });
  it('Nb alternativo C-D-8 = 3.9 √28 · 300^(5/3) = 277.446 kN', () => {
    expect(resistenciaBasicaArrancamientoAlt(28, 300)).toBeCloseTo(277.446, 3);
  });
  it('factores ψ', () => {
    expect(psiEcN(0, 200)).toBe(1);
    expect(psiEcN(100, 200)).toBeCloseTo(1 / (1 + 200 / 600), 10); // 0.75
    expect(psiEdN(300, 200)).toBe(1);
    expect(psiEdN(150, 200)).toBeCloseTo(0.85, 10);
    expect(psiCN('preinstalado', false)).toBe(1.25);
    expect(psiCN('post-torque', false)).toBe(1.4);
    expect(psiCN('post-torque', true)).toBe(1);
    expect(psiCN('preinstalado', true)).toBe(1);
    expect(psiCpN({ aplica: false, caMin: 10, cac: 400, hef: 100 })).toBe(1);
    expect(psiCpN({ aplica: true, caMin: 400, cac: 400, hef: 100 })).toBe(1);
    expect(psiCpN({ aplica: true, caMin: 200, cac: 400, hef: 100 })).toBe(0.5);
    expect(psiCpN({ aplica: true, caMin: 100, cac: 400, hef: 100 })).toBe(0.375); // mínimo 1.5 hef/cac
  });
  it('distancia crítica cac', () => {
    expect(distanciaCriticaBorde('post-sobreperforacion', 100)).toBe(250);
    expect(distanciaCriticaBorde('post-torque', 100)).toBe(400);
    expect(distanciaCriticaBorde('post-desplazamiento', 100)).toBe(400);
  });
  it('hef con tres bordes: mayor entre ca,máx/1.5 y s/3', () => {
    expect(hefTresBordes(150, 60)).toBe(100);
    expect(hefTresBordes(60, 240)).toBe(80);
  });
  it('ANc de un anclaje con un borde a 150 (hef = 200): (150+300) × 600 = 270000', () => {
    expect(areaProyectadaTraccion(200, unico({ cIzq: 150 }))).toBe(270000);
    expect(areaProyectadaTraccion(200, unico())).toBe(360000);
  });
  it('ANc del grupo 2×2 con s = 150: (300+150+300)² = 562500; con borde a 150: 600 × 750 = 450000', () => {
    const g = { nx: 2, ny: 2, sx: 150, sy: 150, cIzq: LEJOS, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS };
    expect(areaProyectadaTraccion(200, g)).toBe(562500);
    expect(areaProyectadaTraccion(200, { ...g, cIzq: 150 })).toBe(450000);
  });
  it('ANc ≤ n ANco: con s ≥ 3 hef los conos son independientes', () => {
    const g = { nx: 2, ny: 1, sx: 700, sy: 0, cIzq: LEJOS, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS };
    expect(areaProyectadaTraccion(200, g)).toBe(2 * 360000);
  });
  it('Ncb de un anclaje individual lejos de bordes = Nb (cond. fisurado)', () => {
    const r = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: unico(), fisurado: true });
    expect(r.Ncb).toBeCloseTo(149.666, 3);
    expect(r.esGrupo).toBe(false);
  });
  it('Ncb con borde a 150: (270000/360000) × 0.85 × Nb = 95.412 kN', () => {
    const r = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: unico({ cIzq: 150 }), fisurado: true });
    expect(r.psiEd).toBeCloseTo(0.85, 10);
    expect(r.Ncb).toBeCloseTo(95.412, 3);
  });
  it('Ncbg grupo 2×2 lejos de bordes: 562500/360000 × Nb = 233.854 kN; con borde a 150: 159.020 kN', () => {
    const g = { nx: 2, ny: 2, sx: 150, sy: 150, cIzq: LEJOS, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS };
    const a = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: g, fisurado: true });
    expect(a.Ncb).toBeCloseTo(233.854, 3);
    const b = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: { ...g, cIzq: 150 }, fisurado: true });
    expect(b.Ncb).toBeCloseTo(159.02, 2);
  });
  it('excentricidad reduce el grupo con ψec,N', () => {
    const g = { nx: 2, ny: 1, sx: 150, sy: 0, cIzq: LEJOS, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS };
    const sin = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: g, fisurado: true });
    const con = arrancamientoTraccion({ fc: 28, hef: 200, tipo: 'preinstalado', geometria: g, fisurado: true, eNx: 100 });
    expect(con.psiEc).toBeCloseTo(0.75, 10);
    expect(con.Ncb).toBeCloseTo(0.75 * sin.Ncb, 6);
  });
  it('postinstalado de torque, no fisurado, borde a 100: producto de factores', () => {
    const r = arrancamientoTraccion({ fc: 28, hef: 100, tipo: 'post-torque', geometria: unico({ cIzq: 100 }), fisurado: false });
    const Nb = (7 * Math.sqrt(28) * 1000) / 1000;
    expect(r.Nb).toBeCloseTo(Nb, 6);
    expect(r.psiEd).toBeCloseTo(0.9, 10);
    expect(r.psiC).toBe(1.4);
    expect(r.psiCp).toBe(0.375);
    expect(r.Ncb).toBeCloseTo((75000 / 90000) * 0.9 * 1.4 * 0.375 * Nb, 6);
  });
});

describe('extracción por deslizamiento y desprendimiento lateral', () => {
  it('Np = 8 Abrg f′c; Np gancho = 0.9 f′c eh da; Npn = ψc,P Np', () => {
    expect(NpCabeza(1500, 28)).toBeCloseTo(336, 6);
    expect(NpGancho(28, 60, 20)).toBeCloseTo(0.9 * 28 * 60 * 20 / 1000, 6);
    expect(Npn(336, false)).toBeCloseTo(470.4, 6);
    expect(Npn(336, true)).toBeCloseTo(336, 6);
  });
  it('Nsb = 13 ca1 √Abrg √f′c; aplica si hef > 2.5 ca1', () => {
    const a = desprendimientoLateral({ ca1: 100, ca2: Infinity, Abrg: 1500, fc: 28, hef: 300 });
    expect(a.aplica).toBe(true);
    expect(a.Nsb).toBeCloseTo(266.421, 3);
    expect(desprendimientoLateral({ ca1: 100, ca2: Infinity, Abrg: 1500, fc: 28, hef: 250 }).aplica).toBe(false);
  });
  it('factor (1 + ca2/ca1)/4 con ca2 < 3 ca1', () => {
    const a = desprendimientoLateral({ ca1: 100, ca2: 200, Abrg: 1500, fc: 28, hef: 300 });
    expect(a.factorCa2).toBeCloseTo(0.75, 10);
    expect(a.Nsb).toBeCloseTo(0.75 * 266.421, 3);
  });
  it('Nsbg = (1 + s/6ca1) Nsb', () => {
    expect(desprendimientoLateralGrupo(266.421, 300, 100)).toBeCloseTo(1.5 * 266.421, 3);
    expect(desprendimientoLateralGrupo(100, 600, 100)).toBe(200);
  });
});

describe('cortante (C-D.6)', () => {
  it('ℓe', () => {
    expect(longitudApoyoCortante('constante', 200, 20)).toBe(200);
    expect(longitudApoyoCortante('torque-camisa', 200, 20)).toBe(40);
    expect(longitudApoyoCortante('otros', 200, 20)).toBe(160);
  });
  it('Vb = 0.6 (200/20)^0.2 √20 √28 · 150^1.5 = 41.341 kN; soldado 0.66', () => {
    const v = resistenciaBasicaCortante({ le: 200, da: 20, fc: 28, ca1: 150 });
    expect(v).toBeCloseTo(41.341, 3);
    expect(resistenciaBasicaCortante({ le: 200, da: 20, fc: 28, ca1: 150, soldado: true })).toBeCloseTo(v * 1.1, 6);
  });
  it('AVco = 4.5 ca1² y AVc de un anclaje lejos del lado = AVco', () => {
    const Avc = areaProyectadaCortante({ ca1: 150, ha: 300, nParalelo: 1, sParalelo: 0, ca2Menos: Infinity, ca2Mas: Infinity, nTotal: 1 });
    expect(Avc).toBe(101250);
  });
  it('AVc con elemento delgado (ha = 150): 450 × 150 = 67500', () => {
    expect(areaProyectadaCortante({ ca1: 150, ha: 150, nParalelo: 1, sParalelo: 0, ca2Menos: Infinity, ca2Mas: Infinity, nTotal: 1 })).toBe(67500);
  });
  it('factores ψ de cortante', () => {
    expect(psiEcV(0, 150)).toBe(1);
    expect(psiEcV(75, 150)).toBeCloseTo(0.75, 10);
    expect(psiEdV(225, 150)).toBe(1);
    expect(psiEdV(75, 150)).toBeCloseTo(0.7 + 0.3 * (75 / 225), 10);
    expect(psiHV(150, 300)).toBe(1);
    expect(psiHV(200, 150)).toBeCloseTo(Math.sqrt(2), 10);
    expect(psiCV(false)).toBe(1.4);
    expect(psiCV(true)).toBe(1);
    expect(psiCV(true, 'barra')).toBe(1.2);
    expect(psiCV(true, 'barra-estribos')).toBe(1.4);
  });
  it('Vcb de un anclaje: ratio 1, ψ = 1 → Vb = 41.341 kN', () => {
    const r = arrancamientoCortante({ fc: 28, da: 20, hef: 200, ca1: 150, ca2Menos: Infinity, ca2Mas: Infinity, ha: 300, nParalelo: 1, sParalelo: 0, nTotal: 1, fisurado: true });
    expect(r.Vcb).toBeCloseTo(41.341, 3);
  });
  it('cortante paralelo al borde: doble con ψed = 1', () => {
    const r = arrancamientoCortante({ fc: 28, da: 20, hef: 200, ca1: 150, ca2Menos: 50, ca2Mas: Infinity, ha: 300, nParalelo: 1, sParalelo: 0, nTotal: 1, fisurado: true, paraleloAlBorde: true });
    expect(r.psiEd).toBe(1);
    const sinFactor = (r.Avc / r.Avco) * r.Vb;
    expect(r.Vcb).toBeCloseTo(2 * sinFactor, 6);
  });
  it('cabeceo: kcp = 1 (hef < 65) o 2', () => {
    expect(kcpCabeceo(60)).toBe(1);
    expect(kcpCabeceo(65)).toBe(2);
    expect(cabeceo(200, 149.666)).toBeCloseTo(299.332, 3);
  });
});

describe('interacción (C-D.7)', () => {
  it('7.1: Vua ≤ 0.2 φVn → solo tracción', () => {
    const r = interaccionTraccionCortante(90, 100, 10, 100);
    expect(r.caso).toBe('solo-traccion');
    expect(r.cumple).toBe(true);
  });
  it('7.2: Nua ≤ 0.2 φNn → solo cortante', () => {
    const r = interaccionTraccionCortante(10, 100, 90, 100);
    expect(r.caso).toBe('solo-cortante');
    expect(r.cumple).toBe(true);
    expect(interaccionTraccionCortante(10, 100, 110, 100).cumple).toBe(false);
  });
  it('7.3: suma ≤ 1.2', () => {
    const ok = interaccionTraccionCortante(60, 100, 60, 100);
    expect(ok.caso).toBe('interaccion');
    expect(ok.razon).toBeCloseTo(1.2, 10);
    expect(ok.cumple).toBe(true);
    expect(interaccionTraccionCortante(70, 100, 60, 100).cumple).toBe(false);
  });
});

describe('distancias y espesores (C-D.8)', () => {
  it('mínimos', () => {
    expect(separacionMinima(20, false)).toBe(80);
    expect(separacionMinima(20, true)).toBe(120);
    expect(bordeMinimoPostinstalado('post-sobreperforacion', 12)).toBe(72);
    expect(bordeMinimoPostinstalado('post-torque', 12)).toBe(96);
    expect(bordeMinimoPostinstalado('post-desplazamiento', 12)).toBe(120);
    expect(hefMaximoPostinstalado(300)).toBe(200);
    expect(hefMaximoPostinstalado(150)).toBe(100);
  });
});

describe('resistencia integrada', () => {
  const base: EntradaAnclaje = {
    tipo: 'preinstalado',
    combinaciones: 'C.9.2',
    fc: 28,
    da: 20,
    hef: 200,
    Ase: 245,
    futa: 400,
    fya: 250,
    aceroDuctil: true,
    geometria: unico(),
    fisurado: true,
    refuerzoSuplementario: false,
    Abrg: 1500,
    ha: 300,
  };
  it('anclaje individual: Nsa 98 kN (φ 0.75 → 73.5), Ncb 149.666 (φ 0.70 → 104.77), Npn 336 (φ 0.70 → 235.2)', () => {
    const r = resistenciaTraccionAnclaje(base);
    const porClave = Object.fromEntries(r.modos.map((m) => [m.clave, m]));
    expect(porClave.Nsa.disenio).toBeCloseTo(73.5, 6);
    expect(porClave.Ncb.disenio).toBeCloseTo(0.7 * 149.666, 3);
    expect(porClave.Npn.disenio).toBeCloseTo(0.7 * 336, 3);
    expect(r.gobernante.clave).toBe('Nsa');
    expect(r.phiNn).toBeCloseTo(73.5, 6);
  });
  it('con refuerzo suplementario φ del arrancamiento = 0.75', () => {
    const r = resistenciaTraccionAnclaje({ ...base, refuerzoSuplementario: true });
    expect(r.modos.find((m) => m.clave === 'Ncb')!.phi).toBe(0.75);
    expect(r.modos.find((m) => m.clave === 'Npn')!.phi).toBe(0.7);
  });
  it('zona sísmica: 0.75 solo en modos del concreto', () => {
    const a = resistenciaTraccionAnclaje(base);
    const b = resistenciaTraccionAnclaje({ ...base, sismico: true });
    expect(b.modos.find((m) => m.clave === 'Nsa')!.disenio).toBeCloseTo(a.modos.find((m) => m.clave === 'Nsa')!.disenio, 10);
    expect(b.modos.find((m) => m.clave === 'Ncb')!.disenio).toBeCloseTo(0.75 * a.modos.find((m) => m.clave === 'Ncb')!.disenio, 10);
  });
  it('grupo 2×2 con borde: gobierna el arrancamiento', () => {
    const g = { nx: 2, ny: 2, sx: 150, sy: 150, cIzq: 150, cDer: LEJOS, cSup: LEJOS, cInf: LEJOS };
    const r = resistenciaTraccionAnclaje({ ...base, geometria: g, refuerzoSuplementario: true });
    expect(r.gobernante.clave).toBe('Ncbg');
    expect(r.gobernante.nominal).toBeCloseTo(159.02, 2);
    expect(r.phiNn).toBeCloseTo(0.75 * 159.02, 2);
  });
  it('cortante de un anclaje: Vsa 58.8 → φ 0.65 = 38.22; Vcb 41.341 → φ 0.70 = 28.939; gobierna Vcb', () => {
    const r = resistenciaCortanteAnclaje({ ...base, geometria: unico({ cInf: 150 }) });
    const porClave = Object.fromEntries(r.modos.map((m) => [m.clave, m]));
    expect(porClave.Vsa.disenio).toBeCloseTo(0.65 * 58.8, 6);
    expect(porClave.Vcb.disenio).toBeCloseTo(0.7 * 41.341, 3);
    expect(r.gobernante.clave).toBe('Vcb');
  });
});
