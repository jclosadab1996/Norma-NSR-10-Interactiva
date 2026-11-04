import { describe, expect, it } from 'vitest';
import { buscarComponente, buscarMaterial, buscarMuro } from '../../data/cargasMuertas';
import {
  cargaAlternativa,
  cargaComponente,
  cargaComponenteKgf,
  cargaLineal,
  cargaMuroMamposteria,
  cargaPorEspesor,
  densidadDeCalculo,
  espesoresDisponibles,
  kNm2AKgfm2,
  kNm2AKgfm2Exacto,
  kgfm2AKNm2,
  kgfm2AKNm2Exacto,
  pesoEspecifico,
  pesoPropioLosaMaciza,
  puedeUsarValoresAlternativos,
  repartirEnPlanta,
  sumarCargasMuertas,
} from './cargasMuertas';

describe('cargasMuertas: pesos y conversiones', () => {
  it('peso específico del concreto reforzado = 2400·9.8/1000 = 23.52 kN/m³', () => {
    expect(pesoEspecifico(buscarMaterial('concreto-reforzado')!.densidad)).toBeCloseTo(23.52, 10);
  });

  it('losa maciza de 0.10 m = 2.352 kN/m²; de 0.15 m = 3.528 kN/m²', () => {
    expect(pesoPropioLosaMaciza(0.1)).toBeCloseTo(2.352, 10);
    expect(pesoPropioLosaMaciza(0.15)).toBeCloseTo(3.528, 10);
    expect(cargaPorEspesor(2400, 0.15)).toBeCloseTo(pesoPropioLosaMaciza(0.15), 12);
  });

  it('rango de densidad: madera seca usa el máximo (750)', () => {
    expect(densidadDeCalculo(buscarMaterial('madera-seca')!)).toBe(750);
    expect(densidadDeCalculo(buscarMaterial('acero')!)).toBe(7800);
  });

  it('conversión kN/m² ↔ kgf/m²: factor de las tablas (100) y exacto (101.97)', () => {
    expect(kNm2AKgfm2(1.1)).toBeCloseTo(110, 10);
    expect(kgfm2AKNm2(110)).toBeCloseTo(1.1, 10);
    expect(kNm2AKgfm2Exacto(1)).toBeCloseTo(101.9716, 3);
    expect(kgfm2AKNm2Exacto(kNm2AKgfm2Exacto(2.5))).toBeCloseTo(2.5, 10);
  });
});

describe('cargasMuertas: componentes de las tablas', () => {
  it('valor fijo ignora el espesor', () => {
    const c = buscarComponente('pi-baldosa-20-mortero-25')!;
    expect(cargaComponente(c)).toBe(1.1);
    expect(cargaComponente(c, 40)).toBe(1.1);
    expect(cargaComponenteKgf(c)).toBe(110);
  });

  it('por espesor: arena de relleno de 50 mm = 0.0150·50 = 0.75 kN/m² (75 kgf/m²)', () => {
    const c = buscarComponente('rp-arena')!;
    expect(cargaComponente(c, 50)).toBeCloseTo(0.75, 10);
    expect(cargaComponenteKgf(c, 50)).toBeCloseTo(75, 10);
    expect(Number.isNaN(cargaComponente(c))).toBe(true);
    expect(Number.isNaN(cargaComponente(c, -1))).toBe(true);
  });

  it('tableros de yeso 12 mm en cielo raso = 0.0080·12 = 0.096 kN/m²', () => {
    expect(cargaComponente(buscarComponente('cr-tableros-yeso')!, 12)).toBeCloseTo(0.096, 10);
  });

  it('muro de mampostería: lectura por espesor, vacío y espesor inexistente', () => {
    const m = buscarMuro('mb-concreto-relleno-1.0')!;
    expect(cargaMuroMamposteria(m, 150)).toBe(1.8);
    expect(cargaMuroMamposteria(m, 100)).toBeNull();
    expect(cargaMuroMamposteria(m, 120)).toBeNull();
    expect(espesoresDisponibles(m)).toEqual([150, 200, 250, 300]);
    expect(espesoresDisponibles(buscarMuro('mb-arcilla-panetado')!)).toEqual([100, 150, 200, 250, 300]);
  });

  it('carga lineal y reparto en planta', () => {
    // Muro de bloque de arcilla pañetado de 150 mm (2.5 kN/m²) de 2.5 m de altura -> 6.25 kN/m
    expect(cargaLineal(2.5, 2.5)).toBeCloseTo(6.25, 10);
    // 20 m de ese muro en 100 m² de planta: 6.25·20/100 = 1.25 kN/m²
    expect(repartirEnPlanta(2.5, 2.5, 20, 100)).toBeCloseTo(1.25, 10);
    expect(Number.isNaN(repartirEnPlanta(2.5, 2.5, 20, 0))).toBe(true);
  });
});

describe('cargasMuertas: suma de una placa y valores alternativos', () => {
  it('suma de aportes con fracciones que suman 1', () => {
    const d = sumarCargasMuertas([
      { nombre: 'Losa', valor: 3.528 },
      { nombre: 'Baldosa', valor: 1.1 },
      { nombre: 'Cielo', valor: 0.196 },
    ]);
    expect(d.total).toBeCloseTo(4.824, 10);
    expect(d.totalKgf).toBeCloseTo(482.4, 8);
    expect(d.filas.reduce((s, f) => s + f.fraccion, 0)).toBeCloseTo(1, 12);
    expect(d.invalidos).toEqual([]);
  });

  it('ignora aportes inválidos (NaN) y los reporta', () => {
    const d = sumarCargasMuertas([
      { nombre: 'A', valor: 1 },
      { nombre: 'B', valor: NaN },
    ]);
    expect(d.total).toBe(1);
    expect(d.invalidos).toEqual(['B']);
  });

  it('valores alternativos B.3.4.3-1: residencial de mampostería = 3.0 + 1.6 = 4.6 kN/m²', () => {
    expect(cargaAlternativa('va-residencial-mamposteria')).toEqual({ fachadaParticiones: 3.0, afinado: 1.6, total: 4.6 });
    expect(cargaAlternativa('no-existe')).toBeUndefined();
  });

  it('solo aplican con altura entre pisos menor de 3 m', () => {
    expect(puedeUsarValoresAlternativos(2.7)).toBe(true);
    expect(puedeUsarValoresAlternativos(3)).toBe(false);
    expect(puedeUsarValoresAlternativos(NaN)).toBe(false);
  });
});
