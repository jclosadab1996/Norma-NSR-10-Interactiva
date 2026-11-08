import { describe, expect, it } from 'vitest';
import {
  areaBarras,
  areaMinimaMuros,
  areaMuros,
  bloqueHorizontalPermitido,
  densidadPorNivel,
  distanciaMaximaVigas,
  longitudZonaConfinada,
  nEfectivo,
  resistenciaMinimaUnidad,
  separacionMaximaColumnas,
  separacionMaximaEstribos,
  todasCumplen,
  verificarCintaConcreto,
  verificarColumna,
  verificarDensidad,
  verificarMuroUnidades,
  verificarViga,
  type DatosColumna,
  type DatosViga,
} from './muroConfinadoRefuerzo';

const val = (r: { verificaciones: { id: string; cumple: boolean | null }[] }, id: string) => r.verificaciones.find((v) => v.id === id)?.cumple;

describe('D.10.3.4 — densidad mínima de muros (Ec. D.10.3-1: Am ≥ N·Aa·Ap/20)', () => {
  it('área mínima', () => {
    expect(areaMinimaMuros(3, 0.25, 120)).toBeCloseTo(4.5, 10);
    expect(areaMinimaMuros(0, 0.25, 120)).toBe(0);
  });

  it('convención de N', () => {
    expect(nEfectivo(2)).toBe(2);
    expect(nEfectivo(2, 'incluye-nivel')).toBe(3);
  });

  it('área de muros de una dirección en m²', () => {
    expect(areaMuros([{ longitud: 4, espesor: 120 }, { longitud: 3, espesor: 150 }])).toBeCloseTo(0.93, 10);
  });

  it('verificación de un nivel', () => {
    const r = verificarDensidad({ nivelesArriba: 3, Aa: 0.25, Ap: 120, Am: 5 });
    expect(r.N).toBe(3);
    expect(r.Amin).toBeCloseTo(4.5, 10);
    expect(r.cumple).toBe(true);
    expect(r.razon).toBeCloseTo(1.1111111, 6);
    expect(r.densidad).toBeCloseTo(0.0416667, 6);
    expect(r.densidadMin).toBeCloseTo(0.0375, 10);
    expect(verificarDensidad({ nivelesArriba: 3, Aa: 0.25, Ap: 120, Am: 4 }).cumple).toBe(false);
  });

  it('tabla por nivel, edificio de 3 pisos (Ap = 100 m², Am = 2 m², Aa = 0.25)', () => {
    const t = densidadPorNivel({ pisos: 3, Aa: 0.25, Ap: 100, Am: 2 });
    expect(t.map((f) => f.nivelesArriba)).toEqual([2, 1, 0]);
    expect(t.map((f) => f.Amin)).toEqual([2.5, 1.25, 0]);
    expect(t.map((f) => f.cumple)).toEqual([false, true, true]);
    expect(t[2].razon).toBe(Infinity);
    const t2 = densidadPorNivel({ pisos: 3, Aa: 0.25, Ap: 100, Am: 2, convencion: 'incluye-nivel' });
    expect(t2.map((f) => f.Amin)).toEqual([3.75, 2.5, 1.25]);
    expect(t2.map((f) => f.cumple)).toEqual([false, false, true]);
  });
});

describe('D.10.3.2 y D.10.3.3 — unidades y muro', () => {
  it('Tabla D.10.3-1', () => {
    expect(resistenciaMinimaUnidad('tolete-arcilla')).toBe(15);
    expect(resistenciaMinimaUnidad('bloque-horizontal-arcilla')).toBe(3);
    expect(resistenciaMinimaUnidad('bloque-vertical')).toBe(5);
  });

  it('restricción del bloque de perforación horizontal (D.10.3.2.2)', () => {
    expect(bloqueHorizontalPermitido(2, 2)).toBe(true);
    expect(bloqueHorizontalPermitido(1, 1)).toBe(true);
    expect(bloqueHorizontalPermitido(4, 2)).toBe(true);
    expect(bloqueHorizontalPermitido(4, 3)).toBe(false);
  });

  it('muro de bloque de perforación vertical que cumple', () => {
    const v = verificarMuroUnidades({ tipoUnidad: 'bloque-vertical', fcu: 6, espesor: 120, alturaLibre: 2400 });
    expect(v.map((x) => x.cumple)).toEqual([true, true, true]);
    expect(v[1].provisto).toBe('20.0');
    expect(todasCumplen(v)).toBe(true);
  });

  it('muro que falla por resistencia, esbeltez y espesor', () => {
    const v = verificarMuroUnidades({ tipoUnidad: 'tolete-arcilla', fcu: 12, espesor: 100, alturaLibre: 2600 });
    expect(v.map((x) => x.cumple)).toEqual([false, false, false]);
    expect(todasCumplen(v)).toBe(false);
  });

  it('bloque horizontal: uso en el piso y Pu/Ae ≤ 0.15 f′m', () => {
    const base = { tipoUnidad: 'bloque-horizontal-arcilla' as const, fcu: 4, espesor: 120, alturaLibre: 2400, fm: 4, Ae: 500000 };
    const ok = verificarMuroUnidades({ ...base, pisosTotales: 4, nivelDesdeArriba: 2, Pu: 100000 });
    expect(ok.map((x) => x.cumple)).toEqual([true, true, true, true, true]);
    const mal = verificarMuroUnidades({ ...base, pisosTotales: 4, nivelDesdeArriba: 3, Pu: 400000 });
    expect(mal.find((x) => x.id === 'perm-horizontal')?.cumple).toBe(false);
    expect(mal.find((x) => x.id === 'pu-ae')?.cumple).toBe(false); // 0.8 MPa > 0.6 MPa
  });
});

describe('D.10.5.3(c) y D.10.6.3 — ubicación', () => {
  it('separación máxima de columnas: el menor de 35t, 1.5·h y 4 m', () => {
    const a = separacionMaximaColumnas(120, 2400);
    expect([a.porEspesor, a.porAlturaVigas, a.porTope, a.max, a.rige]).toEqual([4200, 3600, 4000, 3600, 'altura']);
    expect(separacionMaximaColumnas(100, 3000).max).toBe(3500);
    expect(separacionMaximaColumnas(100, 3000).rige).toBe('espesor');
    expect(separacionMaximaColumnas(150, 4000).max).toBe(4000);
    expect(separacionMaximaColumnas(150, 4000).rige).toBe('tope');
  });

  it('distancia vertical máxima entre vigas = 25 t', () => {
    expect(distanciaMaximaVigas(120)).toBe(3000);
  });
});

describe('estribos', () => {
  it('separación máxima: menor de 1.5 × menor dimensión y 200 mm', () => {
    expect(separacionMaximaEstribos(120)).toBe(180);
    expect(separacionMaximaEstribos(200)).toBe(200);
  });

  it('longitud de la zona confinada: mayor de 450, 3·mayor dimensión y luz/6', () => {
    expect(longitudZonaConfinada(200, 2400)).toBe(600);
    expect(longitudZonaConfinada(150, 3600)).toBe(600);
    expect(longitudZonaConfinada(150, 2000)).toBe(450);
  });
});

describe('barras (Tablas C.3.5.3-1 y -2)', () => {
  it('área total', () => {
    expect(areaBarras(4, 'No.3')).toBe(284);
    expect(areaBarras(2, 'No.4')).toBe(258);
    expect(areaBarras(3, '10M')).toBeCloseTo(235.5, 10);
  });
});

const col: DatosColumna = {
  ancho: 120,
  largo: 200,
  espesorMuro: 120,
  fc: 21,
  nBarras: 4,
  barraId: 'No.3',
  estriboId: 'No.2',
  sepEstribos: 150,
  zona: 'alta',
  sepEstribosExtremo: 100,
  sepRamas: 120,
  luz: 2400,
};

describe('D.10.5 — columna de confinamiento', () => {
  it('columna 120 × 200 con 4 N° 3 y estribos N° 2: cumple', () => {
    const r = verificarColumna(col);
    expect(r.Ag).toBe(24000);
    expect(r.As).toBe(284);
    expect(r.cuantia).toBeCloseTo(0.0118333, 6);
    expect(r.AsMin).toBeCloseTo(180, 10);
    expect(r.sepEstribosMax).toBe(180);
    expect(r.longitudZona).toBe(600);
    expect(r.cumple).toBe(true);
    expect(r.verificaciones.every((v) => v.cumple === true)).toBe(true);
  });

  it('área menor a 20 000 mm² y concreto de 14 MPa', () => {
    const r = verificarColumna({ ...col, largo: 150, fc: 14 });
    expect(val(r, 'area')).toBe(false);
    expect(val(r, 'fc')).toBe(false);
    expect(r.cumple).toBe(false);
  });

  it('3 N° 3 en 200 × 200 no alcanza la cuantía 0.0075', () => {
    const r = verificarColumna({ ...col, ancho: 200, nBarras: 3, espesorMuro: 150 });
    expect(r.AsMin).toBe(300);
    expect(val(r, 'cuantia')).toBe(false);
    expect(val(r, 'n-barras')).toBe(true);
  });

  it('barras de 8M o 2 barras no cumplen el mínimo; 10M sí', () => {
    expect(val(verificarColumna({ ...col, barraId: '8M' }), 'db-long')).toBe(false);
    expect(val(verificarColumna({ ...col, barraId: '10M' }), 'db-long')).toBe(true);
    expect(val(verificarColumna({ ...col, nBarras: 2 }), 'n-barras')).toBe(false);
  });

  it('estribos: separación central, de extremo y ramas', () => {
    const r = verificarColumna({ ...col, sepEstribos: 190, sepEstribosExtremo: 120, sepRamas: 180 });
    expect(val(r, 's-estribo')).toBe(false);
    expect(val(r, 's-extremo')).toBe(false);
    expect(val(r, 'ramas')).toBe(false);
  });

  it('zona de amenaza baja no exige estribos de confinamiento en los extremos', () => {
    const r = verificarColumna({ ...col, zona: 'baja', sepEstribosExtremo: 150 });
    expect(r.verificaciones.some((v) => v.id === 's-extremo')).toBe(false);
    expect(r.longitudZona).toBeUndefined();
  });

  it('espesor de la columna menor que el del muro', () => {
    expect(val(verificarColumna({ ...col, ancho: 100, largo: 250 }), 'espesor')).toBe(false);
  });
});

const viga: DatosViga = {
  ancho: 120,
  alto: 200,
  espesorMuro: 120,
  fc: 21,
  nBarras: 3,
  barraId: 'No.3',
  estriboId: '6M',
  sepEstribos: 180,
  distanciaVertical: 2400,
};

describe('D.10.6 — viga de confinamiento', () => {
  it('viga 120 × 200 con 3 N° 3 y estribos 6M a 180 mm: cumple', () => {
    const r = verificarViga(viga);
    expect(r.Ag).toBe(24000);
    expect(r.As).toBe(213);
    expect(r.AsMin).toBeCloseTo(180, 10);
    expect(r.sepEstribosMax).toBe(180);
    expect(r.cumple).toBe(true);
  });

  it('con losa maciza el refuerzo mínimo son 2 N° 4 ó 12M', () => {
    const mal = verificarViga({ ...viga, losaMaciza: true });
    expect(val(mal, 'db-long')).toBe(false);
    const ok = verificarViga({ ...viga, losaMaciza: true, nBarras: 2, barraId: 'No.4' });
    expect(ok.As).toBe(258);
    expect(ok.cumple).toBe(true);
  });

  it('ancho menor de 110 mm: enchape permite reducir el ancho hasta 75 mm', () => {
    const base = { ...viga, ancho: 100, alto: 200, nBarras: 2, barraId: 'No.4', sepEstribos: 150 };
    expect(val(verificarViga(base), 'espesor')).toBe(false);
    expect(val(verificarViga({ ...base, enchape: true }), 'espesor')).toBe(true);
    expect(verificarViga({ ...base, enchape: true }).cumple).toBe(true);
  });

  it('distancia vertical entre vigas mayor de 25 t', () => {
    expect(val(verificarViga({ ...viga, distanciaVertical: 3200 }), 'dist-vertical')).toBe(false);
    expect(val(verificarViga({ ...viga, distanciaVertical: 3000 }), 'dist-vertical')).toBe(true);
  });

  it('estribos de 8M cumplen, separación excesiva no', () => {
    expect(val(verificarViga({ ...viga, estriboId: '8M' }), 'db-estribo')).toBe(true);
    expect(val(verificarViga({ ...viga, sepEstribos: 250 }), 's-estribo')).toBe(false);
  });
});

describe('D.10.6.7 — cinta de amarre de concreto', () => {
  it('altura ≥ 100 mm y 2 barras N° 3', () => {
    expect(verificarCintaConcreto({ altura: 100, nBarras: 2, barraId: 'No.3' }).cumple).toBe(true);
    expect(verificarCintaConcreto({ altura: 90, nBarras: 2, barraId: 'No.3' }).cumple).toBe(false);
    expect(verificarCintaConcreto({ altura: 100, nBarras: 1, barraId: 'No.3' }).cumple).toBe(false);
    expect(verificarCintaConcreto({ altura: 100, nBarras: 2, barraId: '8M' }).cumple).toBe(false);
  });
});
