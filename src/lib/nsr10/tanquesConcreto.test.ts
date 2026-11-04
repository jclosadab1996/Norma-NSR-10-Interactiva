import { describe, expect, it } from 'vitest';
import {
  aplicaSd,
  anchoMinimoBarrera,
  betaGradiente,
  betaSimplificado,
  brazoInternoFisurado,
  cementanteMinimo,
  claseSulfatoAmbiental,
  clasificarExposicion,
  coeficienteDurabilidad,
  cortanteNominalAmbiental,
  cuantiaRetraccionAmbiental,
  direccionesLosa,
  esfuerzoServicioFlexion,
  espesorLosaMembrana,
  espesorMinimoLosaSobreTerreno,
  espesorMinimoMuroAmbiental,
  espesorMinimoMuroContactoLiquido,
  exentoRefuerzoMinimo,
  fsDurabilidad,
  fsMaximoFisuracion,
  gammaCarga,
  muroRequiereDosCapas,
  recubrimientoAmbiental,
  recubrimientoInferiorLosaTerreno,
  refuerzoRetraccionAmbiental,
  requisitoMezclaAmbiental,
  separacionMaximaApariencia,
  separacionMaximaBarrasMembrana,
  separacionParaArea,
  verificarAbrasion,
  verificarDetalleRetraccion,
  verificarMezclaAmbiental,
} from './tanquesConcreto';
import { moduloElasticidad } from './concreto';

describe('C.23-C.4: durabilidad', () => {
  it('cementante mínimo: valores tabulados e interpolación', () => {
    expect([38, 25, 20, 13, 10].map(cementanteMinimo)).toEqual([320, 330, 350, 360, 370]);
    expect(cementanteMinimo(22.5)).toBeCloseTo(340, 9); // mitad entre 330 y 350
    expect(cementanteMinimo(16.5)).toBeCloseTo(355, 9); // mitad entre 350 y 360
    expect(() => cementanteMinimo(50)).toThrow();
  });
  it('Tabla C.23-C.4.3.1: a/mc y f′c por clase', () => {
    expect(requisitoMezclaAmbiental('S1')).toMatchObject({ aMcMax: 0.42, fcMin: 31 });
    expect(requisitoMezclaAmbiental('S2')).toMatchObject({ aMcMax: 0.4, fcMin: 35 });
    expect(requisitoMezclaAmbiental('P1')).toMatchObject({ aMcMax: 0.45, fcMin: 28 });
    expect(verificarMezclaAmbiental('S1', 0.45, 31).cumpleAMc).toBe(false);
    expect(verificarMezclaAmbiental('S1', 0.42, 31).cumple).toBe(true);
    expect(verificarMezclaAmbiental('Q1', 0.4, 28).cumpleFc).toBe(false);
  });
  it('clase de sulfato reutiliza C.4 (0.10 / 0.20 / 2.00 %)', () => {
    expect(claseSulfatoAmbiental(0.15)).toBe('S1');
    expect(claseSulfatoAmbiental(undefined, 3000)).toBe('S2');
  });
  it('abrasión: 35 MPa, 0.40, aire 6 % (3 % sin congelamiento), 380 kg/m³', () => {
    expect(verificarAbrasion({ fc: 35, aMc: 0.4, airePct: 3, cementanteKgM3: 380, congelamiento: false }).cumple).toBe(true);
    expect(verificarAbrasion({ fc: 35, aMc: 0.4, airePct: 4, cementanteKgM3: 380, congelamiento: false }).fallas).toEqual(['aire > 3 %']);
    expect(verificarAbrasion({ fc: 30, aMc: 0.45, airePct: 5, cementanteKgM3: 350, congelamiento: true }).fallas).toHaveLength(3);
  });
  it('barreras: 220 mm en expansión, 150 mm en otras', () => {
    expect(anchoMinimoBarrera(true)).toBe(220);
    expect(anchoMinimoBarrera(false)).toBe(150);
  });
});

describe('C.23-C.7.7: recubrimientos (Tabla C.23-C.7.7.1)', () => {
  it('valores de la tabla', () => {
    expect(recubrimientoAmbiental({ condicion: 'a', elemento: 'contra la tierra', tipo: 'enSitio' })).toBe(75);
    expect(recubrimientoAmbiental({ condicion: 'a', elemento: 'contra la tierra', tipo: 'prefabricado' })).toBeNull();
    expect(recubrimientoAmbiental({ condicion: 'b', elemento: 'Muros', tipo: 'enSitio' })).toBe(50);
    expect(recubrimientoAmbiental({ condicion: 'b', elemento: 'Vigas y columnas', detalle: 'Refuerzo principal', tipo: 'enSitio' })).toBe(65);
    expect(recubrimientoAmbiental({ condicion: 'c', elemento: 'Vigas y columnas', detalle: 'Refuerzo principal', tipo: 'enSitio' })).toBe(50);
    expect(recubrimientoAmbiental({ condicion: 'c', elemento: 'Cascarones', detalle: 'No. 5', tipo: 'enSitio' })).toBe(13);
    expect(recubrimientoAmbiental({ condicion: 'c', elemento: 'Muros', detalle: 'No. 14', tipo: 'preesforzado' })).toBe(40);
  });
  it('combinaciones ambiguas o inexistentes lanzan error', () => {
    expect(() => recubrimientoAmbiental({ condicion: 'c', elemento: 'Muros', tipo: 'enSitio' })).toThrow();
    expect(() => recubrimientoAmbiental({ condicion: 'a', elemento: 'Muros', tipo: 'enSitio' })).toThrow();
  });
});

describe('C.23-C.7.12: refuerzo de retracción y temperatura', () => {
  it('cuantías de la Tabla C.23-C.7.12.2.1', () => {
    expect(cuantiaRetraccionAmbiental(4, 420)).toBe(0.003);
    expect(cuantiaRetraccionAmbiental(6, 420)).toBe(0.003);
    expect(cuantiaRetraccionAmbiental(7, 240)).toBe(0.004);
    expect(cuantiaRetraccionAmbiental(7, 420)).toBe(0.003);
    expect(cuantiaRetraccionAmbiental(10, 420)).toBe(0.004);
    expect(cuantiaRetraccionAmbiental(15, 240)).toBe(0.006);
    expect(cuantiaRetraccionAmbiental(15, 420)).toBe(0.005);
  });
  it('juntas de contracción parciales: distancia real × 1.5', () => {
    expect(cuantiaRetraccionAmbiental(4, 240, true)).toBe(0.004); // 6 m efectivos
    expect(cuantiaRetraccionAmbiental(8, 420, true)).toBe(0.005); // 12 m efectivos
  });
  it('fy distinto de 240 / 420 lanza error', () => {
    // @ts-expect-error valor fuera del tipo a propósito
    expect(() => cuantiaRetraccionAmbiental(5, 500)).toThrow();
  });
  it('área: muro h = 300, juntas a 8 m, fy 420 → ρ = 0.003, 900 mm²/m en total', () => {
    const r = refuerzoRetraccionAmbiental({ hMm: 300, distanciaM: 8, fy: 420 });
    expect(r.asTotalMm2PorM).toBeCloseTo(900, 9);
    expect(r.asPorCaraIgualMm2PorM).toBeCloseTo(450, 9);
    expect(r.asMinimaPorCaraMm2PorM).toBeCloseTo(300, 9);
  });
  it('espesor ≥ 600 mm: capas de 300 mm en cada superficie', () => {
    const r = refuerzoRetraccionAmbiental({ hMm: 700, distanciaM: 8, fy: 420 });
    expect(r.espesorCalculoMm).toBe(600);
    expect(r.asTotalMm2PorM).toBeCloseTo(1800, 9);
  });
  it('losa sobre el suelo: la cara inferior se reduce 50 %', () => {
    const r = refuerzoRetraccionAmbiental({ hMm: 250, distanciaM: 10, fy: 420, losaSobreSuelo: true });
    // ρ = 0.004 → 1000 mm²/m; por cara 500; inferior 250 → total 750
    expect(r.asTotalMm2PorM).toBeCloseTo(750, 9);
  });
  it('detalle: separación ≤ 300 y barra ≥ 12 mm', () => {
    expect(verificarDetalleRetraccion(300, 12).cumple).toBe(true);
    expect(verificarDetalleRetraccion(310, 12).cumpleSeparacion).toBe(false);
    expect(verificarDetalleRetraccion(250, 10).cumpleBarra).toBe(false);
    // Ab = 129 mm² (No. 4), As = 450 mm²/m → s = 129 000/450 = 286.7 mm
    expect(separacionParaArea(129, 450)).toBeCloseTo(286.667, 3);
  });
});

describe('C.23-C.9.2.6: coeficiente de durabilidad ambiental Sd (Ec. C.23-1)', () => {
  it('flexión, γ = 1.4, fs = 140 MPa: Sd = 0.90·420/(1.4·140) = 1.929', () => {
    const r = coeficienteDurabilidad(0.9, 420, 1.4, 140);
    expect(r.sd).toBeCloseTo(378 / 196, 9);
    expect(r.gobiernaMinimo).toBe(false);
  });
  it('cortante, γ = 1.4, fs = 170 MPa: Sd = 0.75·420/(1.4·170) = 1.324', () => {
    expect(coeficienteDurabilidad(0.75, 420, 1.4, 170).sd).toBeCloseTo(315 / 238, 9);
  });
  it('Sd nunca baja de 1.0', () => {
    const r = coeficienteDurabilidad(0.9, 420, 1.7, 250); // 378/425 = 0.889
    expect(r.sinAcotar).toBeCloseTo(0.8894, 4);
    expect(r.sd).toBe(1);
    expect(r.gobiernaMinimo).toBe(true);
  });
  it('fs permisibles de C.23-C.9.2.6.2 a .5', () => {
    expect(fsDurabilidad('traccion-directa', 'normal')).toBe(140);
    expect(fsDurabilidad('traccion-directa', 'severa')).toBe(120);
    expect(fsDurabilidad('cortante', 'normal')).toBe(170);
    expect(fsDurabilidad('cortante', 'severa')).toBe(140);
  });
  it('γ = U / carga no mayorada; Vn = Vc + Vs/Sd', () => {
    expect(gammaCarga(1.4 * 100, 100)).toBeCloseTo(1.4, 9);
    expect(cortanteNominalAmbiental(60, 40, 2)).toBe(80);
    expect(() => gammaCarga(10, 0)).toThrow();
  });
  it('cuándo no se aplica Sd', () => {
    expect(aplicaSd({})).toBe(true);
    expect(aplicaSd({ incluyeSismo: true })).toBe(false);
    expect(aplicaSd({ controladaPorCompresion: true })).toBe(false);
    expect(aplicaSd({ preesforzadoOAnclaje: true })).toBe(false);
    expect(aplicaSd({ cargasDeServicio: true })).toBe(false);
  });
  it('refuerzo mínimo: exento si As ≥ 4/3 del requerido', () => {
    expect(exentoRefuerzoMinimo(1334, 1000)).toBe(true);
    expect(exentoRefuerzoMinimo(1300, 1000)).toBe(false);
  });
});

describe('C.23-C.10.6: control de fisuración (Ecs. C.23-2 a C.23-5)', () => {
  it('con el término simplificado y s = 300: √(300² + 15625) = 325', () => {
    // exposición normal, β = 1: 57 000/325 = 175.38
    const r = fsMaximoFisuracion({ s: 300, db: 25, beta: 1, exposicion: 'normal', direcciones: 'una', simplificado: true });
    expect(r.fsCalculado).toBeCloseTo(57000 / 325, 9);
    expect(r.fsMax).toBeCloseTo(175.3846, 3);
    // β = 1.2 → 146.15 (por encima del piso de 140 de una dirección)
    expect(fsMaximoFisuracion({ s: 300, db: 25, beta: 1.2, exposicion: 'normal', direcciones: 'una', simplificado: true }).fsMax).toBeCloseTo(146.1538, 3);
  });
  it('el piso de dos direcciones (170 MPa) sube el valor calculado', () => {
    const r = fsMaximoFisuracion({ s: 300, db: 25, beta: 1.2, exposicion: 'normal', direcciones: 'dos', simplificado: true });
    expect(r.gobiernaPiso).toBe(true);
    expect(r.fsMax).toBe(170);
  });
  it('exposición severa: 46 500/(1.2·325) = 119.2 → piso de 120 (una dirección) o 140 (dos)', () => {
    const una = fsMaximoFisuracion({ s: 300, db: 25, beta: 1.2, exposicion: 'severa', direcciones: 'una', simplificado: true });
    expect(una.fsCalculado).toBeCloseTo(46500 / 390, 9);
    expect(una.fsMax).toBe(120);
    expect(fsMaximoFisuracion({ s: 300, db: 25, beta: 1.2, exposicion: 'severa', direcciones: 'dos', simplificado: true }).fsMax).toBe(140);
  });
  it('tope absoluto de 250 MPa con separaciones pequeñas', () => {
    const r = fsMaximoFisuracion({ s: 50, db: 25, beta: 1, exposicion: 'normal', direcciones: 'una', simplificado: true });
    expect(r.fsCalculado).toBeGreaterThan(400);
    expect(r.fsMax).toBe(250);
    expect(r.gobiernaTope).toBe(true);
  });
  it('término exacto 4(50 + db/2)²: db = 25 mm equivale a 15 625', () => {
    const exacto = fsMaximoFisuracion({ s: 200, db: 25, beta: 1.2, exposicion: 'normal', direcciones: 'una' });
    const simp = fsMaximoFisuracion({ s: 200, db: 25, beta: 1.2, exposicion: 'normal', direcciones: 'una', simplificado: true });
    expect(exacto.fsCalculado).toBeCloseTo(simp.fsCalculado, 9);
  });
  it('β exacto y simplificado', () => {
    expect(betaGradiente(300, 60, 250)).toBeCloseTo(240 / 190, 9);
    expect(betaSimplificado(400)).toBe(1.2);
    expect(betaSimplificado(399)).toBe(1.35);
  });
  it('clasificación de exposición: pH > 5 y sulfatos ≤ 1000 ppm es normal', () => {
    expect(clasificarExposicion({ ph: 7, sulfatosPpm: 800 })).toBe('normal');
    expect(clasificarExposicion({ ph: 4.5 })).toBe('severa');
    expect(clasificarExposicion({ ph: 7, sulfatosPpm: 1001 })).toBe('severa');
    expect(clasificarExposicion({ ph: 5 })).toBe('severa'); // pH debe ser mayor de 5
    expect(clasificarExposicion({})).toBe('normal');
  });
  it('una o dos direcciones por la relación de lados', () => {
    expect(direccionesLosa(8, 4)).toBe('dos');
    expect(direccionesLosa(8.1, 4)).toBe('una');
  });
  it('esfuerzo de servicio fs = M/(As·jd)', () => {
    // 60 kN·m / (1000 mm²·200 mm) = 300 MPa
    expect(esfuerzoServicioFlexion(60, 1000, 200)).toBeCloseTo(300, 9);
  });
  it('brazo interno fisurado: x > 0 y jd = d − x/3 < d', () => {
    const r = brazoInternoFisurado({ bMm: 1000, dMm: 250, asMm2: 1000, ecMpa: moduloElasticidad(28) });
    expect(r.x).toBeGreaterThan(0);
    expect(r.brazo).toBeCloseTo(250 - r.x / 3, 9);
    expect(r.brazo).toBeLessThan(250);
  });
  it('C.23-5: s = 380(280/fs) − 2.5 cc ≤ 300', () => {
    expect(separacionMaximaApariencia(280, 80)).toBeCloseTo(180, 9);
    expect(separacionMaximaApariencia(200, 80)).toBe(300);
  });
});

describe('C.23-C.14 y C.23-C.15.14: muros y losas', () => {
  it('muros de carga (empírico): máx(menor/25, 200)', () => {
    expect(espesorMinimoMuroAmbiental({ tipo: 'carga', alturaMm: 4000 })).toBe(200);
    expect(espesorMinimoMuroAmbiental({ tipo: 'carga', alturaMm: 6000, longitudMm: 7500 })).toBe(240);
  });
  it('muros sin carga: máx(150, distancia/30)', () => {
    expect(espesorMinimoMuroAmbiental({ tipo: 'no-carga', alturaMm: 3000 })).toBe(150);
    expect(espesorMinimoMuroAmbiental({ tipo: 'no-carga', alturaMm: 6000 })).toBe(200);
  });
  it('muros en contacto con líquidos de más de 3 m: 300 mm; dos capas si h > 250', () => {
    expect(espesorMinimoMuroContactoLiquido(3500)).toBe(300);
    expect(espesorMinimoMuroContactoLiquido(3000)).toBeNull();
    expect(muroRequiereDosCapas(250)).toBe(false);
    expect(muroRequiereDosCapas(251)).toBe(true);
  });
  it('losas sobre el terreno y membrana', () => {
    expect(espesorMinimoLosaSobreTerreno('una-capa')).toBe(100);
    expect(espesorMinimoLosaSobreTerreno('preesforzada')).toBe(125);
    expect(espesorMinimoLosaSobreTerreno('dos-capas')).toBe(150);
    expect(espesorLosaMembrana('electrosoldado')).toEqual({ min: 75, max: 150 });
    expect(espesorLosaMembrana('preesforzada')).toEqual({ min: 125, max: 175 });
    expect(recubrimientoInferiorLosaTerreno(true)).toBe(40);
    expect(recubrimientoInferiorLosaTerreno(false)).toBe(50);
    expect(separacionMaximaBarrasMembrana(100)).toBe(200);
    expect(separacionMaximaBarrasMembrana(150)).toBe(300);
  });
});
