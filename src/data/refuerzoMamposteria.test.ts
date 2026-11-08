import { describe, expect, it } from 'vitest';
import {
  COLOCACION_REFUERZO,
  DESARROLLO,
  DIAMETROS_REFUERZO_CELDA,
  DIAMETROS_REFUERZO_JUNTA,
  EMPALME,
  GANCHOS_ESTANDAR,
  JUNTA_CONTROL_MAX_M,
  MORTERO_RELLENO,
  RECUBRIMIENTO_CELDAS,
  RECUBRIMIENTO_JUNTA,
  TABLA_D421_DOBLAMIENTO,
  TABLA_D422_TOLERANCIAS,
  TABLA_D461_INYECCION,
  VENTANA_INSPECCION,
} from './refuerzoMamposteria';

describe('refuerzoMamposteria: D.4.2 (PDF D-21 a D-23)', () => {
  it('diámetros en celdas inyectadas (D.4.2.2.1)', () => {
    expect(DIAMETROS_REFUERZO_CELDA.minimoMm).toBe(9.5); // N° 3 ó 10M
    expect(DIAMETROS_REFUERZO_CELDA.maximoMuroGruesoMm).toBe(25.4); // N° 8 ó 25M
    expect(DIAMETROS_REFUERZO_CELDA.maximoMuroDelgadoMm).toBe(20); // N° 6 ó 20M
    expect(DIAMETROS_REFUERZO_CELDA.espesorUmbralMm).toBe(200);
    expect(DIAMETROS_REFUERZO_CELDA.fraccionCelda).toBeCloseTo(1 / 3, 12);
  });
  it('refuerzo de junta (D.4.2.2.2)', () => {
    expect(DIAMETROS_REFUERZO_JUNTA.minimoMm).toBe(4);
    expect(DIAMETROS_REFUERZO_JUNTA.fraccionEspesorMortero).toBe(0.5);
  });
  it('colocación (D.4.2.3)', () => {
    expect(COLOCACION_REFUERZO.celdaDosBarrasMm).toBe(140);
    expect(COLOCACION_REFUERZO.dbMaxDosBarrasMm).toBe(16);
    expect(COLOCACION_REFUERZO.corteBarrasPaqueteDb).toBe(40);
    expect(COLOCACION_REFUERZO.morteroEntreBarraYUnidadMm).toEqual({ fino: 6.5, grueso: 13 });
  });
  it('recubrimientos (D.4.2.4)', () => {
    expect(RECUBRIMIENTO_CELDAS.expuestaBarraGrande).toBe(50);
    expect(RECUBRIMIENTO_CELDAS.expuestaBarraPequena).toBe(40);
    expect(RECUBRIMIENTO_CELDAS.noExpuesta).toBe(40);
    expect(RECUBRIMIENTO_JUNTA).toEqual({ expuesta: 12, noExpuesta: 6 });
  });
  it('desarrollo y empalme (D.4.2.5)', () => {
    expect(DESARROLLO).toEqual({ coeficiente: 1.5, minimoMm: 300, factorBarraLisa: 2, kMaxDb: 5 });
    expect(EMPALME.fraccionSeparacion).toBe(0.2);
    expect(EMPALME.separacionMaximaMm).toBe(200);
    expect(EMPALME.separacionMinimaSinContactoMm).toBe(25);
  });
  it('ganchos estándar (D.4.2.7)', () => {
    expect(GANCHOS_ESTANDAR.map((g) => [g.angulo, g.extensionDb, g.extensionMinMm ?? null])).toEqual([
      [180, 4, 64],
      [90, 12, null],
      [135, 6, null],
    ]);
  });
  it('Tabla D.4.2-1: 240 MPa → 5db (N° 3 a N° 7); 420 MPa → 6db (N° 3 a N° 8)', () => {
    expect(TABLA_D421_DOBLAMIENTO).toHaveLength(2);
    expect(TABLA_D421_DOBLAMIENTO[0]).toMatchObject({ fy: 240, factorDb: 5, dbMaxMm: 22.2 });
    expect(TABLA_D421_DOBLAMIENTO[1]).toMatchObject({ fy: 420, factorDb: 6, dbMaxMm: 25.4 });
  });
});

describe('refuerzoMamposteria: Tabla D.4.2-2 (PDF D-26)', () => {
  it('9 filas numeradas', () => {
    expect(TABLA_D422_TOLERANCIAS.map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('filas de rango asimétrico', () => {
    expect(TABLA_D422_TOLERANCIAS[0].limitesMm).toEqual([-6, 12.5]);
    expect(TABLA_D422_TOLERANCIAS[1].limitesMm).toEqual([-4, 4]);
    expect(TABLA_D422_TOLERANCIAS[2].limitesMm).toEqual([-6, 9]);
  });
  it('filas con pendiente 2 mm/m y máximo', () => {
    expect(TABLA_D422_TOLERANCIAS.slice(3, 8).map((f) => [f.mmPorMetro, f.maximoMm])).toEqual([
      [2, 12.5],
      [2, 12],
      [2, 12],
      [2, 12],
      [2, 20],
    ]);
    expect(TABLA_D422_TOLERANCIAS[8]).toMatchObject({ tolerancia: '± 6 mm/piso', maximoMm: 20 });
  });
});

describe('refuerzoMamposteria: Tabla D.4.6-1 (PDF D-28)', () => {
  it('cinco filas ordenadas de menor a mayor exigencia', () => {
    expect(TABLA_D461_INYECCION).toHaveLength(5);
    expect(TABLA_D461_INYECCION.map((f) => f.cavidad)).toEqual([25, 38, 50, 60, 75]);
    expect(TABLA_D461_INYECCION.map((f) => f.celda)).toEqual([
      [40, 50],
      [50, 60],
      [50, 75],
      [60, 75],
      [75, 75],
    ]);
  });
  it('alturas de mortero fino y grueso', () => {
    expect(TABLA_D461_INYECCION.map((f) => f.fino)).toEqual([0.4, 1.2, 1.5, 3.0, null]);
    expect(TABLA_D461_INYECCION.map((f) => f.grueso)).toEqual([null, 0.4, 1.2, 1.5, 3.0]);
  });
});

describe('refuerzoMamposteria: otros valores de D.4.5 y D.4.6', () => {
  it('constantes', () => {
    expect(JUNTA_CONTROL_MAX_M).toBe(8);
    expect(VENTANA_INSPECCION.minimoMm).toBe(75);
    expect(VENTANA_INSPECCION.maximoMm).toBe(100);
    expect(MORTERO_RELLENO.porcionCompactacionMm).toBe(300);
    expect(MORTERO_RELLENO.juntaVaciadoBajoJuntaPegaMm).toBe(40);
  });
});
