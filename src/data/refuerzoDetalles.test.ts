import { describe, expect, it } from 'vitest';
import {
  BARRAS,
  BARRAS_METRICAS,
  BARRAS_PULGADA,
  GANCHOS,
  RECUBRIMIENTO_C771,
  RECUBRIMIENTO_C772,
  RECUBRIMIENTO_C773,
  RETRACCION_TEMPERATURA,
  SEPARACION,
  TABLA_C72_DOBLADO,
  TOLERANCIAS_COLOCACION,
  TRASLAPO_ESPIRAL,
  buscarBarra,
} from './refuerzoDetalles';

describe('refuerzoDetalles: dimensiones de barras (Tablas C.3.5.3-1 y C.3.5.3-2)', () => {
  it('12 barras de pulgada y 14 métricas, ids únicos', () => {
    expect(BARRAS_PULGADA).toHaveLength(12);
    expect(BARRAS_METRICAS).toHaveLength(14);
    const ids = BARRAS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BARRAS) expect(buscarBarra(b.id)).toBe(b);
  });

  it('el área nominal es coherente con π·db²/4 (tolerancia de redondeo de la tabla)', () => {
    for (const b of BARRAS) {
      const teorica = (Math.PI * b.db ** 2) / 4;
      // las barras de pulgada se redondean a mm² enteros; las métricas dan 1 decimal
      expect(Math.abs(b.area - teorica) / teorica).toBeLessThan(0.02);
    }
  });

  it('el perímetro es coherente con π·db y la masa con 7.85 kg/dm³ · área', () => {
    for (const b of BARRAS) {
      // El perímetro de las barras de pulgada es nominal y no coincide exactamente con π·db: 30.0 mm para db = 9.5.
      expect(Math.abs(b.perimetro - Math.PI * b.db) / (Math.PI * b.db)).toBeLessThan(0.03);
      const masa = (b.area * 7.85) / 1000; // kg/m (área en mm², densidad 7.85 g/cm³)
      expect(Math.abs(b.masa - masa) / masa).toBeLessThan(0.03);
    }
  });

  it('valores puntuales leídos de la imagen', () => {
    expect(buscarBarra('No.5')).toMatchObject({ db: 15.9, area: 199, perimetro: 50.0, masa: 1.552 });
    expect(buscarBarra('No.18')).toMatchObject({ db: 57.3, area: 2581, masa: 20.24 });
    expect(buscarBarra('36M')).toMatchObject({ db: 36.0, area: 1017.9, masa: 7.985 });
    expect(buscarBarra('55M')).toMatchObject({ db: 55.0, area: 2375.8, masa: 18.638 });
  });

  it('las barras con equivalente directo de C.7 crecen de forma monótona; solo 8M y 18M son aproximadas', () => {
    const aprox = BARRAS.filter((b) => b.sinEquivalente).map((b) => b.id);
    expect(aprox).toEqual(['8M', '18M']);
    for (const lista of [BARRAS_PULGADA, BARRAS_METRICAS]) {
      for (let i = 1; i < lista.length; i++) {
        expect(lista[i].db).toBeGreaterThan(lista[i - 1].db);
        expect(lista[i].eq).toBeGreaterThan(lista[i - 1].eq);
      }
    }
  });
});

describe('refuerzoDetalles: ganchos y doblado (C.7.1, Tabla C.7.2)', () => {
  it('seis tipos de gancho con extensiones de la norma', () => {
    expect(GANCHOS).toHaveLength(6);
    const por = Object.fromEntries(GANCHOS.map((g) => [g.id, g]));
    expect(por['estandar-180']).toMatchObject({ angulo: 180, extensionDb: 4, minimoMm: 65 });
    expect(por['estandar-90']).toMatchObject({ angulo: 90, extensionDb: 12 });
    expect(por['estribo-135']).toMatchObject({ angulo: 135, extensionDb: 6 });
    expect(por['sismico-135']).toMatchObject({ angulo: 135, extensionDb: 6, minimoMm: 75 });
  });

  it('Tabla C.7.2: 6db, 8db y 10db sin huecos ni traslapes entre rangos', () => {
    expect(TABLA_C72_DOBLADO.map((f) => f.factor)).toEqual([6, 8, 10]);
    expect(TABLA_C72_DOBLADO.map((f) => [f.eqMin, f.eqMax])).toEqual([
      [3, 8],
      [9, 11],
      [14, 18],
    ]);
  });
});

describe('refuerzoDetalles: separaciones y tolerancias', () => {
  it('constantes de C.7.6', () => {
    expect(SEPARACION).toMatchObject({
      libreMinimaCapaMm: 25,
      compresionFactorDb: 1.5,
      compresionMinimaMm: 40,
      paqueteMaxBarras: 4,
      temperaturaFactorH: 5,
      temperaturaMaximaMm: 450,
    });
  });

  it('tolerancias de d: ±10 mm hasta 200 mm y ±13 mm por encima', () => {
    expect(TOLERANCIAS_COLOCACION).toEqual([
      { dMax: 200, tolD: 10, tolRecubrimiento: 10 },
      { dMax: null, tolD: 13, tolRecubrimiento: 13 },
    ]);
  });
});

describe('refuerzoDetalles: recubrimientos (C.7.7)', () => {
  it('C.7.7.1 tiene 8 filas con los valores 75, 50, 40, 40, 20, 40, 20, 13', () => {
    expect(RECUBRIMIENTO_C771.map((f) => f.mm)).toEqual([75, 50, 40, 40, 20, 40, 20, 13]);
  });

  it('C.7.7.2 tiene 8 filas; la última es "db pero no menos de 20 mm"', () => {
    expect(RECUBRIMIENTO_C772).toHaveLength(8);
    expect(RECUBRIMIENTO_C772.map((f) => f.mm)).toEqual([75, 25, 40, 20, 40, 25, 10, null]);
    expect(RECUBRIMIENTO_C772[7].formula).toEqual({ tipo: 'db', min: 20 });
  });

  it('C.7.7.3 tiene 13 filas con los valores del PDF', () => {
    expect(RECUBRIMIENTO_C773).toHaveLength(13);
    expect(RECUBRIMIENTO_C773.map((f) => f.mm)).toEqual([40, 20, 50, 40, 30, 30, 20, 16, null, 10, 20, 16, 10]);
    expect(RECUBRIMIENTO_C773[8].formula).toEqual({ tipo: 'db', min: 16, max: 40 });
  });

  it('todas las filas: ids únicos por tabla y recubrimientos positivos o con fórmula', () => {
    for (const tabla of [RECUBRIMIENTO_C771, RECUBRIMIENTO_C772, RECUBRIMIENTO_C773]) {
      const ids = tabla.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const f of tabla) expect(f.mm !== null || f.formula !== undefined).toBe(true);
    }
  });

  it('el recubrimiento de suelo es 75 mm en C.7.7.1 y C.7.7.2', () => {
    expect(RECUBRIMIENTO_C771[0].mm).toBe(75);
    expect(RECUBRIMIENTO_C772[0].mm).toBe(75);
  });
});

describe('refuerzoDetalles: espirales, retracción y temperatura', () => {
  it('traslapos de espiral: 48db / 72db / 72db / 48db / 48db', () => {
    expect(TRASLAPO_ESPIRAL.map((f) => f.factorDb)).toEqual([48, 72, 72, 48, 48]);
  });

  it('cuantías de retracción y temperatura', () => {
    expect(RETRACCION_TEMPERATURA).toMatchObject({
      cuantiaMinimaAbsoluta: 0.0014,
      cuantiaGrado280o350: 0.002,
      cuantiaGrado420OMalla: 0.0018,
      fyReferenciaMPa: 420,
    });
    expect(RETRACCION_TEMPERATURA.tendones).toEqual({ compresionPromedioMinMPa: 0.7, separacionMaxM: 1.8, separacionAdicionalSiExcedeM: 1.4 });
  });
});
