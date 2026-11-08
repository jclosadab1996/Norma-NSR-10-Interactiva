import { describe, expect, it } from 'vitest';
import {
  alturaMaximaInyeccion,
  alturaMaximaInyeccionCavidad,
  cumpleAreaRefuerzoCavidad,
  diametroDoblamiento,
  diametroJunta,
  dimensionesMinimasParaAltura,
  etapasInyeccion,
  ganchoEstandar,
  kEfectivo,
  longitudDesarrollo,
  nivelMaximoVaciado,
  toleranciaMaxima,
  longitudEmpalme,
  recubrimientoMinimoCelda,
  recubrimientoMinimoJunta,
  resistenciaEmpalmeMecanico,
  separacionMaximaEmpalme,
  verificarBarraEnCelda,
} from './desarrolloMamposteria';

describe('longitudDesarrollo: Ec. D.4.2-1', () => {
  it('No. 4, fy = 420, f′m = 10, K = 5db: ld = 1.5·12.7²·420/(63.5·√10) ≈ 506 mm', () => {
    const r = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 63.5 });
    expect(r.K).toBeCloseTo(63.5, 9);
    expect(r.limitadoPor).toBe('dato');
    expect(r.ldEcuacion).toBeCloseTo(506.03, 1);
    expect(r.ld).toBeCloseTo(506.03, 1);
    expect(r.gobiernaMinimo).toBe(false);
    expect(r.relacionDb).toBeCloseTo(39.84, 1);
  });
  it('K mayor que 5db se limita a 5db', () => {
    const r = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 100 });
    expect(r.K).toBeCloseTo(63.5, 9);
    expect(r.limitadoPor).toBe('5db');
    expect(r.ld).toBeCloseTo(506.03, 1);
  });
  it('K menor aumenta ld (K = 50 → ≈ 642.7 mm)', () => {
    const r = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 50 });
    expect(r.ld).toBeCloseTo(642.66, 1);
  });
  it('el espaciamiento libre entre empalmes también limita K', () => {
    const r = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 63.5, sLibre: 50 });
    expect(r.K).toBe(50);
    expect(r.limitadoPor).toBe('espaciamiento');
  });
  it('aplica el mínimo de 300 mm (No. 3, f′m = 20, K = 5db → ≈ 268 → 300)', () => {
    const r = longitudDesarrollo({ db: 9.5, fy: 420, fm: 20, K: 47.5 });
    expect(r.ldEcuacion).toBeCloseTo(267.66, 1);
    expect(r.ld).toBe(300);
    expect(r.gobiernaMinimo).toBe(true);
  });
  it('barra lisa: el doble', () => {
    const c = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 63.5 });
    const l = longitudDesarrollo({ db: 12.7, fy: 420, fm: 10, K: 63.5, lisa: true });
    expect(l.ld).toBeCloseTo(2 * c.ld, 9);
  });
  it('kEfectivo sin límites devuelve el dato', () => {
    expect(kEfectivo(40, 12.7)).toEqual({ K: 40, limitadoPor: 'dato' });
  });
});

describe('empalmes', () => {
  it('traslapo = ld; separación transversal ≤ min(ℓ/5, 200)', () => {
    expect(longitudEmpalme(506)).toBe(506);
    expect(separacionMaximaEmpalme(506).valor).toBeCloseTo(101.2, 9);
    expect(separacionMaximaEmpalme(506).gobierna).toBe('quinta-parte');
    expect(separacionMaximaEmpalme(1259)).toEqual({ valor: 200, gobierna: '200mm' });
    expect(separacionMaximaEmpalme(1000)).toEqual({ valor: 200, gobierna: 'quinta-parte' });
  });
  it('empalme mecánico ≥ 1.25 fy', () => {
    expect(resistenciaEmpalmeMecanico(420)).toBe(525);
  });
});

describe('ganchos y doblamiento: D.4.2.7 y Tabla D.4.2-1', () => {
  it('extensiones del gancho estándar', () => {
    expect(ganchoEstandar(12.7, 180)).toMatchObject({ extension: 64, gobiernaMinimoAbsoluto: true }); // 4·12.7 = 50.8 < 64
    expect(ganchoEstandar(19.1, 180).gobiernaMinimoAbsoluto).toBe(false);
    expect(ganchoEstandar(19.1, 180).extension).toBeCloseTo(76.4, 9);
    expect(ganchoEstandar(12.7, 90).extension).toBeCloseTo(152.4, 9);
    expect(ganchoEstandar(12.7, 135).extension).toBeCloseTo(76.2, 9);
  });
  it('Tabla D.4.2-1', () => {
    const a = diametroDoblamiento(15.9, 420);
    expect(a.factorDb).toBe(6);
    expect(a.diametro).toBeCloseTo(95.4, 9);
    const b = diametroDoblamiento(15.9, 240);
    expect(b.factorDb).toBe(5);
    expect(b.diametro).toBeCloseTo(79.5, 9);
    expect(diametroDoblamiento(25.4, 420).factorDb).toBe(6);
    expect(diametroDoblamiento(25.4, 240).factorDb).toBeNull(); // N° 8 no está en la fila de 240
    expect(diametroDoblamiento(22.2, 240).factorDb).toBe(5);
    expect(diametroDoblamiento(15.9, 500).factorDb).toBeNull();
  });
  it('fy intermedio usa la fila de 420 (6 db) con aviso', () => {
    const r = diametroDoblamiento(12.7, 300);
    expect(r.factorDb).toBe(6);
    expect(r.aviso).toBeDefined();
  });
});

describe('verificarBarraEnCelda: D.4.2.2.1, D.4.2.3.1 y D.4.2.3.3', () => {
  it('No. 5 en muro de 150 mm con celda de 100 mm y mortero fino: cumple', () => {
    const r = verificarBarraEnCelda({ db: 15.9, espesorMuro: 150, celdaMenor: 100, mortero: 'fino' });
    expect(r.dbMaxMuro).toBe(20);
    expect(r.dbMaxCelda).toBeCloseTo(33.33, 2);
    expect(r.dbMax).toBe(20);
    expect(r.barrasPorCeldaMax).toBe(1);
    expect(r.morteroAlrededor).toBeCloseTo(42.05, 2);
    expect(r.cumple).toBe(true);
  });
  it('celda de 150 mm permite dos barras de db ≤ 16 mm', () => {
    expect(verificarBarraEnCelda({ db: 15.9, espesorMuro: 200, celdaMenor: 150, mortero: 'grueso' }).barrasPorCeldaMax).toBe(2);
    expect(verificarBarraEnCelda({ db: 19.1, espesorMuro: 200, celdaMenor: 150, mortero: 'grueso' }).barrasPorCeldaMax).toBe(1);
    expect(verificarBarraEnCelda({ db: 15.9, espesorMuro: 200, celdaMenor: 140, mortero: 'grueso' }).barrasPorCeldaMax).toBe(1);
  });
  it('muro delgado no admite No. 7 y la celda limita a 1/3', () => {
    const r = verificarBarraEnCelda({ db: 22.2, espesorMuro: 150, celdaMenor: 60, mortero: 'fino' });
    expect(r.cumpleMaximoMuro).toBe(false);
    expect(r.cumpleMaximoCelda).toBe(false);
    expect(r.dbMax).toBe(20);
    expect(r.cumple).toBe(false);
  });
  it('mortero alrededor de la barra: grueso exige 13 mm', () => {
    const r = verificarBarraEnCelda({ db: 15.9, espesorMuro: 150, celdaMenor: 40, mortero: 'grueso' });
    expect(r.morteroAlrededor).toBeCloseTo(12.05, 2);
    expect(r.cumpleMortero).toBe(false);
  });
  it('diámetro mínimo N° 3', () => {
    expect(verificarBarraEnCelda({ db: 6.4, espesorMuro: 150, celdaMenor: 100, mortero: 'fino' }).cumpleMinimo).toBe(false);
    expect(verificarBarraEnCelda({ db: 9.5, espesorMuro: 150, celdaMenor: 100, mortero: 'fino' }).cumpleMinimo).toBe(true);
  });
  it('refuerzo de junta', () => {
    expect(diametroJunta(10)).toEqual({ minimo: 4, maximo: 5 });
  });
});

describe('recubrimientos: D.4.2.4', () => {
  it('celdas', () => {
    expect(recubrimientoMinimoCelda(19.1, true)).toBe(50);
    expect(recubrimientoMinimoCelda(15.9, true)).toBe(40);
    expect(recubrimientoMinimoCelda(25.4, false)).toBe(40);
  });
  it('junta', () => {
    expect(recubrimientoMinimoJunta(true)).toBe(12);
    expect(recubrimientoMinimoJunta(false)).toBe(6);
  });
});

describe('altura máxima de inyección: Tabla D.4.6-1', () => {
  it('mortero fino', () => {
    expect(alturaMaximaInyeccion(40, 50, 'fino')).toBe(0.4);
    expect(alturaMaximaInyeccion(50, 60, 'fino')).toBe(1.2);
    expect(alturaMaximaInyeccion(75, 50, 'fino')).toBe(1.5); // orden indistinto: 50 × 75
    expect(alturaMaximaInyeccion(60, 75, 'fino')).toBe(3.0);
    expect(alturaMaximaInyeccion(75, 75, 'fino')).toBe(3.0);
    expect(alturaMaximaInyeccion(39, 100, 'fino')).toBe(0);
  });
  it('mortero grueso', () => {
    expect(alturaMaximaInyeccion(40, 50, 'grueso')).toBe(0); // la fila 40×50 no admite mortero grueso
    expect(alturaMaximaInyeccion(50, 60, 'grueso')).toBe(0.4);
    expect(alturaMaximaInyeccion(50, 75, 'grueso')).toBe(1.2);
    expect(alturaMaximaInyeccion(60, 75, 'grueso')).toBe(1.5);
    expect(alturaMaximaInyeccion(75, 75, 'grueso')).toBe(3.0);
  });
  it('cavidad', () => {
    expect(alturaMaximaInyeccionCavidad(25, 'fino')).toBe(0.4);
    expect(alturaMaximaInyeccionCavidad(38, 'grueso')).toBe(0.4);
    expect(alturaMaximaInyeccionCavidad(60, 'fino')).toBe(3.0);
    expect(alturaMaximaInyeccionCavidad(60, 'grueso')).toBe(1.5);
    expect(alturaMaximaInyeccionCavidad(75, 'grueso')).toBe(3.0);
    expect(alturaMaximaInyeccionCavidad(20, 'fino')).toBe(0);
  });
  it('dimensiones mínimas para una altura', () => {
    expect(dimensionesMinimasParaAltura(1.2, 'fino')).toEqual({ celda: [50, 60], cavidad: 38 });
    expect(dimensionesMinimasParaAltura(3, 'grueso')).toEqual({ celda: [75, 75], cavidad: 75 });
    expect(dimensionesMinimasParaAltura(0.3, 'fino')).toEqual({ celda: [40, 50], cavidad: 25 });
    expect(dimensionesMinimasParaAltura(3.5, 'fino')).toBeNull();
  });
  it('etapas y área de refuerzo', () => {
    expect(etapasInyeccion(2.4, 1.2)).toBe(2);
    expect(etapasInyeccion(2.6, 1.2)).toBe(3);
    expect(etapasInyeccion(2.4, 0)).toBe(0);
    expect(cumpleAreaRefuerzoCavidad(60, 1000)).toBe(true);
    expect(cumpleAreaRefuerzoCavidad(61, 1000)).toBe(false);
  });
});

describe('nivelMaximoVaciado y toleranciaMaxima', () => {
  it('junta de vaciado 40 mm bajo una junta de pega (hilada de 200 mm)', () => {
    expect(nivelMaximoVaciado(1.5)).toBeCloseTo(1.5, 9);
    expect(nivelMaximoVaciado(1.2)).toBeCloseTo(1.16, 9);
    expect(nivelMaximoVaciado(0.4)).toBeCloseTo(0.36, 9);
  });
  it('tolerancias de la Tabla D.4.2-2', () => {
    expect(toleranciaMaxima(6, 2.4)).toBeCloseTo(4.8, 9); // plomo: 2 mm/m
    expect(toleranciaMaxima(6, 8)).toBe(12); // tope de 12 mm
    expect(toleranciaMaxima(4, 8)).toBe(12.5); // nivel de junta, tope 12.5 mm
    expect(toleranciaMaxima(9, 3)).toBe(18);
    expect(toleranciaMaxima(9, 4)).toBe(20);
    expect(() => toleranciaMaxima(2, 1)).toThrow();
  });
});
