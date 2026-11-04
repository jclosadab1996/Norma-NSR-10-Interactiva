import { describe, expect, it } from 'vitest';
import { buscarBarra } from '../../data/refuerzoDetalles';
import {
  alturaUtilAproximada,
  areaRetraccion,
  cuantiaRetraccion,
  diametroDobladoMalla,
  diametroEquivalentePaquete,
  diametroMinimoDoblado,
  estriboMinimoColumna,
  extensionEstribo90,
  ganchoEstandar,
  longitudTraslapoEspiral,
  paqueteValido,
  pasoEspiralValido,
  recubrimientoMinimo,
  recubrimientoPaquete,
  recubrimientoPreesforzadoCorrosivo,
  recubrimientoPreesforzadoSitio,
  refuerzoIntegridadPerimetro,
  separacionLibreMinima,
  separacionMaximaEstribos,
  separacionMaximaFlexionLosa,
  separacionMaximaLosaDosDireccionesCritica,
  separacionMaximaTemperatura,
  separacionRetraccion,
  toleranciaColocacion,
  verificarCapa,
} from './refuerzoDetalles';

const b = (id: string) => buscarBarra(id)!;

describe('diámetros mínimos de doblado (Tabla C.7.2, C.7.2.2)', () => {
  it('No. 3 a No. 8: 6db', () => {
    expect(diametroMinimoDoblado(b('No.6')).mm).toBeCloseTo(6 * 19.1, 9);
    expect(diametroMinimoDoblado(b('25M')).factor).toBe(6);
  });
  it('No. 9 a No. 11: 8db; No. 14 y No. 18: 10db', () => {
    expect(diametroMinimoDoblado(b('No.9')).factor).toBe(8);
    expect(diametroMinimoDoblado(b('36M')).factor).toBe(8);
    expect(diametroMinimoDoblado(b('No.14')).factor).toBe(10);
    expect(diametroMinimoDoblado(b('No.18')).mm).toBeCloseTo(573, 9);
  });
  it('estribos No. 5 (16M) y menores: 4db; mayores siguen la tabla', () => {
    expect(diametroMinimoDoblado(b('No.3'), true).mm).toBeCloseTo(38, 9);
    expect(diametroMinimoDoblado(b('16M'), true).mm).toBe(64);
    expect(diametroMinimoDoblado(b('No.6'), true).factor).toBe(6);
  });
  it('la tabla no cubre barras menores que No. 3 como barras longitudinales', () => {
    const r = diametroMinimoDoblado(b('No.2'));
    expect(r.mm).toBeNull();
    expect(r.factor).toBeNull();
    // pero un estribo No. 2 sí tiene regla (4db)
    expect(diametroMinimoDoblado(b('No.2'), true).mm).toBeCloseTo(25.6, 9);
  });
  it('malla electrosoldada para estribos (C.7.2.3)', () => {
    expect(diametroDobladoMalla(8, true)).toBe(32);
    expect(diametroDobladoMalla(7.1, true)).toBeCloseTo(14.2, 9);
    expect(diametroDobladoMalla(8, false)).toBe(16);
  });
});

describe('ganchos estándar (C.7.1)', () => {
  it('gancho de 180°: 4db pero no menos de 65 mm', () => {
    const g = ganchoEstandar('estandar-180', b('No.4')); // 4·12.7 = 50.8 < 65
    expect(g.extensionMm).toBe(65);
    const g2 = ganchoEstandar('estandar-180', b('No.8')); // 4·25.4 = 101.6
    expect(g2.extensionMm).toBeCloseTo(101.6, 9);
  });
  it('gancho de 90°: 12db', () => {
    const g = ganchoEstandar('estandar-90', b('No.6'));
    expect(g.extensionMm).toBeCloseTo(12 * 19.1, 9);
    expect(g.diametroDobladoMm).toBeCloseTo(6 * 19.1, 9);
  });
  it('longitud desarrollada = π(D+db)/2·θ/180 + extensión (criterio propio)', () => {
    const g = ganchoEstandar('estandar-180', b('No.6'));
    const D = 6 * 19.1;
    expect(g.longitudDesarrolladaMm).toBeCloseTo((Math.PI * (D + 19.1)) / 2 + 4 * 19.1, 6);
    const g90 = ganchoEstandar('estandar-90', b('No.6'));
    expect(g90.longitudDesarrolladaMm).toBeCloseTo((Math.PI * (D + 19.1)) / 4 + 12 * 19.1, 6);
  });
  it('estribos: 90° con 6db (≤No.5) o 12db (No.6–No.8); no definido por encima de No.8', () => {
    expect(extensionEstribo90(b('No.3'))).toEqual({ factor: 6, ambiguo: false });
    expect(extensionEstribo90(b('No.5'))).toEqual({ factor: 6, ambiguo: false });
    expect(extensionEstribo90(b('20M'))).toEqual({ factor: 12, ambiguo: false });
    expect(extensionEstribo90(b('18M'))).toEqual({ factor: 12, ambiguo: true });
    expect(extensionEstribo90(b('No.9'))).toBeNull();
    expect(ganchoEstandar('estribo-90', b('No.9')).valido).toBe(false);
  });
  it('estribo 135°: 6db y válido hasta No. 8', () => {
    const g = ganchoEstandar('estribo-135', b('No.3'));
    expect(g.valido).toBe(true);
    expect(g.extensionMm).toBeCloseTo(57, 9);
    expect(g.diametroDobladoMm).toBeCloseTo(38, 9); // 4db
    expect(ganchoEstandar('estribo-135', b('No.9')).valido).toBe(false);
  });
  it('gancho sísmico: 6db pero no menos de 75 mm', () => {
    expect(ganchoEstandar('sismico-135', b('No.3')).extensionMm).toBe(75); // 6·9.5 = 57
    expect(ganchoEstandar('sismico-135', b('No.4')).extensionMm).toBeCloseTo(76.2, 9); // 6·12.7
    expect(ganchoEstandar('sismico-suplementario-90', b('No.3')).extensionMm).toBeCloseTo(57, 9);
  });
});

describe('tolerancias (C.7.5.2.1)', () => {
  it('d ≤ 200 mm: ±10, recubrimiento −10 limitado a 1/3 del especificado', () => {
    const t = toleranciaColocacion(180, 40);
    expect(t.tolD).toBe(10);
    expect(t.tolRecubrimiento).toBe(10); // 40/3 = 13.3 > 10 → gobierna 10
  });
  it('recubrimiento pequeño: gobierna 1/3', () => {
    const t = toleranciaColocacion(150, 20); // 20/3 = 6.67 < 10
    expect(t.tolRecubrimiento).toBeCloseTo(20 / 3, 9);
    expect(t.recubrimientoMinimoObra).toBeCloseTo(20 - 20 / 3, 9);
  });
  it('d > 200 mm: ±13; fondo de cimbra: −6 mm', () => {
    expect(toleranciaColocacion(400, 75).tolD).toBe(13);
    expect(toleranciaColocacion(400, 75).tolRecubrimiento).toBe(13);
    expect(toleranciaColocacion(400, 40, true).tolRecubrimiento).toBe(6);
  });
});

describe('separación del refuerzo (C.7.6)', () => {
  it('distancia libre mínima: flexión db ≥ 25 mm; compresión 1.5db ≥ 40 mm', () => {
    expect(separacionLibreMinima(19.1)).toBe(25);
    expect(separacionLibreMinima(32.3)).toBeCloseTo(32.3, 9);
    expect(separacionLibreMinima(19.1, 'compresion')).toBe(40);
    expect(separacionLibreMinima(35.8, 'compresion')).toBeCloseTo(53.7, 9);
  });
  it('paquete: diámetro equivalente db·√n y recubrimiento ≤ 50 mm (75 contra el suelo)', () => {
    expect(diametroEquivalentePaquete(25.4, 4)).toBeCloseTo(50.8, 9);
    expect(recubrimientoPaquete(25.4, 4)).toBe(50);
    expect(recubrimientoPaquete(19.1, 2)).toBeCloseTo(19.1 * Math.SQRT2, 9);
    expect(recubrimientoPaquete(19.1, 2, true)).toBe(75);
    expect(paqueteValido(5, b('No.6'), true).valido).toBe(false);
    expect(paqueteValido(3, b('No.14'), true).valido).toBe(false);
    expect(paqueteValido(3, b('No.14'), false).valido).toBe(true);
  });
  it('viga de 300 mm con 4 No. 6, estribo No. 3 y recubrimiento 40 mm', () => {
    const v = verificarCapa({ b: 300, recubrimiento: 40, dEstribo: 9.5, n: 4, db: 19.1 });
    expect(v.anchoInterior).toBeCloseTo(201, 9);
    expect(v.libre).toBeCloseTo((201 - 4 * 19.1) / 3, 9);
    expect(v.minima).toBe(25);
    expect(v.cumple).toBe(true);
    expect(v.nMax).toBe(5);
  });
  it('viga de 250 mm con 4 No. 8: no cumple', () => {
    const v = verificarCapa({ b: 250, recubrimiento: 40, dEstribo: 9.5, n: 4, db: 25.4 });
    expect(v.libre).toBeCloseTo((250 - 80 - 19 - 101.6) / 3, 9);
    expect(v.cumple).toBe(false);
    expect(v.anchoMinimo).toBeGreaterThan(250);
  });
  it('nMax y anchoMinimo son coherentes', () => {
    const e = { b: 300, recubrimiento: 40, dEstribo: 9.5, db: 19.1 } as const;
    const nMax = verificarCapa({ ...e, n: 2 }).nMax;
    expect(verificarCapa({ ...e, n: nMax }).cumple).toBe(true);
    expect(verificarCapa({ ...e, n: nMax + 1 }).cumple).toBe(false);
    expect(verificarCapa({ ...e, n: nMax }).anchoMinimo).toBeLessThanOrEqual(300);
    expect(verificarCapa({ ...e, n: nMax + 1 }).anchoMinimo).toBeGreaterThan(300);
  });
  it('columna: 1.5db y 40 mm', () => {
    const v = verificarCapa({ b: 400, recubrimiento: 40, dEstribo: 9.5, n: 4, db: 25.4, tipo: 'compresion' });
    expect(v.minima).toBeCloseTo(40, 9); // 1.5·25.4 = 38.1 < 40
    expect(v.libre).toBeCloseTo((400 - 80 - 19 - 101.6) / 3, 9);
    expect(v.cumple).toBe(true);
  });
  it('tamaño máximo del agregado ≤ 3/4 del espaciamiento libre (C.3.3.2)', () => {
    const v = verificarCapa({ b: 300, recubrimiento: 40, dEstribo: 9.5, n: 4, db: 19.1, tamanoAgregado: 19 });
    expect(v.agregadoMaximoPermitido).toBeCloseTo(0.75 * v.libre!, 9);
    expect(v.agregadoCumple).toBe(true); // 0.75·41.5 = 31.1 ≥ 19
  });
  it('separaciones máximas de losas', () => {
    expect(separacionMaximaFlexionLosa(120)).toBe(360);
    expect(separacionMaximaFlexionLosa(200)).toBe(450);
    expect(separacionMaximaLosaDosDireccionesCritica(150)).toBe(300);
    expect(separacionMaximaTemperatura(120)).toBe(450);
    expect(separacionMaximaTemperatura(80)).toBe(400);
  });
});

describe('recubrimientos (C.7.7)', () => {
  it('C.7.7.1: contra el suelo 75 mm', () => {
    expect(recubrimientoMinimo('suelo', 'losa-muro-vigueta', b('No.4')).mm).toBe(75);
  });
  it('C.7.7.1: a la intemperie 50 mm (No. 6 y mayores) o 40 mm (No. 5 y menores)', () => {
    expect(recubrimientoMinimo('intemperie', 'viga-columna', b('No.6')).mm).toBe(50);
    expect(recubrimientoMinimo('intemperie', 'viga-columna', b('No.5')).mm).toBe(40);
    expect(recubrimientoMinimo('intemperie', 'losa-muro-vigueta', b('16M')).mm).toBe(40);
    expect(recubrimientoMinimo('intemperie', 'losa-muro-vigueta', b('18M')).mm).toBe(50);
  });
  it('C.7.7.1: interior', () => {
    expect(recubrimientoMinimo('interior', 'viga-columna', b('No.8')).mm).toBe(40);
    expect(recubrimientoMinimo('interior', 'losa-muro-vigueta', b('No.4')).mm).toBe(20);
    expect(recubrimientoMinimo('interior', 'losa-muro-vigueta', b('No.11')).mm).toBe(20);
    expect(recubrimientoMinimo('interior', 'losa-muro-vigueta', b('No.14')).mm).toBe(40);
    expect(recubrimientoMinimo('interior', 'cascara', b('No.6')).mm).toBe(20);
    expect(recubrimientoMinimo('interior', 'cascara', b('No.5')).mm).toBe(13);
  });
  it('C.7.7.2 (preesforzado en sitio)', () => {
    expect(recubrimientoPreesforzadoSitio('suelo', 'viga-columna', 'principal').mm).toBe(75);
    expect(recubrimientoPreesforzadoSitio('intemperie', 'losa-muro-vigueta', 'principal').mm).toBe(25);
    expect(recubrimientoPreesforzadoSitio('intemperie', 'viga-columna', 'principal').mm).toBe(40);
    expect(recubrimientoPreesforzadoSitio('interior', 'losa-muro-vigueta', 'principal').mm).toBe(20);
    expect(recubrimientoPreesforzadoSitio('interior', 'viga-columna', 'principal').mm).toBe(40);
    expect(recubrimientoPreesforzadoSitio('interior', 'viga-columna', 'estribos').mm).toBe(25);
    expect(recubrimientoPreesforzadoSitio('interior', 'cascara', 'principal', b('No.5')).mm).toBe(10);
    expect(recubrimientoPreesforzadoSitio('interior', 'cascara', 'principal', b('No.9')).mm).toBe(28.7);
    expect(recubrimientoPreesforzadoSitio('interior', 'cascara', 'principal', b('No.6')).mm).toBe(20);
  });
  it('C.7.7.6.1: 1.5 veces', () => {
    expect(recubrimientoPreesforzadoCorrosivo(40)).toBe(60);
  });
  it('altura útil aproximada', () => {
    expect(alturaUtilAproximada(500, 40, 9.5, 19.1)).toBeCloseTo(500 - 40 - 9.5 - 9.55, 9);
  });
});

describe('estribos y espirales de columna (C.7.10)', () => {
  it('estribo mínimo: No. 3 hasta No. 10, No. 4 desde No. 11 y en paquetes', () => {
    expect(estriboMinimoColumna(b('No.10')).eqMinimo).toBe(3);
    expect(estriboMinimoColumna(b('No.11')).eqMinimo).toBe(4);
    expect(estriboMinimoColumna(b('No.6'), true).eqMinimo).toBe(4);
    expect(estriboMinimoColumna(b('No.6'), false, true).eqMinimo).toBe(2);
  });
  it('separación máxima: mín(16 db, 48 de, menor dimensión)', () => {
    expect(separacionMaximaEstribos(19.1, 9.5, 400)).toEqual({ s: 16 * 19.1, gobierna: 'longitudinal' });
    expect(separacionMaximaEstribos(25.4, 9.5, 300).gobierna).toBe('dimension'); // 406, 456, 300
  });
  it('traslapo de espiral: máx(300 mm, factor·db)', () => {
    expect(longitudTraslapoEspiral('1', 10)).toBe(480);
    expect(longitudTraslapoEspiral('2', 10)).toBe(720);
    expect(longitudTraslapoEspiral('1', 6)).toBe(300);
  });
  it('paso libre de espiral 25–75 mm', () => {
    expect(pasoEspiralValido(25)).toBe(true);
    expect(pasoEspiralValido(75)).toBe(true);
    expect(pasoEspiralValido(24)).toBe(false);
    expect(pasoEspiralValido(80)).toBe(false);
  });
});

describe('retracción y temperatura (C.7.12.2.1)', () => {
  it('Grado 280/350 → 0.0020; Grado 420 o malla → 0.0018', () => {
    expect(cuantiaRetraccion(280)).toEqual({ cuantia: 0.002, regla: 'a' });
    expect(cuantiaRetraccion(350)).toEqual({ cuantia: 0.002, regla: 'a' });
    expect(cuantiaRetraccion(420)).toEqual({ cuantia: 0.0018, regla: 'b' });
    expect(cuantiaRetraccion(420, 'malla')).toEqual({ cuantia: 0.0018, regla: 'b' });
    expect(cuantiaRetraccion(240, 'malla')).toEqual({ cuantia: 0.0018, regla: 'b' });
  });
  it('fy > 420: 0.0018·420/fy, nunca menos de 0.0014', () => {
    const r = cuantiaRetraccion(520);
    expect(r.regla).toBe('c');
    expect(r.cuantia).toBeCloseTo((0.0018 * 420) / 520, 12);
    // 0.0018·420/600 = 0.00126 < 0.0014 → gobierna el mínimo absoluto
    expect(cuantiaRetraccion(600).cuantia).toBe(0.0014);
  });
  it('valores de fy no cubiertos lanzan RangeError', () => {
    expect(() => cuantiaRetraccion(240)).toThrow(RangeError);
    expect(() => cuantiaRetraccion(380)).toThrow(RangeError);
  });
  it('área y separación', () => {
    expect(areaRetraccion(0.0018, 120)).toBeCloseTo(216, 9);
    const s = separacionRetraccion(71, 120, 0.0018);
    expect(s.areaPorMetro).toBeCloseTo(216, 9);
    expect(s.calculada).toBeCloseTo((71 * 1000) / 216, 9);
    expect(s.maxima).toBe(450);
    expect(s.propuesta).toBe(325);
  });
  it('si el área exige menos barras que el límite, gobierna 5h/450', () => {
    const s = separacionRetraccion(284, 100, 0.0018); // calculada = 284/0.18 = 1578 mm; 5h = 450
    expect(s.propuesta).toBe(450);
  });
});

describe('integridad estructural (C.7.13.2.2)', () => {
  it('perímetro: 1/6 del negativo y 1/4 del positivo, mínimo 2 barras', () => {
    const r = refuerzoIntegridadPerimetro(1200, 800);
    expect(r.asNegContinuo).toBeCloseTo(200, 9);
    expect(r.asPosContinuo).toBeCloseTo(200, 9);
    expect(r.barrasMinimas).toBe(2);
  });
});
