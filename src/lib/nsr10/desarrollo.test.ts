import { describe, expect, it } from 'vitest';
import {
  areaEstribosMinimaEmpalmeColumna,
  cbBarra,
  cbDesdeLibres,
  claseEmpalmeColumnaTraccion,
  claseEmpalmeTraccion,
  dbMaximoC125,
  diametroEquivalentePaquete,
  embebidoEstriboU,
  empalmeCompresion,
  empalmeCompresionColumna,
  empalmeCompresionDiametrosDistintos,
  empalmeMallaCorrugada,
  empalmeMallaLisa,
  empalmeTraccion,
  empalmeTraccionDiametrosDistintos,
  espaciamientoAdecuadoC122,
  estribosAdicionalesC12105,
  extensionMasAllaPuntoCorte,
  extensionNegativoMasAllaInflexion,
  factorPaquete,
  fcExcedeLimiteRaiz,
  incumplimientosCabeza,
  lambdaDesarrollo,
  laMaximaInflexion,
  ldcCompresion,
  ldEcuacionC121,
  ldhGancho,
  ldMallaCorrugada,
  ldMallaLisa,
  ldTablaC122,
  ldToron,
  ldtCabeza,
  psiE,
  psiS,
  psiT,
  psiTPsiE,
  psiW,
  raizFcDesarrollo,
  separacionTransversalMaximaTraslapo,
  ktr,
  terminoConfinamiento,
  verificarC125,
} from './desarrollo';

// Barras de referencia (diámetros de la Tabla C.3.5.3-2): No. 6 = 19.1 mm, No. 8 = 25.4 mm.
const DB6 = 19.1;
const DB8 = 25.4;

describe('factores comunes', () => {
  it('√f′c se limita a 8.3 MPa (C.12.1.2)', () => {
    expect(raizFcDesarrollo(28)).toBeCloseTo(5.29150262, 8);
    expect(raizFcDesarrollo(100)).toBe(8.3);
    expect(fcExcedeLimiteRaiz(68.89)).toBe(false);
    expect(fcExcedeLimiteRaiz(70)).toBe(true);
    expect(() => raizFcDesarrollo(0)).toThrow(RangeError);
  });

  it('λ: 1.0 normal; 0.75 liviano sin fct; con fct = fct/(0.56√f′c) ≤ 1', () => {
    expect(lambdaDesarrollo('normal')).toBe(1);
    expect(lambdaDesarrollo('liviano-otros')).toBe(0.75);
    expect(lambdaDesarrollo('liviano-arena-normal')).toBe(0.75); // C.12.2.4(d): no excede 0.75 sin fct
    expect(lambdaDesarrollo('liviano-arena-normal', 2.0, 28)).toBeCloseTo(2.0 / (0.56 * Math.sqrt(28)), 12);
    expect(lambdaDesarrollo('liviano-otros', 3.5, 28)).toBe(1);
  });

  it('ψt, ψe, ψs y el tope del producto 1.7 (C.12.2.4)', () => {
    expect(psiT(350)).toBe(1.3);
    expect(psiT(300)).toBe(1.0); // "más de 300 mm"
    expect(psiE({ epoxico: false, db: DB8 })).toBe(1.0);
    expect(psiE({ epoxico: true, db: 20, recubrimientoLibre: 70, separacionLibre: 130 })).toBe(1.2);
    expect(psiE({ epoxico: true, db: 20, recubrimientoLibre: 70, separacionLibre: 100 })).toBe(1.5); // 100 < 6·20
    expect(psiE({ epoxico: true, db: 20, recubrimientoLibre: 60, separacionLibre: 200 })).toBe(1.2);
    expect(psiE({ epoxico: true, db: 20, recubrimientoLibre: 59, separacionLibre: 200 })).toBe(1.5); // 59 < 3·20
    expect(psiTPsiE(1.3, 1.5)).toBe(1.7);
    expect(psiTPsiE(1.3, 1.2)).toBeCloseTo(1.56, 12);
    expect(psiS(19.1)).toBe(0.8);
    expect(psiS(20)).toBe(0.8);
    expect(psiS(22)).toBe(1.0);
    expect(psiS(25.4)).toBe(1.0);
  });

  it('cb, Ktr y el término de confinamiento (C.12.2.3)', () => {
    expect(cbBarra(62.7)).toBe(62.7);
    expect(cbBarra(62.7, 200)).toBe(62.7); // mitad de la separación = 100
    expect(cbBarra(62.7, 100)).toBe(50);
    // recubrimiento libre 50 (40 + estribo 10), separación libre 174.6 (2 barras No. 8 en 300 mm): cb = min(62.7, 100)
    expect(cbDesdeLibres(50, 174.6, DB8)).toBeCloseTo(62.7, 10);
    // Ktr: 2 ramas de estribo No. 3 (71 mm²) → Atr = 142 mm², s = 150 mm, n = 2 → 40·142/(150·2) = 18.9333
    expect(ktr(142, 150, 2)).toBeCloseTo(18.93333333, 8);
    expect(terminoConfinamiento(62.7, 0, DB8)).toBeCloseTo(62.7 / 25.4, 12);
    expect(terminoConfinamiento(62.7, 18.9333, DB8)).toBe(2.5); // 3.21 se limita a 2.5
  });
});

describe('ℓd a tracción (C.12.2)', () => {
  // Cálculo a mano: No. 8 (25.4 mm), fy = 420, f′c = 28 (√ = 5.2915), λ = ψt = ψe = 1.
  it('tabla C.12.2.2, espaciamiento adecuado: 420/(1.7·5.2915)·25.4 = 1185.9 mm (46.7 db)', () => {
    const r = ldTablaC122({ fy: 420, fc: 28, db: DB8, espaciamientoAdecuado: true });
    expect(r.divisorTabla).toBe(1.7);
    expect(r.ld).toBeCloseTo(1185.9, 0);
    expect(r.ldSobreDb).toBeCloseTo(46.69, 1);
    expect(r.minimoAplicado).toBe(false);
  });

  it('tabla C.12.2.2, otros casos: 420/(1.1·5.2915)·25.4 = 1832.8 mm', () => {
    const r = ldTablaC122({ fy: 420, fc: 28, db: DB8, espaciamientoAdecuado: false });
    expect(r.divisorTabla).toBe(1.1);
    expect(r.ld).toBeCloseTo(1832.8, 0);
  });

  it('tabla: No. 6 (≤ 20M) usa 2.1 y 1.4; f′c = 21: 420/(2.1·4.5826)·19.1 = 833.6 mm', () => {
    const r = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true });
    expect(r.divisorTabla).toBe(2.1);
    expect(r.ld).toBeCloseTo(833.6, 0);
    expect(ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: false }).divisorTabla).toBe(1.4);
  });

  it('barra superior ψt = 1.3 multiplica ℓd por 1.3; ψtψe se limita a 1.7', () => {
    const base = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true });
    const sup = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true, psiT: 1.3 });
    expect(sup.ld).toBeCloseTo(1.3 * base.ld, 8);
    const epoxi = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true, psiT: 1.3, psiE: 1.5 });
    expect(epoxi.psiTE).toBe(1.7);
    expect(epoxi.ld).toBeCloseTo(1.7 * base.ld, 8);
  });

  it('λ = 0.75 aumenta ℓd en 1/0.75 (λ solo en el denominador)', () => {
    const n = ldTablaC122({ fy: 420, fc: 28, db: DB8, espaciamientoAdecuado: false });
    const l = ldTablaC122({ fy: 420, fc: 28, db: DB8, espaciamientoAdecuado: false, lambda: 0.75 });
    expect(l.ld / n.ld).toBeCloseTo(1 / 0.75, 12);
  });

  it('mínimo de 300 mm (C.12.2.1) y exceso de refuerzo (C.12.2.5)', () => {
    const corta = ldTablaC122({ fy: 280, fc: 50, db: 9.5, espaciamientoAdecuado: true });
    // 280/(2.1·7.0711)·9.5 = 179.1 → gobierna 300
    expect(corta.ldBruto).toBeCloseTo(179.1, 0);
    expect(corta.ld).toBe(300);
    expect(corta.minimoAplicado).toBe(true);
    const ex = ldTablaC122({ fy: 420, fc: 28, db: DB8, espaciamientoAdecuado: true }, { relacionAs: 0.8 });
    expect(ex.ld).toBeCloseTo(0.8 * 1185.9, 0);
    // para empalme: sin mínimo ni exceso
    const emp = ldTablaC122({ fy: 280, fc: 50, db: 9.5, espaciamientoAdecuado: true }, { paraEmpalme: true, relacionAs: 0.5 });
    expect(emp.ld).toBeCloseTo(179.1, 0);
  });

  it('Ec. C.12-1 con Ktr = 0: cb = 62.7 → (cb+Ktr)/db = 2.4685 → ℓd = 742.5 mm', () => {
    const r = ldEcuacionC121({ fy: 420, fc: 28, db: DB8, cb: 62.7 });
    expect(r.terminoConfinamiento).toBeCloseTo(2.46850, 4);
    expect(r.psiS).toBe(1.0);
    expect(r.ld).toBeCloseTo(742.5, 0);
    expect(r.confinamientoLimitado).toBe(false);
  });

  it('Ec. C.12-1: con Ktr el término se limita a 2.5 → ℓd = 420/(1.1·5.2915·2.5)·25.4 = 733.1 mm', () => {
    const r = ldEcuacionC121({ fy: 420, fc: 28, db: DB8, cb: 62.7, ktrMm: 18.9333 });
    expect(r.confinamientoLimitado).toBe(true);
    expect(r.terminoConfinamiento).toBe(2.5);
    expect(r.ld).toBeCloseTo(733.1, 0);
  });

  it('Ec. C.12-1 con ψs = 0.8 en barras pequeñas: No. 6, f′c = 21, (cb+Ktr)/db = 1.5 → ≈ la tabla (2.1)', () => {
    const r = ldEcuacionC121({ fy: 420, fc: 21, db: DB6, cb: 1.5 * DB6 });
    // 420·0.8/(1.1·4.5826·1.5)·19.1 = 848.7; la tabla con 2.1 da 833.6 (≈ 1.8 % menos)
    expect(r.ld).toBeCloseTo(848.7, 0);
    expect(Math.abs(r.ld / 833.6 - 1)).toBeLessThan(0.02);
  });

  it('empalme: ℓd sin 300 mm ni exceso', () => {
    const r = ldEcuacionC121({ fy: 280, fc: 50, db: 9.5, cb: 40 }, { paraEmpalme: true, relacionAs: 0.5 });
    expect(r.minimoAplicado).toBe(false);
    expect(r.ld).toBe(r.ldBruto);
  });

  it('espaciamiento adecuado (primera fila de la tabla)', () => {
    expect(espaciamientoAdecuadoC122(25.4, 25.4, 25.4, true)).toBe(true);
    expect(espaciamientoAdecuadoC122(25.4, 25.4, 25.4, false)).toBe(false); // sin estribos mínimos y separación < 2db
    expect(espaciamientoAdecuadoC122(50.8, 25.4, 25.4, false)).toBe(true); // separación ≥ 2db y recubrimiento ≥ db
    expect(espaciamientoAdecuadoC122(20, 30, 25.4, true)).toBe(false);
  });

  it('paquetes (C.12.4)', () => {
    expect(factorPaquete(3)).toBe(1.2);
    expect(factorPaquete(4)).toBe(1.33);
    expect(() => factorPaquete(5)).toThrow(RangeError);
    expect(diametroEquivalentePaquete(25.4, 4)).toBeCloseTo(50.8, 10);
  });
});

describe('compresión y gancho (C.12.3 y C.12.5)', () => {
  it('ℓdc No. 8, fy = 420, f′c = 28: mayor de 483.9 y 458.7 → 483.9 mm; con espiral ×0.75 = 362.9', () => {
    const r = ldcCompresion({ fy: 420, fc: 28, db: DB8 });
    expect(r.termino1).toBeCloseTo(483.86, 1);
    expect(r.termino2).toBeCloseTo(458.7, 1);
    expect(r.ldc).toBeCloseTo(483.9, 0);
    expect(ldcCompresion({ fy: 420, fc: 28, db: DB8, confinado: true }).ldc).toBeCloseTo(362.9, 0);
  });

  it('ℓdc: con f′c alto gobierna el segundo término (0.043 fy db); el mínimo es 200 mm', () => {
    const r = ldcCompresion({ fy: 420, fc: 60, db: DB8 });
    expect(r.termino2).toBeGreaterThan(r.termino1);
    expect(r.ldc).toBeCloseTo(458.7, 1);
    expect(ldcCompresion({ fy: 280, fc: 28, db: 9.5, confinado: true }).ldc).toBe(200);
  });

  it('ℓdh No. 8, fy = 420, f′c = 28: 0.24·420/5.2915·25.4 = 483.9 mm (19.05 db)', () => {
    const r = ldhGancho({ fy: 420, fc: 28, db: DB8 });
    expect(r.base).toBeCloseTo(483.9, 0);
    expect(r.ldh).toBeCloseTo(483.9, 0);
    expect(r.ldhSobreDb).toBeCloseTo(19.05, 1);
  });

  it('ℓdh con factores: 0.7 → 338.7 mm; 0.7·0.8 = 0.56 → 271.0 mm; mínimo 8db = 203.2 mm', () => {
    expect(ldhGancho({ fy: 420, fc: 28, db: DB8, recubrimientoSuficiente: true }).ldh).toBeCloseTo(338.7, 0);
    const r = ldhGancho({ fy: 420, fc: 28, db: DB8, recubrimientoSuficiente: true, estribosConfinan: true });
    expect(r.factor).toBeCloseTo(0.56, 12);
    expect(r.ldh).toBeCloseTo(271.0, 0);
    expect(r.minimo).toBeCloseTo(203.2, 10);
    const pequeno = ldhGancho({ fy: 240, fc: 50, db: 9.5, recubrimientoSuficiente: true, estribosConfinan: true });
    expect(pequeno.minimoAplicado).toBe(true);
    expect(pequeno.ldh).toBe(150); // mayor de 8db = 76 y 150
  });

  it('cabeza: ℓdt = 0.19·420/√28·25.4 = 383.0 mm; f′c se limita a 40 MPa', () => {
    const r = ldtCabeza({ fy: 420, fc: 28, db: DB8 });
    expect(r.ldt).toBeCloseTo(383.0, 0);
    expect(ldtCabeza({ fy: 420, fc: 60, db: DB8 }).fcUsado).toBe(40);
    expect(ldtCabeza({ fy: 420, fc: 28, db: DB8, epoxico: true }).ldt).toBeCloseTo(1.2 * 383.0, 0);
    expect(incumplimientosCabeza({ fy: 420, db: 25.4, concretoNormal: true, abrg: 4 * 510, ab: 510, recubrimientoLibre: 51, separacionLibre: 102 })).toEqual([]);
    expect(incumplimientosCabeza({ fy: 500, db: 25.4, concretoNormal: false, abrg: 2 * 510, ab: 510, recubrimientoLibre: 40, separacionLibre: 80 })).toHaveLength(5);
  });
});

describe('malla y torones', () => {
  it('ψw: mayor de (fy−240)/fy y 5db/sw, ≤ 1.0 (C.12.7.2); sin transversal → 1.0', () => {
    expect(psiW(420, 8, 100)).toBeCloseTo(180 / 420, 12); // 0.4286 vs 0.4
    expect(psiW(420, 8, 50)).toBeCloseTo(0.8, 12); // 40/50
    expect(psiW(420, 8, 30)).toBe(1);
    expect(psiW(420, 8, null)).toBe(1);
  });

  it('ℓd de malla corrugada con mínimo de 200 mm; malla lisa Ec. C.12-3 = 3.3(Ab/s)(fy/(λ√f′c))', () => {
    expect(ldMallaCorrugada(500, 0.5)).toBe(250);
    expect(ldMallaCorrugada(300, 0.5)).toBe(200);
    expect(ldMallaCorrugada(300, 0.5, true)).toBe(150);
    expect(ldMallaLisa(50, 100, 420, 21)).toBeCloseTo(151.22, 1);
    expect(ldMallaLisa(25, 100, 420, 21)).toBe(150);
  });

  it('torón Ec. C.12-4: fse = 1100, fps = 1700, db = 12.7 → 665.2 + 1088.6 = 1753.8 mm', () => {
    expect(ldToron(1100, 1700, 12.7)).toBeCloseTo(1753.8, 0);
  });
});

describe('desarrollo del refuerzo de flexión (C.12.10 a C.12.13)', () => {
  it('extensión más allá del punto de corte: mayor de d y 12db', () => {
    expect(extensionMasAllaPuntoCorte(450, DB8)).toBe(450);
    expect(extensionMasAllaPuntoCorte(250, DB8)).toBeCloseTo(304.8, 10);
    expect(laMaximaInflexion(450, DB8)).toBe(450);
    expect(extensionNegativoMasAllaInflexion(450, DB8, 6500)).toBeCloseTo(450, 10); // ln/16 = 406.25
    expect(extensionNegativoMasAllaInflexion(300, DB8, 8000)).toBe(500); // ln/16
  });

  it('Ec. C.12-5: Mn = 179.9 kN·m, Vu = 180 kN, ℓa = 140 → límite 1139 mm; con reacción ×1.3 → 1439 mm', () => {
    const base = verificarC125({ ld: 1185.9, mn: 179.9, vu: 180, la: 140 });
    expect(base.mnSobreVu).toBeCloseTo(999.4, 0);
    expect(base.limite).toBeCloseTo(1139.4, 0);
    expect(base.cumple).toBe(false); // 1185.9 > 1139.4
    const conf = verificarC125({ ld: 1185.9, mn: 179.9, vu: 180, la: 140, confinadoPorReaccion: true });
    expect(conf.limite).toBeCloseTo(1.3 * 999.4 + 140, 0);
    expect(conf.cumple).toBe(true);
    expect(verificarC125({ ld: 742.5, mn: 179.9, vu: 180, la: 140 }).cumple).toBe(true);
    expect(dbMaximoC125(1139.4, 46.69)).toBeCloseTo(24.4, 1);
  });

  it('C.12.10.5.2: 0.41 bw s/fyt y s ≤ d/(8βb)', () => {
    const r = estribosAdicionalesC12105(300, 100, 420, 450, 0.5);
    expect(r.areaMin).toBeCloseTo((0.41 * 300 * 100) / 420, 10); // 29.29 mm²
    expect(r.sMax).toBeCloseTo(450 / 4, 10);
  });

  it('C.12.13.2.2: 0.17 db fyt/(λ√f′c)', () => {
    expect(embebidoEstriboU(12.7, 420, 28)).toBeCloseTo((0.17 * 12.7 * 420) / Math.sqrt(28), 8); // 171.4 mm
  });
});

describe('empalmes', () => {
  it('Clase A = 1.0 ℓd, Clase B = 1.3 ℓd: No. 6, f′c = 21, fy = 420 → 833.6 y 1083.7 mm', () => {
    const base = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true }, { paraEmpalme: true }).ld;
    expect(empalmeTraccion(base, 'A')).toBeCloseTo(833.6, 0);
    expect(empalmeTraccion(base, 'B')).toBeCloseTo(1083.7, 0);
    // barra superior: ψt = 1.3 → B = 1408.8
    const sup = ldTablaC122({ fy: 420, fc: 21, db: DB6, espaciamientoAdecuado: true, psiT: 1.3 }, { paraEmpalme: true }).ld;
    expect(empalmeTraccion(sup, 'B')).toBeCloseTo(1408.8, 0);
  });

  it('el empalme no baja de 300 mm', () => {
    expect(empalmeTraccion(150, 'A')).toBe(300);
    expect(empalmeTraccion(200, 'B')).toBe(300);
  });

  it('clase de empalme: A solo con As ≥ 2 As,req y ≤ 1/2 empalmado (C.12.15.2)', () => {
    expect(claseEmpalmeTraccion({ relacionAsProporcionadaRequerida: 2, fraccionEmpalmada: 0.5 })).toBe('A');
    expect(claseEmpalmeTraccion({ relacionAsProporcionadaRequerida: 1.9, fraccionEmpalmada: 0.5 })).toBe('B');
    expect(claseEmpalmeTraccion({ relacionAsProporcionadaRequerida: 2.5, fraccionEmpalmada: 0.6 })).toBe('B');
    expect(claseEmpalmeTraccion({ relacionAsProporcionadaRequerida: 1, fraccionEmpalmada: 1 })).toBe('B');
  });

  it('diámetros distintos: el mayor de los dos valores (C.12.15.3 y C.12.16.2)', () => {
    expect(empalmeTraccionDiametrosDistintos(1186, 900)).toBe(1186);
    expect(empalmeTraccionDiametrosDistintos(900, 1100)).toBe(1100);
    expect(empalmeCompresionDiametrosDistintos(484, 600)).toBe(600);
  });

  it('compresión: 0.071·420·25.4 = 757.4 mm; f′c < 21 → ×4/3 = 1009.9; fy = 500 → (0.13·500−24)·25.4 = 1041.4', () => {
    expect(empalmeCompresion(420, 28, DB8).longitud).toBeCloseTo(757.4, 0);
    const bajo = empalmeCompresion(420, 17, DB8);
    expect(bajo.incrementoFcBajo).toBe(true);
    expect(bajo.longitud).toBeCloseTo(1009.9, 0);
    expect(empalmeCompresion(500, 28, DB8).longitud).toBeCloseTo(1041.4, 0);
    expect(empalmeCompresion(420, 28, 9.5).longitud).toBe(300); // 0.071·420·9.5 = 283.3 < 300
    expect(empalmeCompresion(420, 28, 9.5).minimoAplicado).toBe(true);
  });

  it('columnas: ×0.83 con estribos, ×0.75 con espiral, mínimo 300 mm; área 0.0015 h s', () => {
    expect(empalmeCompresionColumna(757.4, 'estribos')).toBeCloseTo(628.6, 0);
    expect(empalmeCompresionColumna(757.4, 'espiral')).toBeCloseTo(568.1, 0);
    expect(empalmeCompresionColumna(757.4, 'ninguno')).toBe(757.4);
    expect(empalmeCompresionColumna(350, 'espiral')).toBe(300);
    expect(areaEstribosMinimaEmpalmeColumna(500, 100)).toBeCloseTo(75, 10);
  });

  it('columnas en tracción (C.12.17.2.2 y .3)', () => {
    expect(claseEmpalmeColumnaTraccion({ fraccionFy: 0.4, fraccionEmpalmada: 0.5, escalonados: true })).toBe('A');
    expect(claseEmpalmeColumnaTraccion({ fraccionFy: 0.4, fraccionEmpalmada: 0.5, escalonados: false })).toBe('B');
    expect(claseEmpalmeColumnaTraccion({ fraccionFy: 0.4, fraccionEmpalmada: 1, escalonados: true })).toBe('B');
    expect(claseEmpalmeColumnaTraccion({ fraccionFy: 0.51, fraccionEmpalmada: 0.25, escalonados: true })).toBe('B');
  });

  it('malla: corrugada mayor de 1.3 ℓd y 200 mm; lisa según C.12.19', () => {
    expect(empalmeMallaCorrugada(300)).toBe(390);
    expect(empalmeMallaCorrugada(100)).toBe(200);
    expect(empalmeMallaLisa(200, 150, false)).toBe(300); // 1.5·200 = 300 > 150+50 = 200 > 150
    expect(empalmeMallaLisa(100, 200, false)).toBe(250); // 200 + 50 = 250 > 150 > 150
    expect(empalmeMallaLisa(20, 100, true)).toBe(50);
    expect(empalmeMallaLisa(200, 100, true)).toBe(300);
  });

  it('separación transversal máxima de traslapos en flexión: menor de ℓ/5 y 150 mm', () => {
    expect(separacionTransversalMaximaTraslapo(1083.7)).toBe(150); // ℓ/5 = 216.7
    expect(separacionTransversalMaximaTraslapo(600)).toBe(120);
  });
});
